import React, { useEffect, useMemo, useState } from 'react'
import { sendChat, saveProfile } from './api'

function Card({ item }) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12, width: 220, background: '#fff' }}>
      {item.image && (
        <div style={{ width: '100%', height: 120, borderRadius: 10, backgroundSize: 'cover', backgroundPosition: 'center', backgroundImage: `url(${item.image})` }} />
      )}
      <div style={{ fontWeight: 600, marginTop: 10 }}>{item.title}</div>
      {item.description && (
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{item.description}</div>
      )}
    </div>
  )
}

function Message({ m }) {
  const isUser = m.role === 'user'
  
  const formatText = (text) => {
    if (!text) return text
    
    // **텍스트**를 <strong>텍스트</strong>로 변환
    const parts = text.split(/\*\*(.*?)\*\*/g)
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index}>{part}</strong>
      }
      return part
    })
  }
  
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      <div style={{ maxWidth: '75%', padding: '10px 12px', borderRadius: 12, background: isUser ? '#15b8a6' : '#f3f4f6', color: isUser ? '#fff' : '#000' }}>
        {m.text && <div style={{ whiteSpace: 'pre-wrap' }}>{formatText(m.text)}</div>}
        {!!(m.cards?.length) && (
          <div style={{ display: 'flex', gap: 12, marginTop: 8, overflowX: 'auto' }}>
            {m.cards.map((c, idx) => <Card key={idx} item={c} />)}
          </div>
        )}
        {!!(m.suggestions?.length) && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {m.suggestions.map((s, idx) => (
              <span key={idx} style={{ fontSize: 12, background: '#e5f7f5', color: '#067a6f', borderRadius: 12, padding: '6px 10px', cursor: 'pointer' }} onClick={m.onQuickReply ? () => m.onQuickReply(s) : undefined}>{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  // removed language state; LLM will infer language based on message
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [profile, setProfile] = useState({ accessibility: 'none' })

  const userId = useMemo(() => {
    let id = localStorage.getItem('userId')
    if (!id) { id = 'u_' + Math.random().toString(36).slice(2, 10); localStorage.setItem('userId', id) }
    return id
  }, [])

  useEffect(() => {
    // initial greeting
    if (messages.length === 0) {
      setMessages([
        { id: 'greet', role: 'assistant', text: "Hello! I'm your assistant for Dalang Fashion Town / Gwanlan Culture Town. How can I help you?", suggestions: ['Popular attractions', 'Fashion hotspots', 'Event schedule'], onQuickReply: handleQuickReply }
      ])
    }
    // removed explicit language persistence, LLM will auto-detect
  }, [])

  function handleQuickReply(s) {
    setInput(s)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text) return
    setInput('')
    const userMsg = { id: Date.now() + '_u', role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const resp = await sendChat({ message: text, userId, profile })
      console.log('Frontend received response:', resp)
      const botMsg = { id: Date.now() + '_a', role: 'assistant', text: resp.text || '', cards: resp.cards || [], suggestions: resp.suggestions || [], onQuickReply: handleQuickReply }
      console.log('Creating bot message:', botMsg)
      setMessages(prev => [...prev, botMsg])
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now() + '_err', role: 'assistant', text: `An error occurred: ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveProfile() {
    try {
      await saveProfile(userId, profile)
    } catch {}
    // removed saving language to localStorage
    setShowSettings(false)
  }

  return (
    <div style={{ width: 375, height: 762, position: 'relative', background: '#fff', margin: '0 auto', border: '1px solid #eee' }}>
      {/* Header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 57, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ color: '#15b8a6', fontFamily: 'Pacifico', fontSize: 20 }}>logo</div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={() => setShowSettings(s => !s)} style={{ background: '#15b8a6', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px' }}>Settings</button>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ position: 'absolute', top: 60, bottom: 82, left: 16, right: 16, overflowY: 'auto' }}>
        {messages.map(m => <Message key={m.id} m={m} />)}
        {loading && <div style={{ fontSize: 12, color: '#6b7280' }}>Generating response...</div>}
      </div>

      {/* Input area */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '11px 16px', borderTop: '1px solid #f3f4f6', background: '#fff' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' ? handleSend() : undefined} placeholder="Type your message..." style={{ flex: 1, border: 'none', background: '#f3f4f6', borderRadius: 9999, padding: '8px 16px', outline: 'none' }} />
          <button onClick={handleSend} disabled={loading} style={{ width: 40, height: 40, borderRadius: 9999, background: '#15b8a6', color: '#fff', border: 'none' }}>▶</button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div style={{ position: 'absolute', right: 16, top: 70, width: 260, padding: 12, background: '#fff', border: '1px solid #eee', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>User Settings</div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Accessibility Options</label>
          <select value={profile.accessibility} onChange={(e) => setProfile({ ...profile, accessibility: e.target.value })} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '6px 8px' }}>
            <option value="none">Default</option>
            <option value="large_text">Large Text</option>
            <option value="high_contrast">High Contrast</option>
          </select>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button onClick={() => setShowSettings(false)} style={{ border: '1px solid #ddd', background: '#fff', borderRadius: 6, padding: '6px 10px' }}>Close</button>
            <button onClick={handleSaveProfile} style={{ background: '#15b8a6', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px' }}>Save</button>
          </div>
        </div>
      )}
    </div>
  )
}