# Translated VLC

Windows helper for learning English from VLC subtitles, with an Android
companion library.

## What it does

- Opens a video in VLC and prefers English audio/subtitles.
- Uses matching external SRT files or extracts embedded text subtitles.
- Renders a selectable subtitle layer over the video.
- Translates a selected word or phrase and identifies a useful key word or
  expression, such as `brag` / `brag about`.
- Saves a Word document and local JSONL history.
- Optionally sends each new selection to the user's private cloud account for
  the Android application. VLC never waits for the network.

## Local desktop install

1. Install VLC and, for embedded subtitles, `ffmpeg` + `ffprobe`.
2. Build the executables with `build.ps1`.
3. Run `install_context_menu.ps1`.
4. Right-click a video and choose **Open with translated VLC**.

Controls: drag to select, double-click a word, click outside to clear,
`Esc` clears the current selection, `Ctrl+Z`/`Ctrl+X` removes the last saved
learning note.

## Android and cloud sync

Subtitle Notes now uses a permanent HTTPS cloud service. It does not depend on
your computer being on, its IP address, Wi-Fi, port 8088, or a temporary tunnel.

1. Install the Android APK and sign in with Google.
2. Open **Subtitle Notes — account setup** on Windows.
3. The permanent server address is already filled in. Press **Connect this
   computer**, then approve the eight-character code in the phone app.
4. To connect Chrome, load the included extension, open its options, and approve
   its code in the same way.

Each account only sees its own notes. A note includes a cleaned media title,
season and episode when present in the file name, a video timestamp, the
selection, translation, key word/expression, variants, examples and its silent
subtitle context. The full file path is not uploaded.

## Service architecture

The mobile app, Windows helper, and browser extension use one Cloudflare Worker
and a managed D1 database. Google signs the user in; the API verifies the Google
identity token and only returns that user's cards. The apps never store a cloud
database password. The former `sync_server` folder remains only as a local
development fallback and is not required for normal installation.

The server API is deliberately versioned under `/v1`, uses per-user bearer
tokens, and makes desktop retries idempotent by client key.

## Capture from other players, websites and Android

- **VLC:** fully integrated selectable subtitle overlay and playback time.
- **mpv:** its documented JSON IPC and Windows named-pipe support make it the
  next direct player adapter; the protocol is intentionally isolated from the
  learning database for this reason.
- **Other desktop players:** subtitles drawn inside a closed player window are
  pixels, not selectable Windows text. Windows has no API to inject a custom
  right-click item into every third-party text control. Run
  `dist/SubtitleNotesQuickCapture.exe`, select text in a player/browser/app and
  press `Ctrl+Alt+S`; it safely copies the selection, lets you confirm it, then
  sends it to the same account.
- **Websites:** load `extension` as an unpacked extension in Chrome,
  Edge, Brave or Opera. It adds **Send to Subtitle Notes** directly to the
  right-click menu of selected webpage text and records HTML5 video time where
  the site exposes it.
- **Android:** select text in a browser or a supported app, then choose
  **Subtitle Notes** from the Android selection menu or Share sheet. The app
  opens a compact save screen and creates the full translated study card.

Streaming services that render captions inside a protected video/canvas rather
than exposing selectable text cannot be read by a normal browser extension or a
Windows app. This is a platform/DRM limitation, not a setting to bypass.
