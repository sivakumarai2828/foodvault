// Static thumbnail library — 160 pre-generated food images bundled with the app.
// Matches recipe titles/categories to a local image so recipes without a real
// thumbnail still get an appetizing, on-brand card. Zero runtime cost.
import mapping from './staticThumbs.map.json'
import { imageProxyUrl } from './api'

const BASE = '/thumbnails/'

// Longest keywords first so "chocolate cake" wins over "cake".
const KEYWORDS = Object.keys(mapping.keywords).sort((a, b) => b.length - a.length)

/**
 * Pick a static thumbnail for a recipe. Returns a bundled asset URL, or null.
 * Match order: title keyword → category fallback → generic.
 */
export function staticThumb(title, category) {
  const t = (title || '').toLowerCase()
  for (const kw of KEYWORDS) {
    if (t.includes(kw)) return BASE + mapping.keywords[kw]
  }
  const cat = (category || '').toLowerCase()
  if (mapping.fallbacks[cat]) return BASE + mapping.fallbacks[cat]
  return BASE + mapping.fallbacks.generic
}

/**
 * Resolve the image to show for a recipe card: real thumbnail (proxied)
 * when present, otherwise a bundled static image.
 */
export function recipeThumb(recipe) {
  if (recipe?.thumbnail) return imageProxyUrl(recipe.thumbnail)
  return staticThumb(recipe?.title, recipe?.category_name)
}

/**
 * onError handler: a broken real thumbnail falls back to the static library
 * image instead of a blank box. The data flag prevents an error loop if the
 * static image itself ever fails.
 */
export function thumbError(e, recipe) {
  const img = e.target
  if (img.dataset.fellBack) { img.style.display = 'none'; return }
  img.dataset.fellBack = '1'
  img.src = staticThumb(recipe?.title, recipe?.category_name)
}

/**
 * True when the title matched a real keyword (not just a category/generic
 * fallback) — callers use this to report unmatched terms to the backend.
 */
export function hasKeywordMatch(title) {
  const t = (title || '').toLowerCase()
  return KEYWORDS.some(kw => t.includes(kw))
}
