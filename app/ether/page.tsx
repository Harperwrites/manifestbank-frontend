 'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { api } from '@/lib/api'
import { Button, Card, Container, Pill } from '@/app/components/ui'
import InstallAppButton from '@/app/components/InstallAppButton'

type Profile = {
  id: number
  display_name: string
  bio?: string | null
  avatar_url?: string | null
  is_public: boolean
  sync_requires_approval: boolean
}

type EtherPost = {
  id: number
  author_profile_id: number
  kind: string
  content: string
  image_url?: string | null
  created_at: string
  like_count: number
  liked_by_me?: boolean
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
  aligned_by_me?: boolean
}

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

const IMAGE_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="100%" height="100%" fill="#f2ebe6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6f5a4d" font-family="Arial, sans-serif" font-size="16">Image unavailable</text></svg>'
  )

function EtherNavbar({
  profile,
  updateSettings,
  onAvatarSelect,
}: {
  profile: Profile | null
  updateSettings: (next: Partial<Profile>) => void
  onAvatarSelect: (file: File) => void
}) {
  const router = useRouter()
  const { me, isLoading, logout, refreshMe } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement | null>(null)
  const [accountsOpen, setAccountsOpen] = useState(false)
  const accountsRef = useRef<HTMLDivElement | null>(null)
  const [accountsMenuRect, setAccountsMenuRect] = useState<DOMRect | null>(null)
  const accountsMenuRef = useRef<HTMLDivElement | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [accountsLoaded, setAccountsLoaded] = useState(false)
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accountsMsg, setAccountsMsg] = useState('')
  const [settingsBio, setSettingsBio] = useState('')
  const [settingsUsername, setSettingsUsername] = useState('')
  const [profileEditOpen, setProfileEditOpen] = useState(false)
  const profileEditOpenedRef = useRef(false)
  const profileEditBodyLockRef = useRef<{ overflow: string; touchAction: string } | null>(null)
  const [portalReady, setPortalReady] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'current'
  >('idle')
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [settingsBioNotice, setSettingsBioNotice] = useState('')
  const [settingsUsernameNotice, setSettingsUsernameNotice] = useState('')

  function pushToast(message: string) {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('auth:logged_out', { detail: { message } }))
  }

  useEffect(() => {
    if (!settingsOpen && !accountsOpen && !profileEditOpen) return
    function handleClick(event: MouseEvent) {
      const target = event.target as Node
      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setSettingsOpen(false)
      }
      if (
        accountsRef.current &&
        !accountsRef.current.contains(target) &&
        (!accountsMenuRef.current || !accountsMenuRef.current.contains(target))
      ) {
        setAccountsOpen(false)
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSettingsOpen(false)
        setAccountsOpen(false)
        setProfileEditOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [settingsOpen, accountsOpen, profileEditOpen])

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!settingsOpen && !profileEditOpen) {
      profileEditOpenedRef.current = false
      return
    }
    const wasOpen = profileEditOpenedRef.current
    setSettingsBio(profile?.bio ?? '')
    setSettingsUsername(me?.username ?? '')
    setUsernameStatus('idle')
    if (!wasOpen) {
      setSettingsBioNotice('')
      setSettingsUsernameNotice('')
    }
    profileEditOpenedRef.current = true
  }, [settingsOpen, profileEditOpen, profile?.bio, me?.username])

  useEffect(() => {
    if (!profileEditOpen) {
      if (profileEditBodyLockRef.current) {
        document.body.style.overflow = profileEditBodyLockRef.current.overflow
        document.body.style.touchAction = profileEditBodyLockRef.current.touchAction
        profileEditBodyLockRef.current = null
      }
      return
    }
    if (typeof document === 'undefined') return
    if (!profileEditBodyLockRef.current) {
      profileEditBodyLockRef.current = {
        overflow: document.body.style.overflow,
        touchAction: document.body.style.touchAction,
      }
    }
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    return () => {
      if (profileEditBodyLockRef.current) {
        document.body.style.overflow = profileEditBodyLockRef.current.overflow
        document.body.style.touchAction = profileEditBodyLockRef.current.touchAction
        profileEditBodyLockRef.current = null
      }
    }
  }, [profileEditOpen])

  useEffect(() => {
    if (!accountsOpen) return
    if (accountsLoaded) return
    if (accountsLoading) return
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
            ...acct,
            balance: balanceMap.get(acct.id) ?? 0,
          }))
        )
        setAccountsLoaded(true)
      })
      .catch((e) => setAccountsMsg(e?.response?.data?.detail ?? e?.message ?? 'Failed to load accounts'))
      .finally(() => setAccountsLoading(false))
  }, [accountsOpen, accountsLoaded, accountsLoading])

  function formatMoney(value: any) {
    const num = Number(value)
    if (Number.isNaN(num)) return value ?? ''
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
  }

  async function checkUsernameAvailability(value: string) {
    const trimmed = value.trim()
    if (!trimmed) {
      setUsernameStatus('invalid')
      return
    }
    if (me?.username && trimmed.toLowerCase() === me.username.toLowerCase()) {
      setUsernameStatus('current')
      return
    }
    setUsernameStatus('checking')
    try {
      const res = await api.get('/auth/username-available', { params: { username: trimmed } })
      setUsernameStatus(res.data?.available ? 'available' : 'taken')
    } catch {
      setUsernameStatus('invalid')
    }
  }

  async function saveUsername() {
    const trimmed = settingsUsername.trim()
    if (!trimmed) {
      setUsernameStatus('invalid')
      return
    }
    setSettingsBusy(true)
    setSettingsUsernameNotice('')
    try {
      await api.patch('/auth/username', { username: trimmed })
      await updateSettings({ display_name: trimmed })
      await refreshMe()
      setUsernameStatus('current')
      setSettingsUsernameNotice('Username updated.')
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e?.message ?? 'Username update failed'
      setSettingsUsernameNotice(msg)
      if (e?.response?.status === 400) {
        setUsernameStatus('taken')
      }
    } finally {
      setSettingsBusy(false)
    }
  }

  return (
    <div
      style={{
        position: 'static',
        padding: '6px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(248, 242, 235, 0.96)',
        backdropFilter: 'blur(14px)',
        color: '#3b2b24',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div ref={accountsRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setAccountsOpen((open) => {
                  const next = !open
                if (next && accountsRef.current) {
                  setAccountsMenuRect(accountsRef.current.getBoundingClientRect())
                }
                return next
              })
            }}
            style={{
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: 600,
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              textAlign: 'left',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--ink)',
            }}
          >
            ManifestBank
            <span style={{ fontSize: 14, opacity: 0.7 }}>▾</span>
          </button>
          {accountsOpen && portalReady
            ? createPortal(
                <div
                  ref={accountsMenuRef}
                  style={{
                    position: 'fixed',
                    top: accountsMenuRect?.bottom ? accountsMenuRect.bottom + 8 : 72,
                    left: accountsMenuRect?.left ?? 20,
                    width: 280,
                    borderRadius: 14,
                    border: '1px solid rgba(95, 74, 62, 0.25)',
                    background: '#ffffff',
                    opacity: 1,
                    backdropFilter: 'none',
                    backgroundImage: 'none',
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.12)',
                    padding: 12,
                    display: 'grid',
                    gap: 10,
                    zIndex: 99999,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>Accounts</div>
                  {accountsLoading ? (
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Loading…</div>
                  ) : accountsMsg ? (
                    <div style={{ fontSize: 12, color: '#7a2e2e' }}>{accountsMsg}</div>
                  ) : accounts.length === 0 ? (
                    <div style={{ fontSize: 12, opacity: 0.7 }}>No accounts yet.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {accounts.map((account) => (
                        <div
                          key={account.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 10,
                            fontSize: 13,
                            paddingBottom: 6,
                            borderBottom: '1px solid rgba(95, 74, 62, 0.12)',
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{account.name}</div>
                          <div style={{ opacity: 0.8 }}>{formatMoney(account.balance)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      router.push('/dashboard')
                      setAccountsOpen(false)
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(95, 74, 62, 0.25)',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Open Dashboard
                  </button>
                </div>,
                document.body
              )
            : null}
        </div>
        <InstallAppButton />
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Link href="/ether" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <img src="/ether-logo.png" alt="The Ether" style={{ height: 180, width: 'auto' }} />
        </Link>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 14, alignItems: 'center' }}>
        <div
          ref={settingsRef}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, position: 'relative' }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {isLoading ? (
              <span style={{ opacity: 0.75 }}>Loading…</span>
            ) : me ? (
              <>
                <span style={{ opacity: 0.9 }}>
                  Signed in as <b>{me.email}</b>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    router.push('/auth')
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: '1px solid rgba(95, 74, 62, 0.35)',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link href="/auth" style={{ textDecoration: 'none' }}>
                Login
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen((open) => !open)}
            style={{
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 22,
              lineHeight: 1,
            }}
            aria-label="Settings menu"
          >
            ☰
          </button>
          {settingsOpen ? (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                width: 260,
                borderRadius: 14,
                border: '1px solid rgba(182, 121, 103, 0.35)',
                background: 'linear-gradient(180deg, rgba(245, 234, 223, 0.98), rgba(230, 207, 192, 0.98))',
                boxShadow: '0 18px 42px rgba(26, 18, 14, 0.2)',
                padding: 12,
                display: 'grid',
                gap: 10,
                zIndex: 20,
              }}
            >
              <div style={{ fontWeight: 600, color: '#3b2b24' }}>Settings</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={profile?.is_public ?? true}
                  onChange={(e) => updateSettings({ is_public: e.target.checked })}
                />
                <span style={{ color: '#3b2b24' }}>Public profile</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={profile?.sync_requires_approval ?? true}
                  onChange={async (e) => {
                    const nextValue = e.target.checked
                    try {
                      await updateSettings({ sync_requires_approval: nextValue })
                      pushToast(
                        nextValue
                          ? 'Sync approvals are now required.'
                          : 'Sync approvals are now auto-approved.'
                      )
                    } catch (err: any) {
                      const message = err?.response?.data?.detail ?? err?.message ?? 'Update failed.'
                      pushToast(message)
                    }
                  }}
                />
                <span style={{ color: '#3b2b24' }}>Require approval for Sync</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setProfileEditOpen(true)
                  setSettingsOpen(false)
                }}
                style={{
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  textAlign: 'left',
                  color: '#6f4a3a',
                }}
              >
                Edit Profile
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {profileEditOpen && portalReady
        ? createPortal(
            <div
              onClick={() => setProfileEditOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                height: '100svh',
                minHeight: '100svh',
                width: '100vw',
                background: 'rgba(12, 8, 6, 0.9)',
                display: 'grid',
                placeItems: 'center',
                zIndex: 2147483646,
                padding: 20,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: 'min(520px, 100%)',
                  maxHeight: 'calc(100dvh - 40px)',
                  overflowY: 'auto',
                  borderRadius: 20,
                  background:
                    'linear-gradient(135deg, rgba(199, 140, 122, 0.96), rgba(220, 193, 179, 0.98)), radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.7), transparent 52%), radial-gradient(circle at 78% 10%, rgba(255, 255, 255, 0.45), transparent 58%), linear-gradient(25deg, rgba(80, 58, 48, 0.35) 0%, rgba(255, 255, 255, 0.12) 22%, rgba(80, 58, 48, 0.32) 40%, rgba(255, 255, 255, 0.1) 58%, rgba(80, 58, 48, 0.28) 100%), linear-gradient(115deg, rgba(90, 66, 54, 0.32) 0%, rgba(255, 255, 255, 0.1) 20%, rgba(90, 66, 54, 0.3) 42%, rgba(255, 255, 255, 0.1) 60%, rgba(90, 66, 54, 0.26) 100%), linear-gradient(160deg, rgba(66, 47, 38, 0.28) 0%, rgba(255, 255, 255, 0.08) 25%, rgba(66, 47, 38, 0.26) 48%, rgba(255, 255, 255, 0.08) 70%, rgba(66, 47, 38, 0.22) 100%)',
                  border: '1px solid rgba(95, 74, 62, 0.2)',
                  boxShadow: 'var(--shadow)',
                  padding: 20,
                }}
              >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600 }}>Edit Profile</div>
              <button
                type="button"
                onClick={() => setProfileEditOpen(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 14,
                  opacity: 0.7,
                }}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 12, opacity: 0.7 }}>Bio</label>
                <textarea
                  value={settingsBio}
                  onChange={(e) => setSettingsBio(e.target.value)}
                  rows={3}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid rgba(95, 74, 62, 0.3)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: 12,
                    resize: 'vertical',
                  }}
                />
                <Button
                  variant="outline"
                  onClick={async () => {
                    setSettingsBusy(true)
                    setSettingsBioNotice('')
                    try {
                      await updateSettings({ bio: settingsBio })
                      setSettingsBioNotice('Bio updated.')
                    } catch (e: any) {
                      const msg = e?.response?.data?.detail ?? e?.message ?? 'Unable to update bio.'
                      setSettingsBioNotice(msg)
                    } finally {
                      setSettingsBusy(false)
                    }
                  }}
                  disabled={settingsBusy}
                >
                  {settingsBusy ? 'Saving…' : 'Save bio'}
                </Button>
                {settingsBioNotice ? (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: '#5f3f35',
                      background: 'rgba(255, 255, 255, 0.75)',
                      border: '1px solid rgba(122, 89, 73, 0.3)',
                      borderRadius: 10,
                      padding: '6px 10px',
                    }}
                  >
                    {settingsBioNotice}
                  </div>
                ) : null}
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 12, opacity: 0.7 }}>Username</label>
                <input
                  value={settingsUsername}
                  onChange={(e) => {
                    setSettingsUsername(e.target.value)
                    setUsernameStatus('idle')
                  }}
                  onBlur={(e) => checkUsernameAvailability(e.target.value)}
                  placeholder="Choose a username"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid rgba(95, 74, 62, 0.3)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: 12,
                  }}
                />
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  {usernameStatus === 'checking'
                    ? 'Checking availability…'
                    : usernameStatus === 'available'
                    ? 'Username available.'
                    : usernameStatus === 'taken'
                    ? 'Username already in use.'
                    : usernameStatus === 'current'
                    ? 'Current username.'
                    : usernameStatus === 'invalid'
                    ? 'Enter a valid username.'
                    : ' '}
                </div>
                <Button
                  variant="outline"
                  onClick={saveUsername}
                  disabled={
                    settingsBusy ||
                    usernameStatus === 'checking' ||
                    usernameStatus === 'taken' ||
                    usernameStatus === 'invalid'
                  }
                >
                  {settingsBusy ? 'Saving…' : 'Save username'}
                </Button>
                {settingsUsernameNotice ? (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: '#5f3f35',
                      background: 'rgba(255, 255, 255, 0.75)',
                      border: '1px solid rgba(122, 89, 73, 0.3)',
                      borderRadius: 10,
                      padding: '6px 10px',
                    }}
                  >
                    {settingsUsernameNotice}
                  </div>
                ) : null}
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 12, opacity: 0.7 }}>Avatar upload</label>
                <label
                  htmlFor="ether-avatar-upload"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(95, 74, 62, 0.35)',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 12,
                    width: 'fit-content',
                  }}
                >
                  Choose image
                </label>
                <input
                  id="ether-avatar-upload"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onAvatarSelect(file)
                  }}
                />
              </div>

              
            </div>
              </div>
            </div>,
            document.body
          )
        : null}

    </div>
  )
}

export default function EtherPage() {
  const { me } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [feed, setFeed] = useState<EtherPost[]>([])
  const [timeline, setTimeline] = useState<EtherPost[]>([])
  const [myPosts, setMyPosts] = useState<EtherPost[]>([])
  const [kind, setKind] = useState('manifestation')
  const [content, setContent] = useState('')
  const [postImageUrl, setPostImageUrl] = useState<string | null>(null)
  const [postImageInputKey, setPostImageInputKey] = useState(0)
  const [postImageName, setPostImageName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [role, setRole] = useState('user')
  const [activeTab, setActiveTab] = useState<'feed' | 'timeline' | 'mine'>('feed')
  const [groups, setGroups] = useState<any[]>([])
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [syncQuery, setSyncQuery] = useState('')
  const [syncResults, setSyncResults] = useState<any[]>([])
  const [syncRequests, setSyncRequests] = useState<SyncRequest[]>([])
  const [syncs, setSyncs] = useState<any[]>([])
  const [syncSearching, setSyncSearching] = useState(false)
  const [syncMenuOpen, setSyncMenuOpen] = useState(false)
  const [syncMenuTab, setSyncMenuTab] = useState<'syncs' | 'requests' | 'search'>('syncs')
  const syncMenuRef = useRef<HTMLDivElement | null>(null)
  const [threads, setThreads] = useState<any[]>([])
  const [activeThread, setActiveThread] = useState<number | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [messageText, setMessageText] = useState('')
  const [avatarCropOpen, setAvatarCropOpen] = useState(false)
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null)
  const [avatarCropZoom, setAvatarCropZoom] = useState(1)
  const [avatarCropSaving, setAvatarCropSaving] = useState(false)
  const [avatarCropLoaded, setAvatarCropLoaded] = useState(false)
  const avatarImageRef = useRef<HTMLImageElement | null>(null)
  const [avatarCropOffset, setAvatarCropOffset] = useState({ x: 0, y: 0 })
  const [avatarDragStart, setAvatarDragStart] = useState({ x: 0, y: 0 })
  const [avatarOffsetStart, setAvatarOffsetStart] = useState({ x: 0, y: 0 })
  const [avatarDragging, setAvatarDragging] = useState(false)
  const [avatarOptionsOpen, setAvatarOptionsOpen] = useState(false)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const avatarReuploadRef = useRef<HTMLInputElement | null>(null)
  const [tabInitialized, setTabInitialized] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState<Record<number, boolean>>({})
  const [commentsByPost, setCommentsByPost] = useState<Record<number, EtherComment[]>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({})
  const [commentLoading, setCommentLoading] = useState<Record<number, boolean>>({})
  const [commentMsg, setCommentMsg] = useState<Record<number, string>>({})
  const [notifications, setNotifications] = useState<EtherNotification[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement | null>(null)
  const unreadNotifications = notifications.filter((n) => !n.read_at).length
  const [focusPostId, setFocusPostId] = useState<number | null>(null)
  const [focusPostOpenComments, setFocusPostOpenComments] = useState<number | null>(null)
  const [focusCommentId, setFocusCommentId] = useState<number | null>(null)
  const [hoveredPostAuthorId, setHoveredPostAuthorId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    setMsg('')
    try {
      const [pRes, fRes, tlineRes, mineRes, gRes, sRes, syncRes, meRes, tRes, nRes] = await Promise.all([
        api.get('/ether/me-profile'),
        api.get('/ether/feed'),
        api.get('/ether/timeline'),
        api.get('/ether/posts/mine'),
        api.get('/ether/groups'),
        api.get('/ether/sync/requests'),
        api.get('/ether/syncs'),
        api.get('/auth/me'),
        api.get('/ether/threads'),
        api.get('/ether/notifications'),
      ])
      setProfile(pRes.data)
      setFeed(fRes.data)
      setTimeline(tlineRes.data)
      setMyPosts(mineRes.data)
      setGroups(gRes.data)
      setSyncRequests(sRes.data)
      setSyncs(syncRes.data)
      setRole(meRes.data?.role ?? 'user')
      setThreads(tRes.data)
      setNotifications(nRes.data)
    } catch (e: any) {
      setMsg(e?.response?.data?.detail ?? e?.message ?? 'Failed to load The Ether')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!me) return
    if (me.email_verified === false) {
      router.replace('/verify-email?next=/ether')
    }
  }, [me, router])

  useEffect(() => {
    if (tabInitialized) return
    setTabInitialized(true)
    if (typeof window === 'undefined') return
    const stored = window.sessionStorage.getItem('ether:last_view')
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as { tab?: string }
      if (parsed.tab === 'feed' || parsed.tab === 'timeline' || parsed.tab === 'mine') {
        setActiveTab(parsed.tab)
      }
    } catch {
      // ignore invalid storage
    }
  }, [tabInitialized])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.sessionStorage.getItem('ether:focus_post')
    if (!stored) return
    const parsed = Number(stored)
    if (!Number.isFinite(parsed)) return
    setActiveTab('feed')
    setFocusPostId(parsed)
    window.sessionStorage.removeItem('ether:focus_post')
    const openComments = window.sessionStorage.getItem('ether:focus_post_open_comments')
    if (openComments === '1') {
      setFocusPostOpenComments(parsed)
      window.sessionStorage.removeItem('ether:focus_post_open_comments')
    }
    const focusComment = window.sessionStorage.getItem('ether:focus_comment')
    if (focusComment) {
      const commentParsed = Number(focusComment)
      if (Number.isFinite(commentParsed)) {
        setFocusCommentId(commentParsed)
      }
      window.sessionStorage.removeItem('ether:focus_comment')
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(
      'ether:last_view',
      JSON.stringify({ path: '/ether', tab: activeTab })
    )
  }, [activeTab])

  async function post() {
    if (!content.trim()) {
      setMsg('Share a manifestation or win before posting.')
      return
    }
    setLoading(true)
    setMsg('')
    try {
      await api.post('/ether/posts', { kind, content, image_url: postImageUrl })
      setContent('')
      setPostImageUrl(null)
      setPostImageName('')
      setPostImageInputKey((prev) => prev + 1)
      await load()
    } catch (e: any) {
      setMsg(e?.response?.data?.detail ?? e?.message ?? 'Post failed')
    } finally {
      setLoading(false)
    }
  }

  async function like(postId: number) {
    try {
      await api.post(`/ether/posts/${postId}/like`)
      await load()
    } catch (e: any) {
      setMsg(e?.response?.data?.detail ?? e?.message ?? 'Like failed')
    }
  }

  async function deletePost(postId: number) {
    const ok = window.confirm('Delete this post? This cannot be undone.')
    if (!ok) return
    try {
      await api.delete(`/ether/posts/${postId}`)
      await load()
    } catch (e: any) {
      setMsg(e?.response?.data?.detail ?? e?.message ?? 'Delete failed')
    }
  }

  function bumpCommentCount(postId: number) {
    const bump = (posts: EtherPost[]) =>
      posts.map((p) => (p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p))
    setFeed((prev) => bump(prev))
    setTimeline((prev) => bump(prev))
    setMyPosts((prev) => bump(prev))
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
      const res = await api.get('/ether/notifications')
      setNotifications(res.data)
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e?.message ?? 'Comment failed.'
      setCommentMsg((prev) => ({ ...prev, [postId]: msg }))
    } finally {
      setCommentLoading((prev) => ({ ...prev, [postId]: false }))
    }
  }

  async function alignComment(postId: number, commentId: number) {
    setCommentLoading((prev) => ({ ...prev, [postId]: true }))
    setCommentMsg((prev) => ({ ...prev, [postId]: '' }))
    try {
      await api.post(`/ether/comments/${commentId}/align`)
      await loadComments(postId)
      const res = await api.get('/ether/notifications')
      setNotifications(res.data)
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e?.message ?? 'Align failed.'
      setCommentMsg((prev) => ({ ...prev, [postId]: msg }))
    } finally {
      setCommentLoading((prev) => ({ ...prev, [postId]: false }))
    }
  }

  async function uploadAvatar(file: File) {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post('/ether/upload/avatar', form)
    setProfile((prev) => (prev ? { ...prev, avatar_url: res.data.url } : prev))
    return res.data.url as string
  }

  async function uploadPostImage(file: File) {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post('/ether/upload/post-image', form)
    setPostImageUrl(res.data.url)
  }

  async function updateSettings(next: Partial<Profile>) {
    const res = await api.patch('/ether/me-profile', next)
    setProfile(res.data)
  }

  function clampAvatarOffset(next: { x: number; y: number }) {
    const img = avatarImageRef.current
    const cropSize = 260
    if (!img || !avatarCropLoaded) return { x: 0, y: 0 }
    const baseScale = Math.max(cropSize / img.naturalWidth, cropSize / img.naturalHeight)
    const scale = baseScale * Math.max(1, avatarCropZoom)
    const displayW = img.naturalWidth * scale
    const displayH = img.naturalHeight * scale
    const maxX = Math.max(0, (displayW - cropSize) / 2)
    const maxY = Math.max(0, (displayH - cropSize) / 2)
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    }
  }

  function openAvatarCrop(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarCropSrc(String(reader.result))
      setAvatarCropZoom(1)
      setAvatarCropLoaded(false)
      setAvatarCropOffset({ x: 0, y: 0 })
      setAvatarCropOpen(true)
    }
    reader.readAsDataURL(file)
  }

  async function saveAvatarCrop() {
    const img = avatarImageRef.current
    if (!img || !avatarCropLoaded) {
      setMsg('Avatar not ready yet. Please wait for the image to load.')
      return
    }
    setAvatarCropSaving(true)
    const canvasSize = 260
    const zoom = Math.max(1, avatarCropZoom)
    const baseScale = Math.max(canvasSize / img.naturalWidth, canvasSize / img.naturalHeight)
    const scale = baseScale * zoom
    const srcW = canvasSize / scale
    const srcH = canvasSize / scale
    let srcX = img.naturalWidth / 2 - (canvasSize / 2 + avatarCropOffset.x) / scale
    let srcY = img.naturalHeight / 2 - (canvasSize / 2 + avatarCropOffset.y) / scale
    srcX = Math.max(0, Math.min(img.naturalWidth - srcW, srcX))
    srcY = Math.max(0, Math.min(img.naturalHeight - srcH, srcY))

    const canvas = document.createElement('canvas')
    canvas.width = canvasSize
    canvas.height = canvasSize
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvasSize, canvasSize)
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.9)
    )
    if (!blob) {
      setMsg('Avatar save failed. Please reupload and try again.')
      setAvatarCropSaving(false)
      return
    }
    await uploadAvatar(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
    setAvatarCropOpen(false)
    setAvatarCropSrc(null)
    setAvatarCropSaving(false)
  }

  useEffect(() => {
    if (!avatarCropOpen || !avatarCropLoaded) return
    setAvatarCropOffset((prev) => clampAvatarOffset(prev))
  }, [avatarCropZoom, avatarCropOpen, avatarCropLoaded])

  async function createGroup() {
    if (!groupName.trim()) {
      setMsg('Group name required.')
      return
    }
    try {
      await api.post('/ether/groups', { name: groupName, description: groupDesc })
      setGroupName('')
      setGroupDesc('')
      await load()
    } catch (e: any) {
      setMsg(e?.response?.data?.detail ?? e?.message ?? 'Group creation failed')
    }
  }

  async function searchProfiles(queryOverride?: string) {
    const query = (queryOverride ?? syncQuery).trim()
    if (!query) {
      setSyncResults([])
      return
    }
    try {
      setSyncSearching(true)
      const res = await api.get('/ether/profiles/search', { params: { query } })
      setSyncResults(res.data)
    } catch (e: any) {
      setMsg(e?.response?.data?.detail ?? e?.message ?? 'Search failed')
    } finally {
      setSyncSearching(false)
    }
  }

  async function sendSyncRequest(profileId: number) {
    try {
      await api.post(`/ether/sync/requests/${profileId}`)
      await load()
    } catch (e: any) {
      setMsg(e?.response?.data?.detail ?? e?.message ?? 'Sync failed')
    }
  }

  async function approveSync(requestId: number) {
    await api.post(`/ether/sync/requests/${requestId}/approve`)
    await load()
  }

  async function declineSync(requestId: number) {
    await api.post(`/ether/sync/requests/${requestId}/decline`)
    await load()
  }

  async function createThread(profileId: number) {
    const res = await api.post('/ether/threads', { participant_profile_ids: [profileId] })
    setActiveThread(res.data.id)
    await load()
  }

  async function loadMessages(threadId: number) {
    const res = await api.get(`/ether/threads/${threadId}/messages`)
    setMessages(res.data)
  }

  async function sendMessage() {
    if (!activeThread || !messageText.trim()) return
    await api.post(`/ether/threads/${activeThread}/messages`, { content: messageText })
    setMessageText('')
    await loadMessages(activeThread)
  }

  function renderLinkedText(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    return parts.map((part, index) => {
      if (!part) return null
      if (part.startsWith('http://') || part.startsWith('https://')) {
        return (
          <a key={`link-${index}`} href={part} style={{ color: '#6f4a3a' }}>
            {part}
          </a>
        )
      }
      return <span key={`text-${index}`}>{part}</span>
    })
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const query = syncQuery.trim()
    if (!query) {
      setSyncResults([])
      return
    }
    const timer = window.setTimeout(() => {
      searchProfiles(query)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [syncQuery])

  useEffect(() => {
    if (!syncMenuOpen) return
    function handleClick(event: MouseEvent) {
      if (!syncMenuRef.current) return
      if (!syncMenuRef.current.contains(event.target as Node)) {
        setSyncMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [syncMenuOpen])

  useEffect(() => {
    if (!notificationsOpen) return
    function handleClick(event: MouseEvent) {
      if (!notificationsRef.current) return
      if (!notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notificationsOpen])

  async function markNotificationsRead() {
    try {
      await api.post('/ether/notifications/mark-read')
      setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })))
    } catch {
      // ignore
    }
  }

  async function dismissNotification(notificationId: number) {
    try {
      await api.delete(`/ether/notifications/${notificationId}`)
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    } catch {
      // ignore
    }
  }

  const activePosts = useMemo(() => {
    if (activeTab === 'timeline') return timeline
    if (activeTab === 'mine') return myPosts
    return feed
  }, [activeTab, feed, timeline, myPosts])

  const feedTitle = useMemo(() => {
    if (activeTab === 'timeline') return 'Timeline'
    if (activeTab === 'mine') return 'My Ether'
    return 'Public Feed'
  }, [activeTab])

  useEffect(() => {
    if (!focusPostId) return
    const target = document.getElementById(`ether-post-${focusPostId}`)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (focusPostOpenComments === focusPostId) {
      setCommentsOpen((prev) => ({ ...prev, [focusPostId]: true }))
      loadComments(focusPostId)
      setFocusPostOpenComments(null)
    }
    setFocusPostId(null)
  }, [focusPostId, activePosts, focusPostOpenComments])

  useEffect(() => {
    if (!focusCommentId) return
    const target = document.getElementById(`ether-comment-${focusCommentId}`)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setFocusCommentId(null)
  }, [focusCommentId, commentsByPost])

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
      <EtherNavbar profile={profile} updateSettings={updateSettings} onAvatarSelect={openAvatarCrop} />
      <Container>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 600 }}>The Ether</div>
              <div style={{ position: 'relative' }} ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen((open) => !open)
                    if (!notificationsOpen) {
                      markNotificationsRead()
                    }
                  }}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(255, 255, 255, 0.75)',
                    background: 'rgba(255, 248, 242, 0.96)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 13,
                    color: '#2d1f1a',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 12px 22px rgba(12, 10, 12, 0.35)',
                  }}
                >
                  Notifications
                  {unreadNotifications ? (
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
                      {unreadNotifications}
                    </span>
                  ) : null}
                </button>
                {notificationsOpen ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 10,
                      width: 320,
                      borderRadius: 16,
                      border: '1px solid rgba(182, 121, 103, 0.45)',
                      background: 'linear-gradient(180deg, rgba(252, 245, 239, 0.98), rgba(226, 199, 181, 0.96))',
                      boxShadow: '0 18px 42px rgba(26, 18, 14, 0.24)',
                      padding: 12,
                      color: '#3b2b24',
                      zIndex: 20,
                    }}
                  >
                    {notifications.length === 0 ? (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>No notifications yet.</div>
                    ) : (
                      <div style={{ display: 'grid', gap: 10 }}>
                        {notifications.map((note) => (
                          <div
                            key={note.id}
                            style={{
                              display: 'flex',
                              gap: 8,
                              alignItems: 'center',
                              padding: '6px 6px',
                              borderRadius: 12,
                              background: note.read_at ? 'transparent' : 'rgba(182, 121, 103, 0.08)',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (typeof window !== 'undefined') {
                                  window.sessionStorage.setItem(
                                    'ether:last_view',
                                    JSON.stringify({
                                      path: window.location.pathname + window.location.search,
                                      tab: activeTab,
                                    })
                                  )
                                }
                                router.push(`/ether/profile/${note.actor_profile_id}`)
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
                                  width: 26,
                                  height: 26,
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
                                <span style={{ fontSize: 12, fontWeight: 600 }}>
                                  {note.actor_display_name ?? 'Member'}
                                </span>
                                <span style={{ fontSize: 11, opacity: 0.7 }}>
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
                            <button
                              type="button"
                              onClick={() => dismissNotification(note.id)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: 12,
                                opacity: 0.6,
                                lineHeight: 1,
                              }}
                              aria-label="Dismiss notification"
                            >
                              ×
                            </button>
                            {note.post_id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (typeof window !== 'undefined') {
                                    window.sessionStorage.setItem(
                                      'ether:last_view',
                                      JSON.stringify({
                                        path: window.location.pathname + window.location.search,
                                        tab: activeTab,
                                      })
                                    )
                                    window.sessionStorage.setItem('ether:focus_post', String(note.post_id))
                                    window.sessionStorage.setItem('ether:focus_post_open_comments', '1')
                                    if (note.comment_id) {
                                      window.sessionStorage.setItem(
                                        'ether:focus_comment',
                                        String(note.comment_id)
                                      )
                                    }
                                  }
                                  window.location.href = '/ether'
                                  setNotificationsOpen(false)
                                }}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  opacity: 0.75,
                                  textDecoration: 'underline',
                                  textUnderlineOffset: 2,
                                }}
                              >
                                View post
                              </button>
                            ) : null}
                            <div style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.6 }}>
                              {new Date(note.created_at).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <div style={{ position: 'relative' }} ref={syncMenuRef}>
                <button
                  type="button"
                  onClick={() => setSyncMenuOpen((open) => !open)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(255, 255, 255, 0.75)',
                    background: 'rgba(255, 248, 242, 0.96)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 13,
                    color: '#2d1f1a',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 12px 22px rgba(12, 10, 12, 0.35)',
                  }}
                >
                  In Sync
                  {syncRequests.length ? (
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
                      {syncRequests.length}
                    </span>
                  ) : null}
                </button>
                {syncMenuOpen ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 10,
                      width: 320,
                      borderRadius: 16,
                      border: '1px solid rgba(182, 121, 103, 0.45)',
                      background: 'linear-gradient(180deg, rgba(252, 245, 239, 0.98), rgba(226, 199, 181, 0.96))',
                      boxShadow: '0 18px 42px rgba(26, 18, 14, 0.24)',
                      padding: 12,
                      color: '#3b2b24',
                      zIndex: 20,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <button
                        type="button"
                        onClick={() => setSyncMenuTab('syncs')}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: 999,
                          border: '1px solid rgba(95, 74, 62, 0.35)',
                          background: syncMenuTab === 'syncs' ? 'rgba(182, 121, 103, 0.18)' : 'transparent',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        In Sync
                      </button>
                      <button
                        type="button"
                        onClick={() => setSyncMenuTab('requests')}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: 999,
                          border: '1px solid rgba(95, 74, 62, 0.35)',
                          background: syncMenuTab === 'requests' ? 'rgba(182, 121, 103, 0.18)' : 'transparent',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: 12,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        Requests
                        {syncRequests.length ? (
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
                            {syncRequests.length}
                          </span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSyncMenuTab('search')}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: 999,
                          border: '1px solid rgba(95, 74, 62, 0.35)',
                          background: syncMenuTab === 'search' ? 'rgba(182, 121, 103, 0.18)' : 'transparent',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        Search
                      </button>
                    </div>
                    {syncMenuTab === 'search' ? (
                      <div>
                        <input
                          type="text"
                          placeholder="Search by email or username"
                          value={syncQuery}
                          onChange={(e) => setSyncQuery(e.target.value)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 10,
                            border: '1px solid rgba(95, 74, 62, 0.3)',
                            fontSize: 12,
                            width: '100%',
                          }}
                        />
                        {!syncSearching && syncQuery.trim() && syncResults.length === 0 ? (
                          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>No matches found.</div>
                        ) : null}
                        {syncResults.length ? (
                          <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                            {syncResults.map((p) => (
                              <div
                                key={p.id}
                                style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div
                                    style={{
                                      width: 26,
                                      height: 26,
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
                                  <span style={{ fontSize: 12 }}>{p.display_name}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    type="button"
                                    onClick={() => sendSyncRequest(p.id)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: 'pointer',
                                      fontSize: 11,
                                      opacity: 0.9,
                                    }}
                                  >
                                    Sync
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/ether/profile/${p.id}`)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: 'pointer',
                                      fontSize: 11,
                                      opacity: 0.7,
                                    }}
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {syncMenuTab === 'requests' ? (
                      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                        {syncRequests.length === 0 ? (
                          <div style={{ fontSize: 12, opacity: 0.7 }}>No requests.</div>
                        ) : (
                          syncRequests.map((req) => (
                            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                                <span style={{ fontSize: 12 }}>
                                  {req.requester_display_name || `Profile #${req.requester_profile_id}`}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  type="button"
                                  onClick={() => router.push(`/ether/profile/${req.requester_profile_id}`)}
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, opacity: 0.7 }}
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => approveSync(req.id)}
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, opacity: 0.9 }}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => declineSync(req.id)}
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, opacity: 0.6 }}
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : syncMenuTab === 'syncs' ? (
                      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                        {syncs.length === 0 ? (
                          <div style={{ fontSize: 12, opacity: 0.7 }}>No one in sync yet.</div>
                        ) : (
                          syncs.map((p) => (
                            <div
                              key={p.id}
                              style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div
                                  style={{
                                    width: 26,
                                    height: 26,
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
                                <span style={{ fontSize: 12 }}>{p.display_name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => router.push(`/ether/profile/${p.id}`)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, opacity: 0.7 }}
                              >
                                View
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
              Manifestation feed, wins, and private circles.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                if (profile?.avatar_url) {
                  setAvatarPreviewUrl(profile.avatar_url)
                } else {
                  setAvatarOptionsOpen(true)
                }
              }}
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                border: '1px solid rgba(95, 74, 62, 0.35)',
                background: 'rgba(255,255,255,0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
                boxShadow: '0 0 18px rgba(182, 121, 103, 0.45)',
              }}
              aria-label={profile?.avatar_url ? 'View profile photo' : 'Upload profile photo'}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ opacity: 0.3 }}> </span>
              )}
            </button>
            <div>
              <div style={{ fontWeight: 600 }}>{profile?.display_name ?? 'Private Vault'}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{profile?.is_public ? 'Public profile' : 'Private profile'}</div>
            </div>
          </div>
        </div>

        <section style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
          <Card title="Share a manifestation" tone="soft" right={<Pill>{kind}</Pill>}>
            <div style={{ display: 'grid', gap: 10 }}>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(95, 74, 62, 0.3)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  fontSize: 13,
                }}
              >
                <option value="manifestation">Manifestation</option>
                <option value="win">Win</option>
                <option value="post">Update</option>
                <option value="tips">Manifestation Tips</option>
              </select>
              <textarea
                placeholder="Share your vision or your win..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(95, 74, 62, 0.3)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  fontSize: 13,
                  resize: 'vertical',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'nowrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <label
                    htmlFor="ether-post-image"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      borderRadius: 999,
                      border: '1px solid rgba(95, 74, 62, 0.35)',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    Choose file
                  </label>
                  {postImageName ? (
                    <span
                      style={{
                        fontSize: 12,
                        opacity: 0.7,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {postImageName}
                    </span>
                  ) : null}
                  <input
                    key={postImageInputKey}
                    id="ether-post-image"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setPostImageName(file.name)
                        uploadPostImage(file).catch(() => {})
                      }
                    }}
                  />
                </div>
                <Button variant="solid" onClick={post} disabled={loading}>
                  {loading ? 'Posting…' : 'Post to The Ether'}
                </Button>
              </div>
              {postImageUrl ? (
                <img
                  src={postImageUrl}
                  alt="Post upload"
                  style={{ width: '100%', borderRadius: 12 }}
                  onError={(e) => {
                    e.currentTarget.src = IMAGE_FALLBACK
                  }}
                />
              ) : null}
              {msg ? <div style={{ fontSize: 12, color: '#7a2e2e' }}>{msg}</div> : null}
            </div>
          </Card>
        </section>

        <section style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <Button variant={activeTab === 'feed' ? 'solid' : 'outlineLight'} onClick={() => setActiveTab('feed')}>
              Public Feed
            </Button>
            <Button
              variant={activeTab === 'timeline' ? 'solid' : 'outlineLight'}
              onClick={() => setActiveTab('timeline')}
            >
              Timeline
            </Button>
            <Button
              variant={activeTab === 'mine' ? 'solid' : 'outlineLight'}
              onClick={() => {
                if (profile?.id) {
                  if (typeof window !== 'undefined') {
                    window.sessionStorage.setItem(
                      'ether:last_view',
                      JSON.stringify({ path: '/ether', tab: 'mine' })
                    )
                  }
                  router.push(`/ether/profile/${profile.id}`)
                  return
                }
                setActiveTab('mine')
              }}
            >
              My Ether
            </Button>
          </div>

          <Card title={feedTitle} tone="soft" right={<Pill>{activePosts.length} posts</Pill>}>
            {activePosts.length === 0 ? (
              <div style={{ opacity: 0.7, fontSize: 13 }}>
                {activeTab === 'timeline'
                  ? 'No aligned or sync activity yet.'
                  : 'No posts yet. Share the first manifestation.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {activePosts.map((post) => (
                  <div
                    key={post.id}
                    id={`ether-post-${post.id}`}
                    style={{
                      padding: 10,
                      borderRadius: 14,
                      border: '1px solid rgba(95, 74, 62, 0.2)',
                      background: 'rgba(255, 255, 255, 0.7)',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <button
                        type="button"
                        onClick={() => router.push(`/ether/profile/${post.author_profile_id}`)}
                        onMouseEnter={() => setHoveredPostAuthorId(post.author_profile_id)}
                        onMouseLeave={() => setHoveredPostAuthorId((prev) => (prev === post.author_profile_id ? null : prev))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            border: '1px solid rgba(95, 74, 62, 0.25)',
                            background: 'rgba(255,255,255,0.9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            fontSize: 11,
                            fontWeight: 600,
                            boxShadow:
                              hoveredPostAuthorId === post.author_profile_id
                                ? '0 0 12px rgba(182, 121, 103, 0.45)'
                                : 'none',
                            transition: 'box-shadow 150ms ease',
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
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 12,
                            textDecorationLine:
                              hoveredPostAuthorId === post.author_profile_id ? 'underline' : 'none',
                            textDecorationColor: 'rgba(182, 121, 103, 0.7)',
                            textUnderlineOffset: 3,
                            color:
                              hoveredPostAuthorId === post.author_profile_id ? '#6f4a3a' : 'inherit',
                            transition: 'color 150ms ease, text-decoration-color 150ms ease',
                          }}
                        >
                          {post.author_display_name ?? 'Member'}
                        </div>
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3 }}>
                          {post.kind.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>{new Date(post.created_at).toLocaleString()}</div>
                        {profile?.id === post.author_profile_id ? (
                          <button
                            type="button"
                            onClick={() => deletePost(post.id)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              fontSize: 12,
                              opacity: 0.7,
                            }}
                          >
                            Delete
                          </button>
                        ) : null}
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
                      {post.liked_by_me ? (
                        <button
                          type="button"
                          onClick={() => like(post.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#6f4a3a',
                            textShadow: '0 0 10px rgba(182, 121, 103, 0.45)',
                          }}
                        >
                          Aligned · {post.like_count}
                        </button>
                      ) : (
                        <Button variant="outline" onClick={() => like(post.id)}>
                          Align · {post.like_count}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            window.sessionStorage.setItem(
                              'ether:last_view',
                              JSON.stringify({
                                path: window.location.pathname + window.location.search,
                                tab: activeTab,
                              })
                            )
                          }
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
                                id={`ether-comment-${comment.id}`}
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
                                            tab: activeTab,
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
                                  <button
                                    type="button"
                                    onClick={() => alignComment(post.id, comment.id)}
                                    disabled={commentLoading[post.id]}
                                    style={{
                                      border: '1px solid',
                                      borderColor: comment.aligned_by_me
                                        ? 'transparent'
                                        : 'rgba(95, 74, 62, 0.35)',
                                      background: 'transparent',
                                      color: 'var(--ink)',
                                      borderRadius: 999,
                                      padding: '6px 14px',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      letterSpacing: 0.2,
                                      cursor: commentLoading[post.id] ? 'not-allowed' : 'pointer',
                                      opacity: commentLoading[post.id] ? 0.6 : 1,
                                      textShadow: comment.aligned_by_me
                                        ? '0 0 12px rgba(199, 140, 122, 0.55)'
                                        : 'none',
                                    }}
                                  >
                                    {comment.aligned_by_me ? 'Aligned' : 'Align'} · {comment.align_count ?? 0}
                                  </button>
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
        </section>

        <section style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
          <Card title="Groups" tone="soft" right={<Pill>{groups.length}</Pill>}>
            {role === 'admin' ? (
              <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(95, 74, 62, 0.3)' }}
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(95, 74, 62, 0.3)' }}
                />
                <Button variant="solid" onClick={createGroup}>
                  Create group
                </Button>
              </div>
            ) : null}
            {groups.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.7 }}>No groups yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {groups.map((group) => (
                  <div key={group.id} style={{ padding: 10, borderRadius: 12, border: '1px solid rgba(95, 74, 62, 0.2)' }}>
                    <div style={{ fontWeight: 600 }}>{group.name}</div>
                    {group.description ? <div style={{ fontSize: 12, opacity: 0.7 }}>{group.description}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
        <section style={{ marginTop: 20 }}>
          <Card title="Direct Messages" tone="soft">
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {threads.map((t) => (
                  <Button
                    key={t.id}
                    variant={activeThread === t.id ? 'solid' : 'outline'}
                    onClick={() => {
                      setActiveThread(t.id)
                      loadMessages(t.id)
                    }}
                  >
                    Thread #{t.id}
                  </Button>
                ))}
              </div>
              {activeThread ? (
                <>
                  <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid rgba(95, 74, 62, 0.2)', borderRadius: 12, padding: 10 }}>
                    {messages.map((m) => (
                      <div key={m.id} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>{new Date(m.created_at).toLocaleString()}</div>
                        <div>{m.content}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Write a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(95, 74, 62, 0.3)' }}
                    />
                    <Button variant="solid" onClick={sendMessage}>
                      Send
                    </Button>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, opacity: 0.7 }}>Select a thread or sync with someone to start messaging.</div>
              )}
            </div>
          </Card>
        </section>
      </Container>

      {avatarCropOpen && avatarCropSrc ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(21, 16, 12, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 80,
            padding: 20,
          }}
          onClick={() => setAvatarCropOpen(false)}
        >
          <div
            style={{
              width: 'min(520px, 100%)',
              background: 'var(--paper)',
              borderRadius: 20,
              border: '1px solid rgba(95, 74, 62, 0.2)',
              padding: 20,
              boxShadow: 'var(--shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}>Crop avatar</div>
            <div style={{ opacity: 0.7, marginTop: 4 }}>Drag to reposition and zoom to fit.</div>
            <div
              style={{
                width: 260,
                height: 260,
                margin: '18px auto 10px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '1px solid rgba(95, 74, 62, 0.3)',
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.9)',
                cursor: avatarDragging ? 'grabbing' : 'grab',
                touchAction: 'none',
              }}
              onPointerDown={(e) => {
                if (!avatarCropLoaded) return
                e.currentTarget.setPointerCapture(e.pointerId)
                setAvatarDragging(true)
                setAvatarDragStart({ x: e.clientX, y: e.clientY })
                setAvatarOffsetStart(avatarCropOffset)
              }}
              onPointerMove={(e) => {
                if (!avatarDragging) return
                const next = {
                  x: avatarOffsetStart.x + (e.clientX - avatarDragStart.x),
                  y: avatarOffsetStart.y + (e.clientY - avatarDragStart.y),
                }
                setAvatarCropOffset(clampAvatarOffset(next))
              }}
              onPointerUp={(e) => {
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId)
                } catch {
                  // ignore
                }
                setAvatarDragging(false)
              }}
              onPointerCancel={() => setAvatarDragging(false)}
            >
              <img
                ref={avatarImageRef}
                src={avatarCropSrc}
                alt="Crop"
                onLoad={() => setAvatarCropLoaded(true)}
                onError={() => {
                  setMsg('Unable to load photo. Please reupload.')
                  setAvatarCropLoaded(false)
                }}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: `translate(${avatarCropOffset.x}px, ${avatarCropOffset.y}px) scale(${avatarCropZoom})`,
                  transformOrigin: 'center',
                }}
              />
            </div>
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.01"
              value={avatarCropZoom}
              onChange={(e) => setAvatarCropZoom(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setAvatarCropOpen(false)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 999,
                  border: '1px solid rgba(95, 74, 62, 0.35)',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAvatarCrop}
                disabled={avatarCropSaving || !avatarCropLoaded}
                style={{
                  padding: '10px 16px',
                  borderRadius: 999,
                  border: '1px solid rgba(182, 121, 103, 0.6)',
                  background: 'linear-gradient(135deg, #c88a77, #b67967)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  opacity: avatarCropSaving ? 0.7 : 1,
                }}
              >
                {avatarCropSaving ? 'Saving…' : 'Save avatar'}
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
              display: 'grid',
              gap: 12,
            }}
          >
            <img
              src={avatarPreviewUrl}
              alt="Profile"
              style={{ width: '100%', height: 'auto', borderRadius: 18, display: 'block' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setAvatarPreviewUrl(null)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(95, 74, 62, 0.35)',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setAvatarPreviewUrl(null)
                  setAvatarOptionsOpen(true)
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(95, 74, 62, 0.35)',
                  background: 'rgba(255,255,255,0.9)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Edit photo
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {avatarOptionsOpen ? (
        <div
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
          onClick={() => setAvatarOptionsOpen(false)}
        >
          <div
            style={{
              width: 'min(420px, 100%)',
              background: 'var(--paper)',
              borderRadius: 18,
              border: '1px solid rgba(95, 74, 62, 0.2)',
              padding: 18,
              boxShadow: 'var(--shadow)',
              display: 'grid',
              gap: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600 }}>Profile photo</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Upload a new photo and confirm the crop.</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => avatarReuploadRef.current?.click()}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(95, 74, 62, 0.35)',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Upload
              </button>
              <input
                ref={avatarReuploadRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setAvatarOptionsOpen(false)
                    openAvatarCrop(file)
                  }
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setAvatarOptionsOpen(false)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(95, 74, 62, 0.35)',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
