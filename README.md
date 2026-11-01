# ShopDesk Ghana: installers

One app, three ways to install it. All three are built from the same file, `src/index.html`,
so the screens, buttons, receipts and reports are identical everywhere.

| Version | Output | How it is built |
|---|---|---|
| Installable web app | `www/` folder | `npm run build:web` |
| Android | `ShopDesk-Ghana-1.0.0.apk` | Capacitor + Gradle |
| Windows | `ShopDesk-Ghana-Setup-1.0.0.exe` | Electron + electron-builder (NSIS installer) |

To change the interface, edit only `src/index.html`, then rebuild. Do not edit `www/`, `android/` or `dist/`.

## Easiest: let GitHub build everything (no tools to install)

1. Create a private repository on GitHub and upload this whole folder (keep the `.github` folder).
2. Open the **Actions** tab. **Build installers** runs by itself on every push, or press **Run workflow**.
3. When it finishes, open the run and download:
   - **ShopDesk-Android**: the `.apk`
   - **ShopDesk-Windows**: the `.exe` installer
   - **ShopDesk-web-app**: the web app files
4. For a proper release page with all three attached, tag a version: `git tag v1.0.0 && git push --tags`.

The first run is the real test of the Android and Windows builds. If a step fails, open it and read the error.

### Optional: publish the web app
Settings > Pages > Source: **GitHub Actions**, then run **Publish web app (GitHub Pages)**.
Open the https address on a phone or computer and choose **Install** (Chrome/Edge) or **Add to Home Screen** (Safari).
Installing needs https; `http://localhost` also works for testing.

## Build on your own computer

Needs Node.js 20 or newer. Run `npm install` once.

- Web app, try it locally: `npm run serve:web` and open http://localhost:8080
- Windows installer (build it on Windows): `npm run build:windows`, result in `dist/`
- Try the desktop app without installing: `npm run start:desktop`
- Android APK: also needs JDK 17 and the Android SDK (Android Studio installs it), then `npm run build:android`, result in `dist/`

After the first `npm install`, commit the `package-lock.json` it creates, so builds are repeatable.

## Installing the results

- **Android:** copy the `.apk` to the phone and open it. Android will ask to allow "install unknown apps" for the app you opened it from.
  The default APK is signed with a debug key, which is fine for your own shops. Updates must be signed with the same key as the version already installed.
- **Windows:** run the `.exe`. Windows SmartScreen will warn that the publisher is unknown, because the installer is not code-signed. Choose **More info > Run anyway**.
- **Web app:** see above.

## Signing (optional, recommended once you share the app)

Add these in GitHub: Settings > Secrets and variables > Actions.

- Android release key: `ANDROID_KEYSTORE_BASE64` (your `.jks` file, base64), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
  With these present the APK is built as a release signed with your key. Keep that key safe; losing it means users must uninstall to update.
- Windows: `WINDOWS_CERT_BASE64` (a code-signing `.pfx`, base64) and `WINDOWS_CERT_PASSWORD`. This removes the SmartScreen warning once the certificate has reputation.

## Things worth knowing

- **Data stays on the device.** Each version keeps its own data, encrypted with the shop passphrase. The phone app, the Windows app and the web app do not share data automatically. Use **Backup > Download backup** on one and **Merge from backup file** on the other.
- **Fonts and offline use.** During the build, the fonts are downloaded and bundled so the interface looks the same with no internet. If the build machine is offline, it falls back to the online font link and then to system fonts.
- **Printing.** Windows uses the normal Windows print dialog. Android uses Android's print service (it can save a PDF). The web app uses the browser's print dialog.
- **Backups on Android** open the phone's share sheet so you can save the file to Drive, email it or send it by WhatsApp.
- **Version number:** change `version` in `package.json`. Android's version code uses the GitHub run number.
- **Icons:** `src/icons`, `assets` and `build` hold the icon files. Replace them with your own artwork of the same sizes if you like.

© 2026 J. O. ACQUAAH. All Rights Reserved.
