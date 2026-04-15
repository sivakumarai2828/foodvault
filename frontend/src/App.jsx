import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import HomeView     from './components/HomeView'
import LoginView    from './components/LoginView'
import { supabase, signOut } from './lib/supabase'
import TodayView    from './components/TodayView'
import LibraryView  from './components/LibraryView'
import PlannerView  from './components/PlannerView'
import ShoppingView from './components/ShoppingView'
import ChatView     from './components/ChatView'

/* ── Toast ────────────────────────────────────────────────────────────────── */
export const ToastContext = createContext(null)
export const useToast = () => useContext(ToastContext)

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const show = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-container">
        {toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}
      </div>
    </ToastContext.Provider>
  )
}

/* ── Nav config ───────────────────────────────────────────────────────────── */
const NAV = [
  { id: 'home',     label: 'Home',    Icon: IconHome },
  { id: 'library',  label: 'Library', Icon: IconBook },
  { id: 'planner',  label: 'Planner', Icon: IconCalendar },
  { id: 'shopping', label: 'Shop',    Icon: IconCart },
  { id: 'chat',     label: 'AI',      Icon: IconChat },
]

/* ── Icons ────────────────────────────────────────────────────────────────── */
function IconHome({ a }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9 21 9 15 12 15C15 15 15 21 15 21M9 21H15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" stroke="currentColor"/>
  </svg>
}
function IconBook({ a }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.5:2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
}
function IconCalendar({ a }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.5:2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}
function IconCart({ a }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.5:2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
}
function IconChat({ a }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2.5:2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
}
function IconPlus() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}

/* ── Onboarding Intro ─────────────────────────────────────────────────────── */
function OnboardingModal({ onDone }) {
  const steps = [
    { icon: '📱', title: 'Save any recipe', desc: 'Paste a link from Instagram, YouTube, or any food blog. AI pulls out ingredients, steps & nutrition instantly.' },
    { icon: '🗂️', title: 'Browse by category', desc: 'Organise your recipes into categories like Biryani, Curries, Breakfast. Find them in seconds.' },
    { icon: '✦',  title: 'Ask your AI chef', desc: 'Swap ingredients, scale servings, or ask what to cook tonight — your AI assistant is always ready.' },
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div style={{ background: '#fff', borderRadius: '28px 28px 0 0', padding: '32px 24px 28px', maxWidth: 480, width: '100%', boxShadow: '0 -8px 40px rgba(0,0,0,.18)', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px', boxShadow: '0 6px 20px rgba(249,115,22,.35)' }}>🍽️</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: '#1c0f00', marginBottom: 6 }}>Welcome to FoodVault</h2>
          <p style={{ fontSize: 13.5, color: '#78350f', lineHeight: 1.6 }}>Your personal recipe collection, powered by AI.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {steps.map(s => (
            <div key={s.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 16, padding: '12px 14px' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{s.icon}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1c0f00', marginBottom: 2 }}>{s.title}</p>
                <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onDone}
          style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(249,115,22,.4)' }}
        >
          Get Started →
        </button>
      </div>
    </div>
  )
}

/* ── App ──────────────────────────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState('home')
  const [triggerAdd, setTriggerAdd] = useState(false)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showIntro, setShowIntro] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && !localStorage.getItem('fv_intro_seen')) {
        setShowIntro(true)
      }
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const navigate = (newTab) => setTab(newTab)

  const handleAddRecipe = () => {
    setTab('library')
    setTriggerAdd(true)
  }

  const views = {
    home:     <HomeView onNavigate={navigate} onAddRecipe={handleAddRecipe} />,
    today:    <TodayView />,
    library:  <LibraryView triggerAdd={triggerAdd} onTriggerAddDone={() => setTriggerAdd(false)} />,
    planner:  <PlannerView />,
    shopping: <ShoppingView />,
    chat:     <ChatView />,
  }

  if (authLoading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🍽️</div>
        <span className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    </div>
  )

  if (!user) return <ToastProvider><LoginView /></ToastProvider>

  return (
    <ToastProvider>
      {showIntro && <OnboardingModal onDone={() => { localStorage.setItem('fv_intro_seen', '1'); setShowIntro(false) }} />}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--cream)' }}>

        {/* ── Top Header ── */}
        <header style={{
          background: 'rgba(250,248,243,0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 60 }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, background: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, boxShadow: '0 3px 10px rgba(212,82,42,.3)',
              }}>🍽️</div>
              <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 19, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                FoodVault
              </span>
            </div>

            {/* Desktop nav */}
            <nav style={{ display: 'flex', gap: 2, marginLeft: 32, flex: 1 }} className="desktop-nav">
              {NAV.map(({ id, label, Icon }) => {
                const a = tab === id
                return (
                  <button key={id} onClick={() => setTab(id)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 99, border: 'none',
                    cursor: 'pointer', fontFamily: 'Inter,system-ui,sans-serif',
                    fontSize: 13.5, fontWeight: a ? 600 : 500,
                    background: a ? 'var(--primary-bg)' : 'transparent',
                    color: a ? 'var(--primary)' : 'var(--ink-2)',
                    transition: 'all .15s',
                  }}>
                    <Icon a={a} /> {label}
                  </button>
                )
              })}
            </nav>

            {/* Right side — Add button + user avatar */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="btn btn-primary btn-sm desktop-add-btn" onClick={handleAddRecipe} style={{ borderRadius: 12 }}>
                + Add Recipe
              </button>
              {/* User avatar */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowUserMenu(p => !p)}
                  style={{
                    width: 34, height: 34, borderRadius: '50%', border: '2px solid var(--border)',
                    overflow: 'hidden', cursor: 'pointer', background: 'var(--cream-2)', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {user.user_metadata?.avatar_url
                    ? <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
                        {(user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
                      </span>
                  }
                </button>
                {showUserMenu && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: 'var(--white)', border: '1.5px solid var(--border)',
                    borderRadius: 14, padding: 8, minWidth: 200,
                    boxShadow: '0 8px 32px rgba(0,0,0,.12)', zIndex: 200,
                  }} onClick={() => setShowUserMenu(false)}>
                    <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{user.user_metadata?.full_name || 'User'}</p>
                      <p style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{user.email}</p>
                    </div>
                    <button
                      onClick={() => signOut()}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        textAlign: 'left', fontSize: 13, color: '#C0392B', fontFamily: 'inherit',
                        fontWeight: 500,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FDF0F0'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main style={{ flex: 1, maxWidth: 1080, width: '100%', margin: '0 auto', padding: '28px 16px 100px' }}>
          {views[tab]}
        </main>

        {/* ── Floating Action Button (mobile only) ── */}
        {tab !== 'chat' && (
          <button
            onClick={handleAddRecipe}
            className="fab"
            aria-label="Add recipe"
          >
            <IconPlus />
          </button>
        )}

        {/* ── Bottom nav (mobile only) ── */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(250,248,243,0.97)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          paddingBottom: 'env(safe-area-inset-bottom, 6px)',
        }} className="mobile-nav">
          {NAV.map(({ id, label, Icon }) => {
            const a = tab === id
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 3, padding: '9px 4px 5px',
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: a ? 'var(--primary)' : 'var(--ink-3)',
                fontFamily: 'Inter,system-ui,sans-serif', transition: 'color .15s',
                position: 'relative',
              }}>
                {a && <span style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 24, height: 3, borderRadius: 99, background: 'var(--primary)',
                }} />}
                <Icon a={a} />
                <span style={{ fontSize: 10, fontWeight: a ? 700 : 500 }}>{label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <style>{`
        .desktop-nav { display: flex !important; }
        .mobile-nav  { display: flex !important; }
        .desktop-add-btn { display: inline-flex !important; }
        .fab { display: none !important; }
        @media (min-width: 768px) {
          .mobile-nav { display: none !important; }
          .fab { display: none !important; }
          main { padding-bottom: 40px !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
          .desktop-add-btn { display: none !important; }
          .fab { display: flex !important; }
        }
      `}</style>
    </ToastProvider>
  )
}
