import React, { useState, useEffect, useRef } from 'react'
import { Sparkles, Plus, Trash2, Send } from 'lucide-react'
import api from '../../../../services/api'

const plannerGlassPanelClass = 'bg-[rgba(26,31,47,0.7)] backdrop-blur-[40px] border border-solid border-[rgba(255,255,255,0.08)] border-t-[rgba(255,255,255,0.12)] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]'

export default function TripAssistant() {
  const [conversations, setConversations] = useState([])
  const [convId, setConvId]   = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef(null)

  const API_BASE = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '')
    : 'http://localhost:5001'

  const loadConversations = async () => {
    try { const res = await api.get('/api/v1/copilot/conversations'); setConversations(res.data.data || []) } catch { /* ignore */ }
  }

  useEffect(() => { loadConversations() }, [])
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const openConversation = async (id) => {
    setConvId(id)
    try {
      const res = await api.get(`/api/v1/copilot/conversations/${id}/messages`)
      setMessages((res.data.data.messages || []).map((m) => ({ role: m.role || 'user', text: m.text })))
    } catch { setMessages([]) }
  }

  const newChat = () => { setConvId(null); setMessages([]) }

  const deleteConv = async (id, e) => {
    e.stopPropagation()
    try {
      await api.delete(`/api/v1/copilot/conversations/${id}`)
      if (id === convId) newChat()
      loadConversations()
    } catch { /* ignore */ }
  }

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || streaming) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: content }, { role: 'assistant', text: '' }])
    setStreaming(true)
    let newConvId = convId
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${API_BASE}/api/v1/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: content, conversationId: convId }),
      })
      if (!res.ok || !res.body) throw new Error('stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop()
        for (const part of parts) {
          const line = part.split('\n').find(l => l.startsWith('data: '))
          if (!line) continue
          let evt
          try { evt = JSON.parse(line.slice(6)) } catch { continue }
          if (evt.type === 'meta' || evt.type === 'done') {
            newConvId = evt.conversationId
          } else if (evt.type === 'token') {
            setMessages(prev => {
              const next = [...prev]
              next[next.length - 1] = { role: 'assistant', text: (next[next.length - 1]?.text || '') + evt.text }
              return next
            })
          } else if (evt.type === 'error') {
            setMessages(prev => {
              const next = [...prev]
              next[next.length - 1] = { role: 'assistant', text: '⚠️ ' + evt.message }
              return next
            })
          }
        }
      }
      if (newConvId && newConvId !== convId) setConvId(newConvId)
      loadConversations()
    } catch {
      setMessages(prev => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant' && !last.text) {
          next[next.length - 1] = { role: 'assistant', text: '⚠️ The copilot is unavailable right now. Please try again.' }
        }
        return next
      })
    } finally { setStreaming(false) }
  }

  const quickPrompts = [
    'Plan a 3-day budget trip to Goa',
    'Best places for a honeymoon in India',
    'Weekend getaway from Mumbai under ₹5000',
  ]

  return (
    <div className={plannerGlassPanelClass} style={{
      borderRadius: 20,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 580,
      overflow: 'hidden',
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #0EA5E9, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(14,165,233,0.3)',
          }}>
            <Sparkles size={18} color="white" />
          </div>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Gemini Trip Assistant
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>
              Chat to brainstorm ideas or fine-tune details
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={newChat}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.35rem 0.75rem',
            background: 'rgba(14,165,233,0.08)',
            border: '1px solid rgba(14,165,233,0.2)',
            borderRadius: 8,
            color: '#0EA5E9',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(14,165,233,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(14,165,233,0.08)'}
        >
          <Plus size={13} /> New
        </button>
      </div>

      {/* Recent conversations */}
      {conversations.length > 0 && (
        <div style={{
          display: 'flex', gap: '0.4rem', overflowX: 'auto',
          padding: '0.625rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          scrollbarWidth: 'none',
        }}>
          {conversations.slice(0, 5).map(c => (
            <button
              key={c._id}
              type="button"
              onClick={() => openConversation(c._id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.25rem 0.625rem',
                background: c._id === convId ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${c._id === convId ? 'rgba(14,165,233,0.4)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 99,
                color: c._id === convId ? '#0EA5E9' : 'var(--color-text-muted)',
                fontSize: '0.72rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s',
                maxWidth: 140,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
                {c.tripId?.destination ? `✈ ${c.tripId.destination}` : (c.lastMessage?.text?.slice(0, 14) || 'Chat')}
              </span>
              <Trash2 size={10} onClick={e => deleteConv(c._id, e)} style={{ opacity: 0.5, flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '1rem',
          display: 'flex', flexDirection: 'column', gap: '0.75rem',
        }}
      >
        {messages.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '2rem 1rem', textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(14,165,233,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: '0 0 24px rgba(14,165,233,0.15)',
            }}>
              <Sparkles size={28} style={{ color: '#0EA5E9' }} />
            </div>
            <h4 style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: '0.4rem' }}>
              How can I help with your plan?
            </h4>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginBottom: '1.25rem' }}>
              Ask me anything about your trip or try a quick prompt:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
              {quickPrompts.map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  style={{
                    padding: '0.5rem 0.875rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 8,
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.78rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(14,165,233,0.06)'
                    e.currentTarget.style.borderColor = 'rgba(14,165,233,0.2)'
                    e.currentTarget.style.color = '#dee1f7'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                    e.currentTarget.style.color = 'var(--color-text-secondary)'
                  }}
                >
                  ✨ {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => {
            const isUser = m.role === 'user'
            return (
              <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isUser
                    ? 'linear-gradient(135deg, #0EA5E9, #14B8A6)'
                    : 'rgba(255,255,255,0.05)',
                  border: isUser ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  color: isUser ? 'white' : 'var(--color-text-primary)',
                  fontSize: '0.84rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  boxShadow: isUser ? '0 4px 12px rgba(14,165,233,0.2)' : 'none',
                }}>
                  {m.text || (streaming && i === messages.length - 1
                    ? <span style={{ color: 'var(--color-text-muted)', animation: 'pulse 1.5s infinite' }}>Thinking…</span>
                    : '')}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input area */}
      <div style={{
        padding: '0.875rem 1rem',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <form
          onSubmit={e => { e.preventDefault(); send() }}
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
          <input
            placeholder="Ask assistant..."
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={streaming}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 99,
              padding: '0.5rem 1rem',
              color: 'var(--color-text-primary)',
              fontSize: '0.84rem',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = '#0EA5E9'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0EA5E9, #14B8A6)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: streaming || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: streaming || !input.trim() ? 0.5 : 1,
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(14,165,233,0.3)',
              flexShrink: 0,
            }}
          >
            <Send size={15} color="white" />
          </button>
        </form>
      </div>
    </div>
  )
}
