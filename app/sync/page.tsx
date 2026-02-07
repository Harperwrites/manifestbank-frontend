 'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { api } from '@/lib/api'
import { Container } from '@/app/components/ui'

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

const IMAGE_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="100%" height="100%" fill="#f2ebe6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6f5a4d" font-family="Arial, sans-serif" font-size="16">Image unavailable</text></svg>'
  )

function SyncPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { me } = useAuth()
  const [tab, setTab] = useState<'syncs' | 'requests' | 'search'>('syncs')
  const [syncs, setSyncs] = useState<SyncProfile[]>([])
  const [syncRequests, setSyncRequests] = useState<SyncRequest[]>([])
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
    if (!me) return
    async function load() {
      try {
        setMsg('')
        const [requestsRes, syncsRes] = await Promise.all([
          api.get('/ether/sync/requests'),
          api.get('/ether/syncs'),
        ])
        setSyncRequests(Array.isArray(requestsRes.data) ? requestsRes.data : [])
        setSyncs(Array.isArray(syncsRes.data) ? syncsRes.data : [])
      } catch (e: any) {
        setMsg(e?.response?.data?.detail ?? e?.message ?? 'Failed to load syncs')
      }
    }
    load()
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
