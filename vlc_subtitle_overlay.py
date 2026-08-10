"""Selectable subtitle layer for VLC.

VLC plays the video. This helper renders the current SRT cue as VLC-like
bordered text over the video, lets the user select words, and shows a small
Russian translation popup.
"""

from __future__ import annotations

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


VLC_PASSWORD = "quicktranslate"
VLC_STATUS_URL = "http://127.0.0.1:8080/requests/status.json"
POLL_MS = 120
WINDOW_HEIGHT = 190
MIN_WIDTH = 520
MAX_WIDTH = 1800
SIDE_MARGIN = 44
TRANSPARENT_COLOR = "#010203"
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
        english_marks = (".en.", ".eng.", ".english.", ".en-", ".eng-", ".english-", "_en.", "_eng.", "_english.")

        def rank(candidate: str) -> tuple[int, int, str]:
            name = os.path.basename(candidate).lower()
            english_rank = 0 if any(mark in name for mark in english_marks) else 1
            return english_rank, len(name), name

        return sorted(candidates, key=rank)[0]
    return None


def translate_text(text: str) -> TranslationResult:
    params = urllib.parse.urlencode(
        [
            ("client", "gtx"),
            ("sl", "en"),
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


def choose_focus_phrase(text: str) -> tuple[str, str]:
    matches = list(WORD_RE.finditer(text))
    if not matches:
        cleaned = clean_plain_text(text)
        return cleaned, cleaned
    lowered = [match.group(0).lower() for match in matches]
    focus_index: int | None = None

    for index, word in enumerate(lowered[:-1]):
        if word in AUXILIARY_WORDS:
            for next_index in range(index + 1, len(matches)):
                if lowered[next_index] not in STOP_WORDS:
                    focus_index = next_index
                    break
            if focus_index is not None:
                break

    if focus_index is None:
        for index, word in enumerate(lowered):
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


def translate_selection_smart(text: str) -> TranslationResult:
    phrase_result = translate_text(text)
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
    return TranslationResult(
        phrase_result.text,
        phrase_result.variants,
        phrase_result.examples,
        focus_word=focus_word,
        focus_phrase=focus_phrase,
        focus_translation=phrase_focus_result.text,
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
        examples_text = "Google не вернул отдельных примеров для этого слова"
    title_focus = focus_phrase or entry.get("selected", "")
    title = f"{title_focus} - {focus_translation}"
    rows = [
        docx_row("Выделенная фраза", entry.get("selected", ""), fill="EAF7F2"),
        docx_row("Перевод фразы", entry.get("translation", ""), fill="EAF7F2"),
        docx_row("Главное слово", focus_word or focus_phrase, fill="F4FBF8"),
        docx_row("Выражение", focus_phrase, fill="F4FBF8"),
        docx_row("Значение здесь", focus_translation, fill="F4FBF8"),
        docx_row("Другие значения", variants_text or "Google не вернул отдельных вариантов для этого слова"),
        docx_row("Примеры и выражения", examples_text),
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
        docx_paragraph("Каждое выделенное слово или фраза сохраняется отдельной таблицей.", size=20, color="444444"),
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
        self.cue_index = -1
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
        self.playback_base_ms = 0
        self.playback_seen_at = time_module.monotonic()
        self.playback_running = False
        self.last_polled_ms: int | None = None

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

        self.popup = tk.Toplevel(self.root)
        self.popup.withdraw()
        self.popup.overrideredirect(True)
        self.popup.attributes("-topmost", True)
        self.popup.attributes("-alpha", 0.94)
        self.popup.configure(bg="#07100e")
        self.popup_label = tk.Label(
            self.popup,
            bg="#07100e",
            fg="#a9f2d5",
            padx=14,
            pady=8,
            font=("Segoe UI", 15, "bold"),
            justify="center",
            wraplength=720,
        )
        self.popup_label.pack()

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
        status = self._read_vlc_status()
        if status is None:
            self.root.withdraw()
            self._hide_popup()
            self.root.after(600, self._poll)
            return

        if not self._place_over_vlc():
            self.root.withdraw()
            self._hide_popup()
            self.root.after(600, self._poll)
            return
        current_ms = self._current_playback_ms(status)
        if self.last_polled_ms is not None and abs(current_ms - self.last_polled_ms) > 1500:
            self.cue_index = -2
            self.selection_anchor = None
            self.selection_focus = None
            self.current_text = ""
            self.char_boxes = []
            self.render_parts = []
            self.subtitle_image_cache = {}
            self.canvas.delete("all")
            self._hide_popup()
        self.last_polled_ms = current_ms
        next_index = self._cue_for_time(current_ms)
        if next_index != self.cue_index:
            self.cue_index = next_index
            self.selection_anchor = None
            self.selection_focus = None
            self._hide_popup()
            if next_index < 0:
                self.current_text = ""
                self.char_boxes = []
                self.render_parts = []
                self.subtitle_images = []
                self.subtitle_image_cache = {}
                self.canvas.delete("all")
                self.root.withdraw()
            else:
                self.current_text = self.cues[next_index].text
                self._layout_words()
                self._draw_subtitles()
                self.root.deiconify()
        self.root.after(POLL_MS, self._poll)

    def _drain_events(self) -> None:
        try:
            while True:
                kind, value = self.events.get_nowait()
                if kind == "translation":
                    job_id, selected_text, result, anchor = value  # type: ignore[misc]
                    if isinstance(result, TranslationResult):
                        self.cache[str(selected_text).lower()] = result
                        self._append_translation(str(selected_text), result)
                    if job_id == self.last_translation_job:
                        self._show_popup(self._popup_text(result), anchor)
        except queue.Empty:
            return

    def _read_vlc_status(self) -> dict[str, object] | None:
        token = base64.b64encode(f":{VLC_PASSWORD}".encode("utf-8")).decode("ascii")
        url = f"{VLC_STATUS_URL}?_={time_module.time_ns()}"
        request = urllib.request.Request(url, headers={"Authorization": f"Basic {token}"})
        try:
            with urllib.request.urlopen(request, timeout=0.3) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception:
            return None

    def _cue_for_time(self, current_ms: int) -> int:
        index = bisect.bisect_right(self.cue_starts, current_ms) - 1
        if 0 <= index < len(self.cues):
            cue = self.cues[index]
            if cue.start_ms <= current_ms <= cue.end_ms:
                return index
        return -1

    def _current_playback_ms(self, status: dict[str, object]) -> int:
        now = time_module.monotonic()
        raw_time_ms = int(float(status.get("time", 0) or 0) * 1000)
        time_ms = raw_time_ms
        used_precise_position = False
        try:
            position = float(status.get("position", 0) or 0)
            length = float(status.get("length", 0) or 0)
        except (TypeError, ValueError):
            position = 0.0
            length = 0.0
        if 0 < position <= 1 and length > 0:
            precise_ms = int(position * length * 1000)
            previous_ms = self.last_polled_ms
            if abs(precise_ms - raw_time_ms) <= 2500:
                time_ms = precise_ms
                used_precise_position = True
            elif previous_ms is None:
                time_ms = precise_ms if raw_time_ms <= 1500 else raw_time_ms
                used_precise_position = time_ms == precise_ms
            else:
                raw_delta = abs(raw_time_ms - previous_ms)
                precise_delta = abs(precise_ms - previous_ms)
                if raw_delta > 1500 and precise_delta <= 1500:
                    time_ms = raw_time_ms
                elif precise_delta > 1500 and raw_delta <= 1500:
                    time_ms = precise_ms
                    used_precise_position = True
                else:
                    time_ms = precise_ms
                    used_precise_position = True
        is_playing = str(status.get("state", "")).lower() == "playing"
        if used_precise_position:
            self.playback_base_ms = time_ms
            self.playback_seen_at = now
            self.playback_running = is_playing
            return time_ms
        if is_playing and self.playback_running:
            predicted_ms = int(self.playback_base_ms + (now - self.playback_seen_at) * 1000)
            if abs(time_ms - predicted_ms) <= 900:
                return predicted_ms
        self.playback_base_ms = time_ms
        self.playback_seen_at = now
        self.playback_running = is_playing
        return self.playback_base_ms

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
            self.root.withdraw()
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
        self.root.after(35, self._watch_global_mouse)

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
            self._show_popup(self._popup_text(result), anchor)
            return
        self.last_translation_job += 1
        job_id = self.last_translation_job
        self._show_popup("...", anchor)
        threading.Thread(
            target=self._translate_in_background,
            args=(job_id, key, selected_text, anchor),
            name="vlc-subtitle-translate",
            daemon=True,
        ).start()

    def _translate_in_background(self, job_id: int, key: str, selected_text: str, anchor: tuple[int, int]) -> None:
        try:
            result = translate_selection_smart(selected_text)
        except Exception:
            result = TranslationResult("\u043d\u0435\u0442 \u0441\u0432\u044f\u0437\u0438")
        self.cache[key] = result
        self.events.put(("translation", (job_id, selected_text, result, anchor)))

    def _popup_text(self, result: object) -> str:
        if not isinstance(result, TranslationResult):
            return str(result)
        if result.focus_word and result.focus_translation:
            label = result.focus_phrase or result.focus_word
            if result.focus_variants:
                return f"{label} - {result.focus_translation}\n{result.focus_variants[0]}"
            return f"{label} - {result.focus_translation}"
        if not result.variants:
            return result.text
        return f"{result.text}\n{result.variants[0]}"

    def _append_translation(self, selected_text: str, result: TranslationResult) -> None:
        cue = self.cues[self.cue_index] if 0 <= self.cue_index < len(self.cues) else None
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
            self._show_popup("Нечего удалить", self._selection_anchor_screen())
            return "break"
        removed = entries.pop()
        self._write_translation_entries(entries)
        self._rewrite_text_log(entries)
        try:
            build_word_document(self.translation_docx_path, entries)
        except OSError:
            pass
        self._show_popup(f"Удалено: {removed.get('selected', '')}", self._selection_anchor_screen())
        return "break"

    def _rebuild_word_document(self) -> None:
        entries = self._read_translation_entries()
        try:
            build_word_document(self.translation_docx_path, entries)
        except OSError:
            pass

    def _show_popup(self, text: str, anchor: tuple[int, int]) -> None:
        self.popup_label.configure(text=text)
        self.popup.update_idletasks()
        width = self.popup.winfo_reqwidth()
        height = self.popup.winfo_reqheight()
        screen_w = self.root.winfo_screenwidth()
        x = max(10, min(screen_w - width - 10, anchor[0] - width // 2))
        y = max(10, anchor[1] - height)
        self.popup.geometry(f"{width}x{height}+{x}+{y}")
        self.popup.deiconify()
        self.popup.lift()
        self.popup.after(6500, self._hide_popup)

    def _hide_popup(self) -> None:
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
            return True

        user32.EnumWindows(callback, 0)
        if not windows:
            return None
        return max(windows, key=lambda item: (item[2] - item[0]) * (item[3] - item[1]))

    def run(self) -> None:
        self.root.mainloop()


if __name__ == "__main__":
    VlcSubtitleOverlay().run()
