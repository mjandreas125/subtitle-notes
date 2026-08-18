# Publishing Subtitle Notes to Google Play

Everything in the code is done. What is left needs a browser and two consoles.

## The one thing that must happen before you test the new build

Renaming the package broke Google sign-in, and it would have broken anyway:
Play re-signs every upload with its own key, so the certificate the app is
identified by changes. Google has to be told about the new pair.

**Google Cloud Console → APIs & Services → Credentials → Create credentials →
OAuth client ID → Android**

| Field | Value |
|---|---|
| Package name | `ee.subtitlenotes.app` |
| SHA-1 (upload key) | `2E:02:D5:95:83:E2:66:AC:E2:A0:46:08:1B:E4:B2:CD:0A:49:01:CE` |

Use the same Google Cloud project that owns the web client
`151185018789-tjda40ks4kb2vo8s30f9359n2b9o4dlb…`, otherwise the server will
reject the token it gets back.

**After the first upload**, Play Console → *Test and release → Setup → App
signing* shows a second SHA-1, the "app signing key certificate". Create a
**second** Android OAuth client with that fingerprint and the same package name.
Without it, sign-in works in your own build and fails for everyone who installs
from the store.

Until the first OAuth client exists, sign-in in the renamed app returns
`DEVELOPER_ERROR`. You can still get in by pairing with the Windows app's QR
code — that path issues a session without Google.

## The keystore

    C:\Users\andre\keystores\subtitle-notes-upload.jks
    password in subtitle-notes-upload.password.txt (same folder), alias "upload"

**Back this up somewhere that is not this laptop.** Losing it means you can
never publish an update to this listing again — Play offers a key reset, but it
is a support request measured in days, not a button. `key.properties` and `.jks`
are both gitignored, so they will never reach GitHub.

## What to upload

    cd vlc_subtitle_translator/mobile
    flutter build appbundle --release
    # -> build/app/outputs/bundle/release/app-release.aab

Play wants the `.aab`, not an APK. Bump `version:` in `pubspec.yaml` before each
new upload — Play refuses a version code it has already seen.

## Store listing answers

**App name**: Subtitle Notes
**Short description** (80 chars max):
> Save words from subtitles and learn what they really mean.

**Full description** — do not mention VLC, Netflix or any other product by name
in a way that suggests they endorse or are part of the app. Describing that it
works alongside a media player is fine; putting their trademark in the title is
not.

**Category**: Education
**Privacy policy URL**: `https://subtitle-notes-api.andreas-sultseng228.workers.dev/privacy`
**Account deletion URL**: `https://subtitle-notes-api.andreas-sultseng228.workers.dev/delete-account`

## Data safety form

Answer it exactly like this — it has to match what the app really does, and the
privacy policy page already says the same thing.

| Question | Answer |
|---|---|
| Does the app collect or share user data? | Yes |
| Is data encrypted in transit? | Yes |
| Can users request deletion? | Yes |
| **Personal info → Email address** | Collected, not shared. Purpose: *account management*. Required. |
| **Personal info → Name** | Collected, not shared. Purpose: *account management*. Optional. |
| **App activity → Other user-generated content** | Collected, not shared. Purpose: *app functionality*. Required. (The saved subtitle lines, translations and titles.) |
| Third-party sharing | None. Text sent to Google Translate and Cloudflare Workers AI for translation is processing, not sharing: it carries no identifier. |
| Ads / analytics | None. |

## Content rating questionnaire

Answer "no" to every violence, sexual content, drugs and gambling question. Note
that users can enter free text that other users can see (the nickname and the
saved words shown to friends) — Play asks about user-generated content, and the
honest answer is yes, shared only with people the user added as friends.

## Still missing before a public launch

- **Store graphics**: a 512×512 icon, a 1024×500 feature graphic, and at least
  two phone screenshots. The app's own icon exists; the rest do not.
- **A test account for the reviewer.** Play's reviewer cannot sign in with your
  Google account. Either give them credentials in the review notes, or explain
  the QR pairing path.
- **Closed testing.** Google now requires a new personal developer account to
  run a closed test with at least 12 testers for 14 days before production. If
  the account is registered as an organisation, this does not apply.
