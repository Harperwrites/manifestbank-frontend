'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'

type LegalDocProps = {
  kind: 'terms' | 'privacy'
}

function parseLegal(text: string) {
  const lines = text.split('\n')
  const title = lines[0] ?? ''
  const effective = lines[1] ?? ''
  const body = lines.slice(2).join('\n').trim()
  return { title, effective, body }
}

export default function LegalDoc({ kind }: LegalDocProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await api.get('/legal/content')
        if (!active) return
        const text = kind === 'terms' ? res.data?.termsText : res.data?.privacyText
        setContent(typeof text === 'string' ? text : '')
      } catch (err: any) {
        if (!active) return
        const detail =
          err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Error'
        setError(detail)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [kind])

  const parsed = useMemo(() => (content ? parseLegal(content) : null), [content])

  return (
    <main style={{ maxWidth: 920, margin: '24px auto 60px', padding: '0 20px' }}>
      <section
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          borderRadius: 24,
          border: '1px solid rgba(95, 74, 62, 0.2)',
          padding: '28px 26px',
          boxShadow: '0 18px 40px rgba(0,0,0,0.12)',
          color: '#2b1b16',
        }}
      >
        {loading ? (
          <div>Loading…</div>
        ) : error ? (
          <div>Unable to load legal document: {error}</div>
        ) : parsed ? (
          <>
            <h1 style={{ fontFamily: 'var(--font-serif)', marginTop: 0 }}>{parsed.title}</h1>
            <p style={{ marginTop: 6, fontWeight: 600 }}>{parsed.effective}</p>
            <div style={{ marginTop: 18, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {parsed.body}
            </div>
          </>
        ) : (
          <div>Legal document unavailable.</div>
        )}
      </section>
    </main>
  )
}
