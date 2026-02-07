 'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { api } from '@/lib/api'
import { Container } from '@/app/components/ui'
import EtherNavbar from '@/app/components/EtherNavbar'

type EtherNotification = {
  id: number
  recipient_profile_id: number
  actor_profile_id: number
  kind: string
  post_id?: number | null
  comment_id?: number | null
  created_at: string
  read_at?: string | null
  actor_display_name?: string | null
  actor_avatar_url?: string | null
  message?: string | null
}

type SyncRequest = {
  id: number
  requester_profile_id: number
  target_profile_id: number
  status: string
  created_at: string
  requester_display_name?: string | null
  requester_avatar_url?: string | null
}

type MyLinePreview = {
  thread_id: number
  message: string | null
  created_at: string | null
  unread: boolean
}

export default function NotificationsPage() {
  const router = useRouter()
  const { me } = useAuth()
  const navRef = useRef<HTMLDivElement | null>(null)
  const [notifications, setNotifications] = useState<EtherNotification[]>([])
  const [syncRequests, setSyncRequests] = useState<SyncRequest[]>([])
  const [myLinePreviews, setMyLinePreviews] = useState<MyLinePreview[]>([])
  const [myLineLoading, setMyLineLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [showStickyChips, setShowStickyChips] = useState(false)
  const [etherStickyOpen, setEtherStickyOpen] = useState(false)
  const etherStickyRef = useRef<HTMLDivElement | null>(null)
  const etherStickyMenuRef = useRef<HTMLDivElement | null>(null)

  const unreadNotifications = useMemo(
    () => notifications.filter((note) => !note.read_at).length,
    [notifications]
  )
  const etherBadgeCount = unreadNotifications + syncRequests.length

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handle = () => {
      const navHeight = navRef.current?.getBoundingClientRect().height ?? 0
      setShowStickyChips(window.scrollY > navHeight + 6)
    }
    handle()
    window.addEventListener('scroll', handle, { passive: true })
    window.addEventListener('resize', handle)
    return () => {
      window.removeEventListener('scroll', handle)
      window.removeEventListener('resize', handle)
    }
  }, [])

  useEffect(() => {
    if (!me) return
    async function load() {
      try {
        setLoading(true)
        setMsg('')
        const [res, syncRes, profileRes] = await Promise.all([
          api.get('/ether/notifications'),
          api.get('/ether/sync/requests'),
          api.get('/ether/me-profile'),
        ])
        setNotifications(Array.isArray(res.data) ? res.data : [])
        setSyncRequests(Array.isArray(syncRes.data) ? syncRes.data : [])
        setProfile(profileRes.data)
        await api.post('/ether/notifications/mark-read')
      } catch (e: any) {
        setMsg(e?.response?.data?.detail ?? e?.message ?? 'Failed to load notifications')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [me])

  useEffect(() => {
    if (!me) return
    let canceled = false
    async function loadMyLine() {
      try {
        setMyLineLoading(true)
        const threadsRes = await api.get('/ether/threads')
        const threads = Array.isArray(threadsRes.data) ? threadsRes.data : []
        const results = await Promise.all(
          threads.map(async (thread: any) => {
            try {
              const messagesRes = await api.get(`/ether/threads/${thread.id}/messages`)
              const list = Array.isArray(messagesRes.data) ? messagesRes.data : []
              const last = list[list.length - 1]
              return {
                thread_id: thread.id,
                message: last?.content ?? null,
                created_at: last?.created_at ?? null,
                unread: false,
              } satisfies MyLinePreview
            } catch {
              return {
                thread_id: thread.id,
                message: null,
                created_at: null,
                unread: false,
              } satisfies MyLinePreview
            }
          })
        )
        if (canceled) return
        setMyLinePreviews(results)
      } finally {
        setMyLineLoading(false)
      }
    }
    loadMyLine()
    return () => {
      canceled = true
    }
  }, [me])

  function goBack() {
    if (typeof window === 'undefined') return
    const stored = window.sessionStorage.getItem('ether:return_to')
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { path?: string }
        if (parsed.path) {
          router.push(parsed.path)
          return
        }
      } catch {
        // ignore invalid storage
      }
    }
    router.push('/ether')
  }

  async function dismissNotification(notificationId: number) {
    try {
      await api.delete(`/ether/notifications/${notificationId}`)
      setNotifications((prev) => prev.filter((note) => note.id !== notificationId))
    } catch (e: any) {
      setMsg(e?.response?.data?.detail ?? e?.message ?? 'Failed to dismiss notification')
    }
  }

  function navigateToProfile(profileId: number) {
    router.push(`/ether/profile/${profileId}`)
  }

  async function updateSettings(next: any) {
    const res = await api.patch('/ether/me-profile', next)
    setProfile(res.data)
  }

  async function onAvatarSelect(file: File) {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post('/ether/upload/avatar', form)
    setProfile((prev: any) => (prev ? { ...prev, avatar_url: res.data.url } : prev))
  }

  return (
    <main style={{ minHeight: '100vh', padding: '24px 0 60px' }}>
      <div ref={navRef}>
        <EtherNavbar profile={profile} updateSettings={updateSettings} onAvatarSelect={onAvatarSelect} />
      </div>
      {showStickyChips ? (
        <div
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top) + 8px)',
            left: 12,
            zIndex: 1400,
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid rgba(140, 92, 78, 0.7)',
                background: 'linear-gradient(135deg, rgba(140, 92, 78, 0.35), rgba(245, 234, 226, 0.95))',
                cursor: 'pointer',
                fontWeight: 600,
                color: '#4a2f26',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 0 16px rgba(140, 92, 78, 0.45)',
              }}
            >
              ManifestBank™
              <span style={{ fontSize: 12, opacity: 0.7 }}>↗</span>
            </button>
          </div>
          <div ref={etherStickyRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setEtherStickyOpen((open) => !open)}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid rgba(140, 92, 78, 0.7)',
                background: 'linear-gradient(135deg, rgba(140, 92, 78, 0.35), rgba(245, 234, 226, 0.95))',
                cursor: 'pointer',
                fontWeight: 600,
                color: '#4a2f26',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 0 16px rgba(140, 92, 78, 0.45)',
              }}
            >
              The Ether™
              {etherBadgeCount ? (
                <span
                  style={{
                    minWidth: 16,
                    height: 16,
                    borderRadius: 999,
                    background: '#b67967',
                    color: '#fff',
                    fontSize: 11,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 5px',
                  }}
                >
                  {etherBadgeCount}
                </span>
              ) : null}
              <span style={{ fontSize: 12, opacity: 0.7 }}>▾</span>
            </button>
            {etherStickyOpen ? (
              <div
                ref={etherStickyMenuRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 10,
                  width: 320,
                  maxWidth: 'calc(100vw - 24px)',
                  borderRadius: 16,
                  border: '1px solid rgba(140, 92, 78, 0.45)',
                  background: 'linear-gradient(180deg, rgba(252, 245, 239, 0.98), rgba(226, 199, 181, 0.96))',
                  boxShadow: '0 18px 42px rgba(26, 18, 14, 0.24)',
                  padding: 12,
                  color: '#3b2b24',
                  zIndex: 99999,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13 }}>Notifications</div>
                {notifications.length === 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>No notifications yet.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    {notifications.slice(0, 4).map((note) => (
                      <div key={note.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ fontSize: 12 }}>{note.actor_display_name ?? 'Member'}</div>
                        <div style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.6 }}>
                          {new Date(note.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEtherStickyOpen(false)
                    router.push('/notifications')
                  }}
                  style={{
                    marginTop: 10,
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(140, 92, 78, 0.4)',
                    background: 'rgba(255, 255, 255, 0.75)',
                    fontWeight: 600,
                    color: '#4a2f26',
                    cursor: 'pointer',
                  }}
                >
                  View all notifications
                </button>
                <div style={{ height: 1, background: 'rgba(140, 92, 78, 0.25)', margin: '10px 0' }} />
                <div style={{ fontWeight: 700, fontSize: 13 }}>My Line</div>
                {myLineLoading ? (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>Loading messages…</div>
                ) : myLinePreviews.length === 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>No messages yet.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    {myLinePreviews.slice(0, 4).map((preview) => (
                      <div key={preview.thread_id} style={{ fontSize: 12, opacity: 0.8 }}>
                        {preview.message ?? `Thread #${preview.thread_id}`}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEtherStickyOpen(false)
                    router.push('/myline')
                  }}
                  style={{
                    marginTop: 10,
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(140, 92, 78, 0.4)',
                    background: 'rgba(255, 255, 255, 0.75)',
                    fontWeight: 600,
                    color: '#4a2f26',
                    cursor: 'pointer',
                  }}
                >
                  View all messages
                </button>
                <div style={{ height: 1, background: 'rgba(140, 92, 78, 0.25)', margin: '10px 0' }} />
                <div style={{ fontWeight: 700, fontSize: 13 }}>In Sync Requests</div>
                {syncRequests.length === 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>No requests.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    {syncRequests.slice(0, 4).map((req) => (
                      <div key={req.id} style={{ fontSize: 12 }}>
                        {req.requester_display_name || `Profile #${req.requester_profile_id}`}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEtherStickyOpen(false)
                    router.push('/sync?tab=requests')
                  }}
                  style={{
                    marginTop: 10,
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(140, 92, 78, 0.4)',
                    background: 'rgba(255, 255, 255, 0.75)',
                    fontWeight: 600,
                    color: '#4a2f26',
                    cursor: 'pointer',
                  }}
                >
                  View all requests
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <Container>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={goBack}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid rgba(95, 74, 62, 0.35)',
              background: 'rgba(248, 242, 235, 0.96)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
              color: '#3b2b24',
            }}
          >
            ← Back
          </button>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, margin: 0 }}>Notifications</h1>
        </div>
        {msg ? <div style={{ marginTop: 10, fontSize: 12, color: '#6f4a3a' }}>{msg}</div> : null}
        <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
          {loading ? (
            <div style={{ fontSize: 13, opacity: 0.75 }}>Loading notifications…</div>
          ) : notifications.length === 0 ? (
            <div style={{ fontSize: 13, opacity: 0.75 }}>No notifications yet.</div>
          ) : (
            notifications.map((note) => (
              <div
                key={note.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 14,
                  border: '1px solid rgba(182, 121, 103, 0.35)',
                  background: note.read_at ? 'rgba(255,255,255,0.85)' : 'rgba(182, 121, 103, 0.12)',
                }}
              >
                <button
                  type="button"
                  onClick={() => navigateToProfile(note.actor_profile_id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 0,
                    color: 'inherit',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: '1px solid rgba(95, 74, 62, 0.25)',
                      background: 'rgba(255,255,255,0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {note.actor_avatar_url ? (
                      <img
                        src={note.actor_avatar_url}
                        alt={note.actor_display_name ?? 'Member'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span>{note.actor_display_name?.slice(0, 1)?.toUpperCase() ?? '◎'}</span>
                    )}
                  </div>
                  <div style={{ display: 'grid' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {note.actor_display_name ?? 'Member'}
                    </span>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>
                      {note.kind === 'post_align'
                        ? 'Aligned with your post'
                        : note.kind === 'post_comment'
                        ? 'Commented on your post'
                        : note.kind === 'comment_align'
                        ? 'Aligned with a comment on your post'
                        : note.kind === 'sync_approved'
                        ? 'Accepted your sync request'
                        : 'Activity on your post'}
                    </span>
                  </div>
                </button>
                {note.post_id ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.sessionStorage.setItem(
                          'ether:last_view',
                          JSON.stringify({ path: window.location.pathname + window.location.search })
                        )
                        window.sessionStorage.setItem('ether:focus_post', String(note.post_id))
                        window.sessionStorage.setItem('ether:focus_post_open_comments', '1')
                        if (note.comment_id) {
                          window.sessionStorage.setItem('ether:focus_comment', String(note.comment_id))
                        }
                      }
                      window.location.href = '/ether'
                    }}
                    style={{
                      marginLeft: 'auto',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 12,
                      opacity: 0.8,
                      textDecoration: 'underline',
                      textUnderlineOffset: 2,
                    }}
                  >
                    View post
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => dismissNotification(note.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 14,
                    opacity: 0.6,
                    lineHeight: 1,
                  }}
                  aria-label="Dismiss notification"
                >
                  ×
                </button>
                <div style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.6 }}>
                  {new Date(note.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </Container>
    </main>
  )
}
