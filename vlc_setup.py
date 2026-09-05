"""Turns on VLC's small web interface, once, so nobody has to find it.

The overlay reads what VLC is playing through that interface. Opening a film
through "Open with Subtitle Notes" passes the switches on the command line, but
a film opened any other way - double-clicked, dragged onto VLC, already
playing - starts a VLC that is not listening, and the translation window then
has nothing to talk to.

VLC keeps its settings in a plain INI file, so the same switches can be written
there once at install time. After that every VLC started on this computer
listens, whoever started it.
"""

from __future__ import annotations

import os
from pathlib import Path

import player_prefs
from vlc_subtitle_overlay import VLC_PASSWORD

VLC_HOST = "127.0.0.1"
VLC_PORT = player_prefs.vlc_port()

# Section, key, value. `extraintf` and the address belong to VLC's core; the
# password belongs to the Lua interface that actually serves the pages.
def settings() -> tuple[tuple[str, str, str], ...]:
    prefs = player_prefs.load_player_prefs()
    return (
        ("core", "extraintf", "http"),
        ("core", "http-host", VLC_HOST),
        ("core", "http-port", str(VLC_PORT)),
        ("core", "short-jump-size", str(int(prefs["seek_seconds"]))),
        ("lua", "http-password", VLC_PASSWORD),
    )


def vlc_config_path() -> Path:
    return Path(os.environ.get("APPDATA", Path.home())) / "vlc" / "vlcrc"


def _apply(lines: list[str], section: str, key: str, value: str) -> list[str]:
    """Sets one key inside one section, leaving the rest of the file alone."""
    result: list[str] = []
    current = ""
    written = False
    section_seen = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("[") and stripped.endswith("]"):
            # Leaving the section without having found the key: add it here,
            # where it belongs, rather than at the end of the file where it
            # would silently join whichever section came last.
            if current == section and not written:
                result.append(f"{key}={value}")
                written = True
            current = stripped[1:-1]
            if current == section:
                section_seen = True
            result.append(line)
            continue
        # VLC writes its defaults commented out, e.g. "#http-port=8080".
        if current == section and stripped.lstrip("#").startswith(f"{key}="):
            if not written:
                existing = stripped.lstrip("#").split("=", 1)[1].strip()
                merged = value
                # Someone may already run another interface; adding ours should
                # not switch theirs off.
                if key == "extraintf" and existing and value not in existing.split(":"):
                    merged = f"{existing}:{value}"
                result.append(f"{key}={merged}")
                written = True
            continue
        result.append(line)
    if not written:
        if not section_seen:
            result.append("")
            result.append(f"[{section}]")
        result.append(f"{key}={value}")
    return result


def configure_vlc_http() -> tuple[bool, str]:
    """Writes the settings. Returns whether anything is now in place, and why
    not when it is not."""
    path = vlc_config_path()
    try:
        original = path.read_text(encoding="utf-8", errors="replace").splitlines() if path.exists() else []
        lines = list(original)
        for section, key, value in settings():
            lines = _apply(lines, section, key, value)
        if lines == original:
            return True, "already set"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return True, str(path)
    except OSError as error:
        return False, str(error)


def vlc_is_configured() -> bool:
    try:
        text = vlc_config_path().read_text(encoding="utf-8", errors="replace")
    except OSError:
        return False
    return "\nextraintf=" in f"\n{text}" and f"http-port={VLC_PORT}" in text


if __name__ == "__main__":
    done, detail = configure_vlc_http()
    print(("VLC configured: " if done else "Could not configure VLC: ") + detail)
