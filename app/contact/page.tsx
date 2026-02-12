'use client'

import { useState } from 'react'
import Navbar from '@/app/components/Navbar'
import { api } from '@/lib/api'

function toast(message: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('auth:logged_out', { detail: { message } }))
}

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('Please complete all fields.')
      return
    }
    setSending(true)
    setError('')
    try {
      await api.post('/contact', {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      })
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
      toast("Thanks — we'll be in touch soon.")
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Unable to send message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main>
      <Navbar />
      <section style={{ maxWidth: 820, margin: '0 auto', padding: '40px 20px 80px' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32 }}>Contact us</div>
        <p style={{ marginTop: 8, opacity: 0.75 }}>
          Send us a note and we&apos;ll get back to you as soon as possible.
        </p>

        {error ? <div style={{ marginTop: 12, color: '#7a2e2e' }}>{error}</div> : null}

        <div style={{ marginTop: 20, display: 'grid', gap: 14 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="mb-placeholder"
            style={{
              borderRadius: 12,
              border: '1px solid rgba(95, 74, 62, 0.28)',
              padding: '12px 14px',
              fontSize: 14,
              background: 'rgba(255, 255, 255, 0.9)',
            }}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            className="mb-placeholder"
            style={{
              borderRadius: 12,
              border: '1px solid rgba(95, 74, 62, 0.28)',
              padding: '12px 14px',
              fontSize: 14,
              background: 'rgba(255, 255, 255, 0.9)',
            }}
          />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="mb-placeholder"
            style={{
              borderRadius: 12,
              border: '1px solid rgba(95, 74, 62, 0.28)',
              padding: '12px 14px',
              fontSize: 14,
              background: 'rgba(255, 255, 255, 0.9)',
            }}
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="How can we help?"
            className="mb-placeholder"
            style={{
              borderRadius: 12,
              border: '1px solid rgba(95, 74, 62, 0.28)',
              padding: '12px 14px',
              fontSize: 14,
              minHeight: 180,
              background: 'rgba(255, 255, 255, 0.9)',
            }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={sending}
            style={{
              borderRadius: 999,
              border: '1px solid rgba(130, 92, 78, 0.6)',
              background: 'linear-gradient(135deg, rgba(210, 165, 145, 0.85), rgba(182, 121, 103, 0.95))',
              padding: '10px 16px',
              fontWeight: 700,
              color: '#fffaf7',
              cursor: 'pointer',
              width: 'fit-content',
            }}
          >
            {sending ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </section>
    </main>
  )
}
