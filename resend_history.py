"""Pushes the local subtitle history to the cloud library.

Every selection is written to `Documents/Translated VLC/subtitle_translations.jsonl`
before it is sent, so a period where syncing was broken is recoverable: this
replays that file. The server deduplicates by client key, so running it twice
cannot create duplicates.

    python resend_history.py            # send anything missing
    python resend_history.py --dry-run  # just report what would be sent
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from sync_client import api_call, load_sync_config, selection_payload


def history_path() -> Path:
    profile = Path(os.environ.get("USERPROFILE", Path.home()))
    documents = profile / "Documents"
    folder = (documents if documents.is_dir() else profile) / "Translated VLC"
    return folder / "subtitle_translations.jsonl"


def read_history(path: Path) -> list[dict[str, object]]:
    if not path.exists():
        return []
    entries: list[dict[str, object]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict) and str(value.get("selected", "")).strip():
            entries.append(value)
    return entries


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    config = load_sync_config()
    base_url = str(config.get("api_url", "")).strip()
    token = str(config.get("token", "")).strip()
    if not base_url or not token:
        print("This computer is not connected. Open Subtitle Notes and pair it first.")
        return 1

    entries = read_history(history_path())
    if not entries:
        print("No local history to send.")
        return 0

    print(f"{len(entries)} selection(s) in the local history.")
    if args.dry_run:
        for entry in entries:
            print("  would send:", str(entry.get("selected"))[:60])
        return 0

    sent = failed = 0
    for entry in entries:
        try:
            api_call(base_url, "/selections", selection_payload(entry), token)
            sent += 1
        except RuntimeError as error:
            failed += 1
            print("  failed:", str(entry.get("selected"))[:40], "-", error)
    print(f"Sent {sent}, failed {failed}.")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
