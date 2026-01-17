'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'

export type Me = {
  id: number
  email: string
  username?: string | null
  role: string
  is_active: boolean
  welcome_bonus_claimed?: boolean | null
  email_verified?: boolean | null
}

type AuthContextValue = {
  me: Me | null
  isLoading: boolean
  refreshMe: () => Promise<void>
  loginWithToken: (token: string) => Promise<void>
  logout: () => void
}

type NotificationToast = {
  id: string
  title: string
  detail: string
  avatarUrl?: string | null
  profileId?: number | null
  createdAt?: string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [notificationToasts, setNotificationToasts] = useState<NotificationToast[]>([])
  const [notificationsPrimed, setNotificationsPrimed] = useState(false)

  async function refreshMe() {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setMe(null)
      delete api.defaults.headers.common.Authorization
      return
    }

    try {
      api.defaults.headers.common.Authorization = `Bearer ${token}`
      const res = await api.get('/auth/me')
      setMe(res.data)
    } catch {
      localStorage.removeItem('access_token')
      delete api.defaults.headers.common.Authorization
      setMe(null)
    }
  }

  async function loginWithToken(token: string) {
    localStorage.setItem('access_token', token)
    api.defaults.headers.common.Authorization = `Bearer ${token}`
    await refreshMe()
  }

  function logout() {
    localStorage.removeItem('access_token')
    delete api.defaults.headers.common.Authorization
    setMe(null)
    // no router here; pages decide where to redirect
  }

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)
      await refreshMe()
      setIsLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let active = true
    if (typeof window === 'undefined') return
    api
      .get('/health')
      .catch(() => {})
      .finally(() => {
        if (!active) return
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const stored = sessionStorage.getItem('toast:message')
    if (stored) {
      setToast(stored)
      sessionStorage.removeItem('toast:message')
    }

    function handleToastEvent(event: Event) {
      const detail = (event as CustomEvent<{ message?: string }>).detail
      if (detail?.message) {
        setToast(detail.message)
      } else {
        setToast('You were logged out. Please sign in again.')
      }
    }

    window.addEventListener('auth:logged_out', handleToastEvent)
    return () => window.removeEventListener('auth:logged_out', handleToastEvent)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!me || !me.email_verified) return
    let active = true

    function loadSeen(key: string) {
      if (typeof window === 'undefined') return new Set<string>()
      try {
        const raw = window.sessionStorage.getItem(key)
        if (!raw) return new Set<string>()
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return new Set(parsed.map(String))
      } catch {
        // ignore
      }
      return new Set<string>()
    }

    function saveSeen(key: string, values: Set<string>) {
      if (typeof window === 'undefined') return
      window.sessionStorage.setItem(key, JSON.stringify(Array.from(values)))
    }

    function pushToastItem(item: NotificationToast) {
      setNotificationToasts((prev) => [...prev, item])
      window.setTimeout(() => {
        setNotificationToasts((prev) => prev.filter((t) => t.id !== item.id))
      }, 6000)
    }

    async function poll(initial = false) {
      try {
        const [notificationsRes, syncRes] = await Promise.all([
          api.get('/ether/notifications'),
          api.get('/ether/sync/requests'),
        ])
        if (!active) return

        const notifications = Array.isArray(notificationsRes.data) ? notificationsRes.data : []
        const syncRequests = Array.isArray(syncRes.data) ? syncRes.data : []

        const seenNotifications = loadSeen('ether:seen_notifications')
        const seenSyncs = loadSeen('ether:seen_sync_requests')

        if (!notificationsPrimed || initial) {
          notifications.forEach((n: any) => seenNotifications.add(String(n.id)))
          syncRequests.forEach((r: any) => seenSyncs.add(String(r.id)))
          saveSeen('ether:seen_notifications', seenNotifications)
          saveSeen('ether:seen_sync_requests', seenSyncs)
          if (!notificationsPrimed) setNotificationsPrimed(true)
          return
        }

        notifications.forEach((n: any) => {
          const id = String(n.id)
          if (seenNotifications.has(id)) return
          seenNotifications.add(id)
          const detail =
            n.kind === 'post_align'
              ? 'Aligned with your post'
              : n.kind === 'post_comment'
              ? 'Commented on your post'
              : n.kind === 'comment_align'
              ? 'Aligned with a comment on your post'
              : n.kind === 'sync_approved'
              ? 'Accepted your sync request'
              : 'New activity'
          pushToastItem({
            id: `notif-${id}`,
            title: n.actor_display_name ?? 'Member',
            detail,
            avatarUrl: n.actor_avatar_url,
            profileId: n.actor_profile_id,
            createdAt: n.created_at,
          })
        })

        syncRequests.forEach((r: any) => {
          const id = String(r.id)
          if (seenSyncs.has(id)) return
          seenSyncs.add(id)
          pushToastItem({
            id: `sync-${id}`,
            title: r.requester_display_name || `Profile #${r.requester_profile_id}`,
            detail: 'Sent a sync request',
            avatarUrl: r.requester_avatar_url,
            profileId: r.requester_profile_id,
            createdAt: r.created_at,
          })
        })

        saveSeen('ether:seen_notifications', seenNotifications)
        saveSeen('ether:seen_sync_requests', seenSyncs)
      } catch {
        // ignore
      }
    }

    poll(true)
    const interval = window.setInterval(() => poll(false), 30000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [me, me?.email_verified, notificationsPrimed])

  const value = useMemo(
    () => ({ me, isLoading, refreshMe, loginWithToken, logout }),
    [me, isLoading]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      {toast ? (
        <div
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid rgba(95, 74, 62, 0.25)',
            background: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 16px 32px rgba(0,0,0,0.18)',
            fontSize: 13,
            zIndex: 1000,
          }}
        >
          {toast}
        </div>
      ) : null}
      {notificationToasts.length ? (
        <div
          style={{
            position: 'fixed',
            right: 24,
            bottom: toast ? 84 : 24,
            display: 'grid',
            gap: 10,
            zIndex: 1000,
          }}
        >
          {notificationToasts.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 14,
                border: '1px solid rgba(95, 74, 62, 0.25)',
                background: 'rgba(255, 255, 255, 0.96)',
                boxShadow: '0 16px 32px rgba(0,0,0,0.18)',
                fontSize: 12,
                minWidth: 240,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (item.profileId) {
                    window.sessionStorage.setItem(
                      'ether:last_view',
                      JSON.stringify({ path: window.location.pathname + window.location.search })
                    )
                    window.location.href = `/ether/profile/${item.profileId}`
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  border: 'none',
                  background: 'transparent',
                  cursor: item.profileId ? 'pointer' : 'default',
                  padding: 0,
                  color: 'inherit',
                  textDecoration: 'none',
                  textUnderlineOffset: 2,
                  transition: 'text-shadow 180ms ease, color 180ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!item.profileId) return
                  e.currentTarget.style.color = '#6f4a3a'
                  e.currentTarget.style.textDecoration = 'underline'
                  e.currentTarget.style.textShadow =
                    '0 1px 0 rgba(182, 121, 103, 0.25), 0 0 10px rgba(182, 121, 103, 0.35)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'inherit'
                  e.currentTarget.style.textDecoration = 'none'
                  e.currentTarget.style.textShadow = 'none'
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: '1px solid rgba(95, 74, 62, 0.25)',
                    background: 'rgba(255,255,255,0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {item.avatarUrl ? (
                    <img
                      src={item.avatarUrl}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span>{item.title.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  <div style={{ opacity: 0.75 }}>{item.detail}</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotificationToasts((prev) => prev.filter((t) => t.id !== item.id))
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 12,
                  opacity: 0.6,
                  marginLeft: 'auto',
                }}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
