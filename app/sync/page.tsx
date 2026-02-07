 'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { api } from '@/lib/api'
import { Container } from '@/app/components/ui'
import EtherNavbar from '@/app/components/EtherNavbar'

type SyncRequest = {
  id: number
  requester_profile_id: number
  target_profile_id: number
  status: string
  created_at: string
  requester_display_name?: string | null
  requester_avatar_url?: string | null
}

type SyncProfile = {
  id: number
  display_name?: string | null
  avatar_url?: string | null
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

type MyLinePreview = {
  thread_id: number
  message: string | null
  created_at: string | null
}

const IMAGE_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="100%" height="100%" fill="#f2ebe6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6f5a4d" font-family="Arial, sans-serif" font-size="16">Image unavailable</text></svg>'
  )

function SyncPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { me } = useAuth()
  const navRef = useRef<HTMLDivElement | null>(null)
  const [tab, setTab] = useState<'syncs' | 'requests' | 'search'>('syncs')
  const [syncs, setSyncs] = useState<SyncProfile[]>([])
  const [syncRequests, setSyncRequests] = useState<SyncRequest[]>([])
  const [notifications, setNotifications] = useState<EtherNotification[]>([])
  const [myLinePreviews, setMyLinePreviews] = useState<MyLinePreview[]>([])
  const [myLineLoading, setMyLineLoading] = useState(false)
  const [showStickyChips, setShowStickyChips] = useState(false)
  const [etherStickyOpen, setEtherStickyOpen] = useState(false)
  const etherStickyRef = useRef<HTMLDivElement | null>(null)
  const etherStickyMenuRef = useRef<HTMLDivElement | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [syncQuery, setSyncQuery] = useState('')
  const [syncResults, setSyncResults] = useState<SyncProfile[]>([])
  const [syncSearching, setSyncSearching] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const incoming = params.get('tab')
    if (incoming === 'syncs' || incoming === 'requests' || incoming === 'search') {
      setTab(incoming)
    }
    const incomingQuery = params.get('query')
    if (incomingQuery) {
      setSyncQuery(incomingQuery)
    }
  }, [params])

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
        setMsg('')
        const [requestsRes, syncsRes, notesRes, profileRes] = await Promise.all([
          api.get('/ether/sync/requests'),
          api.get('/ether/syncs'),
          api.get('/ether/notifications'),
          api.get('/ether/me-profile'),
        ])
        setSyncRequests(Array.isArray(requestsRes.data) ? requestsRes.data : [])
        setSyncs(Array.isArray(syncsRes.data) ? syncsRes.data : [])
        setNotifications(Array.isArray(notesRes.data) ? notesRes.data : [])
        setProfile(profileRes.data)
      } catch (e: any) {
        setMsg(e?.response?.data?.detail ?? e?.message ?? 'Failed to load syncs')
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
              } satisfies MyLinePreview
            } catch {
              return {
                thread_id: thread.id,
                message: null,
                created_at: null,
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

  useEffect(() => {
    if (tab !== 'search') return
    const query = syncQuery.trim()
    if (!query) {
      setSyncResults([])
      return
    }
    const timeout = window.setTimeout(async () => {
      try {
        setSyncSearching(true)
        const res = await api.get('/ether/profiles/search', { params: { query } })
        setSyncResults(Array.isArray(res.data) ? res.data : [])
      } catch (e: any) {
        setMsg(e?.response?.data?.detail ?? e?.message ?? 'Search failed')
      } finally {
        setSyncSearching(false)
      }
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [syncQuery, tab])

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

  async function sendSyncRequest(profileId: number) {
    try {
      await api.post(`/ether/sync/requests/${profileId}`)
      const syncsRes = await api.get('/ether/syncs')
      setSyncs(Array.isArray(syncsRes.data) ? syncsRes.data : [])
    } catch (e: any) {
      setMsg(e?.response?.data?.detail ?? e?.message ?? 'Sync failed')
    }
  }

  async function approveSync(requestId: number) {
    try {
      await api.post(`/ether/sync/requests/${requestId}/approve`)
      const requestsRes = await api.get('/ether/sync/requests')
      const syncsRes = await api.get('/ether/syncs')
      setSyncRequests(Array.isArray(requestsRes.data) ? requestsRes.data : [])
      setSyncs(Array.isArray(syncsRes.data) ? syncsRes.data : [])
    } catch (e: any) {
      setMsg(e?.response?.data?.detail ?? e?.message ?? 'Approval failed')
    }
  }

  async function declineSync(requestId: number) {
    try {
      await api.post(`/ether/sync/requests/${requestId}/decline`)
      const requestsRes = await api.get('/ether/sync/requests')
      setSyncRequests(Array.isArray(requestsRes.data) ? requestsRes.data : [])
    } catch (e: any) {
      setMsg(e?.response?.data?.detail ?? e?.message ?? 'Decline failed')
    }
  }

  const showEmpty = useMemo(() => {
    if (tab === 'syncs') return syncs.length === 0
    if (tab === 'requests') return syncRequests.length === 0
    if (tab === 'search') return !syncSearching && syncQuery.trim() && syncResults.length === 0
    return false
  }, [tab, syncs.length, syncRequests.length, syncResults.length, syncQuery, syncSearching])

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
                      <div key={note.id} style={{ fontSize: 12 }}>
                        {note.actor_display_name ?? 'Member'}
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
                      <div key={preview.thread_id} style={{ fontSize: 12 }}>
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
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, margin: 0 }}>In Sync</h1>
        </div>
        {msg ? <div style={{ marginTop: 10, fontSize: 12, color: '#6f4a3a' }}>{msg}</div> : null}

        <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['syncs', 'requests', 'search'] as const).map((next) => (
            <button
              key={next}
              type="button"
              onClick={() => setTab(next)}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid rgba(95, 74, 62, 0.35)',
                background: tab === next ? 'rgba(182, 121, 103, 0.18)' : 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {next === 'syncs' ? 'In Sync' : next === 'requests' ? 'Requests' : 'Search'}
            </button>
          ))}
        </div>

        {tab === 'search' ? (
          <div style={{ marginTop: 12 }}>
            <input
              type="text"
              placeholder="Search by email or username"
              value={syncQuery}
              onChange={(e) => setSyncQuery(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(95, 74, 62, 0.3)',
                fontSize: 13,
                width: '100%',
                background: 'rgba(255,255,255,0.95)',
              }}
            />
          </div>
        ) : null}

        {showEmpty ? (
          <div style={{ marginTop: 14, fontSize: 13, opacity: 0.75 }}>
            {tab === 'syncs'
              ? 'No one in sync yet.'
              : tab === 'requests'
              ? 'No requests.'
              : 'No matches found.'}
          </div>
        ) : null}

        {tab === 'requests' ? (
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            {syncRequests.map((req) => (
              <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => navigateToProfile(req.requester_profile_id)}
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
                      width: 34,
                      height: 34,
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
                    {req.requester_avatar_url ? (
                      <img
                        src={req.requester_avatar_url}
                        alt="Profile"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span>{(req.requester_display_name || 'U').slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <span style={{ fontSize: 13 }}>
                    {req.requester_display_name || `Profile #${req.requester_profile_id}`}
                  </span>
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => approveSync(req.id)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, opacity: 0.9 }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => declineSync(req.id)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, opacity: 0.6 }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === 'syncs' ? (
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            {syncs.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => navigateToProfile(p.id)}
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
                      width: 34,
                      height: 34,
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
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt={p.display_name ?? 'Member'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.currentTarget.src = IMAGE_FALLBACK
                        }}
                      />
                    ) : (
                      (p.display_name ?? 'M').slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <span style={{ fontSize: 13 }}>{p.display_name}</span>
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {tab === 'search' ? (
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            {syncResults.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => navigateToProfile(p.id)}
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
                      width: 34,
                      height: 34,
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
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt={p.display_name ?? 'Member'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.currentTarget.src = IMAGE_FALLBACK
                        }}
                      />
                    ) : (
                      (p.display_name ?? 'M').slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <span style={{ fontSize: 13 }}>{p.display_name}</span>
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => sendSyncRequest(p.id)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, opacity: 0.9 }}
                  >
                    Sync
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToProfile(p.id)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, opacity: 0.7 }}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Container>
    </main>
  )
}

export default function SyncPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', padding: '24px 0 60px' }} />}>
      <SyncPageInner />
    </Suspense>
  )
}
