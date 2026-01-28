'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Button, Card, Container, Pill } from '@/app/components/ui'

export const runtime = 'edge'

type Profile = {
  id: number
  display_name: string
  bio?: string | null
  links?: string | null
  avatar_url?: string | null
  is_public: boolean
  store_url?: string | null
}

type EtherPost = {
  id: number
  author_profile_id: number
  kind: string
  content: string
  image_url?: string | null
  created_at: string
  like_count: number
  comment_count: number
  author_display_name?: string | null
  author_avatar_url?: string | null
}

type EtherComment = {
  id: number
  post_id: number
  author_profile_id: number
  content: string
  created_at: string
  author_display_name?: string | null
  author_avatar_url?: string | null
  align_count?: number
}

const IMAGE_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="100%" height="100%" fill="#f2ebe6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6f5a4d" font-family="Arial, sans-serif" font-size="16">Image unavailable</text></svg>'
  )

export default function EtherProfilePage() {
  const params = useParams()
  const router = useRouter()
  const profileId = Number(params?.id)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [meProfileId, setMeProfileId] = useState<number | null>(null)
  const [syncs, setSyncs] = useState<any[]>([])
  const [outgoing, setOutgoing] = useState<any[]>([])
  const [syncing, setSyncing] = useState(false)
  const [posts, setPosts] = useState<EtherPost[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [storeCollapsed, setStoreCollapsed] = useState(false)
  const [storeConfirmOpen, setStoreConfirmOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState<Record<number, boolean>>({})
  const [commentsByPost, setCommentsByPost] = useState<Record<number, EtherComment[]>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({})
  const [commentLoading, setCommentLoading] = useState<Record<number, boolean>>({})
  const [commentMsg, setCommentMsg] = useState<Record<number, string>>({})
  const [confirmAction, setConfirmAction] = useState<null | 'unsync' | 'cancel'>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [etherNoticeCount, setEtherNoticeCount] = useState(0)
  const [etherNoticeLoaded, setEtherNoticeLoaded] = useState(false)

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
    if (!profileId) return
    setLoading(true)
    setMsg('')
    ;(async () => {
      try {
        const pRes = await api.get(`/ether/profiles/${profileId}`)
        setProfile(pRes.data)
      } catch (e: any) {
        setMsg(e?.response?.data?.detail ?? e?.message ?? 'Unable to load profile')
        setLoading(false)
        return
      }

      try {
        const postsRes = await api.get(`/ether/posts/profile/${profileId}`)
        setPosts(postsRes.data)
      } catch (e: any) {
        if (e?.response?.status === 403) {
          setPosts([])
          setMsg('Private profile. Posts are hidden until approved.')
        } else {
          setMsg(e?.response?.data?.detail ?? e?.message ?? 'Unable to load posts')
        }
      }

      const [syncRes, outgoingRes, meRes] = await Promise.allSettled([
        api.get('/ether/syncs'),
        api.get('/ether/sync/requests/outgoing'),
        api.get('/ether/me-profile'),
      ])
      if (syncRes.status === 'fulfilled') setSyncs(syncRes.value.data)
      if (outgoingRes.status === 'fulfilled') setOutgoing(outgoingRes.value.data)
      if (meRes.status === 'fulfilled') setMeProfileId(meRes.value.data?.id ?? null)
      setLoading(false)
    })()
  }, [profileId])

  useEffect(() => {
    if (etherNoticeLoaded) return
    ;(async () => {
      try {
        const [notesRes, syncRes] = await Promise.allSettled([
          api.get('/ether/notifications'),
          api.get('/ether/sync/requests'),
        ])
        const notes = notesRes.status === 'fulfilled' ? notesRes.value.data : []
        const syncs = syncRes.status === 'fulfilled' ? syncRes.value.data : []
        const unread = Array.isArray(notes) ? notes.filter((note: any) => !note.read_at).length : 0
        let profileId = meProfileId
        if (!profileId) {
          try {
            const meRes = await api.get('/ether/me-profile')
            profileId = meRes.data?.id ?? null
          } catch {
            profileId = null
          }
        }
        const myLineUnread = await countUnreadThreads(profileId)
        setEtherNoticeCount(unread + (Array.isArray(syncs) ? syncs.length : 0) + myLineUnread)
        setEtherNoticeLoaded(true)
      } catch {
        setEtherNoticeLoaded(true)
      }
    })()
  }, [etherNoticeLoaded])

  const title = useMemo(() => profile?.display_name ?? 'Ether Profile', [profile])
  const isSynced = useMemo(() => syncs.some((s) => s.id === profile?.id), [syncs, profile?.id])
  const isPending = useMemo(
    () => outgoing.some((r) => r.target_profile_id === profile?.id),
    [outgoing, profile?.id]
  )
  const pendingRequestId = useMemo(() => {
    return outgoing.find((r) => r.target_profile_id === profile?.id)?.id ?? null
  }, [outgoing, profile?.id])
  const canShowPosts = useMemo(() => {
    if (!profile) return false
    if (profile.is_public) return true
    if (profile.id === meProfileId) return true
    return isSynced
  }, [profile, meProfileId, isSynced])

  function bumpCommentCount(postId: number) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p))
    )
  }

  async function loadComments(postId: number) {
    setCommentLoading((prev) => ({ ...prev, [postId]: true }))
    setCommentMsg((prev) => ({ ...prev, [postId]: '' }))
    try {
      const res = await api.get(`/ether/posts/${postId}/comments`)
      setCommentsByPost((prev) => ({ ...prev, [postId]: res.data }))
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e?.message ?? 'Failed to load comments.'
      setCommentMsg((prev) => ({ ...prev, [postId]: msg }))
    } finally {
      setCommentLoading((prev) => ({ ...prev, [postId]: false }))
    }
  }

  async function submitComment(postId: number) {
    const content = (commentDrafts[postId] ?? '').trim()
    if (!content) {
      setCommentMsg((prev) => ({ ...prev, [postId]: 'Enter a comment first.' }))
      return
    }
    setCommentLoading((prev) => ({ ...prev, [postId]: true }))
    setCommentMsg((prev) => ({ ...prev, [postId]: '' }))
    try {
      await api.post(`/ether/posts/${postId}/comments`, { content })
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }))
      await loadComments(postId)
      bumpCommentCount(postId)
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e?.message ?? 'Comment failed.'
      setCommentMsg((prev) => ({ ...prev, [postId]: msg }))
    } finally {
      setCommentLoading((prev) => ({ ...prev, [postId]: false }))
    }
  }

  async function doUnsync() {
    if (!profile) return
    setSyncing(true)
    try {
      await api.delete(`/ether/syncs/${profile.id}`)
      const res = await api.get('/ether/syncs')
      setSyncs(res.data)
    } catch (e: any) {
      setMsg(e?.response?.data?.detail ?? e?.message ?? 'Unsync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function doCancelPending() {
    if (!pendingRequestId) return
    setSyncing(true)
    try {
      await api.delete(`/ether/sync/requests/${pendingRequestId}`)
      const out = await api.get('/ether/sync/requests/outgoing')
      setOutgoing(out.data)
    } catch (e: any) {
      setMsg(e?.response?.data?.detail ?? e?.message ?? 'Cancel failed')
    } finally {
      setSyncing(false)
    }
  }

  async function alignComment(postId: number, commentId: number) {
    setCommentLoading((prev) => ({ ...prev, [postId]: true }))
    setCommentMsg((prev) => ({ ...prev, [postId]: '' }))
    try {
      await api.post(`/ether/comments/${commentId}/align`)
      await loadComments(postId)
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e?.message ?? 'Align failed.'
      setCommentMsg((prev) => ({ ...prev, [postId]: msg }))
    } finally {
      setCommentLoading((prev) => ({ ...prev, [postId]: false }))
    }
  }

  function renderLinkedText(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi
    const parts = text.split(urlRegex)
    return parts.map((part, index) => {
      if (!part) return null
      const isLink =
        part.startsWith('http://') ||
        part.startsWith('https://') ||
        part.startsWith('www.') ||
        /^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(part)
      if (isLink) {
        const punctuationMatch = part.match(/^(.*?)([),.!?:;]+)$/)
        const linkText = punctuationMatch ? punctuationMatch[1] : part
        const trailing = punctuationMatch ? punctuationMatch[2] : ''
        const href = linkText.startsWith('http://')
          ? linkText
          : linkText.startsWith('https://')
            ? linkText
            : `https://${linkText}`
        return (
          <span key={`link-${index}`}>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              style={{
                color: '#b97e68',
                textDecorationLine: 'none',
                textDecorationColor: 'rgba(185, 126, 104, 0.75)',
                transition: 'color 160ms ease, text-decoration-color 160ms ease',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.textDecorationLine = 'underline'
                event.currentTarget.style.textDecorationColor = 'rgba(185, 126, 104, 0.95)'
                event.currentTarget.style.color = '#d09a85'
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.textDecorationLine = 'none'
                event.currentTarget.style.textDecorationColor = 'rgba(185, 126, 104, 0.75)'
                event.currentTarget.style.color = '#b97e68'
              }}
            >
              {linkText}
            </a>
            {trailing}
          </span>
        )
      }
      return <span key={`text-${index}`}>{part}</span>
    })
  }

  return (
    <main>
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 60,
        }}
      >
        <button
          type="button"
          onClick={() => router.push('/ether')}
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
          {etherNoticeCount ? (
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
              {etherNoticeCount}
            </span>
          ) : null}
        </button>
      </div>
      <Container>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 24 }}>
          <Button
            variant="outline"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back()
                return
              }
              if (typeof window !== 'undefined') {
                const stored = window.sessionStorage.getItem('ether:last_view')
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
              }
              router.push('/ether')
            }}
          >
            ← Back to My Ether Dashboard
          </Button>
          <div style={{ fontWeight: 600 }}>{title}</div>
        </div>

        <section style={{ marginTop: 16 }}>
          <div
            className="ether-profile-layout"
            style={{
              display: 'grid',
              gap: 16,
              alignItems: 'start',
              gridTemplateColumns:
                profile?.store_url && !storeCollapsed
                  ? 'var(--ether-profile-columns, minmax(0, 260px) minmax(0, 1fr))'
                  : 'minmax(0, 1fr)',
            }}
          >
            {profile?.store_url && !storeCollapsed ? (
              <div
                style={{
                  position: 'relative',
                  borderRadius: 18,
                  padding: 12,
                  border: '1px solid rgba(122, 89, 73, 0.35)',
                  background:
                    'linear-gradient(140deg, rgba(248, 238, 232, 0.95), rgba(246, 230, 220, 0.8) 45%, rgba(255, 255, 255, 0.95))',
                  boxShadow: '0 18px 30px rgba(163, 114, 88, 0.22)',
                }}
              >
                <button
                  type="button"
                  aria-label="Hide store"
                  onClick={() => setStoreCollapsed(true)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    border: 'none',
                    background: 'rgba(255,255,255,0.7)',
                    borderRadius: 999,
                    width: 26,
                    height: 26,
                    cursor: 'pointer',
                    fontWeight: 700,
                    color: '#6f4a3a',
                    boxShadow: '0 6px 16px rgba(140, 96, 72, 0.2)',
                  }}
                >
                  ×
                </button>
                <div style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.7 }}>
                  Featured Store
                </div>
                <div style={{ fontWeight: 700, fontSize: 18, marginTop: 6 }}>ManifestBank™ Picks</div>
                <button
                  type="button"
                  onClick={() => setStoreConfirmOpen(true)}
                  style={{
                    marginTop: 10,
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <img
                    src="/affirmation-coloring-journal.png"
                    alt="Affirmation and Healing Coloring Journal"
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      border: '1px solid rgba(122, 89, 73, 0.25)',
                      boxShadow: '0 16px 28px rgba(133, 92, 71, 0.2)',
                    }}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setStoreConfirmOpen(true)}
                  style={{
                    marginTop: 10,
                    width: '100%',
                    borderRadius: 999,
                    border: '1px solid rgba(122, 89, 73, 0.35)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    padding: '8px 12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Visit Amazon Listing
                </button>
              </div>
            ) : null}

            <div style={{ display: 'grid', gap: 16 }}>
              <Card title="Profile" tone="soft" right={<Pill>{profile?.is_public ? 'Public' : 'Private'}</Pill>}>
                {loading ? (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Loading profile…</div>
                ) : profile ? (
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (profile.avatar_url) {
                          setAvatarPreviewUrl(profile.avatar_url)
                        }
                      }}
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        border: '1px solid rgba(95, 74, 62, 0.35)',
                        background: 'rgba(255,255,255,0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        fontWeight: 700,
                        cursor: profile.avatar_url ? 'pointer' : 'default',
                        padding: 0,
                        boxShadow: '0 0 18px rgba(182, 121, 103, 0.45)',
                      }}
                      aria-label="View profile photo"
                    >
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span>{profile.display_name?.slice(0, 1)?.toUpperCase() ?? '◎'}</span>
                      )}
                    </button>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 600 }}>{profile.display_name}</div>
                    {profile.id !== meProfileId ? (
                      isSynced ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '2px 8px',
                            borderRadius: 999,
                            border: '1px solid rgba(182, 121, 103, 0.6)',
                            background: 'rgba(255,255,255,0.9)',
                            color: '#6f4a3a',
                            fontSize: 12,
                            fontWeight: 600,
                            boxShadow: '0 10px 18px rgba(182, 121, 103, 0.24)',
                            cursor: 'pointer',
                          }}
                          onClick={() => setConfirmAction('unsync')}
                        >
                          In sync <span style={{ fontSize: 12 }}>🌟</span>
                        </span>
                      ) : isPending ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '2px 8px',
                            borderRadius: 999,
                            border: '1px solid rgba(182, 121, 103, 0.6)',
                            background: 'rgba(255,255,255,0.9)',
                            color: '#6f4a3a',
                            fontSize: 12,
                            fontWeight: 600,
                            boxShadow: '0 10px 18px rgba(182, 121, 103, 0.24)',
                            cursor: 'pointer',
                          }}
                          onClick={() => setConfirmAction('cancel')}
                        >
                          Pending <span style={{ fontSize: 12 }}>…</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            setSyncing(true)
                            try {
                              await api.post(`/ether/sync/requests/${profile.id}`)
                              const res = await api.get('/ether/syncs')
                              setSyncs(res.data)
                              const out = await api.get('/ether/sync/requests/outgoing')
                              setOutgoing(out.data)
                            } catch (e: any) {
                              setMsg(e?.response?.data?.detail ?? e?.message ?? 'Sync failed')
                            } finally {
                              setSyncing(false)
                            }
                          }}
                          disabled={syncing}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '2px 8px',
                            borderRadius: 999,
                            border: '1px solid rgba(182, 121, 103, 0.6)',
                            background: 'rgba(255,255,255,0.9)',
                            color: '#6f4a3a',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 -8px 16px rgba(182, 121, 103, 0.22)',
                            transition: 'transform 160ms ease, box-shadow 160ms ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow =
                              '0 -10px 20px rgba(182, 121, 103, 0.32)'
                            e.currentTarget.style.transform = 'translateY(-1px)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow =
                              '0 -8px 16px rgba(182, 121, 103, 0.22)'
                            e.currentTarget.style.transform = 'translateY(0)'
                          }}
                          aria-label="Sync"
                        >
                          <span style={{ fontWeight: 700 }}>{syncing ? '·' : '+'}</span>
                          Sync
                        </button>
                      )
                    ) : null}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{profile.bio || 'No bio yet.'}</div>
                  {profile.links ? (
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.08 }}>
                        Links
                      </div>
                      <div style={{ display: 'grid', gap: 4, fontSize: 12 }}>
                        {profile.links
                          .split(/\r?\n/)
                          .map((link) => link.trim())
                          .filter(Boolean)
                          .map((link, index) => (
                            <div key={`${link}-${index}`}>{renderLinkedText(link)}</div>
                          ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#7a2e2e' }}>{msg}</div>
                )}
              </Card>

              <section>
                {canShowPosts ? (
                  <Card title="Posts" tone="soft" right={<Pill>{posts.length} posts</Pill>}>
                    {posts.length === 0 ? (
                      <div style={{ fontSize: 13, opacity: 0.7 }}>No posts yet.</div>
                    ) : (
                      <div style={{ display: 'grid', gap: 12 }}>
                        {posts.map((post) => (
                          <div
                            key={post.id}
                            style={{
                              padding: 10,
                              borderRadius: 14,
                              border: '1px solid rgba(95, 74, 62, 0.2)',
                              background: 'rgba(255, 255, 255, 0.7)',
                              overflow: 'hidden',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: '50%',
                                    border: '1px solid rgba(95, 74, 62, 0.25)',
                                    background: 'rgba(255,255,255,0.9)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    fontSize: 10,
                                    fontWeight: 600,
                                  }}
                                >
                                  {post.author_avatar_url ? (
                                    <img
                                      src={post.author_avatar_url}
                                      alt={post.author_display_name ?? 'Member'}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      onError={(e) => {
                                        e.currentTarget.src = IMAGE_FALLBACK
                                      }}
                                    />
                                  ) : (
                                    (post.author_display_name ?? 'M').slice(0, 1).toUpperCase()
                                  )}
                                </div>
                                <div style={{ fontWeight: 600, fontSize: 12 }}>
                                  {post.author_display_name ?? 'Member'}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3 }}>
                                  {post.kind.toUpperCase()}
                                </div>
                                <div style={{ fontSize: 12, opacity: 0.7 }}>{new Date(post.created_at).toLocaleString()}</div>
                              </div>
                            </div>
                            <div style={{ marginTop: 6, fontSize: 13, overflowWrap: 'anywhere' }}>
                              {renderLinkedText(post.content)}
                            </div>
                            {post.image_url ? (
                              <img
                                src={post.image_url}
                                alt="Post"
                                style={{ marginTop: 8, width: '100%', borderRadius: 10 }}
                                onError={(e) => {
                                  e.currentTarget.src = IMAGE_FALLBACK
                                }}
                              />
                            ) : null}
                            <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                              <div style={{ fontSize: 12, opacity: 0.7 }}>Aligned · {post.like_count}</div>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setCommentsOpen((prev) => {
                                    const next = !prev[post.id]
                                    if (next && !commentsByPost[post.id]) {
                                      loadComments(post.id)
                                    }
                                    return { ...prev, [post.id]: next }
                                  })
                                }}
                              >
                                Comments · {post.comment_count}
                              </Button>
                            </div>
                            {commentsOpen[post.id] ? (
                              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                                {commentLoading[post.id] ? (
                                  <div style={{ fontSize: 12, opacity: 0.7 }}>Loading comments…</div>
                                ) : commentsByPost[post.id]?.length ? (
                                  <div style={{ display: 'grid', gap: 6 }}>
                                    {commentsByPost[post.id].map((comment) => (
                                      <div
                                        key={comment.id}
                                        style={{
                                          padding: 8,
                                          borderRadius: 10,
                                          border: '1px solid rgba(95, 74, 62, 0.2)',
                                          background: 'rgba(255, 255, 255, 0.85)',
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (typeof window !== 'undefined') {
                                                window.sessionStorage.setItem(
                                                  'ether:last_view',
                                                  JSON.stringify({
                                                    path: window.location.pathname + window.location.search,
                                                  })
                                                )
                                              }
                                              router.push(`/ether/profile/${comment.author_profile_id}`)
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
                                              transition: 'text-shadow 180ms ease, color 180ms ease',
                                            }}
                                            onMouseEnter={(e) => {
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
                                                width: 22,
                                                height: 22,
                                                borderRadius: '50%',
                                                border: '1px solid rgba(95, 74, 62, 0.25)',
                                                background: 'rgba(255,255,255,0.9)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden',
                                                fontSize: 11,
                                                fontWeight: 600,
                                              }}
                                            >
                                              {comment.author_avatar_url ? (
                                                <img
                                                  src={comment.author_avatar_url}
                                                  alt={comment.author_display_name ?? 'Member'}
                                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                              ) : (
                                                <span>{comment.author_display_name?.slice(0, 1)?.toUpperCase() ?? '◎'}</span>
                                              )}
                                            </div>
                                            <div style={{ fontSize: 12, fontWeight: 600 }}>
                                              {comment.author_display_name ?? 'Member'}
                                            </div>
                                          </button>
                                          <div style={{ fontSize: 12, opacity: 0.7 }}>
                                            {new Date(comment.created_at).toLocaleString()}
                                          </div>
                                        </div>
                                        <div style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{comment.content}</div>
                                        <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                                          <Button
                                            variant="outline"
                                            onClick={() => alignComment(post.id, comment.id)}
                                            disabled={commentLoading[post.id]}
                                          >
                                            Align · {comment.align_count ?? 0}
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 12, opacity: 0.7 }}>No comments yet.</div>
                                )}

                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    placeholder="Write a comment..."
                                    value={commentDrafts[post.id] ?? ''}
                                    onChange={(e) =>
                                      setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                                    }
                                    style={{
                                      flex: 1,
                                      padding: '8px 10px',
                                      borderRadius: 10,
                                      border: '1px solid rgba(95, 74, 62, 0.3)',
                                      background: 'rgba(255, 255, 255, 0.9)',
                                      fontSize: 12,
                                    }}
                                  />
                                  <Button
                                    variant="solid"
                                    onClick={() => submitComment(post.id)}
                                    disabled={commentLoading[post.id]}
                                  >
                                    {commentLoading[post.id] ? 'Posting…' : 'Comment'}
                                  </Button>
                                </div>
                                {commentMsg[post.id] ? (
                                  <div style={{ fontSize: 12, color: '#7a2e2e' }}>{commentMsg[post.id]}</div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ) : (
                  <Card title="Posts" tone="soft">
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      Private profile. Posts are hidden until you are in sync.
                    </div>
                  </Card>
                )}
              </section>
            </div>
          </div>
        </section>

        {profile?.store_url && storeCollapsed ? (
          <button
            type="button"
            onClick={() => setStoreCollapsed(false)}
            style={{
              position: 'fixed',
              left: 18,
              bottom: 18,
              borderRadius: 999,
              border: '1px solid rgba(122, 89, 73, 0.4)',
              background: 'rgba(255,255,255,0.92)',
              padding: '8px 14px',
              fontWeight: 600,
              boxShadow: '0 14px 24px rgba(140, 96, 72, 0.25)',
              cursor: 'pointer',
              zIndex: 40,
            }}
          >
            Store
          </button>
        ) : null}

        {storeConfirmOpen && profile?.store_url ? (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(22, 16, 12, 0.35)',
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <div
              style={{
                maxWidth: 420,
                width: '100%',
                borderRadius: 18,
                border: '1px solid rgba(122, 89, 73, 0.45)',
                background:
                  'linear-gradient(145deg, rgba(246, 230, 220, 0.95), rgba(235, 214, 201, 0.98) 45%, rgba(255, 255, 255, 0.95))',
                boxShadow: '0 28px 60px rgba(96, 62, 46, 0.35)',
                padding: 18,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16 }}>Leaving ManifestBank™</div>
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
                You're about to open our Amazon listing in a new tab. See you in a bit!
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setStoreConfirmOpen(false)}
                  style={{
                    borderRadius: 999,
                    border: '1px solid rgba(122, 89, 73, 0.3)',
                    background: 'rgba(255,255,255,0.85)',
                    padding: '6px 12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.open(profile.store_url ?? 'https://a.co/d/856lhhB', '_blank', 'noopener,noreferrer')
                    setStoreConfirmOpen(false)
                  }}
                  style={{
                    borderRadius: 999,
                    border: '1px solid rgba(122, 89, 73, 0.5)',
                    background: 'rgba(255,255,255,0.95)',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Open Amazon
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {confirmAction ? (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(22, 16, 12, 0.35)',
              zIndex: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
            onClick={() => setConfirmAction(null)}
          >
            <div
              style={{
                maxWidth: 420,
                width: '100%',
                borderRadius: 18,
                border: '1px solid rgba(122, 89, 73, 0.45)',
                background:
                  'linear-gradient(145deg, rgba(246, 230, 220, 0.95), rgba(235, 214, 201, 0.98) 45%, rgba(255, 255, 255, 0.95))',
                boxShadow: '0 28px 60px rgba(96, 62, 46, 0.35)',
                padding: 18,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {confirmAction === 'unsync' ? 'Remove Sync' : 'Cancel Sync Request'}
              </div>
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
                {confirmAction === 'unsync'
                  ? 'Remove sync with this user?'
                  : 'Cancel this pending sync request?'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  style={{
                    borderRadius: 999,
                    border: '1px solid rgba(122, 89, 73, 0.3)',
                    background: 'rgba(255,255,255,0.85)',
                    padding: '6px 12px',
                    cursor: 'pointer',
                  }}
                >
                  Keep
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirmAction === 'unsync') {
                      await doUnsync()
                    } else {
                      await doCancelPending()
                    }
                    setConfirmAction(null)
                  }}
                  style={{
                    borderRadius: 999,
                    border: '1px solid rgba(122, 89, 73, 0.5)',
                    background: 'rgba(255,255,255,0.95)',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {avatarPreviewUrl ? (
          <div
            onClick={() => setAvatarPreviewUrl(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(21, 16, 12, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 70,
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(360px, 100%)',
                borderRadius: 24,
                background: 'rgba(255, 255, 255, 0.96)',
                border: '1px solid rgba(95, 74, 62, 0.2)',
                boxShadow: 'var(--shadow)',
                padding: 16,
              }}
            >
              <img
                src={avatarPreviewUrl}
                alt="Profile"
                style={{ width: '100%', height: 'auto', borderRadius: 18, display: 'block' }}
              />
            </div>
          </div>
        ) : null}
      </Container>
    </main>
  )
}
