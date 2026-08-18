# Subtitle Notes for the browser

Highlight anything you are reading or watching in a browser, see what it really
means, and keep it in the same library the phone app and the VLC overlay write
to.

## What it does

| Where | How |
|---|---|
| Any web page | Highlight text; a green button appears under it. Click it for the reading, then **Сохранить**. |
| PDFs, including files opened from disk | Highlight, then right-click → *Save "…" to Subtitle Notes*. The context menu is the one route that still works inside Chrome's built-in PDF viewer, where extensions cannot touch the page. |
| YouTube and Netflix | The player's own captions are replaced with a clickable copy: click a word, or drag across several for a phrase. The video pauses while you read. |

**Without the button:** hold **Ctrl + Alt** while you highlight — anywhere,
subtitles included — and the word is saved on the spot. The same combination
also works after the fact: highlight normally, then press it. Holding keys while
dragging is awkward on a trackpad, and it is the only way to save a selection
made with the keyboard.

Because nothing asks for confirmation, the card that appears offers **Отменить**
for as long as it is on screen. If the word was already in the library it says
so and offers nothing to undo — cancelling an instant save must never delete a
card you saved last week.

Every capture carries the sentence it came from, so the server can tell a
criminal *record* from a vinyl one. On a video it also carries the title and the
timecode, exactly like a capture from VLC.

## Settings

Everything is in the extension's options page:

- **the key combination** — press the one you want and it is recorded, modifiers
  alone included;
- **save always** — no keys at all, every selection goes straight in;
- **where the window appears** — by the selection, or pinned to any corner;
  a pinned window can be dragged and remembers where you put it;
- **how long it stays** after an instant save;
- **clickable subtitles** and **pause the video**, both switchable;
- **sites to keep out of** — one host per line, for banking or work.

## Installing it

The extension is not in the Chrome Web Store yet, so it is loaded from this
folder:

1. Open `chrome://extensions` (or `edge://extensions`, `opera://extensions`).
2. Turn on **Developer mode**.
3. **Load unpacked** → choose this `extension` folder.
4. Open the extension's options and press **Получить код**.
5. On the phone: **Settings → Connected devices**, type the code.

Chrome, Edge and Opera all run this unchanged — they are the same engine.
Firefox needs a small change to the manifest and is not supported yet.

> **Note for this laptop specifically:** its Chrome is managed by policy
> (`ExtensionInstallForcelist` is set), and managed Chrome refuses extensions
> passed on the command line. Loading through the *Load unpacked* button in the
> UI still works, and so does Edge.

## How it is put together

    manifest.json   MV3 manifest: what runs where
    settings.js     defaults and the hotkey helpers, shared by every part
    background.js   the only place that talks to the server, and the only place
                    that holds the pairing token
    capture.js      the selection button, the reading card and instant save, in
                    a closed shadow root so no site's CSS can reach them
    subtitles.js    the clickable caption layer for YouTube and Netflix
    options.js      pairing and every setting
    popup.js        connection state and the last twelve saves

The token never enters a page. Content scripts run inside whatever site you are
reading, and a hostile site can read anything its scripts can reach, so pages
send a request to the background worker and get back only the finished
translation.

If the caption layer ever fails to draw — a player changed its markup, say — the
rule that hides the original captions switches itself off, so you lose the
clickable words but never the subtitles.

## Verified

Tested end to end in Edge against the live server:

- content script loads on an ordinary page, the button appears under the
  selection, the card shows the translation, synonyms and the literal note;
- **Сохранить** created a real card that appeared in the phone library;
- holding Ctrl+Alt while selecting saved without a button, pinned to the corner
  chosen in settings, and showed **Отменить**;
- selecting the same words again reported *Уже в библиотеке* and offered no
  undo;
- **Отменить** removed the card from the library — the three cards these tests
  created were cleaned up through it;
- on a real YouTube video the native captions are hidden and the clickable layer
  renders the current line.

Not yet exercised: Netflix (needs an account with something playing) and the
PDF right-click route (a native context menu cannot be driven from a test).
Both share code paths with what was tested, but treat them as unproven.
