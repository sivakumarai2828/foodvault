import { useState, useRef, useEffect } from 'react'
import { aiChat } from '../lib/api'
import { useToast } from '../App'

const INITIAL_SUGGESTIONS = [
  'What chicken recipes do I have?',
  'Suggest something quick for dinner',
  'What can I make for breakfast?',
  'Which recipes are vegetarian?',
  'Help me plan a healthy week',
]

// Context-aware follow-up chips based on response content
function getFollowUps(reply) {
  const r = reply.toLowerCase()
  const chips = []
  if (r.includes('ingredient') || r.includes('recipe')) chips.push('Give me the full ingredients list')
  if (r.includes('step') || r.includes('instruction') || r.includes('cook')) chips.push('Walk me through the steps')
  if (r.includes('calorie') || r.includes('protein') || r.includes('nutrition')) chips.push('What are the nutrition details?')
  if (r.includes('plan') || r.includes('week') || r.includes('meal')) chips.push('Generate a full week plan')
  if (r.includes('breakfast') || r.includes('lunch') || r.includes('dinner')) chips.push('Suggest alternatives for this meal')
  if (chips.length < 2) chips.push('Tell me more', 'What else can you suggest?')
  return chips.slice(0, 3)
}

function Message({ msg, onFollowUp, isLast }) {
  const isUser = msg.role === 'user'
  const followUps = (!isUser && isLast && msg.followUps) ? msg.followUps : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 10, justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'flex-end' }}>
        {!isUser && (
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, boxShadow: '0 4px 12px rgba(212,82,42,.25)',
          }}>✦</div>
        )}
        <div style={{
          maxWidth: '76%', padding: '11px 15px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser ? 'var(--primary)' : 'var(--white)',
          color: isUser ? '#fff' : 'var(--ink)',
          border: isUser ? 'none' : '1.5px solid var(--border)',
          fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
          boxShadow: isUser ? '0 4px 14px rgba(212,82,42,.25)' : 'var(--shadow-sm)',
        }}>
          {msg.content}
        </div>
        {isUser && (
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'var(--cream-2)', border: '1.5px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
          }}>👤</div>
        )}
      </div>

      {/* Follow-up suggestion chips — only shown on last AI message */}
      {followUps.length > 0 && (
        <div style={{ paddingLeft: 44, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {followUps.map(chip => (
            <button key={chip} onClick={() => onFollowUp(chip)} style={{
              padding: '5px 12px', borderRadius: 99, border: '1.5px solid var(--border)',
              background: 'var(--white)', color: 'var(--ink-2)', fontSize: 12, cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 500, transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-bg)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--ink-2)'; e.currentTarget.style.background = 'var(--white)'; }}>
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Typing() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, boxShadow: '0 4px 12px rgba(212,82,42,.25)',
      }}>✦</div>
      <div style={{
        padding: '13px 18px', borderRadius: '18px 18px 18px 4px',
        background: 'var(--white)', border: '1.5px solid var(--border)',
        display: 'flex', gap: 6, alignItems: 'center', boxShadow: 'var(--shadow-sm)',
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--primary)', opacity: 0.6,
            animation: `dot 1s ${i * .2}s ease-in-out infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

export default function ChatView() {
  const toast = useToast()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your FoodVault cooking assistant, powered by Claude AI.\n\nI know all about the recipes in your library. Ask me what to cook, get ingredient lists, explore meal ideas, or plan your week — I'm here to help!" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    // Remove follow-up chips from all previous assistant messages
    setMessages(p => [...p.map(m => ({ ...m, followUps: [] })), { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await aiChat(msg)
      const followUps = getFollowUps(res.reply)
      setMessages(p => [...p, { role: 'assistant', content: res.reply, followUps }])
    } catch {
      toast('AI response failed', 'error')
      setMessages(p => [...p, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', followUps: [] }])
    } finally { setLoading(false); inputRef.current?.focus() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 160px)', maxHeight: 740 }}>
      <div style={{ marginBottom: 14 }}>
        <p className="section-label" style={{ marginBottom: 6 }}>✦ Powered by SKorbits</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 className="page-title">AI Assistant</h1>
          <span className="badge badge-red" style={{ fontSize: 10 }}>Live</span>
        </div>
      </div>

      {/* Initial suggestion pills — horizontally scrollable */}
      {messages.length <= 1 && (
        <div className="hide-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14, paddingBottom: 2 }}>
          {INITIAL_SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)} style={{
              padding: '8px 14px', borderRadius: 99, border: '1.5px solid var(--border)',
              background: 'var(--white)', color: 'var(--ink-2)', fontSize: 12.5, cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 500, transition: 'all .15s',
              flexShrink: 0, whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-bg)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--ink-2)'; e.currentTarget.style.background = 'var(--white)'; }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="card" style={{ flex: 1, borderRadius: 20, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', background: 'var(--cream)' }}>
        {messages.map((m, i) => (
          <Message key={i} msg={m} isLast={i === messages.length - 1} onFollowUp={send} />
        ))}
        {loading && <Typing />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 8, marginTop: 12,
        background: 'var(--white)', border: '1.5px solid var(--border)',
        borderRadius: 16, padding: '6px 6px 6px 14px',
        boxShadow: '0 2px 12px rgba(0,0,0,.06)',
      }}>
        <input
          ref={inputRef}
          placeholder="Ask about your recipes…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          disabled={loading}
          style={{
            flex: 1, border: 'none', background: 'transparent',
            padding: '6px 0', outline: 'none', fontSize: 14,
            fontFamily: 'inherit', color: 'var(--ink)',
          }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{
            flexShrink: 0, width: 42, height: 42, padding: 0, borderRadius: 12,
            border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            background: input.trim() && !loading ? 'var(--primary)' : 'var(--cream-2)',
            color: input.trim() && !loading ? '#fff' : 'var(--ink-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .15s',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      <p style={{ fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center', marginTop: 6 }}>
        AI can make mistakes. Please double-check responses.
      </p>

      <style>{`
        @keyframes dot { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-5px);opacity:1} }
        .hide-scrollbar { scrollbar-width:none; -ms-overflow-style:none; }
        .hide-scrollbar::-webkit-scrollbar { display:none; }
      `}</style>
    </div>
  )
}
