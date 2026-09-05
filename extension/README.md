# Subtitle Notes for the browser

This folder is the unpacked extension. For a tester-facing installation guide,
open [INSTALL.md](INSTALL.md). The test archive is deliberately loaded through
the browser UI until the Chrome Web Store listing is public.

## Actual behaviour

| Where | What to do |
|---|---|
| A page or comment | Highlight text, then hold **Ctrl + Alt** while selecting (or after selecting) to save it immediately. A normal selection does not send anything; it opens no request on its own. |
| A local or web PDF | Use the right-click item *Save "…" to Subtitle Notes*. For a PDF opened from disk, enable **Allow access to file URLs** in the extension details first. |
| Player subtitles | Hold **Ctrl** and drag across the subtitle. The video may pause and the chosen word is saved. Without Ctrl, the player keeps its normal click and drag behaviour. |

The first screen offers **Continue with Google**. **Connect from the phone
instead** is the fallback: scan or type the eight-character code in the phone
app under Settings → Connected devices.

The extension needs to run on pages in order to recognise selections and
captions. It keeps the account token in the extension background, not in a web
page. It does not send ordinary selections anywhere until you use the save
shortcut or select a subtitle. Put private sites in **Stay off these sites** in
the options page.

Chrome, Edge and Opera are supported. Firefox is not supported yet.

## Development notes

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

If the caption layer ever fails to draw - a player changed its markup, say - the
rule that hides the original captions switches itself off, so you lose the
clickable words but never the subtitles.

## Verification status

Tested end to end in Edge against the live server:

- content script loads on an ordinary page, the button appears under the
  selection, the card shows the translation, synonyms and the literal note;
- **Сохранить** created a real card that appeared in the phone library;
- holding Ctrl+Alt while selecting saved without a button, pinned to the corner
  chosen in settings, and showed **Отменить**;
- selecting the same words again reported *Уже в библиотеке* and offered no
  undo;
- **Отменить** removed the card from the library - the three cards these tests
  created were cleaned up through it;
- on a real YouTube video the native captions are hidden and the clickable layer
  renders the current line.

Netflix (needs an account with something playing) and the PDF right-click route
still need real-user verification; treat them as unproven.
