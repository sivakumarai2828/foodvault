# Static Thumbnail Library

Recipes saved from Instagram/TikTok get no usable image (CDN links expire /
creator-face thumbnails). Instead of per-recipe AI image generation
(recurring cost), FoodVault ships a **static library of ~160 AI-generated
food photos** bundled with the frontend. One-time cost ≈ $6; runtime cost $0.

## How it works

1. Images live in `frontend/public/thumbnails/*.jpg` (512px JPEG, ~60-100KB
   each). Served by Netlify CDN on web; bundled into the native app.
2. `frontend/src/lib/staticThumbs.js` picks an image per recipe:
   - recipe has a real `thumbnail` → use it (proxied), as before
   - else match recipe **title keywords** against
     `staticThumbs.map.json` (longest keyword wins:
     "chocolate cake" before "cake")
   - else fall back to the **category** image (snacks, rice, salads…)
   - else the generic plated-meal image
3. Titles that match **no keyword** are reported (fire-and-forget) to
   `POST /api/thumbs/unmatched` and land in the `unmatched_thumb_terms`
   table with a hit counter. Nothing is generated automatically.

## Setup (one-time)

Run `backend/create-unmatched-terms.sql` in the Supabase SQL editor.

## Adding new images later (manual, on demand)

1. Review gaps — highest demand first:
   ```sql
   select term, hit_count, sample_title from unmatched_thumb_terms
   where status = 'pending' order by hit_count desc;
   ```
2. Generate (~$0.04/image, uses `OPENROUTER_API_KEY`):
   ```bash
   python3 scripts/gen_thumbnails.py "khandvi:steamed gujarati khandvi rolls"
   ```
3. Add the keyword to `frontend/src/lib/staticThumbs.map.json` under
   `keywords`, e.g. `"khandvi": "khandvi.jpg"`.
4. Mark done: `update unmatched_thumb_terms set status='done' where term='khandvi';`
   (or `status='ignored'` for junk terms).
5. Commit + deploy. Web picks it up immediately; the native app bundles the
   new image on its next store release (old builds fall back to the
   category image meanwhile — never broken).

The full original keyword list + scene hints: `scripts/thumb_keywords.py`.
