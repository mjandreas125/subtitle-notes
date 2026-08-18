$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot
python -m PyInstaller --noconfirm --clean --onefile --windowed --icon .\app_icon.ico --name VlcSubtitleOverlay .\vlc_subtitle_overlay.py
python -m PyInstaller --noconfirm --clean --onefile --windowed --icon .\app_icon.ico --name OpenWithTranslatedVLC .\open_vlc_translated.py
python -m PyInstaller --noconfirm --clean --onefile --windowed --icon .\app_icon.ico --name TranslatedVLCSyncSetup .\sync_client.py
python -m PyInstaller --noconfirm --clean --onefile --windowed --icon .\app_icon.ico --name SubtitleNotesQuickCapture .\quick_capture.py
python -m PyInstaller --noconfirm --clean --onefile --console --name SubtitleNotesServer --collect-all fastapi --collect-all starlette --collect-all uvicorn --collect-all sqlalchemy --collect-all google.auth --collect-all google.oauth2 .\sync_server\run_server.py

# The computer library is a Flutter Windows bundle, not a lone EXE.  Build it
# with the helpers so the installer always contains its matching DLLs and data.
$flutter = (Get-Command flutter -ErrorAction SilentlyContinue).Source
if (-not $flutter) {
  $fallbackFlutter = 'D:\src\flutter\bin\flutter.bat'
  if (Test-Path $fallbackFlutter) { $flutter = $fallbackFlutter }
}
if (-not $flutter) { throw 'Flutter SDK was not found. Install Flutter or add it to PATH.' }
Push-Location .\mobile
try {
  & $flutter pub get
  & $flutter build windows --release
  if ($LASTEXITCODE -ne 0) { throw 'Flutter Windows build failed.' }
} finally {
  Pop-Location
}
