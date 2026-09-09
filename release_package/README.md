# release_package

Built files, not source. Nothing here needs running by hand except the
installer.

- `SubtitleNotesSetup-<version>.exe` — the Windows program. Double-click it;
  it registers the right-click menu, switches on VLC's web interface, starts
  the Ctrl+Alt+S helper and leaves the guide and the APK in
  `Documents\Subtitle Notes`.
- `subtitle-notes-extension-<version>.zip` — for the Chrome Web Store.
- `subtitle-notes-extension-<version>-for-testing.zip` — for a tester:
  unpack it, then `chrome://extensions` → developer mode → *Load unpacked*.
- `SubtitleNotes-<version>.apk` — Android, for closed testing until the app is
  in Google Play.
- `guide/`, `promo/`, `store-en/`, `store-ru/`, `store/`, `play/` — the guide
  and the listing artwork. Rebuilt by `node tools/build-promo.mjs`.

Everything above is also attached to the matching GitHub release, which is
what a tester should be given rather than a folder on somebody's disk.

There used to be an `install_context_menu.cmd` here, from before there was an
installer, and a README describing a program that saved translations into a
Word document. Both are gone: the script registered *Open with translated VLC*
pointing at a build folder, which quietly shadowed the installed program with
an older build, and the README told people to run it.
