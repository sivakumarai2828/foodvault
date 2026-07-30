# FoodVault — App Store / Play Store Listing Draft

Draft copy and answers for App Store Connect and Google Play Console.
Everything here is ready to paste; adjust tone as you like.

> ⚠️ **Framing rule — read first.** Market FoodVault as a **recipe organizer**:
> "save recipes you find". NEVER describe it as downloading, reposting, or
> saving Instagram/TikTok *videos or images* — that invites a 5.2.1
> intellectual-property rejection. The app extracts **facts** (ingredients,
> steps, nutrition), generates its own images, and links back to the source.
> All copy below already follows this rule.

---

## 1. Names & short text

| Field | Value | Limit |
|-------|-------|-------|
| App name | `FoodVault` | 30 |
| Subtitle (iOS) | `Save recipes, plan meals` | 30 |
| Short description (Play) | `Save any recipe link. AI pulls out the ingredients, steps and nutrition.` | 80 |
| Promotional text (iOS) | `Found a recipe you love? Paste the link — FoodVault saves the ingredients, steps and nutrition so you can actually cook it later.` | 170 |

## 2. Description (iOS + Play, 4000 char limit)

```
Stop losing the recipes you save.

You find a great recipe, save the link, and never see it again. FoodVault fixes
that. Paste any recipe link — a food blog, a video, a post — and FoodVault's AI
reads it and saves what actually matters: the ingredients, the steps, and the
nutrition. Organised, searchable, and ready when you're standing in the kitchen.

SAVE FROM ANYWHERE
Paste a link and let AI do the typing. Ingredients get grouped, steps get
numbered, and calories, protein, carbs and fat are estimated per serving. You can
always tap through to the original source.

YOUR OWN COOKBOOK
Organise recipes into your own categories — Biryani, Breakfast, Desserts,
whatever fits how you cook. Search your whole library in seconds.

PLAN THE WEEK
Drop recipes into a weekly planner across breakfast, lunch, snacks and dinner.
See today's menu at a glance.

SHOPPING LISTS THAT WRITE THEMSELVES
Turn your meal plan into a grouped shopping list — produce, proteins, dairy,
spices — then check items off as you shop.

COOK WITHOUT THE PINCHING AND ZOOMING
Cooking Mode walks you through one step at a time, in large text, so you're not
scrolling with messy hands.

ASK YOUR AI COOKING ASSISTANT
Out of an ingredient? Cooking for six instead of two? Not sure what to make with
what's in the fridge? Ask — the assistant knows what's in your library.

PRIVATE BY DEFAULT
Your recipes are yours. Sign in with Google, no password to remember. No ads, no
tracking, and we never sell your data. You can delete your account and everything
in it from inside the app, any time.

A note on AI: ingredient, step and nutrition information is generated
automatically and can be imperfect. Always use your own judgement — especially
for allergies and dietary needs.
```

## 3. Keywords (iOS — 100 chars total, comma-separated, no spaces)

```
recipe,recipes,cookbook,meal plan,grocery,shopping list,cooking,food,kitchen,AI
```
(79 chars. Don't repeat the app name or subtitle words — Apple already indexes those.)

**Play Store tags:** Food & Drink · Recipes · Meal Planning

## 4. Category & age rating

| Field | Value |
|-------|-------|
| Primary category | Food & Drink |
| Secondary (iOS) | Lifestyle |
| Age rating | 4+ / Everyone |
| Content warnings | None |

## 5. URLs

| Field | Value |
|-------|-------|
| Support URL | `https://foodvaultplan.netlify.app` |
| Marketing URL | `https://foodvaultplan.netlify.app` |
| Privacy Policy URL | `https://foodvaultplan.netlify.app/privacy.html` |
| Terms of Use (EULA) | `https://foodvaultplan.netlify.app/terms.html` |
| Copyright/DMCA | `https://foodvaultplan.netlify.app/dmca.html` |

## 6. App Privacy — "nutrition label" answers

Answer these in App Store Connect → App Privacy. Play Console → Data safety asks
the equivalent.

| Data type | Collected? | Linked to identity | Used for | Tracking |
|-----------|-----------|--------------------|----------|----------|
| Name | Yes (from Google sign-in) | Yes | App Functionality | No |
| Email address | Yes (from Google sign-in) | Yes | App Functionality | No |
| User ID | Yes | Yes | App Functionality | No |
| Other User Content (saved recipes, meal plans, shopping lists, notes) | Yes | Yes | App Functionality | No |
| Photos/videos | No | — | — | — |
| Location | No | — | — | — |
| Contacts | No | — | — | — |
| Usage data / analytics | No | — | — | — |
| Advertising data | No | — | — | — |

- **Do you use data for tracking?** No.
- **Third parties:** Supabase (database + auth) and AI model providers, which
  receive recipe text only — never user identity. Disclosed in the privacy policy.
- **Account deletion:** Yes, available in-app (profile menu → Delete account).
  Required by Guideline 5.1.1(v) — already implemented.

## 7. ⚠️ Demo account for App Review (Guideline 2.1)

**Apple will reject the build if reviewers can't sign in.** FoodVault requires
sign-in, and Google OAuth in a review environment is unreliable, so you MUST
provide credentials in App Store Connect → App Review Information.

Options, best first:
1. **Add email/password auth in Supabase** and create a reviewer account
   pre-loaded with 5–10 recipes and a filled week of meal plans. Paste those
   credentials in the App Review Information fields.
2. Provide a Google test account you control — riskier, Google may challenge the
   sign-in from Apple's network.

Also fill the **Notes** field with something like:
```
FoodVault is a personal recipe organizer. To try the core flow:
1. Sign in with the demo account above.
2. Library tab -> "+ Add Recipe" -> paste any recipe URL (e.g.
   https://www.indianhealthyrecipes.com/paneer-butter-masala-restaurant-style/)
   -> tap Extract. AI extraction takes 10-40 seconds.
3. The saved recipe shows ingredients, steps and estimated nutrition, with a
   link back to the original source.
4. Planner assigns recipes to days; Shop generates a grouped shopping list.
Account deletion is available in the profile menu (top-right avatar).
```

## 8. Screenshots

Required: 6.7" iPhone (1290×2796) and 6.5" (1242×2688). iPad only if you ship
iPad support. Play Store wants a 1024×500 feature graphic too.

Suggested set of 5, in order, each with a short caption overlay:
1. **Library grid** with several appetising recipes — *"Your whole cookbook, in your pocket"*
2. **Add Recipe** sheet mid-extraction — *"Paste any link. AI does the typing."*
3. **Recipe detail** showing ingredients + nutrition — *"Ingredients, steps and nutrition"*
4. **Weekly planner** filled in — *"Plan the week in minutes"*
5. **Shopping list** grouped by aisle — *"Lists that write themselves"*

Generate from the iOS simulator (`⌘S` saves a screenshot at the right size), then
add captions. Use the demo account's data so the screens look full, not empty.

## 9. What's New (first release)

```
First release. Save recipes from any link, plan your week, build shopping lists
automatically, and ask the AI assistant what to cook.
```

---

## Pre-submission checklist

- [ ] Demo account created and entered in App Review Information (§7) ← most-missed step
- [ ] Privacy Policy URL live and reachable (it is)
- [ ] App Privacy answers filled per §6
- [ ] Screenshots for all required sizes
- [ ] Sign in with Apple implemented (Guideline 4.8 — Google-only is a rejection risk)
- [ ] Account deletion verified working on device
- [ ] Description avoids any "download videos" framing (§0 rule)
