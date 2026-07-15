# FoodVault — MacBook Quickstart (iOS build & test)

Follow this top to bottom on your Mac. Goal: get the FoodVault iOS app building
in Xcode and running on your iPhone. Everything server-side (backend, RLS, CORS,
Supabase redirect URL) is already done — you only need to build and test iOS here.

> **Use Claude Code, not the Claude Desktop chat app.** The desktop chat app can't
> run terminal commands, edit files, or drive Xcode. Claude Code (the CLI agent)
> can — that's what does the build with you.

---

## 1. Install the tools (Terminal)

```bash
# Xcode — install from the Mac App Store FIRST (large, can take ~1 hour).
# After it finishes:
xcode-select --install
sudo gem install cocoapods

# Node (if you don't have it):
brew install node

# Claude Code (the CLI agent — NOT Claude Desktop):
npm install -g @anthropic-ai/claude-code
```

## 2. Get the project

```bash
git clone https://github.com/sivakumarai2828/foodvault.git
cd foodvault
git checkout native-apps        # branch with all native-app work
cd frontend
npm install
```

## 3. Create the two env files (git-ignored, so not in the clone)

`frontend/.env.local`:
```
VITE_SUPABASE_URL=https://trftacmljgqxynczanzg.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase anon/public key>
```
`frontend/.env.production`:
```
VITE_API_URL=https://foodvault-backend-174528641235.us-central1.run.app
```
Get the anon key from Supabase → Settings → API → `anon` `public`. It's safe to
ship (RLS now protects the database).

## 4. Start Claude Code and hand off

From the `foodvault` folder:
```bash
claude
```
Then type:
> Read docs/IOS-DEPLOYMENT.md and docs/MAC-QUICKSTART.md and continue the iOS
> deployment. Backend, RLS, CORS, and the Supabase redirect URL are done —
> I just need to build and test the iOS app.

## 5. Build & open Xcode

```bash
cd frontend
npm run build
npx cap sync ios          # copies web build + runs pod install
npx cap open ios          # opens the project in Xcode
```

In Xcode:
1. Select the **App** target → **Signing & Capabilities** → set your **Team**
   (your Apple Developer account). Bundle id is `com.skorbits.foodvault`.
2. Run on a **Simulator** first (⌘R).
3. Then run on your **iPhone** via cable (trust the computer on the phone).

## 6. What to test on the device

- **Google sign-in** — taps open the system browser, sign in, then the app
  reopens logged in (deep link `com.skorbits.foodvault://auth-callback`).
- **Add a recipe** — paste an Instagram link + caption → AI extraction (~10-40s).
- **Change photo** dialog (in-app, not a browser popup).
- **Account menu** → Privacy policy + Delete account.
- General feel: scrolling, keyboard, bottom nav, safe-area insets.

---

## Prerequisites to have ready

- **Apple Developer Program** ($99/yr, developer.apple.com) — enroll early,
  approval takes 1-2 days; you cannot build to a device without it.
- Your **Supabase anon key** (step 3).

## Working across two machines

Both the Windows machine and this Mac share code through the **`native-apps`**
branch. `git pull` when you start, `git push` when you finish — on either
machine — so neither overwrites the other.

## Known context (already handled — don't redo)

- Native Google OAuth: PKCE + system browser + deep link. Code in
  `frontend/src/lib/supabase.js` and the listener in `frontend/src/App.jsx`.
  URL scheme registered in `ios/App/App/Info.plist` (`CFBundleURLTypes`).
- Account deletion, privacy policy, no `window.prompt`, QR hidden on native.
- Backend: Cloud Run `https://foodvault-backend-174528641235.us-central1.run.app`
  → OmniRoute VM `34.61.22.23:20128`.
- RLS is ON (recipes, meal_plans, shopping_items). Backend uses the service_role
  key to read on users' behalf. `categories` is global (no RLS).
- App icons/splash already generated from the logo.

## After iOS is validated

- Merge `native-apps` → `main` (also deploys web fixes to Netlify).
- **Rotate the Supabase service_role key** before public launch (it was shared in
  a chat transcript), then update `SUPABASE_SERVICE_KEY` on Cloud Run.
- Submit to App Store via Xcode Archive or Codemagic CI + TestFlight.

See `docs/IOS-DEPLOYMENT.md` for the fuller reference.
