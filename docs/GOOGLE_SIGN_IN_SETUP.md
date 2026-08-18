# Google account sign-in: production setup

Google sign-in requires a Google Cloud/Firebase project owned by the product
owner. A client ID belongs to that project and cannot be invented or safely
shared by an installer.

To enable one shared Google account across the Android app, browser extension
and hosted sync server:

1. Create a Firebase project owned by the product organisation.
2. Enable Google as a sign-in provider in Firebase Authentication.
3. Register Android package `com.translatedvlc.translated_vlc_mobile` and add
   its release SHA-1 certificate fingerprint.
4. Register the Chrome extension OAuth client after publishing it or assigning
   a stable extension key/ID.
5. Add the server's public HTTPS domain to authorised redirect domains.
6. Add the resulting Android `google-services.json`, web client ID and server
   verifier configuration only through secure deployment secrets.

The current product uses e-mail/password accounts so all three clients can be
tested now. Firebase Auth is the recommended next identity provider because it
links Android, browser and backend identity without putting a Google secret in
the APK or extension.
