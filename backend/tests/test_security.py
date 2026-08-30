"""Security regression tests.

These exist because a real cross-tenant bug shipped: POST /api/ai/categorize and
POST /api/ai/ingredients/{id} were unauthenticated AND looked recipes up by id
with no user_id filter, so any caller could read and modify any user's recipe.

The db client uses the Supabase service_role key, which bypasses Row Level
Security — so the application-level user_id filter is the ONLY thing preventing
cross-tenant access. That makes these tests load-bearing, not decorative.

Run:  python -m pytest tests/ -q
"""
import os
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# main.py builds Supabase clients at import time; give it harmless values so the
# tests never depend on a live project.
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-anon-key")

import main  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

client = TestClient(main.app)


# ─── SSRF guard ───────────────────────────────────────────────────────────────
# /api/image-proxy is deliberately public (an <img> tag cannot send a JWT), so
# the URL guard is its entire defence.

@pytest.mark.parametrize("url", [
    "http://169.254.169.254/latest/meta-data/",   # cloud metadata service
    "http://metadata.google.internal/",           # GCP metadata
    "http://localhost:8010/health",               # loopback
    "http://127.0.0.1/",                          # loopback
    "http://192.168.1.1/",                        # private
    "http://10.0.0.1/",                           # private
    "http://172.16.0.1/",                         # private
    "file:///etc/passwd",                         # non-http scheme
    "ftp://example.com/x.jpg",                    # non-http scheme
    "not-a-url",
    "",
])
def test_ssrf_guard_blocks_dangerous_urls(url):
    assert main._is_safe_public_url(url) is False, f"SSRF guard allowed {url!r}"


@pytest.mark.parametrize("url", [
    "https://www.indianhealthyrecipes.com/img.jpg",
    "https://scontent.cdninstagram.com/v/photo.jpg",
])
def test_ssrf_guard_allows_public_urls(url):
    assert main._is_safe_public_url(url) is True


def test_image_proxy_rejects_unsafe_url_without_fetching():
    r = client.get("/api/image-proxy", params={"url": "http://169.254.169.254/"})
    assert r.status_code == 400


# ─── Authentication ───────────────────────────────────────────────────────────
# Every endpoint touching user data or a paid AI call must reject anonymous
# callers. These five were genuinely unauthenticated at one point.

PROTECTED = [
    ("GET",    "/api/recipes"),
    ("POST",   "/api/recipes"),
    ("GET",    "/api/recipes/1"),
    ("PATCH",  "/api/recipes/1"),
    ("DELETE", "/api/recipes/1"),
    ("GET",    "/api/extract?url=https://example.com"),        # paid AI call
    ("GET",    "/api/preview?url=https://example.com"),        # paid API call
    ("POST",   "/api/extract-from-text"),                      # paid AI call
    ("POST",   "/api/ai/categorize?recipe_id=1"),              # was cross-tenant
    ("POST",   "/api/ai/ingredients/1"),                       # was cross-tenant
    ("POST",   "/api/ai/suggest-plan"),
    ("POST",   "/api/ai/chat"),
    ("POST",   "/api/categories?name=x"),                      # global table write
    ("DELETE", "/api/categories/1"),                           # global table write
    ("GET",    "/api/meal-plan"),
    ("POST",   "/api/meal-plan"),
    ("DELETE", "/api/meal-plan/1"),
    ("GET",    "/api/shopping"),
    ("POST",   "/api/shopping/generate"),
    ("DELETE", "/api/shopping"),
    ("GET",    "/api/today"),
    ("DELETE", "/api/account"),
]


@pytest.mark.parametrize("method,path", PROTECTED)
def test_protected_endpoints_reject_anonymous(method, path):
    r = client.request(method, path, json={})
    assert r.status_code == 401, (
        f"{method} {path} returned {r.status_code}, expected 401 — "
        "an unauthenticated caller must never reach user data or paid AI calls"
    )


@pytest.mark.parametrize("method,path", PROTECTED)
def test_protected_endpoints_reject_malformed_token(method, path):
    r = client.request(method, path, json={}, headers={"Authorization": "Bearer nonsense"})
    assert r.status_code == 401


@pytest.mark.parametrize("path", ["/health", "/api/categories"])
def test_public_endpoints_stay_public(path):
    # /health must work for uptime checks; GET /api/categories exposes only
    # global category names. Neither should start requiring auth by accident.
    assert client.get(path).status_code != 401


# ─── Ownership scoping ────────────────────────────────────────────────────────
# RLS is bypassed by the service-role client, so every query MUST filter by
# user_id. These assert the filter is actually applied.

class _Chain:
    """Records .eq() calls so we can assert user_id scoping."""
    def __init__(self, recorder): self.recorder = recorder
    def select(self, *a, **k): return self
    def update(self, *a, **k): return self
    def delete(self, *a, **k): return self
    def insert(self, *a, **k): return self
    def order(self, *a, **k): return self
    def limit(self, *a, **k): return self
    def eq(self, col, val):
        self.recorder.append((col, val))
        return self
    def execute(self):
        m = MagicMock(); m.data = []
        return m


def _capture_eq_columns(fn):
    calls = []
    table = MagicMock(side_effect=lambda *_a, **_k: _Chain(calls))
    with patch.object(main, "db", MagicMock(table=table)):
        try:
            fn()
        except Exception:
            pass  # we only care which filters were applied
    return [c[0] for c in calls]


def test_ai_categorize_filters_by_user_id():
    cols = _capture_eq_columns(lambda: main.ai_categorize(recipe_id=1, user_id="user-A"))
    assert "user_id" in cols, (
        "ai_categorize must filter by user_id — without it any caller can read "
        "and recategorize another user's recipe (the original bug)"
    )


def test_ai_ingredients_filters_by_user_id():
    cols = _capture_eq_columns(lambda: main.ai_extract_ingredients(recipe_id=1, user_id="user-A"))
    assert "user_id" in cols, "ai_extract_ingredients must filter by user_id"


def test_get_recipe_filters_by_user_id():
    cols = _capture_eq_columns(lambda: main.get_recipe(recipe_id=1, user_id="user-A"))
    assert "user_id" in cols


def test_delete_recipe_filters_by_user_id():
    cols = _capture_eq_columns(lambda: main.delete_recipe(recipe_id=1, user_id="user-A"))
    assert "user_id" in cols


def test_update_recipe_filters_by_user_id():
    cols = _capture_eq_columns(
        lambda: main.update_recipe(recipe_id=1, data=main.RecipeUpdate(title="x"), user_id="user-A"))
    assert "user_id" in cols


# ─── CORS ─────────────────────────────────────────────────────────────────────

def test_cors_is_not_wildcard():
    assert "*" not in main.CORS_ORIGINS, (
        "wildcard origin with allow_credentials=True lets any site make "
        "authenticated requests on a user's behalf"
    )
