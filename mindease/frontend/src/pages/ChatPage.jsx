import React, { useState, useEffect, useRef } from 'react'
import { Plus, Send, Trash2, MessageCircle, Loader2, AlertCircle } from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const EMOTION_CONFIG = {
  joy:        { emoji: '😊', color: 'text-yellow-500', bg: 'bg-yellow-50' },
  sadness:    { emoji: '😢', color: 'text-blue-500',   bg: 'bg-blue-50' },
  anxiety:    { emoji: '😰', color: 'text-orange-500', bg: 'bg-orange-50' },
  anger:      { emoji: '😠', color: 'text-red-500',    bg: 'bg-red-50' },
  neutral:    { emoji: '😐', color: 'text-slate-500',  bg: 'bg-slate-50' },
  hope:       { emoji: '🌱', color: 'text-green-500',  bg: 'bg-green-50' },
  fear:       { emoji: '😨', color: 'text-purple-500', bg: 'bg-purple-50' },
  supportive: { emoji: '💙', color: 'text-primary-500',bg: 'bg-primary-50' },
}

const QUICK_PROMPTS = [
  "I've been feeling stressed lately",
  "I'm having trouble sleeping",
  "I want to talk about my anxiety",
  "I'm feeling really good today!",
]

function EmotionBadge({ emotion }) {
  const cfg = EMOTION_CONFIG[emotion] || EMOTION_CONFIG.neutral
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                      ${cfg.bg} ${cfg.color} font-medium`}>
      {cfg.emoji} {emotion}
    </span>
  )
}

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                       text-xs font-semibold select-none ${
        isUser
          ? 'bg-primary-100 text-primary-700'
          : 'bg-gradient-to-br from-primary-500 to-calm-500 text-white'
      }`}>
        {isUser ? 'You' : '🧠'}
      </div>

      <div className={`max-w-[75%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-primary-600 text-white rounded-tr-sm'
            : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm'
        }`}>
          {msg.content}
        </div>
        <div className={`flex items-center gap-2 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs text-slate-400">
            {msg.created_at
              ? formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })
              : ''}
          </span>
          {msg.emotion && msg.emotion !== 'supportive' && (
            <EmotionBadge emotion={msg.emotion} />
          )}
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [sessions, setSessions]         = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [messages, setMessages]         = useState([])
  const [input, setInput]               = useState('')
  const [sending, setSending]           = useState(false)
  const [loadingMsgs, setLoadingMsgs]   = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => { loadSessions() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])

  const loadSessions = async () => {
    try {
      const res = await api.get('/api/chat/sessions')
      setSessions(res.data)
    } catch { toast.error('Failed to load sessions') }
  }

  const selectSession = async (session) => {
    setLoadingMsgs(true)
    setActiveSession(session)
    try {
      const res = await api.get(`/api/chat/sessions/${session.id}`)
      setMessages(res.data.messages || [])
    } catch { toast.error('Failed to load messages') }
    finally { setLoadingMsgs(false) }
  }

  const newChat = () => {
    setActiveSession(null)
    setMessages([])
    inputRef.current?.focus()
  }

  const deleteSession = async (e, id) => {
    e.stopPropagation()
    try {
      await api.delete(`/api/chat/sessions/${id}`)
      setSessions(prev => prev.filter(s => s.id !== id))
      if (activeSession?.id === id) { setActiveSession(null); setMessages([]) }
      toast.success('Session deleted')
    } catch { toast.error('Failed to delete session') }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    const content = input.trim()
    if (!content || sending) return
    setInput('')
    setSending(true)

    const tempId = Date.now()
    setMessages(prev => [
      ...prev,
      { id: tempId, role: 'user', content, created_at: new Date().toISOString() },
    ])

    try {
      const res = await api.post('/api/chat/send', {
        content,
        session_id: activeSession?.id ?? null,
      })
      const { session_id, user_message, assistant_message } = res.data

      if (!activeSession) {
        await loadSessions()
        setActiveSession({ id: session_id })
      }

      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        user_message,
        assistant_message,
      ])
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* ── Sessions sidebar ──────────────────────────────────────────── */}
      <div className="hidden md:flex w-64 bg-white border-r border-slate-100 flex-col">
        <div className="p-4 border-b border-slate-100">
          <button onClick={newChat} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {sessions.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No sessions yet
            </div>
          )}
          {sessions.map(s => (
            <button key={s.id} onClick={() => selectSession(s)}
              className={`w-full text-left px-3 py-2.5 rounded-xl group flex items-center
                          justify-between gap-2 transition-colors ${
                activeSession?.id === s.id
                  ? 'bg-primary-50 text-primary-700'
                  : 'hover:bg-slate-50 text-slate-600'
              }`}>
              <span className="text-sm truncate flex-1">{s.title}</span>
              <button onClick={(e) => deleteSession(e, s.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white">
          <h2 className="font-semibold text-slate-800">
            {activeSession ? 'Conversation' : 'Start a new conversation'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Share how you're feeling — I'm here to listen
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Empty state */}
          {!activeSession && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <div className="text-5xl">🧠</div>
              <h3 className="text-lg font-semibold text-slate-700">Hello, I'm MindEase</h3>
              <p className="text-slate-500 max-w-sm text-sm leading-relaxed">
                I'm your AI mental health companion. Feel free to share what's on your mind —
                whether it's stress, anxiety, or just wanting to talk. I'm here to listen without judgment.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {QUICK_PROMPTS.map(p => (
                  <button key={p} onClick={() => setInput(p)}
                    className="text-sm px-4 py-2 rounded-full border border-slate-200
                               hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700
                               transition-colors text-slate-600">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingMsgs && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          )}

          {messages.map(msg => <ChatMessage key={msg.id} msg={msg} />)}

          {/* Typing indicator */}
          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-calm-500
                              flex items-center justify-center text-sm select-none">🧠</div>
              <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm
                              px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-5">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"
                          style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            MindEase is not a replacement for professional therapy.
            In crisis? Call iCall: <span className="font-medium">9152987821</span>
          </div>
          <form onSubmit={sendMessage} className="flex gap-3">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Share what's on your mind…"
              className="input-field flex-1"
              disabled={sending}
            />
            <button type="submit" disabled={sending || !input.trim()}
              className="btn-primary px-5 flex items-center gap-2">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
