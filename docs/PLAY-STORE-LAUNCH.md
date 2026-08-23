# FoodVault — Play Store launch plan (personal account)

Goal: app publicly downloadable on Google Play.
Constraint: personal accounts (no registered company) must complete a **closed
test with 12 testers opted in continuously for 14 days** before production access.

**Strategy: start the 14-day clock immediately.** It is the longest pole. Every
other task (screenshots, iOS, polish) runs in parallel with it.

---

## Step 1 — Finish account setup (today)

play.google.com/console → **Yourself** (personal) → $25 → ID verification.
Approval: hours to ~2 days.

## Step 2 — Create the app

- Name `FoodVault` · English (US) · App · Free
- Accept the policy + export-law declarations

## Step 3 — Upload to CLOSED testing (not Internal!)

Only **closed** testing counts toward the 12-tester requirement.

Testing → **Closed testing** → Create new release → upload:
```
frontend/android/app/build/outputs/bundle/release/app-release.aab
```
- **Accept Google Play App Signing** when offered (protects you if the upload key is lost)
- Release name: `1.0 (1)` · Release notes: "First closed test."
- Create an email list, add your testers, save, **Roll out**

Play gives you an **opt-in link** like:
`https://play.google.com/apps/testing/com.skorbits.foodvault`
That link is what you send people.

## Step 4 — Recruit testers (see message template below)

Requirements per tester — no way around these:
- A **real Android phone** (not iPhone, not emulator)
- A genuine Google account
- Must **opt in AND install**, then stay opted in 14 days

**Recruit 15, not 12** — if anyone opts out and you drop below 12, you are not
eligible and the wait continues.

Where to find them:
1. Family, friends, colleagues, neighbours, WhatsApp groups, old classmates
2. Tester-exchange communities — real developers doing the same requirement:
   r/androidapps threads, testerscommunity.com, testerbee.com
3. Avoid "guaranteed testers" sellers — many are fake-account farms and using
   them risks permanent account termination.

## Step 5 — Wait 14 days, then apply

Play Console shows the tester count and day counter. After 14 continuous days
with 12+ opted-in testers: **Apply for production access**. Review 1–7 days.

## Step 6 — Complete these before production

| Item | Value |
|---|---|
| Privacy policy | https://foodvaultplan.netlify.app/privacy.html |
| Data safety | collects name, email, user content · encrypted in transit · deletion available · no ads/tracking/sale |
| Content rating | questionnaire → Everyone |
| Target audience | 18+ |
| Category | Food & Drink |
| Screenshots | min 2 phone (take on a real phone, signed in) |
| Feature graphic | 1024x500 |
| Icon | 512x512 (frontend/public/icon-512.png) |

Store copy is ready in `docs/APP-STORE-LISTING.md`.

---

## Tester recruitment message (copy-paste)

> Hi! I built a recipe app called **FoodVault** — you paste any recipe link
> (Instagram, YouTube, a blog) and AI pulls out the ingredients, steps and
> nutrition, then helps you plan meals and build shopping lists.
>
> To publish it on the Play Store, Google needs 12 people to test it for 14 days.
> Could you help? It takes about 3 minutes:
>
> 1. Open this link on your **Android phone**: <YOUR OPT-IN LINK>
> 2. Tap **Become a tester**
> 3. Tap **Download it on Google Play** and install
> 4. **Please keep it installed for 14 days** (that part matters — if you
>    uninstall, it doesn't count)
>
> Then use it as much or as little as you like. Totally free, no ads, and I'd
> genuinely love your feedback.
>
> Thank you! 🙏

**Tips that materially improve follow-through:**
- Send individually, not to a group — group asks get ignored
- Say "3 minutes" up front
- Follow up after 2 days; roughly half forget the first time
- Ask them to confirm once installed so you can track the count
- Emphasise **do not uninstall for 14 days** — this is the #1 reason tests fail

## Timeline

| Milestone | When |
|---|---|
| Account verified | 1-2 days |
| Closed test live | same day as verification |
| 12 testers recruited | 2-5 days |
| 14-day test window | 2 weeks |
| Production review | 1-7 days |
| **Public on Play Store** | **~3 weeks** |
