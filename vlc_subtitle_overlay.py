"""Selectable subtitle layer for VLC.

VLC plays the video. This helper renders the current SRT cue as VLC-like
bordered text over the video, lets the user select words, and shows a small
Russian translation popup.
"""

from __future__ import annotations

from typing import Callable

import base64
import bisect
import ctypes
import html
import json
import os
import queue
import re
import sys
import threading
import time as time_module
import urllib.parse
import urllib.request
import zipfile
from ctypes import wintypes
from dataclasses import dataclass
from datetime import datetime
from tkinter import filedialog
from tkinter import messagebox
from xml.sax.saxutils import escape
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageTk
import tkinter as tk
import tkinter.font as tkfont

from desktop_i18n import tr
import player_prefs
from sync_client import cloud_reading, sync_selection_async


# How long the popup waits for the server's reading of the line before showing
# the dictionary answer instead. Long enough for a normal reply, short enough
# that a dead connection does not leave "..." on screen.
READING_TIMEOUT_SECONDS = 4.0

VLC_PASSWORD = "quicktranslate"
# Which port VLC's interface is on is a setting, because 8080 - the port it
# shipped with - is the first one any other local server takes.
VLC_PORTS = (player_prefs.vlc_port(), *player_prefs.FALLBACK_VLC_PORTS)
VLC_STATUS_URL = f"http://127.0.0.1:{VLC_PORTS[0]}/requests/status.json"
# The window redraws on this tick. Asking VLC over HTTP is done on a worker
# thread instead, because a blocking request on the UI thread is what made the
# subtitles stutter between cues.
POLL_MS = 40
# Tight enough that a play/pause is noticed within about one video frame.
STATUS_POLL_SECONDS = 0.08
# A phrase is usually caught in two or three goes: a word, then the words
# around it. Saving each attempt filled the library with fragments of one line,
# so the save waits this long and a later selection that overlaps the pending
# one takes its place.
SAVE_SETTLE_MS = 1500
# How long VLC may stay silent before the overlay accepts that it was closed.
# Long enough to sit through a stall or a file being swapped in the playlist.
CLOSED_PLAYER_SECONDS = 25.0
# Nothing on screen is a single cue for longer than this, so the search for
# overlapping cues never has to walk the whole file.
MAX_CUE_MS = 15000
# A gap this short between two cues is a seam in the file, not a pause. Holding
# the last line across it stops the overlay from blinking between speakers.
CUE_GAP_HOLD_MS = 120
# Anything larger than this is a seek, not drift.
RESYNC_MS = 1200
WINDOW_HEIGHT = 190
MIN_WIDTH = 520
MAX_WIDTH = 1800
SIDE_MARGIN = 44
TRANSPARENT_COLOR = "#010203"
# The phone app's dark palette, so the answer over a film and the card in the
# pocket are recognisably the same thing.
APP_SURFACE = "#18262b"
APP_LINE = "#2c4149"
APP_INK = "#eaf3f0"
APP_GREEN = "#35be58"
SELECTION_FILL = "#236f62"
SUBTITLE_FILL = "#ffffff"
SUBTITLE_OUTLINE = "#000000"
SUBTITLE_FONT_PATH = "arialbd.ttf"
WORD_RE = re.compile(r"[A-Za-z]+(?:[-'][A-Za-z]+)?")
HTML_TAG_RE = re.compile(r"<[^>]+>")
STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "but",
    "by",
    "for",
    "from",
    "had",
    "has",
    "have",
    "he",
    "her",
    "him",
    "his",
    "i",
    "if",
    "in",
    "is",
    "it",
    "its",
    "me",
    "my",
    "of",
    "on",
    "or",
    "our",
    "she",
    "so",
    "that",
    "the",
    "their",
    "them",
    "there",
    "they",
    "this",
    "those",
    "to",
    "was",
    "we",
    "were",
    "what",
    "when",
    "where",
    "which",
    "who",
    "will",
    "with",
    "you",
    "your",
    "get",
    "gets",
    "getting",
    "go",
    "goes",
    "going",
    "got",
    "just",
    "keep",
    "keeps",
    "kept",
    "let",
    "lets",
    "make",
    "makes",
    "making",
    "really",
    "said",
    "say",
    "says",
    "still",
    "then",
    "too",
    "very",
    "want",
    "wants",
    "went",
}
AUXILIARY_WORDS = {
    "am",
    "are",
    "be",
    "been",
    "being",
    "can",
    "could",
    "did",
    "do",
    "does",
    "had",
    "has",
    "have",
    "is",
    "may",
    "might",
    "must",
    "shall",
    "should",
    "to",
    "was",
    "were",
    "will",
    "would",
}
PHRASAL_PARTICLES = {
    "about",
    "across",
    "after",
    "against",
    "along",
    "around",
    "away",
    "back",
    "by",
    "down",
    "for",
    "from",
    "into",
    "off",
    "on",
    "out",
    "over",
    "through",
    "to",
    "up",
    "with",
}


user32 = ctypes.windll.user32
# use_last_error is required: without it GetLastError can be clobbered by
# ctypes' own calls before it is read, which is how the first version of the
# single-instance check silently let a second overlay through.
kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
kernel32.CreateMutexW.restype = wintypes.HANDLE
kernel32.CreateMutexW.argtypes = (wintypes.LPVOID, wintypes.BOOL, wintypes.LPCWSTR)

ERROR_ALREADY_EXISTS = 183
# Session-local: two overlays in the same desktop session are the problem, and
# a Global name needs a privilege a normal user process may not have.
SINGLE_INSTANCE_MUTEX = "Local\\TranslatedVLC.SubtitleOverlay"


def claim_single_instance() -> object | None:
    """Returns a handle while this is the only overlay, or None if one is
    already running.

    Two overlays draw two transparent windows over the same video, each with
    its own poll timing. On screen that looks like the previous subtitle
    hanging around on top of the next one and shivering — which is exactly
    what a second copy left running produces.
    """
    handle = kernel32.CreateMutexW(None, True, SINGLE_INSTANCE_MUTEX)
    error = ctypes.get_last_error()
    if not handle:
        # The lock could not be created at all. Refusing to start would be a
        # worse failure than a possible duplicate, so carry on.
        return "unguarded"
    if error == ERROR_ALREADY_EXISTS:
        return None
    return handle


class RECT(ctypes.Structure):
    _fields_ = [
        ("left", ctypes.c_long),
        ("top", ctypes.c_long),
        ("right", ctypes.c_long),
        ("bottom", ctypes.c_long),
    ]


class POINT(ctypes.Structure):
    _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]


@dataclass(frozen=True)
class Cue:
    start_ms: int
    end_ms: int
    text: str


@dataclass(frozen=True)
class CharBox:
    index: int
    source_index: int
    char: str
    x: int
    y: int
    width: int
    height: int


@dataclass(frozen=True)
class RenderPart:
    text: str
    x: int
    y: int


@dataclass(frozen=True)
class TranslationResult:
    text: str
    variants: tuple[str, ...] = ()
    examples: tuple[str, ...] = ()
    focus_word: str = ""
    focus_phrase: str = ""
    focus_translation: str = ""
    focus_variants: tuple[str, ...] = ()
    focus_examples: tuple[str, ...] = ()


def parse_timestamp(value: str) -> int:
    hours, minutes, rest = value.split(":")
    seconds, millis = rest.replace(".", ",").split(",")
    return (
        int(hours) * 3_600_000
        + int(minutes) * 60_000
        + int(seconds) * 1_000
        + int(millis.ljust(3, "0")[:3])
    )


def parse_srt(path: str) -> list[Cue]:
    with open(path, "r", encoding="utf-8-sig", errors="replace") as file:
        raw = file.read()
    blocks = re.split(r"\n\s*\n", raw.replace("\r\n", "\n").replace("\r", "\n").strip())
    cues: list[Cue] = []
    timing_re = re.compile(
        r"(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})"
    )
    html_tag_re = re.compile(r"<[^>]+>")
    ass_tag_re = re.compile(r"\{\\[^}]+\}")
    for block in blocks:
        lines = [line.strip() for line in block.split("\n") if line.strip()]
        if not lines:
            continue
        timing_index = next((index for index, line in enumerate(lines) if timing_re.search(line)), -1)
        if timing_index < 0:
            continue
        match = timing_re.search(lines[timing_index])
        if not match:
            continue
        text = " ".join(lines[timing_index + 1 :])
        text = ass_tag_re.sub("", html_tag_re.sub("", text))
        text = html.unescape(text).strip()
        if text:
            cues.append(Cue(parse_timestamp(match.group(1)), parse_timestamp(match.group(2)), text))
    return cues


def find_subtitle_path(path: str) -> str | None:
    if not path:
        return None
    absolute = os.path.abspath(path)
    if absolute.lower().endswith(".srt") and os.path.exists(absolute):
        return absolute

    folder = os.path.dirname(absolute)
    stem = os.path.splitext(os.path.basename(absolute))[0]
    direct = os.path.join(folder, f"{stem}.srt")
    if os.path.exists(direct):
        return direct

    candidates: list[str] = []
    for search_folder in (folder, os.path.join(folder, "subs"), os.path.join(folder, "subtitles")):
        if not os.path.isdir(search_folder):
            continue
        for name in os.listdir(search_folder):
            lower = name.lower()
            if lower.endswith(".srt") and lower.startswith(stem.lower()):
                candidates.append(os.path.join(search_folder, name))
    if candidates:
        # With several files beside the video, the one in the language the
        # viewer asked for wins; otherwise the closest name does, and the
        # translation works out the language from the text.
        wanted = player_prefs.language_codes(
            player_prefs.load_player_prefs()["subtitle_language"]
        )

        def preferred(item: str) -> int:
            name = os.path.basename(item).lower()
            return 0 if any(f".{code}." in name for code in wanted) else 1

        return sorted(
            candidates,
            key=lambda item: (preferred(item), len(os.path.basename(item)), item.lower()),
        )[0]
    return None


def translate_text(text: str) -> TranslationResult:
    params = urllib.parse.urlencode(
        [
            ("client", "gtx"),
            # A subtitle file is not necessarily English. Let the same
            # detector used by the cloud library identify it instead of
            # forcing French, Spanish or Estonian through an English parser.
            ("sl", "auto"),
            ("tl", "ru"),
            ("dt", "t"),
            ("dt", "bd"),
            ("dt", "ex"),
            ("dj", "1"),
            ("q", text),
        ]
    )
    request = urllib.request.Request(
        f"https://translate.googleapis.com/translate_a/single?{params}",
        headers={"User-Agent": "VlcSubtitleOverlay/2.0"},
    )
    with urllib.request.urlopen(request, timeout=5) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if isinstance(payload, dict):
        translated = "".join(
            str(sentence.get("trans", "")) for sentence in payload.get("sentences", []) if isinstance(sentence, dict)
        ).strip()
        variants: list[str] = []
        for item in payload.get("dict", []):
            if not isinstance(item, dict):
                continue
            terms = [str(term) for term in item.get("terms", []) if term]
            if not terms:
                continue
            pos = str(item.get("pos", "")).strip()
            prefix = f"{pos}: " if pos else ""
            variants.append(f"{prefix}{', '.join(terms[:8])}")
        examples: list[str] = []
        examples_payload = payload.get("examples", {})
        if isinstance(examples_payload, dict):
            for item in examples_payload.get("example", []):
                if isinstance(item, dict) and item.get("text"):
                    examples.append(clean_plain_text(item["text"]))
        return TranslationResult(translated, tuple(variants[:4]), tuple(examples[:4]))
    return TranslationResult("".join(part[0] for part in payload[0] if part[0]).strip())


# A highlighted run of up to this many words is treated as one expression.
PHRASE_MAX_WORDS = 5
# A subject in front turns a run of words into a clause.
SUBJECT_PRONOUNS = {"i", "you", "he", "she", "it", "we", "they", "there", "here"}
# A finite verb anywhere does the same.
SENTENCE_AUXILIARIES = {
    "am", "is", "are", "was", "were", "do", "does", "did", "have", "has",
    "had", "will", "would", "can", "could", "should",
}


def looks_like_sentence(text: str, words: list[str]) -> bool:
    """Whether a short selection is a clause rather than an expression.

    "seize the day" and "employment record" are things to learn as they are.
    "Are you high?" is a line of dialogue, and the word worth keeping from it
    is "high". A pronoun only counts in front, so the "it" inside "take it for
    granted" does not disqualify the idiom.
    """
    if text.strip().endswith((".", "!", "?")):
        return True
    # "She's" is still a subject: compare on the part before the contraction.
    if words and words[0].split("'")[0] in SUBJECT_PRONOUNS:
        return True
    # A contraction anywhere means a finite verb is hiding in it.
    if any("'" in word for word in words):
        return True
    return any(word in SENTENCE_AUXILIARIES for word in words)


def choose_focus_phrase(text: str) -> tuple[str, str]:
    matches = list(WORD_RE.finditer(text))
    if not matches:
        cleaned = clean_plain_text(text)
        return cleaned, cleaned
    lowered = [match.group(0).lower() for match in matches]
    # "She's" and "I'm" carry a subject the stop list only knows as "she"/"i".
    stems = [word.split("'")[0] for word in lowered]

    # Someone who highlights two or three words has already chosen the thing
    # they want to learn. Reducing "employment record" to "employment" throws
    # away the meaning they were after.
    if len(matches) <= PHRASE_MAX_WORDS and not looks_like_sentence(text, lowered):
        phrase = clean_plain_text(text).strip(" \t -–—,;:")
        head = next(
            (match.group(0) for match, stem in zip(matches, stems) if stem not in STOP_WORDS),
            matches[0].group(0),
        )
        return head, phrase or head

    focus_index: int | None = None

    for index, word in enumerate(stems[:-1]):
        if word in AUXILIARY_WORDS:
            for next_index in range(index + 1, len(matches)):
                if stems[next_index] not in STOP_WORDS:
                    focus_index = next_index
                    break
            if focus_index is not None:
                break

    if focus_index is None:
        for index, word in enumerate(stems):
            if word not in STOP_WORDS:
                focus_index = index
                break

    if focus_index is None:
        focus_index = 0

    focus_word = matches[focus_index].group(0)
    focus_phrase = focus_word
    if focus_index + 1 < len(matches) and lowered[focus_index + 1] in PHRASAL_PARTICLES:
        focus_phrase = f"{focus_word} {matches[focus_index + 1].group(0)}"
    return focus_word, focus_phrase


def translate_selection_smart(
    text: str, context: str = "", preview: Callable[[TranslationResult], None] | None = None
) -> TranslationResult:
    # The server's reading of the line and the dictionary lookups do not depend
    # on each other, so they run together and the popup waits for the slower of
    # the two rather than for both in turn.
    reading: dict[str, object] | None = None

    def fetch_reading() -> None:
        nonlocal reading
        reading = cloud_reading(text, context, timeout=READING_TIMEOUT_SECONDS)

    reader = threading.Thread(target=fetch_reading, name="vlc-subtitle-reading", daemon=True)
    reader.start()

    phrase_result = translate_text(text)
    # The dictionary is back in a moment; reading the whole line takes a beat
    # longer. Put the first answer on screen instead of leaving a row of dots
    # there until the better one is written.
    if preview is not None:
        preview(phrase_result)
    focus_word, focus_phrase = choose_focus_phrase(text)
    phrase_focus_result = phrase_result
    word_focus_result = phrase_result
    if focus_phrase and focus_phrase.lower() != text.lower():
        try:
            phrase_focus_result = translate_text(focus_phrase)
        except Exception:
            phrase_focus_result = phrase_result
    if focus_word and focus_word.lower() not in {text.lower(), focus_phrase.lower()}:
        try:
            word_focus_result = translate_text(focus_word)
        except Exception:
            word_focus_result = phrase_focus_result
    else:
        word_focus_result = phrase_focus_result

    headline = phrase_result.text
    meaning = phrase_focus_result.text
    variants = list(phrase_result.variants)

    reader.join(timeout=READING_TIMEOUT_SECONDS)
    if isinstance(reading, dict):
        line = str(reading.get("translation") or "").strip()
        term = str(reading.get("focus_translation") or "").strip()
        english = str(reading.get("term_en") or "").strip()
        synonyms = [str(word).strip() for word in (reading.get("synonyms") or []) if str(word).strip()]
        note = str(reading.get("sense_note") or "").strip()
        if line:
            headline = line
        if term:
            meaning = term
        # The server may pick a better thing to learn out of a whole sentence,
        # but only ever something that is really in it.
        if english and english.lower() in text.lower() and len(WORD_RE.findall(english)) <= PHRASE_MAX_WORDS:
            focus_phrase = english
            focus_word = (WORD_RE.findall(english) or [focus_word])[0]
        extra = []
        if synonyms:
            extra.append(tr("more_prefix") + ", ".join(synonyms))
        if note:
            extra.append(note)
        variants = extra + variants

    return TranslationResult(
        headline,
        tuple(variants[:4]),
        phrase_result.examples,
        focus_word=focus_word,
        focus_phrase=focus_phrase,
        focus_translation=meaning,
        focus_variants=word_focus_result.variants or phrase_focus_result.variants,
        focus_examples=phrase_focus_result.examples or word_focus_result.examples,
    )


def translation_document_path() -> str:
    user_profile = os.environ.get("USERPROFILE") or os.path.expanduser("~")
    documents = os.path.join(user_profile, "Documents")
    folder = os.path.join(documents if os.path.isdir(documents) else user_profile, "Translated VLC")
    os.makedirs(folder, exist_ok=True)
    return os.path.join(folder, "subtitle_translations.txt")


def translation_word_path() -> str:
    user_profile = os.environ.get("USERPROFILE") or os.path.expanduser("~")
    documents = os.path.join(user_profile, "Documents")
    folder = os.path.join(documents if os.path.isdir(documents) else user_profile, "Translated VLC")
    os.makedirs(folder, exist_ok=True)
    return os.path.join(folder, "subtitle_translations.docx")


def translation_entries_path() -> str:
    return os.path.splitext(translation_word_path())[0] + ".jsonl"


def cue_time_label(ms: int) -> str:
    seconds = ms // 1000
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def clean_plain_text(value: object) -> str:
    text = html.unescape(str(value or ""))
    text = HTML_TAG_RE.sub("", text)
    return re.sub(r"\s+", " ", text.replace("\r", " ").replace("\n", " ")).strip()


def xml_text(value: object) -> str:
    return escape(clean_plain_text(value))


def docx_paragraph(text: object = "", bold: bool = False, size: int = 22, color: str = "111111") -> str:
    bold_tag = "<w:b/>" if bold else ""
    return (
        "<w:p>"
        "<w:r>"
        f"<w:rPr>{bold_tag}<w:color w:val=\"{color}\"/><w:sz w:val=\"{size}\"/></w:rPr>"
        f"<w:t xml:space=\"preserve\">{xml_text(text)}</w:t>"
        "</w:r>"
        "</w:p>"
    )


def docx_cell(text: object, width: int, fill: str | None = None, bold: bool = False) -> str:
    shading = f"<w:shd w:fill=\"{fill}\"/>" if fill else ""
    paragraphs = "".join(docx_paragraph(part, bold=bold) for part in str(text or "").split("\n"))
    return (
        "<w:tc>"
        f"<w:tcPr><w:tcW w:w=\"{width}\" w:type=\"dxa\"/>{shading}</w:tcPr>"
        f"{paragraphs or docx_paragraph()}"
        "</w:tc>"
    )


def docx_row(label: str, value: object, fill: str | None = None) -> str:
    return (
        "<w:tr>"
        f"{docx_cell(label, 2600, fill=fill, bold=True)}"
        f"{docx_cell(value, 7000, fill=fill)}"
        "</w:tr>"
    )


def docx_table(entry: dict[str, object]) -> str:
    focus_word = clean_plain_text(entry.get("focus_word", ""))
    focus_phrase = clean_plain_text(entry.get("focus_phrase", "")) or focus_word
    focus_translation = clean_plain_text(entry.get("focus_translation", "")) or clean_plain_text(entry.get("translation", ""))
    variants = entry.get("focus_variants") or entry.get("variants", [])
    examples = entry.get("focus_examples") or entry.get("examples", [])
    variants_text = "\n".join(clean_plain_text(item) for item in variants if item) if isinstance(variants, list) else ""
    examples_text = "\n".join(clean_plain_text(item) for item in examples if item) if isinstance(examples, list) else ""
    if not examples_text:
        examples_text = tr("no_examples")
    title_focus = focus_phrase or entry.get("selected", "")
    title = f"{title_focus} - {focus_translation}"
    rows = [
        docx_row(tr("selected_phrase"), entry.get("selected", ""), fill="EAF7F2"),
        docx_row(tr("phrase_translation"), entry.get("translation", ""), fill="EAF7F2"),
        docx_row(tr("key_word"), focus_word or focus_phrase, fill="F4FBF8"),
        docx_row(tr("expression"), focus_phrase, fill="F4FBF8"),
        docx_row(tr("meaning_here"), focus_translation, fill="F4FBF8"),
        docx_row(tr("other_meanings"), variants_text or tr("no_variants")),
        docx_row(tr("examples"), examples_text),
    ]
    return (
        docx_paragraph(title, bold=True, size=28, color="0F5F4F")
        +
        "<w:tbl>"
        "<w:tblPr>"
        "<w:tblW w:w=\"9600\" w:type=\"dxa\"/>"
        "<w:tblBorders>"
        "<w:top w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"7BCDB3\"/>"
        "<w:left w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"7BCDB3\"/>"
        "<w:bottom w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"7BCDB3\"/>"
        "<w:right w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"7BCDB3\"/>"
        "<w:insideH w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"D8EDE6\"/>"
        "<w:insideV w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"D8EDE6\"/>"
        "</w:tblBorders>"
        "</w:tblPr>"
        "<w:tblGrid><w:gridCol w:w=\"2600\"/><w:gridCol w:w=\"7000\"/></w:tblGrid>"
        f"{''.join(rows)}"
        "</w:tbl>"
        + docx_paragraph()
    )


def build_word_document(path: str, entries: list[dict[str, object]]) -> None:
    body = [
        docx_paragraph("Translated VLC", bold=True, size=34, color="0F5F4F"),
        docx_paragraph(tr("doc_intro"), size=20, color="444444"),
        docx_paragraph(),
    ]
    body.extend(docx_table(entry) for entry in entries)
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body>"
        f"{''.join(body)}"
        '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="900" w:right="900" '
        'w:bottom="900" w:left="900" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>'
        "</w:body></w:document>"
    )
    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        "</Types>"
    )
    rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="word/document.xml"/>'
        "</Relationships>"
    )
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", rels)
        archive.writestr("word/document.xml", document_xml)


class VlcSubtitleOverlay:
    def __init__(self) -> None:
        self.events: queue.SimpleQueue[tuple[str, object]] = queue.SimpleQueue()
        self.cues: list[Cue] = []
        self.cue_starts: list[int] = []
        self.active_cues: tuple[int, ...] = ()
        self.current_text = ""
        self.char_boxes: list[CharBox] = []
        self.render_parts: list[RenderPart] = []
        self.subtitle_images: list[ImageTk.PhotoImage] = []
        self.subtitle_image_cache: dict[tuple[str, int], tuple[ImageTk.PhotoImage, int, int]] = {}
        self.selection_anchor: int | None = None
        self.selection_focus: int | None = None
        self.drag_started = False
        self.selection_revision = 0
        self.left_button_was_down = False
        self.undo_combo_was_down = False
        self.last_translation_job = 0
        self.cache: dict[str, TranslationResult] = {}
        self.translation_doc_path = translation_document_path()
        self.translation_docx_path = translation_word_path()
        self.translation_entries_path = translation_entries_path()
        self.source_label = "subtitles"
        self.window_width = 900
        self.window_height = WINDOW_HEIGHT
        # Smoothed playback clock; see _playback_ms.
        self.clock_ms: float | None = None
        self.clock_at = time_module.monotonic()
        self.clock_running = False
        self.seek_pending = False
        self.empty_since: float | None = None
        self.status_lock = threading.Lock()
        self.status_sample: tuple[dict[str, object] | None, float] = (None, 0.0)
        # The window starts withdrawn and is shown once there is a line to put
        # in it; after that it stays up, empty between lines.
        self.window_hidden = True
        # The moment on screen, which only ever moves forward while playing.
        self.display_ms = 0
        self.popup_timer: str | None = None
        # A save waiting to see whether the viewer is still adjusting.
        self.pending_save: tuple[str, str] | None = None
        self.pending_payload: tuple[str, TranslationResult] | None = None
        self.space_was_down = False
        self.vlc_hwnd = 0
        # Answers that were only read out loud, never saved.
        self.unsaved_jobs: set[int] = set()
        self.stop_status = threading.Event()

        self.root = tk.Tk()
        self.root.withdraw()
        path = self._subtitle_path_from_args()
        media_path = self._media_path_from_args()
        if not path:
            path = filedialog.askopenfilename(
                title="Choose subtitle file",
                filetypes=[("SubRip subtitles", "*.srt"), ("All files", "*.*")],
            )
        if not path:
            raise SystemExit
        self.cues = sorted(parse_srt(path), key=lambda cue: (cue.start_ms, cue.end_ms))
        if not self.cues:
            messagebox.showerror("VLC Subtitle Overlay", "No SRT cues found.")
            raise SystemExit
        self.cue_starts = [cue.start_ms for cue in self.cues]
        self.source_label = os.path.basename(media_path or path)

        self.root.overrideredirect(True)
        self.root.attributes("-topmost", True)
        self.root.attributes("-alpha", 0.92)
        try:
            self.root.attributes("-transparentcolor", TRANSPARENT_COLOR)
        except tk.TclError:
            pass
        self.root.configure(bg=TRANSPARENT_COLOR)
        self.root.config(cursor="hand2")
        self.root.bind("<Escape>", self._on_escape)
        self.root.bind("<Control-q>", lambda _event: self.root.destroy())
        self.root.bind("<Control-z>", self._undo_last_translation)
        self.root.bind("<Control-x>", self._undo_last_translation)
        self.root.bind("<Control-Z>", self._undo_last_translation)
        self.root.bind("<Control-X>", self._undo_last_translation)

        self.subtitle_font = tkfont.Font(family="Arial", size=-50, weight="bold")
        self.canvas = tk.Canvas(
            self.root,
            bg=TRANSPARENT_COLOR,
            highlightthickness=0,
            relief="flat",
            cursor="hand2",
        )
        self.canvas.pack(fill="both", expand=True)
        self.canvas.bind("<ButtonPress-1>", self._on_press)
        self.canvas.bind("<B1-Motion>", self._on_drag)
        self.canvas.bind("<ButtonRelease-1>", self._on_release)
        self.canvas.bind("<Double-Button-1>", self._on_double_click)
        self.canvas.bind("<Escape>", self._on_escape)
        self.canvas.bind("<Control-z>", self._undo_last_translation)
        self.canvas.bind("<Control-x>", self._undo_last_translation)
        self.canvas.bind("<Control-Z>", self._undo_last_translation)
        self.canvas.bind("<Control-X>", self._undo_last_translation)

        # The app's dark surface, with its line colour as a hairline and its
        # lip under the card. Nothing else: the film is what is being watched.
        self.popup = tk.Toplevel(self.root)
        self.popup.withdraw()
        self.popup.overrideredirect(True)
        self.popup.attributes("-topmost", True)
        self.popup.attributes("-alpha", 0.97)
        self.popup.configure(bg=APP_LINE)
        self.popup_body = tk.Frame(self.popup, bg=APP_SURFACE)
        self.popup_body.pack(fill="both", expand=True, padx=1, pady=(1, 3))
        self.popup_label = tk.Label(
            self.popup_body,
            bg=APP_SURFACE,
            fg=APP_INK,
            padx=18,
            pady=(0),
            font=("Segoe UI", 15, "bold"),
            justify="center",
            wraplength=760,
        )
        self.popup_label.pack(padx=0, pady=(10, 0))
        # The key word sits under the sentence, quieter, so the thing that was
        # actually selected reads first.
        self.popup_support = tk.Label(
            self.popup_body,
            bg=APP_SURFACE,
            fg=APP_GREEN,
            padx=18,
            font=("Segoe UI", 11),
            justify="center",
            wraplength=760,
        )

        self.root.geometry(f"{self.window_width}x{self.window_height}+80+80")
        self.root.after(POLL_MS, self._poll)
        self.root.after(35, self._watch_global_mouse)

    def _subtitle_path_from_args(self) -> str | None:
        for value in sys.argv[1:]:
            if value.startswith("-"):
                continue
            subtitle_path = find_subtitle_path(value)
            if subtitle_path:
                return subtitle_path
        return None

    def _media_path_from_args(self) -> str | None:
        for value in sys.argv[1:]:
            if value.startswith("-"):
                continue
            absolute = os.path.abspath(value)
            if os.path.exists(absolute) and not absolute.lower().endswith(".srt"):
                return absolute
        return None

    def _poll(self) -> None:
        self._drain_events()
        current_ms = self._playback_ms()
        if current_ms is None or not self._place_over_vlc():
            self._hide_window()
            self._hide_popup()
            self.root.after(300, self._poll)
            return

        if self.seek_pending:
            # A seek invalidates the selection and anything drawn for the old
            # position; start the next cue from a clean window.
            self.seek_pending = False
            self.active_cues = (-1,)
            self.selection_anchor = None
            self.selection_focus = None
            self.current_text = ""
            self.char_boxes = []
            self.render_parts = []
            self.subtitle_image_cache = {}
            self.canvas.delete("all")
            self._hide_popup()
            self.display_ms = current_ms

        # While playing, the moment being displayed never moves backwards. The
        # estimate can dip by a few milliseconds when VLC's own reading lags,
        # and a dip across a boundary would put the finished line back on
        # screen for one frame. Pausing or seeking sets it wherever it lands.
        if self.clock_running:
            self.display_ms = max(current_ms, self.display_ms)
        else:
            self.display_ms = current_ms

        active = self._cues_for_time(self.display_ms)
        if not active and self.active_cues and self.clock_running:
            # Hold the previous line briefly instead of blinking across the
            # one-frame gap between consecutive cues. Only while playing:
            # paused or just-seeked, holding would show a line that belongs to
            # a moment the viewer has already left.
            if self.empty_since is None:
                self.empty_since = time_module.monotonic()
            if (time_module.monotonic() - self.empty_since) * 1000 < CUE_GAP_HOLD_MS:
                self.root.after(POLL_MS, self._poll)
                return
        else:
            self.empty_since = None

        if active != self.active_cues:
            self.active_cues = active
            self.selection_anchor = None
            self.selection_focus = None
            self._hide_popup()
            if not active:
                self.current_text = ""
                self.char_boxes = []
                self.render_parts = []
                self.subtitle_images = []
                self.subtitle_image_cache = {}
                # Cleared, not hidden: an empty canvas is already invisible and
                # click-through, and unmapping the window is what made the
                # finished line flash back when the next one arrived.
                self.canvas.delete("all")
            else:
                # Two speakers talking at once are two cues covering the same
                # moment. Both belong on screen, stacked, rather than one of
                # them silently winning.
                self.current_text = "\n".join(self.cues[index].text for index in active)
                self._layout_words()
                self._draw_subtitles()
                self._show_window()
        self.root.after(POLL_MS, self._poll)

    def _show_window(self) -> None:
        if self.window_hidden:
            self.root.deiconify()
            self.window_hidden = False

    def _hide_window(self) -> None:
        """Only for states that last: no player, or the viewer pressed Escape.

        Never between two lines - see the note on the class about the frame
        Windows keeps.
        """
        if not self.window_hidden:
            self.root.withdraw()
            self.window_hidden = True

    def _drain_events(self) -> None:
        try:
            while True:
                kind, value = self.events.get_nowait()
                if kind == "translation":
                    job_id, selected_text, result, anchor, final = value  # type: ignore[misc]
                    # Only the considered answer is kept and written down; the
                    # first one is there to be read, not to be saved.
                    keep = job_id not in self.unsaved_jobs
                    if final:
                        self.unsaved_jobs.discard(job_id)
                    if final and keep and isinstance(result, TranslationResult):
                        self.cache[str(selected_text).lower()] = result
                        self._append_translation(str(selected_text), result)
                    elif final and isinstance(result, TranslationResult):
                        # Still worth remembering for the next time the same
                        # line comes round; simply not written down.
                        self.cache[str(selected_text).lower()] = result
                    if job_id == self.last_translation_job:
                        self._show_popup(self._popup_text(result, str(selected_text)), anchor)
        except queue.Empty:
            return

    def _read_vlc_status(self) -> dict[str, object] | None:
        token = base64.b64encode(f":{VLC_PASSWORD}".encode("utf-8")).decode("ascii")
        # The first port that answers is remembered, so the ones that do not
        # are asked once rather than on every tick.
        ports = (self._vlc_port,) if getattr(self, "_vlc_port", None) else VLC_PORTS
        for port in ports:
            url = f"http://127.0.0.1:{port}/requests/status.json?_={time_module.time_ns()}"
            request = urllib.request.Request(url, headers={"Authorization": f"Basic {token}"})
            try:
                with urllib.request.urlopen(request, timeout=0.3) as response:
                    answer = json.loads(response.read().decode("utf-8"))
            except Exception:
                continue
            self._vlc_port = port
            return answer
        return None

    def _cues_for_time(self, current_ms: int) -> tuple[int, ...]:
        """Every cue covering this moment, earliest first.

        Subtitle files overlap constantly — two speakers, or a caption held
        under a following line. Taking only the last cue that started made the
        earlier one disappear mid-sentence and flicker back when the later one
        ended.
        """
        index = bisect.bisect_right(self.cue_starts, current_ms) - 1
        found: list[int] = []
        while index >= 0 and current_ms - self.cue_starts[index] <= MAX_CUE_MS:
            cue = self.cues[index]
            if cue.start_ms <= current_ms <= cue.end_ms:
                found.append(index)
            index -= 1
        found.reverse()
        return tuple(found)

    def _status_worker(self) -> None:
        """Talks to VLC off the UI thread. A slow or missing answer must never
        hold up a redraw."""
        previous_state = ""
        last_answer = time_module.monotonic()
        while not self.stop_status.is_set():
            status = self._read_vlc_status()
            if status is not None:
                last_answer = time_module.monotonic()
            elif time_module.monotonic() - last_answer > CLOSED_PLAYER_SECONDS:
                # VLC has gone. Without this the overlay stayed in memory for
                # the rest of the session, and the next film started with two
                # of them on screen.
                self.stop_status.set()
                self.root.after(0, self.root.destroy)
                return
            with self.status_lock:
                self.status_sample = (status, time_module.monotonic())
            state = str((status or {}).get("state", "")).lower()
            # Play/pause is exactly when a stale reading would put the wrong
            # line on screen, so the next reading is taken immediately instead
            # of after the normal interval.
            interval = 0.0 if state != previous_state else STATUS_POLL_SECONDS
            previous_state = state
            if interval:
                self.stop_status.wait(interval)

    def _playback_ms(self) -> int | None:
        """A smooth, forward-only estimate of where playback is.

        VLC reports `time` in whole seconds and `position` as a coarse
        fraction, so reading either directly makes the clock jump back and
        forth across a cue boundary — which is what made cues stutter. The
        estimate runs on the local monotonic clock and is nudged toward VLC
        rather than snapped to it, except on a real seek.
        """
        with self.status_lock:
            sample = self.status_sample
        status, sampled_at = sample
        if status is None:
            self.clock_ms = None
            return None

        now = time_module.monotonic()
        playing = str(status.get("state", "")).lower() == "playing"

        # Prefer position×length: it carries sub-second detail that `time` lost.
        try:
            raw_ms = float(status.get("time", 0) or 0) * 1000
            position = float(status.get("position", 0) or 0)
            length = float(status.get("length", 0) or 0)
        except (TypeError, ValueError):
            return None
        reported_ms = raw_ms
        if 0 < position <= 1 and length > 0:
            precise_ms = position * length * 1000
            if abs(precise_ms - raw_ms) <= 2500:
                reported_ms = precise_ms
        # The sample describes the moment it was taken, not now.
        reported_ms += (now - sampled_at) * 1000 if playing else 0

        if self.clock_ms is None:
            self.clock_ms = reported_ms
            self.clock_at = now
            self.clock_running = playing
            return int(reported_ms)

        estimate = self._extrapolated(now)
        drift = reported_ms - estimate
        if abs(drift) > RESYNC_MS:
            # A real seek. Everything on screen belongs to the old position.
            self.seek_pending = True
            self.clock_ms = reported_ms
        elif drift > 0:
            # Behind reality: catch up briskly, forward motion is never wrong.
            self.clock_ms = estimate + drift * 0.35
        else:
            # Ahead of the last reading. This is the pause/resume case: the
            # sample was taken before playback moved on, and snapping back to
            # it is what made the previous line flash up again. Give up ground
            # slowly while playing, and settle properly once paused.
            self.clock_ms = estimate + drift * (0.04 if playing else 0.5)
        self.clock_at = now
        self.clock_running = playing
        return int(self.clock_ms)

    def _extrapolated(self, now: float) -> float:
        if self.clock_ms is None:
            return 0.0
        return self.clock_ms + ((now - self.clock_at) * 1000 if self.clock_running else 0.0)

    def _layout_words(self) -> None:
        width = max(1, self.window_width - SIDE_MARGIN * 2)
        pieces = list(re.finditer(r"\S+\s*", self.current_text))
        lines: list[list[tuple[str, int]]] = [[]]
        line_widths = [0]
        line_source_starts: list[list[int]] = [[]]
        for match in pieces:
            piece = match.group(0)
            piece_width = self.subtitle_font.measure(piece)
            if lines[-1] and line_widths[-1] + piece_width > width:
                lines.append([])
                line_widths.append(0)
                line_source_starts.append([])
            lines[-1].append((piece, line_widths[-1]))
            line_source_starts[-1].append(match.start())
            line_widths[-1] += piece_width

        line_height = self.subtitle_font.metrics("linespace") + 6
        total_height = max(line_height, len(lines) * line_height)
        start_y = max(8, self.window_height - total_height - 18)
        boxes: list[CharBox] = []
        render_parts: list[RenderPart] = []
        char_index = 0
        for line_number, line in enumerate(lines):
            line_text = "".join(piece for piece, _offset in line).rstrip()
            line_width = self.subtitle_font.measure(line_text)
            start_x = max(8, (self.window_width - line_width) // 2)
            y = start_y + line_number * line_height
            if line_text:
                render_parts.append(RenderPart(line_text, int(start_x), int(y)))
            for piece_number, (piece, offset) in enumerate(line):
                source_start = line_source_starts[line_number][piece_number]
                visible_piece = piece.rstrip()
                for local_index, char in enumerate(visible_piece):
                    if char.isspace():
                        continue
                    before = visible_piece[:local_index]
                    x = start_x + offset + self.subtitle_font.measure(before)
                    char_width = max(5, self.subtitle_font.measure(char))
                    boxes.append(
                        CharBox(
                            char_index,
                            source_start + local_index,
                            char,
                            int(x),
                            int(y),
                            int(char_width),
                            int(line_height),
                        )
                    )
                    char_index += 1
        self.char_boxes = boxes
        self.render_parts = render_parts
        self.subtitle_image_cache = {}

    def _draw_subtitles(self, selection_progress: float = 1.0) -> None:
        self.canvas.delete("all")
        self.subtitle_images = []
        for part in self.render_parts:
            self._draw_outlined_text(part.x, part.y, part.text)
        self._redraw_selection(selection_progress)

    def _redraw_selection(self, selection_progress: float = 1.0) -> None:
        self.canvas.delete("selection")
        inset = int(max(0.0, 1.0 - selection_progress) * 4)
        for x1, y1, x2, y2 in self._selection_rects():
            self.canvas.create_rectangle(
                x1,
                y1 + inset,
                x2,
                y2 - inset,
                fill=SELECTION_FILL,
                outline="",
                tags=("selection",),
            )
        self.canvas.tag_lower("selection")
        self.canvas.tag_raise("subtitle")

    def _selection_rects(self) -> list[tuple[int, int, int, int]]:
        if self.selection_anchor is None or self.selection_focus is None:
            return []
        start = min(self.selection_anchor, self.selection_focus)
        end = max(self.selection_anchor, self.selection_focus)
        selected = [box for box in self.char_boxes if start <= box.index <= end]
        if not selected:
            return []
        by_line: dict[int, list[CharBox]] = {}
        for box in selected:
            by_line.setdefault(box.y, []).append(box)
        rects: list[tuple[int, int, int, int]] = []
        for y, boxes in sorted(by_line.items()):
            boxes = sorted(boxes, key=lambda box: box.x)
            line_height = max(box.height for box in boxes)
            rects.append((boxes[0].x - 7, y - 6, boxes[-1].x + boxes[-1].width + 7, y + line_height + 3))
        return rects

    def _animate_selection(self) -> None:
        self.selection_revision += 1
        revision = self.selection_revision
        self._redraw_selection(selection_progress=0.45)

        def step(progress: float) -> None:
            if revision != self.selection_revision:
                return
            self._redraw_selection(selection_progress=progress)

        self.root.after(18, lambda: step(0.75))
        self.root.after(36, lambda: step(1.0))

    def _draw_outlined_text(self, x: int, y: int, text: str) -> None:
        font_size = abs(int(self.subtitle_font.cget("size")))
        cache_key = (text, font_size)
        cached = self.subtitle_image_cache.get(cache_key)
        if cached is None:
            try:
                font = ImageFont.truetype(SUBTITLE_FONT_PATH, font_size)
            except OSError:
                font = ImageFont.load_default()
            left, top, right, bottom = font.getbbox(text, stroke_width=3)
            padding = 9
            width = max(1, right - left + padding * 2)
            height = max(1, bottom - top + padding * 2)
            stroke = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            fill = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            stroke_draw = ImageDraw.Draw(stroke)
            fill_draw = ImageDraw.Draw(fill)
            draw_x = padding - left
            draw_y = padding - top
            stroke_draw.text(
                (draw_x, draw_y),
                text,
                font=font,
                fill=(0, 0, 0, 218),
                stroke_width=2,
                stroke_fill=(0, 0, 0, 218),
            )
            stroke = stroke.filter(ImageFilter.GaussianBlur(0.65))
            fill_draw.text((draw_x, draw_y), text, font=font, fill=(255, 255, 255, 255))
            stroke.alpha_composite(fill)
            cached = (ImageTk.PhotoImage(stroke), padding, padding)
            self.subtitle_image_cache[cache_key] = cached
        image, pad_x, pad_y = cached
        self.subtitle_images.append(image)
        self.canvas.create_image(x - pad_x, y - pad_y, image=image, anchor="nw", tags=("subtitle", "subtitle_fill"))

    def _on_escape(self, _event: tk.Event[object] | None = None) -> str:
        if self.selection_anchor is not None or self.selection_focus is not None:
            self.selection_anchor = None
            self.selection_focus = None
            self.drag_started = False
            self._hide_popup()
            self._redraw_selection()
        else:
            self._hide_window()
        return "break"

    def _char_at(self, x: int, y: int) -> int | None:
        if not self.char_boxes:
            return None
        lines: dict[int, list[CharBox]] = {}
        for box in self.char_boxes:
            if box.x - 4 <= x <= box.x + box.width + 4 and box.y <= y <= box.y + box.height:
                return box.index
            lines.setdefault(box.y, []).append(box)
        line_y = min(lines, key=lambda value: abs((value + self.char_boxes[0].height // 2) - y))
        line = sorted(lines[line_y], key=lambda box: box.x)
        line_height = line[0].height
        if line_y - 18 <= y <= line_y + line_height + 18:
            if x <= line[0].x:
                return line[0].index
            if x >= line[-1].x + line[-1].width:
                return line[-1].index
            return min(line, key=lambda box: abs((box.x + box.width // 2) - x)).index

        nearest: tuple[int, int] | None = None
        for box in self.char_boxes:
            center_x = box.x + box.width // 2
            center_y = box.y + box.height // 2
            distance = abs(center_x - x) + abs(center_y - y)
            if distance < 34 and (nearest is None or distance < nearest[0]):
                nearest = (distance, box.index)
        return nearest[1] if nearest else None

    def _screen_point_inside_text(self, screen_x: int, screen_y: int) -> bool:
        if not self.char_boxes:
            return False
        local_x = screen_x - self.root.winfo_rootx()
        local_y = screen_y - self.root.winfo_rooty()
        if self._char_at(local_x, local_y) is not None:
            return True
        for x1, y1, x2, y2 in self._selection_rects():
            if x1 <= local_x <= x2 and y1 <= local_y <= y2:
                return True
        return False

    def _watch_global_mouse(self) -> None:
        is_down = bool(user32.GetAsyncKeyState(0x01) & 0x8000)
        if is_down and not self.left_button_was_down:
            point = POINT()
            if user32.GetCursorPos(ctypes.byref(point)):
                if (
                    self.selection_anchor is not None
                    and self.root.state() != "withdrawn"
                    and not self._screen_point_inside_text(point.x, point.y)
                ):
                    self.selection_anchor = None
                    self.selection_focus = None
                    self.drag_started = False
                    self._hide_popup()
                    self._redraw_selection()
        self.left_button_was_down = is_down
        ctrl_down = bool(user32.GetAsyncKeyState(0x11) & 0x8000)
        undo_down = ctrl_down and (
            bool(user32.GetAsyncKeyState(0x58) & 0x8000) or bool(user32.GetAsyncKeyState(0x5A) & 0x8000)
        )
        if undo_down and not self.undo_combo_was_down and self.root.state() != "withdrawn":
            self._undo_last_translation()
        self.undo_combo_was_down = undo_down

        # Space is what a viewer already presses to stop and look at a line, so
        # it also asks what the whole line means. No modifier: the player takes
        # the key as well, which is the pause the viewer wanted anyway.
        space_down = bool(user32.GetAsyncKeyState(0x20) & 0x8000)
        if space_down and not self.space_was_down and not ctrl_down and self.active_cues:
            # Only when the player has the keyboard: a space typed in a chat
            # window behind the film is not a request to translate anything.
            watching = self.vlc_hwnd and user32.GetForegroundWindow() == self.vlc_hwnd
            asked = bool(player_prefs.load_player_prefs()["space_translates"])
            if asked and watching and self.root.state() != "withdrawn" and self.current_text.strip():
                self._translate_whole_line()
        self.space_was_down = space_down
        self.root.after(35, self._watch_global_mouse)

    def _translate_whole_line(self) -> None:
        """The line on screen, read as one - what space asks for.

        Nothing is highlighted: the whole line is the subject, and painting it
        all in mint only hides the film behind it.
        """
        line = self.current_text.strip()
        if not line:
            return
        anchor = self._selection_anchor_screen()
        key = line.lower()
        if key in self.cache:
            self._show_popup(self._popup_text(self.cache[key], line), anchor)
            return
        self.last_translation_job += 1
        # Reading is not keeping: what goes into the library is what the viewer
        # deliberately marked with the mouse.
        self.unsaved_jobs.add(self.last_translation_job)
        self._show_popup("...", anchor)
        threading.Thread(
            target=self._translate_in_background,
            args=(self.last_translation_job, key, line, anchor, line),
            name="vlc-subtitle-line",
            daemon=True,
        ).start()

    def _on_press(self, event: tk.Event[tk.Canvas]) -> str:
        char_index = self._char_at(event.x, event.y)
        if char_index is None:
            self.selection_anchor = None
            self.selection_focus = None
            self.drag_started = False
            self._hide_popup()
            self._redraw_selection()
            return "break"
        self.selection_anchor = char_index
        self.selection_focus = char_index
        self.drag_started = False
        self._hide_popup()
        self._animate_selection()
        return "break"

    def _on_drag(self, event: tk.Event[tk.Canvas]) -> str:
        if self.selection_anchor is None:
            return "break"
        char_index = self._char_at(event.x, event.y)
        if char_index is not None:
            if char_index != self.selection_focus:
                self.drag_started = True
            self.selection_focus = char_index
            self._redraw_selection()
        return "break"

    def _on_release(self, event: tk.Event[tk.Canvas]) -> str:
        if self.selection_anchor is None:
            return "break"
        char_index = self._char_at(event.x, event.y)
        if char_index is not None:
            self.selection_focus = char_index
        if self.selection_focus is not None and self.drag_started:
            self._translate_selection()
        return "break"

    def _on_double_click(self, event: tk.Event[tk.Canvas]) -> str:
        char_index = self._char_at(event.x, event.y)
        if char_index is None:
            return "break"
        word_start, word_end = self._word_range_at_char(char_index)
        self.selection_anchor = word_start
        self.selection_focus = word_end
        self._animate_selection()
        self._translate_selection()
        return "break"

    def _selected_text(self) -> str | None:
        if self.selection_anchor is None or self.selection_focus is None:
            return None
        start = min(self.selection_anchor, self.selection_focus)
        end = max(self.selection_anchor, self.selection_focus)
        selected = [box for box in self.char_boxes if start <= box.index <= end]
        if not selected:
            return None
        source_start = min(box.source_index for box in selected)
        source_end = max(box.source_index for box in selected)
        return self.current_text[source_start : source_end + 1].strip() or None

    def _word_range_at_char(self, char_index: int) -> tuple[int, int]:
        selected_box = next((box for box in self.char_boxes if box.index == char_index), None)
        if selected_box is None:
            return char_index, char_index
        source = selected_box.source_index
        start_source = source
        end_source = source
        while start_source > 0 and WORD_RE.fullmatch(self.current_text[start_source - 1 : end_source + 1]):
            start_source -= 1
        while end_source + 1 < len(self.current_text) and WORD_RE.fullmatch(self.current_text[start_source : end_source + 2]):
            end_source += 1
        indexes = [
            box.index
            for box in self.char_boxes
            if start_source <= box.source_index <= end_source and WORD_RE.fullmatch(self.current_text[start_source : end_source + 1])
        ]
        if not indexes:
            return char_index, char_index
        return min(indexes), max(indexes)

    def _selected_boxes(self) -> list[CharBox]:
        if self.selection_anchor is None or self.selection_focus is None:
            return []
        start = min(self.selection_anchor, self.selection_focus)
        end = max(self.selection_anchor, self.selection_focus)
        return [box for box in self.char_boxes if start <= box.index <= end]

    def _selection_anchor_screen(self) -> tuple[int, int]:
        selected = self._selected_boxes()
        if not selected:
            return self.root.winfo_rootx() + self.window_width // 2, self.root.winfo_rooty() + 20
        x1 = min(box.x for box in selected)
        x2 = max(box.x + box.width for box in selected)
        y1 = min(box.y for box in selected)
        return self.root.winfo_rootx() + (x1 + x2) // 2, self.root.winfo_rooty() + max(0, y1 - 46)

    def _translate_selection(self) -> None:
        selected_text = self._selected_text()
        if not selected_text:
            return
        key = selected_text.lower()
        anchor = self._selection_anchor_screen()
        if key in self.cache:
            result = self.cache[key]
            self._append_translation(selected_text, result)
            self._show_popup(self._popup_text(result, selected_text), anchor)
            return
        self.last_translation_job += 1
        job_id = self.last_translation_job
        self._show_popup("...", anchor)
        threading.Thread(
            target=self._translate_in_background,
            args=(job_id, key, selected_text, anchor, self._current_context()),
            name="vlc-subtitle-translate",
            daemon=True,
        ).start()

    def _current_context(self) -> str:
        """The subtitle the selection was taken from.

        "record" is a criminal record in a police station and a vinyl one in a
        music shop; the surrounding line is what tells the two apart.
        """
        primary = self.active_cues[0] if self.active_cues else -1
        cue = self.cues[primary] if 0 <= primary < len(self.cues) else None
        return cue.text if cue else self.current_text

    def _translate_in_background(self, job_id: int, key: str, selected_text: str, anchor: tuple[int, int], context: str = "") -> None:
        def preview(first: TranslationResult) -> None:
            self.events.put(("translation", (job_id, selected_text, first, anchor, False)))

        try:
            result = translate_selection_smart(selected_text, context, preview)
        except Exception:
            result = TranslationResult("\u043d\u0435\u0442 \u0441\u0432\u044f\u0437\u0438")
        self.cache[key] = result
        self.events.put(("translation", (job_id, selected_text, result, anchor, True)))

    def _popup_text(self, result: object, selected_text: str = "") -> tuple[str, str]:
        """Returns the headline and the supporting line for the popup.

        The headline is always the translation of what was actually selected.
        Showing only the key word — which is what this used to do — meant that
        selecting a whole sentence answered with a single dictionary word.
        """
        if not isinstance(result, TranslationResult):
            return str(result), ""

        word_count = len(WORD_RE.findall(selected_text or ""))
        focus_label = result.focus_phrase or result.focus_word

        if word_count <= 1:
            # A single word: the dictionary senses are the useful extra line.
            return result.text, result.variants[0] if result.variants else ""

        support = ""
        if (
            focus_label
            and result.focus_translation
            and focus_label.lower() != (selected_text or "").strip().lower()
            and result.focus_translation.lower() != result.text.lower()
        ):
            support = f"{focus_label} — {result.focus_translation}"
        elif result.variants:
            support = result.variants[0]
        return result.text, support

    def _append_translation(self, selected_text: str, result: TranslationResult) -> None:
        """Hold the save briefly; see SAVE_SETTLE_MS."""
        if self.pending_save is not None:
            waiting_text, timer = self.pending_save
            if self._same_thought(waiting_text, selected_text):
                self.root.after_cancel(timer)
            else:
                self.root.after_cancel(timer)
                self._commit_translation(*self.pending_payload)
            self.pending_save = None
        self.pending_payload = (selected_text, result)
        self.pending_save = (
            selected_text,
            self.root.after(SAVE_SETTLE_MS, self._commit_pending),
        )

    @staticmethod
    def _same_thought(first: str, second: str) -> bool:
        """One selection reaching for the same words as the other."""
        left = " ".join(first.lower().split())
        right = " ".join(second.lower().split())
        return bool(left) and bool(right) and (left in right or right in left)

    def _commit_pending(self) -> None:
        self.pending_save = None
        if self.pending_payload:
            self._commit_translation(*self.pending_payload)
            self.pending_payload = None

    def _commit_translation(self, selected_text: str, result: TranslationResult) -> None:
        primary = self.active_cues[0] if self.active_cues else -1
        cue = self.cues[primary] if 0 <= primary < len(self.cues) else None
        cue_label = cue_time_label(cue.start_ms) if cue else "--:--:--"
        focus = result.focus_phrase or result.focus_word
        variants = "; ".join(result.focus_variants or result.variants)
        suffix = f" | variants: {variants}" if variants else ""
        focus_part = f" | focus: {focus} - {result.focus_translation}" if focus else ""
        line = f"{selected_text} - {result.text}{focus_part}{suffix}\n"
        with open(self.translation_doc_path, "a", encoding="utf-8") as file:
            if file.tell() == 0:
                file.write("VLC subtitle selections\n")
                file.write("selected text - Russian translation | variants\n\n")
            file.write(line)
        self._append_word_translation(selected_text, result, cue_label, cue.text if cue else self.current_text)

    def _append_word_translation(
        self,
        selected_text: str,
        result: TranslationResult,
        cue_label: str,
        context: str,
    ) -> None:
        entry = {
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "source": self.source_label,
            "time": cue_label,
            "selected": selected_text,
            "translation": result.text,
            "variants": list(result.variants),
            "examples": list(result.examples),
            "focus_word": result.focus_word,
            "focus_phrase": result.focus_phrase,
            "focus_translation": result.focus_translation,
            "focus_variants": list(result.focus_variants),
            "focus_examples": list(result.focus_examples),
            "context": context,
        }
        with open(self.translation_entries_path, "a", encoding="utf-8") as file:
            file.write(json.dumps(entry, ensure_ascii=False) + "\n")
        # Sync has its own background thread: an unavailable server must never
        # freeze VLC or delay the next subtitle.
        sync_selection_async(entry)
        self._rebuild_word_document()

    def _read_translation_entries(self) -> list[dict[str, object]]:
        entries: list[dict[str, object]] = []
        try:
            with open(self.translation_entries_path, "r", encoding="utf-8") as file:
                for line in file:
                    try:
                        value = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if isinstance(value, dict):
                        entries.append(value)
        except OSError:
            return []
        return entries

    def _write_translation_entries(self, entries: list[dict[str, object]]) -> None:
        with open(self.translation_entries_path, "w", encoding="utf-8") as file:
            for entry in entries:
                file.write(json.dumps(entry, ensure_ascii=False) + "\n")

    def _rewrite_text_log(self, entries: list[dict[str, object]]) -> None:
        with open(self.translation_doc_path, "w", encoding="utf-8") as file:
            file.write("VLC subtitle selections\n")
            file.write("selected text - Russian translation | variants\n\n")
            for entry in entries:
                focus = entry.get("focus_phrase") or entry.get("focus_word") or ""
                focus_translation = entry.get("focus_translation") or ""
                variants = entry.get("focus_variants") or entry.get("variants", [])
                variants_text = "; ".join(str(item) for item in variants if item) if isinstance(variants, list) else ""
                suffix = f" | variants: {variants_text}" if variants_text else ""
                focus_part = f" | focus: {focus} - {focus_translation}" if focus else ""
                file.write(f"{entry.get('selected', '')} - {entry.get('translation', '')}{focus_part}{suffix}\n")

    def _undo_last_translation(self, _event: tk.Event[object] | None = None) -> str:
        entries = self._read_translation_entries()
        if not entries:
            self._show_popup(tr("nothing_to_delete"), self._selection_anchor_screen())
            return "break"
        removed = entries.pop()
        self._write_translation_entries(entries)
        self._rewrite_text_log(entries)
        try:
            build_word_document(self.translation_docx_path, entries)
        except OSError:
            pass
        self._show_popup(tr("deleted", what=removed.get("selected", "")), self._selection_anchor_screen())
        return "break"

    def _rebuild_word_document(self) -> None:
        entries = self._read_translation_entries()
        try:
            build_word_document(self.translation_docx_path, entries)
        except OSError:
            pass

    def _show_popup(self, text: tuple[str, str] | str, anchor: tuple[int, int]) -> None:
        headline, support = text if isinstance(text, tuple) else (text, "")
        self.popup_label.configure(text=headline)
        if support:
            self.popup_support.configure(text=support)
            self.popup_support.pack(pady=(2, 10))
        else:
            self.popup_support.pack_forget()
            self.popup_label.pack_configure(pady=(10, 10))
        self.popup.update_idletasks()
        width = self.popup.winfo_reqwidth()
        height = self.popup.winfo_reqheight()
        screen_w = self.root.winfo_screenwidth()
        x = max(10, min(screen_w - width - 10, anchor[0] - width // 2))
        y = max(10, anchor[1] - height)
        self.popup.geometry(f"{width}x{height}+{x}+{y}")
        self.popup.deiconify()
        self.popup.lift()
        # One timer at a time: the old one belonged to the answer that has just
        # been replaced, and letting it run would take this one down early.
        if self.popup_timer is not None:
            self.popup.after_cancel(self.popup_timer)
            self.popup_timer = None
        seconds = float(player_prefs.load_player_prefs()["popup_seconds"])
        if seconds > 0:
            self.popup_timer = self.popup.after(int(seconds * 1000), self._hide_popup)

    def _hide_popup(self) -> None:
        if self.popup_timer is not None:
            self.popup.after_cancel(self.popup_timer)
            self.popup_timer = None
        self.popup.withdraw()

    def _place_over_vlc(self) -> bool:
        rect = self._find_vlc_rect()
        if rect is None:
            return False
        else:
            left, top, right, bottom = rect
            vlc_width = max(1, right - left)
            vlc_height = max(1, bottom - top)
            width = min(MAX_WIDTH, max(MIN_WIDTH, int(vlc_width * 0.82)))
            font_pixels = max(44, min(72, int(vlc_height * 0.064)))
            needs_redraw = False
            if self.subtitle_font.cget("size") != -font_pixels:
                self.subtitle_font.configure(size=-font_pixels)
                if self.current_text:
                    self._layout_words()
                    needs_redraw = True
            x = left + (vlc_width - width) // 2
            bottom_margin = max(58, min(86, int(vlc_height * 0.065)))
            y = bottom - self.window_height - bottom_margin
        if width != self.window_width:
            self.window_width = width
            if self.current_text:
                self._layout_words()
                self._draw_subtitles()
                needs_redraw = False
        if needs_redraw:
            self._draw_subtitles()
        self.root.geometry(f"{self.window_width}x{self.window_height}+{x}+{y}")
        return True

    def _find_vlc_rect(self) -> tuple[int, int, int, int] | None:
        windows: list[tuple[int, int, int, int]] = []
        enum_proc = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

        @enum_proc
        def callback(hwnd: wintypes.HWND, _param: wintypes.LPARAM) -> bool:
            if not user32.IsWindowVisible(hwnd):
                return True
            length = user32.GetWindowTextLengthW(hwnd)
            if length <= 0:
                return True
            title = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, title, length + 1)
            if "VLC media player" not in title.value and " - VLC" not in title.value:
                return True
            rect = RECT()
            if user32.GetWindowRect(hwnd, ctypes.byref(rect)):
                windows.append((rect.left, rect.top, rect.right, rect.bottom))
                self.vlc_hwnd = int(hwnd)
            return True

        user32.EnumWindows(callback, 0)
        if not windows:
            return None
        return max(windows, key=lambda item: (item[2] - item[0]) * (item[3] - item[1]))

    def run(self) -> None:
        worker = threading.Thread(
            target=self._status_worker,
            daemon=True,
            name="vlc-status-poll",
        )
        worker.start()
        try:
            self.root.mainloop()
        finally:
            self.stop_status.set()


if __name__ == "__main__":
    instance_lock = claim_single_instance()
    if instance_lock is None:
        # Silent: this happens when the context-menu entry is used twice on the
        # same film, and a message box over the video would be worse than
        # simply letting the first overlay keep working.
        sys.exit(0)
    VlcSubtitleOverlay().run()
