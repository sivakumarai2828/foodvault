import os
import json
import re
import asyncio
import httpx
from datetime import date, timedelta
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client, Client

load_dotenv()

# ─── Clients ──────────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
ai_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
) if OPENROUTER_API_KEY else None

# ─── Helpers ──────────────────────────────────────────────────────────────────

def current_week_start() -> str:
    today = date.today()
    return (today - timedelta(days=today.weekday())).isoformat()

def is_junk_title(title: str) -> bool:
    """Return True if the title looks like URL params or garbage."""
    if not title:
        return True
    junk_patterns = ["utm_", "igsh=", "fbclid=", "ref=", "&", "?", "http"]
    return any(p in title for p in junk_patterns) or len(title) > 200

SOCIAL_DOMAINS = ("instagram.com", "tiktok.com", "facebook.com", "fb.com", "fb.watch")

def is_social_url(url: str) -> bool:
    return any(d in url for d in SOCIAL_DOMAINS)

def domain_label(url: str) -> str:
    """Return empty string for social links (user must type title), domain name for others."""
    if is_social_url(url):
        return ""   # Social media blocks scraping — let user type the name
    try:
        from urllib.parse import urlparse
        host = urlparse(url).hostname or ""
        return host.replace("www.", "").split(".")[0].title() + " Recipe"
    except Exception:
        return ""

async def fetch_link_preview(url: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://api.microlink.io", params={"url": url})
            data = resp.json()
            if data.get("status") == "success":
                d = data.get("data", {})
                raw_title = d.get("title") or ""
                # Social media platforms never give real recipe titles — always return ""
                if is_social_url(url):
                    title = ""
                else:
                    title = raw_title if not is_junk_title(raw_title) else domain_label(url)
                thumbnail = None
                if d.get("image") and d["image"].get("url"):
                    thumbnail = d["image"]["url"]
                elif d.get("logo") and d["logo"].get("url"):
                    thumbnail = d["logo"]["url"]
                return {"title": title, "thumbnail": thumbnail, "description": d.get("description") or ""}
    except Exception:
        pass
    return {"title": "" if is_social_url(url) else domain_label(url), "thumbnail": None, "description": ""}

async def fetch_social_caption(url: str) -> dict:
    """Use yt-dlp to extract caption, thumbnail from Instagram/TikTok reels (free, no API key)."""
    try:
        import subprocess
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: subprocess.run(
                ['yt-dlp', '--dump-json', '--no-download', '--quiet', url],
                capture_output=True, text=True, timeout=30
            )
        )
        if result.returncode == 0 and result.stdout.strip():
            data = json.loads(result.stdout.strip())
            caption = (data.get('description') or data.get('title') or '').strip()
            thumbnail = data.get('thumbnail') or ''
            return {"caption": caption, "thumbnail": thumbnail}
    except Exception:
        pass
    return {"caption": "", "thumbnail": ""}

async def fetch_page_text(url: str) -> str:
    """Try to fetch raw page text for richer AI extraction."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; FoodVaultBot/1.0)"}
        async with httpx.AsyncClient(timeout=12, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            text = resp.text
            # Strip HTML tags
            text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
            text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
            text = re.sub(r'<[^>]+>', ' ', text)
            text = re.sub(r'\s+', ' ', text).strip()
            return text[:6000]  # Keep first 6000 chars
    except Exception:
        return ""

def ai_call(prompt: str, system: str = "", max_tokens: int = 1500) -> str:
    if not ai_client:
        return "{}"
    response = ai_client.chat.completions.create(
        model="openai/gpt-oss-20b:free",
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system or "You are a helpful cooking assistant."},
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content.strip()

def extract_json(text: str):
    match = re.search(r'(\{.*\}|\[.*\])', text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(text)

async def ai_extract_recipe_details(url: str, title: str, description: str) -> dict:
    """Extract title, ingredients (grouped), instructions, and nutrition from recipe page."""
    # Social media pages block crawlers — skip page fetch, return empty title
    if is_social_url(url):
        page_text = ""
    else:
        page_text = await fetch_page_text(url)
    content = f"URL: {url}\nTitle: {title}\nDescription: {description}\nPage content: {page_text}" if page_text else f"URL: {url}\nTitle: {title}\nDescription: {description}"

    result = ai_call(
        f"""Analyze this recipe content and extract structured data:

{content}

Return ONLY a JSON object with this exact structure:
{{
  "title": "Proper Recipe Name",
  "ingredients": {{
    "GroupName": ["ingredient with quantity", "..."],
    "AnotherGroup": ["ingredient", "..."]
  }},
  "instructions": [
    "Step 1 description",
    "Step 2 description"
  ],
  "nutrition": {{
    "calories": 350,
    "protein": 25,
    "carbs": 40,
    "fat": 12
  }}
}}

Rules:
- "title": Extract the actual dish name (e.g. "Butter Chicken", "Cheesy Flatbread"). NEVER use URL params or generic phrases. If unclear, infer from context.
- "ingredients": Extract if listed. If NOT listed in the content, INFER reasonable ingredients for this dish based on the title and any context clues. Always return at least a basic ingredient list — never return an empty object.
- "instructions": Extract if listed. If NOT listed, write standard preparation steps for this type of dish based on the title. Always return at least 3–5 steps — never return an empty array.
- Group ingredients logically (e.g. "Marinade", "Sauce", "For the dough", "Main"). If only one group, use "Ingredients" as the key.
- "nutrition": Estimate reasonable per-serving values based on the dish type. Always provide all four fields.
- Return ONLY valid JSON, no explanation or markdown.""",
        system="You are a recipe data extraction expert. When recipe details are not explicitly provided, intelligently infer them from the dish name and context. Always return complete, useful recipe data. Return valid JSON only.",
        max_tokens=2000
    )
    try:
        data = extract_json(result)
        return {
            "title":        data.get("title", ""),
            "ingredients":  data.get("ingredients", {}),
            "instructions": data.get("instructions", []),
            "nutrition":    data.get("nutrition", {}),
        }
    except Exception:
        return {"title": "", "ingredients": {}, "instructions": [], "nutrition": {}}

def sb_one(query) -> Optional[dict]:
    """Execute a Supabase query and return the first matching row as dict, or None."""
    try:
        result = query.limit(1).execute()
        return result.data[0] if result and result.data else None
    except Exception:
        return None

def enrich_recipe(r: dict) -> dict:
    if r.get("categories"):
        r["category_name"] = r["categories"]["name"]
    elif r.get("category_id"):
        cat = sb_one(supabase.table("categories").select("name").eq("id", r["category_id"]))
        r["category_name"] = cat["name"] if cat else None
    else:
        r["category_name"] = None
    r.pop("categories", None)
    return r

# ─── App ──────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield

app = FastAPI(title="FoodVault API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ─── Schemas ──────────────────────────────────────────────────────────────────

class RecipeCreate(BaseModel):
    url: str
    category_id: Optional[int] = None
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    description: Optional[str] = None
    ingredients: Optional[dict] = None
    instructions: Optional[list] = None
    nutrition: Optional[dict] = None

class RecipeUpdate(BaseModel):
    title: Optional[str] = None
    category_id: Optional[int] = None
    thumbnail: Optional[str] = None
    description: Optional[str] = None
    cooked: Optional[bool] = None
    notes: Optional[str] = None
    ingredients: Optional[dict] = None
    instructions: Optional[list] = None
    nutrition: Optional[dict] = None

class MealPlanEntry(BaseModel):
    week_start: Optional[str] = None
    day_of_week: str
    meal_slot: str
    recipe_id: int

class ChatMessage(BaseModel):
    message: str

class TextExtractRequest(BaseModel):
    text: str
    title: str = ""

# ─── Extract from pasted text ─────────────────────────────────────────────────

@app.post("/api/extract-from-text")
async def extract_from_text(data: TextExtractRequest):
    """Extract structured recipe details from user-pasted text (for Instagram/TikTok reels)."""
    result = ai_call(
        f"""Extract recipe details from this text:

Title hint: {data.title or "unknown"}
Text: {data.text}

Return ONLY a JSON object with this exact structure:
{{
  "ingredients": {{
    "GroupName": ["ingredient with quantity", "..."]
  }},
  "instructions": [
    "Step 1 description",
    "Step 2 description"
  ],
  "nutrition": {{
    "calories": 350,
    "protein": 25,
    "carbs": 40,
    "fat": 12
  }}
}}

Rules:
- Group ingredients logically (e.g. "Marinade", "Sauce", "Main"). If only one group, use "Ingredients"
- Instructions should be clear numbered steps
- Estimate nutrition per serving if not provided
- Return ONLY valid JSON, no explanation""",
        system="You are a recipe data extraction expert. Always return valid JSON only.",
        max_tokens=2000
    )
    try:
        parsed = extract_json(result)
        return {
            "ingredients":  parsed.get("ingredients", {}),
            "instructions": parsed.get("instructions", []),
            "nutrition":    parsed.get("nutrition", {}),
        }
    except Exception:
        return {"ingredients": {}, "instructions": [], "nutrition": {}}

# ─── Categories ───────────────────────────────────────────────────────────────

@app.get("/api/categories")
def list_categories():
    try:
        return supabase.table("categories").select("*").order("name").execute().data
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {e}")

@app.post("/api/categories", status_code=201)
def create_category(name: str):
    existing = sb_one(supabase.table("categories").select("id").eq("name", name))
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    return supabase.table("categories").insert({"name": name, "is_default": False}).execute().data[0]

@app.delete("/api/categories/{cat_id}", status_code=204)
def delete_category(cat_id: int):
    cat = sb_one(supabase.table("categories").select("*").eq("id", cat_id))
    if not cat:
        raise HTTPException(status_code=404, detail="Not found")
    if cat.get("is_default"):
        raise HTTPException(status_code=400, detail="Cannot delete default categories")
    supabase.table("categories").delete().eq("id", cat_id).execute()

# ─── Link Preview + Extract ───────────────────────────────────────────────────

@app.get("/api/image-proxy")
async def image_proxy(url: str):
    """Proxy external images (Instagram CDN etc.) to bypass browser CORS/referrer restrictions."""
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url, headers={"Referer": "https://www.instagram.com/", "User-Agent": "Mozilla/5.0"})
            return Response(content=resp.content, media_type=resp.headers.get("content-type", "image/jpeg"))
    except Exception:
        raise HTTPException(status_code=404, detail="Image not found")

@app.get("/api/preview")
async def preview_link(url: str):
    return await fetch_link_preview(url)

def suggest_category_id(title: str, categories: list) -> Optional[int]:
    """Use AI to match recipe title to a category, return category id or None."""
    if not categories or not title:
        return None
    cat_names = [c["name"] for c in categories]
    result = ai_call(
        f"Recipe: {title}\nCategories: {', '.join(cat_names)}\nWhich single category best fits? Reply with just the category name.",
        system="You are a food categorization assistant.",
        max_tokens=50
    )
    matched = next((c for c in categories if c["name"].lower() == result.strip().lower()), None)
    return matched["id"] if matched else None

@app.get("/api/extract")
async def extract_recipe(url: str):
    """Fetch preview + AI-extract full recipe details (title, ingredients, instructions, nutrition)."""
    categories = supabase.table("categories").select("*").order("name").execute().data
    preview = await fetch_link_preview(url)

    if is_social_url(url):
        social = await fetch_social_caption(url)
        # Use yt-dlp thumbnail (real food image) over microlink logo
        # yt-dlp gives the actual reel food image; microlink often returns the app logo
        thumbnail = social["thumbnail"] or preview["thumbnail"]
        caption = social["caption"]
        if caption:
            details = await ai_extract_recipe_details(url, "", caption)
            title = details.get("title") or ""
            cat_id = suggest_category_id(title, categories)
            return {
                "title": title,
                "thumbnail": thumbnail,
                "description": caption[:300],
                "ingredients": details.get("ingredients", {}),
                "instructions": details.get("instructions", []),
                "nutrition": details.get("nutrition", {}),
                "suggested_category_id": cat_id,
            }
        return {
            "title": "", "thumbnail": thumbnail, "description": "",
            "ingredients": {}, "instructions": [], "nutrition": {},
            "suggested_category_id": None,
        }

    details = await ai_extract_recipe_details(url, preview["title"], preview["description"])
    final_title = details.get("title") or preview["title"]
    if is_junk_title(preview["title"]) and details.get("title"):
        final_title = details["title"]
    cat_id = suggest_category_id(final_title, categories)
    return {**preview, "title": final_title, **{k: v for k, v in details.items() if k != "title"}, "suggested_category_id": cat_id}

# ─── Recipes ──────────────────────────────────────────────────────────────────

@app.get("/api/recipes")
def list_recipes(category_id: Optional[int] = None, q: Optional[str] = None):
    try:
        query = supabase.table("recipes").select("*, categories(name)").order("created_at", desc=True)
        if category_id:
            query = query.eq("category_id", category_id)
        if q:
            query = query.ilike("title", f"%{q}%")
        return [enrich_recipe(r) for r in query.execute().data]
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {e}")

@app.post("/api/recipes", status_code=201)
async def create_recipe(data: RecipeCreate):
    preview = await fetch_link_preview(data.url)
    description = data.description or preview["description"]

    if is_social_url(data.url):
        if data.ingredients is not None:
            title = data.title or ""
            details = {
                "ingredients": data.ingredients,
                "instructions": data.instructions or [],
                "nutrition": data.nutrition or {},
            }
            yt_thumbnail = None
        else:
            social = await fetch_social_caption(data.url)
            yt_thumbnail = social["thumbnail"]
            caption = social["caption"]
            if caption:
                details = await ai_extract_recipe_details(data.url, "", caption)
                title = data.title or details.get("title") or ""
            else:
                title = data.title or ""
                details = {"ingredients": {}, "instructions": [], "nutrition": {}}
    else:
        yt_thumbnail = None
        # Use pre-extracted details from frontend if provided, else run AI extraction
        if data.ingredients is not None:
            details = {
                "ingredients": data.ingredients,
                "instructions": data.instructions or [],
                "nutrition": data.nutrition or {},
            }
            title = data.title or preview["title"]
        else:
            details = await ai_extract_recipe_details(data.url, preview["title"], description)
            title = data.title or details.get("title") or preview["title"]

    row = {
        "title":        title,
        "url":          data.url,
        "thumbnail":    data.thumbnail or yt_thumbnail or preview["thumbnail"],
        "description":  description,
        "category_id":  data.category_id,
        "ingredients":  details["ingredients"],
        "instructions": details["instructions"],
        "nutrition":    details["nutrition"],
        "cooked":       False,
        "notes":        None,
    }
    res = supabase.table("recipes").insert(row).execute()
    return enrich_recipe(res.data[0])

@app.get("/api/recipes/{recipe_id}")
def get_recipe(recipe_id: int):
    res = sb_one(supabase.table("recipes").select("*, categories(name)").eq("id", recipe_id))
    if not res:
        raise HTTPException(status_code=404, detail="Not found")
    return enrich_recipe(res)

@app.patch("/api/recipes/{recipe_id}")
def update_recipe(recipe_id: int, data: RecipeUpdate):
    updates = {k: v for k, v in data.model_dump().items() if v is not None or k in ('ingredients', 'instructions', 'nutrition')}
    updates = {k: v for k, v in updates.items() if k in data.model_fields_set}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = supabase.table("recipes").update(updates).eq("id", recipe_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Not found")
    return enrich_recipe(res.data[0])

@app.delete("/api/recipes/{recipe_id}", status_code=204)
def delete_recipe(recipe_id: int):
    supabase.table("recipes").delete().eq("id", recipe_id).execute()

# ─── AI ───────────────────────────────────────────────────────────────────────

@app.post("/api/ai/categorize")
def ai_categorize(recipe_id: int):
    r = sb_one(supabase.table("recipes").select("*").eq("id", recipe_id))
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    categories = supabase.table("categories").select("*").execute().data
    cat_names = [c["name"] for c in categories]
    result = ai_call(
        f"Recipe title: {r['title']}\nDescription: {r.get('description') or 'N/A'}\n"
        f"Available categories: {', '.join(cat_names)}\n"
        f"Which single category best fits? Reply with just the category name.",
        system="You are a food categorization assistant."
    )
    matched = next((c for c in categories if c["name"].lower() == result.lower().strip()), None)
    if matched:
        supabase.table("recipes").update({"category_id": matched["id"]}).eq("id", recipe_id).execute()
    return {"suggested_category": result, "matched_id": matched["id"] if matched else None}

@app.post("/api/ai/ingredients/{recipe_id}")
def ai_extract_ingredients(recipe_id: int):
    r = sb_one(supabase.table("recipes").select("*").eq("id", recipe_id))
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    # Return stored ingredients if available
    if r.get("ingredients"):
        stored = r["ingredients"]
        all_items = []
        if isinstance(stored, dict):
            for items in stored.values():
                all_items.extend(items)
        elif isinstance(stored, list):
            all_items = stored
        if all_items:
            return {"ingredients": all_items}
    # Fallback: call AI
    result = ai_call(
        f"Recipe: {r['title']}\nDescription: {r.get('description') or 'N/A'}\n"
        f"Extract ingredients list as JSON array: [\"2 cups rice\", \"1 onion\"]",
        system="Return valid JSON only."
    )
    try:
        return {"ingredients": extract_json(result)}
    except Exception:
        return {"ingredients": [result]}

@app.post("/api/ai/suggest-plan")
def ai_suggest_plan():
    recipes = supabase.table("recipes").select("*, categories(name)").execute().data
    if not recipes:
        raise HTTPException(status_code=400, detail="No recipes in library")
    recipe_list = "\n".join([
        f"- ID:{r['id']} | {r['title']} | Category:{r.get('categories', {}).get('name', 'Uncategorized') if r.get('categories') else 'Uncategorized'}"
        for r in recipes
    ])
    days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
    result = ai_call(
        f"Recipes:\n{recipe_list}\n\n"
        f"Create a balanced weekly meal plan assigning recipe IDs.\n"
        f'Return JSON: {{"Monday":{{"Breakfast":<id>,"Lunch":<id>,"Snacks":<id>,"Dinner":<id>}},...}}\n'
        f"Include all 7 days: {', '.join(days)}",
        system="Meal planning assistant. Return valid JSON only."
    )
    try:
        plan_data = extract_json(result)
    except Exception:
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {result}")
    ws = current_week_start()
    supabase.table("meal_plans").delete().eq("week_start", ws).execute()
    recipe_ids = {r["id"] for r in recipes}
    created = []
    for day, slots in plan_data.items():
        if not isinstance(slots, dict):
            continue
        for slot, rid in slots.items():
            try:
                rid_int = int(rid)
            except (TypeError, ValueError):
                continue
            if rid_int in recipe_ids:
                supabase.table("meal_plans").insert({"week_start": ws, "day_of_week": day, "meal_slot": slot, "recipe_id": rid_int}).execute()
                created.append({"day": day, "slot": slot, "recipe_id": rid_int})
    return {"created": len(created), "plan": created}

@app.post("/api/ai/chat")
def ai_chat(msg: ChatMessage):
    recipes = supabase.table("recipes").select("*, categories(name)").execute().data
    recipe_list = "\n".join([
        f"- {r['title']} | {r.get('categories',{}).get('name','Uncategorized') if r.get('categories') else 'Uncategorized'}"
        for r in recipes
    ])
    result = ai_call(
        msg.message,
        system=(
            "You are FoodVault's cooking assistant. "
            f"User's saved recipes:\n{recipe_list}\n\n"
            "Be friendly, concise, and helpful."
        )
    )
    return {"reply": result}

# ─── Meal Planner ─────────────────────────────────────────────────────────────

@app.get("/api/meal-plan")
def get_meal_plan(week_start: Optional[str] = None):
    ws = week_start or current_week_start()
    entries = supabase.table("meal_plans").select("*").eq("week_start", ws).execute().data
    result = []
    for e in entries:
        recipe = sb_one(supabase.table("recipes").select("*, categories(name)").eq("id", e["recipe_id"]))
        result.append({**e, "recipe": enrich_recipe(recipe) if recipe else None})
    return result

@app.post("/api/meal-plan", status_code=201)
def set_meal_plan_entry(data: MealPlanEntry):
    ws = data.week_start or current_week_start()
    if not sb_one(supabase.table("recipes").select("id").eq("id", data.recipe_id)):
        raise HTTPException(status_code=404, detail="Recipe not found")
    existing = sb_one(supabase.table("meal_plans").select("id").eq("week_start", ws).eq("day_of_week", data.day_of_week).eq("meal_slot", data.meal_slot))
    if existing:
        res = supabase.table("meal_plans").update({"recipe_id": data.recipe_id}).eq("id", existing["id"]).execute()
    else:
        res = supabase.table("meal_plans").insert({"week_start": ws, "day_of_week": data.day_of_week, "meal_slot": data.meal_slot, "recipe_id": data.recipe_id}).execute()
    return res.data[0]

@app.delete("/api/meal-plan/{entry_id}", status_code=204)
def delete_meal_plan_entry(entry_id: int):
    supabase.table("meal_plans").delete().eq("id", entry_id).execute()

# ─── Shopping List ────────────────────────────────────────────────────────────

@app.get("/api/shopping")
def get_shopping_list(week_start: Optional[str] = None):
    ws = week_start or current_week_start()
    items = supabase.table("shopping_items").select("*").eq("week_start", ws).execute().data
    return [{"id": i["id"], "week_start": i["week_start"], "name": i["name"], "group": i["grp"], "checked": i["checked"], "recipe_title": i.get("recipe_title")} for i in items]

@app.post("/api/shopping/generate")
def generate_shopping_list(week_start: Optional[str] = None):
    ws = week_start or current_week_start()
    entries = supabase.table("meal_plans").select("recipe_id").eq("week_start", ws).execute().data
    if not entries:
        raise HTTPException(status_code=400, detail="No meal plan for this week")
    recipe_ids = list({e["recipe_id"] for e in entries})
    recipes = [sb_one(supabase.table("recipes").select("title, description, ingredients").eq("id", rid)) for rid in recipe_ids]
    recipes = [r for r in recipes if r]
    recipe_info = "\n".join([f"- {r['title']}: {r.get('description') or 'No description'}" for r in recipes])
    result = ai_call(
        f"Cooking this week:\n{recipe_info}\n\n"
        f'Return combined shopping list as JSON: {{"Vegetables":["2 onions"],"Proteins":["500g chicken"],"Dairy":["1 cup yogurt"],"Spices":["1 tsp cumin"],"Grains":["2 cups rice"],"Others":["olive oil"]}}',
        system="Shopping list generator. Return valid JSON only."
    )
    try:
        grouped = extract_json(result)
    except Exception:
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {result}")
    # For AI-generated lists we don't track per-item source, set recipe_title to None
    supabase.table("shopping_items").delete().eq("week_start", ws).execute()
    items = []
    for group, ingredient_list in grouped.items():
        for item_name in ingredient_list:
            supabase.table("shopping_items").insert({"week_start": ws, "name": item_name, "grp": group, "checked": False, "recipe_title": None}).execute()
            items.append({"name": item_name, "group": group})
    return {"generated": len(items), "items": items}

@app.patch("/api/shopping/{item_id}/toggle")
def toggle_shopping_item(item_id: int):
    item = sb_one(supabase.table("shopping_items").select("*").eq("id", item_id))
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    updated = supabase.table("shopping_items").update({"checked": not item["checked"]}).eq("id", item_id).execute().data[0]
    return {"id": updated["id"], "week_start": updated["week_start"], "name": updated["name"], "group": updated["grp"], "checked": updated["checked"], "recipe_title": updated.get("recipe_title")}

@app.post("/api/shopping/add-recipe/{recipe_id}", status_code=201)
def add_recipe_to_shopping(recipe_id: int):
    """Add a single recipe's ingredients directly to the shopping list."""
    recipe = sb_one(supabase.table("recipes").select("title, ingredients").eq("id", recipe_id))
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    ingredients = recipe.get("ingredients") or {}
    if not ingredients:
        raise HTTPException(status_code=400, detail="Recipe has no ingredients")

    ws = current_week_start()
    recipe_title = recipe["title"]
    added = []
    for group_name, items in ingredients.items():
        grp = _classify_ingredient_group(group_name, items)
        for item in (items or []):
            supabase.table("shopping_items").insert({
                "week_start": ws, "name": str(item), "grp": grp, "checked": False, "recipe_title": recipe_title
            }).execute()
            added.append({"name": item, "group": grp})
    return {"added": len(added), "items": added}

def _classify_ingredient_group(group_name: str, items: list) -> str:
    """Map recipe ingredient group name → shopping category."""
    g = (group_name or "").lower()
    sample = " ".join(str(i) for i in (items or [])[:3]).lower()
    combined = g + " " + sample
    if any(w in combined for w in ['protein','chicken','beef','pork','fish','lamb','egg','prawn','shrimp','meat','salmon','tuna','tofu','lentil','bean','chickpea','dal']):
        return 'Proteins'
    if any(w in combined for w in ['dairy','milk','cream','cheese','butter','yogurt','curd','ghee','paneer']):
        return 'Dairy'
    if any(w in combined for w in ['vegetable','onion','garlic','tomato','carrot','pepper','spinach','potato','mushroom','cucumber','cabbage','broccoli','herb','parsley','cilantro','coriander','basil','mint','ginger']):
        return 'Vegetables'
    if any(w in combined for w in ['spice','cumin','turmeric','paprika','chili','chilli','cardamom','cinnamon','clove','nutmeg','masala','saffron','oregano','thyme','rosemary','seasoning']):
        return 'Spices'
    if any(w in combined for w in ['grain','rice','wheat','flour','bread','pasta','noodle','oat','barley','corn','semolina','couscous','dough']):
        return 'Grains'
    return 'Others'

@app.delete("/api/shopping", status_code=204)
def clear_shopping_list(week_start: Optional[str] = None):
    supabase.table("shopping_items").delete().eq("week_start", week_start or current_week_start()).execute()

# ─── Today's Menu ─────────────────────────────────────────────────────────────

@app.get("/api/today")
def get_today_menu():
    today = date.today()
    day_name = today.strftime("%A")
    ws = current_week_start()
    entries = supabase.table("meal_plans").select("*").eq("week_start", ws).eq("day_of_week", day_name).execute().data
    slot_order = {"Breakfast": 0, "Lunch": 1, "Snacks": 2, "Dinner": 3}
    result = []
    for e in entries:
        recipe = sb_one(supabase.table("recipes").select("*, categories(name)").eq("id", e["recipe_id"]))
        result.append({"id": e["id"], "meal_slot": e["meal_slot"], "recipe": enrich_recipe(recipe) if recipe else None})
    result.sort(key=lambda x: slot_order.get(x["meal_slot"], 99))
    return {"day": day_name, "date": today.isoformat(), "meals": result}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
