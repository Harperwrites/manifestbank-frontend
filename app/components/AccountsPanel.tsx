'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Dispatch, SetStateAction } from 'react'
import { api } from '../../lib/api'
import { Card, Button } from './ui'
import LedgerPanel from './LedgerPanel'

type Account = {
  id: number
  owner_user_id: number
  name: string
  account_type: string
  parent_account_id?: number | null
  is_active: boolean
  created_at: string
}

function errMsg(err: any) {
  const detail = err?.response?.data?.detail
  if (Array.isArray(detail)) return JSON.stringify(detail)
  return detail ?? err?.message ?? 'Unknown error'
}

const targetOwnerStorageKey = 'manifestbank_wealth_target_owner'

export default function AccountsPanel({
  isVerified = true,
  wealthTargetStorageKey,
  wealthTargetOwnerEmail,
}: {
  isVerified?: boolean
  wealthTargetStorageKey?: string
  wealthTargetOwnerEmail?: string | null
}) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('Primary Account')
  const [newType, setNewType] = useState('personal')
  const [newParentId, setNewParentId] = useState<number | ''>('')
  const [showCreate, setShowCreate] = useState(false)
  const [createError, setCreateError] = useState('')
  const [openAccounts, setOpenAccounts] = useState<Record<number, boolean>>({})
  const [renameTarget, setRenameTarget] = useState<Account | null>(null)
  const [renameName, setRenameName] = useState('')
  const [renameError, setRenameError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const [wealthTarget, setWealthTarget] = useState<number | null>(null)
  const [wealthTargetMode, setWealthTargetMode] = useState<'preset' | 'custom'>('preset')
  const [wealthTargetCustom, setWealthTargetCustom] = useState('')
  const [wealthTargetNoticeAt, setWealthTargetNoticeAt] = useState<number | null>(null)

  const wealthTargetOptions = [
    { label: 'Set target', value: '' },
    { label: '$100,000', value: '100000' },
    { label: '$250,000', value: '250000' },
    { label: '$1,000,000', value: '1000000' },
    { label: '$5,000,000', value: '5000000' },
    { label: '$10,000,000', value: '10000000' },
    { label: 'Custom…', value: 'custom' },
  ]

  const targetStorageKey = wealthTargetStorageKey ?? 'manifestbank_wealth_target_usd'

  async function persistWealthTarget(value: number | null) {
    try {
      await api.patch('/users/wealth-target', { wealth_target_usd: value })
    } catch {
      // Keep local storage as source of truth if the API is unreachable.
    }
  }

  useEffect(() => {
    const saved = window.localStorage.getItem(targetStorageKey)
    if (!saved) return
    const parsed = Number.parseFloat(saved)
    if (!Number.isFinite(parsed)) return
    setWealthTarget(parsed)
    if (
      ['100000', '250000', '1000000', '5000000', '10000000'].includes(String(parsed))
    ) {
      setWealthTargetMode('preset')
    } else {
      setWealthTargetMode('custom')
      setWealthTargetCustom('')
    }
  }, [targetStorageKey])

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!wealthTargetNoticeAt) return
    const timer = window.setTimeout(() => {
      setWealthTargetNoticeAt(null)
    }, 15000)
    return () => window.clearTimeout(timer)
  }, [wealthTargetNoticeAt])

  async function load() {
    setLoading(true)
    setMsg('')
    try {
      const res = await api.get('/accounts')
      setAccounts(res.data)
    } catch (e: any) {
      setMsg(`❌ Load /accounts failed: ${errMsg(e)}`)
    } finally {
      setLoading(false)
    }
  }

  async function createAccount() {
    setCreating(true)
    setMsg('')
    setCreateError('')
    const fallbackTrustId = trustAccounts[0]?.id
    const parentId =
      newType !== 'trust' && !newParentId && fallbackTrustId ? fallbackTrustId : newParentId
    try {
      const res = await api.post('/accounts', {
        name: newName || 'Primary Account',
        account_type: newType,
        parent_account_id: parentId || null,
        is_active: true,
      })
      setMsg(`✅ Created account #${res.data?.id ?? 'new'} . Reloading…`)
      await load()
      setNewName('Primary Account')
      setNewType('personal')
      setNewParentId('')
      setShowCreate(false)
    } catch (e: any) {
      setCreateError(`❌ Create failed: ${errMsg(e)}`)
    } finally {
      setCreating(false)
    }
  }

  async function submitRename() {
    if (!renameTarget) return
    const name = renameName.trim()
    if (!name) {
      setRenameError('Account name is required.')
      return
    }
    setRenameError('')
    try {
      await api.patch(`/accounts/${renameTarget.id}`, { name })
      setMsg(`✅ Renamed account #${renameTarget.id}.`)
      setRenameTarget(null)
      setRenameName('')
      await load()
    } catch (e: any) {
      setRenameError(`❌ Rename failed: ${errMsg(e)}`)
    }
  }

  async function submitDelete() {
    if (!deleteTarget) return
    const targetId = deleteTarget.id
    if (deleteConfirm.trim().toLowerCase() !== 'delete') {
      setDeleteError('Type DELETE to confirm.')
      return
    }
    setDeleteError('')
    try {
      setDeleting(true)
      await api.delete(`/accounts/${targetId}`)
      setMsg(`✅ Deleted account #${targetId}.`)
      setDeleteConfirm('')
      setOpenAccounts((prev) => {
        const next = { ...prev }
        delete next[targetId]
        return next
      })
      await load()
      setDeleteTarget(null)
    } catch (e: any) {
      setDeleteError(`❌ Delete failed: ${errMsg(e)}`)
    }
    setDeleting(false)
  }

  useEffect(() => {
    load()
    if (typeof window === 'undefined') return
    const handler = () => load()
    window.addEventListener('accounts:refresh', handler)
    return () => window.removeEventListener('accounts:refresh', handler)
  }, [])

  const trustAccounts = accounts.filter((a) => a.account_type === 'trust')
  const childAccountsByParent = accounts.reduce<Record<number, Account[]>>((acc, acct) => {
    const parentId = (acct as any).parent_account_id as number | undefined
    if (parentId) {
      acc[parentId] = acc[parentId] || []
      acc[parentId].push(acct)
    }
    return acc
  }, {})
  const standaloneAccounts = accounts.filter(
    (a) => a.account_type !== 'trust' && !(a as any).parent_account_id
  )

  const canEdit = isVerified !== false

  return (
    <Card
      title="Your Accounts"
      subtitle="Personal • Trust • Entity"
      right={
        <Button
          variant="solid"
          disabled={!canEdit}
          onClick={() => {
            if (!canEdit) return
            setShowCreate(true)
          }}
        >
          Create account
        </Button>
      }
    >

      {!canEdit ? (
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
          Verify your email to create, rename, or delete accounts.
        </div>
      ) : null}

      {msg ? <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>{msg}</div> : null}

      {accounts.length === 0 ? (
        <div style={{ opacity: 0.75, fontSize: 13 }}>No accounts yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {trustAccounts.map((a) => (
            <div key={a.id}>
              {renderAccountCard(
                a,
                openAccounts,
                setOpenAccounts,
                setRenameTarget,
                setRenameName,
                setRenameError,
                setDeleteTarget,
                setDeleteConfirm,
                setDeleteError,
                wealthTarget,
                setWealthTarget,
                wealthTargetMode,
                setWealthTargetMode,
                wealthTargetCustom,
                setWealthTargetCustom,
                wealthTargetOptions,
                targetStorageKey,
                wealthTargetOwnerEmail,
                wealthTargetNoticeAt,
                setWealthTargetNoticeAt,
                canEdit
              )}
              {(childAccountsByParent[a.id] || []).map((child) => (
                <div key={child.id} style={{ marginLeft: 16, marginTop: 10 }}>
                  {renderAccountCard(
                    child,
                    openAccounts,
                    setOpenAccounts,
                    setRenameTarget,
                    setRenameName,
                    setRenameError,
                    setDeleteTarget,
                    setDeleteConfirm,
                    setDeleteError,
                    wealthTarget,
                    setWealthTarget,
                    wealthTargetMode,
                    setWealthTargetMode,
                    wealthTargetCustom,
                    setWealthTargetCustom,
                    wealthTargetOptions,
                    targetStorageKey,
                    wealthTargetOwnerEmail,
                    wealthTargetNoticeAt,
                    setWealthTargetNoticeAt,
                    canEdit,
                    a.name
                  )}
                </div>
              ))}
            </div>
          ))}
          {standaloneAccounts.map((a) => (
            <div key={a.id}>
              {renderAccountCard(
                a,
                openAccounts,
                setOpenAccounts,
                setRenameTarget,
                setRenameName,
                setRenameError,
                setDeleteTarget,
                setDeleteConfirm,
                setDeleteError,
                wealthTarget,
                setWealthTarget,
                wealthTargetMode,
                setWealthTargetMode,
                wealthTargetCustom,
                setWealthTargetCustom,
                wealthTargetOptions,
                targetStorageKey,
                wealthTargetOwnerEmail,
                wealthTargetNoticeAt,
                setWealthTargetNoticeAt,
                canEdit
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && portalReady
        ? createPortal(
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(21, 16, 12, 0.7)',
                backdropFilter: 'blur(3px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                padding: 20,
              }}
              onClick={() => setShowCreate(false)}
            >
              <div
                style={{
                  width: 'min(520px, 100%)',
                  background:
                    'linear-gradient(135deg, rgba(199, 140, 122, 1), rgba(220, 193, 179, 1))',
                  borderRadius: 20,
                  border: '1px solid rgba(95, 74, 62, 0.2)',
                  padding: 20,
                  boxShadow: 'var(--shadow)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}>
                  Create an account
                </div>
                <div style={{ opacity: 0.7, marginTop: 4 }}>Choose the account type and a name.</div>
                <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                  <input
                    type="text"
                    placeholder="Account name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.3)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: 13,
                    }}
                  />
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.3)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: 13,
                    }}
                  >
                    <option value="personal">Personal</option>
                    <option value="family_office">Family Office</option>
                    <option value="trust">Trust</option>
                    <option value="estate">Estate</option>
                    <option value="foundation">Foundation</option>
                    <option value="holding">Holding Company</option>
                    <option value="investment">Private Investment</option>
                    <option value="entity">Entity</option>
                    <option value="operating">Operating</option>
                  </select>
                  {newType !== 'trust' ? (
                    <select
                      value={newParentId}
                      onChange={(e) => setNewParentId(e.target.value ? Number(e.target.value) : '')}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: '1px solid rgba(95, 74, 62, 0.3)',
                        background: 'rgba(255, 255, 255, 0.9)',
                        fontSize: 13,
                      }}
                    >
                      <option value="">Parent trust (optional)</option>
                      {trustAccounts.map((trust) => (
                        <option key={trust.id} value={trust.id}>
                          {trust.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {createError ? <div style={{ fontSize: 12, color: '#7a2e2e' }}>{createError}</div> : null}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreate(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="solid" onClick={createAccount} disabled={creating}>
                    {creating ? 'Creating…' : 'Create'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {renameTarget && portalReady
        ? createPortal(
            <div
              style={{
                position: 'fixed',
                inset: 0,
                height: '100dvh',
                background: 'rgba(21, 16, 12, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                padding: 20,
              }}
              onClick={() => setRenameTarget(null)}
            >
              <div
                style={{
                  width: 'min(520px, 100%)',
                  background:
                    'linear-gradient(135deg, rgba(199, 140, 122, 0.96), rgba(220, 193, 179, 0.98)), radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.7), transparent 52%), radial-gradient(circle at 78% 10%, rgba(255, 255, 255, 0.45), transparent 58%), linear-gradient(25deg, rgba(80, 58, 48, 0.35) 0%, rgba(255, 255, 255, 0.12) 22%, rgba(80, 58, 48, 0.32) 40%, rgba(255, 255, 255, 0.1) 58%, rgba(80, 58, 48, 0.28) 100%), linear-gradient(115deg, rgba(90, 66, 54, 0.32) 0%, rgba(255, 255, 255, 0.1) 20%, rgba(90, 66, 54, 0.3) 42%, rgba(255, 255, 255, 0.1) 60%, rgba(90, 66, 54, 0.26) 100%), linear-gradient(160deg, rgba(66, 47, 38, 0.28) 0%, rgba(255, 255, 255, 0.08) 25%, rgba(66, 47, 38, 0.26) 48%, rgba(255, 255, 255, 0.08) 70%, rgba(66, 47, 38, 0.22) 100%)',
                  borderRadius: 20,
                  border: '1px solid rgba(95, 74, 62, 0.2)',
                  padding: 20,
                  boxShadow: 'var(--shadow)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}>
                  Rename Account
                </div>
                <div style={{ opacity: 0.7, marginTop: 4 }}>
                  Update the display name for #{renameTarget.id}.
                </div>
                <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                  <input
                    type="text"
                    placeholder="Account name"
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.3)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: 13,
                    }}
                  />
                  {renameError ? <div style={{ fontSize: 12, color: '#7a2e2e' }}>{renameError}</div> : null}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRenameTarget(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="solid" onClick={submitRename}>
                    Save
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {deleteTarget ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(21, 16, 12, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: 20,
          }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            style={{
              width: 'min(520px, 100%)',
              background:
                'linear-gradient(135deg, rgba(199, 140, 122, 0.96), rgba(220, 193, 179, 0.98)), radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.7), transparent 52%), radial-gradient(circle at 78% 10%, rgba(255, 255, 255, 0.45), transparent 58%), linear-gradient(25deg, rgba(80, 58, 48, 0.35) 0%, rgba(255, 255, 255, 0.12) 22%, rgba(80, 58, 48, 0.32) 40%, rgba(255, 255, 255, 0.1) 58%, rgba(80, 58, 48, 0.28) 100%), linear-gradient(115deg, rgba(90, 66, 54, 0.32) 0%, rgba(255, 255, 255, 0.1) 20%, rgba(90, 66, 54, 0.3) 42%, rgba(255, 255, 255, 0.1) 60%, rgba(90, 66, 54, 0.26) 100%), linear-gradient(160deg, rgba(66, 47, 38, 0.28) 0%, rgba(255, 255, 255, 0.08) 25%, rgba(66, 47, 38, 0.26) 48%, rgba(255, 255, 255, 0.08) 70%, rgba(66, 47, 38, 0.22) 100%)',
              borderRadius: 20,
              border: '1px solid rgba(95, 74, 62, 0.2)',
              padding: 20,
              boxShadow: 'var(--shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}>
              Delete Account
            </div>
            <div style={{ opacity: 0.7, marginTop: 4 }}>
              This removes #{deleteTarget.id} and its ledger history.
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <input
                type="text"
                placeholder="Type DELETE to confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(95, 74, 62, 0.3)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  fontSize: 13,
                }}
              />
              {deleteError ? <div style={{ fontSize: 12, color: '#7a2e2e' }}>{deleteError}</div> : null}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteTarget(null)
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={submitDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

  function renderAccountCard(
  account: Account,
  openAccounts: Record<number, boolean>,
  setOpenAccounts: Dispatch<SetStateAction<Record<number, boolean>>>,
  setRenameTarget: Dispatch<SetStateAction<Account | null>>,
  setRenameName: Dispatch<SetStateAction<string>>,
  setRenameError: Dispatch<SetStateAction<string>>,
  setDeleteTarget: Dispatch<SetStateAction<Account | null>>,
  setDeleteConfirm: Dispatch<SetStateAction<string>>,
  setDeleteError: Dispatch<SetStateAction<string>>,
  wealthTarget: number | null,
  setWealthTarget: Dispatch<SetStateAction<number | null>>,
  wealthTargetMode: 'preset' | 'custom',
  setWealthTargetMode: Dispatch<SetStateAction<'preset' | 'custom'>>,
  wealthTargetCustom: string,
  setWealthTargetCustom: Dispatch<SetStateAction<string>>,
  wealthTargetOptions: { label: string; value: string }[],
  targetStorageKey: string,
  wealthTargetOwnerEmail: string | null | undefined,
  wealthTargetNoticeAt: number | null,
  setWealthTargetNoticeAt: Dispatch<SetStateAction<number | null>>,
  canEdit: boolean,
  parentName?: string
) {
  const showTargetNotice = wealthTargetNoticeAt !== null
  return (
    <div
      key={account.id}
      style={{
        padding: 14,
        borderRadius: 18,
        border: '1px solid #2f2f2f',
        background: 'rgba(255,255,255,0.01)',
      }}
    >
      <button
        type="button"
        onClick={() =>
          setOpenAccounts((prev) => ({
            ...prev,
            [account.id]: !prev[account.id],
          }))
        }
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          padding: 0,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 14 }}>{account.name}</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
              Type: <b>{formatAccountType(account.account_type)}</b> • Active: <b>{String(account.is_active)}</b>
            </div>
            {parentName ? (
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Parent trust: {parentName}</div>
            ) : null}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>#{account.id}</span>
            <span>{openAccounts[account.id] ? '▾' : '▸'}</span>
          </div>
        </div>
      </button>

      {openAccounts[account.id] ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <Button
              variant="outline"
              disabled={!canEdit}
              onClick={() => {
                if (!canEdit) return
                setRenameTarget(account)
                setRenameName(account.name)
                setRenameError('')
              }}
            >
              Rename
            </Button>
            <Button
              variant="danger"
              disabled={!canEdit}
              onClick={() => {
                if (!canEdit) return
                setDeleteTarget(account)
                setDeleteConfirm('')
                setDeleteError('')
              }}
            >
              Delete
            </Button>
          </div>
          {account.account_type === 'wealth_builder' ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Set Target</div>
              <select
                value={wealthTargetMode === 'custom' ? 'custom' : wealthTarget ? String(wealthTarget) : ''}
                onChange={(e) => {
                  if (!canEdit) return
                  const next = e.target.value
                  if (!next) {
                    setWealthTarget(null)
                    setWealthTargetMode('preset')
                    window.localStorage.removeItem(targetStorageKey)
                    persistWealthTarget(null)
                    window.dispatchEvent(
                      new CustomEvent('wealthTargetChanged', { detail: { value: null } })
                    )
                    return
                  }
                  if (next === 'custom') {
                    setWealthTargetMode('custom')
                    setWealthTargetCustom('')
                    setWealthTarget(null)
                    window.localStorage.removeItem(targetStorageKey)
                    persistWealthTarget(null)
                    window.dispatchEvent(
                      new CustomEvent('wealthTargetChanged', { detail: { value: null } })
                    )
                    return
                  }
                  const parsed = Number.parseFloat(next)
                  if (!Number.isFinite(parsed)) return
                  setWealthTargetMode('preset')
                  setWealthTarget(parsed)
                  window.localStorage.setItem(targetStorageKey, String(parsed))
                  persistWealthTarget(parsed)
                  if (wealthTargetOwnerEmail) {
                    window.localStorage.setItem(targetOwnerStorageKey, wealthTargetOwnerEmail.toLowerCase())
                  }
                  setWealthTargetNoticeAt(Date.now())
                  window.dispatchEvent(
                    new CustomEvent('wealthTargetChanged', { detail: { value: parsed } })
                  )
                }}
                disabled={!canEdit}
                style={{
                  padding: '8px 10px',
                  borderRadius: 12,
                  border: '1px solid rgba(95, 74, 62, 0.3)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  fontSize: 12,
                  width: 'min(240px, 100%)',
                }}
              >
                {wealthTargetOptions.map((option) => (
                  <option key={option.value || 'none'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {showTargetNotice && wealthTargetMode !== 'custom' ? (
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>Target updated.</div>
              ) : null}
              {wealthTargetMode === 'custom' ? (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        opacity: 0.7,
                        fontSize: 12,
                      }}
                    >
                      $
                    </span>
                    <input
                      value={wealthTargetCustom}
                      onChange={(e) => {
                        if (!canEdit) return
                        setWealthTargetCustom(e.target.value.replace(/[^\d.,]/g, ''))
                      }}
                      placeholder=""
                      disabled={!canEdit}
                      style={{
                        padding: '8px 10px 8px 22px',
                        borderRadius: 12,
                        border: '1px solid rgba(95, 74, 62, 0.3)',
                        background: 'rgba(255, 255, 255, 0.9)',
                        fontSize: 12,
                        width: 160,
                      }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    disabled={!canEdit}
                    onClick={() => {
                      if (!canEdit) return
                      const cleaned = wealthTargetCustom.replace(/[^\d.]/g, '')
                      const parsed = Number.parseFloat(cleaned)
                      if (!Number.isFinite(parsed)) return
                      setWealthTarget(parsed)
                      window.localStorage.setItem(targetStorageKey, String(parsed))
                      persistWealthTarget(parsed)
                      if (wealthTargetOwnerEmail) {
                        window.localStorage.setItem(targetOwnerStorageKey, wealthTargetOwnerEmail.toLowerCase())
                      }
                      setWealthTargetNoticeAt(Date.now())
                      window.dispatchEvent(
                        new CustomEvent('wealthTargetChanged', { detail: { value: parsed } })
                      )
                    }}
                  >
                    Save
                  </Button>
                  {showTargetNotice ? (
                    <span style={{ fontSize: 12, opacity: 0.7 }}>Target updated.</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          <LedgerPanel accountId={account.id} isVerified={canEdit} />
        </div>
      ) : null}
    </div>
  )
}

function formatAccountType(value: string) {
  const labels: Record<string, string> = {
    personal: 'Personal',
    family_office: 'Family Office',
    trust: 'Trust',
    estate: 'Estate',
    foundation: 'Foundation',
    holding: 'Holding Company',
    investment: 'Private Investment',
    entity: 'Entity',
    operating: 'Operating',
    wealth_builder: 'Wealth Builder',
  }
  return labels[value] ?? value.replace(/_/g, ' ')
}
