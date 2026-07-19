#!/usr/bin/env python3
"""Generate static thumbnail library images for FoodVault.

One-time bulk run was done at launch. Use this manually to add images for
new keywords collected in the `unmatched_thumb_terms` table:

    export OPENROUTER_API_KEY=...   # or source backend/.env
    python3 scripts/gen_thumbnails.py "khandvi:steamed gujarati khandvi rolls"

Each arg is "keyword:scene description". Output goes straight to
frontend/public/thumbnails/<keyword>.jpg (512px JPEG). After running:
  1. add the keyword to frontend/src/lib/staticThumbs.map.json
  2. mark the term done:  update unmatched_thumb_terms set status='done' where term='...';
  3. commit + deploy (web picks it up immediately; native on next release)

Cost: ~$0.04 per image (google/gemini-2.5-flash-image via OpenRouter).
"""
import base64
import json
import os
import subprocess
import sys
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(REPO, "frontend", "public", "thumbnails")
MODEL = os.environ.get("IMG_MODEL", "google/gemini-2.5-flash-image")
STYLE = (
    "Professional food photography, overhead 45-degree angle, warm natural light, "
    "cream linen background, rustic ceramic plate, shallow depth of field, "
    "appetizing, vibrant, no text, no people, no hands"
)


def generate(keyword: str, hint: str) -> str:
    body = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": f"Generate a photo: {hint}. {STYLE}"}],
        "modalities": ["image", "text"],
    }).encode()
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        resp = json.load(r)
    images = resp["choices"][0]["message"].get("images") or []
    if not images:
        raise RuntimeError("no image in response")
    b64 = images[0]["image_url"]["url"].split(",", 1)[1]
    raw = os.path.join(OUT_DIR, "_raw.png")
    with open(raw, "wb") as f:
        f.write(base64.b64decode(b64))
    final = os.path.join(OUT_DIR, keyword.replace(" ", "-") + ".jpg")
    subprocess.run(
        ["sips", "-Z", "512", "-s", "format", "jpeg", "-s", "formatOptions", "80", raw, "--out", final],
        check=True, capture_output=True,
    )
    os.remove(raw)
    cost = resp.get("usage", {}).get("cost")
    print(f"ok: {final} (cost ${cost})")
    return final


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    for arg in sys.argv[1:]:
        kw, _, hint = arg.partition(":")
        generate(kw.strip().lower(), hint.strip() or kw)
