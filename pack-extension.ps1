# Builds the zip that goes to the Chrome Web Store.
#
# Everything in `extension` is source; nothing is compiled. The only thing this
# has to get right is leaving out what must not ship — notes, logs, a stray
# screenshot — because the store rejects an unexpected file faster than it
# rejects a bad idea.
#
#   powershell -ExecutionPolicy Bypass -File pack-extension.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $root 'extension'
$manifest = Get-Content (Join-Path $source 'manifest.json') -Raw | ConvertFrom-Json
$version = $manifest.version
$out = Join-Path $root 'release_package'
$zip = Join-Path $out "subtitle-notes-extension-$version.zip"

# Only the files the extension actually loads.
$keep = @(
  'manifest.json', 'background.js', 'settings.js', 'capture.js', 'subtitles.js',
  'qr.js', 'options.html', 'options.js', 'popup.html', 'popup.js',
  'welcome.html', 'welcome.js'
)

$staging = Join-Path $env:TEMP "subtitle-notes-store-$version"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

foreach ($name in $keep) {
  Copy-Item (Join-Path $source $name) (Join-Path $staging $name)
}
Copy-Item (Join-Path $source '_locales') (Join-Path $staging '_locales') -Recurse
Copy-Item (Join-Path $source 'icons') (Join-Path $staging 'icons') -Recurse

if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zip
Remove-Item $staging -Recurse -Force

$size = [math]::Round((Get-Item $zip).Length / 1KB, 1)
Write-Output "$zip  ($size KB)"
Write-Output "Upload it at https://chrome.google.com/webstore/devconsole"
