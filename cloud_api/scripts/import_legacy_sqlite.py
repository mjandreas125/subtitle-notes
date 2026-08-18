"""One-time, privacy-preserving import from the former local sync database.

The SQL file is generated in the operating system's temporary directory and is
deleted immediately after Wrangler has sent it directly to D1.  It is never
written into the repository or printed to the terminal.
"""

from __future__ import annotations

import argparse
import os
import sqlite3
import subprocess
import shutil
import tempfile
from pathlib import Path


USER_COLUMNS = ("id", "email", "display_name", "created_at")
SELECTION_COLUMNS = (
    "id", "owner_id", "client_key", "media_title", "season", "episode",
    "timecode_ms", "selected_text", "translation", "focus_word",
    "focus_phrase", "focus_translation", "variants_json", "examples_json",
    "context", "archived", "created_at",
)


def literal(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def insert(table: str, columns: tuple[str, ...], row: sqlite3.Row) -> str:
    names = ", ".join(columns)
    values = ", ".join(literal(row[column]) for column in columns)
    return f"INSERT OR IGNORE INTO {table} ({names}) VALUES ({values});"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("database", type=Path)
    parser.add_argument("--d1", default="subtitle-notes-production")
    args = parser.parse_args()
    if not args.database.is_file():
        raise SystemExit(f"Legacy database was not found: {args.database}")

    with sqlite3.connect(args.database) as connection:
        connection.row_factory = sqlite3.Row
        users = connection.execute(
            f"SELECT {', '.join(USER_COLUMNS)} FROM users"
        ).fetchall()
        selections = connection.execute(
            f"SELECT {', '.join(SELECTION_COLUMNS)} FROM selections"
        ).fetchall()

    # Remote D1 file execution is atomic itself and rejects explicit BEGIN / COMMIT.
    commands = [insert("users", USER_COLUMNS, row) for row in users]
    commands.extend(insert("selections", SELECTION_COLUMNS, row) for row in selections)

    fd, raw_path = tempfile.mkstemp(prefix="subtitle-notes-import-", suffix=".sql")
    sql_path = Path(raw_path)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as output:
            output.write("\n".join(commands))
        npx = shutil.which("npx.cmd") or shutil.which("npx")
        if not npx:
            raise RuntimeError("npx was not found; install Node.js and retry the import.")
        subprocess.run(
            [
                npx, "--yes", "wrangler@latest", "d1", "execute", args.d1,
                "--remote", "--file", str(sql_path),
            ],
            check=True,
        )
    finally:
        sql_path.unlink(missing_ok=True)
    print(f"Imported {len(users)} users and {len(selections)} learning cards.")


if __name__ == "__main__":
    main()
