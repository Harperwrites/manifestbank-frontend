'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { api } from '@/lib/api'

function toast(message: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('auth:logged_out', { detail: { message } }))
}

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

  async function deleteEntry(entryId: number) {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('Delete this saved affirmation? This cannot be undone.')
      if (!ok) return
    }
    try {
      await api.delete(`/affirmations/${entryId}`)
      const res = await api.get('/affirmations')
      const list = Array.isArray(res.data) ? res.data : []
      setEntries(list)
      toast('Affirmation deleted.')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to delete entry.')
    }
  }

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
              <div
                key={entry.id}
                style={{
                  textAlign: 'left',
                  borderRadius: 16,
                  padding: 16,
                  border: '1px solid rgba(95, 74, 62, 0.2)',
                  background: 'rgba(255, 255, 255, 0.85)',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.05)',
                  position: 'relative',
                }}
              >
                <button
                  type="button"
                  onClick={() => router.push(`/myaffirmations/${entry.id}`)}
                  style={{
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{entry.entry_date}</div>
                  <div style={{ fontSize: 13, opacity: 0.85 }}>
                    {entry.content.length > 140 ? `${entry.content.slice(0, 140)}…` : entry.content}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => deleteEntry(entry.id)}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    borderRadius: 999,
                    border: '1px solid rgba(140, 92, 78, 0.4)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
