'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { api } from '@/lib/api'
import PremiumPaywall from '@/app/components/PremiumPaywall'
import TierComparisonModal from '@/app/components/TierComparisonModal'

export type Me = {
  id: number
  email: string
  username?: string | null
  role: string
  is_active: boolean
  welcome_bonus_claimed?: boolean | null
  email_verified?: boolean | null
  wealth_target_usd?: number | null
  is_premium?: boolean | null
  dashboard_currency?: string | null
}

type AuthContextValue = {
  me: Me | null
  isLoading: boolean
  refreshMe: () => Promise<void>
  loginWithToken: (token: string, persist?: boolean, refreshToken?: string | null) => Promise<void>
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
  const pathname = usePathname()
  const [me, setMe] = useState<Me | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [toastPersistent, setToastPersistent] = useState(false)
  const [notificationToasts, setNotificationToasts] = useState<NotificationToast[]>([])
  const [notificationsPrimed, setNotificationsPrimed] = useState(false)
  const [legalRequired, setLegalRequired] = useState(false)
  const [legalChecked, setLegalChecked] = useState(false)
  const [legalSubmitting, setLegalSubmitting] = useState(false)
  const [legalError, setLegalError] = useState('')
  const [legalDocOpen, setLegalDocOpen] = useState<'terms' | 'privacy' | null>(null)
  const [legalTermsText, setLegalTermsText] = useState('')
  const [legalPrivacyText, setLegalPrivacyText] = useState('')
  const [legalContentLoading, setLegalContentLoading] = useState(false)
  const [legalContentError, setLegalContentError] = useState('')
  const [devPaywallOpen, setDevPaywallOpen] = useState(false)
  const [devPaywallReason, setDevPaywallReason] = useState('')
  const [tierCompareOpen, setTierCompareOpen] = useState(false)
  const legalReadOnlyPath =
    pathname === '/terms' || pathname === '/privacy' || pathname === '/conditions'

  function parseLegal(text: string) {
    const lines = text.split('\n')
    const title = lines[0] ?? ''
    const effective = lines[1] ?? ''
    const body = lines.slice(2).join('\n').trim()
    return { title, effective, body }
  }

  function getStoredToken() {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
  }

  function getStoredRefreshToken() {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token')
  }

  function storeTokens(accessToken: string, refreshToken: string | null, persist: boolean) {
    if (persist) {
      localStorage.setItem('access_token', accessToken)
      sessionStorage.removeItem('access_token')
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken)
        sessionStorage.removeItem('refresh_token')
      }
    } else {
      sessionStorage.setItem('access_token', accessToken)
      localStorage.removeItem('access_token')
      if (refreshToken) {
        sessionStorage.setItem('refresh_token', refreshToken)
        localStorage.removeItem('refresh_token')
      }
    }
  }

  async function refreshMe() {
    const token = getStoredToken()
    if (!token) {
      setMe(null)
      delete api.defaults.headers.common.Authorization
      return
    }

    try {
      api.defaults.headers.common.Authorization = `Bearer ${token}`
      const res = await api.get('/auth/me')
      setMe(res.data)
    } catch (err: any) {
      const status = err?.response?.status
      // If the backend is temporarily failing or the network hiccups, keep the token.
      if (!status || status >= 500) {
        setToast('We’re updating your membership — please retry in a moment.')
        setToastPersistent(false)
        return
      }
      if (status === 401 || status === 403) {
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          try {
            const res = await api.get('/auth/me')
            setMe(res.data)
          } catch {
            // fall through to clear tokens below
          }
          return
        }
        localStorage.removeItem('access_token')
        sessionStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        sessionStorage.removeItem('refresh_token')
        delete api.defaults.headers.common.Authorization
        setMe(null)
      }
    }
  }

  async function refreshAccessToken() {
    const refreshToken = getStoredRefreshToken()
    if (!refreshToken) return false
    try {
      const res = await api.post('/auth/refresh', { refresh_token: refreshToken })
      const accessToken = res.data?.access_token
      const newRefreshToken = res.data?.refresh_token || refreshToken
      if (!accessToken) return false
      const persist = Boolean(localStorage.getItem('refresh_token'))
      storeTokens(accessToken, newRefreshToken, persist)
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`
      return true
    } catch {
      return false
    }
  }

  async function loginWithToken(token: string, persist = true, refreshToken?: string | null) {
    storeTokens(token, refreshToken ?? null, persist)
    api.defaults.headers.common.Authorization = `Bearer ${token}`
    await refreshMe()
  }

  function logout() {
    localStorage.removeItem('access_token')
    sessionStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    sessionStorage.removeItem('refresh_token')
    sessionStorage.removeItem('mb_open_task')
    sessionStorage.removeItem('mb_teller_thread')
    delete api.defaults.headers.common.Authorization
    setMe(null)
    setDevPaywallOpen(false)
    setTierCompareOpen(false)
    // no router here; pages decide where to redirect
  }

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)
      await refreshMe()
      setIsLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshMe().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    const interval = window.setInterval(() => {
      refreshMe().catch(() => {})
    }, 10 * 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!me) {
      setLegalRequired(false)
      setLegalChecked(false)
      setLegalSubmitting(false)
      setLegalError('')
      setLegalDocOpen(null)
      setLegalTermsText('')
      setLegalPrivacyText('')
      setLegalContentLoading(false)
      setLegalContentError('')
      return
    }
    let active = true
    ;(async () => {
      try {
        const res = await api.get('/legal/consent')
        if (!active) return
        const termsAccepted = Boolean(res.data?.termsAccepted)
        const privacyAccepted = Boolean(res.data?.privacyAccepted)
        setLegalRequired(!(termsAccepted && privacyAccepted))
      } catch {
        if (!active) return
        setLegalRequired(true)
      }
    })()
    return () => {
      active = false
    }
  }, [me])

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
    if (!legalDocOpen) return
    if (legalTermsText && legalPrivacyText) return

    let active = true
    setLegalContentLoading(true)
    setLegalContentError('')

    ;(async () => {
      try {
        const res = await api.get('/legal/content')
        if (!active) return
        setLegalTermsText(typeof res.data?.termsText === 'string' ? res.data.termsText : '')
        setLegalPrivacyText(typeof res.data?.privacyText === 'string' ? res.data.privacyText : '')
      } catch (err: any) {
        if (!active) return
        const detail =
          err?.response?.data?.detail ??
          err?.response?.data?.message ??
          err?.message ??
          'Unable to load legal document'
        setLegalContentError(detail)
      } finally {
        if (active) setLegalContentLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [legalDocOpen, legalTermsText, legalPrivacyText])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const stored = sessionStorage.getItem('toast:message')
    const storedPersist = sessionStorage.getItem('toast:persist')
    const shouldScrollTop = sessionStorage.getItem('scroll:top') === '1'
    if (stored) {
      setToast(stored)
      setToastPersistent(storedPersist === '1')
      sessionStorage.removeItem('toast:message')
      sessionStorage.removeItem('toast:persist')
    }
    if (shouldScrollTop) {
      sessionStorage.removeItem('scroll:top')
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }

    function handleToastEvent(event: Event) {
      const detail = (event as CustomEvent<{ message?: string; persist?: boolean }>).detail
      if (detail?.message) {
        setToast(detail.message)
        setToastPersistent(Boolean(detail.persist))
      } else {
        setToast('You were logged out. Please sign in again.')
        setToastPersistent(false)
      }
    }

    window.addEventListener('auth:logged_out', handleToastEvent)
    return () => window.removeEventListener('auth:logged_out', handleToastEvent)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    function handlePaywallOpen(event: Event) {
      const detail = (event as CustomEvent<{ reason?: string }>).detail
      setDevPaywallReason(detail?.reason ?? 'Upgrade to ManifestBank™ Signature.')
      setTierCompareOpen(true)
    }
    window.addEventListener('paywall:open', handlePaywallOpen)
    return () => window.removeEventListener('paywall:open', handlePaywallOpen)
  }, [])

  useEffect(() => {
    if (!toast || toastPersistent) return
    const timer = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timer)
  }, [toast, toastPersistent])

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
              : n.kind === 'message_align'
              ? 'Aligned with your message'
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
  const legalDocText = legalDocOpen === 'terms' ? legalTermsText : legalPrivacyText
  const parsedLegalDoc = legalDocText ? parseLegal(legalDocText) : null

  return (
    <AuthContext.Provider value={value}>
      <TierComparisonModal
        open={tierCompareOpen}
        reason={devPaywallReason}
        onClose={() => setTierCompareOpen(false)}
        onOpenPaywall={() => {
          setTierCompareOpen(false)
          setDevPaywallOpen(true)
        }}
      />
      <PremiumPaywall
        open={devPaywallOpen}
        onClose={() => setDevPaywallOpen(false)}
        reason={devPaywallReason}
        isVerified={Boolean(me?.email_verified)}
      />
      {children}
      {legalRequired && !legalReadOnlyPath ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20, 12, 8, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2147483647,
            padding: 20,
          }}
        >
          <div
            style={{
              width: 'min(640px, 100%)',
              background:
                'linear-gradient(140deg, rgba(199, 140, 122, 0.98), rgba(236, 214, 201, 0.98))',
              borderRadius: 22,
              border: '1px solid rgba(95, 74, 62, 0.35)',
              padding: '22px 22px 18px',
              color: '#2b1b16',
              boxShadow: '0 28px 70px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}>
              Accept Terms to Continue
            </div>
            <p style={{ marginTop: 8, opacity: 0.8 }}>
              Please review and accept the ManifestBank™ Terms &amp; Conditions and Privacy
              Policy to continue using the app.
            </p>
            <label
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                fontSize: 14,
                marginTop: 12,
              }}
            >
              <input
                type="checkbox"
                checked={legalChecked}
                onChange={(e) => setLegalChecked(e.target.checked)}
                style={{ marginTop: 4 }}
              />
              <span>
                I agree to the{' '}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setLegalDocOpen('terms')
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                  style={{
                    appearance: 'none',
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    color: 'inherit',
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                    fontSize: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  Terms &amp; Conditions
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setLegalDocOpen('privacy')
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                  style={{
                    appearance: 'none',
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    color: 'inherit',
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                    fontSize: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  Privacy Policy
                </button>
                .
              </span>
            </label>
            {legalError ? (
              <div style={{ marginTop: 8, fontSize: 13, color: '#5a1f1f' }}>{legalError}</div>
            ) : null}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                type="button"
                disabled={!legalChecked || legalSubmitting}
                onClick={async () => {
                  if (!legalChecked) return
                  setLegalSubmitting(true)
                  setLegalError('')
                  try {
                    await api.post('/legal/accept')
                    setLegalRequired(false)
                  } catch (err: any) {
                    const detail =
                      err?.response?.data?.detail ??
                      err?.response?.data?.message ??
                      err?.message ??
                      'Unable to save acceptance'
                    setLegalError(detail)
                  } finally {
                    setLegalSubmitting(false)
                  }
                }}
                style={{
                  padding: '10px 18px',
                  borderRadius: 999,
                  border: '1px solid rgba(182, 121, 103, 0.6)',
                  background: 'linear-gradient(135deg, #c88a77, #b67967)',
                  color: '#fff',
                  cursor: legalChecked && !legalSubmitting ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  opacity: legalChecked && !legalSubmitting ? 1 : 0.6,
                }}
              >
                {legalSubmitting ? 'Saving...' : 'Accept and Continue'}
              </button>
            </div>
            {legalDocOpen ? (
              <div
                onClick={() => setLegalDocOpen(null)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(20, 12, 8, 0.52)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2147483647,
                  padding: 24,
                }}
              >
                <div
                  onClick={(event) => event.stopPropagation()}
                  style={{
                    width: 'min(820px, 100%)',
                    maxHeight: 'min(78vh, 820px)',
                    overflow: 'auto',
                    background: 'rgba(252, 247, 243, 0.98)',
                    borderRadius: 24,
                    border: '1px solid rgba(95, 74, 62, 0.18)',
                    boxShadow: '0 28px 70px rgba(0,0,0,0.3)',
                    padding: '24px 24px 22px',
                    color: '#2b1b16',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 16,
                    }}
                  >
                    <div>
                      <div
                        style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}
                      >
                        {legalDocOpen === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, opacity: 0.72 }}>
                        Review before accepting.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLegalDocOpen(null)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: 26,
                        lineHeight: 1,
                        color: '#5f4a3e',
                      }}
                      aria-label="Close legal document preview"
                    >
                      ×
                    </button>
                  </div>
                  <div
                    style={{
                      marginTop: 18,
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.58,
                      fontSize: 14,
                    }}
                  >
                    {legalContentLoading ? (
                      <div>Loading…</div>
                    ) : legalContentError ? (
                      <div>Unable to load legal document: {legalContentError}</div>
                    ) : parsedLegalDoc ? (
                      <>
                        <div
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: 24,
                            fontWeight: 600,
                            lineHeight: 1.2,
                          }}
                        >
                          {parsedLegalDoc.title}
                        </div>
                        <div style={{ marginTop: 8, fontWeight: 600 }}>
                          {parsedLegalDoc.effective}
                        </div>
                        <div style={{ marginTop: 16 }}>{parsedLegalDoc.body}</div>
                      </>
                    ) : (
                      <div>Legal document unavailable.</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                    <button
                      type="button"
                      onClick={() => setLegalDocOpen(null)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 999,
                        border: '1px solid rgba(95, 74, 62, 0.24)',
                        background: 'rgba(255,255,255,0.72)',
                        color: '#4a2f26',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      Exit
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {toast ? (
        <div
          style={{
            position: 'fixed',
            right: 24,
            bottom: 110,
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid rgba(95, 74, 62, 0.25)',
            background: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 16px 32px rgba(0,0,0,0.18)',
            fontSize: 13,
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {toast}
          {toastPersistent ? (
            <button
              type="button"
              onClick={() => {
                setToast('')
                setToastPersistent(false)
              }}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 14,
                opacity: 0.7,
              }}
            >
              ×
            </button>
          ) : null}
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
