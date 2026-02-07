 'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { api } from '@/lib/api'
import { Container } from '@/app/components/ui'

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

export default function NotificationsPage() {
  const router = useRouter()
  const { me } = useAuth()
  const [notifications, setNotifications] = useState<EtherNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!me) return
    async function load() {
      try {
        setLoading(true)
        setMsg('')
        const res = await api.get('/ether/notifications')
        setNotifications(Array.isArray(res.data) ? res.data : [])
        await api.post('/ether/notifications/mark-read')
      } catch (e: any) {
        setMsg(e?.response?.data?.detail ?? e?.message ?? 'Failed to load notifications')
      } finally {
        setLoading(false)
      }
    }
    load()
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

  return (
    <main style={{ minHeight: '100vh', padding: '24px 0 60px' }}>
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
