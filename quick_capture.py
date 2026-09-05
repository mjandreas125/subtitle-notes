"""System-wide Ctrl+Alt+S capture for selectable text in Windows applications.

The hotkey does not open a form. A form is a question - "is this the text you
meant, and what would you like to call it?" - asked of somebody who already
answered it by selecting the words. What appears is the answer, in the same
card the browser draws: the meaning first, the line it came from under it, and
nothing to press.

Two requests, not one. The dictionary answers in a fraction of a second and
goes on screen the moment it does; the considered reading is saved in the
background with the context around it, and replaces the first answer in place
if the card is still open when it lands. Waiting for the slow one before
showing anything is what made an instant capture feel like a network error.
"""

from __future__ import annotations

import ctypes
import ctypes.wintypes
import hashlib
import queue
import sys
import threading
import time
import tkinter as tk

from desktop_i18n import tr
from player_prefs import load_player_prefs
from sync_client import (
    api_call,
    cloud_quick_translation,
    has_translation,
    load_sync_config,
    log_sync,
)


VK_CONTROL, VK_MENU, VK_S = 0x11, 0x12, 0x53
user32 = ctypes.windll.user32
user32.GetForegroundWindow.restype = ctypes.c_void_p
user32.GetWindowTextLengthW.argtypes = [ctypes.c_void_p]
user32.GetWindowTextW.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p, ctypes.c_int]

# How much of a selection is worth reading back on the card. The whole thing is
# still what gets sent - a paragraph is a fine thing to look up, it is just not
# a fine thing to draw over the window somebody is reading.
SHOWN_CHARACTERS = 190
SENT_CHARACTERS = 900

# The same tokens the browser card uses, so the two do not look like two
# programs. Windows says which of them applies: a light desktop got a black
# rectangle dropped on it, which reads as an error message, not as an answer.
LIGHT = {
    "paper": "#faf8f4", "ink": "#14201c", "soft": "#6b7a74",
    "hair": "#e2ddd3", "accent": "#1e7a4c",
}
DARK = {
    "paper": "#151b19", "ink": "#eaf1ed", "soft": "#93a49c",
    "hair": "#2a3733", "accent": "#64c795",
}


def palette() -> dict[str, str]:
    """Light or dark, as Windows has it. Read every time: somebody who switches
    the desktop to dark in the evening should not have to restart this."""
    try:
        import winreg

        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize",
        ) as key:
            light = int(winreg.QueryValueEx(key, "AppsUseLightTheme")[0])
    except (OSError, ValueError, ImportError):
        light = 1
    return LIGHT if light else DARK


def mix(first: str, second: str, weight: float) -> str:
    """`weight` of the second colour over the first, as a hex string.

    Tk has no alpha on a widget, so the pulse that says "still thinking" is
    drawn as two colours blended by hand against the paper behind them.
    """
    a = [int(first[index : index + 2], 16) for index in (1, 3, 5)]
    b = [int(second[index : index + 2], 16) for index in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * weight):02x}" for x, y in zip(a, b))


def foreground_title() -> str:
    """Which program the words were taken out of - a reader, a mail client, a
    browser. It is the only thing here that knows where a selection came from,
    and it is worth more in the library than "Windows selection"."""
    try:
        window = user32.GetForegroundWindow()
        if not window:
            return ""
        length = user32.GetWindowTextLengthW(window)
        if length <= 0:
            return ""
        buffer = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(window, buffer, length + 1)
        return " ".join(buffer.value.split())[:80].strip()
    except Exception:
        return ""


class Card:
    """One answer, drawn beside the cursor and dismissed by clicking it."""

    def __init__(self, root: tk.Tk, selection: str) -> None:
        self.colours = palette()
        self.alive = True
        self.settled = False
        self.hide_at: float | None = None
        self.pulse_step = 0

        self.window = tk.Toplevel(root)
        self.window.overrideredirect(True)
        self.window.attributes("-topmost", True)
        # The hairline is the outer frame; Tk has no border colour of its own.
        self.window.configure(bg=self.colours["hair"])

        body = tk.Frame(self.window, bg=self.colours["paper"])
        body.pack(fill="both", expand=True, padx=1, pady=1)
        tk.Frame(body, bg=self.colours["accent"], width=3).pack(side="left", fill="y")
        inner = tk.Frame(body, bg=self.colours["paper"], padx=15, pady=12)
        inner.pack(side="left", fill="both", expand=True)

        # Waiting, drawn as the shape the answer will have rather than as a
        # spinner: the eye is already looking at the place the words appear.
        self.wait = tk.Frame(inner, bg=self.colours["paper"])
        self.wait.pack(anchor="w", pady=(2, 3))
        self.bars = []
        for width in (150, 88):
            bar = tk.Frame(self.wait, bg=self.colours["paper"], width=width, height=11)
            bar.pack(anchor="w", pady=3)
            bar.pack_propagate(False)
            self.bars.append(bar)

        self.meaning = tk.Label(
            inner, text="", bg=self.colours["paper"], fg=self.colours["accent"],
            font=("Segoe UI", 14, "bold"), wraplength=330, justify="left", anchor="w",
        )
        self.line = tk.Label(
            inner, text=self._shorten(selection), bg=self.colours["paper"],
            fg=self.colours["soft"], font=("Segoe UI", 9), wraplength=330,
            justify="left", anchor="w",
        )
        self.line.pack(anchor="w", pady=(7, 0))
        self.mark = tk.Label(
            inner, text="", bg=self.colours["paper"], fg=self.colours["soft"],
            font=("Segoe UI", 9), wraplength=330, justify="left", anchor="w",
        )

        for widget in (self.window, body, inner, self.meaning, self.line, self.mark):
            widget.bind("<Button-1>", lambda _event: self.close())

        self._pulse()
        self._place()

    @staticmethod
    def _shorten(text: str) -> str:
        one_line = " ".join(str(text).split())
        return one_line if len(one_line) <= SHOWN_CHARACTERS else one_line[: SHOWN_CHARACTERS - 1] + "…"

    def _place(self) -> None:
        """Beside the cursor, and always fully on the screen it is pointing at."""
        self.window.update_idletasks()
        width, height = self.window.winfo_reqwidth(), self.window.winfo_reqheight()
        try:
            point = ctypes.wintypes.POINT()
            user32.GetCursorPos(ctypes.byref(point))
            x, y = point.x + 18, point.y + 20
        except Exception:
            x, y = 60, 60
        limit_x = self.window.winfo_screenwidth() - width - 12
        limit_y = self.window.winfo_screenheight() - height - 48
        x = max(12, min(x, max(12, limit_x)))
        y = max(12, min(y, max(12, limit_y)))
        self.window.geometry(f"{width}x{height}+{x}+{y}")

    def _pulse(self) -> None:
        if not self.alive or not self.bars:
            return
        faint = mix(self.colours["paper"], self.colours["accent"], 0.20)
        lit = mix(self.colours["paper"], self.colours["accent"], 0.42)
        for index, bar in enumerate(self.bars):
            bar.configure(bg=lit if (self.pulse_step + index) % 2 == 0 else faint)
        self.pulse_step += 1
        self.window.after(420, self._pulse)

    def answer(self, meaning: str, settled: bool) -> None:
        """The dictionary's answer, then the considered one over the top of it.

        Never the other way round: a slow dictionary must not overwrite the
        reading that already replaced it.
        """
        if not self.alive or (self.settled and not settled):
            return
        self.settled = self.settled or settled
        if self.bars:
            self.wait.pack_forget()
            self.bars = []
            self.meaning.pack(anchor="w", before=self.line)
        self.meaning.configure(text=self._shorten(meaning))
        self._place()
        self._linger()

    def note(self, message: str, tone: str = "soft") -> None:
        """A tick when the card is in the library, a sentence when it is not.

        The tick belongs on the right, where a receipt is initialled - it is a
        confirmation, and confirmations do not start a line of reading.
        """
        if not self.alive:
            return
        short = len(message) < 4
        self.mark.configure(text=message, fg=self.colours[tone],
                            anchor="e" if short else "w",
                            justify="right" if short else "left")
        self.mark.pack(fill="x", pady=(5, 0))
        self._place()
        self._linger()

    def _linger(self) -> None:
        seconds = float(load_player_prefs().get("popup_seconds") or 6.5)
        self.hide_at = time.monotonic() + max(4.0, seconds)

    def expired(self) -> bool:
        return self.hide_at is not None and time.monotonic() > self.hide_at

    def close(self) -> None:
        if not self.alive:
            return
        self.alive = False
        try:
            self.window.destroy()
        except tk.TclError:
            pass


class QuickCapture:
    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.withdraw()
        self.root.title("Subtitle Notes Capture")
        self.combo_down = False
        self.clipboard_before = 0
        self.source = ""
        self.card: Card | None = None
        self.results: queue.Queue[tuple[str, object]] = queue.Queue()
        self.root.after(35, self._watch_hotkey)
        self.root.after(60, self._drain)

    # ---- the hotkey ---------------------------------------------------------

    def _watch_hotkey(self) -> None:
        down = all(user32.GetAsyncKeyState(key) & 0x8000 for key in (VK_CONTROL, VK_MENU, VK_S))
        if down and not self.combo_down:
            self._copy_then_open()
        self.combo_down = down
        self.root.after(35, self._watch_hotkey)

    def _copy_then_open(self) -> None:
        # The focused application receives Ctrl+C; this is the only safe generic
        # path Windows gives us for selected text in arbitrary third-party apps.
        self.clipboard_before = user32.GetClipboardSequenceNumber()
        # Asked before our own card exists, or the answer would be this program.
        self.source = foreground_title()
        log_sync("Ctrl+Alt+S pressed")
        user32.keybd_event(VK_CONTROL, 0, 0, 0)
        user32.keybd_event(0x43, 0, 0, 0)
        user32.keybd_event(0x43, 0, 2, 0)
        user32.keybd_event(VK_CONTROL, 0, 2, 0)
        self.root.after(220, self._open_from_clipboard)

    def _open_from_clipboard(self) -> None:
        copied = user32.GetClipboardSequenceNumber() != self.clipboard_before
        try:
            text = self.root.clipboard_get().strip()
        except tk.TclError:
            text = ""
        if not copied:
            # Nothing came across. Either nothing was selected, or the window
            # is running as administrator and refuses keystrokes from a program
            # that is not - which is silent from here, so say it out loud.
            log_sync("Ctrl+Alt+S: the copy did not land (nothing selected, or an elevated window)")
            self._say(tr("capture_nothing"))
            return
        if not text:
            log_sync("Ctrl+Alt+S: clipboard held no text")
            return
        log_sync(f"Ctrl+Alt+S: {len(text)} characters ready")
        self.show(text[:SENT_CHARACTERS], self.source)

    # ---- the answer ---------------------------------------------------------

    def show(self, text: str, source: str) -> None:
        if self.card:
            self.card.close()
        self.card = Card(self.root, text)
        for worker in (self._ask_dictionary, self._keep):
            threading.Thread(target=worker, args=(self.card, text, source), daemon=True).start()

    def _ask_dictionary(self, card: Card, text: str, _source: str) -> None:
        """Straight away, and worth nothing later: this is the answer that is on
        screen while the real one is being written."""
        try:
            answer = cloud_quick_translation(text, timeout=5.0)
        except Exception as error:  # a dictionary is never worth an error card
            log_sync(f"Ctrl+Alt+S: quick translation failed: {error}")
            return
        if answer:
            self.results.put(("quick", (card, answer)))

    def _keep(self, card: Card, text: str, source: str) -> None:
        """The considered reading, and the card in the library. Slow on purpose
        and out of the way: nobody is looking at this thread."""
        config = load_sync_config()
        base_url = str(config.get("api_url", "")).strip()
        token = str(config.get("token", "")).strip()
        if not base_url or not token:
            self.results.put(("error", (card, tr("no_server"))))
            return
        key = hashlib.sha256(f"windows|{time.time_ns()}|{text}".encode()).hexdigest()
        payload = {
            "client_key": key,
            "selected_text": text,
            "media_title": source or "Windows selection",
        }
        try:
            data = api_call(base_url, "/captures", payload, token, timeout=25.0)
        except RuntimeError as error:
            log_sync(f"Ctrl+Alt+S: saving failed: {error}")
            self.results.put(("error", (card, str(error))))
            return
        log_sync("Ctrl+Alt+S: saved")
        self.results.put(("saved", (card, data)))

    def _drain(self) -> None:
        """Threads never touch Tk. They leave what they found here instead."""
        while True:
            try:
                kind, value = self.results.get_nowait()
            except queue.Empty:
                break
            card, payload = value  # type: ignore[misc]
            if not isinstance(card, Card) or not card.alive:
                continue
            if kind == "quick":
                card.answer(str(payload), settled=False)
            elif kind == "saved":
                data = payload if isinstance(payload, dict) else {}
                meaning = str(data.get("focus_translation") or data.get("translation") or "")
                if has_translation(meaning):
                    card.answer(meaning, settled=True)
                card.note("✓", tone="accent")
            elif kind == "error":
                card.note(str(payload))
        if self.card and self.card.expired():
            self.card.close()
        self.root.after(60, self._drain)

    # ---- something to say when there is no answer ---------------------------

    def _say(self, message: str) -> None:
        colours = palette()
        note = tk.Toplevel(self.root)
        note.overrideredirect(True)
        note.attributes("-topmost", True)
        note.configure(bg=colours["hair"])
        body = tk.Frame(note, bg=colours["paper"])
        body.pack(fill="both", expand=True, padx=1, pady=1)
        tk.Label(
            body, text=message, bg=colours["paper"], fg=colours["ink"],
            font=("Segoe UI", 10), padx=16, pady=11, wraplength=380, justify="left",
        ).pack()
        note.update_idletasks()
        width = note.winfo_reqwidth()
        x = (note.winfo_screenwidth() - width) // 2
        note.geometry(f"{width}x{note.winfo_reqheight()}+{x}+90")
        note.bind("<Button-1>", lambda _event: note.destroy())
        note.after(3500, note.destroy)

    def run(self) -> None:
        self.root.mainloop()


def demo(text: str) -> None:
    """Draw the card once, without the hotkey and without the network, so its
    look can be checked on a machine where nothing is signed in."""
    capture = QuickCapture()
    card = Card(capture.root, text)
    capture.card = card
    capture.root.after(900, lambda: card.answer("никому не нужна судимость", settled=False))
    capture.root.after(2600, lambda: (card.answer("никому не нужна судимость", settled=True), card.note("✓", "accent")))
    capture.root.after(11000, capture.root.destroy)
    capture.root.mainloop()


if __name__ == "__main__":
    if "--demo" in sys.argv:
        rest = [argument for argument in sys.argv[1:] if argument != "--demo"]
        demo(rest[0] if rest else "No one wants a record.")
    else:
        QuickCapture().run()
