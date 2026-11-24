'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import './november-offer.css'

type Member = { id: number; is_premium?: boolean | null; role?: string; email_verified?: boolean | null }
type Offer = { campaign: string; active: boolean; eligible: boolean; show_alert: boolean; login_at: string | null; delay_ms: number; checkout_ready: boolean; renewal_copy: string; end_label: string; ends_at: string }
const VIDEO = '/promos/november-2026/november-signature-2222-narrated.mp4'
const POSTER = '/promos/november-2026/november-video-poster.jpg'
const CAPTIONS = '/promos/november-2026/november-signature-2222.vtt'

export default function NovemberOffer({ user, suspended = false, standalone = false }: { user: Member | null; suspended?: boolean; standalone?: boolean }) {
  const [offer, setOffer] = useState<Offer | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [finished, setFinished] = useState(false)
  const [mediaError, setMediaError] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [captions, setCaptions] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(55.4)
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const watched = useRef(0)
  const lastTick = useRef(0)
  const campaignKey = offer && user ? `${offer.campaign}:video-v1:completed:${user.id}:${offer.login_at || 'existing-session'}` : ''
  const canDismiss = finished || mediaError
  const canCheckout = standalone || finished

  useEffect(() => {
    setOffer(null); setOpen(false); setReady(false); setError('')
    setFinished(false); setMediaError(false); setProgress(0); setMuted(false); watched.current = 0
    if (!user || user.is_premium) { setReady(true); return }
    let canceled = false
    api.get('/promotions/november').then(({ data }) => { if (!canceled) setOffer(data) }).catch(() => { if (!canceled && standalone) setError('We couldn’t check this offer. Please refresh and try again.') }).finally(() => { if (!canceled) setReady(true) })
    return () => { canceled = true }
  }, [user?.id, user?.is_premium, user?.role, standalone])

  useEffect(() => {
    if (standalone || !offer?.show_alert || suspended || !campaignKey || Date.now() >= Date.parse(offer.ends_at)) return
    if (sessionStorage.getItem(campaignKey)) return
    // Open as soon as eligibility is known; signup first-login suppression is server-side.
    setOpen(true)
  }, [offer, suspended, standalone, campaignKey])

  useEffect(() => {
    if (!offer) return
    const remaining = Date.parse(offer.ends_at) - Date.now()
    if (remaining <= 0) { setOpen(false); return }
    const timer = window.setTimeout(() => { setOpen(false); setOffer(o => o ? { ...o, active: false } : o) }, Math.min(remaining, 2147483647))
    return () => window.clearTimeout(timer)
  }, [offer])

  async function playVideo(withSound = false) {
    const player = video.current
    if (!player) return
    if (withSound) { player.muted = false; player.volume = 1; setMuted(false) }
    lastTick.current = performance.now()
    try { await player.play() } catch {
      // Browsers can require a tap for audible playback. Keep sound enabled and
      // show the play button instead of silently switching to muted playback.
      setPlaying(false)
    }
  }

  useEffect(() => {
    if (standalone) return
    const element = dialog.current
    if (open && !suspended && element && !element.open) {
      element.showModal(); heading.current?.focus(); void playVideo(true)
    }
    if ((!open || suspended) && element?.open) { video.current?.pause(); element.close() }
    return () => { video.current?.pause(); if (element?.open) element.close() }
  }, [open, suspended, standalone])

  function updateProgress() {
    const player = video.current
    if (!player || finished || player.seeking) return
    const now = performance.now()
    const elapsed = lastTick.current ? (now - lastTick.current) / 1000 : 0
    lastTick.current = now
    if (player.currentTime > watched.current + Math.max(0.8, elapsed + 0.5)) {
      player.currentTime = watched.current; return
    }
    if (!player.paused) { watched.current = Math.max(watched.current, player.currentTime); setProgress(watched.current) }
  }

  function finishVideo() {
    const player = video.current
    if (!player || !Number.isFinite(player.duration)) return
    if (watched.current < player.duration - 0.8) { player.currentTime = watched.current; void playVideo(); return }
    setProgress(player.duration); setFinished(true)
    // Reloading or navigating before completion never records the video as watched.
    if (campaignKey) sessionStorage.setItem(campaignKey, '1')
  }

  function toggleSound() {
    const player = video.current
    if (!player) return
    player.muted = !player.muted; setMuted(player.muted)
    if (player.paused && !finished) void playVideo()
  }

  function toggleCaptions() {
    const player = video.current
    if (!player?.textTracks[0]) return
    player.textTracks[0].mode = captions ? 'hidden' : 'showing'; setCaptions(!captions)
  }

  async function checkout() {
    if (!offer || !user || !canCheckout) return
    if (!user.email_verified) { setError('Please verify your email before starting checkout.'); return }
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/billing/checkout-session', { plan: 'annual', campaign: offer.campaign, promo_code: '1111' })
      if (!data.url) throw new Error('Checkout could not be opened. Please try again.')
      window.location.assign(data.url)
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } }; message?: string }).response?.data?.detail
      setError(detail || 'Checkout could not be opened. Please try again.'); setLoading(false)
    }
  }

  const card = <div className={`november-offer-card${!standalone ? ' november-video-card' : ''}`}>
    {!standalone && <button type="button" className="november-close" aria-label="Close November promo" disabled={!canDismiss} title={canDismiss ? 'Close promo' : 'Available after the video finishes'} onClick={() => { if (canDismiss) setOpen(false) }}>×</button>}
    <p className="november-eyebrow">MANIFESTBANK™ SIGNATURE · NOVEMBER SPECIAL</p>
    <h2 ref={heading} tabIndex={-1} id={standalone ? 'november-page-title' : 'november-dialog-title'}>A year of possibility.</h2>
    {!standalone && <>
      <div className="november-video-frame">
        <video ref={video} muted={muted} playsInline preload="auto" poster={POSTER} disablePictureInPicture disableRemotePlayback controlsList="nodownload noremoteplayback noplaybackrate" aria-label="November Signature promo with voiceover and music" onContextMenu={e => e.preventDefault()}
          onLoadedMetadata={() => { if (video.current && Number.isFinite(video.current.duration)) setDuration(video.current.duration) }}
          onPlay={() => { lastTick.current = performance.now(); setPlaying(true) }} onPause={() => setPlaying(false)}
          onTimeUpdate={updateProgress} onSeeking={() => { const p = video.current; if (p && p.currentTime > watched.current + 0.5) p.currentTime = watched.current }}
          onRateChange={() => { if (video.current && video.current.playbackRate !== 1) video.current.playbackRate = 1 }}
          onEnded={finishVideo} onError={() => { setMediaError(true); setPlaying(false) }}>
          <source src={VIDEO} type="video/mp4" /><track kind="captions" src={CAPTIONS} srcLang="en" label="English" />
        </video>
        {!playing && !finished && !mediaError && <button type="button" className="november-play" onClick={() => void playVideo(true)}>▶ Play promo with sound</button>}
      </div>
      <div className="november-player-controls">
        <button type="button" onClick={() => { if (video.current?.paused) void playVideo(); else video.current?.pause() }} disabled={mediaError}>{playing ? 'Pause' : finished ? 'Replay' : 'Play'}</button>
        <button type="button" onClick={toggleSound} aria-pressed={!muted}>{muted ? 'Turn sound on' : 'Mute'}</button>
        <button type="button" onClick={toggleCaptions} aria-pressed={captions}>Captions {captions ? 'on' : 'off'}</button>
        <span>{Math.floor(progress)} / {Math.ceil(duration)} sec</span>
      </div>
      <progress className="november-progress" aria-label="Promo video playback progress" max={duration} value={progress} />
      <p id="november-playback-status" className="november-playback-status" role="status">{mediaError ? 'The video couldn’t load. Retry playback, or close this window and try again.' : finished ? 'Video complete. Your annual offer is ready.' : 'Please watch the full video to unlock checkout and close this window.'}</p>
      {mediaError && <button type="button" onClick={() => { setMediaError(false); video.current?.load(); void playVideo() }}>Retry video</button>}
    </>}
    {standalone && <p className="november-intro">Make your daily practice your own with an annual Signature membership.</p>}
    <div className="november-purchase-panel">
      <div className="november-price"><span>$22.22</span><div>for your first year<br/><s>Normally $72/year</s></div></div>
      <p className="november-code">CODE <strong>1111</strong> · ALREADY APPLIED</p>
      {user && offer?.eligible && offer.active ? <button className="november-cta" disabled={loading || !offer.checkout_ready || !canCheckout} onClick={() => void checkout()}>{loading ? 'Opening secure checkout…' : offer.checkout_ready ? 'Get annual Signature — $22.22 first year' : 'Offer checkout is not available yet'}</button> : !user ? <Link className="november-cta" href="/auth?next=%2Fnovember-offer">Sign in to view your offer</Link> : !ready ? <p role="status">Checking your eligibility…</p> : <p role="status">{offer && !offer.active ? 'This November offer has ended.' : 'Available to anyone without a current Signature membership, including existing free accounts.'}</p>}
      <p id="november-renewal" className="november-terms">{offer?.renewal_copy || '$22.22 for your first year; then $72/year, renewing automatically unless you cancel.'} Taxes, if applicable, appear at checkout.</p>
      {error && <p className="november-error" role="alert">{error}</p>}
    </div>
    {standalone && <ul><li>Unlimited accounts, checks, deposits, and expenses</li><li>Saved affirmations, statements, and ongoing balance visibility</li><li>Fortune, your AI manifestation teller</li></ul>}
    <p className="november-deadline">Available through {offer?.end_label || 'November 30, 2026 at 11:59 p.m. Central Time'}.</p>
    <p className="november-terms">For anyone without a current Signature membership. Existing monthly and annual Signature subscribers are excluded.</p>
    {!standalone && finished && <button className="november-later" onClick={() => setOpen(false)}>Continue to ManifestBank</button>}
    <p className="november-footnote">A product of Manifest Treasures LLC. ManifestBank is a reflection and wealth visualization platform. Financial activity is simulated.</p>
  </div>
  if (standalone) return <section className="november-offer-page" aria-labelledby="november-page-title">{card}</section>
  if (!user || !offer?.eligible || !offer.active) return null
  return <dialog ref={dialog} className="november-offer-dialog november-video-dialog" aria-labelledby="november-dialog-title" aria-describedby="november-playback-status november-renewal" onCancel={e => { if (!canDismiss) e.preventDefault(); else setOpen(false) }} onClick={e => { if (e.target === e.currentTarget && canDismiss) setOpen(false) }}>{card}</dialog>
}
