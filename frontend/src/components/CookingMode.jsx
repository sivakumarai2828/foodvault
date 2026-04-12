import { useState, useEffect } from 'react'

// ── Cooking Mode ───────────────────────────────────────────────────────────────
// Full-screen step-by-step cooking experience.
// Props: recipe (object with title, instructions array), onClose callback
export default function CookingMode({ recipe, onClose }) {
  const steps = Array.isArray(recipe.instructions) ? recipe.instructions : []
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)

  // Lock body scroll while cooking mode is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextStep()
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prevStep()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  if (!steps.length) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: '#1C1610', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 32,
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>😅</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, marginBottom: 12 }}>No instructions found</h2>
          <p style={{ color: 'rgba(255,255,255,.6)', marginBottom: 28 }}>Use the Re-extract button on this recipe to pull step-by-step instructions from the source.</p>
          <button onClick={onClose} className="btn btn-secondary">← Back to Recipe</button>
        </div>
      </div>
    )
  }

  const progress = ((step + 1) / steps.length) * 100

  const nextStep = () => {
    if (step < steps.length - 1) setStep(s => s + 1)
    else setDone(true)
  }
  const prevStep = () => {
    if (done) { setDone(false); return }
    if (step > 0) setStep(s => s - 1)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: '#1C1610',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header bar */}
      <div style={{
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: '1px solid rgba(255,255,255,.1)',
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 10, border: 'none',
          background: 'rgba(255,255,255,.1)', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          flexShrink: 0,
        }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
            Cooking Mode
          </p>
          <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {recipe.title}
          </p>
        </div>
        <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
          {done ? '✓ Done' : `${step + 1} / ${steps.length}`}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,.1)', flexShrink: 0 }}>
        <div style={{
          height: '100%', background: 'var(--primary)',
          width: `${done ? 100 : progress}%`,
          transition: 'width .4s ease',
        }} />
      </div>

      {/* Main step content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 28px', overflow: 'hidden' }}>

        {done ? (
          /* ── Completion screen ── */
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ fontSize: 72, marginBottom: 20, animation: 'popIn .5s ease' }}>🎉</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", color: '#fff', fontSize: 30, fontWeight: 700, marginBottom: 12 }}>
              Bon Appétit!
            </h2>
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
              You've completed all {steps.length} steps of {recipe.title}. Enjoy your meal!
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={prevStep} className="btn btn-secondary" style={{ background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(255,255,255,.2)', color: '#fff', borderRadius: 14 }}>
                ← Last Step
              </button>
              <button onClick={onClose} className="btn btn-primary" style={{ borderRadius: 14 }}>
                Done Cooking
              </button>
            </div>
          </div>
        ) : (
          /* ── Step view ── */
          <div style={{ width: '100%', maxWidth: 560, textAlign: 'center' }}>
            {/* Step number bubble */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 auto 24px',
              boxShadow: '0 6px 24px rgba(212,82,42,.4)',
            }}>{step + 1}</div>

            {/* Step text */}
            <p style={{
              color: '#fff', fontSize: 'clamp(17px, 3.5vw, 22px)', lineHeight: 1.65,
              fontWeight: 400, letterSpacing: '-0.01em',
            }}>
              {steps[step]}
            </p>

            {/* Step dots */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 36 }}>
              {steps.map((_, i) => (
                <button key={i} onClick={() => setStep(i)} style={{
                  width: i === step ? 20 : 7, height: 7,
                  borderRadius: 99, border: 'none', cursor: 'pointer',
                  background: i === step ? 'var(--primary)' : i < step ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.15)',
                  transition: 'all .25s', padding: 0,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      {!done && (
        <div style={{
          padding: '16px 24px', display: 'flex', gap: 12,
          borderTop: '1px solid rgba(255,255,255,.1)',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          flexShrink: 0,
        }}>
          <button
            onClick={prevStep}
            disabled={step === 0}
            style={{
              flex: 1, padding: '16px', borderRadius: 16, border: '1.5px solid rgba(255,255,255,.15)',
              background: 'rgba(255,255,255,.06)', color: step === 0 ? 'rgba(255,255,255,.2)' : '#fff',
              fontSize: 15, fontWeight: 600, cursor: step === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all .15s',
            }}
          >
            ← Previous
          </button>
          <button
            onClick={nextStep}
            style={{
              flex: 2, padding: '16px', borderRadius: 16, border: 'none',
              background: 'var(--primary)', color: '#fff',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 4px 20px rgba(212,82,42,.45)',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(212,82,42,.55)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(212,82,42,.45)' }}
          >
            {step === steps.length - 1 ? 'Finish Cooking 🎉' : 'Next Step →'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  )
}
