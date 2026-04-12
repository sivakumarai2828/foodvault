import { useState, useEffect } from 'react'
import { getTodayMenu, getMealPlan, getRecipes, getShoppingList, aiSuggestPlan } from '../lib/api'
import { imageProxyUrl } from '../lib/api'
import { useToast } from '../App'

const SLOT_CFG = {
  Breakfast: { emoji: '🌅', bg: '#FBF5E6', border: '#E8D499', label: '#C49A3C' },
  Lunch:     { emoji: '☀️',  bg: '#EEF4EE', border: '#C0D4BF', label: '#5C7A5A' },
  Dinner:    { emoji: '🌙', bg: '#F4F0FA', border: '#D4C4F0', label: '#7C52B8' },
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return { greeting: 'Good Morning', emoji: '☀️', sub: "Let's plan something delicious today" }
  if (h < 17) return { greeting: 'Good Afternoon', emoji: '🌤️', sub: 'What are you cooking today?' }
  return { greeting: 'Good Evening', emoji: '🌙', sub: "Let's decide what's for dinner" }
}

// ── Today Meal Slot Card ───────────────────────────────────────────────────────
function TodayMealSlot({ slot, meal, onPlanClick }) {
  const cfg = SLOT_CFG[slot]
  const calories = meal?.recipe?.nutrition?.calories
  return (
    <div style={{
      flexShrink: 0, width: 200, borderRadius: 20, overflow: 'hidden',
      border: `1.5px solid ${cfg.border}`, background: cfg.bg,
      boxShadow: '0 4px 16px rgba(0,0,0,.07)',
    }}>
      {/* Slot label */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${cfg.border}`, display: 'flex', gap: 7, alignItems: 'center' }}>
        <span style={{ fontSize: 14 }}>{cfg.emoji}</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: cfg.label }}>{slot}</span>
        {calories && <span style={{ marginLeft: 'auto', fontSize: 10, color: cfg.label, fontWeight: 600 }}>🔥 {calories}</span>}
      </div>

      {meal?.recipe ? (
        <div>
          {/* Image — dominant top section */}
          <div style={{ height: 130, overflow: 'hidden', background: 'var(--cream-2)', position: 'relative' }}>
            {meal.recipe.thumbnail
              ? <img src={imageProxyUrl(meal.recipe.thumbnail)} alt={meal.recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
              : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🍽️</div>
            }
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.35) 0%, transparent 50%)' }} />
          </div>
          <div style={{ padding: '11px 14px 14px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, marginBottom: 10, color: 'var(--ink)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {meal.recipe.title}
            </p>
            <a href={meal.recipe.url} target="_blank" rel="noopener noreferrer" style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: 'rgba(255,255,255,.7)', border: `1.5px solid ${cfg.border}`,
              color: cfg.label, textDecoration: 'none', transition: 'all .15s',
            }}>
              Start Cooking →
            </a>
          </div>
        </div>
      ) : (
        <div style={{ padding: '28px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 32, opacity: .35 }}>🍽️</div>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>Not planned</p>
          <button className="btn btn-secondary btn-sm" onClick={onPlanClick} style={{ borderRadius: 10, fontSize: 11.5, padding: '6px 16px' }}>
            Plan →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Quick Action Card ──────────────────────────────────────────────────────────
function QuickAction({ icon, label, desc, color, tint, onClick, loading }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      disabled={loading}
      style={{
        background: tint, border: `1.5px solid ${color}22`,
        borderRadius: 20, padding: '18px 14px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
        transition: 'all .15s', fontFamily: 'inherit', width: '100%', textAlign: 'left',
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
        boxShadow: pressed ? 'none' : `0 4px 16px ${color}20`,
        opacity: loading ? 0.7 : 1,
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 15,
        background: `${color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
      }}>
        {loading ? <span className="spinner" style={{ width: 22, height: 22, borderTopColor: color }} /> : icon}
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>{label}</p>
        <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>{desc}</p>
      </div>
    </button>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, color, bg, onClick }) {
  return (
    <div
      onClick={onClick}
      className={onClick ? 'card card-hover' : 'card'}
      style={{ padding: '14px 16px', borderRadius: 18, flex: 1, minWidth: 0, cursor: onClick ? 'pointer' : 'default', background: bg || 'var(--white)' }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || 'var(--ink)', lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <p style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500, lineHeight: 1.3 }}>{label}</p>
    </div>
  )
}

// ── Recent Recipe Strip Card ───────────────────────────────────────────────────
function RecentCard({ recipe, onClick }) {
  const [pressed, setPressed] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        flexShrink: 0, width: 152, borderRadius: 18, overflow: 'hidden',
        background: 'var(--white)', border: '1.5px solid var(--border)',
        boxShadow: '0 4px 14px rgba(0,0,0,.07)',
        cursor: 'pointer',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'all .15s',
      }}
    >
      <div style={{ height: 104, background: 'var(--cream-2)', overflow: 'hidden', position: 'relative' }}>
        {recipe.thumbnail
          ? <img src={imageProxyUrl(recipe.thumbnail)} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
          : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🍽️</div>
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.2), transparent 50%)' }} />
      </div>
      <div style={{ padding: '9px 10px 11px' }}>
        <p style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35, color: 'var(--ink)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 5 }}>
          {recipe.title}
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          {recipe.nutrition?.calories && (
            <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>🔥 {recipe.nutrition.calories}</span>
          )}
          {recipe.cooked && (
            <span style={{ fontSize: 10, color: '#2E9E5B', fontWeight: 600 }}>✓ Cooked</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
function HomeSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <div className="shimmer" style={{ height: 14, width: 180, marginBottom: 10, borderRadius: 8 }} />
        <div className="shimmer" style={{ height: 34, width: 260, marginBottom: 8, borderRadius: 8 }} />
        <div className="shimmer" style={{ height: 16, width: 200, borderRadius: 8 }} />
      </div>
      <div>
        <div className="shimmer" style={{ height: 16, width: 130, marginBottom: 14, borderRadius: 8 }} />
        <div style={{ display: 'flex', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="shimmer" style={{ flexShrink: 0, width: 200, height: 210, borderRadius: 20 }} />)}
        </div>
      </div>
      <div>
        <div className="shimmer" style={{ height: 16, width: 130, marginBottom: 14, borderRadius: 8 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          {[1,2].map(i => <div key={i} className="shimmer" style={{ height: 110, borderRadius: 20 }} />)}
        </div>
      </div>
    </div>
  )
}

// ── Main HomeView ──────────────────────────────────────────────────────────────
export default function HomeView({ onNavigate, onAddRecipe }) {
  const toast = useToast()
  const [todayData, setTodayData]       = useState(null)
  const [planEntries, setPlanEntries]   = useState([])
  const [recipes, setRecipes]           = useState([])
  const [shoppingItems, setShoppingItems] = useState([])
  const [loading, setLoading]           = useState(true)
  const [genPlan, setGenPlan]           = useState(false)

  const { greeting, emoji, sub } = getGreeting()

  useEffect(() => {
    Promise.all([
      getTodayMenu().catch(() => null),
      getMealPlan().catch(() => []),
      getRecipes().catch(() => []),
      getShoppingList().catch(() => []),
    ]).then(([today, plan, recs, shop]) => {
      setTodayData(today)
      setPlanEntries(plan || [])
      setRecipes(recs || [])
      setShoppingItems(shop || [])
    }).finally(() => setLoading(false))
  }, [])

  const handleAIPlan = async () => {
    if (genPlan) return
    setGenPlan(true)
    try {
      await aiSuggestPlan()
      toast('AI meal plan ready! 🎉', 'success')
      onNavigate('planner')
    } catch { toast('AI planning failed', 'error') }
    finally { setGenPlan(false) }
  }

  const todayMeals = {}
  if (todayData?.meals) {
    for (const m of todayData.meals) todayMeals[m.meal_slot] = m
  }

  const plannedCount    = planEntries.filter(e => e.recipe_id).length
  const shoppingChecked = shoppingItems.filter(i => i.checked).length
  const shoppingTotal   = shoppingItems.length
  const recentRecipes   = recipes.slice(0, 12)

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (loading) return <HomeSkeleton />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingTop: 4 }}>

      {/* ── Greeting ─────────────────────────────────────────── */}
      <section>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 6, fontWeight: 500 }}>{dateStr}</p>
        <h1 style={{
          fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700,
          color: 'var(--ink)', lineHeight: 1.15, marginBottom: 6,
        }}>
          {greeting} {emoji}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.5 }}>{sub}</p>
      </section>

      {/* ── Today's Meals ────────────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Today's Meals</h2>
          <button onClick={() => onNavigate('planner')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            Full Planner →
          </button>
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }} className="hide-scrollbar">
          {['Breakfast', 'Lunch', 'Dinner'].map(slot => (
            <TodayMealSlot key={slot} slot={slot} meal={todayMeals[slot]} onPlanClick={() => onNavigate('planner')} />
          ))}
          {!todayData?.meals?.length && (
            <div style={{
              flexShrink: 0, width: 200, borderRadius: 20,
              border: '1.5px dashed var(--primary-light)', background: 'var(--primary-bg)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '28px 16px', gap: 12,
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 15, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 4px 14px rgba(212,82,42,.3)' }}>✦</div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', textAlign: 'center', lineHeight: 1.4 }}>
                Nothing planned yet
              </p>
              <button className="btn btn-primary btn-sm" onClick={handleAIPlan} disabled={genPlan} style={{ borderRadius: 12, fontSize: 12 }}>
                {genPlan ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Planning…</> : '✦ Plan with AI'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          <QuickAction
            icon="➕" label="Add Recipe"
            desc="Save from any link"
            color="#D4522A" tint="#FFF4F0"
            onClick={onAddRecipe}
          />
          <QuickAction
            icon="✦" label="Ask AI"
            desc="Get cooking help"
            color="#7C52B8" tint="#F8F4FF"
            onClick={() => onNavigate('chat')}
          />
        </div>
      </section>

      {/* ── Weekly Snapshot ──────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 16 }}>Weekly Snapshot</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <StatCard
            icon="🗓️" value={plannedCount}
            label="Meals planned" color="var(--primary)"
            onClick={() => onNavigate('planner')}
          />
          <StatCard
            icon="📚" value={recipes.length}
            label="Recipes saved" color="#5C7A5A"
            onClick={() => onNavigate('library')}
          />
          <StatCard
            icon="🛒"
            value={shoppingTotal ? `${shoppingChecked}/${shoppingTotal}` : '—'}
            label={shoppingTotal ? 'Items checked' : 'No shopping list'}
            color="#C49A3C"
            onClick={() => onNavigate('shopping')}
          />
        </div>
      </section>

      {/* ── Recently Added ────────────────────────────────────── */}
      {recentRecipes.length > 0 && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Recently Added</h2>
            <button onClick={() => onNavigate('library')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              View All →
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }} className="hide-scrollbar">
            {recentRecipes.map(r => (
              <RecentCard key={r.id} recipe={r} onClick={() => onNavigate('library')} />
            ))}
          </div>
        </section>
      )}

      <style>{`
        .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
