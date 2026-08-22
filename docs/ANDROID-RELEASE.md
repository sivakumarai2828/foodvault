# Android Release — signing, building, publishing

## ⚠️ The keystore: back this up NOW

Release builds are signed with an **upload key**. If you lose it you can never
publish an update to the same Play Store listing — you'd have to create a brand
new listing and lose your users and reviews.

Two files, both **gitignored** (never committed):

| File | What |
|---|---|
| `frontend/android/foodvault-upload.jks` | the keystore itself |
| `frontend/android/keystore.properties` | its passwords |

**Back both up today** — password manager, encrypted cloud folder, or a USB drive
kept somewhere safe. Not only on this laptop.

Key details: alias `foodvault-upload`, RSA 2048, valid 10,000 days (~27 years),
DN `CN=FoodVault, OU=SKorbits, O=SKorbits`.

> Google Play App Signing: when you first upload, Play offers to manage the app
> signing key for you. Accept it — Play then holds the *app* key and your upload
> key can be reset by support if lost. It's a genuine safety net.

## Build

```bash
cd frontend
npm run build && npx cap sync android
cd android
JAVA_HOME=<jdk21> ./gradlew bundleRelease   # AAB for Play Store
JAVA_HOME=<jdk21> ./gradlew assembleRelease # APK for sideloading/testing
```

Outputs:
- `app/build/outputs/bundle/release/app-release.aab` ← upload this to Play
- `app/build/outputs/apk/release/app-release.apk` ← install directly on a phone

Verify a build is signed with the real key (must show `CN=FoodVault`, not
`CN=Android Debug`):
```bash
$ANDROID_SDK/build-tools/36.0.0/apksigner verify --print-certs app-release.apk
```

## Versioning — bump before every upload

`frontend/android/app/build.gradle`:
```gradle
versionCode 1      // MUST increase for every Play upload (1 -> 2 -> 3)
versionName "1.0"  // user-visible, e.g. "1.0.1"
```
Play rejects an upload whose `versionCode` is not higher than the last one.

## Publishing checklist

1. Google Play Console account ($25 one-time) → create app
2. Upload `app-release.aab` to **Internal testing** first
3. Complete: Store listing, Data safety, Content rating, Target audience
4. Privacy policy URL: `https://foodvaultplan.netlify.app/privacy.html`
5. Screenshots: at least 2 phone screenshots + a 1024×500 feature graphic
6. Roll out internal testing → closed → production

## Verified working (2026-08-16, emulator, Android 15)

- Signed release APK installs and launches, no crashes, no webview errors
- Signature: `CN=FoodVault…`, APK Signature Scheme v2
- OAuth deep link `com.skorbits.foodvault://auth-callback` resolves and
  foregrounds the app in the release build
- Still untested on real hardware: Google sign-in completion, haptics
