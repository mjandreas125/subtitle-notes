"""Standalone entry point bundled in the Windows installer."""

from __future__ import annotations

import uvicorn

from sync_server.main import app


if __name__ == "__main__":
    print("Subtitle Notes Server is running on http://0.0.0.0:8088")
    print("Keep this window open while testing from the phone.")
    uvicorn.run(app, host="0.0.0.0", port=8088, log_level="warning")
