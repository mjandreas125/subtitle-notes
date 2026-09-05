"""Re-runs the current word logic over cards saved by an older build.

The saved subtitle text is never changed; only what was derived from it - the
headword, its meaning, the sense list and the examples. A card is left exactly
as it was if the translation service is unavailable, so a rate-limited run can
be repeated safely.

    python repair_library.py --dry-run   # list what would change
    python repair_library.py             # repair everything that needs it
    python repair_library.py --all       # re-run over every card
"""

from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.request

from sync_client import USER_AGENT, load_sync_config

# Google's public translate endpoint rate-limits bursts, and the worker calls
# it several times per card.
PAUSE_SECONDS = 8
RETRIES = 3
RETRY_PAUSE_SECONDS = 25


def api(base_url: str, token: str, path: str, method: str = "GET") -> dict:
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        data=b"{}" if method == "POST" else None,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "User-Agent": USER_AGENT,
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as error:
        detail = ""
        try:
            detail = json.loads(error.read().decode("utf-8")).get("detail", "")
        except Exception:
            pass
        return {"error": detail or f"HTTP {error.code}"}
    except urllib.error.URLError as error:
        return {"error": str(error.reason)}


def label(card: dict) -> str:
    return str(card.get("focus_phrase") or card.get("focus_word") or card.get("selected_text", ""))


def meaning(card: dict) -> str:
    return str(card.get("focus_translation") or card.get("translation") or "")


def needs_repair(card: dict) -> bool:
    """A card is stale when its meaning is really the whole line, or when the
    headword was cut out of a phrase the user chose deliberately."""
    if len(meaning(card).split()) > 3:
        return True
    selected = str(card.get("selected_text", ""))
    words = selected.split()
    return 1 < len(words) <= 5 and label(card).lower() != selected.strip().lower()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--all", action="store_true", help="ignore the staleness check")
    args = parser.parse_args()

    config = load_sync_config()
    base_url = str(config.get("api_url", "")).strip()
    token = str(config.get("token", "")).strip()
    if not base_url or not token:
        print("This computer is not connected. Pair it in Subtitle Notes first.")
        return 1

    cards = api(base_url, token, "/selections")
    if isinstance(cards, dict):
        print("Could not read the library:", cards.get("error"))
        return 1

    targets = [card for card in cards if args.all or needs_repair(card)]
    print(f"{len(targets)} of {len(cards)} cards need attention.")
    if args.dry_run:
        for card in targets:
            print(f"  {label(card)!r}: {meaning(card)[:60]}")
        return 0

    repaired = skipped = 0
    for card in targets:
        before = f"{label(card)} = {meaning(card)[:40]}"
        result: dict = {}
        for attempt in range(RETRIES):
            result = api(base_url, token, f"/selections/{card['id']}/reenrich", "POST")
            if not result.get("error"):
                break
            time.sleep(RETRY_PAUSE_SECONDS)
        if result.get("error"):
            skipped += 1
            print(f"  kept as is: {before}  ({result['error']})")
        else:
            repaired += 1
            print(f"  {before}\n      -> {label(result)} = {meaning(result)[:40]}")
        time.sleep(PAUSE_SECONDS)

    print(f"\nRepaired {repaired}, left unchanged {skipped}.")
    if skipped:
        print("Run it again later; nothing was overwritten with a failed lookup.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
