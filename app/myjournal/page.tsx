'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { api } from '@/lib/api'

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 10, 8, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 99999,
  padding: 16,
}

const modalStyle: CSSProperties = {
  width: 'min(720px, 92vw)',
  background: 'linear-gradient(160deg, rgba(217, 178, 161, 0.92), rgba(198, 159, 143, 0.94))',
  borderRadius: 20,
  padding: 22,
  boxShadow: '0 22px 55px rgba(56, 36, 25, 0.35)',
  border: '1px solid rgba(95, 74, 62, 0.25)',
}

const fieldLabelStyle: CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  opacity: 0.7,
  marginBottom: 6,
}

const inputStyle: CSSProperties = {
  width: '100%',
  borderRadius: 12,
  border: '1px solid rgba(95, 74, 62, 0.28)',
  padding: '10px 12px',
  fontSize: 14,
  background: 'rgba(255, 255, 255, 0.9)',
}

const buttonStyle: CSSProperties = {
  borderRadius: 999,
  border: '1px solid rgba(95, 74, 62, 0.35)',
  background: 'rgba(255, 255, 255, 0.75)',
  padding: '10px 16px',
  fontWeight: 600,
  cursor: 'pointer',
}

type JournalEntry = {
  id: number
  title: string
  entry_date: string
  content: string
  image_url?: string | null
  created_at: string
  updated_at: string
}

export default function MyJournalPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newEntryOpen, setNewEntryOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [draftTitle, setDraftTitle] = useState('')
  const [draftDate, setDraftDate] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [draftImageUrl, setDraftImageUrl] = useState('')
  const [draftImageFile, setDraftImageFile] = useState<File | null>(null)

  useEffect(() => {
    loadEntries()
  }, [])

  function loadEntries() {
    setLoading(true)
    setError('')
    api
      .get('/journal')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : []
        setEntries(list)
      })
      .catch((err) => {
        setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to load journal entries')
      })
      .finally(() => setLoading(false))
  }

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  }, [entries])

  function resetDraft() {
    setDraftTitle('')
    setDraftDate('')
    setDraftContent('')
    setDraftImageUrl('')
    setDraftImageFile(null)
  }

  function openNewEntry() {
    resetDraft()
    setNewEntryOpen(true)
  }

  function closeModal() {
    setNewEntryOpen(false)
    resetDraft()
  }

  async function uploadImageIfNeeded(): Promise<string | null> {
    if (!draftImageFile) return draftImageUrl || null
    const body = new FormData()
    body.append('file', draftImageFile)
    const res = await api.post('/journal/upload-image', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data?.url ?? null
  }

  async function saveEntry() {
    if (!draftTitle.trim() || !draftDate.trim() || !draftContent.trim()) {
      setError('Please fill in title, date, and entry text.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const imageUrl = await uploadImageIfNeeded()
      await api.post('/journal', {
        title: draftTitle.trim(),
        entry_date: draftDate,
        content: draftContent.trim(),
        image_url: imageUrl,
      })
      await refreshAfterSave()
      closeModal()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to save entry.')
    } finally {
      setSaving(false)
    }
  }

  async function refreshAfterSave() {
    const res = await api.get('/journal')
    const list = Array.isArray(res.data) ? res.data : []
    setEntries(list)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--page-bg)' }}>
      <Navbar showAccountsDropdown />
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                ...buttonStyle,
                background: 'transparent',
              }}
            >
              ← Back
            </button>
            <h1 style={{ marginTop: 16, fontFamily: 'var(--font-serif)', fontSize: 30 }}>My Journal</h1>
            <p style={{ marginTop: 6, opacity: 0.75 }}>Capture your reflections, milestones, and daily wins.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" onClick={openNewEntry} style={buttonStyle}>
              New Entry
            </button>
          </div>
        </div>

        {error ? (
          <div style={{ marginTop: 18, color: '#7a2e2e' }}>{error}</div>
        ) : null}

        <div
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {loading ? (
            <div style={{ opacity: 0.7 }}>Loading entries…</div>
          ) : sortedEntries.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No journal entries yet.</div>
          ) : (
            sortedEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => router.push(`/myjournal/${entry.id}`)}
                style={{
                  textAlign: 'left',
                  borderRadius: 16,
                  padding: 16,
                  border: '1px solid rgba(95, 74, 62, 0.2)',
                  background: 'rgba(255, 255, 255, 0.75)',
                  cursor: 'pointer',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{entry.title}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{entry.entry_date}</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  {entry.content.length > 120 ? `${entry.content.slice(0, 120)}…` : entry.content}
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      {newEntryOpen && (
        <div style={overlayStyle} onClick={closeModal}>
          <div
            style={modalStyle}
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 18 }}>New Journal Entry</div>
              <button type="button" onClick={closeModal} style={{ ...buttonStyle, padding: '6px 12px' }}>
                Close
              </button>
            </div>

            <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
              <div>
                <div style={fieldLabelStyle}>Entry Title</div>
                <input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  style={inputStyle}
                  placeholder="Name this entry"
                />
              </div>
              <div>
                <div style={fieldLabelStyle}>Entry Date</div>
                <input
                  type="date"
                  value={draftDate}
                  onChange={(event) => setDraftDate(event.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={fieldLabelStyle}>Your Entry</div>
                <textarea
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                  style={{ ...inputStyle, minHeight: 160, resize: 'vertical' }}
                  placeholder="Write your entry here..."
                />
              </div>
              <div>
                <div style={fieldLabelStyle}>Photo</div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...buttonStyle }}>
                  Choose File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setDraftImageFile(event.target.files?.[0] ?? null)}
                    style={{ display: 'none' }}
                  />
                </label>
                {draftImageUrl ? (
                  <div style={{ marginTop: 10 }}>
                    <img
                      src={draftImageUrl}
                      alt="Journal"
                      style={{ width: '100%', borderRadius: 12, objectFit: 'cover' }}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={saveEntry}
                style={{
                  ...buttonStyle,
                  background: 'rgba(146, 102, 84, 0.9)',
                  color: '#fff',
                  border: 'none',
                }}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
