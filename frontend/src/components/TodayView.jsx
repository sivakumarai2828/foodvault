import { useEffect, useState } from 'react'
import { getTodayMenu } from '../lib/api'

const SLOTS = ['Breakfast', 'Lunch', 'Snacks', 'Dinner']
const SLOT_CFG = {
  Breakfast: { emoji: '🌅', bg: '#FBF5E6', border: '#E8D499', label: '#C49A3C' },
  Lunch:     { emoji: '☀️',  bg: '#EEF4EE', border: '#C0D4BF', label: '#5C7A5A' },
  Snacks:    { emoji: '🍎', bg: '#FDF3EE', border: '#F0C4B0', label: '#D4522A' },
  Dinner:    { emoji: '🌙', bg: '#F4F0FA', border: '#D4C4F0', label: '#7C52B8' },
}

export default function TodayView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { getTodayMenu().then(setData).finally(() => setLoading(false)) }, [])

  const dateStr = data
    ? new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p className="section-label" style={{ marginBottom: 8 }}>Daily View</p>
        <h1 className="page-title">Today's Menu</h1>
        <p style={{ color: 'var(--ink-2)', fontSize: 14, marginTop: 6 }}>{dateStr}</p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="card" style={{ borderRadius: 20, overflow: 'hidden' }}>
              <div className="shimmer" style={{ height: 160 }} />
              <div style={{ padding: 16 }}>
                <div className="shimmer" style={{ height: 14, marginBottom: 8 }} />
                <div className="shimmer" style={{ height: 12, width: '55%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : !data?.meals?.length ? (
        <div className="empty" style={{ paddingTop: 80 }}>
          <div className="empty-icon">🍽️</div>
          <h3>Nothing planned for today</h3>
          <p>Head over to the Meal Planner to add meals for today.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
          {SLOTS.map(slot => {
            const meal = data.meals.find(m => m.meal_slot === slot)
            const cfg = SLOT_CFG[slot]
            return (
              <div key={slot} className="card card-hover" style={{ borderRadius: 20, overflow: 'hidden', background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
                {/* Slot header */}
                <div style={{ padding: '11px 16px', borderBottom: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: cfg.label, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{slot}</span>
                </div>

                {meal?.recipe ? (
                  <div>
                    {meal.recipe.thumbnail && (
                      <div style={{ height: 155, overflow: 'hidden', position: 'relative' }}>
                        <img src={meal.recipe.thumbnail} alt={meal.recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.parentElement.style.display = 'none' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.45) 0%,transparent 55%)' }} />
                      </div>
                    )}
                    <div style={{ padding: '13px 15px 15px' }}>
                      <p style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.35, marginBottom: 10, color: 'var(--ink)' }}>{meal.recipe.title}</p>
                      {meal.recipe.category_name && <span className="tag" style={{ marginBottom: 12, display: 'inline-flex', fontSize: 10 }}>{meal.recipe.category_name}</span>}
                      <a href={meal.recipe.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 4, borderRadius: 10 }}>Open Recipe →</a>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Not planned</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
