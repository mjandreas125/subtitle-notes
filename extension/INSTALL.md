# Subtitle Notes - browser test install

This is a temporary test build for Chrome, Edge and Opera. It is not yet in the
Chrome Web Store, so the browser asks you to enable developer mode. That is
normal for this test only.

1. Extract the ZIP somewhere permanent, for example `Documents\Subtitle Notes`.
   Do not choose the ZIP file itself.
2. Open `chrome://extensions`, `edge://extensions`, or `opera://extensions`.
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select the extracted folder that contains
   `manifest.json`.
5. A welcome page opens. Choose **Connect the account** → **Continue with
   Google**, then sign in with the same Google account you use in Subtitle
   Notes elsewhere. If that is unavailable, choose the phone-code route.

## First use

- **Web subtitles:** hold **Ctrl** and drag over a word. The line becomes
  selectable only while Ctrl is held, so normal player clicks and caption
  dragging continue to work.
- **Any page:** hold **Ctrl + Alt** while selecting text, or select first and
  press Ctrl+Alt afterwards. This saves immediately; the card offers Undo.
- **PDF:** select text, right-click, and choose *Save "…" to Subtitle Notes*.
  For PDFs opened from your computer, open the extension's **Details** page and
  enable **Allow access to file URLs** first.

## Privacy and permissions

The extension runs on sites so it can recognise a selection and caption text.
Its account token stays in the extension, rather than being exposed to a page.
Nothing is sent merely because text is highlighted: sending starts only through
the save shortcut or a subtitle selection. You can exclude any site in
Settings → **Stay off these sites**; use that for banking, work, or other
private sites.

## What to report

Please report the browser and version, website/player, subtitle language, exact
steps, expected result, actual result, and a screenshot or screen recording if
possible. Do not send passwords, Google tokens, or private subtitle text.
