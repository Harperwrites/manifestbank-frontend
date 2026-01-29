'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/app/providers'
import EtherNavbar from '@/app/components/EtherNavbar'
import { Container } from '@/app/components/ui'

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

type MyLinePreview = {
  thread_id: number
  sender_profile_id: number | null
  sender_display_name: string | null
  sender_avatar_url: string | null
  message: string | null
  created_at: string | null
  unread: boolean
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

function getThreadReadAt(threadId: number) {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(getThreadReadKey(threadId))
}

function markThreadRead(threadId: number, createdAt?: string | null) {
  if (typeof window === 'undefined') return
  const timestamp = createdAt ?? new Date().toISOString()
  window.localStorage.setItem(getThreadReadKey(threadId), timestamp)
}

export default function MyLinePage() {
  const { me } = useAuth()
  const router = useRouter()
  const navRef = useRef<HTMLDivElement | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [threads, setThreads] = useState<EtherThread[]>([])
  const [previews, setPreviews] = useState<MyLinePreview[]>([])
  const [loading, setLoading] = useState(false)
  const [noticeMsg, setNoticeMsg] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [accountsOpen, setAccountsOpen] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accountsLoaded, setAccountsLoaded] = useState(false)
  const [accountsMsg, setAccountsMsg] = useState('')
  const [notifications, setNotifications] = useState<EtherNotification[]>([])
  const [syncRequests, setSyncRequests] = useState<SyncRequest[]>([])
  const [syncs, setSyncs] = useState<Profile[]>([])
  const [syncsOpen, setSyncsOpen] = useState(false)
  const syncsMenuRef = useRef<HTMLDivElement | null>(null)
  const syncsMenuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [threadUnreadCount, setThreadUnreadCount] = useState(0)
  const [newMessageOpen, setNewMessageOpen] = useState(false)
  const [recipientInput, setRecipientInput] = useState('')
  const [recipientQuery, setRecipientQuery] = useState('')
  const [recipientResults, setRecipientResults] = useState<Profile[]>([])
  const [recipientLoading, setRecipientLoading] = useState(false)
  const [recipientMsg, setRecipientMsg] = useState('')
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const accountMenuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const profileCache = useRef<Map<number, EtherThreadParticipant>>(new Map())
  const [restoringScroll, setRestoringScroll] = useState(false)
  const [showStickyChips, setShowStickyChips] = useState(false)

  const unreadNotifications = useMemo(
    () => notifications.filter((note) => !note.read_at).length,
    [notifications]
  )

  const etherBadgeCount = unreadNotifications + syncRequests.length + threadUnreadCount

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.sessionStorage.getItem(MYLINE_VIEW_KEY)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as { scrollY?: number }
      if (typeof parsed.scrollY === 'number') {
        setRestoringScroll(true)
        window.requestAnimationFrame(() => {
          window.scrollTo(0, parsed.scrollY ?? 0)
          setRestoringScroll(false)
        })
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (restoringScroll) return
    const handler = () => {
      window.sessionStorage.setItem(
        MYLINE_VIEW_KEY,
        JSON.stringify({ path: window.location.pathname + window.location.search, scrollY: window.scrollY })
      )
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [restoringScroll])

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
    if (me.email_verified === false) {
      router.replace('/verify-email?next=/myline')
    }
  }, [me, router])

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

  async function loadThreads() {
    setLoading(true)
    setNoticeMsg('')
    try {
      const [threadRes, noteRes, syncRes, syncListRes] = await Promise.allSettled([
        api.get('/ether/threads'),
        api.get('/ether/notifications'),
        api.get('/ether/sync/requests'),
        api.get('/ether/syncs'),
      ])
      if (threadRes.status === 'fulfilled') setThreads(threadRes.value.data)
      if (noteRes.status === 'fulfilled') setNotifications(noteRes.value.data)
      if (syncRes.status === 'fulfilled') setSyncRequests(syncRes.value.data)
      if (syncListRes.status === 'fulfilled') setSyncs(syncListRes.value.data)
      if ([threadRes, noteRes, syncRes, syncListRes].some((res) => res.status === 'rejected')) {
        setNoticeMsg('Some data failed to load. Try refresh.')
      }
    } catch (e: any) {
      setNoticeMsg(e?.response?.data?.detail ?? e?.message ?? 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  async function loadThreadParticipant(profileId: number) {
    if (profileCache.current.has(profileId)) {
      return profileCache.current.get(profileId) ?? null
    }
    try {
      const res = await api.get(`/ether/profiles/${profileId}`)
      const data = res.data as EtherThreadParticipant
      profileCache.current.set(profileId, data)
      return data
    } catch {
      return null
    }
  }

  useEffect(() => {
    loadProfile().catch(() => {})
    loadThreads().catch(() => {})
  }, [])

  useEffect(() => {
    if (!profile?.id) return
    if (!threads.length) {
      setPreviews([])
      setThreadUnreadCount(0)
      return
    }
    let canceled = false
    async function buildPreviews() {
      try {
        const results = await Promise.all(
          threads.map(async (thread) => {
            try {
              const messagesRes = await api.get(`/ether/threads/${thread.id}/messages`)
              const list = Array.isArray(messagesRes.data) ? (messagesRes.data as EtherMessage[]) : []
              const last = list[list.length - 1]
              const profileId = profile?.id ?? null
              const participant = Array.isArray(thread.participants)
                ? thread.participants.find((p) => p.profile_id !== profileId) ?? thread.participants[0]
                : null
              const senderProfileId = last?.sender_profile_id ?? participant?.profile_id ?? null
              let senderDisplayName = participant?.display_name ?? null
              let senderAvatarUrl = participant?.avatar_url ?? null
              if (!senderDisplayName && senderProfileId) {
                const sender = await loadThreadParticipant(senderProfileId)
                senderDisplayName = sender?.display_name ?? null
                senderAvatarUrl = sender?.avatar_url ?? null
              }
              const readAt = getThreadReadAt(thread.id)
              const unread =
                !!last &&
                (!profileId || last.sender_profile_id !== profileId) &&
                (!readAt || new Date(last.created_at).getTime() > new Date(readAt).getTime())
              return {
                thread_id: thread.id,
                sender_profile_id: senderProfileId,
                sender_display_name: senderDisplayName ?? (senderProfileId ? `User #${senderProfileId}` : null),
                sender_avatar_url: senderAvatarUrl ?? null,
                message: last?.content ?? null,
                created_at: last?.created_at ?? null,
                unread,
              } satisfies MyLinePreview
            } catch {
              return {
                thread_id: thread.id,
                sender_profile_id: null,
                sender_display_name: `Thread #${thread.id}`,
                sender_avatar_url: null,
                message: null,
                created_at: null,
                unread: false,
              } satisfies MyLinePreview
            }
          })
        )
        if (canceled) return
        const sorted = results.sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
          return bTime - aTime
        })
        setPreviews(sorted)
        setThreadUnreadCount(sorted.filter((preview) => preview.unread).length)
      } catch {
        // ignore
      }
    }
    buildPreviews()
    return () => {
      canceled = true
    }
  }, [threads, profile?.id])

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
    if (!syncsOpen) return
    function handleClick(event: MouseEvent) {
      const target = event.target as Node
      if (
        syncsMenuRef.current &&
        !syncsMenuRef.current.contains(target) &&
        syncsMenuTriggerRef.current &&
        !syncsMenuTriggerRef.current.contains(target)
      ) {
        setSyncsOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSyncsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [syncsOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim())
    }, 220)
    return () => window.clearTimeout(handle)
  }, [searchInput])

  useEffect(() => {
    if (!newMessageOpen) return
    if (typeof window === 'undefined') return
    const handle = window.setTimeout(() => {
      const trimmed = recipientInput.trim()
      setRecipientQuery(trimmed)
    }, 220)
    return () => window.clearTimeout(handle)
  }, [recipientInput, newMessageOpen])

  useEffect(() => {
    if (!newMessageOpen) return
    if (!recipientQuery) {
      setRecipientResults([])
      setRecipientMsg('')
      return
    }
    let canceled = false
    setRecipientLoading(true)
    api
      .get('/ether/profiles/search', { params: { query: recipientQuery } })
      .then((res) => {
        if (canceled) return
        const list = Array.isArray(res.data) ? res.data : []
        setRecipientResults(list)
        setRecipientMsg('')
      })
      .catch((e) => {
        if (canceled) return
        setRecipientResults([])
        setRecipientMsg(e?.response?.data?.detail ?? e?.message ?? 'Search failed')
      })
      .finally(() => {
        if (!canceled) setRecipientLoading(false)
      })
    return () => {
      canceled = true
    }
  }, [recipientQuery, newMessageOpen])

  const filteredPreviews = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return previews
    return previews.filter((preview) => {
      return (
        preview.sender_display_name?.toLowerCase().includes(query) ||
        preview.message?.toLowerCase().includes(query)
      )
    })
  }, [previews, search])

  function handleOpenThread(preview: MyLinePreview) {
    if (preview.created_at) {
      markThreadRead(preview.thread_id, preview.created_at)
    }
    setPreviews((prev) =>
      prev.map((item) => (item.thread_id === preview.thread_id ? { ...item, unread: false } : item))
    )
    setThreadUnreadCount((count) => Math.max(0, count - (preview.unread ? 1 : 0)))
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        MYLINE_VIEW_KEY,
        JSON.stringify({ path: window.location.pathname + window.location.search, scrollY: window.scrollY })
      )
      window.sessionStorage.setItem(
        'ether:last_view',
        JSON.stringify({ path: window.location.pathname + window.location.search })
      )
    }
    router.push(`/myline/${preview.thread_id}`)
  }

  function handleProfileClick(profileId: number | null) {
    if (!profileId) return
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        MYLINE_VIEW_KEY,
        JSON.stringify({ path: window.location.pathname + window.location.search, scrollY: window.scrollY })
      )
      window.sessionStorage.setItem(
        'ether:last_view',
        JSON.stringify({ path: window.location.pathname + window.location.search })
      )
    }
    router.push(`/ether/profile/${profileId}`)
  }

  function storeReturnPath() {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(
      MYLINE_VIEW_KEY,
      JSON.stringify({ path: window.location.pathname + window.location.search, scrollY: window.scrollY })
    )
    window.sessionStorage.setItem(
      'ether:last_view',
      JSON.stringify({ path: window.location.pathname + window.location.search })
    )
  }

  function findThreadWithProfile(profileId: number) {
    return threads.find(
      (thread) =>
        Array.isArray(thread.participants) &&
        thread.participants.some((participant) => participant.profile_id === profileId)
    )
  }

  async function openLineWithProfile(profileId: number) {
    if (!profileId) return
    try {
      let thread = findThreadWithProfile(profileId)
      if (!thread) {
        const res = await api.post('/ether/threads', { participant_profile_ids: [profileId] })
        const createdId = res.data?.id ?? res.data?.thread_id ?? null
        if (createdId) {
          storeReturnPath()
          router.push(`/myline/${createdId}`)
          return
        }
        await loadThreads()
        thread = findThreadWithProfile(profileId)
      }
      if (thread) {
        storeReturnPath()
        router.push(`/myline/${thread.id}`)
      } else {
        setNoticeMsg('Unable to start a new line. Please try again.')
      }
    } catch (e: any) {
      setNoticeMsg(e?.response?.data?.detail ?? e?.message ?? 'Unable to start a new line.')
    }
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
          </div>
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
      ) : null}

      <Container>
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, margin: 0 }}>My Line</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setNewMessageOpen((open) => !open)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(140, 92, 78, 0.5)',
                  background: 'linear-gradient(135deg, rgba(182, 121, 103, 0.2), rgba(255, 255, 255, 0.9))',
                  fontWeight: 600,
                  color: '#4a2f26',
                  cursor: 'pointer',
                  boxShadow: '0 10px 18px rgba(20, 12, 12, 0.25)',
                }}
              >
                New Message
              </button>
              <button
                type="button"
                onClick={() => loadThreads()}
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
          </div>
          <div style={{ opacity: 0.7, marginTop: 6 }}>
            Search messages and senders. Click any preview to open the thread.
          </div>
          {noticeMsg ? (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>{noticeMsg}</div>
          ) : null}

          {newMessageOpen ? (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 20,
                background: 'rgba(255,255,255,0.88)',
                border: '1px solid rgba(182, 121, 103, 0.2)',
                boxShadow: '0 18px 32px rgba(10, 8, 10, 0.18)',
                display: 'grid',
                gap: 12,
                color: '#2d1f1a',
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700 }}>To:</div>
                <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                  <input
                    value={recipientInput}
                    onChange={(event) => setRecipientInput(event.target.value)}
                    placeholder="Search by name or username"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 999,
                      border: '1px solid rgba(140, 92, 78, 0.35)',
                      background: 'rgba(255,255,255,0.95)',
                      fontSize: 14,
                      color: '#2d1f1a',
                    }}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    ref={syncsMenuTriggerRef}
                    type="button"
                    onClick={() => setSyncsOpen((open) => !open)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      border: '1px solid rgba(140, 92, 78, 0.45)',
                      background: 'rgba(245, 234, 226, 0.95)',
                      fontWeight: 600,
                      color: '#4a2f26',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    In Sync
                    <span style={{ fontSize: 12, opacity: 0.7 }}>▾</span>
                  </button>
                  {syncsOpen ? (
                    <div
                      ref={syncsMenuRef}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: 8,
                        width: 260,
                        maxWidth: 'calc(100vw - 24px)',
                        borderRadius: 14,
                        border: '1px solid rgba(140, 92, 78, 0.35)',
                        background: 'linear-gradient(180deg, rgba(252, 245, 239, 0.98), rgba(226, 199, 181, 0.96))',
                        boxShadow: '0 16px 30px rgba(12, 10, 10, 0.22)',
                        padding: 10,
                        zIndex: 9999,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 12 }}>In Sync</div>
                      {syncs.length === 0 ? (
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>No synced profiles yet.</div>
                      ) : (
                        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                          {syncs.map((sync) => (
                            <button
                              key={sync.id}
                              type="button"
                              onClick={() => {
                                setSyncsOpen(false)
                                openLineWithProfile(sync.id)
                              }}
                              style={{
                                border: '1px solid rgba(140, 92, 78, 0.2)',
                                borderRadius: 10,
                                padding: '6px 8px',
                                background: 'rgba(255,255,255,0.9)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                cursor: 'pointer',
                                textAlign: 'left',
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
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: '50%',
                                  background: 'rgba(255,255,255,0.85)',
                                  border: '1px solid rgba(140, 92, 78, 0.25)',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: '#5a3b31',
                                }}
                              >
                                {sync.avatar_url ? (
                                  <img
                                    src={sync.avatar_url ?? undefined}
                                    alt={sync.display_name ?? 'Profile'}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  (sync.display_name ?? 'U').slice(0, 1).toUpperCase()
                                )}
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#4a2f26' }}>
                                {sync.display_name ?? `User #${sync.id}`}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
              {recipientMsg ? (
                <div style={{ fontSize: 12, opacity: 0.7 }}>{recipientMsg}</div>
              ) : null}
              {recipientLoading ? (
                <div style={{ fontSize: 12, opacity: 0.7 }}>Searching…</div>
              ) : recipientQuery ? (
                recipientResults.length ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {recipientResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => openLineWithProfile(result.id)}
                        style={{
                          border: '1px solid rgba(140, 92, 78, 0.18)',
                          borderRadius: 12,
                          padding: '8px 10px',
                          background: 'rgba(255,255,255,0.95)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          cursor: 'pointer',
                          textAlign: 'left',
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
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.9)',
                            border: '1px solid rgba(140, 92, 78, 0.25)',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#5a3b31',
                          }}
                        >
                          {result.avatar_url ? (
                            <img
                              src={result.avatar_url ?? undefined}
                              alt={result.display_name ?? 'Profile'}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            (result.display_name ?? 'U').slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#4a2f26' }}>
                          {result.display_name ?? `User #${result.id}`}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>No matches yet.</div>
                )
              ) : null}
            </div>
          ) : null}

          <div style={{ marginTop: 16, position: 'relative' }}>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search My Line"
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.95)',
                fontSize: 14,
                color: '#2d1f1a',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 16,
                opacity: 0.6,
              }}
            >
              🔎
            </span>
          </div>

          <div style={{ marginTop: 20, display: 'grid', gap: 12 }}>
            {loading ? (
              <div style={{ fontSize: 13, opacity: 0.75 }}>Loading messages…</div>
            ) : filteredPreviews.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.75 }}>No messages yet.</div>
            ) : (
              filteredPreviews.map((preview) => (
                <button
                  key={preview.thread_id}
                  type="button"
                  onClick={() => handleOpenThread(preview)}
                  style={{
                    border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: 18,
                    padding: 16,
                    background: preview.unread
                      ? 'linear-gradient(135deg, rgba(182, 121, 103, 0.16), rgba(255,255,255,0.9))'
                      : 'rgba(255,255,255,0.85)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: 14,
                    alignItems: 'center',
                    boxShadow: '0 14px 26px rgba(12, 10, 12, 0.25)',
                    transition: 'transform 160ms ease, box-shadow 160ms ease',
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.transform = 'translateY(-1px)'
                    event.currentTarget.style.boxShadow = '0 18px 30px rgba(12, 10, 12, 0.35)'
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.transform = 'translateY(0px)'
                    event.currentTarget.style.boxShadow = '0 14px 26px rgba(12, 10, 12, 0.25)'
                  }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: '50%',
                      border: '1px solid rgba(95, 74, 62, 0.25)',
                      background: 'rgba(255,255,255,0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      fontSize: 14,
                      fontWeight: 600,
                      flexShrink: 0,
                      cursor: preview.sender_profile_id ? 'pointer' : 'default',
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      handleProfileClick(preview.sender_profile_id)
                    }}
                  >
                    {preview.sender_avatar_url ? (
                      <img
                        src={preview.sender_avatar_url}
                        alt={preview.sender_display_name ?? 'Member'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      (preview.sender_display_name ?? 'M').slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <span
                        onClick={(event) => {
                          event.stopPropagation()
                          handleProfileClick(preview.sender_profile_id)
                        }}
                        style={{
                          fontWeight: 700,
                          fontSize: 16,
                          cursor: preview.sender_profile_id ? 'pointer' : 'default',
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
                          event.currentTarget.style.color = '#2d1f1a'
                          event.currentTarget.style.textShadow = 'none'
                          event.currentTarget.style.textDecorationLine = 'none'
                        }}
                      >
                        {preview.sender_display_name ?? 'Message'}
                      </span>
                      {preview.unread ? (
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
                          }}
                        >
                          new
                        </span>
                      ) : null}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 13,
                        opacity: 0.75,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {preview.message ?? 'No message yet.'}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>
                    {preview.created_at ? new Date(preview.created_at).toLocaleString() : ''}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </Container>
    </main>
  )
}
