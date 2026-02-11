'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

const checkAffirmations = [
  'Money flows to me.',
  'I welcome aligned wealth.',
  'Abundance is natural to me.',
  'I receive with ease.',
  'Wealth supports my vision.',
  'I am financially expanding.',
  'Money loves clarity.',
  'I honor my prosperity.',
  'Income increases daily.',
  'I circulate wealth wisely.',
  'My value multiplies.',
  'Prosperity finds me.',
  'I expect overflow.',
  'I am paid in full.',
  'Wealth answers my call.',
  'I attract premium opportunities.',
  'Money meets momentum.',
  'I approve abundance.',
  'My accounts grow steadily.',
  'I am a wealth magnet.',
  'Revenue rises naturally.',
  'I invest in myself.',
  'Cash flows continuously.',
  'I am richly supported.',
  'My work is well rewarded.',
  'Wealth feels safe here.',
  'I allow financial miracles.',
  'My income is scalable.',
  'I receive without guilt.',
  'I create valuable impact.',
  'Abundance backs me.',
  'Money moves toward me.',
  'I choose profitable paths.',
  'My worth compounds.',
  'I operate in overflow.',
  'Wealth is my baseline.',
  'I expand my earning power.',
  'Prosperity is expected.',
  'I attract high-value exchanges.',
  'Money responds to focus.',
  'I am divinely resourced.',
  'My finances align.',
  'Income streams activate.',
  'I deposit confidence.',
  'My wealth circulates back.',
  'I trust financial growth.',
  'Abundance feels familiar.',
  'I approve premium pricing.',
  'Wealth builds through me.',
  'I am financially favored.',
  'My prosperity is lawful.',
  'Money arrives on time.',
]

function formatAmountWithCommas(value: string) {
  const parsed = Number(normalizeMoneyInput(value))
  if (!Number.isFinite(parsed)) return '0.00'
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parsed)
}

function numberToWords(n: number): string {
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  if (n === 0) return 'Zero'
  const toWords = (num: number): string => {
    if (num < 20) return ones[num]
    if (num < 100) return `${tens[Math.floor(num / 10)]}${num % 10 ? ` ${ones[num % 10]}` : ''}`
    if (num < 1000)
      return `${ones[Math.floor(num / 100)]} Hundred${num % 100 ? ` ${toWords(num % 100)}` : ''}`
    if (num < 1_000_000)
      return `${toWords(Math.floor(num / 1000))} Thousand${num % 1000 ? ` ${toWords(num % 1000)}` : ''}`
    if (num < 1_000_000_000)
      return `${toWords(Math.floor(num / 1_000_000))} Million${
        num % 1_000_000 ? ` ${toWords(num % 1_000_000)}` : ''
      }`
    return `${toWords(Math.floor(num / 1_000_000_000))} Billion${
      num % 1_000_000_000 ? ` ${toWords(num % 1_000_000_000)}` : ''
    }`
  }
  return toWords(n).trim()
}

function formatLegalAmount(value: string): string {
  const parsed = Number(normalizeMoneyInput(value))
  if (!Number.isFinite(parsed) || parsed <= 0) return ''
  const dollars = Math.floor(parsed)
  const cents = Math.round((parsed - dollars) * 100)
  const centsText = String(cents).padStart(2, '0')
  return `${numberToWords(dollars)} and ${centsText}/100`
}

function toast(message: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('auth:logged_out', { detail: { message } }))
}

function normalizeMoneyInput(value: string) {
  return value.replace(/[^\d.,]/g, '').replace(/,/g, '')
}

function pickCheckAffirmation() {
  if (checkAffirmations.length === 0) return { text: '', angle: 0 }
  const text = checkAffirmations[Math.floor(Math.random() * checkAffirmations.length)]
  const angle = Math.random() < 0.5 ? -2 : 2
  return { text, angle }
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
  const [checkDate, setCheckDate] = useState('')
  const [accountId, setAccountId] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)
  const [affirmation, setAffirmation] = useState('')
  const [affirmationAngle, setAffirmationAngle] = useState(0)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [isSigning, setIsSigning] = useState(false)
  const [signatureOpen, setSignatureOpen] = useState(false)
  const [signatureConfirmed, setSignatureConfirmed] = useState(false)
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const signatureLastPoint = useRef<{ x: number; y: number } | null>(null)

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
  const requiresSignature = fromChoice === 'me' && direction === 'outgoing'
  const amountDisplay = amount ? `$${amount}` : ''

  async function buildCheckSnapshot(payload?: { affirmation?: string; angle?: number }) {
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 260
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = 'rgba(95, 74, 62, 0.7)'
    ctx.lineWidth = 3
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16)

    ctx.fillStyle = '#3b2b24'
    ctx.font = '700 20px serif'
    ctx.fillText('Manifestation Check', 30, 45)

    ctx.font = '500 16px serif'
    if (checkDate) {
      ctx.fillText(`Date: ${checkDate}`, 30, 78)
    }
    ctx.fillText(`PAY TO THE ORDER OF ${toDisplay}`, 30, 120)
    if (memo) {
      ctx.fillText(`Memo: ${memo}`, 30, 150)
    }

    ctx.strokeStyle = 'rgba(95, 74, 62, 0.7)'
    ctx.lineWidth = 2
    ctx.strokeRect(640, 30, 230, 50)
    ctx.font = '700 18px serif'
    ctx.fillText(`$${formatAmountWithCommas(amount)}`, 650, 62)

    const affirmationText = payload?.affirmation ?? ''
    if (affirmationText) {
      const boxX = 640
      const boxY = 90
      const boxW = 230
      const boxH = 36
      ctx.save()
      ctx.translate(boxX + boxW / 2, boxY + boxH / 2)
      const rotateAngle = ((payload?.angle ?? 0) * Math.PI) / 180
      ctx.rotate(rotateAngle)
      ctx.font = 'italic 18px "Allura", "Great Vibes", "Dancing Script", cursive'
      ctx.fillStyle = 'rgba(122, 86, 72, 0.85)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(affirmationText, 0, 0, boxW - 8)
      ctx.restore()
    }
    const legalAmount = formatLegalAmount(amount)
    if (legalAmount) {
      ctx.font = '600 14px serif'
      ctx.fillText(legalAmount, 30, 175)
    }

    ctx.font = '500 14px serif'
    ctx.fillText('Signature:', 640, 135)

    if (requiresSignature && signatureDataUrl) {
      await new Promise<void>((resolve) => {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(img, 640, 145, 230, 70)
          resolve()
        }
        img.onerror = () => resolve()
        img.src = signatureDataUrl
      })
    } else {
      ctx.font = 'italic 26px \"Allura\", \"Great Vibes\", \"Pacifico\", \"Brush Script MT\", cursive'
      ctx.fillText(fromDisplay, 640, 190)
    }

    ctx.font = '500 12px serif'
    ctx.fillText('*ManifestBank™ is NOT a financial institution.', 520, 245)
    return canvas.toDataURL('image/png')
  }

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
    const initialAffirmation = pickCheckAffirmation()
    if (mounted) {
      setAffirmation(initialAffirmation.text)
      setAffirmationAngle(initialAffirmation.angle)
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (signatureOpen) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prevOverflow
      }
    }
    return undefined
  }, [signatureOpen])

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
    if (requiresSignature && (!signatureDataUrl || !signatureConfirmed)) {
      setError('Please sign and confirm your check below before posting.')
      return
    }
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
    const affirmationPick = pickCheckAffirmation()
    setAffirmation(affirmationPick.text)
    setAffirmationAngle(affirmationPick.angle)
    const detail = {
      from: fromDisplay,
      to: toDisplay,
      check_number: checkNumber || null,
      memo: memo || null,
      kind: 'check',
      direction,
      check_date: checkDate || null,
      signature: requiresSignature ? signatureDataUrl : null,
      affirmation: affirmationPick.text,
      affirmation_angle: affirmationPick.angle,
    }
    setSaving(true)
    try {
      const checkSnapshot =
        typeof window !== 'undefined'
          ? await buildCheckSnapshot({ affirmation: affirmationPick.text, angle: affirmationPick.angle })
          : null
      await api.post('/ledger/entries', {
        account_id: Number(accountId),
        direction: directionLabel,
        amount: parsed.toFixed(2),
        currency: 'USD',
        entry_type: entryType,
        status: 'posted',
        reference,
        memo: memo || `Check ${direction === 'incoming' ? 'deposit' : 'expense'}`,
        meta: { ...detail, check_snapshot: checkSnapshot },
      })
      toast(`Check ${direction === 'incoming' ? 'deposit' : 'expense'} posted.`)
      setAmount('')
      setMemo('')
      setCheckNumber('')
      setCheckDate('')
      setFromChoice('me')
      setToChoice('custom')
      setFromCustom('')
      setToCustom('')
      setSignatureDataUrl(null)
      setSignatureOpen(false)
      setSignatureConfirmed(false)
      setAffirmation('')
      setAffirmationAngle(0)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('accounts:refresh'))
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? 'Unable to post check.')
    } finally {
      setSaving(false)
    }
  }

  function startSignature(x: number, y: number) {
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#3b2b24'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
    signatureLastPoint.current = { x, y }
    setIsSigning(true)
  }

  function drawSignature(x: number, y: number) {
    const canvas = signatureCanvasRef.current
    const last = signatureLastPoint.current
    if (!canvas || !last) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineTo(x, y)
    ctx.stroke()
    signatureLastPoint.current = { x, y }
  }

  function endSignature() {
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    if (isSigning) {
      setSignatureDataUrl(canvas.toDataURL('image/png'))
    }
    signatureLastPoint.current = null
    setIsSigning(false)
  }

  function clearSignature() {
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureDataUrl(null)
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

        <div style={{ marginTop: 26, display: 'grid', gap: 18 }}>
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
                    className="mb-placeholder"
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
                    className="mb-placeholder"
                  />
                ) : null}
              </div>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Amount</span>
                <input
                  value={amountDisplay}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/^\$/i, '')
                    setAmount(raw.replace(/[^\d.,]/g, ''))
                  }}
                  placeholder="$0.00"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.28)',
                    background: 'rgba(255,255,255,0.9)',
                  }}
                  className="mb-placeholder"
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
                  className="mb-placeholder"
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Check date</span>
                <input
                  type="date"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
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
                  className="mb-placeholder"
                />
              </label>

              {requiresSignature ? (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#3b2b24',
                    background: 'rgba(226, 203, 190, 0.45)',
                    border: '1px solid rgba(140, 92, 78, 0.35)',
                    borderRadius: 12,
                    padding: '10px 12px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={signatureConfirmed}
                    onChange={(e) => setSignatureConfirmed(e.target.checked)}
                  />
                  I have signed this check below.
                </label>
              ) : null}

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
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <div
              className="mychecks-preview"
              style={{
                borderRadius: 18,
                border: '2px solid rgba(95, 74, 62, 0.45)',
                background: 'rgba(255,255,255,0.95)',
                padding: 18,
                width: 'min(920px, 100%)',
                minHeight: 220,
                display: 'flex',
                gap: 20,
                alignItems: 'stretch',
                position: 'relative',
              }}
            >
              <div style={{ display: 'grid', gap: 8, flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Manifestation Check</span>
                  {checkNumber ? (
                    <span style={{ fontSize: 12, opacity: 0.7 }}>#{checkNumber}</span>
                  ) : null}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontWeight: 600 }}>Date:</div>
                  <div>{checkDate || '—'}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontWeight: 600 }}>PAY TO THE ORDER OF:</div>
                  <div>{toDisplay}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontWeight: 600 }}>Memo:</div>
                  <div>{memo || '—'}</div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    borderBottom: '1px solid rgba(95, 74, 62, 0.35)',
                    paddingBottom: 6,
                    minHeight: 22,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {amount ? formatLegalAmount(amount) : ''}
                  </div>
                  <div />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'right', minWidth: 220 }}>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Signature</div>
                    {requiresSignature ? (
                      <div style={{ marginTop: 6, display: 'grid', gap: 6, justifyItems: 'end' }}>
                        {!signatureOpen ? (
                          <button
                            type="button"
                            onClick={() => setSignatureOpen(true)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 999,
                              border: '1px solid rgba(140, 92, 78, 0.55)',
                              background: 'rgba(226, 203, 190, 0.45)',
                              cursor: 'pointer',
                              fontWeight: 600,
                              color: '#3b2b24',
                            }}
                          >
                            Click to sign
                          </button>
                        ) : (
                          <>
                            <canvas
                              ref={signatureCanvasRef}
                              width={240}
                              height={80}
                              style={{
                                width: 240,
                                height: 80,
                                border: '1px solid rgba(95, 74, 62, 0.35)',
                                borderRadius: 8,
                                background: 'rgba(255,255,255,0.95)',
                                cursor: 'crosshair',
                              }}
                              onPointerDown={(e) => {
                                const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
                                startSignature(e.clientX - rect.left, e.clientY - rect.top)
                              }}
                              onPointerMove={(e) => {
                                if (!isSigning) return
                                const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
                                drawSignature(e.clientX - rect.left, e.clientY - rect.top)
                              }}
                              onPointerUp={endSignature}
                              onPointerLeave={endSignature}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                              <button
                                type="button"
                                onClick={clearSignature}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 999,
                                  border: '1px solid rgba(140, 92, 78, 0.55)',
                                  background: 'rgba(255,255,255,0.75)',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  color: '#3b2b24',
                                }}
                              >
                                Clear
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: 8,
                          fontFamily: '"Allura", "Great Vibes", "Pacifico", "Brush Script MT", cursive',
                          fontSize: 28,
                          color: '#3b2b24',
                        }}
                      >
                        {fromDisplay}
                      </div>
                    )}
                    <div style={{ fontSize: 12, opacity: 0.75, textAlign: 'right', marginTop: 8 }}>
                      *ManifestBank™ is NOT a financial institution.
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, opacity: 0.8 }}>
                  {direction === 'incoming' ? 'Incoming (Deposit)' : 'Outgoing (Expense)'}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 10,
                  justifyItems: 'end',
                  alignSelf: 'flex-start',
                }}
              >
                <div
                  className="mychecks-amount"
                  style={{
                    border: '2px solid rgba(95, 74, 62, 0.5)',
                    borderRadius: 10,
                    padding: '4px 10px',
                    width: 150,
                    height: 28,
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    marginTop: 6,
                    transform: 'translateX(-156px)',
                  }}
                >
                  {amount ? `$${formatAmountWithCommas(amount)}` : '$0.00'}
                </div>
              </div>
              {affirmation ? (
                <div
                  className="mychecks-affirmation"
                  style={{
                    position: 'absolute',
                    right: 28,
                    top: 78,
                    width: 110,
                    textAlign: 'center',
                    fontFamily: '"Playfair Display", "Cormorant Garamond", "Libre Baskerville", serif',
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'rgba(122, 86, 72, 0.85)',
                    transform: `rotate(${affirmationAngle}deg)`,
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                    pointerEvents: 'none',
                    padding: '6px 4px',
                    borderRadius: 12,
                    background:
                      'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.7), rgba(255,255,255,0) 55%), radial-gradient(circle at 80% 30%, rgba(255,233,210,0.75), rgba(255,233,210,0) 60%), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.6), rgba(255,255,255,0) 55%)',
                    textShadow:
                      '0 0 6px rgba(255, 236, 215, 0.7), 0 0 10px rgba(255, 236, 215, 0.5)',
                  }}
                >
                  {affirmation.split(' ').map((word, index) => (
                    <div key={`${word}-${index}`}>{word}</div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
