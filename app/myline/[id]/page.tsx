'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/app/providers'
import EtherNavbar from '@/app/components/EtherNavbar'
import { Button, Container } from '@/app/components/ui'

type Profile = {
  id: number
  display_name: string
  bio?: string | null
  links?: string | null
  avatar_url?: string | null
  is_public: boolean
  sync_requires_approval: boolean
}

type EtherThreadParticipant = {
  profile_id: number
  display_name?: string | null
  avatar_url?: string | null
}

type EtherThread = {
  id: number
  participants?: EtherThreadParticipant[] | null
  created_at?: string
}

type EtherMessage = {
  id: number
  sender_profile_id: number
  content: string
  created_at: string
}

type EtherNotification = {
  id: number
  recipient_profile_id: number
  actor_profile_id: number
  kind: string
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
}

export const runtime = 'edge'

const MYLINE_VIEW_KEY = 'myline:last_view'

function formatMoney(value: any) {
  const num = Number(value)
  if (Number.isNaN(num)) return value ?? ''
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
}

function getThreadReadKey(threadId: number) {
  return `ether:thread_read:${threadId}`
}

function markThreadRead(threadId: number, createdAt?: string | null) {
  if (typeof window === 'undefined') return
  const timestamp = createdAt ?? new Date().toISOString()
  window.localStorage.setItem(getThreadReadKey(threadId), timestamp)
}

export default function MyLineThreadPage() {
  const { me } = useAuth()
  const router = useRouter()
  const params = useParams()
  const threadId = Number(params?.id)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [thread, setThread] = useState<EtherThread | null>(null)
  const [messages, setMessages] = useState<EtherMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState('')
  const [accountsOpen, setAccountsOpen] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accountsLoaded, setAccountsLoaded] = useState(false)
  const [accountsMsg, setAccountsMsg] = useState('')
  const [notifications, setNotifications] = useState<EtherNotification[]>([])
  const [syncRequests, setSyncRequests] = useState<SyncRequest[]>([])
  const [threadUnreadCount, setThreadUnreadCount] = useState(0)
  const [counterpartProfile, setCounterpartProfile] = useState<EtherThreadParticipant | null>(null)
  const counterpartProfileCache = useRef<Map<number, EtherThreadParticipant>>(new Map())
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const accountMenuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const unreadNotifications = useMemo(
    () => notifications.filter((note) => !note.read_at).length,
    [notifications]
  )

  const etherBadgeCount = unreadNotifications + syncRequests.length + threadUnreadCount

  useEffect(() => {
    if (!me) return
    if (me.email_verified === false) {
      router.replace(`/verify-email?next=/myline/${threadId}`)
    }
  }, [me, router, threadId])

  async function loadProfile() {
    try {
      const res = await api.get('/ether/me-profile')
      setProfile(res.data)
    } catch {
      setProfile(null)
    }
  }

  async function updateSettings(next: Partial<Profile>) {
    const res = await api.patch('/ether/me-profile', next)
    setProfile(res.data)
  }

  async function onAvatarSelect(file: File) {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post('/ether/upload/avatar', form)
    setProfile((prev) => (prev ? { ...prev, avatar_url: res.data.url } : prev))
  }

  async function loadThread() {
    if (!Number.isFinite(threadId)) return
    setLoading(true)
    setNotice('')
    try {
      const [threadsRes, messagesRes, noteRes, syncRes] = await Promise.allSettled([
        api.get('/ether/threads'),
        api.get(`/ether/threads/${threadId}/messages`),
        api.get('/ether/notifications'),
        api.get('/ether/sync/requests'),
      ])
      if (threadsRes.status === 'fulfilled') {
        const list = Array.isArray(threadsRes.value.data) ? (threadsRes.value.data as EtherThread[]) : []
        setThread(list.find((item) => item.id === threadId) ?? null)
      }
      if (messagesRes.status === 'fulfilled') {
        const list = Array.isArray(messagesRes.value.data) ? (messagesRes.value.data as EtherMessage[]) : []
        setMessages(list)
        const last = list[list.length - 1]
        markThreadRead(threadId, last?.created_at)
      }
      if (noteRes.status === 'fulfilled') setNotifications(noteRes.value.data)
      if (syncRes.status === 'fulfilled') setSyncRequests(syncRes.value.data)
      if ([threadsRes, messagesRes, noteRes, syncRes].some((res) => res.status === 'rejected')) {
        setNotice('Some data failed to load. Try refresh.')
      }
    } catch (e: any) {
      setNotice(e?.response?.data?.detail ?? e?.message ?? 'Failed to load thread')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile().catch(() => {})
    loadThread().catch(() => {})
  }, [threadId])

  useEffect(() => {
    if (!threadId) return
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(getThreadReadKey(threadId))
    if (!stored) return
    setThreadUnreadCount(0)
  }, [threadId])

  useEffect(() => {
    if (!accountsOpen) return
    if (accountsLoaded || accountsLoading) return
    setAccountsLoading(true)
    setAccountsMsg('')
    api
      .get('/accounts')
      .then(async (res) => {
        const list = Array.isArray(res.data) ? res.data : []
        const balances = await Promise.all(
          list.map(async (acct: any) => {
            try {
              const balanceRes = await api.get(`/accounts/${acct.id}/balance?currency=USD`)
              return { id: acct.id, balance: Number(balanceRes.data?.balance ?? 0) }
            } catch {
              return { id: acct.id, balance: 0 }
            }
          })
        )
        const balanceMap = new Map(balances.map((item) => [item.id, item.balance]))
        setAccounts(
          list.map((acct: any) => ({
            id: acct.id,
            name: acct.name,
            balance: balanceMap.get(acct.id) ?? 0,
          }))
        )
        setAccountsLoaded(true)
      })
      .catch((e) => setAccountsMsg(e?.response?.data?.detail ?? e?.message ?? 'Failed to load accounts'))
      .finally(() => setAccountsLoading(false))
  }, [accountsOpen, accountsLoaded, accountsLoading])

  useEffect(() => {
    if (!accountsOpen) return
    function handleClick(event: MouseEvent) {
      const target = event.target as Node
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(target) &&
        accountMenuTriggerRef.current &&
        !accountMenuTriggerRef.current.contains(target)
      ) {
        setAccountsOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [accountsOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const counterpart = useMemo(() => {
    if (!thread?.participants?.length) return null
    const profileId = profile?.id ?? null
    const match = profileId
      ? thread.participants.find((p) => p.profile_id !== profileId)
      : thread.participants[0]
    return match ?? thread.participants[0]
  }, [thread?.participants, profile?.id])
  const conversationProfile = counterpartProfile ?? counterpart

  async function loadThreadParticipant(profileId: number) {
    if (counterpartProfileCache.current.has(profileId)) {
      return counterpartProfileCache.current.get(profileId) ?? null
    }
    try {
      const res = await api.get(`/ether/profiles/${profileId}`)
      const data = res.data as EtherThreadParticipant
      counterpartProfileCache.current.set(profileId, data)
      return data
    } catch {
      return null
    }
  }

  useEffect(() => {
    let canceled = false
    const targetId = counterpart?.profile_id ?? null
    if (!targetId) {
      setCounterpartProfile(null)
      return
    }
    loadThreadParticipant(targetId).then((data) => {
      if (!canceled) setCounterpartProfile(data)
    })
    return () => {
      canceled = true
    }
  }, [counterpart?.profile_id])

  async function sendMessage() {
    const trimmed = draft.trim()
    if (!trimmed || !threadId) return
    setSending(true)
    setNotice('')
    try {
      await api.post(`/ether/threads/${threadId}/messages`, { content: trimmed })
      setDraft('')
      await loadThread()
    } catch (e: any) {
      setNotice(e?.response?.data?.detail ?? e?.message ?? 'Message failed')
    } finally {
      setSending(false)
    }
  }

  function handleProfileClick(profileId?: number | null) {
    if (!profileId) return
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        MYLINE_VIEW_KEY,
        JSON.stringify({ path: '/myline', scrollY: 0 })
      )
      window.sessionStorage.setItem('ether:last_view', JSON.stringify({ path: `/myline/${threadId}` }))
    }
    router.push(`/ether/profile/${profileId}`)
  }

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    if (typeof window !== 'undefined') {
      const stored = window.sessionStorage.getItem(MYLINE_VIEW_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as { path?: string; scrollY?: number }
          if (parsed.path) {
            router.push(parsed.path)
            return
          }
        } catch {
          // ignore
        }
      }
    }
    router.push('/myline')
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#100f10',
        backgroundImage:
          "linear-gradient(180deg, rgba(12, 10, 12, 0.82), rgba(12, 10, 12, 0.92)), url('/calacatta-black-vein-800x377.webp')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        color: 'var(--marble-ivory)',
      }}
    >
      <EtherNavbar profile={profile} updateSettings={updateSettings} onAvatarSelect={onAvatarSelect} />

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
        <button
          type="button"
          onClick={() => router.push('/ether')}
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            border: '1px solid rgba(140, 92, 78, 0.7)',
            background: 'linear-gradient(135deg, rgba(120, 77, 64, 0.7), rgba(224, 198, 186, 0.95))',
            cursor: 'pointer',
            fontWeight: 600,
            color: '#2f1f1a',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 0 18px rgba(140, 92, 78, 0.5)',
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
        </button>
        <div style={{ position: 'relative' }}>
          <button
            ref={accountMenuTriggerRef}
            type="button"
            onClick={() => setAccountsOpen((open) => !open)}
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
            aria-haspopup="menu"
            aria-expanded={accountsOpen}
          >
            ManifestBank™
            <span style={{ fontSize: 12, opacity: 0.7 }}>▾</span>
          </button>
          {accountsOpen ? (
            <div
              ref={accountMenuRef}
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
              <div style={{ fontWeight: 700, fontSize: 13 }}>Accounts</div>
              {accountsLoading ? (
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>Loading accounts…</div>
              ) : accountsMsg ? (
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>{accountsMsg}</div>
              ) : accounts.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>No accounts yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  {accounts.map((acct) => (
                    <div
                      key={acct.id}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 12,
                        border: '1px solid rgba(160, 120, 104, 0.25)',
                        background: 'rgba(255,255,255,0.75)',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{acct.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>{formatMoney(acct.balance)}</div>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
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
                Open dashboard
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <Container>
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <button
              type="button"
              onClick={handleBack}
              style={{
                padding: '10px 16px',
                borderRadius: 999,
                border: '1px solid rgba(140, 92, 78, 0.55)',
                background: 'rgba(255, 248, 242, 0.9)',
                color: '#3b2b24',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 10px 22px rgba(10, 8, 10, 0.22)',
              }}
            >
              ← Back to My Line
            </button>
            <div style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.08, opacity: 0.65 }}>
                Conversation
              </div>
              {conversationProfile ? (
                <button
                  type="button"
                  onClick={() => {
                    window.sessionStorage.setItem('ether:last_view', JSON.stringify({ path: `/myline/${threadId}` }))
                    router.push(`/ether/profile/${conversationProfile.profile_id}`)
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 0,
                    color: 'inherit',
                    textDecoration: 'none',
                    textUnderlineOffset: 2,
                    transition: 'text-shadow 160ms ease, color 160ms ease',
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.color = '#6f4a3a'
                    event.currentTarget.style.textDecoration = 'underline'
                    event.currentTarget.style.textShadow =
                      '0 1px 0 rgba(182, 121, 103, 0.25), 0 0 12px rgba(182, 121, 103, 0.35)'
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.color = 'inherit'
                    event.currentTarget.style.textDecoration = 'none'
                    event.currentTarget.style.textShadow = 'none'
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: '1px solid rgba(95, 74, 62, 0.25)',
                      background: 'rgba(255,255,255,0.9)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {conversationProfile.avatar_url ? (
                      <img
                        src={conversationProfile.avatar_url ?? undefined}
                        alt={conversationProfile.display_name ?? 'Profile'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      (conversationProfile.display_name ?? 'U').slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <span style={{ fontWeight: 600 }}>{conversationProfile.display_name ?? 'Member'}</span>
                </button>
              ) : (
                <div style={{ fontWeight: 600 }}>Conversation</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => loadThread()}
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                border: '1px solid rgba(140, 92, 78, 0.5)',
                background: 'rgba(255, 255, 255, 0.85)',
                fontWeight: 600,
                color: '#4a2f26',
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>
          {notice ? <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>{notice}</div> : null}

          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {loading ? (
              <div style={{ fontSize: 13, opacity: 0.75 }}>Loading messages…</div>
            ) : messages.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.75 }}>No messages yet.</div>
            ) : (
              messages.map((message) => {
                const isMe = message.sender_profile_id === profile?.id
                return (
                  <div
                    key={message.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start',
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: 18,
                        border: '1px solid rgba(255,255,255,0.25)',
                        background: isMe
                          ? 'linear-gradient(135deg, rgba(182, 121, 103, 0.25), rgba(255,255,255,0.9))'
                          : 'rgba(255,255,255,0.88)',
                        color: '#2d1f1a',
                        maxWidth: 'min(640px, 90%)',
                        boxShadow: '0 12px 24px rgba(12, 10, 12, 0.2)',
                        transition: 'box-shadow 160ms ease',
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.boxShadow = '0 18px 32px rgba(12, 10, 12, 0.3)'
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.boxShadow = '0 12px 24px rgba(12, 10, 12, 0.2)'
                      }}
                    >
                      <div style={{ fontSize: 14, lineHeight: 1.5 }}>{message.content}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, opacity: 0.7 }}>
                      {!isMe && conversationProfile ? (
                        <button
                          type="button"
                          onClick={() => handleProfileClick(conversationProfile.profile_id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            cursor: 'pointer',
                            fontWeight: 600,
                            color: '#e6d3c7',
                            textDecorationLine: 'none',
                            textDecorationColor: 'rgba(185, 126, 104, 0.75)',
                            textUnderlineOffset: 3,
                            transition: 'color 160ms ease, text-shadow 160ms ease, text-decoration-color 160ms ease',
                          }}
                          onMouseEnter={(event) => {
                            event.currentTarget.style.color = '#d09a85'
                            event.currentTarget.style.textShadow = '0 0 10px rgba(185, 126, 104, 0.45)'
                            event.currentTarget.style.textDecorationLine = 'underline'
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.color = '#e6d3c7'
                            event.currentTarget.style.textShadow = 'none'
                            event.currentTarget.style.textDecorationLine = 'none'
                          }}
                        >
                          {conversationProfile.display_name ?? 'Sender'}
                        </button>
                      ) : null}
                      <span>{new Date(message.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.9)',
              display: 'grid',
              gap: 12,
            }}
          >
            <textarea
              rows={3}
              placeholder="Write a message..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              style={{
                borderRadius: 14,
                border: '1px solid rgba(95, 74, 62, 0.25)',
                padding: 12,
                fontSize: 14,
                resize: 'vertical',
                color: '#2d1f1a',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={sending || !draft.trim()}
                onClick={sendMessage}
                style={{
                  padding: '10px 18px',
                  borderRadius: 999,
                  border: 'none',
                  background: 'linear-gradient(135deg, #b67967, #c6927c)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: sending || !draft.trim() ? 'not-allowed' : 'pointer',
                  opacity: sending || !draft.trim() ? 0.6 : 1,
                }}
              >
                {sending ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </div>
        </div>
      </Container>
    </main>
  )
}
