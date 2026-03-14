'use client'

import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Navbar from '@/app/components/Navbar'
import { api } from '@/lib/api'
import { useAuth } from '@/app/providers'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

type ChatThread = {
  id: string
  title: string
  updated_at: string
  messages: ChatMessage[]
}

export default function MyTellerPage() {
  const { me } = useAuth()
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [personaName, setPersonaName] = useState('')
  const [personaPrompt, setPersonaPrompt] = useState('')
  const [personaSaving, setPersonaSaving] = useState(false)
  const [personaMsg, setPersonaMsg] = useState('')
  const [tellerStatus, setTellerStatus] = useState<'live' | 'stub' | 'unknown'>('unknown')
  const [introAsMessage, setIntroAsMessage] = useState(false)
  const [shortMode, setShortMode] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<ChatThread | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [renameTarget, setRenameTarget] = useState<ChatThread | null>(null)
  const [renameTitle, setRenameTitle] = useState('')
  const [renameError, setRenameError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const introPrompt =
    'Welcome back. Take one slow breath. What would feel already done for you today?'

  const isVerified = Boolean(me?.email_verified)
  const isPremium = Boolean(me?.is_premium)

  if (!me) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f4f1' }}>
        <Navbar />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px' }}>Loading…</div>
      </div>
    )
  }

  if (!isVerified) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f4f1' }}>
        <Navbar />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px' }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.85)',
              borderRadius: 18,
              padding: 24,
              border: '1px solid rgba(95, 74, 62, 0.2)',
              boxShadow: '0 14px 40px rgba(12, 10, 12, 0.12)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}>
              Verify your email to access My Teller
            </div>
            <p style={{ marginTop: 8, opacity: 0.75 }}>
              Please verify your email address to continue. Once verified, My Teller will unlock for Signature
              members.
            </p>
            <button
              type="button"
              onClick={() => (window.location.href = '/verify-email?next=/myteller')}
              style={{
                marginTop: 14,
                padding: '10px 16px',
                borderRadius: 999,
                border: 'none',
                background: 'linear-gradient(135deg, #b67967, #c6927c)',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Verify email
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isPremium) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f4f1' }}>
        <Navbar />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px' }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.85)',
              borderRadius: 18,
              padding: 24,
              border: '1px solid rgba(95, 74, 62, 0.2)',
              boxShadow: '0 14px 40px rgba(12, 10, 12, 0.12)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}>
              ManifestBank™ Signature required
            </div>
            <p style={{ marginTop: 8, opacity: 0.75 }}>
              My Teller is a Signature feature. Upgrade to ManifestBank™ Signature to continue.
            </p>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('paywall:open', { detail: { reason: 'Upgrade to ManifestBank™ Signature.' } })
                )
              }
              style={{
                marginTop: 14,
                padding: '10px 16px',
                borderRadius: 999,
                border: 'none',
                background: 'linear-gradient(135deg, #b67967, #c6927c)',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Upgrade to Manifest Signature
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderAssistantContent(text: string) {
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let listItems: React.ReactNode[] = []

    const flushList = () => {
      if (listItems.length) {
        elements.push(
          <ul key={`list-${elements.length}`} style={{ margin: '6px 0 6px 18px', padding: 0 }}>
            {listItems}
          </ul>
        )
        listItems = []
      }
    }

    const inlineFormat = (value: string) => {
      const html = value
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
      return <span dangerouslySetInnerHTML={{ __html: html }} />
    }

    lines.forEach((raw, idx) => {
      const line = raw.trim()
      if (!line) {
        flushList()
        elements.push(<div key={`spacer-${idx}`} style={{ height: 6 }} />)
        return
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        const itemText = line.replace(/^[-•]\s+/, '')
        listItems.push(
          <li key={`li-${idx}`} style={{ marginBottom: 4 }}>
            {inlineFormat(itemText)}
          </li>
        )
        return
      }
      flushList()
      if (line.startsWith('### ')) {
        elements.push(
          <div key={`h3-${idx}`} style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>
            {inlineFormat(line.replace(/^###\s+/, ''))}
          </div>
        )
        return
      }
      if (line.startsWith('## ')) {
        elements.push(
          <div key={`h2-${idx}`} style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>
            {inlineFormat(line.replace(/^##\s+/, ''))}
          </div>
        )
        return
      }
      if (line.startsWith('# ')) {
        elements.push(
          <div key={`h1-${idx}`} style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>
            {inlineFormat(line.replace(/^#\s+/, ''))}
          </div>
        )
        return
      }
      elements.push(
        <div key={`p-${idx}`} style={{ marginBottom: 4 }}>
          {inlineFormat(line)}
        </div>
      )
    })

    flushList()
    return <div style={{ whiteSpace: 'pre-wrap' }}>{elements}</div>
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api
      .get('/teller/threads')
      .then((res) => {
        if (!active) return
        const list = Array.isArray(res.data) ? res.data : []
        const normalized = list.map((t) => ({ ...t, messages: [] })) as ChatThread[]
        setThreads(normalized)
        if (normalized.length > 0) {
          setActiveId(normalized[0].id)
        }
      })
      .catch((err) => {
        if (!active) return
        if (err?.response?.status === 402) {
          window.dispatchEvent(
            new CustomEvent('paywall:open', { detail: { reason: err?.response?.data?.detail } })
          )
        } else {
          setError('Unable to load Teller history.')
        }
      })
      .then(() => {
        if (!active) return
        if (me?.role === 'admin') {
          api
            .get('/teller/status')
            .then((statusRes) => {
              const mode = statusRes?.data?.mode
              if (mode === 'live' || mode === 'stub') setTellerStatus(mode)
              else setTellerStatus('unknown')
            })
            .catch(() => {
              setTellerStatus('unknown')
            })
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function loadMessages(threadId: string | number) {
    const res = await api.get(`/teller/threads/${threadId}/messages`)
    const items = Array.isArray(res.data) ? res.data : []
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, messages: items } : t))
    )
  }

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeId) ?? null,
    [threads, activeId]
  )

  useEffect(() => {
    if (!activeId) return
    loadMessages(activeId).catch(() => {})
  }, [activeId])

  useEffect(() => {
    if (activeThread?.messages?.length) {
      setIntroAsMessage(false)
    }
  }, [activeThread?.messages?.length])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [activeThread?.messages?.length, loading, introAsMessage])

  async function handleNewThread() {
    try {
      const res = await api.post('/teller/threads', { title: 'New Teller Session' })
      const thread = res.data
      if (thread?.id) {
        const normalized: ChatThread = { ...thread, messages: [] }
        setThreads((prev) => [normalized, ...prev])
        setActiveId(thread.id)
      }
    } catch (err: any) {
      if (err?.response?.status === 402) {
        window.dispatchEvent(
          new CustomEvent('paywall:open', { detail: { reason: err?.response?.data?.detail } })
        )
      } else {
        setError('Unable to create a new session.')
      }
    }
  }

  async function handleSend() {
    if (loading) return
    const trimmed = draft.trim()
    if (!trimmed) return
    setLoading(true)
    setDraft('')
    setError('')
    const optimisticUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    }
    if (activeThread) {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThread.id ? { ...t, messages: [...t.messages, optimisticUserMessage] } : t
        )
      )
    }
    try {
      const res = await api.post('/teller/chat', {
        thread_id: activeThread?.id ?? null,
        message: trimmed,
        short_mode: shortMode,
      })
      const data = res.data
      let introBubbleWasAdded = false
      if (!activeThread?.messages?.length) {
        setIntroAsMessage(true)
        introBubbleWasAdded = true
      }
      if (data?.thread) {
        const introBubble = introBubbleWasAdded
          ? [
              {
                id: 'intro',
                role: 'assistant',
                content: introPrompt,
                created_at: new Date().toISOString(),
              },
            ]
          : []
        const updatedThread: ChatThread = {
          id: data.thread.id,
          title: data.thread.title,
          updated_at: data.thread.updated_at,
          messages: [...introBubble, data.user_message, data.assistant_message],
        }
        setThreads((prev) => {
          const existing = prev.filter((t) => t.id !== updatedThread.id)
          return [updatedThread, ...existing]
        })
        setActiveId(updatedThread.id)
        await loadMessages(updatedThread.id)
      }
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 402) {
        window.dispatchEvent(
          new CustomEvent('paywall:open', { detail: { reason: err?.response?.data?.detail } })
        )
      } else if (status === 409) {
        setError('Please wait for the Teller to respond.')
      } else {
        setError(err?.response?.data?.detail ?? 'Unable to send message.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteError('')
    try {
      await api.delete(`/teller/threads/${deleteTarget.id}`)
      setThreads((prev) => prev.filter((t) => t.id !== deleteTarget.id))
      if (activeId === deleteTarget.id) {
        const next = threads.find((t) => t.id !== deleteTarget.id)
        setActiveId(next?.id ?? null)
      }
      setDeleteTarget(null)
    } catch (err: any) {
      setDeleteError(err?.response?.data?.detail ?? 'Unable to delete session.')
    }
  }

  async function confirmRename() {
    if (!renameTarget) return
    const nextTitle = renameTitle.trim()
    if (!nextTitle) {
      setRenameError('Title is required.')
      return
    }
    setRenameError('')
    try {
      const res = await api.put(`/teller/threads/${renameTarget.id}`, { title: nextTitle })
      const updated = res.data
      setThreads((prev) => prev.map((t) => (t.id === renameTarget.id ? { ...t, title: updated.title } : t)))
      setRenameTarget(null)
      setRenameTitle('')
    } catch (err: any) {
      setRenameError(err?.response?.data?.detail ?? 'Unable to rename session.')
    }
  }

  async function savePersona() {
    setPersonaMsg('')
    setPersonaSaving(true)
    try {
      await api.post('/teller/persona', { name: personaName.trim(), prompt: personaPrompt.trim() })
      setPersonaMsg('Persona updated.')
    } catch (err: any) {
      setPersonaMsg(err?.response?.data?.detail ?? 'Unable to update persona.')
    } finally {
      setPersonaSaving(false)
    }
  }

  async function resetPersona() {
    setPersonaMsg('')
    setPersonaSaving(true)
    try {
      await api.post('/teller/persona', { name: null, prompt: null })
      setPersonaName('')
      setPersonaPrompt('')
      setPersonaMsg('Persona reset to default.')
    } catch (err: any) {
      setPersonaMsg(err?.response?.data?.detail ?? 'Unable to reset persona.')
    } finally {
      setPersonaSaving(false)
    }
  }

  return (
    <main className="mb-page-offset">
      <Navbar />
      <div className="teller-shell" style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 600 }}>My Teller</div>
            <div style={{ opacity: 0.7, marginTop: 6 }}>
              Your personal ManifestBank™ teller. Every movement is confirmed before execution.
            </div>
            {me?.role === 'admin' ? (
              <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Teller status:</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '4px 8px',
                    borderRadius: 999,
                    border: '1px solid rgba(140, 92, 78, 0.25)',
                    background:
                      tellerStatus === 'live'
                        ? 'rgba(182, 121, 103, 0.18)'
                        : tellerStatus === 'stub'
                        ? 'rgba(95, 74, 62, 0.12)'
                        : 'rgba(120, 120, 120, 0.12)',
                    color: '#3b2b24',
                  }}
                >
                  {tellerStatus}
                </span>
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleNewThread}
              style={{
                padding: '4px 12px',
                borderRadius: 999,
                border: '1px solid rgba(140, 92, 78, 0.4)',
                background: 'rgba(255,255,255,0.82)',
                fontWeight: 600,
                fontSize: 12,
                lineHeight: '18px',
                height: 30,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#3b2b24',
                boxShadow:
                  '0 0 8px rgba(182, 121, 103, 0.35), 0 0 14px rgba(182, 121, 103, 0.18)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  marginRight: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  border: '1px solid rgba(140, 92, 78, 0.45)',
                  boxShadow:
                    '0 0 6px rgba(182, 121, 103, 0.55), 0 0 12px rgba(182, 121, 103, 0.35)',
                  fontSize: 12,
                  lineHeight: 1,
                }}
              >
                +
              </span>
              New Session
            </button>
          </div>
        </div>

        <div
          className="teller-layout"
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'minmax(160px, 200px) minmax(0, 1fr)',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <div
            style={{
              borderRadius: 18,
              border: '1px solid rgba(140, 92, 78, 0.3)',
              background: 'rgba(255,255,255,0.92)',
              padding: 16,
              boxShadow: '0 14px 30px rgba(18, 12, 10, 0.12)',
              display: 'grid',
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>Chat History</div>
            {error ? (
              <div
                style={{
                  fontSize: 12,
                  color: '#7a2e2e',
                  textShadow: '0 0 8px rgba(182, 121, 103, 0.45), 0 0 16px rgba(182, 121, 103, 0.25)',
                }}
              >
                {error}
              </div>
            ) : null}
            {loading ? <div style={{ fontSize: 12, opacity: 0.7 }}>Loading…</div> : null}
            {threads.length === 0 ? (
              <div style={{ fontSize: 12, opacity: 0.7 }}>No sessions yet.</div>
            ) : (
              threads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => setActiveId(thread.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setActiveId(thread.id)
                    }
                  }}
                  style={{
                    textAlign: 'left',
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.2)',
                    background: thread.id === activeId ? 'rgba(182, 121, 103, 0.15)' : 'transparent',
                    padding: '8px 10px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{thread.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>
                    {new Date(thread.updated_at).toLocaleDateString('en-US')}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, gap: 6 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setRenameTarget(thread)
                        setRenameTitle(thread.title)
                      }}
                      style={{
                        border: '1px solid rgba(140, 92, 78, 0.3)',
                        background: 'rgba(255,255,255,0.85)',
                        color: '#3b2b24',
                        fontSize: 11,
                        cursor: 'pointer',
                        borderRadius: 999,
                        padding: '3px 8px',
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(thread)
                      }}
                      style={{
                        border: '1px solid rgba(140, 92, 78, 0.3)',
                        background: 'rgba(255,255,255,0.85)',
                        color: '#7a2e2e',
                        fontSize: 11,
                        cursor: 'pointer',
                        borderRadius: 999,
                        padding: '3px 8px',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'grid', gap: 18 }}>
            {me?.role === 'admin' ? (
              <div
                style={{
                  borderRadius: 16,
                  border: '1px solid rgba(140, 92, 78, 0.3)',
                  background: 'rgba(255,255,255,0.92)',
                  padding: 14,
                  boxShadow: '0 12px 26px rgba(18, 12, 10, 0.12)',
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 700 }}>Teller Persona (Admin)</div>
                <input
                  value={personaName}
                  onChange={(e) => setPersonaName(e.target.value)}
                  placeholder="Persona name"
                  style={{
                    borderRadius: 10,
                    border: '1px solid rgba(95, 74, 62, 0.25)',
                    padding: 8,
                    fontSize: 13,
                    fontFamily: 'var(--font-sans)',
                  }}
                />
                <textarea
                  value={personaPrompt}
                  onChange={(e) => setPersonaPrompt(e.target.value)}
                  placeholder="Persona prompt"
                  rows={3}
                  style={{
                    borderRadius: 10,
                    border: '1px solid rgba(95, 74, 62, 0.25)',
                    padding: 8,
                    fontSize: 13,
                    fontFamily: 'var(--font-sans)',
                    resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{personaMsg}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={resetPersona}
                      disabled={personaSaving}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        border: '1px solid rgba(140, 92, 78, 0.35)',
                        background: 'rgba(255,255,255,0.8)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 12,
                        color: '#3b2b24',
                        opacity: personaSaving ? 0.6 : 1,
                      }}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={savePersona}
                      disabled={personaSaving}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        border: '1px solid rgba(140, 92, 78, 0.5)',
                        background: 'rgba(226, 203, 190, 0.7)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 12,
                        color: '#3b2b24',
                        opacity: personaSaving ? 0.6 : 1,
                      }}
                    >
                      {personaSaving ? 'Saving…' : 'Update Persona'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div
              style={{
                borderRadius: 20,
                border: '1px solid rgba(140, 92, 78, 0.3)',
                background: 'linear-gradient(155deg, rgba(255,255,255,0.98), rgba(238, 226, 217, 0.9))',
                padding: 18,
                boxShadow: '0 18px 34px rgba(18, 12, 10, 0.16)',
                display: 'grid',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontWeight: 700 }}>Conversation</div>
                  {me?.role === 'admin' ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '3px 7px',
                        borderRadius: 999,
                        border: '1px solid rgba(140, 92, 78, 0.25)',
                        background:
                          tellerStatus === 'live'
                            ? 'rgba(182, 121, 103, 0.18)'
                            : tellerStatus === 'stub'
                            ? 'rgba(95, 74, 62, 0.12)'
                            : 'rgba(120, 120, 120, 0.12)',
                        color: '#3b2b24',
                      }}
                    >
                      {tellerStatus}
                    </span>
                  ) : null}
                </div>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#3b2b24',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={shortMode}
                    onChange={(e) => setShortMode(e.target.checked)}
                  />
                  Short answers
                </label>
              </div>
              <div
                style={{
                  borderRadius: 14,
                  border: '1px solid rgba(95, 74, 62, 0.2)',
                  background: 'rgba(255,255,255,0.9)',
                  padding: 14,
                  minHeight: 280,
                  maxHeight: 420,
                  overflow: 'auto',
                  display: 'grid',
                  gap: 10,
                }}
              >
                {!activeThread?.messages?.length && !introAsMessage && !loading ? (
                  <div
                    style={{
                      alignSelf: 'center',
                      justifySelf: 'center',
                      textAlign: 'center',
                      maxWidth: 360,
                      padding: '10px 12px',
                      borderRadius: 14,
                      border: '1px solid rgba(140, 92, 78, 0.2)',
                      background: 'rgba(226, 203, 190, 0.35)',
                      fontSize: 13,
                      color: '#3b2b24',
                      lineHeight: 1.5,
                    }}
                  >
                    {introPrompt}
                  </div>
                ) : activeThread?.messages.length || introAsMessage || loading ? (
                  <>
                    {introAsMessage ? (
                      <div
                        style={{
                          alignSelf: 'flex-start',
                          background: 'rgba(95, 74, 62, 0.08)',
                          color: '#3b2b24',
                          padding: '8px 10px',
                          borderRadius: 12,
                          maxWidth: '85%',
                          fontSize: 13,
                        }}
                      >
                        {introPrompt}
                      </div>
                    ) : null}
                    {activeThread?.messages.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          background:
                            msg.role === 'user'
                              ? 'linear-gradient(135deg, rgba(182, 121, 103, 0.22), rgba(214, 164, 146, 0.18))'
                              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(244, 236, 229, 0.9))',
                          color: '#2f221c',
                          padding: '10px 12px',
                          borderRadius: 14,
                          maxWidth: '85%',
                          fontSize: 14,
                          lineHeight: 1.6,
                          boxShadow:
                            msg.role === 'user'
                              ? '0 6px 16px rgba(118, 72, 56, 0.18)'
                              : '0 6px 16px rgba(61, 38, 30, 0.08)',
                          border:
                            msg.role === 'user'
                              ? '1px solid rgba(140, 92, 78, 0.25)'
                              : '1px solid rgba(140, 92, 78, 0.18)',
                        }}
                      >
                        {msg.role === 'assistant' ? renderAssistantContent(msg.content) : msg.content}
                        {msg.role === 'assistant' ? (
                          <div style={{ marginTop: 6, fontSize: 10, opacity: 0.55 }}>
                            <span style={{ fontStyle: 'italic' }}>Fortune</span> - Teller at ManifestBank™
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {loading ? (
                      <div
                        style={{
                          alignSelf: 'flex-start',
                          background: 'rgba(95, 74, 62, 0.08)',
                          color: '#3b2b24',
                          padding: '8px 10px',
                          borderRadius: 12,
                          maxWidth: '85%',
                          fontSize: 12,
                          opacity: 0.8,
                        }}
                      >
                        Fortune is thinking…
                      </div>
                    ) : null}
                    <div ref={messagesEndRef} />
                  </>
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Start a new session and your conversation will appear here.
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <textarea
                  value={loading ? '' : draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={loading}
                  rows={3}
                  placeholder="Tell your Teller what you want to do..."
                  style={{
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.25)',
                    padding: 10,
                    fontSize: 13,
                    fontFamily: 'var(--font-sans)',
                    resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleSend}
                    aria-label="Send"
                    disabled={loading}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      border: '1px solid rgba(140, 92, 78, 0.5)',
                      background: 'rgba(226, 203, 190, 0.7)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 16,
                      color: '#3b2b24',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    ↑
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {deleteTarget ? (
          <div
            onClick={() => setDeleteTarget(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(21, 16, 12, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 80,
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(440px, 100%)',
                borderRadius: 18,
                border: '1px solid rgba(140, 92, 78, 0.35)',
                background: 'rgba(255,255,255,0.95)',
                padding: 18,
                boxShadow: '0 16px 36px rgba(18, 12, 10, 0.18)',
                display: 'grid',
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16 }}>Delete this session?</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                This will permanently remove the chat history for “{deleteTarget.title}”.
              </div>
              {deleteError ? (
                <div style={{ fontSize: 12, color: '#7a2e2e' }}>{deleteError}</div>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(140, 92, 78, 0.35)',
                    background: 'rgba(255,255,255,0.8)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 12,
                    color: '#3b2b24',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(140, 92, 78, 0.5)',
                    background: 'rgba(226, 203, 190, 0.7)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 12,
                    color: '#3b2b24',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {renameTarget ? (
          <div
            onClick={() => setRenameTarget(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(21, 16, 12, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 80,
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(440px, 100%)',
                borderRadius: 18,
                border: '1px solid rgba(140, 92, 78, 0.35)',
                background: 'rgba(255,255,255,0.95)',
                padding: 18,
                boxShadow: '0 16px 36px rgba(18, 12, 10, 0.18)',
                display: 'grid',
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16 }}>Rename session</div>
              <input
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                placeholder="Session title"
                style={{
                  borderRadius: 10,
                  border: '1px solid rgba(95, 74, 62, 0.25)',
                  padding: 8,
                  fontSize: 13,
                  fontFamily: 'var(--font-sans)',
                }}
              />
              {renameError ? (
                <div style={{ fontSize: 12, color: '#7a2e2e' }}>{renameError}</div>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(140, 92, 78, 0.35)',
                    background: 'rgba(255,255,255,0.8)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 12,
                    color: '#3b2b24',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRename}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(140, 92, 78, 0.5)',
                    background: 'rgba(226, 203, 190, 0.7)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 12,
                    color: '#3b2b24',
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
}
