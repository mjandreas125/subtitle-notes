"""Desktop-side sync and a small setup window for Translated VLC."""

from __future__ import annotations

import hashlib
import json
import os
import re
import socket
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from desktop_i18n import system_language, tr


APP_FOLDER = Path(os.environ.get("APPDATA", Path.home())) / "Translated VLC"
CONFIG_PATH = APP_FOLDER / "sync_config.json"
OUTBOX_PATH = APP_FOLDER / "sync_outbox.jsonl"
SYNC_LOG_PATH = APP_FOLDER / "sync.log"
DEFAULT_API_URL = "https://subtitle-notes-api.andreas-sultseng228.workers.dev/v1"

# Anything that is not the permanent cloud service. Sessions issued by these
# hosts cannot be used by the Worker, so the address is reset and the computer
# is asked to pair again instead of posting selections into a void.
LEGACY_HOST_MARKERS = (".trycloudflare.com", "127.0.0.1", "localhost", ":8088")


def is_legacy_api_url(value: str) -> bool:
    return any(marker in value for marker in LEGACY_HOST_MARKERS)


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


def api_call(base_url: str, path: str, payload: dict[str, Any] | None = None, token: str = "") -> dict[str, Any]:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json", "User-Agent": USER_AGENT, "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(f"{base_url.rstrip('/')}{path}", data=body, headers=headers, method="POST" if body is not None else "GET")
    try:
        with urllib.request.urlopen(request, timeout=6) as response:
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
    return value if isinstance(value, dict) else None


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
    title = re.sub(r"\s+", " ", stem).strip(" .-_()[]")
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


# The page that signs a computer in. It is the same address the browser
# extension opens and the same one the square below encodes, so a phone camera
# and a click on the button end up in the same place.
LINK_PAGE = DEFAULT_API_URL.replace("/v1", "/link")

PAPER = "#faf8f4"
INK = "#14201c"
SOFT = "#6b7a74"
HAIR = "#e2ddd3"
ACCENT = "#1e7a4c"
WASH = "#e7f2ea"


def _qr_squares(text: str) -> list[list[bool]] | None:
    """The pairing link as a grid of dark and light squares, or nothing at all
    if the encoder is missing — the code underneath still works."""
    try:
        import segno
    except ImportError:
        return None
    try:
        return [[bool(cell) for cell in row] for row in segno.make(text, error="l", micro=False).matrix]
    except Exception:
        return None


def open_setup_window() -> None:
    """One window with three ways in: sign in with Google in the browser, scan
    the square with the phone, or type the code into the app. All three approve
    the same request, so the window waits the same way whichever is used."""
    import tkinter as tk
    import webbrowser
    from tkinter import font as tkfont

    from vlc_setup import configure_vlc_http

    config = load_sync_config()
    base_url = str(config.get("api_url", "")).strip().rstrip("/") or DEFAULT_API_URL
    if is_legacy_api_url(base_url):
        base_url = DEFAULT_API_URL

    root = tk.Tk()
    root.title(tr("connect_title"))
    root.configure(bg=PAPER)
    root.resizable(False, False)
    body = tkfont.Font(family="Segoe UI", size=10)
    title_font = tkfont.Font(family="Segoe UI", size=17, weight="bold")
    code_font = tkfont.Font(family="Consolas", size=19, weight="bold")
    small = tkfont.Font(family="Segoe UI", size=9)

    frame = tk.Frame(root, bg=PAPER, padx=26, pady=24)
    frame.pack(fill="both", expand=True)

    def draw_tour(parent: Any) -> None:
        """A small still of what the program does: a film frame, a caption with
        one word picked out of it, and the answer beside it."""
        canvas = tk.Canvas(parent, width=430, height=132, bg=PAPER, highlightthickness=0)
        canvas.pack(fill="x", pady=(0, 16))
        canvas.create_rectangle(0, 0, 250, 132, fill="#18201f", outline="")
        # The caption, with the picked word on a mint wash.
        canvas.create_rectangle(24, 88, 226, 116, fill="#0b0b0b", outline="")
        canvas.create_text(36, 102, anchor="w", text="No one wants", fill="#ffffff", font=("Segoe UI", 9, "bold"))
        canvas.create_rectangle(118, 91, 186, 113, fill="#2e9668", outline="")
        canvas.create_text(122, 102, anchor="w", text="a record", fill="#ffffff", font=("Segoe UI", 9, "bold"))
        # The answer, in the shape the real window uses.
        canvas.create_rectangle(266, 22, 430, 104, fill="#ffffff", outline=HAIR)
        canvas.create_rectangle(266, 22, 269, 104, fill=ACCENT, outline="")
        canvas.create_text(282, 44, anchor="w", text=tr("tour_line"), fill=INK, font=("Segoe UI", 9, "bold"))
        canvas.create_line(282, 62, 414, 62, fill=HAIR)
        canvas.create_text(282, 78, anchor="w", text=tr("tour_meaning"), fill=ACCENT, font=("Segoe UI", 9, "bold"))
        tk.Label(
            parent, text=tr("tour_steps"), font=small, fg=SOFT, bg=PAPER,
            anchor="w", justify="left", wraplength=430,
        ).pack(fill="x", pady=(0, 18))

    # Shown until the computer is connected: after that the person plainly
    # knows what this is.
    if not str(config.get("token", "")).strip():
        draw_tour(frame)
    tk.Label(frame, text=tr("connect_title"), font=title_font, fg=INK, bg=PAPER, anchor="w").pack(fill="x")
    tk.Label(frame, text=tr("connect_intro"), font=body, fg=SOFT, bg=PAPER, anchor="w", justify="left", wraplength=430).pack(fill="x", pady=(6, 18))

    # Empty to start with: the waiting line belongs to the waiting panel,
    # and a computer that is already connected must not be told to wait.
    status = tk.StringVar(value="")
    code_text = tk.StringVar(value="········")

    connected = tk.Frame(frame, bg=PAPER)
    waiting = tk.Frame(frame, bg=PAPER)

    def button(parent: Any, text: str, command: Any, primary: bool = True) -> Any:
        return tk.Button(
            parent, text=text, command=command, font=body, relief="flat", cursor="hand2",
            bg=ACCENT if primary else PAPER, fg="#ffffff" if primary else SOFT,
            activebackground=ACCENT if primary else WASH, activeforeground="#ffffff" if primary else INK,
            highlightthickness=0 if primary else 1, highlightbackground=HAIR, bd=0, padx=18, pady=9,
        )

    # ---- already connected --------------------------------------------------
    account = tk.StringVar(value="")
    tk.Label(connected, textvariable=account, font=body, fg=ACCENT, bg=PAPER, anchor="w").pack(fill="x", pady=(0, 6))
    tk.Label(connected, textvariable=status, font=small, fg=SOFT, bg=PAPER, anchor="w", justify="left", wraplength=430).pack(fill="x", pady=(0, 14))

    def forget() -> None:
        save_sync_config({"api_url": base_url})
        connected.pack_forget()
        start_pairing()

    button(connected, tr("disconnect"), forget, primary=False).pack(anchor="w")

    # ---- waiting for approval ----------------------------------------------
    # The page opens in the language Windows is set to, like the rest of this.
    google = button(
        waiting,
        tr("continue_google"),
        lambda: webbrowser.open(f"{LINK_PAGE}?code={code_text.get()}&lang={system_language()}"),
    )
    # Nothing to sign in against until the server has issued a code.
    google.configure(state="disabled")
    google.pack(fill="x")
    ways = tk.Frame(waiting, bg=PAPER)
    ways.pack(fill="x", pady=(16, 0))
    canvas = tk.Canvas(ways, width=140, height=140, bg="#ffffff", highlightthickness=1, highlightbackground=HAIR)
    canvas.pack(side="left")
    beside = tk.Frame(ways, bg=PAPER)
    beside.pack(side="left", fill="both", expand=True, padx=(16, 0))
    tk.Label(beside, text=tr("scan_hint"), font=small, fg=SOFT, bg=PAPER, anchor="w", justify="left", wraplength=250).pack(fill="x")
    tk.Label(beside, textvariable=code_text, font=code_font, fg=ACCENT, bg=WASH, anchor="w", padx=10, pady=6).pack(fill="x", pady=(10, 0))
    tk.Label(waiting, textvariable=status, font=small, fg=SOFT, bg=PAPER, anchor="w", justify="left", wraplength=430).pack(fill="x", pady=(14, 0))

    def draw_code(value: str) -> None:
        canvas.delete("all")
        squares = _qr_squares(f"{LINK_PAGE}?code={value}")
        if not squares:
            return
        size = len(squares)
        scale = 132 / (size + 6)
        for row, line in enumerate(squares):
            for column, dark in enumerate(line):
                if not dark:
                    continue
                x = (column + 3) * scale + 4
                y = (row + 3) * scale + 4
                canvas.create_rectangle(x, y, x + scale, y + scale, fill="#101a16", width=0)

    def finish(token: str, email: str) -> None:
        save_sync_config({"api_url": base_url, "email": email, "token": token})
        recovered = flush_outbox(base_url, token)
        # A computer that is connected should also be able to see what VLC is
        # playing, whoever started VLC. It is the same setup step either way.
        vlc_done, _ = configure_vlc_http()
        note = " " + tr("queued_sent", count=recovered) if recovered else ""
        vlc_note = " " + tr("vlc_configured") if vlc_done else ""
        account.set(tr("connected_as", email=email or "?"))
        status.set(tr("pairing_done") + note + vlc_note)
        waiting.pack_forget()
        connected.pack(fill="x")

    def poll(pairing_id: str, secret: str) -> None:
        for _ in range(300):
            time.sleep(2)
            try:
                result = api_call(base_url, "/pairings/poll", {"pairing_id": pairing_id, "request_secret": secret})
            except RuntimeError:
                continue
            if result.get("status") != "connected":
                continue
            token = str(result.get("token", ""))
            user = result.get("user") if isinstance(result.get("user"), dict) else {}
            if token:
                root.after(0, lambda: finish(token, str(user.get("email", ""))))
                return
        root.after(0, lambda: status.set(tr("code_expired")))

    def start_pairing() -> None:
        waiting.pack(fill="x")
        status.set(tr("waiting_confirm"))

        def ask() -> None:
            try:
                pairing = api_call(base_url, "/pairings/start", {"device_name": socket.gethostname()[:80] or "Windows computer"})
            except RuntimeError as error:
                root.after(0, lambda: status.set(str(error)))
                return
            pairing_id, secret, value = (str(pairing.get(key, "")) for key in ("pairing_id", "request_secret", "code"))
            if not (pairing_id and secret and value):
                root.after(0, lambda: status.set(tr("no_server")))
                return
            root.after(0, lambda: (code_text.set(value), draw_code(value), google.configure(state="normal")))
            poll(pairing_id, secret)

        threading.Thread(target=ask, daemon=True, name="subtitle-notes-pair").start()

    # A program with no store behind it has to say for itself when it is old.
    def offer_update() -> None:
        from desktop_update import newer_version

        found = newer_version()
        if not found:
            return
        version, url = found

        def show() -> None:
            bar = tk.Frame(frame, bg=WASH)
            bar.pack(fill="x", pady=(16, 0))
            tk.Label(
                bar, text=tr("update_ready", version=version), font=small, fg=ACCENT, bg=WASH,
                anchor="w", justify="left", wraplength=300, padx=12, pady=9,
            ).pack(side="left", fill="x", expand=True)
            tk.Button(
                bar, text=tr("update_open"), command=lambda: webbrowser.open(url), font=small,
                relief="flat", cursor="hand2", bg=ACCENT, fg="#ffffff", bd=0, padx=12, pady=7,
                activebackground=ACCENT, activeforeground="#ffffff", highlightthickness=0,
            ).pack(side="right", padx=(0, 10))

        root.after(0, show)

    threading.Thread(target=offer_update, daemon=True, name="subtitle-notes-update").start()

    if str(config.get("token", "")).strip():
        account.set(tr("connected_as", email=str(config.get("email", "")) or "?"))
        status.set(tr("pairing_done"))
        connected.pack(fill="x")
    else:
        start_pairing()
    root.mainloop()


if __name__ == "__main__":
    import sys

    # The installer runs this once with no window, so VLC is ready before the
    # first film is opened.
    if "--configure-vlc" in sys.argv:
        from vlc_setup import configure_vlc_http

        done, detail = configure_vlc_http()
        print(("VLC configured: " if done else "Could not configure VLC: ") + detail)
    else:
        open_setup_window()
