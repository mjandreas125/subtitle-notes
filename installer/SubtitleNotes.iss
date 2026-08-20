#define AppName "Subtitle Notes"
#define AppVersion "1.6.9"
#define AppPublisher "Subtitle Notes"
#define AppExe "TranslatedVLCSyncSetup.exe"

[Setup]
AppId={{A03E1A9D-F90C-43A2-BE25-5305B716ABC7}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\Subtitle Notes
DefaultGroupName={#AppName}
OutputDir=..\release_package
OutputBaseFilename=SubtitleNotesSetup-1.6.9
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
; The installer is the first thing anyone sees of this, so it wears the same
; colours as everything else rather than the grey default.
WizardImageFile=wizard-side.bmp
WizardSmallImageFile=wizard-badge.bmp
WizardImageStretch=no
DisableWelcomePage=no
AppCopyright=Subtitle Notes
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
; The Ctrl+Alt+S helper has no window, so the polite "please close" cannot
; reach it. Shut ours down ourselves instead of stopping to ask.
CloseApplications=force
RestartApplications=no

[Files]
Source: "..\dist\OpenWithTranslatedVLC.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dist\VlcSubtitleOverlay.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dist\TranslatedVLCSyncSetup.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dist\SubtitleNotesQuickCapture.exe"; DestDir: "{app}"; Flags: ignoreversion
; The Flutter desktop library needs its DLL and data folder as well as the EXE.
Source: "..\mobile\build\windows\x64\runner\Release\*"; DestDir: "{app}\Library"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "..\extension\*"; DestDir: "{userdocs}\Subtitle Notes\Browser Extension"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "..\mobile\build\app\outputs\flutter-apk\app-release.apk"; DestDir: "{userdocs}\Subtitle Notes\Android"; DestName: "SubtitleNotes.apk"; Flags: ignoreversion
Source: "..\README.md"; DestDir: "{userdocs}\Subtitle Notes"; DestName: "README.txt"; Flags: ignoreversion

[Icons]
Name: "{group}\Subtitle Notes - account setup"; Filename: "{app}\TranslatedVLCSyncSetup.exe"
Name: "{group}\Subtitle Notes - capture selected text"; Filename: "{app}\SubtitleNotesQuickCapture.exe"
Name: "{group}\Subtitle Notes - library"; Filename: "{app}\Library\translated_vlc_mobile.exe"
Name: "{group}\Browser Extension folder"; Filename: "{userdocs}\Subtitle Notes\Browser Extension"
Name: "{group}\Android APK"; Filename: "{userdocs}\Subtitle Notes\Android\SubtitleNotes.apk"

[Registry]
; A development build used to register its own verb pointing at the folder it
; was built in. Left behind, it shadows the installed program: the menu item
; still works and still runs last month's code.
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mkv\shell\OpenWithTranslatedVLC"; Flags: deletekey
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mp4\shell\OpenWithTranslatedVLC"; Flags: deletekey
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.avi\shell\OpenWithTranslatedVLC"; Flags: deletekey
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mov\shell\OpenWithTranslatedVLC"; Flags: deletekey
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.webm\shell\OpenWithTranslatedVLC"; Flags: deletekey
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mkv\shell\OpenWithSubtitleNotes"; ValueType: string; ValueName: "MUIVerb"; ValueData: "Open with Subtitle Notes"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mp4\shell\OpenWithSubtitleNotes"; ValueType: string; ValueName: "MUIVerb"; ValueData: "Open with Subtitle Notes"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.avi\shell\OpenWithSubtitleNotes"; ValueType: string; ValueName: "MUIVerb"; ValueData: "Open with Subtitle Notes"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mov\shell\OpenWithSubtitleNotes"; ValueType: string; ValueName: "MUIVerb"; ValueData: "Open with Subtitle Notes"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.webm\shell\OpenWithSubtitleNotes"; ValueType: string; ValueName: "MUIVerb"; ValueData: "Open with Subtitle Notes"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mkv\shell\OpenWithSubtitleNotes\command"; ValueType: string; ValueData: """{app}\OpenWithTranslatedVLC.exe"" ""%1"""
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mp4\shell\OpenWithSubtitleNotes\command"; ValueType: string; ValueData: """{app}\OpenWithTranslatedVLC.exe"" ""%1"""
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.avi\shell\OpenWithSubtitleNotes\command"; ValueType: string; ValueData: """{app}\OpenWithTranslatedVLC.exe"" ""%1"""
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.mov\shell\OpenWithSubtitleNotes\command"; ValueType: string; ValueData: """{app}\OpenWithTranslatedVLC.exe"" ""%1"""
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.webm\shell\OpenWithSubtitleNotes\command"; ValueType: string; ValueData: """{app}\OpenWithTranslatedVLC.exe"" ""%1"""
; This is a hidden background listener, so registering it here keeps the
; Ctrl+Alt+S helper alive after the next Windows restart as well.
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "SubtitleNotesCapture"; ValueData: """{app}\SubtitleNotesQuickCapture.exe"""; Flags: uninsdeletevalue

[Run]
; VLC only answers the translation window when its small web interface is on.
; Switching it on by hand means finding a checkbox three dialogs deep, so the
; installer writes the setting itself.
Filename: "{app}\TranslatedVLCSyncSetup.exe"; Parameters: "--configure-vlc"; Flags: runhidden waituntilterminated
Filename: "{app}\TranslatedVLCSyncSetup.exe"; Description: "Set up your account"; Flags: nowait postinstall skipifsilent
Filename: "{app}\SubtitleNotesQuickCapture.exe"; Description: "Start the Ctrl+Alt+S capture helper"; Flags: nowait postinstall skipifsilent

[Code]
// Anything of ours that may still be running: the background capture helper,
// the connect window, the overlay, the library. Ending them is what the user
// would have to do by hand otherwise, and none of them holds unsaved work.
procedure StopOurPrograms();
var
  ours: array[0..5] of String;
  index, code: Integer;
begin
  ours[0] := 'SubtitleNotesQuickCapture.exe';
  ours[1] := 'TranslatedVLCSyncSetup.exe';
  ours[2] := 'VlcSubtitleOverlay.exe';
  ours[3] := 'OpenWithTranslatedVLC.exe';
  ours[4] := 'SubtitleNotesServer.exe';
  ours[5] := 'translated_vlc_mobile.exe';
  for index := 0 to 5 do
    Exec(ExpandConstant('{sys}	askkill.exe'), '/f /im ' + ours[index], '',
         SW_HIDE, ewWaitUntilTerminated, code);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  StopOurPrograms();
  Result := '';
end;

procedure InitializeUninstallProgressForm();
begin
  StopOurPrograms();
end;
