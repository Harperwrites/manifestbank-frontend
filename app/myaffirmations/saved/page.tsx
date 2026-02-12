'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { api } from '@/lib/api'

type AffirmationsEntry = {
  id: number
  title: string
  entry_date: string
  content: string
  image_url?: string | null
  created_at: string
  updated_at: string
}

const SAVED_AFFIRMATION_TITLE = 'Saved affirmation'

export default function SavedAffirmationsPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<AffirmationsEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    api
      .get('/affirmations')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : []
        setEntries(list)
      })
      .catch((err) => {
        setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to load affirmations.')
      })
      .finally(() => setLoading(false))
  }, [])

  const savedAffirmations = useMemo(
    () =>
      entries
        .filter((entry) => entry.title === SAVED_AFFIRMATION_TITLE)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [entries]
  )

  return (
    <main>
      <Navbar />
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                borderRadius: 999,
                border: '1px solid rgba(95, 74, 62, 0.35)',
                background: 'transparent',
                padding: '10px 16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
            <h1 style={{ marginTop: 16, fontFamily: 'var(--font-serif)', fontSize: 30 }}>
              Saved Affirmations
            </h1>
            <p style={{ marginTop: 6, opacity: 0.75 }}>Your saved daily affirmations in one place.</p>
          </div>
        </div>

        {error ? <div style={{ marginTop: 18, color: '#7a2e2e' }}>{error}</div> : null}

        <div
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {loading ? (
            <div style={{ opacity: 0.7 }}>Loading affirmations…</div>
          ) : savedAffirmations.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No saved affirmations yet.</div>
          ) : (
            savedAffirmations.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => router.push(`/myaffirmations/${entry.id}`)}
                style={{
                  textAlign: 'left',
                  borderRadius: 16,
                  padding: 16,
                  border: '1px solid rgba(95, 74, 62, 0.2)',
                  background: 'rgba(255, 255, 255, 0.85)',
                  cursor: 'pointer',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{entry.entry_date}</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  {entry.content.length > 140 ? `${entry.content.slice(0, 140)}…` : entry.content}
                </div>
              </button>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
