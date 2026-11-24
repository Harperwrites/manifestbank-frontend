'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import './november-offer.css'

type Member = { id: number; is_premium?: boolean | null; role?: string; email_verified?: boolean | null }
type Offer = { campaign: string; active: boolean; eligible: boolean; show_alert: boolean; login_at: string | null; delay_ms: number; checkout_ready: boolean; renewal_copy: string; end_label: string; ends_at: string }

export default function NovemberOffer({ user, suspended = false, standalone = false }: { user: Member | null; suspended?: boolean; standalone?: boolean }) {
  const [offer, setOffer] = useState<Offer | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const campaignKey = offer && user ? `${offer.campaign}:shown:${user.id}:${offer.login_at || 'existing-session'}` : ''

  useEffect(() => {
    setOffer(null); setOpen(false); setReady(false); setError('')
    if (!user || user.is_premium) { setReady(true); return }
    let canceled = false
    api.get('/promotions/november').then(({ data }) => { if (!canceled) setOffer(data) }).catch(() => { if (!canceled && standalone) setError('We couldn’t check this offer. Please refresh and try again.') }).finally(() => { if (!canceled) setReady(true) })
    return () => { canceled = true }
  }, [user?.id, user?.is_premium, user?.role, standalone])

  useEffect(() => {
    if (standalone || !offer?.show_alert || suspended || !campaignKey || Date.now() >= Date.parse(offer.ends_at)) return
    if (sessionStorage.getItem(campaignKey)) return
    const timer = window.setTimeout(() => {
      if (Date.now() >= Date.parse(offer.ends_at)) return
      sessionStorage.setItem(campaignKey, '1')
      setOpen(true)
    }, offer.delay_ms)
    return () => window.clearTimeout(timer)
  }, [offer, suspended, standalone, campaignKey])

  useEffect(() => {
    if (!offer) return
    const remaining = Date.parse(offer.ends_at) - Date.now()
    if (remaining <= 0) { setOpen(false); return }
    const timer = window.setTimeout(() => { setOpen(false); setOffer(o => o ? { ...o, active: false } : o) }, Math.min(remaining, 2147483647))
    return () => window.clearTimeout(timer)
  }, [offer])

  useEffect(() => {
    if (standalone) return
    const element = dialog.current
    if (open && !suspended && element && !element.open) { element.showModal(); closeButton.current?.focus() }
    if ((!open || suspended) && element?.open) element.close()
    return () => { if (element?.open) element.close() }
  }, [open, suspended, standalone])

  async function checkout() {
    if (!offer || !user) return
    if (!user.email_verified) { setError('Please verify your email before starting checkout.'); return }
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/billing/checkout-session', { plan: 'annual', campaign: offer.campaign, promo_code: '1111' })
      if (!data.url) throw new Error('Checkout could not be opened. Please try again.')
      window.location.assign(data.url)
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } }; message?: string }).response?.data?.detail
      setError(detail || 'Checkout could not be opened. Please try again.')
      setLoading(false)
    }
  }

  const card = <div className="november-offer-card">
    {!standalone && <button ref={closeButton} type="button" className="november-close" aria-label="Close November offer" onClick={() => setOpen(false)}>×</button>}
    <p className="november-eyebrow">MANIFESTBANK™ SIGNATURE · NOVEMBER SPECIAL</p>
    <h2 id={standalone ? 'november-page-title' : 'november-dialog-title'}>A year of possibility.<br/>A little more room to grow.</h2>
    <p className="november-intro">Make your daily practice your own with an annual Signature membership.</p>
    <div className="november-price"><span>$22.22</span><div>for your first year<br/><s>Normally $72/year</s></div></div>
    <ul><li>Unlimited accounts, checks, deposits, and expenses</li><li>Saved affirmations, statements, and ongoing balance visibility</li><li>Fortune, your AI manifestation teller</li></ul>
    <p className="november-terms">Promo code <strong>1111</strong> is applied automatically to eligible annual purchases.</p>
    <p className="november-deadline">Available through {offer?.end_label || 'November 30, 2026 at 11:59 p.m. Central Time'}.</p>
    <p id="november-renewal" className="november-terms">{offer?.renewal_copy || '$22.22 for your first year; then $72/year, renewing automatically unless you cancel.'} For anyone without a current Signature membership. Existing monthly and annual Signature subscribers are excluded. Taxes, if applicable, appear at checkout.</p>
    {error && <p className="november-error" role="alert">{error}</p>}
    {user && offer?.eligible && offer.active ? <><button className="november-cta" disabled={loading || !offer.checkout_ready} onClick={() => void checkout()}>{loading ? 'Opening secure checkout…' : offer.checkout_ready ? 'Get my first year for $22.22' : 'Offer checkout is not available yet'}</button>{!offer.checkout_ready && <p className="november-terms">The payment configuration is being prepared. No payment has been taken.</p>}</> : !user ? <Link className="november-cta" href="/auth?next=%2Fnovember-offer">Sign in to view your offer</Link> : !ready ? <p role="status">Checking your eligibility…</p> : <p role="status">{offer && !offer.active ? 'This November offer has ended.' : 'This offer is for anyone without a current Signature membership, including existing free accounts. Current Signature subscribers keep their existing membership.'}</p>}
    {!standalone && <button className="november-later" onClick={() => setOpen(false)}>Maybe later</button>}
    <p className="november-footnote">ManifestBank is a reflection and wealth visualization platform. Financial activity in the app is simulated.</p>
  </div>

  if (standalone) return <section className="november-offer-page" aria-labelledby="november-page-title">{card}</section>
  if (!user || !offer?.eligible || !offer.active) return null
  return <dialog ref={dialog} className="november-offer-dialog" aria-labelledby="november-dialog-title" aria-describedby="november-renewal" onCancel={() => setOpen(false)} onClick={e => { if(e.target === e.currentTarget) setOpen(false) }}>{card}</dialog>
}
