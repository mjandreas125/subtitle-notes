"""Small shared enrichment routine for captures coming from browser/Android."""

from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from dataclasses import dataclass
from functools import lru_cache


WORD_RE = re.compile(r"[A-Za-z]+(?:[-'][A-Za-z]+)?")
STOP_WORDS = {"a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "for", "from", "had", "has", "have", "he", "her", "him", "his", "i", "if", "in", "is", "it", "its", "me", "my", "of", "on", "or", "our", "she", "that", "the", "their", "them", "there", "they", "this", "to", "was", "we", "were", "what", "when", "where", "who", "will", "with", "you", "your"}
AUXILIARY = {"am", "are", "be", "been", "being", "can", "could", "did", "do", "does", "had", "has", "have", "is", "may", "might", "must", "shall", "should", "was", "were", "will", "would", "to"}
PARTICLES = {"about", "across", "after", "away", "back", "down", "for", "from", "into", "off", "on", "out", "over", "through", "to", "up", "with"}
DISCOURSE_FILLERS = {"actually", "also", "already", "even", "just", "never", "not", "only", "quite", "really", "so", "still", "too", "very"}


@dataclass(frozen=True)
class Enrichment:
    translation: str
    focus_word: str
    focus_phrase: str
    focus_translation: str
    variants: list[str]
    examples: list[str]


def _translate(text: str) -> tuple[str, list[str], list[str]]:
    params = urllib.parse.urlencode([("client", "gtx"), ("sl", "en"), ("tl", "ru"), ("dt", "t"), ("dt", "bd"), ("dt", "ex"), ("dj", "1"), ("q", text)])
    request = urllib.request.Request(f"https://translate.googleapis.com/translate_a/single?{params}", headers={"User-Agent": "SubtitleNotes/1.0"})
    with urllib.request.urlopen(request, timeout=6) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, dict):
        return "", [], []
    translated = "".join(str(item.get("trans", "")) for item in payload.get("sentences", []) if isinstance(item, dict)).strip()
    variants: list[str] = []
    examples: list[str] = []
    for item in payload.get("dict", []):
        if not isinstance(item, dict):
            continue
        pos = str(item.get("pos", "")).strip()
        terms = [str(term) for term in item.get("terms", []) if term]
        if terms:
            variants.append(f"{pos}: {', '.join(terms[:8])}" if pos else ", ".join(terms[:8]))
    for item in payload.get("examples", {}).get("example", []) if isinstance(payload.get("examples"), dict) else []:
        if isinstance(item, dict) and item.get("src"):
            examples.append(str(item["src"]).replace("<b>", "").replace("</b>", ""))
    return translated, variants[:6], examples[:6]


@lru_cache(maxsize=512)
def _dictionary_examples(word: str) -> list[str]:
    """Fetch real English usage examples without requiring an API key."""
    if not word or " " in word.strip():
        return []
    try:
        encoded = urllib.parse.quote(word.strip().lower())
        request = urllib.request.Request(
            f"https://api.dictionaryapi.dev/api/v2/entries/en/{encoded}",
            headers={"User-Agent": "SubtitleNotes/1.0"},
        )
        with urllib.request.urlopen(request, timeout=4) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return []
    examples: list[str] = []
    if not isinstance(payload, list):
        return examples
    for entry in payload:
        if not isinstance(entry, dict):
            continue
        for meaning in entry.get("meanings", []):
            if not isinstance(meaning, dict):
                continue
            for definition in meaning.get("definitions", []):
                if not isinstance(definition, dict):
                    continue
                example = str(definition.get("example", "")).strip()
                if example and example not in examples:
                    examples.append(example)
                if len(examples) >= 2:
                    return examples
    return examples


def _bilingual_examples(examples: list[str]) -> list[str]:
    result: list[str] = []
    for example in examples[:2]:
        try:
            translation, _, _ = _translate(example)
        except Exception:
            translation = ""
        result.append(f"{example} — {translation}" if translation else example)
    return result


def _focus(text: str) -> tuple[str, str]:
    words = [(match.group(0), match.start()) for match in WORD_RE.finditer(text)]
    if not words:
        return "", ""
    lowered = [word.lower() for word, _ in words]
    lexical = next(
        (
            i
            for i, word in enumerate(lowered)
            if word not in STOP_WORDS and word not in AUXILIARY and word not in DISCOURSE_FILLERS
        ),
        0,
    )
    # Prefer an auxiliary's verb only when that auxiliary introduces the main
    # clause. A later perfect clause ("We brag ... we have done") must not
    # steal focus from the original action "brag".
    index = lexical
    for aux_index, word in enumerate(lowered[:-1]):
        if word not in AUXILIARY:
            continue
        candidate = aux_index + 1
        while candidate < len(lowered) and lowered[candidate] in DISCOURSE_FILLERS:
            candidate += 1
        if candidate >= len(lowered) or lowered[candidate] in STOP_WORDS:
            continue
        starts_clause = aux_index < lexical
        early_passive = (
            aux_index <= 2
            and lowered[0] in {"a", "an", "the"}
            and (lowered[candidate].endswith("ed") or lowered[candidate].endswith("ing"))
        )
        if starts_clause or early_passive:
            index = candidate
            break
    word = words[index][0]
    phrase = word
    if index + 1 < len(words) and lowered[index + 1] in PARTICLES:
        phrase = f"{word} {words[index + 1][0]}"
    return word, phrase


def enrich(text: str) -> Enrichment:
    whole, variants, examples = _translate(text)
    focus_word, focus_phrase = _focus(text)
    focus_translation, focus_variants, focus_examples = _translate(focus_phrase or text)
    source_example = []
    if len(WORD_RE.findall(text)) > 1 and whole:
        source_example = [f"{text.strip()} — {whole}"]
    dictionary_examples = _bilingual_examples(_dictionary_examples(focus_word))
    all_examples = source_example + [
        example
        for example in focus_examples + dictionary_examples
        if example not in source_example
    ]
    return Enrichment(
        whole or "Translation unavailable",
        focus_word,
        focus_phrase,
        focus_translation or whole,
        focus_variants or variants,
        all_examples[:4],
    )
