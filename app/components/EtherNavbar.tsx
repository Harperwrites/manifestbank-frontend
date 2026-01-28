'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import InstallAppButton from '@/app/components/InstallAppButton'
import { api } from '@/lib/api'

type Profile = {
  id: number
  display_name: string
  bio?: string | null
  links?: string | null
  avatar_url?: string | null
  is_public: boolean
  sync_requires_approval: boolean
}

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
                  Signed in as <b>{me.email}</b>
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

export default EtherNavbar
