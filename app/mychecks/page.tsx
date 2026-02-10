'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { api } from '@/lib/api'

type Account = {
  id: number
  name: string
  account_type: string
}

type Me = {
  id: number
  username?: string | null
  email?: string | null
}

const recipientPresets = [
  'Universe',
  'Opportunity',
  'My Business',
  'New Client',
  'Future Self',
  'Partner',
]

function toast(message: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('auth:logged_out', { detail: { message } }))
}

function normalizeMoneyInput(value: string) {
  return value.replace(/[^\d.,]/g, '').replace(/,/g, '')
}

export default function MyChecksPage() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [direction, setDirection] = useState<'incoming' | 'outgoing'>('outgoing')
  const [fromChoice, setFromChoice] = useState<string>('me')
  const [toChoice, setToChoice] = useState<string>('custom')
  const [fromCustom, setFromCustom] = useState('')
  const [toCustom, setToCustom] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [checkNumber, setCheckNumber] = useState('')
  const [accountId, setAccountId] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)

  const meLabel = me?.username || me?.email || 'Me'

  const recipientOptions = useMemo(
    () => [
      { value: 'me', label: meLabel },
      ...recipientPresets.map((name) => ({ value: name, label: name })),
      { value: 'custom', label: 'Custom…' },
    ],
    [meLabel]
  )

  const fromDisplay =
    fromChoice === 'me' ? meLabel : fromChoice === 'custom' ? fromCustom || 'Custom sender' : fromChoice
  const toDisplay =
    toChoice === 'me' ? meLabel : toChoice === 'custom' ? toCustom || 'Custom recipient' : toChoice

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [meRes, accountsRes] = await Promise.all([api.get('/auth/me'), api.get('/accounts')])
        if (!mounted) return
        setMe(meRes.data)
        setAccounts(Array.isArray(accountsRes.data) ? accountsRes.data : [])
      } catch (e: any) {
        if (!mounted) return
        setError(e?.response?.data?.detail ?? e?.message ?? 'Unable to load checks data.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  function swapParties() {
    const nextFrom = toChoice
    const nextTo = fromChoice
    setFromChoice(nextFrom)
    setToChoice(nextTo)
    const nextFromCustom = toCustom
    const nextToCustom = fromCustom
    setFromCustom(nextFromCustom)
    setToCustom(nextToCustom)
    setDirection((prev) => (prev === 'incoming' ? 'outgoing' : 'incoming'))
  }

  async function createCheckEntry() {
    setError('')
    const parsed = Number(normalizeMoneyInput(amount).trim())
    if (!accountId) {
      setError('Choose an account to post this check to.')
      return
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid amount.')
      return
    }
    const directionLabel = direction === 'incoming' ? 'credit' : 'debit'
    const entryType = direction === 'incoming' ? 'deposit' : 'withdrawal'
    const reference = checkNumber ? `check-${checkNumber}` : 'check'
    const detail = {
      from: fromDisplay,
      to: toDisplay,
      check_number: checkNumber || null,
      memo: memo || null,
      kind: 'check',
      direction,
    }
    setSaving(true)
    try {
      await api.post('/ledger/entries', {
        account_id: Number(accountId),
        direction: directionLabel,
        amount: parsed.toFixed(2),
        currency: 'USD',
        entry_type: entryType,
        status: 'posted',
        reference,
        memo: memo || `Check ${direction === 'incoming' ? 'deposit' : 'expense'}`,
        meta: detail,
      })
      toast(`Check ${direction === 'incoming' ? 'deposit' : 'expense'} posted.`)
      setAmount('')
      setMemo('')
      setCheckNumber('')
      setFromChoice('me')
      setToChoice('custom')
      setFromCustom('')
      setToCustom('')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('accounts:refresh'))
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? 'Unable to post check.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main>
      <Navbar />
      <div style={{ padding: '28px 24px 60px', maxWidth: 980, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 34, fontWeight: 600 }}>My Checks</div>
            <div style={{ opacity: 0.75, marginTop: 6 }}>
              Create manifestation checks and post them as deposits or expenses.
            </div>
          </div>
          <div>
            <Link
              href="/dashboard"
              style={{
                textDecoration: 'none',
                padding: '8px 14px',
                borderRadius: 999,
                border: '1px solid rgba(95, 74, 62, 0.35)',
                background: 'rgba(248, 242, 235, 0.96)',
                color: '#3b2b24',
                fontWeight: 600,
              }}
            >
              Back to dashboard
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={{ marginTop: 24, opacity: 0.7 }}>Loading…</div>
        ) : null}
        {error ? (
          <div style={{ marginTop: 16, color: '#7a2e2e', fontSize: 13 }}>{error}</div>
        ) : null}

        <div style={{ marginTop: 26, display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div
            style={{
              borderRadius: 18,
              border: '1px solid rgba(140, 92, 78, 0.35)',
              background: 'rgba(255,255,255,0.92)',
              padding: 18,
              boxShadow: '0 18px 36px rgba(18, 12, 10, 0.18)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 16 }}>Check Details</div>
            <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Direction</span>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as 'incoming' | 'outgoing')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.28)',
                    background: 'rgba(255,255,255,0.9)',
                  }}
                >
                  <option value="outgoing">Outgoing (Expense)</option>
                  <option value="incoming">Incoming (Deposit)</option>
                </select>
              </label>

              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>From (Sender)</span>
                  <select
                    value={fromChoice}
                    onChange={(e) => setFromChoice(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.28)',
                      background: 'rgba(255,255,255,0.9)',
                    }}
                  >
                    {recipientOptions.map((opt) => (
                      <option key={`from-${opt.value}`} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                {fromChoice === 'custom' ? (
                  <input
                    value={fromCustom}
                    onChange={(e) => setFromCustom(e.target.value)}
                    placeholder="Enter sender name"
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.28)',
                      background: 'rgba(255,255,255,0.9)',
                    }}
                  />
                ) : null}
              </div>

              <button
                type="button"
                onClick={swapParties}
                style={{
                  alignSelf: 'start',
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(140, 92, 78, 0.45)',
                  background: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#4a2f26',
                  width: 'fit-content',
                }}
              >
                Swap From/To
              </button>

              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>To (Recipient)</span>
                  <select
                    value={toChoice}
                    onChange={(e) => setToChoice(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.28)',
                      background: 'rgba(255,255,255,0.9)',
                    }}
                  >
                    {recipientOptions.map((opt) => (
                      <option key={`to-${opt.value}`} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                {toChoice === 'custom' ? (
                  <input
                    value={toCustom}
                    onChange={(e) => setToCustom(e.target.value)}
                    placeholder="Enter recipient name"
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.28)',
                      background: 'rgba(255,255,255,0.9)',
                    }}
                  />
                ) : null}
              </div>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Amount</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="$0.00"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.28)',
                    background: 'rgba(255,255,255,0.9)',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Check number (optional)</span>
                <input
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                  placeholder="0001"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.28)',
                    background: 'rgba(255,255,255,0.9)',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Account to post</span>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : '')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.28)',
                    background: 'rgba(255,255,255,0.9)',
                  }}
                >
                  <option value="">Select account…</option>
                  {accounts.map((acct) => (
                    <option key={acct.id} value={acct.id}>
                      {acct.name} • {acct.account_type}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Memo</span>
                <input
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="For abundance..."
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.28)',
                    background: 'rgba(255,255,255,0.9)',
                  }}
                />
              </label>

              <button
                type="button"
                onClick={createCheckEntry}
                disabled={saving}
                style={{
                  marginTop: 6,
                  padding: '12px 16px',
                  borderRadius: 999,
                  border: '1px solid rgba(182, 121, 103, 0.6)',
                  background: 'linear-gradient(135deg, #c88a77, #b67967)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Posting…' : 'Create Check'}
              </button>
            </div>
          </div>

          <div
            style={{
              borderRadius: 22,
              border: '1px solid rgba(140, 92, 78, 0.35)',
              background: 'linear-gradient(160deg, rgba(255,255,255,0.95), rgba(226, 203, 190, 0.65))',
              padding: 22,
              boxShadow: '0 20px 36px rgba(18, 12, 10, 0.18)',
              minHeight: 360,
              display: 'grid',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              Manifestation Check
              <span style={{ fontSize: 12, opacity: 0.7 }}>{checkNumber ? `#${checkNumber}` : 'Draft'}</span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600 }}>From:</div>
                <div>{fromDisplay}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600 }}>To:</div>
                <div>{toDisplay}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600 }}>Amount:</div>
                <div>{amount ? `$${normalizeMoneyInput(amount)}` : '$0.00'}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600 }}>Memo:</div>
                <div>{memo || '—'}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600 }}>Type:</div>
                <div>{direction === 'incoming' ? 'Incoming (Deposit)' : 'Outgoing (Expense)'}</div>
              </div>
            </div>
            <div style={{ marginTop: 'auto', fontSize: 12, opacity: 0.75 }}>
              *ManifestBank™ is NOT a financial institution.
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
