# FoodVault — Launch Checklist & Handoff

Self-contained status + pending work for taking FoodVault to the iOS App Store.
Written 2026-07-20. Safe to hand to a fresh session — everything needed is here.

---

## 1. What FoodVault is

Personal recipe organizer. User pastes an Instagram/YouTube/TikTok/blog link (or
caption text); AI extracts ingredients, steps, and nutrition; app stores the
facts, shows a bundled food image, and links back to the source. Also does meal
planning, shopping lists, and an AI cooking assistant. Free app; target budget
**~$10/month all-in** (VM + backend + AI).

**Stack:** React (Vite) frontend on Netlify · FastAPI backend on Google Cloud
Run · Supabase (Postgres + Google auth) · OmniRoute AI gateway on a GCP VM ·
Capacitor for the native iOS/Android wrapper.

---

## 2. Coordinates (IDs, URLs, paths)

| Thing | Value |
|---|---|
| GitHub repo | `github.com/sivakumarai2828/foodvault` |
| Active branch | `native-apps` (kept in sync with `main`) |
| Frontend deploy | Netlify, auto-builds from `main` (base `frontend`, publish `dist`) |
| Backend | Cloud Run service `foodvault-backend`, region `us-central1` |
| Backend URL | `https://foodvault-backend-174528641235.us-central1.run.app` (health: `/health`) |
| GCP project | `foodvault-502105` (number `174528641235`) |
| GCP account with access | `anuushaventures88@gmail.com` (NOT sivakumarai2828 — that one 403s) |
| Supabase project ref | `trftacmljgqxynczanzg` |
| OmniRoute AI gateway | GCP VM `34.61.22.23:20128` (backend calls `127.0.0.1:20128/v1`) |
| App bundle id | `com.skorbits.foodvault` |
| Deep link scheme | `com.skorbits.foodvault://auth-callback` |
| Legal/DMCA contact | `aichatspace28@gmail.com` |
| Local dev machine | Intel MacBook, macOS 15.7.3, **Xcode 16.4** (Intel-compatible), iOS 18.6 simulator |

**Secrets (gitignored, NOT in repo):** `backend/.env`, `frontend/.env.local`,
`frontend/.env.production`. Backend env also lives in Cloud Run.

---

## 3. Done & deployed (do NOT redo)

- ✅ Capacitor iOS/Android scaffold, native Google OAuth via system browser + deep link
- ✅ Xcode 16.4 installed & activated; app builds + runs on iOS 18.6 simulator
- ✅ iOS safe-area fixes (header/login no longer collide with status bar)
- ✅ Add Recipe modal scroll fix (`overscroll-behavior` / `touch-action`)
- ✅ `Package.swift` Windows→POSIX path fix
- ✅ **Static thumbnail library** — 163 bundled AI images (`frontend/public/thumbnails/`),
  keyword→image matching in `frontend/src/lib/staticThumbs.js`, category fallback,
  broken-thumbnail fallback. Zero runtime cost. Regenerate/add via
  `scripts/gen_thumbnails.py` (~$0.04/image, OpenRouter). See `docs/THUMBNAILS.md`.
- ✅ Unmatched-term logging endpoint `POST /api/thumbs/unmatched` (needs table — see below)
- ✅ Backend: og:meta fallback for Instagram caption extraction
- ✅ **Legal pages** (live web + bundled iOS): `privacy.html`, `terms.html` (17 sections),
  `dmca.html`. Linked from account menu + login footer.
- ✅ **Consent checkbox** on login — Google button disabled until user accepts Terms + Privacy
- ✅ Backend deployed (Cloud Run revision current), frontend auto-deployed via Netlify

---

## 4. PENDING — do these to launch

Ordered. Owner = who must act.

### 🔴 P0 — Backend access-control fixes (from code review)  (owner: me/code, ~20 min)

Found in a review of `backend/main.py` (2026-07-20, Kimi K2 + verified against
code). The DB client uses the Supabase **service_role key which bypasses RLS**,
so a missing `.eq("user_id", user_id)` filter = cross-tenant access even after
P1's RLS is enabled. Fix these in one pass, then redeploy backend.

**Critical — genuine cross-tenant bugs (confirmed):**
1. `POST /api/ai/categorize` (`main.py` ~633) — no auth, reads+UPDATES a recipe
   by `id` with **no `user_id` filter**. Any caller can recategorize ANY user's
   recipe. Fix: add `Depends(get_user_id)` + `.eq("user_id", user_id)` on both
   the select and the update.
2. `POST /api/ai/ingredients/{recipe_id}` (`main.py` ~652) — no auth, reads any
   recipe by `id`, no `user_id`. Leaks other users' data + burns paid AI calls.
   Fix: same as above.

**High — do before public launch:**
3. `POST /api/categories` and `DELETE /api/categories/{cat_id}` (~394, ~401) —
   unauthenticated writes to a GLOBAL shared table; anyone can create/delete
   categories for everyone. Fix: require auth (admin-only for delete ideally).
4. Unauthenticated paid endpoints `POST /api/extract-from-text`, `GET /api/extract`,
   `GET /api/preview` — each triggers a paid AI/Microlink call with no auth/rate
   limit → cost-abuse/DoS on the $10/mo budget. Fix: add `Depends(get_user_id)`
   (the app already calls these while logged in).

**Deliberately NOT changing (correct as-is — do not "fix"):**
- `GET /api/image-proxy` — loaded from `<img src>` tags that CANNOT send a JWT;
  adding auth would break all thumbnails. SSRF guard is already solid
  (rejects non-http(s) + private/loopback/link-local/reserved/multicast IPs,
  `follow_redirects=False`, 12MB cap, image-only content-type). Leave auth off;
  if abused, add a referer check or IP rate-limit, not JWT.
- CORS — origins are an explicit allowlist (not `*`), so the dangerous
  credentials+wildcard-origin combo is absent. Low risk; leave.
- `extract_json` — already try/except-wrapped at call sites. Non-issue.

### 🔴 P1 — Supabase service key + RLS  (owner: you, ~10 min)  ⚠️ also fixes broken account deletion

**Why urgent:** (a) without RLS the public anon key can read/modify EVERY user's
data — security hole; (b) **in-app account deletion is currently BROKEN in
production** (returns 503 `SUPABASE_SERVICE_KEY missing`) — and Apple *requires*
working account deletion.

**Exact order (do not reverse — reversing breaks the live app):**
1. Supabase → Settings → API → copy the **`service_role`** key (secret).
2. Add `SUPABASE_SERVICE_KEY=<that key>` to **Cloud Run** env:
   - Console: Cloud Run → `foodvault-backend` → Edit & deploy new revision →
     Variables → add `SUPABASE_SERVICE_KEY`. OR CLI:
     `gcloud run services update foodvault-backend --region us-central1 --project foodvault-502105 --update-env-vars SUPABASE_SERVICE_KEY=<key>`
   - Also add the same line to local `backend/.env` for local runs.
3. Verify: `curl https://foodvault-backend-174528641235.us-central1.run.app/health`
   still OK, and account deletion no longer 503s.
4. THEN run `backend/enable-rls.sql` in Supabase → SQL Editor.
   (Note: `categories` is a global table intentionally excluded; `user_id` is
   TEXT so the script casts `auth.uid()::text`.)
5. Run `backend/create-unmatched-terms.sql` (creates `unmatched_thumb_terms`
   table for the thumbnail-gap logging).

### 🔴 P2 — Apple Developer Program enrollment  (owner: you, ~1 day approval)

$99/yr at developer.apple.com. Unblocks Sign in with Apple, TestFlight, and App
Store submission. Nothing else Apple-side can proceed without this.

### 🔴 P3 — Sign in with Apple  (owner: me/code, after P2)  ⚠️ likely rejection blocker

Apple Guideline 4.8: an app using Google login as the primary account MUST also
offer an equivalent privacy option. Sign in with Apple is the fix. Google-only
= expected rejection.
- Enable Apple provider in Supabase Auth.
- Add native Apple sign-in button + flow (Supabase supports it; Capacitor needs
  the Apple entitlement, which needs P2 done first).
- Code can be written now but can't be tested/enabled until enrollment.

### 🟠 P4 — Store build via Codemagic CI  (owner: me + you, after P2)

This Intel Mac runs Xcode 16.4, but App Store submissions need the current iOS
SDK (Xcode 26 = Apple-Silicon-only). Fix: Codemagic cloud build (free tier
~500 min/mo, fits budget). I set up `codemagic.yaml`; you provide Apple creds.
Then: Archive → TestFlight → submit.

### 🟠 P5 — App Store Connect metadata  (owner: you, I can draft)

- Screenshots (can generate from simulator), description, keywords, category
  (Food & Drink), support URL, privacy policy URL (`/privacy.html`).
- **App Privacy details** ("nutrition label"): collects name, email (Google),
  user content (recipes). Shared with Supabase + AI providers. No ads, no sale.
- **Framing matters:** market as "recipe organizer / save recipes you find" —
  NEVER "download Instagram videos" (IP rejection under 5.2.1). Current copy is
  already correct.

### 🟡 P6 — Real-device test  (owner: you, after P2)

Xcode → Settings → Accounts → add Apple ID → set Team on `App` target → plug
iPhone → ⌘R. Test: Google round-trip, extraction, account deletion, safe areas.

### 🟡 P7 — Small cleanups  (owner: me, quick)

- **Governing law**: `terms.html` §15 currently says **India** — confirm or change
  to your actual country/state (one-line edit).
- **Email consistency**: `privacy.html` still shows `sivakumarai2828@gmail.com`;
  the newer pages use `aichatspace28@gmail.com`. Unify if desired.

---

## 5. Build / deploy commands (reference)

```bash
# Frontend web deploy: just push main (Netlify auto-builds)
git checkout main && git merge native-apps --no-edit && git push origin main && git checkout native-apps

# Backend deploy to Cloud Run (needs gcloud, account anuushaventures88@gmail.com)
export PATH=/usr/local/share/google-cloud-sdk/bin:"$PATH"
gcloud config set account anuushaventures88@gmail.com
gcloud config set project foodvault-502105
gcloud run deploy foodvault-backend --source backend --region us-central1 --quiet

# Build iOS app for simulator (from frontend/)
npm run build && npx cap sync ios
cd ios/App && xcodebuild -project App.xcodeproj -scheme App -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' -derivedDataPath build \
  CODE_SIGNING_ALLOWED=NO build
xcrun simctl install "iPhone 16 Pro" build/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch "iPhone 16 Pro" com.skorbits.foodvault

# Add a new static thumbnail (needs OPENROUTER_API_KEY from backend/.env)
python3 scripts/gen_thumbnails.py "khandvi:steamed gujarati khandvi rolls"
# then add keyword to frontend/src/lib/staticThumbs.map.json, rebuild
```

---

## 6. Known quirks (so a fresh session doesn't chase ghosts)

- **Intel-sim white screen:** first launch after a fresh install often shows a
  white/black screen for 20–40s or needs one relaunch. WKWebView flakiness on
  Intel simulator, NOT an app bug. `terminate` + `launch` again fixes it.
- **gcloud auth:** only `anuushaventures88@gmail.com` can see project
  `foodvault-502105`. `sivakumarai2828@gmail.com` gets `invalid_grant`/403.
- **AI extraction latency:** 10–40s (OmniRoute `auto` routing). Covered by loader.
- **`categories` table has no RLS by design** (global/shared, no user_id).
- **feat/ai-cost-optimisation branch + a stash** exist locally, parked/ignored.

---

## 7. Legal posture (context for App Store / risk)

Not legal advice. App extracts *facts* (ingredients/steps — not copyrightable),
generates its OWN images (does not re-host creator media), links back to source,
and saves are user-initiated. This is low-to-moderate risk, comparable to many
store apps. Biggest practical risk is Instagram IP-blocking the server (already
mitigated with caption-paste fallback). DMCA takedown process is documented in
`dmca.html`. Get a lawyer's sign-off before monetizing or scaling.
