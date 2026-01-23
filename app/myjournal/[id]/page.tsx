'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { api } from '@/lib/api'

const buttonStyle: CSSProperties = {
  borderRadius: 999,
  border: '1px solid rgba(95, 74, 62, 0.35)',
  background: 'rgba(255, 255, 255, 0.75)',
  padding: '10px 16px',
  fontWeight: 600,
  cursor: 'pointer',
}

const inputStyle: CSSProperties = {
  width: '100%',
  borderRadius: 12,
  border: '1px solid rgba(95, 74, 62, 0.28)',
  padding: '10px 12px',
  fontSize: 14,
  background: 'rgba(255, 255, 255, 0.9)',
}

const fieldLabelStyle: CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  opacity: 0.7,
  marginBottom: 6,
}

const cardStyle: CSSProperties = {
  borderRadius: 20,
  padding: 24,
  border: '1px solid rgba(95, 74, 62, 0.2)',
  background: 'linear-gradient(160deg, rgba(217, 178, 161, 0.92), rgba(198, 159, 143, 0.94))',
  boxShadow: '0 22px 55px rgba(56, 36, 25, 0.35)',
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

export default function JournalEntryPage() {
  const router = useRouter()
  const params = useParams()
  const entryId = useMemo(() => Number(params?.id), [params])

  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  const [draftTitle, setDraftTitle] = useState('')
  const [draftDate, setDraftDate] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [draftImageUrl, setDraftImageUrl] = useState('')
  const [draftImageFile, setDraftImageFile] = useState<File | null>(null)

  useEffect(() => {
    if (!entryId || Number.isNaN(entryId)) {
      setError('Invalid journal entry.')
      setLoading(false)
      return
    }
    loadEntry(entryId)
  }, [entryId])

  function loadEntry(id: number) {
    setLoading(true)
    setError('')
    api
      .get(`/journal/${id}`)
      .then((res) => {
        setEntry(res.data)
        setDraftTitle(res.data?.title ?? '')
        setDraftDate(res.data?.entry_date ?? '')
        setDraftContent(res.data?.content ?? '')
        setDraftImageUrl(res.data?.image_url ?? '')
      })
      .catch((err) => {
        setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to load entry.')
      })
      .finally(() => setLoading(false))
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

  async function saveEdits() {
    if (!entry) return
    if (!draftTitle.trim() || !draftDate.trim() || !draftContent.trim()) {
      setError('Please fill in title, date, and entry text.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const imageUrl = await uploadImageIfNeeded()
      const res = await api.put(`/journal/${entry.id}`, {
        title: draftTitle.trim(),
        entry_date: draftDate,
        content: draftContent.trim(),
        image_url: imageUrl,
      })
      setEntry(res.data)
      setDraftImageUrl(res.data?.image_url ?? '')
      setDraftImageFile(null)
      setEditing(false)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to save entry.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--page-bg)' }}>
      <Navbar showAccountsDropdown />
      <section style={{ maxWidth: 980, margin: '0 auto', padding: '32px 20px 80px' }}>
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

        {loading ? (
          <div style={{ marginTop: 18, opacity: 0.7 }}>Loading entry…</div>
        ) : error ? (
          <div style={{ marginTop: 18, color: '#7a2e2e' }}>{error}</div>
        ) : entry ? (
          <div style={{ marginTop: 20, ...cardStyle }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 13, opacity: 0.75 }}>{entry.entry_date}</div>
                <h1 style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: 30 }}>{entry.title}</h1>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setEditing((value) => !value)}
                  style={{
                    ...buttonStyle,
                    background: 'rgba(255,255,255,0.88)',
                  }}
                >
                  {editing ? 'Cancel' : 'Edit'}
                </button>
                {editing ? (
                  <button
                    type="button"
                    onClick={saveEdits}
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
                ) : null}
              </div>
            </div>

            {editing ? (
              <div style={{ marginTop: 20, display: 'grid', gap: 14 }}>
                <div>
                  <div style={fieldLabelStyle}>Entry Title</div>
                  <input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    style={inputStyle}
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
                    style={{ ...inputStyle, minHeight: 200, resize: 'vertical' }}
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
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 20, display: 'grid', gap: 16 }}>
                <div style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.content}</div>
                {entry.image_url ? (
                  <img
                    src={entry.image_url}
                    alt={entry.title}
                    style={{ width: '100%', borderRadius: 16, objectFit: 'cover' }}
                  />
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </section>
    </main>
  )
}
