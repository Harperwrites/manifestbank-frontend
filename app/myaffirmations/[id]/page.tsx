'use client'

export const runtime = 'edge'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import { api } from '@/lib/api'

function toast(message: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('auth:logged_out', { detail: { message } }))
}

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

type AffirmationsEntry = {
  id: number
  title: string
  entry_date: string
  content: string
  image_url?: string | null
  created_at: string
  updated_at: string
}

export default function AffirmationsEntryPage() {
  const router = useRouter()
  const params = useParams()
  const entryId = useMemo(() => Number(params?.id), [params])

  const [entry, setEntry] = useState<AffirmationsEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [etherNoticeCount, setEtherNoticeCount] = useState(0)
  const [etherNoticeLoaded, setEtherNoticeLoaded] = useState(false)
  const affirmationNavRef = useRef<HTMLDivElement | null>(null)
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

  const [draftTitle, setDraftTitle] = useState('')
  const [draftDate, setDraftDate] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [draftImageUrl, setDraftImageUrl] = useState('')
  const [draftImageFile, setDraftImageFile] = useState<File | null>(null)

  useEffect(() => {
    if (!entryId || Number.isNaN(entryId)) {
      setError('Invalid affirmation entry.')
      setLoading(false)
      return
    }
    loadEntry(entryId)
    loadMe()
  }, [entryId])

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

  function loadEntry(id: number) {
    setLoading(true)
    setError('')
    api
      .get(`/affirmations/${id}`)
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
    const res = await api.post('/affirmations/upload-image', body, {
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
      const res = await api.put(`/affirmations/${entry.id}`, {
        title: draftTitle.trim(),
        entry_date: draftDate,
        content: draftContent.trim(),
        image_url: imageUrl,
      })
      setEntry(res.data)
      setDraftImageUrl(res.data?.image_url ?? '')
      setDraftImageFile(null)
      setEditing(false)
      toast('Affirmation updated.')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to save entry.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry(entryId: number) {
    try {
      await api.delete(`/affirmations/${entryId}`)
      toast('Affirmation deleted.')
      router.push('/myaffirmations')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to delete entry.')
    }
  }

  useEffect(() => {
    const target = affirmationNavRef.current
    if (!target) return
    const updateVisibility = () => {
      if (!affirmationNavRef.current) return
      const rect = affirmationNavRef.current.getBoundingClientRect()
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
      <div ref={affirmationNavRef}>
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
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    ...buttonStyle,
                    borderColor: 'rgba(140, 92, 78, 0.45)',
                    background: 'rgba(255,255,255,0.88)',
                  }}
                >
                  Delete
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
      {confirmDelete && entry ? (
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
          onClick={() => setConfirmDelete(false)}
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
              {entry.title}
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                style={{
                  ...buttonStyle,
                  background: 'rgba(255,255,255,0.8)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmDelete(false)
                  await deleteEntry(entry.id)
                }}
                style={{
                  ...buttonStyle,
                  border: '1px solid rgba(140, 92, 78, 0.6)',
                  background: 'linear-gradient(135deg, rgba(182, 121, 103, 0.95), rgba(146, 94, 78, 0.95))',
                  color: '#fffaf7',
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
