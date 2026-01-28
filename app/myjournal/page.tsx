'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  const [draftImageName, setDraftImageName] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [etherNoticeCount, setEtherNoticeCount] = useState(0)
  const [etherNoticeLoaded, setEtherNoticeLoaded] = useState(false)
  const journalNavRef = useRef<HTMLDivElement | null>(null)
  const [etherPortalVisible, setEtherPortalVisible] = useState(false)

  function getThreadReadAt(threadId: number) {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(`ether:thread_read:${threadId}`)
  }

  async function countUnreadThreads(profileId: number | null) {
    if (!profileId) return 0
    try {
      const threadsRes = await api.get('/ether/threads')
      const threads = Array.isArray(threadsRes.data) ? threadsRes.data : []
      if (!threads.length) return 0
      const results = await Promise.allSettled(
        threads.map(async (thread: any) => {
          try {
            const messagesRes = await api.get(`/ether/threads/${thread.id}/messages`)
            const list = Array.isArray(messagesRes.data) ? messagesRes.data : []
            const last = list[list.length - 1]
            if (!last) return 0
            const readAt = getThreadReadAt(thread.id)
            const isUnread =
              last.sender_profile_id !== profileId &&
              (!readAt || new Date(last.created_at).getTime() > new Date(readAt).getTime())
            return isUnread ? 1 : 0
          } catch {
            return 0
          }
        })
      )
      return results.reduce((sum, res) => (res.status === 'fulfilled' ? sum + res.value : sum), 0)
    } catch {
      return 0
    }
  }

  useEffect(() => {
    loadEntries()
    loadMe()
  }, [])

  async function loadMe() {
    try {
      const res = await api.get('/auth/me')
      const verified = Boolean(res.data?.email_verified)
      setIsVerified(verified)
      if (verified) {
        loadProfile().catch(() => {})
        loadEtherNoticeCount().catch(() => {})
      } else {
        setProfile(null)
      }
    } catch {
      setIsVerified(false)
    }
  }

  async function loadProfile() {
    try {
      const res = await api.get('/ether/me-profile')
      setProfile(res.data)
    } catch {
      setProfile(null)
    }
  }

  async function loadEtherNoticeCount() {
    if (etherNoticeLoaded) return
    try {
      const [notesRes, syncRes] = await Promise.allSettled([
        api.get('/ether/notifications'),
        api.get('/ether/sync/requests'),
      ])
      const list = notesRes.status === 'fulfilled' ? notesRes.value.data : []
      const syncs = syncRes.status === 'fulfilled' ? syncRes.value.data : []
      const unread = Array.isArray(list) ? list.filter((item: any) => !item?.read_at).length : 0
      let profileId = profile?.id ?? null
      if (!profileId) {
        try {
          const profileRes = await api.get('/ether/me-profile')
          profileId = profileRes.data?.id ?? null
        } catch {
          profileId = null
        }
      }
      const myLineUnread = await countUnreadThreads(profileId)
      setEtherNoticeCount(unread + (Array.isArray(syncs) ? syncs.length : 0) + myLineUnread)
    } catch {
      setEtherNoticeCount(0)
    } finally {
      setEtherNoticeLoaded(true)
    }
  }

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
    setDraftImageName(null)
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

  useEffect(() => {
    const target = journalNavRef.current
    if (!target) return
    const updateVisibility = () => {
      if (!journalNavRef.current) return
      const rect = journalNavRef.current.getBoundingClientRect()
      setEtherPortalVisible(rect.bottom <= 0)
    }
    updateVisibility()
    if (typeof IntersectionObserver === 'undefined') {
      window.addEventListener('scroll', updateVisibility)
      window.addEventListener('resize', updateVisibility)
      return () => {
        window.removeEventListener('scroll', updateVisibility)
        window.removeEventListener('resize', updateVisibility)
      }
    }
    const observer = new IntersectionObserver(() => updateVisibility(), { threshold: 0 })
    observer.observe(target)
    window.addEventListener('scroll', updateVisibility)
    window.addEventListener('resize', updateVisibility)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', updateVisibility)
      window.removeEventListener('resize', updateVisibility)
    }
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--page-bg)' }}>
      <div ref={journalNavRef}>
        <Navbar showAccountsDropdown />
      </div>
      {isVerified && etherPortalVisible ? (
        <div
          className="ether-portal-chip"
          style={{
            zIndex: 1400,
            display: 'grid',
            gap: 8,
          }}
        >
          <Link href="/ether" style={{ textDecoration: 'none' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid rgba(140, 92, 78, 0.7)',
                background: 'linear-gradient(135deg, rgba(140, 92, 78, 0.35), rgba(245, 234, 226, 0.95))',
                boxShadow: '0 0 16px rgba(140, 92, 78, 0.45)',
                color: '#4a2f26',
                fontWeight: 700,
                letterSpacing: 0.2,
                maxWidth: 'calc(100vw - 24px)',
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  border: '1px solid rgba(95, 74, 62, 0.35)',
                  background: 'rgba(255,255,255,0.95)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: 12 }}>
                    {profile?.display_name?.slice(0, 1)?.toUpperCase() ?? '◎'}
                  </span>
                )}
              </span>
              Enter The Ether™
              {etherNoticeCount > 0 ? (
                <span
                  style={{
                    minWidth: 18,
                    height: 18,
                    borderRadius: 999,
                    background: '#b67967',
                    color: '#fff',
                    fontSize: 11,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 6px',
                    boxShadow: '0 0 10px rgba(182, 121, 103, 0.65)',
                    marginLeft: 2,
                  }}
                >
                  {etherNoticeCount}
                </span>
              ) : null}
            </span>
          </Link>
        </div>
      ) : null}
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
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      setDraftImageFile(file)
                      setDraftImageName(file?.name ?? null)
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
                {draftImageName ? (
                  <span
                    style={{
                      marginLeft: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#6b3f2b',
                      textShadow: '0 0 10px rgba(222, 176, 155, 0.7)',
                    }}
                  >
                    {draftImageName}
                  </span>
                ) : null}
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
