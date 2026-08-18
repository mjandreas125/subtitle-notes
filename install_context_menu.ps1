$ErrorActionPreference = "Stop"

$launcher = Join-Path $PSScriptRoot "dist\OpenWithTranslatedVLC.exe"
if (-not (Test-Path -LiteralPath $launcher)) {
    throw "OpenWithTranslatedVLC.exe was not found. Run build.ps1 first."
}

$icon = "$launcher,0"
$appKey = "HKCU:\Software\Classes\Applications\OpenWithTranslatedVLC.exe"
New-Item -Path $appKey -Force | Out-Null
New-ItemProperty -Path $appKey -Name "FriendlyAppName" -Value "Translated VLC" -PropertyType String -Force | Out-Null
New-ItemProperty -Path $appKey -Name "ApplicationName" -Value "Translated VLC" -PropertyType String -Force | Out-Null
New-ItemProperty -Path $appKey -Name "ApplicationIcon" -Value $icon -PropertyType String -Force | Out-Null
New-Item -Path (Join-Path $appKey "DefaultIcon") -Force | Out-Null
Set-Item -Path (Join-Path $appKey "DefaultIcon") -Value $icon

$extensions = @(".mkv", ".mp4", ".avi", ".mov", ".m4v", ".webm", ".wmv", ".mpg", ".mpeg")
foreach ($extension in $extensions) {
    $key = "HKCU:\Software\Classes\SystemFileAssociations\$extension\shell\OpenWithTranslatedVLC"
    New-Item -Path $key -Force | Out-Null
    New-ItemProperty -Path $key -Name "MUIVerb" -Value "Open with translated VLC" -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $key -Name "Icon" -Value $icon -PropertyType String -Force | Out-Null

    $iconKey = Join-Path $key "DefaultIcon"
    New-Item -Path $iconKey -Force | Out-Null
    Set-Item -Path $iconKey -Value $icon

    $commandKey = Join-Path $key "command"
    New-Item -Path $commandKey -Force | Out-Null
    Set-Item -Path $commandKey -Value "`"$launcher`" `"%1`""
}

Add-Type -Namespace Win32 -Name ShellNotify -MemberDefinition @"
    [System.Runtime.InteropServices.DllImport("shell32.dll")]
    public static extern void SHChangeNotify(int wEventId, uint uFlags, System.IntPtr dwItem1, System.IntPtr dwItem2);
"@
[Win32.ShellNotify]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)

Write-Host "Installed context menu item: Open with translated VLC"
