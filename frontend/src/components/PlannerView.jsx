import { useEffect, useState, useCallback } from 'react'
import { getMealPlan, getRecipes, setMealPlanEntry, deleteMealPlanEntry, aiSuggestPlan } from '../lib/api'
import { imageProxyUrl } from '../lib/api'
import { useToast } from '../App'

const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const DAY_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const SLOTS = ['Breakfast','Lunch','Snacks','Dinner']
const SLOT_CFG = {
  Breakfast: { emoji: '🌅', color: '#C49A3C', bg: '#FBF5E6' },
  Lunch:     { emoji: '☀️',  color: '#5C7A5A', bg: '#EEF4EE' },
  Snacks:    { emoji: '🍎', color: '#D4522A', bg: '#FDF3EE' },
  Dinner:    { emoji: '🌙', color: '#7C52B8', bg: '#F4F0FA' },
}

/* ── Get current week's Mon–Sun dates ──────────────────────────────────────── */
function getWeekDates() {
  const today = new Date()
  const dow = today.getDay() // 0=Sun
  const offset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + offset)
  return DAYS.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

/* ── Recipe Picker Modal ─────────────────────────────────────────────────────── */
function RecipePicker({ recipes, onPick, onClose }) {
  const [q, setQ] = useState('')
  const filtered = recipes.filter(r => r.title.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <span className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 20 }}>Pick a Recipe</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>
        <input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 12 }} autoFocus />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto' }}>
          {!filtered.length && <p style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 28, fontSize: 13 }}>No recipes found</p>}
          {filtered.map(r => (
            <button key={r.id} onClick={() => onPick(r)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
              borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--cream)',
              cursor: 'pointer', textAlign: 'left', transition: 'all .15s', color: 'var(--ink)',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-bg)'; e.currentTarget.style.borderColor = 'var(--primary-light)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
              {r.thumbnail
                ? <img src={imageProxyUrl(r.thumbnail)} alt="" style={{ width: 44, height: 44, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none' }} />
                : <div style={{ width: 44, height: 44, borderRadius: 9, background: 'var(--cream-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🍽️</div>
              }
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                {r.category_name && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{r.category_name}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Calendar Cell ───────────────────────────────────────────────────────────── */
function CalendarCell({ entry, onOpen, onRemove, isToday }) {
  const [hov, setHov] = useState(false)
  const recipe = entry?.recipe

  if (!recipe) {
    return (
      <div
        onClick={onOpen}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          height: '100%', minHeight: 90, borderRadius: 10,
          border: `1.5px dashed ${hov ? 'var(--primary)' : isToday ? 'var(--primary-light)' : 'var(--border-2)'}`,
          background: hov ? 'var(--primary-bg)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all .15s',
        }}
      >
        <span style={{ fontSize: 20, color: hov ? 'var(--primary)' : 'var(--border-2)', fontWeight: 300 }}>+</span>
      </div>
    )
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        height: '100%', minHeight: 90, borderRadius: 10, overflow: 'hidden', position: 'relative',
        border: `1.5px solid ${hov ? 'var(--border-2)' : 'var(--border)'}`,
        background: 'var(--white)',
        boxShadow: hov ? 'var(--shadow-sm)' : 'none',
        transition: 'all .15s', cursor: 'pointer',
      }}
    >
      {/* Thumbnail */}
      {recipe.thumbnail ? (
        <img
          src={imageProxyUrl(recipe.thumbnail)} alt=""
          style={{ width: '100%', height: 58, objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.style.display = 'none' }}
        />
      ) : (
        <div style={{ height: 58, background: 'var(--cream-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🍽️</div>
      )}
      {/* Title */}
      <div style={{ padding: '5px 7px 6px' }}>
        <p style={{
          fontSize: 11, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{recipe.title}</p>
      </div>

      {/* Hover action overlay */}
      {hov && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(28,22,16,.72)',
          display: 'flex', flexDirection: 'column', gap: 5,
          alignItems: 'center', justifyContent: 'center', padding: 8,
        }}>
          <button
            onClick={e => { e.stopPropagation(); onOpen() }}
            style={{
              width: '100%', padding: '6px 0', borderRadius: 8, border: 'none',
              background: 'var(--primary)', color: '#fff', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >Change</button>
          <button
            onClick={e => { e.stopPropagation(); onRemove(entry.id) }}
            style={{
              width: '100%', padding: '5px 0', borderRadius: 8, border: '1.5px solid rgba(255,255,255,.2)',
              background: 'transparent', color: '#fff', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >Remove</button>
        </div>
      )}
    </div>
  )
}

/* ── Main PlannerView ────────────────────────────────────────────────────────── */
export default function PlannerView() {
  const toast = useToast()
  const [plan, setPlan]         = useState({})
  const [recipes, setRecipes]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [suggesting, setSuggesting] = useState(false)
  const [picker, setPicker]     = useState(null) // { day, slot }
  const weekDates = getWeekDates()
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [entries, recs] = await Promise.all([getMealPlan(), getRecipes()])
      setRecipes(recs)
      const map = {}
      for (const e of entries) {
        if (!map[e.day_of_week]) map[e.day_of_week] = {}
        map[e.day_of_week][e.meal_slot] = e
      }
      setPlan(map)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handlePick = async (recipe) => {
    const { day, slot } = picker
    setPicker(null)
    try {
      const entry = await setMealPlanEntry({ day_of_week: day, meal_slot: slot, recipe_id: recipe.id })
      setPlan(p => ({ ...p, [day]: { ...(p[day] || {}), [slot]: { ...entry, recipe } } }))
      toast('Added to plan!', 'success')
    } catch { toast('Failed', 'error') }
  }

  const handleRemove = async (day, slot, id) => {
    try {
      await deleteMealPlanEntry(id)
      setPlan(p => { const n = { ...p, [day]: { ...p[day] } }; delete n[day][slot]; return n })
      toast('Removed', 'info')
    } catch { toast('Failed', 'error') }
  }

  const handleAI = async () => {
    if (!recipes.length) { toast('Add some recipes first!', 'error'); return }
    setSuggesting(true)
    try { await aiSuggestPlan(); await load(); toast('AI meal plan ready! 🎉', 'success') }
    catch (e) { toast(e?.response?.data?.detail || 'AI failed', 'error') }
    finally { setSuggesting(false) }
  }

  // Count planned meals
  const plannedCount = DAYS.reduce((acc, day) =>
    acc + SLOTS.filter(slot => plan[day]?.[slot]?.recipe).length, 0)
  const totalSlots = DAYS.length * SLOTS.length

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="section-label" style={{ marginBottom: 8 }}>Weekly Schedule</p>
          <h1 className="page-title">Meal Planner</h1>
          <p style={{ color: 'var(--ink-2)', fontSize: 13.5, marginTop: 5 }}>
            {loading ? '…' : `${plannedCount} of ${totalSlots} slots planned`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
          {/* Progress pill */}
          {!loading && plannedCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 99, padding: '6px 14px' }}>
              <div style={{ width: 80, height: 6, background: 'var(--cream-3)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(plannedCount / totalSlots * 100)}%`, background: 'var(--sage)', borderRadius: 99, transition: 'width .4s' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sage)' }}>{Math.round(plannedCount / totalSlots * 100)}%</span>
            </div>
          )}
          <button className="btn btn-primary" onClick={handleAI} disabled={suggesting}>
            {suggesting ? <><span className="spinner" /> Planning…</> : '✦ AI Fill Week'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ borderRadius: 20, overflow: 'hidden' }}>
          <div className="shimmer" style={{ height: 420 }} />
        </div>
      ) : (
        /* ── Calendar Grid ── */
        <div style={{ overflowX: 'auto', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--white)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '72px repeat(7, minmax(130px, 1fr))',
            minWidth: 1000,
          }}>

            {/* ── Corner cell ── */}
            <div style={{ borderBottom: '1.5px solid var(--border)', borderRight: '1.5px solid var(--border)', background: 'var(--cream)' }} />

            {/* ── Day header row ── */}
            {DAYS.map((day, i) => {
              const date = weekDates[i]
              const isToday = day === todayName
              const isLast = i === DAYS.length - 1
              return (
                <div key={day} style={{
                  padding: '12px 8px',
                  borderBottom: '1.5px solid var(--border)',
                  borderRight: isLast ? 'none' : '1px solid var(--border)',
                  background: isToday ? 'var(--primary-bg)' : 'var(--cream)',
                  textAlign: 'center',
                }}>
                  <p style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: isToday ? 'var(--primary)' : 'var(--ink-3)', marginBottom: 3,
                  }}>{DAY_SHORT[i]}</p>
                  <p style={{
                    fontSize: 17, fontWeight: 800,
                    color: isToday ? 'var(--primary)' : 'var(--ink)',
                    lineHeight: 1,
                  }}>{date.getDate()}</p>
                  {isToday && (
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)', margin: '4px auto 0' }} />
                  )}
                </div>
              )
            })}

            {/* ── Slot rows ── */}
            {SLOTS.map((slot, si) => {
              const cfg = SLOT_CFG[slot]
              const isLastSlot = si === SLOTS.length - 1
              return [
                /* Slot label cell */
                <div key={slot + '-label'} style={{
                  padding: '10px 6px',
                  borderBottom: isLastSlot ? 'none' : '1px solid var(--border)',
                  borderRight: '1.5px solid var(--border)',
                  background: cfg.bg,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                }}>
                  <span style={{ fontSize: 16 }}>{cfg.emoji}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: cfg.color, writingMode: 'vertical-rl', transform: 'rotate(180deg)', lineHeight: 1,
                  }}>{slot}</span>
                </div>,

                /* Day cells for this slot */
                ...DAYS.map((day, di) => {
                  const isToday = day === todayName
                  const isLastDay = di === DAYS.length - 1
                  const entry = plan[day]?.[slot]
                  return (
                    <div key={day + slot} style={{
                      padding: 6,
                      borderBottom: isLastSlot ? 'none' : '1px solid var(--border)',
                      borderRight: isLastDay ? 'none' : '1px solid var(--border)',
                      background: isToday ? 'rgba(212,82,42,.025)' : 'transparent',
                    }}>
                      <CalendarCell
                        entry={entry}
                        isToday={isToday}
                        onOpen={() => setPicker({ day, slot })}
                        onRemove={(id) => handleRemove(day, slot, id)}
                      />
                    </div>
                  )
                }),
              ]
            })}

          </div>
        </div>
      )}

      {picker && (
        <RecipePicker
          recipes={recipes}
          onPick={handlePick}
          onClose={() => setPicker(null)}
        />
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16, paddingLeft: 2 }}>
        {SLOTS.map(slot => {
          const cfg = SLOT_CFG[slot]
          return (
            <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 13 }}>{cfg.emoji}</span>
              <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500 }}>{slot}</span>
            </div>
          )
        })}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-3)' }}>
          Hover a recipe to change or remove it
        </div>
      </div>
    </div>
  )
}
