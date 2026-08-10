$ErrorActionPreference = "Stop"

$registryCandidates = @()
foreach ($key in @(
    "HKLM:\SOFTWARE\VideoLAN\VLC",
    "HKLM:\SOFTWARE\WOW6432Node\VideoLAN\VLC",
    "HKCU:\SOFTWARE\VideoLAN\VLC"
)) {
    $item = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue
    if ($item) {
        if ($item.InstallDir) {
            $registryCandidates += (Join-Path $item.InstallDir "vlc.exe")
        }
        if ($item.'(default)') {
            $registryCandidates += $item.'(default)'
        }
    }
}

$vlcCandidates = @(
    $registryCandidates
    "D:\Programs\VLC\vlc.exe",
    "$env:ProgramFiles\VideoLAN\VLC\vlc.exe",
    "${env:ProgramFiles(x86)}\VideoLAN\VLC\vlc.exe"
) | Where-Object { $_ }

$vlc = $vlcCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $vlc) {
    throw "VLC was not found in Program Files."
}

Start-Process -FilePath $vlc -ArgumentList @(
    "--extraintf=http",
    "--http-host=127.0.0.1",
    "--http-port=8080",
    "--http-password=quicktranslate"
)
