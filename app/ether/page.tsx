 'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  links?: string | null
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

type EtherThreadParticipant = {
  profile_id: number
  display_name?: string | null
  avatar_url?: string | null
}

type EtherThread = {
  id: number
  participants?: Array<number | EtherThreadParticipant> | null
  created_at?: string
}

type EtherMessage = {
  id: number
  sender_profile_id: number
  content: string
  created_at: string
}

type MyLinePreview = {
  thread_id: number
  counterpart_profile_id: number | null
  counterpart_display_name: string | null
  counterpart_avatar_url: string | null
  message: string | null
  created_at: string | null
  unread: boolean
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
  const { me, isLoading, refreshMe } = useAuth()
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
  const [settingsLinks, setSettingsLinks] = useState('')
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
  const [settingsLinksNotice, setSettingsLinksNotice] = useState('')
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
    setSettingsLinks(profile?.links ?? '')
    setSettingsUsername(me?.username ?? '')
    setUsernameStatus('idle')
    if (!wasOpen) {
      setSettingsBioNotice('')
      setSettingsLinksNotice('')
      setSettingsUsernameNotice('')
    }
    profileEditOpenedRef.current = true
  }, [settingsOpen, profileEditOpen, profile?.bio, profile?.links, me?.username])

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
      className="ether-navbar"
      style={{
        position: 'relative',
        padding: '6px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(14px)',
        color: '#3b2b24',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        rowGap: 10,
        width: '100%',
        boxSizing: 'border-box',
        zIndex: 600,
      }}
    >
      <div
        style={{
          flex: '1 1 220px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minWidth: 0,
          flexWrap: 'wrap',
        }}
      >
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
            className="ether-nav-brand"
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
            ManifestBank™
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

      <div
        className="ether-nav-logo-wrap"
        style={{
          flex: '1 1 220px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minWidth: 0,
        }}
      >
        <Link href="/ether" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <img
            src="/ether-logo.png"
            alt="The Ether™"
            className="ether-nav-logo"
            style={{ height: 150, width: 'auto', maxWidth: '100%' }}
          />
        </Link>
      </div>

        <div
          style={{
            flex: '1 1 220px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 14,
            alignItems: 'center',
            minWidth: 0,
            flexWrap: 'wrap',
          }}
        >
          <div
            ref={settingsRef}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 8,
              position: 'relative',
              zIndex: 2000,
            }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              {isLoading ? (
                <span style={{ opacity: 0.75 }}>Loading…</span>
              ) : me ? (
                <>
                <span className="ether-nav-signed" style={{ opacity: 0.9, wordBreak: 'break-word' }}>
                  Signed in as <b>{me.username ?? me.email}</b>
                </span>
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
            className="ether-nav-menu-button"
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
                zIndex: 100000,
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
                <label style={{ fontSize: 12, opacity: 0.7 }}>Links</label>
                <textarea
                  value={settingsLinks}
                  onChange={(e) => setSettingsLinks(e.target.value)}
                  rows={3}
                  placeholder="Add links (one per line)"
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
                    setSettingsLinksNotice('')
                    try {
                      await updateSettings({ links: settingsLinks })
                      setSettingsLinksNotice('Links updated.')
                    } catch (e: any) {
                      const msg = e?.response?.data?.detail ?? e?.message ?? 'Unable to update links.'
                      setSettingsLinksNotice(msg)
                    } finally {
                      setSettingsBusy(false)
                    }
                  }}
                  disabled={settingsBusy}
                >
                  {settingsBusy ? 'Saving…' : 'Save links'}
                </Button>
                {settingsLinksNotice ? (
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
                    {settingsLinksNotice}
                  </div>
                ) : null}
              </div>
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
  const { me, logout } = useAuth()
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
  const syncTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [syncMenuStyle, setSyncMenuStyle] = useState<React.CSSProperties | null>(null)
  const [threads, setThreads] = useState<EtherThread[]>([])
  const [myLineOpen, setMyLineOpen] = useState(false)
  const myLineRef = useRef<HTMLDivElement | null>(null)
  const myLineMenuRef = useRef<HTMLDivElement | null>(null)
  const myLineTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [myLineMenuStyle, setMyLineMenuStyle] = useState<React.CSSProperties | null>(null)
  const [myLinePreviews, setMyLinePreviews] = useState<MyLinePreview[]>([])
  const [myLineLoading, setMyLineLoading] = useState(false)
  const [myLineUnreadCount, setMyLineUnreadCount] = useState(0)
  const myLineProfileCache = useRef<Map<number, EtherThreadParticipant>>(new Map())
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
  const [alignPulseId, setAlignPulseId] = useState<number | null>(null)
  const [commentAlignPulseId, setCommentAlignPulseId] = useState<number | null>(null)
  const [notifications, setNotifications] = useState<EtherNotification[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement | null>(null)
  const notificationsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [notificationsMenuStyle, setNotificationsMenuStyle] = useState<React.CSSProperties | null>(null)
  const unreadNotifications = notifications.filter((n) => !n.read_at).length
  const [focusPostId, setFocusPostId] = useState<number | null>(null)
  const [focusPostOpenComments, setFocusPostOpenComments] = useState<number | null>(null)
  const [focusCommentId, setFocusCommentId] = useState<number | null>(null)
  const [hoveredPostAuthorId, setHoveredPostAuthorId] = useState<number | null>(null)
  const [postMenuOpenId, setPostMenuOpenId] = useState<number | null>(null)
  const postMenuRef = useRef<HTMLDivElement | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [confirmDeleting, setConfirmDeleting] = useState(false)
  const etherNavRef = useRef<HTMLDivElement | null>(null)
  const [manifestStickyVisible, setManifestStickyVisible] = useState(false)
  const [manifestStickyOpen, setManifestStickyOpen] = useState(false)
  const manifestStickyRef = useRef<HTMLDivElement | null>(null)
  const manifestStickyMenuRef = useRef<HTMLDivElement | null>(null)
  const [etherStickyOpen, setEtherStickyOpen] = useState(false)
  const etherStickyRef = useRef<HTMLDivElement | null>(null)
  const etherStickyMenuRef = useRef<HTMLDivElement | null>(null)
  const [etherStickyMenuPos, setEtherStickyMenuPos] = useState<{ left: number; top: number; width: number }>({
    left: 0,
    top: 0,
    width: 320,
  })
  const [manifestAccounts, setManifestAccounts] = useState<any[]>([])
  const [manifestAccountsLoaded, setManifestAccountsLoaded] = useState(false)
  const [manifestAccountsLoading, setManifestAccountsLoading] = useState(false)
  const [manifestAccountsMsg, setManifestAccountsMsg] = useState('')
  const etherStickyNoticeCount = unreadNotifications + syncRequests.length + myLineUnreadCount

  const rememberEtherView = useCallback(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(
      'ether:last_view',
      JSON.stringify({
        path: window.location.pathname + window.location.search,
        tab: activeTab,
      })
    )
  }, [activeTab])

  const rememberReturnTo = useCallback(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(
      'ether:return_to',
      JSON.stringify({
        path: window.location.pathname + window.location.search,
        tab: activeTab,
        scrollY: window.scrollY,
      })
    )
  }, [activeTab])

  const navigateToProfile = useCallback(
    (profileId: number) => {
      rememberEtherView()
      router.push(`/ether/profile/${profileId}`)
    },
    [rememberEtherView, router]
  )

  useEffect(() => {
    if (postMenuOpenId === null) return
    function handleClick(event: MouseEvent) {
      const target = event.target as Node
      if (postMenuRef.current && !postMenuRef.current.contains(target)) {
        setPostMenuOpenId(null)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPostMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [postMenuOpenId])

  useEffect(() => {
    if (!etherNavRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setManifestStickyVisible(!entry.isIntersecting)
      },
      { threshold: 0 }
    )
    observer.observe(etherNavRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!manifestStickyOpen) return
    if (manifestAccountsLoaded || manifestAccountsLoading) return
    setManifestAccountsLoading(true)
    setManifestAccountsMsg('')
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
        setManifestAccounts(
          list.map((acct: any) => ({
            id: acct.id,
            name: acct.name,
            balance: balanceMap.get(acct.id) ?? 0,
          }))
        )
        setManifestAccountsLoaded(true)
      })
      .catch((e) =>
        setManifestAccountsMsg(e?.response?.data?.detail ?? e?.message ?? 'Failed to load accounts')
      )
      .finally(() => setManifestAccountsLoading(false))
  }, [manifestStickyOpen, manifestAccountsLoaded, manifestAccountsLoading])

  useEffect(() => {
    if (!manifestStickyOpen) return
    function handleClick(event: MouseEvent) {
      const target = event.target as Node
      if (
        manifestStickyRef.current &&
        !manifestStickyRef.current.contains(target) &&
        (!manifestStickyMenuRef.current || !manifestStickyMenuRef.current.contains(target))
      ) {
        setManifestStickyOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setManifestStickyOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [manifestStickyOpen])

  useEffect(() => {
    if (!etherStickyOpen) return
    function handleClick(event: MouseEvent) {
      const target = event.target as Node
      if (
        etherStickyRef.current &&
        !etherStickyRef.current.contains(target) &&
        (!etherStickyMenuRef.current || !etherStickyMenuRef.current.contains(target))
      ) {
        setEtherStickyOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setEtherStickyOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [etherStickyOpen])

  useEffect(() => {
    if (!etherStickyOpen) return
    const updatePosition = () => {
      const rect = etherStickyRef.current?.getBoundingClientRect()
      if (!rect) return
      const menuWidth = Math.min(360, Math.floor(window.innerWidth * 0.92))
      const centerX = rect.left + rect.width / 2
      const left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, centerX - menuWidth / 2))
      const top = rect.bottom + 10
      setEtherStickyMenuPos({ left, top, width: menuWidth })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [etherStickyOpen])

  function formatMoney(value: any) {
    const num = Number(value)
    if (Number.isNaN(num)) return value ?? ''
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
  }

  async function load(silent = false) {
    if (!silent) {
      setLoading(true)
      setMsg('')
    }
    try {
      const results = await Promise.allSettled([
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

      const [
        pRes,
        fRes,
        tlineRes,
        mineRes,
        gRes,
        sRes,
        syncRes,
        meRes,
        tRes,
        nRes,
      ] = results

      if (pRes.status === 'fulfilled') setProfile(pRes.value.data)
      if (fRes.status === 'fulfilled') setFeed(fRes.value.data)
      if (tlineRes.status === 'fulfilled') setTimeline(tlineRes.value.data)
      if (mineRes.status === 'fulfilled') setMyPosts(mineRes.value.data)
      if (gRes.status === 'fulfilled') setGroups(gRes.value.data)
      if (sRes.status === 'fulfilled') setSyncRequests(sRes.value.data)
      if (syncRes.status === 'fulfilled') setSyncs(syncRes.value.data)
      if (meRes.status === 'fulfilled') setRole(meRes.value.data?.role ?? 'user')
      if (tRes.status === 'fulfilled') setThreads(tRes.value.data)
      if (nRes.status === 'fulfilled') setNotifications(nRes.value.data)

      const rejected = results.find((res) => res.status === 'rejected')
      if (rejected) {
        setMsg('Some Ether data failed to load. Try refresh.')
      }
    } catch (e: any) {
      setMsg(e?.response?.data?.detail ?? e?.message ?? 'Failed to load The Ether™')
    } finally {
      if (!silent) {
        setLoading(false)
      }
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
    const stored = window.sessionStorage.getItem('ether:return_to')
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as { path?: string; scrollY?: number }
      if (parsed.path === window.location.pathname && typeof parsed.scrollY === 'number') {
        window.setTimeout(() => window.scrollTo(0, parsed.scrollY ?? 0), 0)
        window.sessionStorage.removeItem('ether:return_to')
      }
    } catch {
      // ignore invalid storage
    }
  }, [])

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
    setAlignPulseId(postId)
    window.setTimeout(() => setAlignPulseId((prev) => (prev === postId ? null : prev)), 420)
    const applyOptimistic = (posts: EtherPost[]) =>
      posts.map((p) => {
        if (p.id !== postId) return p
        const liked = !p.liked_by_me
        const count = (p.like_count ?? 0) + (liked ? 1 : -1)
        return { ...p, liked_by_me: liked, like_count: Math.max(0, count) }
      })
    setFeed((prev) => applyOptimistic(prev))
    setTimeline((prev) => applyOptimistic(prev))
    setMyPosts((prev) => applyOptimistic(prev))
    try {
      await api.post(`/ether/posts/${postId}/like`)
    } catch (e: any) {
      const message = e?.response?.data?.detail ?? e?.message ?? 'Align failed.'
      setMsg(message)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logged_out', { detail: { message } }))
      }
    }
  }

  function requestDeletePost(postId: number) {
    setConfirmDeleteId(postId)
    setPostMenuOpenId(null)
  }

  async function confirmDeletePost() {
    if (confirmDeleteId === null) return
    setConfirmDeleting(true)
    setMsg('')
    try {
      await api.delete(`/ether/posts/${confirmDeleteId}`)
      setConfirmDeleteId(null)
      await load()
    } catch (e: any) {
      setMsg(e?.response?.data?.detail ?? e?.message ?? 'Delete failed')
    } finally {
      setConfirmDeleting(false)
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
    const key = Number(`${postId}${commentId}`)
    setCommentAlignPulseId(key)
    window.setTimeout(() => setCommentAlignPulseId((prev) => (prev === key ? null : prev)), 420)
    setCommentsByPost((prev) => {
      const list = prev[postId]
      if (!list) return prev
      const nextList = list.map((c) => {
        if (c.id !== commentId) return c
        const aligned = !c.aligned_by_me
        const count = (c.align_count ?? 0) + (aligned ? 1 : -1)
        return { ...c, aligned_by_me: aligned, align_count: Math.max(0, count) }
      })
      return { ...prev, [postId]: nextList }
    })
    setCommentLoading((prev) => ({ ...prev, [postId]: true }))
    setCommentMsg((prev) => ({ ...prev, [postId]: '' }))
    try {
      await api.post(`/ether/comments/${commentId}/align`)
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e?.message ?? 'Align failed.'
      setCommentMsg((prev) => ({ ...prev, [postId]: msg }))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logged_out', { detail: { message: msg } }))
      }
    } finally {
      setCommentLoading((prev) => ({ ...prev, [postId]: false }))
    }
  }

  async function uploadAvatar(file: File) {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post('/ether/upload/avatar', form)
    const rawUrl = res.data.url as string
    const cacheBusted = `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
    setProfile((prev) => (prev ? { ...prev, avatar_url: cacheBusted } : prev))
    return cacheBusted
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
    let saved = false
    try {
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
      if (!ctx) {
        setMsg('Avatar save failed. Please reupload and try again.')
        return
      }
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvasSize, canvasSize)
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.9)
      )
      if (!blob) {
        setMsg('Avatar save failed. Please reupload and try again.')
        return
      }
      await uploadAvatar(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
      saved = true
      setAvatarCropOpen(false)
      setAvatarCropSrc(null)
      setAvatarOptionsOpen(false)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logged_out', { detail: { message: 'Profile avatar saved.' } }))
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e?.message ?? 'Avatar save failed.'
      setMsg(msg)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logged_out', { detail: { message: msg } }))
      }
    } finally {
      setAvatarCropSaving(false)
      if (saved) {
        setAvatarCropLoaded(false)
      }
    }
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
    await api.post('/ether/threads', { participant_profile_ids: [profileId] })
    await load()
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

  useEffect(() => {
    if (!myLineOpen) return
    function handleClick(event: MouseEvent) {
      const target = event.target as Node
      if (
        myLineRef.current &&
        !myLineRef.current.contains(target) &&
        (!myLineMenuRef.current || !myLineMenuRef.current.contains(target))
      ) {
        setMyLineOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMyLineOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [myLineOpen])

  useEffect(() => {
    if (!myLineOpen) {
      setMyLineMenuStyle(null)
      return
    }
    if (typeof window === 'undefined') return
    const trigger = myLineTriggerRef.current
    if (!trigger) return
    const updatePosition = () => {
      const rect = trigger.getBoundingClientRect()
      const width = Math.min(320, window.innerWidth - 24)
      const idealLeft = rect.left + rect.width / 2 - width / 2
      const left = Math.min(Math.max(12, idealLeft), window.innerWidth - width - 12)
      setMyLineMenuStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left,
        width,
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: '60vh',
        overflowY: 'auto',
        overflowX: 'hidden',
      })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [myLineOpen])

  useEffect(() => {
    if (!notificationsOpen) {
      setNotificationsMenuStyle(null)
      return
    }
    if (typeof window === 'undefined') return
    const trigger = notificationsTriggerRef.current
    if (!trigger) return
    const updatePosition = () => {
      const rect = trigger.getBoundingClientRect()
      const width = Math.min(320, window.innerWidth - 24)
      const idealLeft = rect.left + rect.width / 2 - width / 2
      const left = Math.min(Math.max(12, idealLeft), window.innerWidth - width - 12)
      setNotificationsMenuStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left,
        width,
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: '60vh',
        overflowY: 'auto',
        overflowX: 'hidden',
      })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [notificationsOpen])

  useEffect(() => {
    if (!syncMenuOpen) {
      setSyncMenuStyle(null)
      return
    }
    if (typeof window === 'undefined') return
    const trigger = syncTriggerRef.current
    if (!trigger) return
    const updatePosition = () => {
      const rect = trigger.getBoundingClientRect()
      const width = Math.min(320, window.innerWidth - 24)
      const idealLeft = rect.left + rect.width / 2 - width / 2
      const left = Math.min(Math.max(12, idealLeft), window.innerWidth - width - 12)
      setSyncMenuStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left,
        width,
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: '70vh',
        overflowY: 'auto',
        overflowX: 'hidden',
      })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [syncMenuOpen])

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

  function toProfileId(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    if (typeof value === 'string') {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }
    return null
  }

  function getParticipantProfileId(
    participant: number | EtherThreadParticipant | (EtherThreadParticipant & { id?: number; user_id?: number })
  ) {
    if (typeof participant === 'number') return toProfileId(participant)
    const profileId =
      'profile_id' in participant ? toProfileId(participant.profile_id ?? null) : null
    if (profileId) return profileId
    if (typeof participant === 'object' && participant !== null && 'id' in participant) {
      const maybeId = (participant as { id?: number | null }).id
      return toProfileId(maybeId ?? null)
    }
    return null
  }

  function isSelfParticipant(
    participant: number | EtherThreadParticipant | (EtherThreadParticipant & { id?: number; user_id?: number }),
    myProfileId: number | null,
    myUserId: number | null
  ) {
    if (!myProfileId && !myUserId) return false
    if (typeof participant === 'number') {
      return !!myProfileId && participant === myProfileId
    }
    const profileId =
      'profile_id' in participant
        ? toProfileId(participant.profile_id ?? null)
        : typeof participant === 'object' && participant !== null && 'id' in participant
        ? toProfileId((participant as { id?: number | null }).id ?? null)
        : null
    const userId =
      typeof participant === 'object' && participant !== null && 'user_id' in participant
        ? toProfileId((participant as { user_id?: number | null }).user_id ?? null)
        : null
    return (!!myProfileId && profileId === myProfileId) || (!!myUserId && userId === myUserId)
  }

  type StoredThreadTarget = {
    profile_id: number
    display_name?: string | null
    avatar_url?: string | null
  }

  function getStoredThreadTarget(threadId: number, myProfileId?: number | null): StoredThreadTarget | null {
    if (typeof window === 'undefined') return null
    const raw = window.sessionStorage.getItem(`myline:thread_target:${threadId}`)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as StoredThreadTarget
      const profileId = toProfileId(parsed?.profile_id ?? null)
      if (!profileId) return null
      if (myProfileId && profileId === myProfileId) return null
      return {
        profile_id: profileId,
        display_name: parsed.display_name ?? null,
        avatar_url: parsed.avatar_url ?? null,
      }
    } catch {
      const parsed = Number(raw)
      if (!Number.isFinite(parsed)) return null
      if (myProfileId && parsed === myProfileId) return null
      return { profile_id: parsed, display_name: null, avatar_url: null }
    }
  }

  function isMeaningfulMessage(message: string | null | undefined) {
    if (!message) return false
    const trimmed = message.trim()
    if (!trimmed) return false
    const normalized = trimmed.toLowerCase().replace(/[^\w\s]/g, '').trim()
    return !normalized.includes('no message yet') && !normalized.includes('no messages yet')
  }

  async function loadThreadParticipant(profileId: number) {
    if (myLineProfileCache.current.has(profileId)) {
      return myLineProfileCache.current.get(profileId) ?? null
    }
    try {
      const res = await api.get(`/ether/profiles/${profileId}`)
      const raw = res.data as { id?: number; profile_id?: number; display_name?: string | null; avatar_url?: string | null }
      const data = {
        profile_id: raw.profile_id ?? raw.id ?? profileId,
        display_name: raw.display_name ?? null,
        avatar_url: raw.avatar_url ?? null,
      } satisfies EtherThreadParticipant
      myLineProfileCache.current.set(profileId, data)
      return data
    } catch {
      return null
    }
  }

  useEffect(() => {
    const currentProfileId = toProfileId(profile?.id ?? null)
    if (!currentProfileId) return
    if (!threads.length) {
      setMyLinePreviews([])
      setMyLineUnreadCount(0)
      return
    }
    let canceled = false
    async function loadPreviews() {
      setMyLineLoading(true)
      try {
        const results = await Promise.all(
          threads.map(async (thread) => {
            try {
              const messagesRes = await api.get(`/ether/threads/${thread.id}/messages`)
              const list = Array.isArray(messagesRes.data) ? (messagesRes.data as EtherMessage[]) : []
              const last = list[list.length - 1]
              const profileId = toProfileId(profile?.id ?? null)
              const myUserId = typeof me?.id === 'number' ? me.id : null
              const storedTarget = getStoredThreadTarget(thread.id, profileId)
              const participant = Array.isArray(thread.participants)
                ? thread.participants.find((p) => {
                    return !isSelfParticipant(p, profileId, myUserId)
                  }) ?? null
                : null
              const otherMessage = profileId ? list.find((message) => message.sender_profile_id !== profileId) : null
              const otherMessageProfileId =
                profileId && otherMessage?.sender_profile_id && otherMessage.sender_profile_id !== profileId
                  ? otherMessage.sender_profile_id
                  : null
              let participantProfileId = participant ? getParticipantProfileId(participant) : null
              if (profileId && participantProfileId === profileId) {
                participantProfileId = null
              }
              const safeTarget =
                storedTarget && (!profileId || storedTarget.profile_id !== profileId) ? storedTarget : null
              let counterpartProfileId =
                safeTarget?.profile_id ?? otherMessageProfileId ?? participantProfileId ?? null
              if (profileId && counterpartProfileId === profileId) {
                counterpartProfileId = otherMessageProfileId ?? participantProfileId ?? null
              }
              const participantIsSelf = participant
                ? isSelfParticipant(participant, profileId ?? null, myUserId)
                : false
              let counterpartDisplayName =
                safeTarget?.display_name ??
                (!participantIsSelf && typeof participant === 'object' && participant
                  ? participant.display_name ?? null
                  : null)
              let counterpartAvatarUrl =
                safeTarget?.avatar_url ??
                (!participantIsSelf && typeof participant === 'object' && participant
                  ? participant.avatar_url ?? null
                  : null)
              if (
                !counterpartDisplayName &&
                safeTarget?.display_name &&
                safeTarget.profile_id === counterpartProfileId
              ) {
                counterpartDisplayName = safeTarget.display_name
              }
              if (
                !counterpartAvatarUrl &&
                safeTarget?.avatar_url &&
                safeTarget.profile_id === counterpartProfileId
              ) {
                counterpartAvatarUrl = safeTarget.avatar_url
              }
              if (!counterpartDisplayName && counterpartProfileId) {
                const counterpart = await loadThreadParticipant(counterpartProfileId)
                counterpartDisplayName = counterpart?.display_name ?? null
                counterpartAvatarUrl = counterpart?.avatar_url ?? null
              }
              const readAt = getThreadReadAt(thread.id)
              const unread =
                !!last &&
                (!profileId || last.sender_profile_id !== profileId) &&
                (!readAt || new Date(last.created_at).getTime() > new Date(readAt).getTime())
              return {
                thread_id: thread.id,
                counterpart_profile_id: counterpartProfileId,
                counterpart_display_name:
                  counterpartDisplayName ?? (counterpartProfileId ? `User #${counterpartProfileId}` : 'Member'),
                counterpart_avatar_url: counterpartAvatarUrl ?? null,
                message: isMeaningfulMessage(last?.content) ? last?.content?.trim() ?? null : null,
                created_at: last?.created_at ?? null,
                unread,
              } satisfies MyLinePreview
            } catch {
              return {
                thread_id: thread.id,
                counterpart_profile_id: null,
                counterpart_display_name: `Thread #${thread.id}`,
                counterpart_avatar_url: null,
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
        setMyLinePreviews(sorted)
        setMyLineUnreadCount(sorted.filter((preview) => preview.unread).length)
      } finally {
        if (!canceled) setMyLineLoading(false)
      }
    }
    loadPreviews()
    return () => {
      canceled = true
    }
  }, [threads, profile?.id])

  function openMyLineThread(preview: MyLinePreview) {
    if (preview.created_at) {
      markThreadRead(preview.thread_id, preview.created_at)
    }
    setMyLinePreviews((prev) =>
      prev.map((item) => (item.thread_id === preview.thread_id ? { ...item, unread: false } : item))
    )
    setMyLineUnreadCount((count) => Math.max(0, count - (preview.unread ? 1 : 0)))
    rememberEtherView()
    setMyLineOpen(false)
    if (typeof window !== 'undefined' && preview.counterpart_profile_id) {
      const targetPayload = {
        profile_id: preview.counterpart_profile_id,
        display_name: preview.counterpart_display_name ?? null,
        avatar_url: preview.counterpart_avatar_url ?? null,
      }
      window.sessionStorage.setItem(`myline:thread_target:${preview.thread_id}`, JSON.stringify(targetPayload))
    }
    router.push(`/myline/${preview.thread_id}`)
  }

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

  const myLineActivePreviews = useMemo(
    () => myLinePreviews.filter((preview) => isMeaningfulMessage(preview.message)),
    [myLinePreviews]
  )
  const myLineNewPreviews = useMemo(
    () => myLineActivePreviews.filter((preview) => preview.unread).slice(0, 4),
    [myLineActivePreviews]
  )
  const myLineRecentPreviews = useMemo(() => myLineActivePreviews.slice(0, 3), [myLineActivePreviews])
  const myLineDisplayPreviews = (myLineNewPreviews.length ? myLineNewPreviews : myLineRecentPreviews).filter(
    (preview) => isMeaningfulMessage(preview.message)
  )
  const myLineShownPreviews = useMemo(() => {
    const seen = new Set<string>()
    return myLineDisplayPreviews.filter((preview) => {
      const key = preview.counterpart_profile_id
        ? `profile:${preview.counterpart_profile_id}`
        : `thread:${preview.thread_id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [myLineDisplayPreviews])
  const myLineHasMessages = myLineShownPreviews.length > 0

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
      <div ref={etherNavRef}>
        <EtherNavbar profile={profile} updateSettings={updateSettings} onAvatarSelect={openAvatarCrop} />
      </div>
      {manifestStickyVisible ? (
        <div
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top) + 8px)',
            left: 12,
            zIndex: 1400,
            padding: 0,
            background: 'transparent',
            borderBottom: 'none',
            boxShadow: 'none',
          }}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            <div ref={manifestStickyRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setManifestStickyOpen((open) => !open)}
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
                aria-expanded={manifestStickyOpen}
              >
                ManifestBank™
                <span style={{ fontSize: 12, opacity: 0.7 }}>▾</span>
              </button>
              {manifestStickyOpen ? (
                <div
                  ref={manifestStickyMenuRef}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 10,
                    width: 280,
                    maxWidth: 'calc(100vw - 24px)',
                    borderRadius: 14,
                    border: '1px solid rgba(140, 92, 78, 0.45)',
                    background: 'rgba(252, 245, 240, 0.98)',
                    boxShadow: '0 20px 44px rgba(12, 10, 12, 0.32)',
                    padding: 12,
                    display: 'grid',
                    gap: 10,
                    zIndex: 99999,
                  }}
                  role="menu"
                >
                  <div style={{ fontWeight: 600, color: '#3b2b24' }}>Accounts</div>
                  {manifestAccountsLoading ? (
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Loading…</div>
                  ) : manifestAccountsMsg ? (
                    <div style={{ fontSize: 12, color: '#8c4f3d' }}>{manifestAccountsMsg}</div>
                  ) : manifestAccounts.length ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {manifestAccounts.map((acct) => (
                        <div key={acct.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ fontSize: 12, color: '#5d3d32' }}>{acct.name ?? 'Account'}</span>
                          <span style={{ fontWeight: 700, fontSize: 12, color: '#3b2b24' }}>
                            {formatMoney(acct.balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, opacity: 0.7 }}>No accounts found.</div>
                  )}
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(140, 92, 78, 0.4)',
                      background: 'rgba(255, 255, 255, 0.7)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: '#4a2f26',
                    }}
                  >
                    Open Dashboard
                  </button>
                </div>
              ) : null}
            </div>
            <div ref={etherStickyRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setEtherStickyOpen((open) => !open)
                  if (!etherStickyOpen) {
                    markNotificationsRead()
                  }
                }}
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
                aria-expanded={etherStickyOpen}
              >
                The Ether™
                {etherStickyNoticeCount ? (
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
                    {etherStickyNoticeCount}
                  </span>
                ) : null}
                <span style={{ fontSize: 12, opacity: 0.7 }}>▾</span>
              </button>
              {etherStickyOpen ? (
                <div
                  ref={etherStickyMenuRef}
                  style={{
                    position: 'fixed',
                    top: etherStickyMenuPos.top,
                    left: etherStickyMenuPos.left,
                    width: etherStickyMenuPos.width,
                    borderRadius: 16,
                    border: '1px solid rgba(140, 92, 78, 0.45)',
                    background: 'linear-gradient(180deg, rgba(252, 245, 239, 0.98), rgba(226, 199, 181, 0.96))',
                    boxShadow: '0 18px 42px rgba(26, 18, 14, 0.24)',
                    padding: 12,
                    color: '#3b2b24',
                    zIndex: 99999,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                  }}
                  role="menu"
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    Notifications
                    {unreadNotifications ? (
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
                        {unreadNotifications}
                      </span>
                    ) : null}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>No notifications yet.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                      {notifications.slice(0, 4).map((note) => (
                        <div
                          key={note.id}
                          style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            padding: '6px 6px',
                            borderRadius: 12,
                            background: note.read_at ? 'transparent' : 'rgba(182, 121, 103, 0.08)',
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              navigateToProfile(note.actor_profile_id)
                              setEtherStickyOpen(false)
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
                              e.currentTarget.style.color = '#8a5c4a'
                              e.currentTarget.style.textShadow = '0 0 10px rgba(140, 92, 78, 0.35)'
                              e.currentTarget.style.textDecoration = 'underline'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'inherit'
                              e.currentTarget.style.textShadow = 'none'
                              e.currentTarget.style.textDecoration = 'none'
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
                                fontSize: 11,
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
                                (note.actor_display_name ?? 'M').slice(0, 1).toUpperCase()
                              )}
                            </div>
                            <div style={{ fontSize: 12, minWidth: 0 }}>
                              <div style={{ fontWeight: 600 }}>{note.actor_display_name}</div>
                              <div
                                style={{
                                  opacity: 0.7,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {note.message}
                              </div>
                            </div>
                          </button>
                          <div
                            style={{
                              marginLeft: 'auto',
                              fontSize: 11,
                              opacity: 0.6,
                              maxWidth: 90,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {new Date(note.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      rememberReturnTo()
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
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    My Line
                    {myLineUnreadCount ? (
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
                        {myLineUnreadCount}
                      </span>
                    ) : null}
                  </div>
                  {myLineLoading ? (
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>Loading messages…</div>
                  ) : !myLineHasMessages ? (
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>No messages yet.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                      {myLineShownPreviews.slice(0, 4).map((preview) => (
                        <button
                          key={preview.thread_id}
                          type="button"
                          onClick={() => openMyLineThread(preview)}
                          style={{
                            border: '1px solid rgba(160, 120, 104, 0.25)',
                            background: preview.unread ? 'rgba(182, 121, 103, 0.08)' : 'transparent',
                            padding: '6px 8px',
                            borderRadius: 12,
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            textAlign: 'left',
                            cursor: 'pointer',
                            width: '100%',
                            boxSizing: 'border-box',
                            overflow: 'hidden',
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
                              fontSize: 11,
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            {preview.counterpart_avatar_url ? (
                              <img
                                src={preview.counterpart_avatar_url}
                                alt={preview.counterpart_display_name ?? 'Member'}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              (preview.counterpart_display_name ?? 'M').slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 12,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {preview.counterpart_display_name ??
                                (preview.counterpart_profile_id
                                  ? `User #${preview.counterpart_profile_id}`
                                  : 'Member')}
                            </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  opacity: 0.7,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {preview.message ?? ''}
                              </div>
                          </div>
                          {preview.unread ? (
                            <span
                              style={{
                                minWidth: 14,
                                height: 14,
                                borderRadius: 999,
                                background: '#b67967',
                                color: '#fff',
                                fontSize: 9,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 4px',
                              }}
                            >
                              ●
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      rememberEtherView()
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
                  <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                    In Sync Requests
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
                  </div>
                  {syncRequests.length === 0 ? (
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>No requests.</div>
                  ) : (
                    <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                      {syncRequests.slice(0, 4).map((req) => (
                        <div
                          key={req.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 8,
                            alignItems: 'center',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              navigateToProfile(req.requester_profile_id)
                              setEtherStickyOpen(false)
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
                              e.currentTarget.style.color = '#8a5c4a'
                              e.currentTarget.style.textShadow = '0 0 10px rgba(140, 92, 78, 0.35)'
                              e.currentTarget.style.textDecoration = 'underline'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'inherit'
                              e.currentTarget.style.textShadow = 'none'
                              e.currentTarget.style.textDecoration = 'none'
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
                            <span style={{ fontSize: 12 }}>{req.requester_display_name}</span>
                          </button>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => {
                                approveSync(req.id)
                                setEtherStickyOpen(false)
                              }}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: 11,
                                opacity: 0.9,
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                declineSync(req.id)
                                setEtherStickyOpen(false)
                              }}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: 11,
                                opacity: 0.7,
                              }}
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {me ? (
        <div
          style={{
            padding: '10px 16px 0',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
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
              background: 'rgba(248, 242, 235, 0.96)',
              cursor: 'pointer',
              fontWeight: 600,
              color: '#3b2b24',
            }}
          >
            Logout
          </button>
        </div>
      ) : null}
      <Container>
        <div style={{ display: 'flex', justifyContent: 'center' }} className="ether-logo-below-nav">
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(182, 121, 103, 0.28), rgba(245, 236, 228, 0.95))',
              border: '1px solid rgba(182, 121, 103, 0.55)',
              boxShadow: '0 10px 24px rgba(120, 78, 64, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 6,
            }}
          >
            <img
              src="/ether-logo-card.png"
              alt="The Ether™"
              style={{ height: 98, width: 'auto', maxWidth: '100%' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 600 }}>The Ether™</div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'nowrap',
                overflowX: 'auto',
                paddingBottom: 4,
              }}
            >
              <div style={{ position: 'relative' }} ref={myLineRef}>
                <button
                  ref={myLineTriggerRef}
                  type="button"
                  onClick={() => setMyLineOpen((open) => !open)}
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
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'rgba(182, 121, 103, 0.18)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                    }}
                    aria-hidden="true"
                  >
                    💬
                  </span>
                  My Line
                  {myLineUnreadCount ? (
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
                      {myLineUnreadCount}
                    </span>
                  ) : null}
                </button>
                {myLineOpen ? (
                  <div
                    ref={myLineMenuRef}
                    style={{
                      marginTop: 0,
                      width: 'min(320px, calc(100vw - 24px))',
                      maxWidth: 'calc(100vw - 24px)',
                      maxHeight: '50vh',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      borderRadius: 16,
                      border: '1px solid rgba(182, 121, 103, 0.45)',
                      background: 'linear-gradient(180deg, rgba(252, 245, 239, 0.98), rgba(226, 199, 181, 0.96))',
                      boxShadow: '0 18px 42px rgba(26, 18, 14, 0.24)',
                      padding: 12,
                      color: '#3b2b24',
                      zIndex: 1600,
                      boxSizing: 'border-box',
                      ...(myLineMenuStyle ?? {}),
                      ...(myLineMenuStyle?.position === 'fixed'
                        ? {
                            left: 12,
                            right: 12,
                            maxWidth: 'calc(100vw - 24px)',
                            boxSizing: 'border-box',
                            width: 'calc(100vw - 24px)',
                          }
                        : {}),
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13 }}>
                      My Line
                      {myLineUnreadCount ? (
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
                          {myLineUnreadCount}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                      {myLineNewPreviews.length ? 'New messages' : 'Recent messages'}
                    </div>
                    {myLineLoading ? (
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>Loading messages…</div>
                    ) : !myLineHasMessages ? (
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>No messages yet.</div>
                    ) : (
                      <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
                        {myLineShownPreviews.slice(0, 4).map((preview) => (
                          <button
                            key={preview.thread_id}
                            type="button"
                            onClick={() => openMyLineThread(preview)}
                            style={{
                              border: '1px solid rgba(160, 120, 104, 0.25)',
                              background: preview.unread ? 'rgba(182, 121, 103, 0.08)' : 'transparent',
                              padding: '8px 10px',
                              borderRadius: 12,
                              display: 'flex',
                              gap: 10,
                              alignItems: 'center',
                              textAlign: 'left',
                              cursor: 'pointer',
                              width: '100%',
                              boxSizing: 'border-box',
                            }}
                          >
                            <div
                              style={{
                                width: 30,
                                height: 30,
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
                              {preview.counterpart_avatar_url ? (
                                <img
                                  src={preview.counterpart_avatar_url}
                                  alt={preview.counterpart_display_name ?? 'Member'}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                (preview.counterpart_display_name ?? 'Member').slice(0, 1).toUpperCase()
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: 13,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {preview.counterpart_display_name ?? 'Member'}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  opacity: 0.7,
                                  maxWidth: '100%',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {preview.message ?? ''}
                              </div>
                            </div>
                            {preview.unread ? (
                              <span
                                style={{
                                  minWidth: 16,
                                  height: 16,
                                  borderRadius: 999,
                                  background: '#b67967',
                                  color: '#fff',
                                  fontSize: 10,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '0 5px',
                                }}
                              >
                                ●
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        rememberReturnTo()
                        setMyLineOpen(false)
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
                  </div>
                ) : null}
              </div>
              <div style={{ position: 'relative' }} ref={notificationsRef}>
                <button
                  ref={notificationsTriggerRef}
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
                      borderRadius: 16,
                      border: '1px solid rgba(182, 121, 103, 0.45)',
                      background: 'linear-gradient(180deg, rgba(252, 245, 239, 0.98), rgba(226, 199, 181, 0.96))',
                      boxShadow: '0 18px 42px rgba(26, 18, 14, 0.24)',
                      padding: 12,
                      color: '#3b2b24',
                      zIndex: 20,
                      ...(notificationsMenuStyle ?? {}),
                    }}
                  >
                      {notifications.length === 0 ? (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>No notifications yet.</div>
                      ) : (
                        <div style={{ display: 'grid', gap: 10 }}>
                        {notifications.slice(0, 4).map((note) => (
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
                              onClick={() => navigateToProfile(note.actor_profile_id)}
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
                    <button
                      type="button"
                      onClick={() => {
                        rememberReturnTo()
                        setNotificationsOpen(false)
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
                  </div>
                ) : null}
              </div>
              <div style={{ position: 'relative' }} ref={syncMenuRef}>
                <button
                  ref={syncTriggerRef}
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
                      borderRadius: 16,
                      border: '1px solid rgba(182, 121, 103, 0.45)',
                      background: 'linear-gradient(180deg, rgba(252, 245, 239, 0.98), rgba(226, 199, 181, 0.96))',
                      boxShadow: '0 18px 42px rgba(26, 18, 14, 0.24)',
                      padding: 12,
                      color: '#3b2b24',
                      zIndex: 20,
                      ...(syncMenuStyle ?? {}),
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
                            {syncResults.slice(0, 4).map((p) => (
                              <div
                                key={p.id}
                                style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}
                              >
                                <button
                                  type="button"
                                  onClick={() => navigateToProfile(p.id)}
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
                                </button>
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
                                    onClick={() => navigateToProfile(p.id)}
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
                        {syncResults.length > 4 ? (
                          <button
                            type="button"
                            onClick={() => {
                              rememberReturnTo()
                              setSyncMenuOpen(false)
                              router.push(`/sync?tab=search&query=${encodeURIComponent(syncQuery.trim())}`)
                            }}
                            style={{
                              marginTop: 8,
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
                            View all results
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {syncMenuTab === 'requests' ? (
                      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                        {syncRequests.length === 0 ? (
                          <div style={{ fontSize: 12, opacity: 0.7 }}>No requests.</div>
                        ) : (
                          syncRequests.slice(0, 4).map((req) => (
                            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => navigateToProfile(req.requester_profile_id)}
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
                              </button>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  type="button"
                                  onClick={() => navigateToProfile(req.requester_profile_id)}
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
                        <button
                          type="button"
                          onClick={() => {
                            rememberReturnTo()
                            setSyncMenuOpen(false)
                            router.push('/sync?tab=requests')
                          }}
                          style={{
                            marginTop: 6,
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
                    ) : syncMenuTab === 'syncs' ? (
                      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                        {syncs.length === 0 ? (
                          <div style={{ fontSize: 12, opacity: 0.7 }}>No one in sync yet.</div>
                        ) : (
                          syncs.slice(0, 4).map((p) => (
                            <div
                              key={p.id}
                              style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}
                            >
                              <button
                                type="button"
                                onClick={() => navigateToProfile(p.id)}
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
                              </button>
                              <button
                                type="button"
                                onClick={() => navigateToProfile(p.id)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, opacity: 0.7 }}
                              >
                                View
                              </button>
                            </div>
                          ))
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            rememberReturnTo()
                            setSyncMenuOpen(false)
                            router.push('/sync?tab=syncs')
                          }}
                          style={{
                            marginTop: 6,
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
                          View all in sync
                        </button>
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
                  {loading ? 'Posting…' : 'Post to The Ether™'}
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
                const currentProfileId = toProfileId(profile?.id ?? null)
                if (currentProfileId) {
                  if (typeof window !== 'undefined') {
                    window.sessionStorage.setItem(
                      'ether:last_view',
                      JSON.stringify({ path: '/ether', tab: 'mine' })
                    )
                  }
                  router.push(`/ether/profile/${currentProfileId}`)
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
                        {toProfileId(profile?.id ?? null) === post.author_profile_id || role === 'admin' ? (
                          <div style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={() =>
                                setPostMenuOpenId((prev) => (prev === post.id ? null : post.id))
                              }
                              aria-label="Post options"
                              style={{
                                border: '1px solid rgba(95, 74, 62, 0.35)',
                                background: 'rgba(255,255,255,0.7)',
                                cursor: 'pointer',
                                fontSize: 14,
                                lineHeight: '14px',
                                width: 28,
                                height: 28,
                                borderRadius: 10,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#6f4a3a',
                                boxShadow: '0 6px 14px rgba(24, 18, 12, 0.12)',
                              }}
                            >
                              ⋮
                            </button>
                            {postMenuOpenId === post.id ? (
                              <div
                                ref={postMenuRef}
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: '100%',
                                  marginTop: 8,
                                  minWidth: 160,
                                  borderRadius: 12,
                                  border: '1px solid rgba(95, 74, 62, 0.2)',
                                  background: 'linear-gradient(160deg, #f7efe9, #efe4dd)',
                                  boxShadow: '0 16px 30px rgba(24, 18, 12, 0.2)',
                                  padding: 6,
                                  zIndex: 25,
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => requestDeletePost(post.id)}
                                  style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    padding: '8px 10px',
                                    borderRadius: 10,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#7a2e2e',
                                  }}
                                >
                                  Delete post
                                </button>
                              </div>
                            ) : null}
                          </div>
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
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span
                            className={alignPulseId === post.id ? 'align-heart-pulse' : ''}
                            style={{ color: '#b67967', display: 'inline-flex', alignItems: 'center' }}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                              <path
                                d="M12 20.4s-6.4-4-8.2-7.1C2.3 10.6 3.4 8.6 5.6 8.1c1.7-.4 3.2.4 4.1 1.5l.3.4.3-.4c.9-1.1 2.4-1.9 4.1-1.5 2.2.5 3.3 2.5 1.8 5.2-1.8 3.1-8.2 7.1-8.2 7.1z"
                                fill="currentColor"
                              />
                            </svg>
                          </span>
                          Aligned · {post.like_count}
                        </button>
                      ) : (
                        <Button variant="outline" onClick={() => like(post.id)}>
                          <span
                            className={alignPulseId === post.id ? 'align-heart-pulse' : ''}
                            style={{ marginRight: 6, display: 'inline-flex', alignItems: 'center' }}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                              <path
                                d="M12 20.4s-6.4-4-8.2-7.1C2.3 10.6 3.4 8.6 5.6 8.1c1.7-.4 3.2.4 4.1 1.5l.3.4.3-.4c.9-1.1 2.4-1.9 4.1-1.5 2.2.5 3.3 2.5 1.8 5.2-1.8 3.1-8.2 7.1-8.2 7.1z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                              />
                            </svg>
                          </span>
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
                                    <span
                                      className={
                                        commentAlignPulseId === Number(`${post.id}${comment.id}`)
                                          ? 'align-heart-pulse'
                                          : ''
                                      }
                                      style={{
                                        marginRight: 6,
                                        color: comment.aligned_by_me ? '#b67967' : 'inherit',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                      }}
                                    >
                                      {comment.aligned_by_me ? (
                                        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                                          <path
                                            d="M12 20.4s-6.4-4-8.2-7.1C2.3 10.6 3.4 8.6 5.6 8.1c1.7-.4 3.2.4 4.1 1.5l.3.4.3-.4c.9-1.1 2.4-1.9 4.1-1.5 2.2.5 3.3 2.5 1.8 5.2-1.8 3.1-8.2 7.1-8.2 7.1z"
                                            fill="currentColor"
                                          />
                                        </svg>
                                      ) : (
                                        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                                          <path
                                            d="M12 20.4s-6.4-4-8.2-7.1C2.3 10.6 3.4 8.6 5.6 8.1c1.7-.4 3.2.4 4.1 1.5l.3.4.3-.4c.9-1.1 2.4-1.9 4.1-1.5 2.2.5 3.3 2.5 1.8 5.2-1.8 3.1-8.2 7.1-8.2 7.1z"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                          />
                                        </svg>
                                      )}
                                    </span>
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
      </Container>

      {confirmDeleteId !== null ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(21, 16, 12, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 90,
            padding: 20,
          }}
          onClick={() => {
            if (!confirmDeleting) {
              setConfirmDeleteId(null)
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(420px, 100%)',
              background: 'linear-gradient(160deg, #fbf4ee, #efe3da)',
              borderRadius: 20,
              border: '1px solid rgba(163, 122, 106, 0.35)',
              padding: 20,
              boxShadow: 'var(--shadow)',
              display: 'grid',
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 20,
                fontWeight: 600,
                color: '#6f4a3a',
              }}
            >
              Delete this post?
            </div>
            <div style={{ fontSize: 13, color: 'rgba(95, 74, 62, 0.8)' }}>
              This removes the post for everyone. This can’t be undone.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                disabled={confirmDeleting}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(163, 122, 106, 0.35)',
                  background: 'rgba(255, 255, 255, 0.7)',
                  cursor: confirmDeleting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  color: '#6f4a3a',
                  opacity: confirmDeleting ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePost}
                disabled={confirmDeleting}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: '1px solid rgba(182, 121, 103, 0.6)',
                  background: 'linear-gradient(135deg, #c88a77, #b67967)',
                  color: '#fff',
                  cursor: confirmDeleting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  boxShadow: '0 10px 18px rgba(182, 121, 103, 0.35)',
                  opacity: confirmDeleting ? 0.7 : 1,
                }}
              >
                {confirmDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
              background:
                'linear-gradient(135deg, rgba(199, 140, 122, 0.98), rgba(226, 203, 190, 0.98))',
              border: '1px solid rgba(95, 74, 62, 0.2)',
              boxShadow: 'var(--shadow)',
              padding: 16,
              display: 'grid',
              gap: 12,
            }}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: '#3b2b24' }}>
              Profile photo
            </div>
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
                  border: '1px solid rgba(140, 92, 78, 0.55)',
                  background: 'rgba(255,255,255,0.75)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#3b2b24',
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
                  border: '1px solid rgba(182, 121, 103, 0.6)',
                  background: 'linear-gradient(135deg, #c88a77, #b67967)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#fff',
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
              background:
                'linear-gradient(135deg, rgba(199, 140, 122, 0.98), rgba(226, 203, 190, 0.98))',
              borderRadius: 18,
              border: '1px solid rgba(95, 74, 62, 0.2)',
              padding: 18,
              boxShadow: 'var(--shadow)',
              display: 'grid',
              gap: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, color: '#3b2b24' }}>
              Profile photo
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, color: '#3b2b24' }}>
              Upload a new photo and confirm the crop.
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => avatarReuploadRef.current?.click()}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(182, 121, 103, 0.6)',
                  background: 'linear-gradient(135deg, #c88a77, #b67967)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#fff',
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
                  border: '1px solid rgba(140, 92, 78, 0.55)',
                  background: 'rgba(255,255,255,0.75)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#3b2b24',
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
