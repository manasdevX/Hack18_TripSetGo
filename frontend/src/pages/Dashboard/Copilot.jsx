// src/pages/Dashboard/Copilot.jsx
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, Send, Plus, Trash2 } from 'lucide-react'
import api from '@/services/api'

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '')
  : 'http://localhost:5001'

const SUGGESTIONS = [
  'Plan a 3-day budget trip to Goa',
  'Suggest some hidden gems in Manali',
  'How can I cut my trip budget by 20%?',
  'What should I pack for Kerala in monsoon?',
]

function Bubble({ role, text, streaming }) {
  const isUser = role === 'user'
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '0.875rem' }}>
      <div style={{
        maxWidth: '80%',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-lg)',
        background: isUser ? 'var(--gradient-primary)' : 'var(--color-bg-card)',
        border: isUser ? 'none' : '1px solid var(--color-border)',
        color: isUser ? 'white' : 'var(--color-text-primary)',
        fontSize: '0.9rem', lineHeight: 1.6,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {text || (streaming ? <span className="animate-pulse-slow" style={{ color: 'var(--color-text-muted)' }}>Thinking…</span> : '')}
      </div>
    </motion.div>
  )
}

export default function Copilot() {
  const [params] = useSearchParams()
  const tripId = params.get('tripId') || null

  const [conversations, setConversations] = useState([])
  const [convId, setConvId]   = useState(null)
  const [messages, setMessages] = useState([]) // [{ role, text }]
  const [input, setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef(null)

  const loadConversations = async () => {
    try { const res = await api.get('/api/v1/copilot/conversations'); setConversations(res.data.data || []) } catch { /* ignore */ }
  }
  // Fetch on mount — setState is deferred into the promise callback (not a
  // synchronous effect body) so it doesn't trigger cascading renders.
  useEffect(() => {
    let active = true
    api.get('/api/v1/copilot/conversations')
      .then((res) => { if (active) setConversations(res.data.data || []) })
      .catch(() => {})
    return () => { active = false }
  }, [])

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
    setMessages((prev) => [...prev, { role: 'user', text: content }, { role: 'assistant', text: '' }])
    setStreaming(true)
    let newConvId = convId
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${API_BASE}/api/v1/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: content, conversationId: convId, tripId }),
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
          const line = part.split('\n').find((l) => l.startsWith('data: '))
          if (!line) continue
          let evt
          try { evt = JSON.parse(line.slice(6)) } catch { continue }
          if (evt.type === 'meta' || evt.type === 'done') {
            newConvId = evt.conversationId
          } else if (evt.type === 'token') {
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              next[next.length - 1] = { role: 'assistant', text: (last?.text || '') + evt.text }
              return next
            })
          } else if (evt.type === 'error') {
            setMessages((prev) => {
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
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant' && !last.text) {
          next[next.length - 1] = { role: 'assistant', text: '⚠️ The copilot is unavailable right now. Please try again.' }
        }
        return next
      })
    } finally {
      setStreaming(false)
    }
  }

  const onSubmit = (e) => { e.preventDefault(); send() }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: 460 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, background: 'var(--gradient-primary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Travel <span className="gradient-text">Copilot</span></h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
              {tripId ? 'Grounded on your selected trip' : 'Ask anything — destinations, budgets, itineraries'}
            </p>
          </div>
        </div>
        <button onClick={newChat} className="btn btn-secondary btn-sm" style={{ gap: '0.3rem' }}><Plus size={15} /> New chat</button>
      </div>

      {/* Recent conversations */}
      {conversations.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {conversations.slice(0, 8).map((c) => (
            <button key={c._id} onClick={() => openConversation(c._id)}
              className="btn btn-sm" style={{
                gap: '0.4rem',
                background: c._id === convId ? 'rgba(129,140,248,0.15)' : 'transparent',
                border: `1px solid ${c._id === convId ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
                color: 'var(--color-text-secondary)', maxWidth: 200,
              }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.tripId?.destination ? `✈ ${c.tripId.destination}` : (c.lastMessage?.text?.slice(0, 24) || 'New conversation')}
              </span>
              <Trash2 size={12} onClick={(e) => deleteConv(c._id, e)} style={{ flexShrink: 0, opacity: 0.6 }} />
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="card" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', marginBottom: '1rem' }}>
        {messages.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Sparkles size={40} style={{ marginBottom: '1rem', color: 'var(--color-accent-primary)' }} />
            <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-secondary)' }}>How can I help with your travels?</p>
            <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>Try one of these:</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 520 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="btn btn-secondary btn-sm" style={{ fontWeight: 500 }}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <Bubble key={i} role={m.role} text={m.text} streaming={streaming && i === messages.length - 1} />
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
        <input
          className="input"
          placeholder="Message the copilot…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" disabled={streaming || !input.trim()} style={{ gap: '0.4rem' }}>
          <Send size={16} /> Send
        </button>
      </form>
    </div>
  )
}
