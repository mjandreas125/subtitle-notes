"""System-wide Ctrl+Alt+S capture for selectable text in Windows applications."""

from __future__ import annotations

import ctypes
import hashlib
import time
import tkinter as tk
from tkinter import messagebox

from sync_client import api_call, load_sync_config


VK_CONTROL, VK_MENU, VK_S = 0x11, 0x12, 0x53
user32 = ctypes.windll.user32


class QuickCapture:
    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.withdraw()
        self.root.title("Subtitle Notes Capture")
        self.combo_down = False
        self.root.after(35, self._watch_hotkey)

    def _watch_hotkey(self) -> None:
        down = all(user32.GetAsyncKeyState(key) & 0x8000 for key in (VK_CONTROL, VK_MENU, VK_S))
        if down and not self.combo_down:
            self._copy_then_open()
        self.combo_down = down
        self.root.after(35, self._watch_hotkey)

    def _copy_then_open(self) -> None:
        # The focused application receives Ctrl+C; this is the only safe generic
        # path Windows gives us for selected text in arbitrary third-party apps.
        user32.keybd_event(VK_CONTROL, 0, 0, 0)
        user32.keybd_event(0x43, 0, 0, 0)
        user32.keybd_event(0x43, 0, 2, 0)
        user32.keybd_event(VK_CONTROL, 0, 2, 0)
        self.root.after(160, self._open_from_clipboard)

    def _open_from_clipboard(self) -> None:
        try:
            text = self.root.clipboard_get().strip()
        except tk.TclError:
            text = ""
        if not text:
            return
        dialog = tk.Toplevel(self.root)
        dialog.title("Send to Subtitle Notes")
        dialog.configure(bg="#101416")
        dialog.attributes("-topmost", True)
        frame = tk.Frame(dialog, bg="#101416", padx=18, pady=16)
        frame.pack(fill="both", expand=True)
        tk.Label(frame, text="Selected text", bg="#101416", fg="#d9f5e9").pack(anchor="w")
        selected = tk.Text(frame, height=5, width=54, bg="#1b252b", fg="white", insertbackground="white", relief="flat", wrap="word")
        selected.pack(fill="x", pady=(5, 12))
        selected.insert("1.0", text)
        tk.Label(frame, text="Title / source (optional)", bg="#101416", fg="#d9f5e9").pack(anchor="w")
        title = tk.Entry(frame, width=54, bg="#1b252b", fg="white", insertbackground="white", relief="flat")
        title.pack(fill="x", pady=(5, 14), ipady=6)

        def send() -> None:
            value = selected.get("1.0", "end").strip()
            config = load_sync_config()
            if not config.get("api_url") or not config.get("token"):
                messagebox.showerror("Subtitle Notes", "Configure Translated VLC Sync Setup first.", parent=dialog)
                return
            if not value:
                return
            try:
                key = hashlib.sha256(f"windows|{time.time_ns()}|{value}".encode()).hexdigest()
                api_call(config["api_url"], "/captures", {"client_key": key, "selected_text": value, "media_title": title.get().strip() or "Windows selection"}, config["token"])
                dialog.destroy()
            except RuntimeError as error:
                messagebox.showerror("Subtitle Notes", str(error), parent=dialog)

        tk.Button(frame, text="Send to app", command=send, bg="#9be8cf", fg="#101416", relief="flat", padx=14, pady=7).pack(anchor="e")
        dialog.bind("<Escape>", lambda _event: dialog.destroy())
        selected.focus_set()

    def run(self) -> None:
        self.root.mainloop()


if __name__ == "__main__":
    QuickCapture().run()
