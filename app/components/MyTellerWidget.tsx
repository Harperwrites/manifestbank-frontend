'use client'

import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/app/providers'
import { api } from '@/lib/api'
import TellerStarterPrompt from '@/app/components/TellerStarterPrompt'
import TellerMarkdown from '@/app/components/TellerMarkdown'
import { sendTellerChat } from '@/app/lib/tellerStream'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export default function MyTellerWidget() {
  const { me } = useAuth()
  const isVerified = Boolean(me?.email_verified)
  const isPremium = Boolean(me?.is_premium)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement | null>(null)
  const retryHints = ['Fortune is thinking…', 'Stay with me — still working.']
  const [retryHintIndex, setRetryHintIndex] = useState(0)
  const introPrompt =
    'Hi — I’m Fortune, your ManifestBank™ Teller. How can I support your abundance practice or nervous‑system alignment today?'
  const upgradeReason = 'ManifestBank™ Signature required to start a new Teller session or send Teller messages.'

  const renderAssistantContent = (text: string) => {
    return <TellerMarkdown content={text} compact />
  }

  useEffect(() => {
    if (!open) return
    loadCurrentSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!endRef.current) return
    endRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => {
    if (!loading) return
    setRetryHintIndex(0)
    const id = window.setInterval(() => {
      setRetryHintIndex((prev) => (prev + 1) % retryHints.length)
    }, 3000)
    return () => window.clearInterval(id)
  }, [loading])

  useEffect(() => {
    if (me && isVerified) return
    setOpen(false)
    setThreadId(null)
    setMessages([])
    setDraft('')
    setError('')
  }, [isVerified, me])

  if (!me || !isVerified) return null

  async function loadCurrentSession() {
    if (!isPremium) {
      setThreadId(null)
      setMessages([
        {
          id: 'intro',
          role: 'assistant',
          content: introPrompt,
          created_at: new Date().toISOString(),
        },
      ])
      setError('')
      return
    }
    setLoading(true)
    setError('')
    try {
      const threads = (await api.get('/teller/threads')).data
      const list = Array.isArray(threads) ? threads : []
      const active = list[0]
      if (!active) {
        setThreadId(null)
        setMessages([
          {
            id: 'intro',
            role: 'assistant',
            content: introPrompt,
            created_at: new Date().toISOString(),
          },
        ])
        return
      }
      setThreadId(active.id)
      const res = await api.get(`/teller/threads/${active.id}/messages`)
      const msgs = Array.isArray(res.data) ? res.data : []
      if (!msgs.length) {
        setMessages([
          {
            id: 'intro',
            role: 'assistant',
            content: introPrompt,
            created_at: new Date().toISOString(),
          },
        ])
      } else {
        setMessages(msgs)
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Unable to load Teller.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    if (!isPremium) {
      window.dispatchEvent(new CustomEvent('paywall:open', { detail: { reason: upgradeReason } }))
      return
    }
    if (!draft.trim() || loading) return
    setLoading(true)
    setError('')
    const content = draft.trim()
    setDraft('')
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    const ensureAssistantVisible = () => {
      setMessages((prev) => [
        ...prev,
        {
          id: `forced-fallback-${Date.now()}`,
          role: 'assistant',
          content: 'I’m here. Please try again.',
          created_at: new Date().toISOString(),
        },
      ])
    }

    try {
      const response = await sendTellerChat({
        thread_id: threadId,
        message: content,
        short_mode: false,
      })
      setThreadId(String(response.thread.id))
      setMessages((prev) => {
        const cleanedMessages = prev.filter((message) => message.id !== optimistic.id)
        return [...cleanedMessages, response.user_message, response.assistant_message]
      })
      window.dispatchEvent(new Event('accounts:refresh'))
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 402) {
        window.dispatchEvent(new CustomEvent('paywall:open', { detail: { reason: err?.response?.data?.detail } }))
      } else {
        setError('')
      }
      ensureAssistantVisible()
    } finally {
      setLoading(false)
    }
  }

  function handleDraftKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleSend()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'flex-end',
      }}
    >
      {open ? (
        <div
          data-testid="teller-widget-panel"
          style={{
            width: 'min(360px, calc(100vw - 20px))',
            maxWidth: 'calc(100vw - 20px)',
            background: 'rgba(255,255,255,0.98)',
            borderRadius: 18,
            boxShadow: '0 18px 44px rgba(12,10,12,0.25)',
            border: '1px solid rgba(95,74,62,0.2)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: 'linear-gradient(135deg, #b67967, #c6927c)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span aria-hidden="true" style={{ width: 16, height: 16, display: 'inline-flex' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
                  <path d="M3 9L12 4l9 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 10h16" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M6 10v7M9 10v7M12 10v7M15 10v7M18 10v7" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M4 17h16" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              My Teller
            </span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={async () => {
                  if (!isPremium) {
                    window.dispatchEvent(new CustomEvent('paywall:open', { detail: { reason: upgradeReason } }))
                    return
                  }
                  setLoading(true)
                  setError('')
                  try {
                    setThreadId(null)
                    setMessages([
                      {
                        id: 'intro',
                        role: 'assistant',
                        content: introPrompt,
                        created_at: new Date().toISOString(),
                      },
                    ])
                  } catch (err: any) {
                    setError(err?.response?.data?.detail ?? 'Unable to create session.')
                  } finally {
                    setLoading(false)
                  }
                }}
                data-testid="teller-widget-new-session-button"
                style={{
                  padding: '4px 8px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.6)',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                + New
              </button>
              <button
                type="button"
                data-testid="teller-widget-close-button"
                onClick={() => setOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: 16,
                  cursor: 'pointer',
                }}
                aria-label="Close teller"
              >
                ×
              </button>
            </div>
          </div>
          <div style={{ maxHeight: 'min(42vh, 240px)', overflowY: 'auto', padding: '10px 12px' }}>
            <div data-testid="teller-widget-response-region" role="log" aria-live="polite" aria-label="Teller widget conversation">
            {loading && !messages.length ? <div style={{ opacity: 0.7 }}>Loading…</div> : null}
            {error ? <div data-testid="teller-widget-error" style={{ color: '#7a2e2e', fontSize: 12 }}>{error}</div> : null}
            {messages.map((m) => (
              <div
                key={m.id}
                data-testid={m.role === 'assistant' ? 'teller-widget-assistant-message' : 'teller-widget-user-message'}
                style={{
                  marginBottom: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    marginLeft: m.role === 'user' ? 'auto' : undefined,
                    padding: '8px 10px',
                    borderRadius: 12,
                    background: m.role === 'user' ? '#f2e7e1' : '#f8f3ef',
                    fontSize: 12,
                    textAlign: m.role === 'user' ? 'right' : 'left',
                  }}
                >
                  {m.role === 'assistant' ? renderAssistantContent(m.content) : m.content}
                  {m.role === 'assistant' ? (
                    <div data-testid="teller-widget-assistant-signature" style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
                      Fortune - Teller at ManifestBank™
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {loading ? (
              <div
                data-testid="teller-widget-loading-indicator"
                aria-live="polite"
                style={{
                  marginBottom: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '8px 10px',
                    borderRadius: 12,
                    background: '#f8f3ef',
                    fontSize: 12,
                  }}
                >
                  {retryHints[retryHintIndex]}
                  <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
                    Fortune - Teller at ManifestBank™
                  </div>
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(95,74,62,0.15)', padding: '8px 10px' }}>
            {!isPremium ? (
              <div
                style={{
                  marginBottom: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#7a4b3e',
                  textShadow: '0 0 6px rgba(182, 121, 103, 0.28)',
                }}
              >
                Manifest Signature unlocks Teller sessions and message sending.
              </div>
            ) : null}
            <div style={{ marginBottom: 6 }}>
              <TellerStarterPrompt enabled={isPremium} />
            </div>
            <label htmlFor="teller-widget-input" style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 600, color: '#3b2b24' }}>
              Message Fortune
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="teller-widget-input"
                data-testid="teller-widget-draft-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleDraftKeyDown}
                placeholder="Tell your teller..."
                aria-label="Message Fortune"
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1px solid rgba(95,74,62,0.2)',
                  fontSize: 12,
                }}
              />
              <button
                type="button"
                data-testid="teller-widget-send-button"
                onClick={handleSend}
                aria-label="Send message"
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#b67967',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        data-testid="teller-widget-toggle"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          textDecoration: 'none',
          padding: '12px 18px',
          borderRadius: 999,
          background: 'linear-gradient(135deg, #b67967, #c6927c)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 13,
          boxShadow: '0 14px 30px rgba(12, 10, 12, 0.25)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span aria-hidden="true" style={{ width: 16, height: 16, display: 'inline-flex' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
            <path d="M3 9L12 4l9 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 10h16" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M6 10v7M9 10v7M12 10v7M15 10v7M18 10v7" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M4 17h16" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        My Teller
      </button>
    </div>
  )
}
