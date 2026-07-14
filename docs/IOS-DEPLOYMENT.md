# FoodVault — Native Apps Handoff (for Mac / iOS work)

_Last updated: 2026-07-13, from the Windows session that built the Android pipeline._

## Current state (what's already done)

- **Capacitor 8** scaffolded in `frontend/` — app id `com.skorbits.foodvault`, both
  `android/` and `ios/` platforms committed. Plugins: `@capacitor/app`, `@capacitor/browser`.
- **Android validated locally**: `app-debug.apk` builds (needs JDK 21; SDK 36).
- **Native Google OAuth flow implemented** (`frontend/src/lib/supabase.js` + deep-link
  listener in `App.jsx`): on native, sign-in opens the *system browser* and returns via
  deep link `com.skorbits.foodvault://auth-callback` (PKCE `code` param →
  `exchangeCodeForSession`). URL scheme registered in `AndroidManifest.xml` and
  `ios/App/App/Info.plist` (`CFBundleURLTypes`).
- **App Store compliance done**: in-app account deletion (`DELETE /api/account` +
  avatar-menu UI), privacy policy at `frontend/public/privacy.html`, no `window.prompt()`
  anywhere, QR block hidden on native (`isNativeApp()` in `frontend/src/lib/platform.js`).
- **Backend**: Cloud Run `https://foodvault-backend-174528641235.us-central1.run.app`
  → OmniRoute VM at `34.61.22.23:20128` (GCP project `foodvault-502105`).
- Design refresh in progress ("Warm Editorial" direction) — Quick Action cards restyled;
  Today's Meals + hero pass still pending.

## Prerequisites still open (do these regardless of platform)

1. **Supabase** → Auth → URL Configuration → Redirect URLs → add
   `com.skorbits.foodvault://auth-callback` (native sign-in fails without it).
2. **`SUPABASE_SERVICE_KEY`** (service_role) into `backend/.env` and Cloud Run env —
   account deletion returns 503 until set.
3. **Apple Developer Program** ($99/yr) — enroll at developer.apple.com; needed for
   TestFlight and App Store.

## iOS steps on the Mac

```bash
# one-time setup
xcode-select --install            # or install Xcode from the App Store (required)
sudo gem install cocoapods        # Capacitor 8 uses CocoaPods

git clone https://github.com/sivakumarai2828/foodvault.git
cd foodvault/frontend
npm install

# frontend env (not in git): create frontend/.env.local with
#   VITE_SUPABASE_URL=...          (same as backend/.env SUPABASE_URL)
#   VITE_SUPABASE_ANON_KEY=...     (Supabase anon key)
# and frontend/.env.production with
#   VITE_API_URL=https://foodvault-backend-174528641235.us-central1.run.app

npm run build
npx cap sync ios                  # runs pod install
npx cap open ios                  # opens Xcode
```

In Xcode:
1. Select the `App` target → Signing & Capabilities → set your Team
   (Apple Developer account) — bundle id `com.skorbits.foodvault`.
2. Run on a Simulator first (⌘R), then on a real iPhone via cable.
3. Test: Google sign-in round-trip (system browser → deep link back),
   recipe extraction, photo dialog, account-deletion modal.

For TestFlight: Product → Archive → Distribute → App Store Connect, or set up
Codemagic CI to build from GitHub automatically.

## Gotchas known from the Android side

- Web assets must be rebuilt (`npm run build && npx cap sync ios`) after every
  frontend change — the native app bundles a static copy.
- `.env.production` bakes the Cloud Run URL into native builds; the Vite dev
  proxy only exists on web dev.
- AI extraction latency is ~10–40 s; the in-app loader covers it.
