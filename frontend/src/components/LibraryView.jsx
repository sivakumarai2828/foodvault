import { useEffect, useState, useCallback, useRef } from 'react'
import { getRecipes, getCategories, createRecipe, updateRecipe, deleteRecipe,
         extractRecipe, reExtractRecipe, aiCategorize, createCategory, imageProxyUrl,
         setMealPlanEntry, addRecipeToShopping } from '../lib/api'
import { useToast } from '../App'
import CookingMode from './CookingMode'

// ─── Category emoji mapping ───────────────────────────────────────────────────
const CAT_EMOJI_MAP = {
  biryani: '🍚', rice: '🍚', fried: '🍳',
  curry: '🍛', curries: '🍛', gravy: '🍛',
  chicken: '🍗', mutton: '🥩', beef: '🥩', lamb: '🥩',
  fish: '🐟', seafood: '🦐', prawn: '🦐',
  veg: '🥗', vegetarian: '🥗', salad: '🥗',
  breakfast: '🍳', snack: '🫙', snacks: '🫙',
  dessert: '🍰', sweet: '🍰', cake: '🎂',
  soup: '🍲', dal: '🍲', lentil: '🍲',
  pasta: '🍝', noodle: '🍜', noodles: '🍜',
  bread: '🍞', roti: '🫓', paratha: '🫓',
  drink: '🥤', juice: '🥤', smoothie: '🥤',
  pizza: '🍕', burger: '🍔', sandwich: '🥪',
  paneer: '🧀', tofu: '🧀',
}

const getCategoryEmoji = (name = '') => {
  const lower = name.toLowerCase()
  return Object.entries(CAT_EMOJI_MAP).find(([k]) => lower.includes(k))?.[1] || '🍽️'
}

const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const DAY_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const SLOTS = ['Breakfast','Lunch','Snacks','Dinner']
const SLOT_EMOJI = { Breakfast: '🌅', Lunch: '☀️', Snacks: '🍎', Dinner: '🌙' }

// ─── Nutrition Ring ───────────────────────────────────────────────────────────
function NutritionRing({ calories }) {
  return (
    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="28" fill="none" stroke="var(--cream-3)" strokeWidth="7"/>
        <circle cx="36" cy="36" r="28" fill="none" stroke="var(--primary)" strokeWidth="7"
          strokeDasharray={`${Math.min((calories / 800) * 176, 176)} 176`}
          strokeLinecap="round" transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dasharray .6s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{calories}</span>
        <span style={{ fontSize: 9, color: 'var(--ink-3)', fontWeight: 500 }}>kcal</span>
      </div>
    </div>
  )
}

// ─── Recipe Detail Modal ──────────────────────────────────────────────────────
function RecipeDetailModal({ recipe: initialRecipe, onClose, onUpdated }) {
  const toast = useToast()
  const [recipe, setRecipe] = useState(initialRecipe)
  const [activeTab, setActiveTab] = useState('ingredients')
  const [savingNote, setSavingNote] = useState(false)
  const [note, setNote] = useState(initialRecipe.notes || '')
  const [reExtracting, setReExtracting] = useState(false)
  const [cookingMode, setCookingMode] = useState(false)
  // Quick actions
  const [showMealPlanPicker, setShowMealPlanPicker] = useState(false)
  const [pickerDay, setPickerDay]   = useState('Monday')
  const [pickerSlot, setPickerSlot] = useState('Dinner')
  const [addingToPlan, setAddingToPlan]   = useState(false)
  const [addingToShop, setAddingToShop]   = useState(false)

  const ingredients = recipe.ingredients || {}
  const instructions = recipe.instructions || []
  const nutrition    = recipe.nutrition || {}

  const hasIngredients  = typeof ingredients === 'object' && Object.keys(ingredients).length > 0
  const hasInstructions = Array.isArray(instructions) && instructions.length > 0
  const hasNutrition    = nutrition && nutrition.calories

  const toggleCooked = async () => {
    try {
      const updated = await updateRecipe(recipe.id, { cooked: !recipe.cooked })
      setRecipe(r => ({ ...r, cooked: updated.cooked }))
      onUpdated({ ...recipe, cooked: updated.cooked })
      toast(updated.cooked ? 'Marked as cooked! 🎉' : 'Unmarked', 'success')
    } catch { toast('Failed', 'error') }
  }

  const handleReExtract = async () => {
    setReExtracting(true)
    try {
      const data = await reExtractRecipe(recipe.url)
      const updates = {}
      // Only update fields that have real data
      if (data.ingredients && Object.keys(data.ingredients).length > 0) updates.ingredients = data.ingredients
      if (Array.isArray(data.instructions) && data.instructions.length > 0) updates.instructions = data.instructions
      if (data.nutrition?.calories) updates.nutrition = data.nutrition
      if (data.title && data.title !== recipe.title && data.title.length > 2) updates.title = data.title
      if (data.thumbnail) updates.thumbnail = data.thumbnail
      if (!Object.keys(updates).length) { toast('Nothing new found to update', 'info'); return }
      const updated = await updateRecipe(recipe.id, updates)
      setRecipe(r => ({ ...r, ...updated }))
      onUpdated({ ...recipe, ...updated })
      toast('Recipe details updated! ✓', 'success')
    } catch {
      toast('Re-extraction failed', 'error')
    } finally {
      setReExtracting(false)
    }
  }

  const saveNote = async () => {
    setSavingNote(true)
    try {
      await updateRecipe(recipe.id, { notes: note })
      onUpdated({ ...recipe, notes: note })
      toast('Note saved', 'success')
    } catch { toast('Failed', 'error') }
    finally { setSavingNote(false) }
  }

  const tabs = [
    { id: 'ingredients',  label: 'Ingredients',  show: true },
    { id: 'instructions', label: 'Instructions', show: true },
    { id: 'nutrition',    label: 'Nutrition',    show: true },
  ]

  const handleAddToPlan = async () => {
    setAddingToPlan(true)
    try {
      await setMealPlanEntry({ day_of_week: pickerDay, meal_slot: pickerSlot, recipe_id: recipe.id })
      toast(`Added to ${pickerDay} ${pickerSlot}! 🗓️`, 'success')
      setShowMealPlanPicker(false)
    } catch { toast('Failed to add to plan', 'error') }
    finally { setAddingToPlan(false) }
  }

  const handleAddToShop = async () => {
    setAddingToShop(true)
    try {
      const res = await addRecipeToShopping(recipe.id)
      toast(`${res.added} ingredients added to shopping list! 🛒`, 'success')
    } catch (e) {
      toast(e?.response?.data?.detail || 'Failed to add to shopping list', 'error')
    }
    finally { setAddingToShop(false) }
  }

  const handleShare = async () => {
    const shareData = { title: recipe.title, text: `Check out this recipe: ${recipe.title}`, url: recipe.url }
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(recipe.url)
        toast('Recipe link copied to clipboard!', 'success')
      }
    } catch { toast('Link copied!', 'info') }
  }

  if (cookingMode) {
    return <CookingMode recipe={recipe} onClose={() => setCookingMode(false)} />
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560, padding: 0, overflow: 'hidden', borderRadius: 24 }}>

        {/* Hero image */}
        <div style={{ position: 'relative', height: 200, background: 'var(--cream-2)', flexShrink: 0 }}>
          {recipe.thumbnail
            ? <img src={imageProxyUrl(recipe.thumbnail)} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
            : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>🍽️</div>
          }
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 50%)' }} />
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(0,0,0,.4)', border: 'none', color: '#fff', fontSize: 16,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
          <button onClick={async () => {
            const newUrl = prompt('Paste a food image URL:')
            if (newUrl?.trim()) {
              await updateRecipe(recipe.id, { thumbnail: newUrl.trim() })
              onUpdated({ ...recipe, thumbnail: newUrl.trim() })
            }
          }} style={{
            position: 'absolute', bottom: 10, right: 10,
            background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none',
            borderRadius: 8, fontSize: 11, padding: '5px 10px', cursor: 'pointer',
          }}>✎ Change photo</button>
          {recipe.cooked && (
            <div style={{ position: 'absolute', top: 12, left: 12 }}>
              <span className="badge badge-green">✓ Cooked</span>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div style={{ padding: '18px 20px 24px', overflowY: 'auto', maxHeight: 'calc(92vh - 200px)' }}>
          {/* Title + meta */}
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 20, lineHeight: 1.3, marginBottom: 8 }}>
            {recipe.title}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {recipe.category_name && <span className="tag" style={{ fontSize: 11 }}>{recipe.category_name}</span>}
            <a href={recipe.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Open source ↗
            </a>
          </div>

          {/* ── ReciMe-style quick action buttons ── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[
              { icon: '🗓️', label: 'Meal Plan',  onClick: () => setShowMealPlanPicker(p => !p), active: showMealPlanPicker },
              { icon: '🛒', label: 'Groceries',  onClick: handleAddToShop, loading: addingToShop },
              { icon: '🔗', label: 'Share',      onClick: handleShare },
              { icon: hasInstructions ? '👨‍🍳' : '✦', label: hasInstructions ? 'Cook' : 'Re-extract',
                onClick: hasInstructions ? () => setCookingMode(true) : handleReExtract, loading: reExtracting },
            ].map(({ icon, label, onClick, active, loading }) => (
              <button key={label} onClick={onClick} disabled={loading} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '12px 6px', borderRadius: 14,
                border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                background: active ? 'var(--primary-bg)' : 'var(--cream)',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--cream-2)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'var(--cream)' }}>
                <span style={{ fontSize: 20 }}>
                  {loading ? <span className="spinner" style={{ width: 18, height: 18, display: 'inline-block' }} /> : icon}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: active ? 'var(--primary)' : 'var(--ink-2)' }}>{label}</span>
              </button>
            ))}
          </div>

          {/* ── Inline Meal Plan Picker ── */}
          {showMealPlanPicker && (
            <div style={{ background: 'var(--cream)', borderRadius: 16, padding: '14px 16px', marginBottom: 16, border: '1.5px solid var(--primary-light)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Choose Day</p>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
                {DAYS.map((day, i) => (
                  <button key={day} onClick={() => setPickerDay(day)} style={{
                    padding: '4px 10px', borderRadius: 99, border: `1.5px solid ${pickerDay === day ? 'var(--primary)' : 'var(--border)'}`,
                    background: pickerDay === day ? 'var(--primary)' : 'var(--white)',
                    color: pickerDay === day ? '#fff' : 'var(--ink-2)',
                    fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{DAY_SHORT[i]}</button>
                ))}
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Choose Meal</p>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
                {SLOTS.map(slot => (
                  <button key={slot} onClick={() => setPickerSlot(slot)} style={{
                    padding: '4px 12px', borderRadius: 99, border: `1.5px solid ${pickerSlot === slot ? 'var(--primary)' : 'var(--border)'}`,
                    background: pickerSlot === slot ? 'var(--primary)' : 'var(--white)',
                    color: pickerSlot === slot ? '#fff' : 'var(--ink-2)',
                    fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{SLOT_EMOJI[slot]} {slot}</button>
                ))}
              </div>
              <button onClick={handleAddToPlan} disabled={addingToPlan} className="btn btn-primary btn-sm" style={{ width: '100%', borderRadius: 12 }}>
                {addingToPlan ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Adding…</> : `Add to ${pickerDay} ${pickerSlot} →`}
              </button>
            </div>
          )}

          {/* ── Primary actions ── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button onClick={toggleCooked} className={`btn btn-sm ${recipe.cooked ? 'btn-sage' : 'btn-secondary'}`} style={{ borderRadius: 10, flex: 1 }}>
              {recipe.cooked ? '✓ Cooked' : 'Mark as Cooked'}
            </button>
            <a href={recipe.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ borderRadius: 10, flex: 1 }}>
              Open Source ↗
            </a>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1.5px solid var(--border)', marginBottom: 18 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                flex: 1, padding: '9px 4px', border: 'none', background: 'transparent',
                fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                color: activeTab === t.id ? 'var(--primary)' : 'var(--ink-3)',
                borderBottom: `2px solid ${activeTab === t.id ? 'var(--primary)' : 'transparent'}`,
                marginBottom: -1.5, transition: 'all .15s', textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>{t.label}</button>
            ))}
          </div>

          {/* Tab: Ingredients */}
          {activeTab === 'ingredients' && (
            <div>
              {!hasIngredients ? (
                <p style={{ color: 'var(--ink-3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No ingredients extracted yet</p>
              ) : (
                Object.entries(ingredients).map(([group, items]) => (
                  <div key={group} style={{ marginBottom: 20 }}>
                    {Object.keys(ingredients).length > 1 && (
                      <p className="section-label" style={{ marginBottom: 10 }}>{group}</p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(Array.isArray(items) ? items : []).map((ing, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--cream)', borderRadius: 10, border: '1px solid var(--border)' }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--cream-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>🥄</div>
                          <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{ing}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab: Instructions */}
          {activeTab === 'instructions' && (
            <div>
              {!hasInstructions ? (
                <p style={{ color: 'var(--ink-3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No instructions extracted yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {instructions.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)',
                        color: '#fff', fontWeight: 700, fontSize: 13,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                      }}>{i + 1}</div>
                      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink)', flex: 1 }}>{step}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Nutrition */}
          {activeTab === 'nutrition' && (
            <div>
              {!hasNutrition ? (
                <p style={{ color: 'var(--ink-3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No nutrition data extracted yet</p>
              ) : (
                <div>
                  <p className="section-label" style={{ marginBottom: 14 }}>Per 1 serving</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                    <NutritionRing calories={nutrition.calories || 0} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1 }}>
                      {[
                        { label: 'Protein', value: nutrition.protein, unit: 'g', color: '#E84C8B' },
                        { label: 'Carbs',   value: nutrition.carbs,   unit: 'g', color: '#F4B942' },
                        { label: 'Fat',     value: nutrition.fat,     unit: 'g', color: '#5C7A5A' },
                        { label: 'Calories',value: nutrition.calories,unit: 'kcal', color: 'var(--primary)' },
                      ].map(n => (
                        <div key={n.label} style={{ background: 'var(--cream)', borderRadius: 12, padding: '10px 14px', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{n.label}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: n.color }}>{n.value || 0}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', marginLeft: 2 }}>{n.unit}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div style={{ marginTop: 16 }}>
                <p className="section-label" style={{ marginBottom: 8 }}>My Notes</p>
                <textarea
                  placeholder="Add a personal note…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  style={{ minHeight: 80, resize: 'vertical', borderRadius: 12, fontSize: 13.5 }}
                />
                <button className="btn btn-secondary btn-sm" onClick={saveNote} disabled={savingNote} style={{ marginTop: 8, borderRadius: 10 }}>
                  {savingNote ? <span className="spinner" /> : 'Save Note'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Extraction Loader ────────────────────────────────────────────────────────

const EXTRACT_STEPS = [
  { icon: '🔗', text: 'Fetching the recipe link…' },
  { icon: '🍳', text: 'Reading the ingredients…' },
  { icon: '📋', text: 'Extracting cooking steps…' },
  { icon: '🔥', text: 'Calculating nutrition…' },
  { icon: '✨', text: 'Almost ready…' },
]

function ExtractionLoader() {
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Progress bar fills over ~10s
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 1, 92))
    }, 100)

    // Rotate messages every 2s
    const stepInterval = setInterval(() => {
      setStep(s => (s + 1) % EXTRACT_STEPS.length)
    }, 2000)

    return () => { clearInterval(progressInterval); clearInterval(stepInterval) }
  }, [])

  const current = EXTRACT_STEPS[step]

  return (
    <div style={{
      borderRadius: 16,
      background: 'linear-gradient(135deg, #fff8f5 0%, #fff4ee 100%)',
      border: '1.5px solid #ffe0d0',
      padding: '20px 18px',
      textAlign: 'center',
    }}>
      {/* Animated icon */}
      <div style={{
        fontSize: 36,
        marginBottom: 10,
        display: 'inline-block',
        animation: 'extractBounce 0.6s ease',
      }}>
        {current.icon}
      </div>

      {/* Rotating message */}
      <p style={{
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--ink)',
        marginBottom: 4,
        minHeight: 22,
        transition: 'opacity 0.3s',
      }}>
        {current.text}
      </p>
      <p style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 14 }}>
        Powered by AI — usually takes 8–12 seconds
      </p>

      {/* Progress bar */}
      <div style={{ background: '#f0e8e0', borderRadius: 99, height: 6, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          borderRadius: 99,
          background: 'linear-gradient(90deg, var(--primary), #f97316)',
          transition: 'width 0.1s linear',
        }} />
      </div>

      {/* Step dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
        {EXTRACT_STEPS.map((s, i) => (
          <div key={i} style={{
            width: i === step ? 18 : 6,
            height: 6,
            borderRadius: 99,
            background: i === step ? 'var(--primary)' : '#e0d4cc',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>

      <style>{`
        @keyframes extractBounce {
          0%   { transform: scale(0.7) rotate(-10deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  )
}

// ─── Add Recipe Modal ─────────────────────────────────────────────────────────
const SOCIAL_DOMAINS = ['instagram.com', 'tiktok.com', 'facebook.com', 'fb.com', 'fb.watch']
const isSocialUrl = (u) => SOCIAL_DOMAINS.some(d => u.includes(d))

function AddRecipeModal({ categories, onClose, onAdded }) {
  const toast = useToast()
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [title, setTitle] = useState('')
  const [thumbnail, setThumbnail] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [extracted, setExtracted] = useState(null)
  const [needsTitle, setNeedsTitle] = useState(false)
  const [activeSection, setActiveSection] = useState(null) // 'ingredients' | 'steps' | 'nutrition'
  const [newCatInput, setNewCatInput] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [localCategories, setLocalCategories] = useState(categories || [])

  // Self-fetch categories if none were passed (e.g. modal opened before library finished loading)
  useEffect(() => {
    if (!categories?.length) {
      getCategories().then(cats => setLocalCategories(cats)).catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isJunkTitle = (t) => {
    if (!t || t.trim() === '') return true
    const junkPatterns = ['utm_', 'igsh=', 'fbclid=', '?', '&amp;', 'http', '=']
    if (junkPatterns.some(p => t.includes(p))) return true
    if (t.length > 120) return true
    const generic = ['unknown recipe', 'instagram recipe', 'tiktok recipe', 'facebook recipe',
                     'youtube recipe', 'recipe', 'untitled', 'unknown', 'no title']
    if (generic.includes(t.trim().toLowerCase())) return true
    return false
  }

  const handleExtract = async () => {
    if (!url.trim()) return
    setExtracting(true)
    setNeedsTitle(false)
    try {
      const data = await extractRecipe(url.trim(), caption.trim())
      // Only use thumbnail for non-social URLs (social thumbnails show the creator's face)
      if (data.thumbnail && !isSocialUrl(url.trim())) setThumbnail(data.thumbnail)
      // Pre-fill title if AI found a clean one, but keep it editable
      if (data.title && !isJunkTitle(data.title) && !title.trim()) setTitle(data.title)
      setExtracted(data)
      setActiveSection(null)
      toast('Done! Review and save.', 'success')
    } catch {
      toast('Could not extract details', 'error')
    } finally {
      setExtracting(false)
    }
  }

  const handleSave = async () => {
    if (!url.trim() || !title.trim()) { toast('URL and title required', 'error'); return }
    setSaving(true)
    try {
      // Send null for empty collections so backend re-extracts instead of storing empty data
      const hasIngredients = extracted?.ingredients && Object.keys(extracted.ingredients).length > 0
      const hasInstructions = Array.isArray(extracted?.instructions) && extracted.instructions.length > 0
      const hasNutrition = extracted?.nutrition?.calories

      const recipe = await createRecipe({
        url: url.trim(), title: title.trim(),
        thumbnail: thumbnail || null,
        category_id: categoryId ? +categoryId : null,
        ingredients:  hasIngredients  ? extracted.ingredients  : null,
        instructions: hasInstructions ? extracted.instructions : null,
        nutrition:    hasNutrition    ? extracted.nutrition    : null,
      })
      toast('Recipe saved!', 'success')
      onAdded(recipe); onClose()
    } catch {
      toast('Failed to save', 'error')
    } finally { setSaving(false) }
  }

  const ingCount = extracted?.ingredients
    ? Object.values(extracted.ingredients).flat().length : 0
  const stepCount = extracted?.instructions?.length || 0

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <span className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 20 }}>Add Recipe</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ fontSize: 18, color: 'var(--ink-3)' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* URL + extract */}
          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 7 }}>Recipe Link</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Paste any link — Instagram, YouTube, TikTok…" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleExtract()} />
              <button className="btn btn-primary" onClick={handleExtract} disabled={extracting || !url.trim()} style={{ flexShrink: 0, borderRadius: 12, minWidth: 90 }}>
                {extracting ? '⏳' : '✦ Extract'}
              </button>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 5 }}>AI will auto-extract ingredients, instructions & nutrition</p>
          </div>

          {/* Extraction loader */}
          {extracting && <ExtractionLoader />}


          {/* Preview thumbnail */}
          {!extracting && thumbnail && (
            <div style={{ borderRadius: 14, overflow: 'hidden', height: 150, position: 'relative' }}>
              <img src={imageProxyUrl(thumbnail)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.parentElement.style.display = 'none' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.3),transparent 50%)' }} />
              <button
                onClick={() => {
                  const newUrl = prompt('Paste a new image URL:', thumbnail)
                  if (newUrl && newUrl.trim()) setThumbnail(newUrl.trim())
                }}
                style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}
              >✎ Change photo</button>
            </div>
          )}
          {!extracting && !thumbnail && (
            <button
              onClick={() => {
                const newUrl = prompt('Paste an image URL:')
                if (newUrl && newUrl.trim()) setThumbnail(newUrl.trim())
              }}
              style={{ background: 'var(--cream-2)', border: '1.5px dashed var(--border)', borderRadius: 14, height: 60, width: '100%', color: 'var(--ink-3)', fontSize: 13, cursor: 'pointer' }}
            >+ Add photo (optional)</button>
          )}


          {/* No data extracted — prompt to fill manually */}
          {!extracting && extracted && ingCount === 0 && stepCount === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--cream-2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '10px 14px' }}>
              <span style={{ fontSize: 18 }}>✏️</span>
              <p style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>
                AI couldn't extract ingredients & steps automatically. Enter the title and save — you can add details later.
              </p>
            </div>
          )}

          {/* Extracted preview — each badge independently toggles its section */}
          {!extracting && !!(extracted && (ingCount > 0 || stepCount > 0)) && (
            <div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ingCount > 0 && (
                  <span className="badge badge-green" style={{ cursor: 'pointer', opacity: activeSection && activeSection !== 'ingredients' ? 0.5 : 1 }}
                    onClick={() => setActiveSection(s => s === 'ingredients' ? null : 'ingredients')}>
                    🥄 {ingCount} ingredients {activeSection === 'ingredients' ? '▲' : '▼'}
                  </span>
                )}
                {stepCount > 0 && (
                  <span className="badge badge-gold" style={{ cursor: 'pointer', opacity: activeSection && activeSection !== 'steps' ? 0.5 : 1 }}
                    onClick={() => setActiveSection(s => s === 'steps' ? null : 'steps')}>
                    📋 {stepCount} steps {activeSection === 'steps' ? '▲' : '▼'}
                  </span>
                )}
                {extracted.nutrition?.calories > 0 ? (
                  <span className="badge badge-red" style={{ cursor: 'pointer', opacity: activeSection && activeSection !== 'nutrition' ? 0.5 : 1 }}
                    onClick={() => setActiveSection(s => s === 'nutrition' ? null : 'nutrition')}>
                    🔥 {extracted.nutrition.calories} kcal {activeSection === 'nutrition' ? '▲' : '▼'}
                  </span>
                ) : (
                  <span className="badge" style={{ background: 'var(--cream-2)', color: 'var(--ink-3)' }}>nutrition estimated</span>
                )}
              </div>

              {activeSection === 'ingredients' && ingCount > 0 && (
                <div style={{ marginTop: 8, background: 'var(--cream)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--border)', maxHeight: 220, overflowY: 'auto' }}>
                  {Object.entries(extracted.ingredients).map(([group, items]) => (
                    <div key={group} style={{ marginBottom: 6 }}>
                      {Object.keys(extracted.ingredients).length > 1 && <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginBottom: 3 }}>{group}</p>}
                      {(Array.isArray(items) ? items : []).map((ing, i) => (
                        <p key={i} style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.6 }}>• {ing}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {activeSection === 'steps' && stepCount > 0 && (
                <div style={{ marginTop: 8, background: 'var(--cream)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--border)', maxHeight: 220, overflowY: 'auto' }}>
                  {extracted.instructions.map((step, i) => (
                    <p key={i} style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 6 }}><strong>{i + 1}.</strong> {step}</p>
                  ))}
                </div>
              )}

              {activeSection === 'nutrition' && extracted.nutrition?.calories > 0 && (
                <div style={{ marginTop: 8, background: 'var(--cream)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[
                      { label: 'Calories', value: extracted.nutrition.calories, unit: 'kcal', color: 'var(--primary)' },
                      { label: 'Protein',  value: extracted.nutrition.protein,  unit: 'g',    color: '#E84C8B' },
                      { label: 'Carbs',    value: extracted.nutrition.carbs,    unit: 'g',    color: '#F4B942' },
                      { label: 'Fat',      value: extracted.nutrition.fat,      unit: 'g',    color: '#5C7A5A' },
                    ].map(n => (
                      <div key={n.label} style={{ background: '#fff', borderRadius: 8, padding: '6px 10px', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 1 }}>{n.label}</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: n.color }}>{n.value}{n.unit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 7 }}>Title</label>
            <input
              placeholder="e.g. Butter Chicken, Paneer Pulao…"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="section-label" style={{ display: 'block', marginBottom: 7 }}>Category</label>
            {addingCat ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="e.g. Biryani, Snacks, Desserts…"
                  value={newCatInput}
                  onChange={e => setNewCatInput(e.target.value)}
                  autoFocus
                  onKeyDown={async e => {
                    if (e.key === 'Enter' && newCatInput.trim()) {
                      try {
                        const cat = await createCategory(newCatInput.trim())
                        setLocalCategories(p => [...p, cat])
                        setCategoryId(String(cat.id))
                        setNewCatInput(''); setAddingCat(false)
                        toast('Category added!', 'success')
                      } catch { toast('Already exists', 'error') }
                    } else if (e.key === 'Escape') { setAddingCat(false); setNewCatInput('') }
                  }}
                />
                <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={async () => {
                  if (!newCatInput.trim()) return
                  try {
                    const cat = await createCategory(newCatInput.trim())
                    setLocalCategories(p => [...p, cat])
                    setCategoryId(String(cat.id))
                    setNewCatInput(''); setAddingCat(false)
                    toast('Category added!', 'success')
                  } catch { toast('Already exists', 'error') }
                }}>Add</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setAddingCat(false); setNewCatInput('') }}>✕</button>
              </div>
            ) : (
              <button
                className="btn btn-secondary"
                style={{ width: '100%', borderRadius: 12, justifyContent: 'center' }}
                onClick={() => setAddingCat(true)}
              >
                {categoryId
                  ? `✓ ${localCategories.find(c => String(c.id) === categoryId)?.name || 'Category selected'}`
                  : '+ Add Category'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1, borderRadius: 12 }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !url.trim() || !title.trim()} style={{ flex: 2, borderRadius: 12 }}>
              {saving ? <><span className="spinner" /> Saving…</> : 'Save Recipe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Recipe Card (grid view) ──────────────────────────────────────────────────
function RecipeCard({ recipe, categories, onDelete, onUpdated, viewMode = 'grid' }) {
  const toast = useToast()
  const [showDetail, setShowDetail] = useState(false)
  const [categorizing, setCategorizing] = useState(false)

  const ingCount = recipe.ingredients
    ? Object.values(recipe.ingredients).flat().length : 0

  const handleCategorize = async (e) => {
    e.stopPropagation()
    setCategorizing(true)
    try {
      const res = await aiCategorize(recipe.id)
      toast(`AI → ${res.suggested_category}`, 'success')
      if (res.matched_id) onUpdated({ ...recipe, category_id: res.matched_id, category_name: res.suggested_category })
    } catch { toast('AI failed', 'error') }
    finally { setCategorizing(false) }
  }

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!window.confirm(`Delete "${recipe.title}"?`)) return
    try { await deleteRecipe(recipe.id); onDelete(recipe.id); toast('Deleted', 'info') }
    catch { toast('Delete failed', 'error') }
  }

  if (viewMode === 'list') {
    return (
      <>
        <div
          onClick={() => setShowDetail(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px',
            borderRadius: 14, background: 'var(--white)', border: '1.5px solid var(--border)',
            cursor: 'pointer', transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.background = 'var(--cream)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--white)'; }}
        >
          {/* Thumbnail */}
          <div style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'var(--cream-2)' }}>
            {recipe.thumbnail
              ? <img src={imageProxyUrl(recipe.thumbnail)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
              : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🍽️</div>
            }
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{recipe.title}</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {recipe.category_name && <span className="tag" style={{ fontSize: 10 }}>{recipe.category_name}</span>}
              {ingCount > 0 && <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>🥄 {ingCount}</span>}
              {recipe.nutrition?.calories && <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>🔥 {recipe.nutrition.calories} kcal</span>}
              {recipe.cooked && <span style={{ fontSize: 11, color: '#2E9E5B', fontWeight: 600 }}>✓ Cooked</span>}
            </div>
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button className="btn btn-secondary btn-sm btn-icon" onClick={handleCategorize} disabled={categorizing} title="AI Categorize" style={{ borderRadius: 9 }}>
              {categorizing ? <span className="spinner" style={{ width: 13, height: 13 }} /> : '✦'}
            </button>
            <button className="btn btn-danger btn-sm btn-icon" onClick={handleDelete} style={{ borderRadius: 9 }}>✕</button>
          </div>
        </div>
        {showDetail && (
          <RecipeDetailModal recipe={recipe} onClose={() => setShowDetail(false)}
            onUpdated={u => { onUpdated(u); setShowDetail(false) }} />
        )}
      </>
    )
  }

  // Grid view
  return (
    <>
      <div className="card card-hover" style={{ borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer' }} onClick={() => setShowDetail(true)}>
        {/* Thumbnail */}
        <div style={{ position: 'relative', height: 140, background: 'var(--cream-2)', flexShrink: 0, overflow: 'hidden' }}>
          {recipe.thumbnail
            ? <img src={imageProxyUrl(recipe.thumbnail)} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
            : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🍽️</div>
          }
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.4),transparent 50%)' }} />
          {recipe.cooked && (
            <div style={{ position: 'absolute', top: 8, left: 8 }}>
              <span style={{ background: '#2E9E5B', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>✓ Cooked</span>
            </div>
          )}
          {recipe.category_name && (
            <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
              <span className="tag" style={{ fontSize: 10, background: 'rgba(255,255,255,.85)', color: 'var(--primary)', border: 'none' }}>{recipe.category_name}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h3 style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.35, color: 'var(--ink)', flex: 1,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
          }}>{recipe.title}</h3>

          {/* Meta pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ingCount > 0 && (
              <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>🥄 {ingCount}</span>
            )}
            {recipe.nutrition?.calories && (
              <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>🔥 {recipe.nutrition.calories}</span>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 5, marginTop: 'auto' }} onClick={e => e.stopPropagation()}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1, borderRadius: 9, fontSize: 12 }} onClick={() => setShowDetail(true)}>View</button>
            <button className="btn btn-secondary btn-sm btn-icon" onClick={handleCategorize} disabled={categorizing} title="AI Categorize" style={{ borderRadius: 9 }}>
              {categorizing ? <span className="spinner" style={{ width: 13, height: 13 }} /> : '✦'}
            </button>
            <button className="btn btn-danger btn-sm btn-icon" onClick={handleDelete} style={{ borderRadius: 9 }}>✕</button>
          </div>
        </div>
      </div>

      {showDetail && (
        <RecipeDetailModal
          recipe={recipe}
          onClose={() => setShowDetail(false)}
          onUpdated={updated => { onUpdated(updated); setShowDetail(false); }}
        />
      )}
    </>
  )
}

// ─── Grid / List toggle icons ─────────────────────────────────────────────────
function IconGrid() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
}
function IconList() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
}

// ─── Library View ─────────────────────────────────────────────────────────────
export default function LibraryView({ triggerAdd, onTriggerAddDone }) {
  const toast = useToast()
  const [recipes, setRecipes] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [newCat, setNewCat] = useState('')
  const [showCatInput, setShowCatInput] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const searchRef = useRef(null)

  // Handle external trigger (from FAB / HomeView quick action)
  useEffect(() => {
    if (triggerAdd) {
      setShowAdd(true)
      onTriggerAddDone?.()
    }
  }, [triggerAdd, onTriggerAddDone])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, c] = await Promise.all([
        getRecipes({ q: search || undefined, category_id: filterCat || undefined }),
        getCategories(),
      ])
      setRecipes(r); setCategories(c)
    } finally { setLoading(false) }
  }, [search, filterCat])

  useEffect(() => { load() }, [load])

  const addCat = async () => {
    if (!newCat.trim()) return
    try {
      const cat = await createCategory(newCat.trim())
      setCategories(c => [...c, cat]); setNewCat(''); setShowCatInput(false)
      toast('Category created', 'success')
    } catch { toast('Already exists or failed', 'error') }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <p className="section-label" style={{ marginBottom: 4 }}>Recipe Collection</p>
          <h1 className="page-title" style={{ marginBottom: 2 }}>My Library</h1>
          <p style={{ color: 'var(--ink-2)', fontSize: 13, marginTop: 4 }}>
            {loading ? '…' : `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''} saved`}
          </p>
        </div>
        <button className="btn btn-primary desktop-add-btn" onClick={() => setShowAdd(true)}>+ Add Recipe</button>
      </div>

      {/* ── Sticky search + controls ── */}
      <div style={{
        position: 'sticky', top: 60, zIndex: 20,
        background: 'var(--cream)', paddingTop: 12, paddingBottom: 4,
        marginTop: -4,
      }}>
        {/* Search row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={searchRef}
              placeholder="Search recipes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
          {/* Grid / List toggle */}
          <div style={{ display: 'flex', gap: 0, background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
            {[['grid', <IconGrid />], ['list', <IconList />]].map(([mode, icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding: '8px 12px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: viewMode === mode ? 'var(--primary-bg)' : 'transparent',
                color: viewMode === mode ? 'var(--primary)' : 'var(--ink-3)',
                transition: 'all .15s', display: 'flex', alignItems: 'center',
              }}>{icon}</button>
            ))}
          </div>
        </div>

        {/* Category tiles */}
        <div className="hide-scrollbar" style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
          {/* All tile */}
          {[{ id: '', name: 'All', emoji: '🍽️' }, ...categories.map(c => ({ id: String(c.id), name: c.name, emoji: getCategoryEmoji(c.name) }))].map((cat) => {
            const a = String(filterCat) === cat.id
            return (
              <button key={cat.id} onClick={() => setFilterCat(cat.id)} style={{
                flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '10px 14px', borderRadius: 16, border: `1.5px solid ${a ? 'var(--primary)' : 'var(--border)'}`,
                background: a ? 'var(--primary-bg)' : 'var(--white)', cursor: 'pointer',
                minWidth: 68, fontFamily: 'inherit', transition: 'all .15s',
              }}>
                <span style={{ fontSize: 22 }}>{cat.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: a ? 700 : 500, color: a ? 'var(--primary)' : 'var(--ink-2)', whiteSpace: 'nowrap' }}>{cat.name}</span>
              </button>
            )
          })}
          {/* Add category tile */}
          {showCatInput ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <input value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCat()} placeholder="Name…" autoFocus style={{ width: 120, padding: '5px 10px', fontSize: 12, borderRadius: 8 }} />
              <button className="btn btn-primary btn-sm" onClick={addCat} disabled={!newCat.trim()} style={{ borderRadius: 8 }}>Add</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCatInput(false)}>✕</button>
            </div>
          ) : (
            <button onClick={() => setShowCatInput(true)} style={{
              flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '10px 14px', borderRadius: 16, border: '1.5px dashed var(--border)',
              background: 'transparent', cursor: 'pointer', minWidth: 68, fontFamily: 'inherit',
            }}>
              <span style={{ fontSize: 22 }}>＋</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>Add</span>
            </button>
          )}
        </div>
        {/* Separator line */}
        <div style={{ height: 1, background: 'linear-gradient(to right, var(--border), transparent)', marginBottom: 4 }} />
      </div>

      {/* Recipe grid / list */}
      {loading ? (
        viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 16, paddingTop: 8 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="card" style={{ borderRadius: 20, overflow: 'hidden' }}>
                <div className="shimmer" style={{ height: 160 }} />
                <div style={{ padding: 14 }}>
                  <div className="shimmer" style={{ height: 13, marginBottom: 8 }} />
                  <div className="shimmer" style={{ height: 11, width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ height: 80, borderRadius: 14, overflow: 'hidden' }}>
                <div className="shimmer" style={{ height: '100%' }} />
              </div>
            ))}
          </div>
        )
      ) : !recipes.length ? (
        <div className="empty">
          <div className="empty-icon">📚</div>
          <h3>{search || filterCat ? 'No recipes found' : 'Your library is empty'}</h3>
          <p>{search || filterCat ? 'Try a different search or filter.' : 'Paste any food link — AI will extract ingredients, steps & nutrition automatically.'}</p>
          {!search && !filterCat && (
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setShowAdd(true)}>+ Add Your First Recipe</button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 16, paddingTop: 8 }}>
          {recipes.map(r => (
            <RecipeCard key={r.id} recipe={r} categories={categories} viewMode="grid"
              onDelete={id => setRecipes(p => p.filter(x => x.id !== id))}
              onUpdated={u => setRecipes(p => p.map(x => x.id === u.id ? u : x))}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 8 }}>
          {recipes.map(r => (
            <RecipeCard key={r.id} recipe={r} categories={categories} viewMode="list"
              onDelete={id => setRecipes(p => p.filter(x => x.id !== id))}
              onUpdated={u => setRecipes(p => p.map(x => x.id === u.id ? u : x))}
            />
          ))}
        </div>
      )}

      {showAdd && <AddRecipeModal categories={categories} onClose={() => setShowAdd(false)} onAdded={r => setRecipes(p => [r, ...p])} />}
    </div>
  )
}
