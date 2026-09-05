"""Desktop-side sync and a small setup window for Translated VLC."""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from desktop_i18n import tr


APP_FOLDER = Path(os.environ.get("APPDATA", Path.home())) / "Translated VLC"
CONFIG_PATH = APP_FOLDER / "sync_config.json"
OUTBOX_PATH = APP_FOLDER / "sync_outbox.jsonl"
SYNC_LOG_PATH = APP_FOLDER / "sync.log"
DEFAULT_API_URL = "https://app.subtitlenotes.workers.dev/v1"
# The address the product used while the Workers subdomain still carried the
# owner's e-mail. It no longer resolves; it is kept only to recognise it in a
# settings file written before the move.
PREVIOUS_API_URL = "https://subtitle-notes-api.andreas-sultseng228.workers.dev/v1"

# Anything that is not the permanent cloud service. Sessions issued by these
# hosts cannot be used by the Worker, so the address is reset and the computer
# is asked to pair again instead of posting selections into a void.
LEGACY_HOST_MARKERS = (".trycloudflare.com", "127.0.0.1", "localhost", ":8088")


def is_legacy_api_url(value: str) -> bool:
    return any(marker in value for marker in LEGACY_HOST_MARKERS)


def reachable_api_url() -> str:
    """Whichever of the two addresses answers, new one first.

    The token is issued by the Worker, not by the hostname, so a session made
    on one address keeps working on the other.
    """
    for candidate in (DEFAULT_API_URL,):
        try:
            request = urllib.request.Request(
                candidate.replace("/v1", "/desktop/latest"),
                headers={"User-Agent": USER_AGENT},
            )
            with urllib.request.urlopen(request, timeout=4):
                return candidate
        except Exception:
            continue
    return DEFAULT_API_URL


def load_sync_config() -> dict[str, str]:
    try:
        value = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        if not isinstance(value, dict):
            return {}
        # Earlier builds pointed at a Quick Tunnel or at the local development
        # server on port 8088. Both are gone; keeping their address here means
        # every selection fails silently.
        if is_legacy_api_url(str(value.get("api_url", ""))):
            value["api_url"] = DEFAULT_API_URL
            value.pop("token", None)
            save_sync_config(value)
            return value
        # The address moved off the owner's e-mail. Same Worker, same session:
        # only the hostname is different, so the token is kept.
        if PREVIOUS_API_URL.rsplit("/", 1)[0] in str(value.get("api_url", "")):
            value["api_url"] = reachable_api_url()
            save_sync_config(value)
        return value
    except (OSError, json.JSONDecodeError):
        return {}


def log_sync(message: str) -> None:
    """Sync runs in the background behind a video player, so failures have to
    leave a trace somewhere the user can be pointed at."""
    try:
        APP_FOLDER.mkdir(parents=True, exist_ok=True)
        stamp = time.strftime("%Y-%m-%d %H:%M:%S")
        with SYNC_LOG_PATH.open("a", encoding="utf-8") as handle:
            handle.write(f"{stamp}  {message}\n")
    except OSError:
        pass


def save_sync_config(config: dict[str, str]) -> None:
    APP_FOLDER.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")


# Cloudflare rejects the default `Python-urllib/3.x` agent with 403 before the
# Worker ever runs, which is why every selection used to vanish without an
# error the user could see. Identify the app properly instead.
USER_AGENT = "TranslatedVLC/1.3 (Windows; Subtitle Notes desktop)"

# An older Worker could send this literal string in a successful JSON response.
# It is an error marker, not Russian text, and must never replace the result the
# VLC popup already has from another provider.
UNAVAILABLE_TRANSLATIONS = {"translation unavailable"}


def has_translation(value: object) -> bool:
    text = " ".join(str(value or "").split()).strip().lower()
    return bool(text and text not in UNAVAILABLE_TRANSLATIONS)


def api_call(
    base_url: str,
    path: str,
    payload: dict[str, Any] | None = None,
    token: str = "",
    timeout: float = 6.0,
) -> dict[str, Any]:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json", "User-Agent": USER_AGENT, "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(f"{base_url.rstrip('/')}{path}", data=body, headers=headers, method="POST" if body is not None else "GET")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            value = json.loads(response.read().decode("utf-8"))
            return value if isinstance(value, dict) else {}
    except urllib.error.HTTPError as error:
        try:
            detail = json.loads(error.read().decode("utf-8")).get("detail")
        except Exception:
            detail = None
        raise RuntimeError(str(detail or tr("server_returned", code=error.code))) from error
    except urllib.error.URLError as error:
        raise RuntimeError(tr("no_server")) from error


def cloud_quick_translation(text: str, timeout: float = 5.0) -> str:
    """A paired Worker is the fallback for the desktop's direct dictionary.

    The player normally receives a local Google result first because that is
    fast. When that undocumented endpoint rate-limits the computer, the Worker
    retries through its independent providers instead of leaving an English
    ``Translation unavailable`` marker in the popup.
    """
    config = load_sync_config()
    base_url = str(config.get("api_url", "")).strip()
    token = str(config.get("token", "")).strip()
    if not text.strip() or not base_url or not token or is_legacy_api_url(base_url):
        return ""
    try:
        answer = api_call(base_url, "/quick", {"text": text}, token, timeout=timeout)
    except RuntimeError as error:
        log_sync(f"quick translation failed: {error}")
        return ""
    translation = str(answer.get("translation") or "").strip()
    return translation if has_translation(translation) else ""


def cloud_reading(text: str, context: str = "", timeout: float = 6.0) -> dict[str, Any] | None:
    """Asks the paired server what the selection means in its line.

    The dictionary translates a word on its own, which is how "No one wants a
    record." became "никто не хочет рекорд". The server reads the whole line and
    answers with the sense a dubbing translator would use. It is an
    improvement, never a requirement: if this computer is not paired, or the
    server is slow or down, the caller keeps its own translation.
    """
    config = load_sync_config()
    base_url = str(config.get("api_url", "")).strip()
    token = str(config.get("token", "")).strip()
    if not base_url or not token or is_legacy_api_url(base_url):
        return None
    payload = {"text": text, "context": context}
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/reading",
        data=body,
        headers={
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            value = json.loads(response.read().decode("utf-8"))
    except Exception as error:
        log_sync(f"reading failed: {error}")
        return None
    if not isinstance(value, dict):
        return None
    # Do not let an error phrase from a cached or just-deployed older Worker
    # overwrite the local dictionary result. Empty fields mean "keep the answer
    # already on screen" to the overlay.
    for field in ("translation", "focus_translation"):
        if not has_translation(value.get(field)):
            value[field] = ""
    return value


def drop_orphan_brackets(text: str) -> str:
    """Bracket characters whose partner was cut away with the release tags.

    Cutting "2160p BluRay" off "The Menu (2022) 2160p BluRay" leaves the name
    intact, but trimming the leftover punctuation used to take the closing
    bracket with it and file the film as "The Menu (2022".
    """
    keep = [True] * len(text)
    for opener, closer in (("(", ")"), ("[", "]")):
        waiting: list[int] = []
        for index, character in enumerate(text):
            if character == opener:
                waiting.append(index)
            elif character == closer:
                if waiting:
                    waiting.pop()
                else:
                    keep[index] = False
        for index in waiting:
            keep[index] = False
    return "".join(character for character, wanted in zip(text, keep) if wanted)


def clean_media_name(source_label: str) -> tuple[str, str | None, str | None]:
    stem = os.path.splitext(os.path.basename(source_label))[0]
    stem = re.sub(r"[._-]+", " ", stem)
    match = re.search(r"\bS(\d{1,2})\s*E(\d{1,3})\b", stem, re.IGNORECASE)
    if not match:
        match = re.search(r"\b(\d{1,2})x(\d{1,3})\b", stem, re.IGNORECASE)
    season = str(int(match.group(1))) if match else None
    episode = str(int(match.group(2))) if match else None
    if match:
        stem = stem[: match.start()]
    stem = re.sub(r"\b(2160p|1080p|720p|480p|web[ -]?dl|webrip|bluray|brrip|x264|x265|h\.?264|h\.?265|hevc|aac|ddp\d*|proper|repack)\b.*$", "", stem, flags=re.IGNORECASE)
    title = re.sub(r"\s+", " ", drop_orphan_brackets(stem)).strip(" .-_")
    return title or tr("unknown_film"), season, episode


def selection_payload(entry: dict[str, Any]) -> dict[str, Any]:
    title, season, episode = clean_media_name(str(entry.get("source", "")))
    unique = "|".join((str(entry.get("source", "")), str(entry.get("time", "")), str(entry.get("selected", "")), str(entry.get("created_at", ""))))
    return {
        "client_key": hashlib.sha256(unique.encode("utf-8")).hexdigest(),
        "media_title": title,
        "season": season,
        "episode": episode,
        "timecode_ms": parse_timecode(str(entry.get("time", ""))),
        "selected_text": str(entry.get("selected", "")),
        "translation": str(entry.get("translation", "")),
        "focus_word": str(entry.get("focus_word", "")) or None,
        "focus_phrase": str(entry.get("focus_phrase", "")) or None,
        "focus_translation": str(entry.get("focus_translation", "")) or None,
        "variants": list(entry.get("focus_variants") or entry.get("variants") or []),
        "examples": list(entry.get("focus_examples") or entry.get("examples") or []),
        "context": str(entry.get("context", "")) or None,
    }


def queue_payload(payload: dict[str, Any]) -> None:
    """Park a selection that could not be sent. Sending is best-effort and must
    never block the player, but the note itself should survive a dead Wi-Fi."""
    try:
        APP_FOLDER.mkdir(parents=True, exist_ok=True)
        with OUTBOX_PATH.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
    except OSError:
        pass


def read_outbox() -> list[dict[str, Any]]:
    try:
        lines = OUTBOX_PATH.read_text(encoding="utf-8").splitlines()
    except OSError:
        return []
    items: list[dict[str, Any]] = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            items.append(value)
    return items


def write_outbox(items: list[dict[str, Any]]) -> None:
    try:
        if not items:
            OUTBOX_PATH.unlink(missing_ok=True)
            return
        APP_FOLDER.mkdir(parents=True, exist_ok=True)
        OUTBOX_PATH.write_text(
            "\n".join(json.dumps(item, ensure_ascii=False) for item in items) + "\n",
            encoding="utf-8",
        )
    except OSError:
        pass


def flush_outbox(base_url: str, token: str, limit: int = 40) -> int:
    """Resend parked selections. The server deduplicates by client key, so a
    payload that actually did arrive before the connection dropped cannot turn
    into a duplicate card."""
    pending = read_outbox()
    if not pending:
        return 0
    sent = 0
    remaining: list[dict[str, Any]] = []
    for index, payload in enumerate(pending):
        if index >= limit:
            remaining.append(payload)
            continue
        try:
            # `/captures` lets the cloud detect the subtitle language and
            # derive a card again. `/selections` trusted the old local
            # English-only dictionary result verbatim.
            api_call(base_url, "/captures", payload, token)
            sent += 1
        except RuntimeError as error:
            log_sync(f"retry failed ({error}); {len(pending) - index} still queued")
            remaining.extend(pending[index:])
            break
    write_outbox(remaining)
    if sent:
        log_sync(f"sent {sent} queued selection(s)")
    return sent


def sync_selection_async(entry: dict[str, Any]) -> None:
    """Never hold the VLC subtitle UI while the network is slow or unavailable."""
    config = load_sync_config()
    base_url = config.get("api_url", "").strip()
    token = config.get("token", "").strip()
    payload = selection_payload(entry)
    if not base_url or not token:
        # Not paired yet. Keep the selection so it lands in the library as soon
        # as this computer is connected, instead of disappearing.
        queue_payload(payload)
        log_sync("not connected to an account; selection queued")
        return

    def send() -> None:
        try:
            api_call(base_url, "/captures", payload, token)
        except RuntimeError as error:
            queue_payload(payload)
            log_sync(f"send failed ({error}); selection queued")
            return
        flush_outbox(base_url, token)

    threading.Thread(target=send, daemon=True, name="translated-vlc-sync").start()


def parse_timecode(label: str) -> int | None:
    try:
        hours, minutes, seconds = (int(value) for value in label.split(":"))
        return (hours * 3600 + minutes * 60 + seconds) * 1000
    except (TypeError, ValueError):
        return None


# ---- the one program --------------------------------------------------------
#
# Connecting used to be a program of its own: a window with a code in it, a
# separate entry in the Start menu, and no way in from the program people
# actually opened. Somebody who installed Subtitle Notes and opened Subtitle
# Notes found a screen asking for a phone and no mention of Google, because the
# Google button was in the other program.
#
# So there is one window now - the library - and it signs itself in. What is
# left here is what the player and the capture helper import, plus a small
# executable the installer runs to switch VLC's web interface on. Started by
# hand, from a shortcut left over from before, it opens the program.


def app_executable() -> Path | None:
    """The Subtitle Notes window, wherever this helper happens to be running."""
    roots = []
    try:
        # Beside this helper: how the installer lays the folder out.
        roots.append(Path(sys.executable).resolve().parent)
    except OSError:
        pass
    roots.append(Path(__file__).resolve().parent)
    roots.append(Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Subtitle Notes")
    # Running from a checkout, where Flutter leaves its build.
    roots.append(Path(__file__).resolve().parent / "mobile" / "build" / "windows" / "x64" / "runner" / "Release")
    for root in roots:
        for candidate in (root / "Library" / "translated_vlc_mobile.exe", root / "translated_vlc_mobile.exe"):
            if candidate.exists():
                return candidate
    return None


def open_the_app() -> bool:
    """Starts the program. False when it is not installed beside this helper."""
    import subprocess

    found = app_executable()
    if not found:
        log_sync("no Subtitle Notes window found to open")
        return False
    try:
        subprocess.Popen([str(found)], cwd=str(found.parent), close_fds=True)
        return True
    except OSError as error:
        log_sync(f"could not start the app: {error}")
        return False


if __name__ == "__main__":
    # The installer runs this once with no window, so VLC is ready before the
    # first film is opened.
    if "--configure-vlc" in sys.argv:
        from vlc_setup import configure_vlc_http

        done, detail = configure_vlc_http()
        print(("VLC configured: " if done else "Could not configure VLC: ") + detail)
    else:
        open_the_app()
