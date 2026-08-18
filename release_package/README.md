# Translated VLC

Minimal Windows helper for learning English from VLC subtitles.

It opens a video in VLC, renders a selectable subtitle layer over the video, translates selected English words or phrases to Russian, and saves every selection into a Word document.

## Features

- Open videos from the Windows context menu.
- Automatically prefer English audio and English subtitles in VLC.
- Use external `.srt` subtitles or extract embedded text subtitles with `ffmpeg`.
- Select subtitle text by dragging over letters.
- Double-click a word to translate the whole word.
- Show a small Russian translation popup.
- Save selections to `Documents\Translated VLC\subtitle_translations.docx`.
- Save a plain text log to `Documents\Translated VLC\subtitle_translations.txt`.
- `Ctrl+Z` or `Ctrl+X` removes the last saved selection.

## Install

1. Install VLC.
2. Install `ffmpeg` if you want embedded subtitles to be extracted automatically.
3. Download or build the two executables:
   - `dist\OpenWithTranslatedVLC.exe`
   - `dist\VlcSubtitleOverlay.exe`
4. Run `install_context_menu.cmd`.
5. Right-click a video file and choose `Open with translated VLC`.

If Windows still shows the old icon in the context menu, close and reopen Explorer or sign out/in once. Windows caches shell icons aggressively.

## Build From Source

Requirements:

- Windows
- Python 3.10+
- VLC
- PyInstaller
- Pillow
- ffmpeg and ffprobe for embedded subtitle extraction

Build:

```powershell
cd vlc_subtitle_translator
python -m pip install pyinstaller pillow
.\build.ps1
.\install_context_menu.cmd
```

## How It Works

VLC subtitles are not selectable text. This app disables VLC's native subtitle renderer and draws a VLC-like subtitle layer above the video. The overlay follows VLC playback through VLC's local HTTP status API.

The launcher:

- starts VLC with local HTTP enabled;
- asks VLC to prefer English audio and subtitles;
- finds a matching `.srt` next to the video, or extracts embedded text subtitles;
- starts the overlay with the subtitle file.

The overlay:

- tracks the current playback time;
- finds the matching subtitle cue by timestamp;
- draws selectable text near the bottom of the VLC window;
- translates selected text with Google Translate's public web endpoint;
- writes learning notes into Word and text files.

## Controls

- Drag over subtitle text: select and translate a phrase.
- Double-click a word: translate that word.
- Click outside subtitles: clear selection.
- `Ctrl+Z` or `Ctrl+X`: remove the last saved entry from Word/text log.
- `Esc`: hide overlay.
- `Ctrl+Q`: close overlay.

## Output Files

Saved under:

```text
%USERPROFILE%\Documents\Translated VLC\
```

Files:

- `subtitle_translations.docx`: Word document with one table per selection.
- `subtitle_translations.txt`: plain text log.
- `subtitle_translations.jsonl`: internal data used to rebuild the Word file and undo the last entry.

## Limitations

- Only text subtitles can be selected. Image subtitles such as PGS/VobSub need OCR and are not supported.
- The subtitle layer is an overlay, not VLC's internal renderer, so the style is close to VLC but not identical.
- Translation uses an unofficial Google Translate endpoint, so internet access is required and the endpoint may change.
