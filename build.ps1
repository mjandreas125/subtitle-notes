$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot
python -m PyInstaller --noconfirm --clean --onefile --windowed --icon .\app_icon.ico --name VlcSubtitleOverlay .\vlc_subtitle_overlay.py
python -m PyInstaller --noconfirm --clean --onefile --windowed --icon .\app_icon.ico --name OpenWithTranslatedVLC .\open_vlc_translated.py
