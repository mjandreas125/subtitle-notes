"""Tells the Windows program when a newer installer exists.

There is no store behind this program, so nothing would ever tell a person
that their copy is a year old. It asks the same server the words go to, once
per run, and never gets in the way: a failed check is silence, not an error.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request

from sync_client import DEFAULT_API_URL, USER_AGENT, log_sync

# Bumped with the installer version in installer/SubtitleNotes.iss; a stale
# value here tells everyone to install the version they are already running.
VERSION = "1.6.9"
LATEST_URL = DEFAULT_API_URL.replace("/v1", "/desktop/latest")


def _parts(value: str) -> tuple[int, ...]:
    numbers = []
    for piece in str(value).split("."):
        digits = "".join(character for character in piece if character.isdigit())
        numbers.append(int(digits) if digits else 0)
    return tuple(numbers)


def newer_version() -> tuple[str, str] | None:
    """(version, download page) when the server knows a newer one."""
    request = urllib.request.Request(LATEST_URL, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, ValueError, OSError) as error:
        log_sync(f"update check failed: {error}")
        return None
    version = str(payload.get("version", ""))
    url = str(payload.get("url", ""))
    if not version or not url or _parts(version) <= _parts(VERSION):
        return None
    return version, url


if __name__ == "__main__":
    found = newer_version()
    print(f"Update available: {found[0]} -> {found[1]}" if found else f"Up to date ({VERSION})")
