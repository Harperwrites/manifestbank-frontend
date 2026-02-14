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

function formatEntryDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value ?? ''
  return date.toLocaleDateString('en-US')
}

const SAVED_AFFIRMATION_TITLE = 'Saved affirmation'

export default function SavedAffirmationsPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<AffirmationsEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [carouselIndex, setCarouselIndex] = useState(0)

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
  const activeAffirmation = savedAffirmations[carouselIndex] ?? null
  const confirmDeleteEntry = useMemo(
    () => savedAffirmations.find((entry) => entry.id === confirmDeleteId) ?? null,
    [savedAffirmations, confirmDeleteId]
  )

  async function deleteEntry(entryId: number) {
    try {
      await api.delete(`/affirmations/${entryId}`)
      const res = await api.get('/affirmations')
      const list = Array.isArray(res.data) ? res.data : []
      setEntries(list)
      setCarouselIndex((prev) => Math.max(0, Math.min(prev, list.length - 1)))
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
          </div>
        </div>

        {loading ? null : savedAffirmations.length > 0 ? (
          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 22,
              border: '1px solid rgba(140, 92, 78, 0.35)',
              background: 'linear-gradient(135deg, rgba(182, 121, 103, 0.22), rgba(245, 236, 228, 0.95))',
              boxShadow: '0 18px 40px rgba(0,0,0,0.12)',
              width: 'min(520px, 92vw)',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setCarouselIndex((prev) =>
                    savedAffirmations.length ? (prev - 1 + savedAffirmations.length) % savedAffirmations.length : 0
                  )
                }
                style={{
                  borderRadius: 999,
                  border: '1px solid rgba(140, 92, 78, 0.35)',
                  background: 'rgba(255, 255, 255, 0.85)',
                  padding: '8px 14px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                aria-label="Previous affirmation"
              >
                ←
              </button>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#4a2f26',
                  textAlign: 'center',
                  flex: 1,
                }}
              >
                Saved Affirmation
              </div>
              <button
                type="button"
                onClick={() =>
                  setCarouselIndex((prev) =>
                    savedAffirmations.length ? (prev + 1) % savedAffirmations.length : 0
                  )
                }
                style={{
                  borderRadius: 999,
                  border: '1px solid rgba(140, 92, 78, 0.35)',
                  background: 'rgba(255, 255, 255, 0.85)',
                  padding: '8px 14px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                aria-label="Next affirmation"
              >
                →
              </button>
            </div>
            {activeAffirmation ? (
              <div
                style={{
                  display: 'grid',
                  justifyItems: 'center',
                  gap: 10,
                  padding: '12px 10px',
                  borderRadius: 18,
                  border: '1px solid rgba(95, 74, 62, 0.18)',
                  background: 'rgba(255, 255, 255, 0.92)',
                }}
              >
                <div
                  style={{
                    fontFamily: '"Playfair Display", "Cormorant Garamond", "Libre Baskerville", serif',
                    fontSize: 26,
                    fontWeight: 700,
                    color: 'rgba(122, 86, 72, 0.9)',
                    textAlign: 'center',
                    maxWidth: 520,
                    lineHeight: 1.4,
                    padding: '10px 16px',
                    borderRadius: 14,
                    background:
                      'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.7), rgba(255,255,255,0) 55%), radial-gradient(circle at 80% 30%, rgba(255,233,210,0.75), rgba(255,233,210,0) 60%), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.6), rgba(255,255,255,0) 55%)',
                    textShadow: '0 0 6px rgba(255, 236, 215, 0.7), 0 0 10px rgba(255, 236, 215, 0.5)',
                  }}
                >
                  {activeAffirmation.content.split(' ').map((word, index) => (
                    <div key={`${word}-${index}`}>{word}</div>
                  ))}
                </div>
                <div style={{ fontSize: 13, opacity: 0.7 }}>
                  {formatEntryDate(activeAffirmation.entry_date)}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <h1 style={{ marginTop: 16, fontFamily: 'var(--font-serif)', fontSize: 30 }}>
          Saved Affirmations
        </h1>
        <p style={{ marginTop: 6, opacity: 0.75 }}>Your saved daily affirmations in one place.</p>

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
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    {formatEntryDate(entry.entry_date)}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.85 }}>
                    {entry.content.length > 140 ? `${entry.content.slice(0, 140)}…` : entry.content}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(entry.id)}
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
      {confirmDeleteId !== null ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 10, 8, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: 16,
          }}
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            style={{
              width: 'min(480px, 92vw)',
              background: 'linear-gradient(160deg, rgba(217, 178, 161, 0.95), rgba(186, 140, 122, 0.97))',
              borderRadius: 20,
              padding: 22,
              boxShadow: '0 22px 55px rgba(56, 36, 25, 0.35)',
              border: '1px solid rgba(95, 74, 62, 0.25)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ fontWeight: 700, fontSize: 18, color: '#3b2a22' }}>Delete affirmation?</div>
            <div style={{ marginTop: 8, opacity: 0.85, color: '#3b2a22' }}>
              This will permanently remove the affirmation.
            </div>
            {confirmDeleteEntry ? (
              <div
                style={{
                  marginTop: 10,
                  fontWeight: 600,
                  color: '#4a2f26',
                  background: 'rgba(255, 255, 255, 0.65)',
                  border: '1px solid rgba(140, 92, 78, 0.35)',
                  borderRadius: 12,
                  padding: '8px 10px',
                }}
              >
                Saved affirmation – {confirmDeleteEntry.entry_date}
              </div>
            ) : null}
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  borderRadius: 999,
                  border: '1px solid rgba(95, 74, 62, 0.35)',
                  background: 'rgba(255, 255, 255, 0.8)',
                  padding: '10px 16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetId = confirmDeleteId
                  setConfirmDeleteId(null)
                  if (targetId !== null) {
                    await deleteEntry(targetId)
                  }
                }}
                style={{
                  borderRadius: 999,
                  border: '1px solid rgba(140, 92, 78, 0.6)',
                  background: 'linear-gradient(135deg, rgba(182, 121, 103, 0.95), rgba(146, 94, 78, 0.95))',
                  padding: '10px 16px',
                  fontWeight: 600,
                  color: '#fffaf7',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
