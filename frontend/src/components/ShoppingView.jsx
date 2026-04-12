import { useEffect, useState } from 'react'
import { getShoppingList, generateShoppingList, toggleShoppingItem, clearShoppingList, getMealPlan } from '../lib/api'
import { useToast } from '../App'

const GROUP_CFG = {
  Vegetables: { emoji: '🥦', color: '#5C7A5A', bg: '#EEF4EE', border: '#C0D4BF' },
  Proteins:   { emoji: '🥩', color: '#B85C2A', bg: '#FDF3EE', border: '#F0C4A8' },
  Dairy:      { emoji: '🧀', color: '#C49A3C', bg: '#FBF5E6', border: '#E8D499' },
  Spices:     { emoji: '🌶️', color: '#B83C3C', bg: '#FDF0F0', border: '#F0C0C0' },
  Grains:     { emoji: '🌾', color: '#7A6A50', bg: '#F8F4EE', border: '#DDD4C4' },
  Others:     { emoji: '🛒', color: '#5C5044', bg: 'var(--cream-2)', border: 'var(--border)' },
}

export default function ShoppingView() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [planRecipes, setPlanRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [shopItems, plan] = await Promise.all([getShoppingList(), getMealPlan().catch(() => [])])
      setItems(shopItems)
      const titles = [...new Set((plan || []).map(e => e.recipe?.title).filter(Boolean))]
      setPlanRecipes(titles)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    try { await generateShoppingList(); await load(); toast('Shopping list ready!', 'success') }
    catch (e) { toast(e?.response?.data?.detail || 'Failed', 'error') }
    finally { setGenerating(false) }
  }

  const handleToggle = async (id) => {
    try { const u = await toggleShoppingItem(id); setItems(p => p.map(x => x.id === id ? u : x)) }
    catch { toast('Failed', 'error') }
  }

  const handleClear = async () => {
    if (!window.confirm('Clear the shopping list?')) return
    try { await clearShoppingList(); setItems([]); toast('Cleared', 'info') }
    catch { toast('Failed', 'error') }
  }

  const groups = items.reduce((acc, item) => { if (!acc[item.group]) acc[item.group] = []; acc[item.group].push(item); return acc }, {})
  const checked = items.filter(i => i.checked).length
  const total = items.length
  const pct = total ? Math.round(checked / total * 100) : 0
  // Items added via "Groceries" button have recipe_title; AI-generated items fall back to meal plan recipes
  const itemRecipes = [...new Set(items.map(i => i.recipe_title).filter(Boolean))]
  const sourceRecipes = itemRecipes.length > 0 ? itemRecipes : planRecipes

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p className="section-label" style={{ marginBottom: 6 }}>This Week</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <h1 className="page-title">Shopping List</h1>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {items.length > 0 && <button className="btn btn-secondary btn-sm" onClick={handleClear} style={{ borderRadius: 10 }}>Clear</button>}
            <button className="btn btn-primary btn-sm" onClick={handleGenerate} disabled={generating} style={{ borderRadius: 10 }}>
              {generating ? <><span className="spinner" style={{ width: 13, height: 13 }} /> </> : '✦ '}Generate
            </button>
          </div>
        </div>
        <p style={{ color: 'var(--ink-2)', fontSize: 13, marginTop: 4 }}>
          {total ? `${checked} of ${total} items checked` : 'Generate from your weekly plan'}
        </p>
      </div>

      {/* Recipe sources banner */}
      {sourceRecipes.length > 0 && items.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap',
          marginBottom: 16, padding: '10px 14px',
          background: 'rgba(212,82,42,.05)', border: '1.5px solid rgba(212,82,42,.15)',
          borderRadius: 14,
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', flexShrink: 0, paddingTop: 2 }}>
            {itemRecipes.length > 0 ? 'From recipe:' : 'This week\'s meals:'}
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {sourceRecipes.map(title => (
              <span key={title} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 600, color: 'var(--primary)',
                background: 'rgba(212,82,42,.1)', border: '1.5px solid rgba(212,82,42,.2)',
                borderRadius: 20, padding: '3px 10px',
              }}>
                📖 {title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Progress card */}
      {total > 0 && (
        <div className="card" style={{ padding: '18px 20px', marginBottom: 24, borderRadius: 18, background: pct === 100 ? '#f0fdf4' : 'var(--white)', border: pct === 100 ? '1.5px solid #bbf7d0' : '1.5px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
                {pct === 100 ? '🎉 All done!' : 'Shopping Progress'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>{checked} of {total} items checked</p>
            </div>
            <span style={{
              fontSize: 20, fontWeight: 800,
              color: pct === 100 ? '#1A6331' : 'var(--primary)',
            }}>{pct}%</span>
          </div>
          <div className="progress-track" style={{ height: 9, borderRadius: 99 }}>
            <div className="progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? 'linear-gradient(90deg,#2E9E5B,#4ade80)' : 'linear-gradient(90deg,var(--primary),#f97316)', transition: 'width .4s cubic-bezier(.4,0,.2,1)' }} />
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="card" style={{ borderRadius: 16, overflow: 'hidden' }}><div className="shimmer" style={{ height: 160 }} /></div>)}
        </div>
      ) : !items.length ? (
        <div className="empty">
          <div className="empty-icon">🛒</div>
          <h3>No shopping list yet</h3>
          <p>Plan your meals for the week, then AI will generate a complete shopping list grouped by category.</p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={handleGenerate} disabled={generating}>
            {generating ? <><span className="spinner" /> Generating…</> : '✦ Generate Shopping List'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Object.entries(groups).map(([group, gItems]) => {
            const cfg = GROUP_CFG[group] || GROUP_CFG.Others
            const done = gItems.filter(i => i.checked).length
            return (
              <div key={group} className="card" style={{ borderRadius: 16, overflow: 'hidden', border: `1.5px solid ${cfg.border}`, background: cfg.bg }}>
                <div style={{ padding: '11px 16px', borderBottom: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{cfg.emoji}</div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: cfg.color, flex: 1 }}>{group}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: done === gItems.length ? '#1A6331' : 'var(--ink-3)' }}>{done}/{gItems.length}</span>
                </div>
                <div style={{ padding: '4px 8px 8px', display: 'flex', flexDirection: 'column' }}>
                  {gItems.map((item, idx) => (
                    <div key={item.id}>
                      <div onClick={() => handleToggle(item.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 8px',
                        borderRadius: 12, cursor: 'pointer', transition: 'all .15s',
                        background: item.checked ? 'rgba(255,255,255,.6)' : 'transparent',
                        minHeight: 44,
                      }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                          border: `2px solid ${item.checked ? '#2E9E5B' : 'var(--border-2)'}`,
                          background: item.checked ? '#2E9E5B' : 'var(--white)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all .2s cubic-bezier(.4,0,.2,1)',
                          transform: item.checked ? 'scale(1.1)' : 'scale(1)',
                          boxShadow: item.checked ? '0 2px 8px rgba(46,158,91,.3)' : 'none',
                        }}>
                          {item.checked && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: 'checkPop .2s ease' }}>
                              <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span style={{
                          fontSize: 14, flex: 1, transition: 'all .2s',
                          textDecoration: item.checked ? 'line-through' : 'none',
                          color: item.checked ? 'var(--ink-3)' : 'var(--ink)',
                          opacity: item.checked ? 0.6 : 1,
                        }}>
                          {item.name}
                        </span>
                      </div>
                      {idx < gItems.length - 1 && (
                        <div style={{ height: 1, background: `${cfg.border}80`, marginLeft: 44 }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes checkPop { 0%{transform:scale(0)} 60%{transform:scale(1.3)} 100%{transform:scale(1)} }
      `}</style>
    </div>
  )
}
