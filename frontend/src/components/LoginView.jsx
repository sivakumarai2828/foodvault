import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { signInWithGoogle } from '../lib/supabase'

const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://foodvault-app.web.app'

const FEATURES = [
  { icon: '📱', bg: '#fff7ed', border: '#fed7aa', title: 'Save from anywhere', desc: 'Paste any link — Instagram, YouTube, blogs — and get the full recipe.' },
  { icon: '🗓️', bg: '#f0fdf4', border: '#bbf7d0', title: 'Plan your week',     desc: 'Drop recipes onto a weekly calendar. AI can fill the whole week in one tap.' },
  { icon: '🛒', bg: '#fffbeb', border: '#fde68a', title: 'Auto shopping list',  desc: 'Your meal plan becomes a categorised grocery list automatically.' },
  { icon: '✦',  bg: '#faf5ff', border: '#ddd6fe', title: 'AI cooking assistant', desc: 'Ask anything — substitutions, scaling, what to cook with what you have.' },
]

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function LoginCard({ loading, error, btnHover, setBtnHover, onLogin }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 28,
      border: '1.5px solid rgba(249,115,22,.15)',
      boxShadow: '0 20px 60px rgba(249,115,22,.12), 0 4px 16px rgba(0,0,0,.06)',
      padding: '40px 36px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16,
        background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
        border: '1.5px solid #fed7aa',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, marginBottom: 18,
      }}>👋</div>

      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 21, fontWeight: 700, color: '#1c0f00',
        marginBottom: 6, textAlign: 'center',
      }}>Welcome to FoodVault</h2>

      <p style={{
        fontSize: 13.5, color: '#92400e', textAlign: 'center',
        lineHeight: 1.6, marginBottom: 28, maxWidth: 240,
      }}>
        Sign in to access your recipes and meal plans.
      </p>

      <button
        onClick={onLogin}
        disabled={loading}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => setBtnHover(false)}
        style={{
          width: '100%', padding: '15px 20px', borderRadius: 14,
          border: '1.5px solid #e5e7eb', background: '#fff',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          fontFamily: 'inherit', fontSize: 15, fontWeight: 600, color: '#1c0f00',
          transition: 'all .2s',
          transform: btnHover && !loading ? 'translateY(-2px) scale(1.01)' : 'none',
          boxShadow: btnHover && !loading ? '0 8px 24px rgba(0,0,0,.12)' : '0 2px 8px rgba(0,0,0,.06)',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading
          ? <span className="spinner" style={{ width: 20, height: 20, borderTopColor: '#f97316' }} />
          : <GoogleIcon />
        }
        {loading ? 'Signing in…' : 'Continue with Google'}
      </button>

      {error && <p style={{ marginTop: 12, fontSize: 13, color: '#dc2626', textAlign: 'center' }}>{error}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', margin: '20px 0' }}>
        <div style={{ flex: 1, borderTop: '1px solid #f3f4f6' }} />
        <span style={{ fontSize: 12, color: '#d1d5db', fontWeight: 500 }}>or</span>
        <div style={{ flex: 1, borderTop: '1px solid #f3f4f6' }} />
      </div>

      <button disabled style={{
        width: '100%', padding: '13px 20px', borderRadius: 14,
        border: '1.5px dashed #e5e7eb', background: '#fafafa',
        cursor: 'not-allowed', fontFamily: 'inherit',
        fontSize: 13.5, fontWeight: 500, color: '#9ca3af',
      }}>
        Continue with Email — coming soon
      </button>

      <div style={{
        marginTop: 20, padding: '11px 16px',
        background: '#f0fdf4', borderRadius: 12,
        border: '1px solid #bbf7d0', width: '100%',
      }}>
        <p style={{ fontSize: 12, color: '#16a34a', textAlign: 'center', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
          🔒 Secure sign-in via Google. We never store your password.
        </p>
      </div>
    </div>
  )
}

export default function LoginView() {
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const [btnHover, setBtnHover] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true); setError(null)
    const { error } = await signInWithGoogle()
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ═══════════════════════════════════════════
          DESKTOP  (≥ 769px) — two-column split
      ═══════════════════════════════════════════ */}
      <div className="desktop-login" style={{
        minHeight: '100dvh',
        background: 'linear-gradient(135deg, #fff6f0 0%, #ffe8d6 50%, #fffaf5 100%)',
        display: 'flex', alignItems: 'stretch',
      }}>
        {/* Left */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '60px 52px',
          animation: 'fadeInLeft .6s ease both',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 44 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 15,
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 23, boxShadow: '0 6px 20px rgba(249,115,22,.35)',
            }}>🍽️</div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#1c0f00' }}>FoodVault</span>
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(28px, 3vw, 44px)', fontWeight: 700,
            lineHeight: 1.2, color: '#1c0f00', marginBottom: 16,
          }}>
            Plan meals.<br />Save recipes.<br />
            <span style={{ color: '#f97316' }}>Eat better.</span>
          </h1>

          <p style={{ fontSize: 15.5, color: '#78350f', lineHeight: 1.7, marginBottom: 44, maxWidth: 380 }}>
            Save recipes from anywhere, plan your week, and let AI handle your shopping — all in one beautiful place.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 480 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                background: f.bg, border: `1.5px solid ${f.border}`,
                borderRadius: 16, padding: '14px 16px',
                transition: 'transform .2s, box-shadow .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.08)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 10, background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 17, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,.07)',
                }}>{f.icon}</div>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: '#1c0f00', marginBottom: 4 }}>{f.title}</p>
                <p style={{ fontSize: 11.5, color: '#92400e', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11.5, fontWeight: 600, color: '#c2410c',
              background: 'rgba(249,115,22,.1)', border: '1.5px solid rgba(249,115,22,.25)',
              borderRadius: 20, padding: '5px 14px',
            }}>✦ Powered by SKorbits</span>
          </div>

          {/* QR Code — get the app on mobile */}
          <div style={{
            marginTop: 32, display: 'flex', alignItems: 'center', gap: 18,
            background: '#fff', border: '1.5px solid #fed7aa',
            borderRadius: 20, padding: '16px 20px',
            boxShadow: '0 4px 16px rgba(249,115,22,.08)',
            maxWidth: 340,
          }}>
            <div style={{
              background: '#fff', padding: 8, borderRadius: 12,
              border: '1.5px solid #fed7aa', flexShrink: 0,
            }}>
              <QRCodeSVG
                value={APP_URL}
                size={80}
                fgColor="#1c0f00"
                bgColor="#ffffff"
                level="M"
              />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1c0f00', marginBottom: 4 }}>
                Get the app on your phone
              </p>
              <p style={{ fontSize: 11.5, color: '#92400e', lineHeight: 1.6, marginBottom: 8 }}>
                Scan with your camera to open FoodVault on iOS or Android
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '3px 8px',
                  borderRadius: 6, background: '#000', color: '#fff',
                }}>🍎 iOS</span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '3px 8px',
                  borderRadius: 6, background: '#3ddc84', color: '#000',
                }}>🤖 Android</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <div style={{
          width: '100%', maxWidth: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '48px 40px',
          animation: 'slideInRight .6s ease both',
        }}>
          <div style={{ width: '100%', maxWidth: 380 }}>
            <LoginCard loading={loading} error={error} btnHover={btnHover} setBtnHover={setBtnHover} onLogin={handleGoogleLogin} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          MOBILE  (≤ 768px) — single column scroll
      ═══════════════════════════════════════════ */}
      <div className="mobile-login" style={{
        minHeight: '100dvh',
        background: 'linear-gradient(180deg, #fff6f0 0%, #fffaf5 100%)',
        display: 'none', flexDirection: 'column',
        padding: '0 0 40px',
      }}>

        {/* Top hero band */}
        <div style={{
          background: 'linear-gradient(135deg, #fff7ed, #ffe8d6)',
          borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
          padding: '48px 24px 36px',
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
              boxShadow: '0 4px 14px rgba(249,115,22,.4)',
            }}>🍽️</div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#1c0f00' }}>FoodVault</span>
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28, fontWeight: 700, color: '#1c0f00',
            lineHeight: 1.25, marginBottom: 10, textAlign: 'center',
          }}>
            Plan meals.<br />Save recipes.<br />
            <span style={{ color: '#f97316' }}>Eat better.</span>
          </h1>
          <p style={{ fontSize: 14, color: '#78350f', lineHeight: 1.65, maxWidth: 300, margin: '0 auto', textAlign: 'center' }}>
            Save recipes from anywhere, plan your week, and let AI handle your shopping.
          </p>
        </div>

        {/* Login card */}
        <div style={{ padding: '0 20px', marginBottom: 28 }}>
          <LoginCard loading={loading} error={error} btnHover={btnHover} setBtnHover={setBtnHover} onLogin={handleGoogleLogin} />
        </div>

        {/* Feature tiles */}
        <div style={{ padding: '0 20px' }}>
          <p style={{
            fontSize: 11.5, fontWeight: 700, color: '#92400e',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 14, textAlign: 'center',
          }}>Everything you need</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                background: f.bg, border: `1.5px solid ${f.border}`,
                borderRadius: 16, padding: '14px 16px',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                  background: '#fff', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 18,
                  boxShadow: '0 2px 8px rgba(0,0,0,.07)',
                }}>{f.icon}</div>
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: '#1c0f00', marginBottom: 3 }}>{f.title}</p>
                  <p style={{ fontSize: 12.5, color: '#92400e', lineHeight: 1.55 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11.5, fontWeight: 600, color: '#c2410c',
              background: 'rgba(249,115,22,.1)', border: '1.5px solid rgba(249,115,22,.25)',
              borderRadius: 20, padding: '5px 14px',
            }}>✦ Powered by SKorbits</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @media (max-width: 768px) {
          .desktop-login { display: none !important; }
          .mobile-login  { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
