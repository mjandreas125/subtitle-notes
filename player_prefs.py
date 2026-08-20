"""What the player should pick, and where to reach it.

Kept beside the account settings in one file, because a person editing either
of them thinks of it as the same program.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

CONFIG_PATH = Path(os.environ.get("APPDATA", Path.home())) / "Translated VLC" / "sync_config.json"

# 8080 is the first port every local server takes - the port VLC shipped with,
# and also the port half the world's development servers listen on. When one of
# those is already running, VLC silently has no interface and the overlay sits
# there with nothing to show. This one is ours.
DEFAULT_VLC_PORT = 8422
# An installation from before the move still answers on the old port.
FALLBACK_VLC_PORTS = (8080,)

# Empty means "whatever the file opens with", which is what VLC does on its own.
DEFAULTS = {"audio_language": "en", "subtitle_language": "en", "vlc_port": DEFAULT_VLC_PORT}

# Two-letter code -> the three-letter form ffmpeg and matroska tags use.
THREE_LETTER = {
    "en": "eng", "ru": "rus", "et": "est", "de": "deu", "fr": "fra", "es": "spa",
    "it": "ita", "pt": "por", "pl": "pol", "uk": "ukr", "nl": "nld", "sv": "swe",
    "fi": "fin", "tr": "tur", "ja": "jpn", "ko": "kor", "zh": "zho", "da": "dan",
    "no": "nor", "cs": "ces", "lv": "lav", "lt": "lit",
}


def load_player_prefs() -> dict[str, object]:
    values = dict(DEFAULTS)
    try:
        stored = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return values
    if isinstance(stored, dict):
        for key in DEFAULTS:
            if key in stored:
                values[key] = stored[key]
    try:
        values["vlc_port"] = int(values["vlc_port"]) or DEFAULT_VLC_PORT
    except (TypeError, ValueError):
        values["vlc_port"] = DEFAULT_VLC_PORT
    return values


def save_player_prefs(changes: dict[str, object]) -> None:
    """Write these keys, leaving the account settings in the file alone."""
    try:
        stored = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        if not isinstance(stored, dict):
            stored = {}
    except (OSError, ValueError):
        stored = {}
    stored.update(changes)
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(stored, ensure_ascii=False, indent=2), encoding="utf-8")


def language_codes(value: object) -> list[str]:
    """Both spellings of a language, so a tag written either way matches.

    An empty preference gives an empty list: nothing is preferred, and the
    file's own order decides.
    """
    code = str(value or "").strip().lower()
    if not code:
        return []
    codes = [code]
    if code in THREE_LETTER:
        codes.append(THREE_LETTER[code])
    for short, long in THREE_LETTER.items():
        if code == long and short not in codes:
            codes.append(short)
    return codes


def vlc_port() -> int:
    return int(load_player_prefs()["vlc_port"])
