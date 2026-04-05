'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import Navbar from '@/app/components/Navbar'
import { api } from '@/lib/api'

const pageStyles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(circle at top, rgba(246, 238, 230, 0.9), rgba(249, 245, 240, 0.95))',
    color: '#3b2b24',
  },
  hero: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '36px 24px 20px',
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'rgba(90, 64, 52, 0.7)',
  },
  title: {
    fontFamily: 'var(--font-serif)',
    fontSize: 40,
    margin: '10px 0 8px',
  },
  body: {
    maxWidth: 680,
    fontSize: 16,
    opacity: 0.78,
  },
  grid: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '10px 24px 28px',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 18,
  },
  compositeRow: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '0 24px 12px',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    alignItems: 'center',
    gap: 18,
  },
  card: {
    borderRadius: 20,
    border: '1px solid rgba(140, 92, 78, 0.25)',
    background: 'rgba(255, 255, 255, 0.9)',
    padding: 18,
    boxShadow: '0 14px 32px rgba(18, 12, 10, 0.12), 0 0 24px rgba(182, 121, 103, 0.25)',
    display: 'grid',
    gap: 14,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitle: {
    fontWeight: 700,
    fontSize: 15,
  },
  cardSub: {
    fontSize: 12,
    opacity: 0.68,
    marginTop: 4,
  },
  score: {
    textAlign: 'right',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 700,
  },
  scoreLabel: {
    fontSize: 11,
    opacity: 0.6,
  },
  gauge: {
    position: 'relative',
    height: 120,
  },
  gaugeHalf: {
    position: 'relative',
    height: 90,
    overflow: 'hidden',
  },
  gaugeTicks: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
  gaugeArc: {
    position: 'absolute',
    width: 180,
    height: 180,
    left: '50%',
    top: 0,
    transform: 'translateX(-50%)',
    borderRadius: '50%',
  },
  gaugeCenter: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#3b2b24',
    left: '50%',
    top: 86,
    transform: 'translateX(-50%)',
  },
  panel: {
    maxWidth: 1100,
    margin: '0 auto 60px',
    padding: 24,
    borderRadius: 20,
    border: '1px solid rgba(140, 92, 78, 0.25)',
    background: 'rgba(255, 255, 255, 0.9)',
    boxShadow: '0 14px 32px rgba(18, 12, 10, 0.12)',
  },
  panelTitle: {
    fontWeight: 700,
    fontSize: 16,
  },
  panelBody: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.75,
  },
  pillButton: {
    borderRadius: 999,
    border: '1px solid rgba(140, 92, 78, 0.35)',
    background: 'rgba(255,255,255,0.9)',
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: '#3b2b24',
    cursor: 'pointer',
  },
  pinButton: {
    borderRadius: 999,
    border: '1px solid rgba(140, 92, 78, 0.35)',
    background: 'rgba(140, 92, 78, 0.08)',
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 700,
    color: '#3b2b24',
    cursor: 'pointer',
    boxShadow: '0 0 12px rgba(182, 121, 103, 0.35)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
}

function Gauge({
  value,
  label,
  subtitle,
  accent,
  className,
  onClick,
  testId,
}: {
  value: number
  label: string
  subtitle: string
  accent: string
  className?: string
  onClick?: () => void
  testId?: string
}) {
  const maxValue = 999
  const safe = Math.max(0, Math.min(maxValue, value))
  const radius = 72
  const cx = 90
  const cy = 90
  const rad = Math.PI * (1 - safe / maxValue)
  const nx = cx + radius * Math.cos(rad)
  const ny = cy - radius * Math.sin(rad)
  const arcLength = Math.PI * radius
  const progressLength = (safe / maxValue) * arcLength
  return (
    <div data-testid={testId} style={{ ...pageStyles.card, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div style={pageStyles.cardHeader}>
        <div>
          <div style={pageStyles.cardTitle}>{label}</div>
          <div style={pageStyles.cardSub}>{subtitle}</div>
        </div>
        <div style={pageStyles.score}>
          <div style={pageStyles.scoreValue}>{safe}</div>
          <div style={pageStyles.scoreLabel}>Score</div>
        </div>
      </div>
      <div style={pageStyles.gauge}>
        <div style={pageStyles.gaugeHalf}>
          <div className="credit-gauge-sweep" />
          <div className="credit-gauge-glitter" />
          <div style={pageStyles.gaugeTicks}>
            {Array.from({ length: 1000 }).map((_, idx) => {
              const tickAngle = -90 + (idx / 999) * 180
              const major = idx % 100 === 0
              return (
                <span
                  key={`tick-${idx}`}
                  style={{
                    position: 'absolute',
                    width: 1,
                    height: major ? 12 : 4,
                    background: 'rgba(120, 90, 78, 0.28)',
                    left: '50%',
                    top: 0,
                    transformOrigin: '50% 90px',
                    transform: `rotate(${tickAngle}deg) translateY(2px)`,
                  }}
                />
              )
            })}
          </div>
          <svg
            width="180"
            height="90"
            viewBox="0 0 180 90"
            style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)' }}
          >
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              stroke="rgba(118, 88, 74, 0.2)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              stroke={accent}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${progressLength} ${arcLength}`}
              className="credit-gauge-glow"
            />
          </svg>
        </div>
        <svg
          width="180"
          height="90"
          viewBox="0 0 180 90"
          style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)' }}
        >
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={accent} strokeWidth="2" className="credit-gauge-glow" />
        </svg>
        <div style={pageStyles.gaugeCenter} />
      </div>
      <div className={className} />
    </div>
  )
}

export default function MyCreditPage() {
  const [summary, setSummary] = useState<null | {
    scores: { composite: number; iab: number; emotional: number; ctb: number }
    updated_at: string
    total_actions_7d: number
    total_actions_30d: number
    completed_iab_30d: number
    completed_emotional_30d: number
    completed_ctb_30d: number
    streak_days: number
    daily_cap: number
    daily_used: number
    trend_7d: number[]
    drivers: { iab: string; emotional: string; ctb: string }
  }>(null)
  const [actions, setActions] = useState<
    {
      id: number
      title: string
      description: string
      primary_bureau: string
      action_type: string
      action_route?: string | null
    }[]
  >([])
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set())
  const [todos, setTodos] = useState<
    {
      id: number
      action_id: number
      action_type: string
      status: string
      title: string
      description: string
      action_route?: string | null
    }[]
  >([])
  const [expandedAction, setExpandedAction] = useState<number | null>(null)
  const prevSummaryRef = useRef<typeof summary>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [capToast, setCapToast] = useState('')
  const [rangeDays, setRangeDays] = useState(7)
  const carouselRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])
  const [mobileIndex, setMobileIndex] = useState(0)
  const isProgrammaticScroll = useRef(false)
  const [navClearance, setNavClearance] = useState(180)
  const [navReady, setNavReady] = useState(false)

  const [animated, setAnimated] = useState({
    composite: 0,
    iab: 0,
    emotional: 0,
    ctb: 0,
  })

  const scores = summary?.scores

  useLayoutEffect(() => {
    let stableTimer = 0
    let frame = 0
    let observer: ResizeObserver | null = null

    function updateNavClearance() {
      const navbar = document.querySelector('.mb-navbar') as HTMLElement | null
      const measuredHeight = Math.ceil(navbar?.getBoundingClientRect().height ?? 160)
      setNavClearance(measuredHeight + 10)
      window.clearTimeout(stableTimer)
      stableTimer = window.setTimeout(() => setNavReady(true), 80)

      if (observer || !navbar || typeof ResizeObserver === 'undefined') return
      observer = new ResizeObserver(() => {
        const nextHeight = Math.ceil(navbar.getBoundingClientRect().height || 160)
        setNavClearance(nextHeight + 10)
        window.clearTimeout(stableTimer)
        stableTimer = window.setTimeout(() => setNavReady(true), 80)
      })
      observer.observe(navbar)
    }

    setNavReady(false)
    updateNavClearance()
    frame = window.requestAnimationFrame(updateNavClearance)
    window.addEventListener('resize', updateNavClearance)
    return () => {
      if (observer) observer.disconnect()
      window.clearTimeout(stableTimer)
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', updateNavClearance)
    }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      api.get(`/credit/summary?days=${rangeDays}`),
      api.get('/credit/actions'),
      api.get('/credit/todos'),
    ])
      .then(([summaryRes, actionsRes, todosRes]) => {
        if (!active) return
        setSummary(summaryRes.data)
        setTodos(todosRes.data || [])
        setActions(actionsRes.data || [])
      })
      .catch((err) => {
        if (!active) return
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          setError('Please sign in to view your credit report.')
        } else {
          setError(err?.response?.data?.detail ?? 'Unable to load credit data.')
        }
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [rangeDays])

  useEffect(() => {
    if (!actions.length && !loading) {
      loadActionsWithExclusions()
    }
  }, [todos, dismissedIds])

  useEffect(() => {
    if (!scores) return
    let frame = 0
    const start = performance.now()
    const from = { ...animated }
    const to = {
      composite: scores.composite,
      iab: scores.iab,
      emotional: scores.emotional,
      ctb: scores.ctb,
    }
    const duration = 900
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const ease = 1 - Math.pow(1 - t, 3)
      setAnimated({
        composite: Math.round(from.composite + (to.composite - from.composite) * ease),
        iab: Math.round(from.iab + (to.iab - from.iab) * ease),
        emotional: Math.round(from.emotional + (to.emotional - from.emotional) * ease),
        ctb: Math.round(from.ctb + (to.ctb - from.ctb) * ease),
      })
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [scores])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!summary) return
    if (summary.daily_used < summary.daily_cap) {
      setCapToast('')
      return
    }
    if (typeof window === 'undefined') return
    const stamp = new Date().toISOString().slice(0, 10)
    const key = `credit_cap_toast_dismissed:${stamp}`
    if (window.localStorage.getItem(key)) return
    setCapToast(`Daily credit cap reached (${summary.daily_used}/${summary.daily_cap} points).`)
  }, [summary?.daily_used, summary?.daily_cap])


  useEffect(() => {
    if (!summary) return
    const prev = prevSummaryRef.current
    if (prev?.scores) {
      const deltas = [
        { key: 'IAB', delta: summary.scores.iab - prev.scores.iab },
        { key: 'Emotional Reserve', delta: summary.scores.emotional - prev.scores.emotional },
        { key: 'CTB', delta: summary.scores.ctb - prev.scores.ctb },
      ].filter((item) => item.delta > 0)
      if (deltas.length) {
        const text = deltas.map((d) => `+${d.delta} ${d.key}`).join(' · ')
        setToast(`Credit points added: ${text}`)
      }
    }
    prevSummaryRef.current = summary
  }, [summary])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (document.getElementById('credit-pin-anim')) return
    const style = document.createElement('style')
    style.id = 'credit-pin-anim'
    style.innerHTML = `
      .credit-page .mb-navbar-spacer {
        height: var(--credit-nav-clearance, 180px) !important;
      }
      @keyframes pinBob {
        0% { transform: translateY(0) rotate(0deg); filter: drop-shadow(0 0 0 rgba(182,121,103,0)); }
        50% { transform: translateY(-2px) rotate(-8deg); filter: drop-shadow(0 0 6px rgba(182,121,103,0.6)); }
        100% { transform: translateY(0) rotate(0deg); filter: drop-shadow(0 0 0 rgba(182,121,103,0)); }
      }
      @keyframes creditGlow {
        0% { filter: drop-shadow(0 0 8px rgba(182, 121, 103, 0.35)) drop-shadow(0 0 14px rgba(214, 165, 143, 0.35)); }
        50% { filter: drop-shadow(0 0 18px rgba(214, 165, 143, 0.85)) drop-shadow(0 0 28px rgba(226, 185, 163, 0.7)); }
        100% { filter: drop-shadow(0 0 8px rgba(182, 121, 103, 0.35)) drop-shadow(0 0 14px rgba(214, 165, 143, 0.35)); }
      }
      @keyframes creditSweep {
        0% { transform: translateX(-140%); opacity: 0; }
        20% { opacity: 0.9; }
        100% { transform: translateX(140%); opacity: 0; }
      }
      @keyframes creditShimmer {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .credit-gauge-glow {
        animation: creditGlow 3s ease-in-out infinite;
      }
      .credit-gauge-sweep {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          120deg,
          rgba(255,255,255,0.0),
          rgba(255, 244, 213, 0.9),
          rgba(255,255,255,0.0)
        );
        animation: creditSweep 4.8s ease-in-out infinite;
        pointer-events: none;
      }
      .credit-gauge-glitter {
        position: absolute;
        inset: 0;
        background-image:
          radial-gradient(circle, rgba(255, 248, 230, 0.8) 0 1px, transparent 2px),
          radial-gradient(circle, rgba(255, 237, 200, 0.7) 0 1px, transparent 2px);
        background-size: 28px 28px, 42px 42px;
        background-position: 0 0, 12px 18px;
        opacity: 0.6;
        animation: creditGlitter 4.6s ease-in-out infinite;
        pointer-events: none;
        mix-blend-mode: screen;
      }
      @keyframes creditGlitter {
        0% { opacity: 0.35; transform: translateX(-8px); }
        50% { opacity: 0.8; transform: translateX(8px); }
        100% { opacity: 0.35; transform: translateX(-8px); }
      }
      .credit-shimmer-pill {
        background: linear-gradient(120deg, #b67967, #e2b9a3, #b67967);
        background-size: 200% 200%;
        color: #fff;
        text-shadow: 0 0 10px rgba(255,255,255,0.6);
        animation: creditGlow 2.8s ease-in-out infinite, creditShimmer 3.6s ease-in-out infinite;
      }
      .credit-mobile-carousel {
        display: none;
      }
      /* Galaxy Z Fold 5 (344x882) */
      @media (width: 344px) and (height: 882px) {
        .credit-hero {
          margin-top: 12px !important;
        }
        .credit-shimmer-pill {
          justify-content: center !important;
          text-align: center;
        }
      }
      /* Target Galaxy S8+ and Galaxy Z Fold 5 (phone viewport widths) only */
      /* Phone carousel: center-align like iPhone 12 Pro across phone sizes */
      @media (max-width: 740px) {
        .credit-desktop-grid {
          display: none !important;
        }
        .credit-mobile-carousel {
          display: block;
          margin: 0 auto;
          padding: 8px 24px 24px;
          position: relative;
          max-width: 1100px;
        }
        .credit-carousel-track {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(260px, 84vw);
          gap: 16px;
          padding: 4px calc((100vw - 84vw) / 2) 10px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scroll-padding: calc((100vw - 84vw) / 2);
          -webkit-overflow-scrolling: touch;
        }
        .credit-carousel-item {
          scroll-snap-align: start;
        }
        .credit-composite-row {
          grid-template-columns: 1fr !important;
        }
        .credit-composite-row > div:first-child,
        .credit-composite-row > div:last-child {
          display: none !important;
        }
        .credit-carousel-controls {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .credit-carousel-arrow {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 1px solid rgba(140, 92, 78, 0.45);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 6px 14px rgba(18, 12, 10, 0.1);
          font-weight: 700;
          color: #3b2b24;
          font-size: 18px;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: auto;
          z-index: 3;
        }
        .credit-carousel-arrow.left { left: 10px; }
        .credit-carousel-arrow.right { right: 10px; }
        .credit-mobile-focus {
          display: grid !important;
          grid-template-columns: 1fr !important;
        }
      }
    `
    document.head.appendChild(style)
  }, [])

  useEffect(() => {
    const target = itemRefs.current[mobileIndex]
    if (target) {
      isProgrammaticScroll.current = true
      requestAnimationFrame(() => {
        const track = carouselRef.current
        if (track) {
          const padding = Math.max(0, (track.clientWidth - target.clientWidth) / 2)
          const left = Math.max(0, target.offsetLeft - padding)
          track.scrollTo({ left, behavior: 'smooth' })
        } else {
          target.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
        }
        window.setTimeout(() => {
          isProgrammaticScroll.current = false
        }, 350)
      })
    }
  }, [mobileIndex])


  async function refreshCredit() {
    const [summaryRes, actionsRes, todosRes] = await Promise.all([
      api.get(`/credit/summary?days=${rangeDays}`),
      api.get('/credit/actions'),
      api.get('/credit/todos'),
    ])
    setSummary(summaryRes.data)
    setActions(actionsRes.data || [])
    setTodos(todosRes.data || [])
  }

  async function loadActionsWithExclusions() {
    const pinnedIds = new Set(todos.map((t) => t.action_id))
    const excluded = new Set<number>([...dismissedIds, ...pinnedIds])
    let pool: typeof actions = []
    let attempts = 0
    while (pool.length < 6 && attempts < 3) {
      const res = await api.get('/credit/actions')
      const next = (res.data || []).filter((a: any) => !excluded.has(a.id))
      pool = [...pool, ...next].slice(0, 6)
      attempts += 1
    }
    setActions(pool)
  }

  async function pinAction(actionId: number) {
    try {
      await api.post('/credit/todos', { action_id: actionId })
      await refreshCredit()
      await loadActionsWithExclusions()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (err?.response?.status === 403 && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('paywall:open', { detail: { reason: detail } }))
        return
      }
      setToast(err?.response?.data?.detail ?? 'Unable to pin action.')
    }
  }

  async function removeTodo(todoId: number) {
    try {
      await api.delete(`/credit/todos/${todoId}`)
      await refreshCredit()
      await loadActionsWithExclusions()
    } catch (err: any) {
      setToast(err?.response?.data?.detail ?? 'Unable to remove action.')
    }
  }

  async function dismissAction(actionId: number) {
    setDismissedIds((prev) => new Set([...prev, actionId]))
    await loadActionsWithExclusions()
  }

  return (
    <main
      style={{ ...pageStyles.page, ['--credit-nav-clearance' as any]: `${navClearance}px` }}
      className="credit-page"
    >
      <Navbar showAccountsDropdown />
      <div
        style={{
          visibility: navReady ? 'visible' : 'hidden',
        }}
      >
        <section style={pageStyles.hero} className="credit-hero">
          <div data-testid="credit-page-eyebrow" style={pageStyles.eyebrow}>ManifestBank Composite Credit Score</div>
          <h1 style={pageStyles.title}>My Credit</h1>
          <p style={pageStyles.body}>
            A calm, consistent view of your personal credit signal across identity, emotional reserve, and cognitive focus.
          </p>
        </section>

        {toast ? (
        <div
          style={{
            position: 'fixed',
            top: 88,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid rgba(140, 92, 78, 0.35)',
            borderRadius: 14,
            padding: '10px 16px',
            boxShadow: '0 14px 30px rgba(34, 20, 14, 0.18)',
            color: '#5a3629',
            maxWidth: 'min(90vw, 520px)',
            textAlign: 'center',
          }}
        >
          {toast}
        </div>
        ) : null}
        {capToast ? (
        <div
          style={{
            position: 'fixed',
            right: 20,
            bottom: 22,
            zIndex: 99999,
            background: 'linear-gradient(135deg, rgba(255, 251, 247, 0.98), rgba(245, 233, 224, 0.96))',
            border: '1px solid rgba(182, 121, 103, 0.42)',
            borderRadius: 16,
            padding: '11px 15px',
            boxShadow:
              '0 16px 34px rgba(34, 20, 14, 0.18), 0 0 22px rgba(182, 121, 103, 0.26), 0 0 38px rgba(226, 185, 163, 0.2)',
            color: '#5a3629',
            maxWidth: 'min(90vw, 360px)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 12,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(182, 121, 103, 0.22), rgba(226, 185, 163, 0.34))',
              boxShadow: '0 0 14px rgba(182, 121, 103, 0.35)',
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            ✦
          </span>
          <span style={{ textShadow: '0 0 10px rgba(255, 244, 213, 0.4)' }}>{capToast}</span>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                const stamp = new Date().toISOString().slice(0, 10)
                window.localStorage.setItem(`credit_cap_toast_dismissed:${stamp}`, '1')
              }
              setCapToast('')
            }}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 14,
              opacity: 0.72,
              color: '#7a4d3d',
            }}
          >
            ×
          </button>
        </div>
        ) : null}
        {error ? (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 10px', color: '#7a2e2e' }}>{error}</div>
        ) : null}

        <section style={pageStyles.compositeRow}>
        <div />
        <div
          style={{ width: '100%', maxWidth: 360, minWidth: 260, justifySelf: 'center' }}
          className="credit-composite-card"
        >
          <Gauge
            value={animated.composite}
            label="Composite Credit Score"
            subtitle="Composite signal across all bureaus"
            accent="rgba(122, 82, 67, 0.95)"
          />
        </div>
        <div style={{ justifySelf: 'end' }}>
          <a
            href="/mycreditreport"
            data-testid="credit-view-report-link"
            className="credit-shimmer-pill"
            style={{
              ...pageStyles.pillButton,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 0 14px rgba(182, 121, 103, 0.45)',
            }}
          >
            View Report
          </a>
        </div>
        </section>

        <section style={pageStyles.grid} className="credit-desktop-grid">
        <Gauge
          testId="credit-desktop-iab-card"
          value={animated.iab}
          label="Identity Assurance Bureau"
          subtitle="Consistency, follow-through, self-alignment"
          accent="rgba(140, 92, 78, 0.95)"
          onClick={() => (window.location.href = '/mycredit/iab')}
        />
        <Gauge
          testId="credit-desktop-emotional-card"
          value={animated.emotional}
          label="The Emotional Reserve"
          subtitle="Recovery, regulation, impulse steadiness"
          accent="rgba(168, 110, 88, 0.92)"
          onClick={() => (window.location.href = '/mycredit/emotional-reserve')}
        />
        <Gauge
          testId="credit-desktop-ctb-card"
          value={animated.ctb}
          label="Cognitive Thought Bureau"
          subtitle="Focus discipline and narrative stability"
          accent="rgba(102, 76, 64, 0.95)"
          onClick={() => (window.location.href = '/mycredit/ctb')}
        />
        </section>
        <section
        className="credit-mobile-carousel"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setMobileIndex((prev) => (prev + 2) % 3)
          if (e.key === 'ArrowRight') setMobileIndex((prev) => (prev + 1) % 3)
        }}
      >
        <div className="credit-carousel-controls">
          <button
            type="button"
            className="credit-carousel-arrow left"
            aria-label="Previous bureau"
            onClick={(e) => {
              e.stopPropagation()
              setMobileIndex((prev) => (prev + 2) % 3)
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="credit-carousel-arrow right"
            aria-label="Next bureau"
            onClick={(e) => {
              e.stopPropagation()
              setMobileIndex((prev) => (prev + 1) % 3)
            }}
          >
            ›
          </button>
        </div>
        <div
          className="credit-carousel-track"
          ref={carouselRef}
          onScroll={() => {
            if (isProgrammaticScroll.current) return
            const track = carouselRef.current
            if (!track) return
            const leftEdge = track.scrollLeft
            let closest = 0
            let closestDist = Number.POSITIVE_INFINITY
            itemRefs.current.forEach((item, idx) => {
              if (!item) return
              const dist = Math.abs(leftEdge - item.offsetLeft)
              if (dist < closestDist) {
                closestDist = dist
                closest = idx
              }
            })
            if (closest !== mobileIndex) setMobileIndex(closest)
          }}
        >
          <div
            className="credit-carousel-item"
            ref={(el) => {
              itemRefs.current[0] = el
            }}
          >
            <Gauge
              testId="credit-mobile-iab-card"
              value={animated.iab}
              label="Identity Assurance Bureau"
              subtitle="Consistency, follow-through, self-alignment"
              accent="rgba(140, 92, 78, 0.95)"
              onClick={() => (window.location.href = '/mycredit/iab')}
            />
          </div>
          <div
            className="credit-carousel-item"
            ref={(el) => {
              itemRefs.current[1] = el
            }}
          >
            <Gauge
              testId="credit-mobile-emotional-card"
              value={animated.emotional}
              label="The Emotional Reserve"
              subtitle="Recovery, regulation, impulse steadiness"
              accent="rgba(168, 110, 88, 0.92)"
              onClick={() => (window.location.href = '/mycredit/emotional-reserve')}
            />
          </div>
          <div
            className="credit-carousel-item"
            ref={(el) => {
              itemRefs.current[2] = el
            }}
          >
            <Gauge
              testId="credit-mobile-ctb-card"
              value={animated.ctb}
              label="Cognitive Thought Bureau"
              subtitle="Focus discipline and narrative stability"
              accent="rgba(102, 76, 64, 0.95)"
              onClick={() => (window.location.href = '/mycredit/ctb')}
            />
          </div>
          </div>
        </section>

        <section style={pageStyles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <div style={pageStyles.panelTitle}>Today’s Focus</div>
            <div style={pageStyles.panelBody}>
              Choose one short action and complete it. Small consistency builds long-range strength.
            </div>
            {summary ? (
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                Daily credit points: {summary.daily_used}/{summary.daily_cap}
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                style={{
                  ...pageStyles.pillButton,
                  background: rangeDays === days ? 'rgba(140, 92, 78, 0.2)' : 'rgba(255,255,255,0.9)',
                }}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
        <div
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px', gap: 18, marginTop: 16 }}
          className="credit-mobile-focus"
        >
          <div>
            {loading ? (
              <div style={{ marginTop: 12, fontSize: 13, opacity: 0.7 }}>Loading actions…</div>
            ) : actions.length ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {actions.map((action) => {
                  const expanded = expandedAction === action.id
                  return (
                    <div
                      data-testid="credit-action-card"
                      key={action.id}
                      style={{
                        borderRadius: 14,
                        border: '1px solid rgba(140, 92, 78, 0.2)',
                        padding: '12px 14px',
                        background: 'rgba(255,255,255,0.7)',
                        display: 'grid',
                        gap: 8,
                        cursor: 'pointer',
                      }}
                      onClick={() => setExpandedAction(expanded ? null : action.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{action.title}</div>
                          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{action.description}</div>
                        </div>
                        <button
                          type="button"
                          style={{ ...pageStyles.pillButton, minWidth: 72, height: 32, textAlign: 'center' }}
                          onClick={(event) => {
                            event.stopPropagation()
                            if (action.action_route) {
                              window.location.href = action.action_route
                            }
                            if (typeof window !== 'undefined') {
                              window.sessionStorage.setItem(
                                'mb_open_task',
                                JSON.stringify({
                                  actionId: action.id,
                                  title: action.title,
                                  bureau: action.primary_bureau,
                                  actionType: action.action_type ?? 'unknown',
                                  openedAt: new Date().toISOString(),
                                })
                              )
                              window.dispatchEvent(new Event('mb_open_task_set'))
                            }
                          }}
                        >
                          Open
                        </button>
                      </div>
                      {expanded ? (
                        <div
                          style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
                          onClick={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                        <button
                          type="button"
                          data-testid="credit-pin-button"
                          style={pageStyles.pinButton}
                          onClick={async (event) => {
                              event.stopPropagation()
                              await pinAction(action.id)
                            }}
                          >
                            <span style={{ display: 'inline-flex', animation: 'pinBob 2.6s ease-in-out infinite' }}>📌</span>
                            Pin
                          </button>
                          <button
                            type="button"
                            style={pageStyles.pillButton}
                            onClick={(event) => {
                              event.stopPropagation()
                              dismissAction(action.id)
                            }}
                          >
                            No thanks
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ marginTop: 12, fontSize: 13, opacity: 0.7 }}>No focus actions right now.</div>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Pinned</div>
            <div style={{ marginTop: 8, display: 'grid', gap: 10, position: 'sticky', top: 24 }}>
              {todos.filter((t) => t.status === 'open').length ? (
                todos
                  .filter((t) => t.status === 'open')
                  .map((todo) => (
                    <div
                      key={todo.id}
                      style={{
                        borderRadius: 12,
                        border: '1px solid rgba(140, 92, 78, 0.2)',
                        background: 'rgba(255,255,255,0.8)',
                        padding: '10px 12px',
                        display: 'grid',
                        gap: 6,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{todo.title}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{todo.description}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {todo.action_route ? (
                          <button
                            type="button"
                            style={{ ...pageStyles.pillButton, minWidth: 72, height: 32, textAlign: 'center' }}
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                window.sessionStorage.setItem(
                                  'mb_open_task',
                                  JSON.stringify({
                                    actionId: todo.action_id,
                                    title: todo.title,
                                    bureau: todo.action_type,
                                    actionType: todo.action_type ?? 'unknown',
                                    openedAt: new Date().toISOString(),
                                  })
                                )
                                window.dispatchEvent(new Event('mb_open_task_set'))
                              }
                              window.location.href = todo.action_route as string
                            }}
                          >
                            Open
                          </button>
                        ) : null}
                        <button
                          type="button"
                          data-testid="credit-remove-button"
                          style={pageStyles.pillButton}
                          onClick={() => removeTodo(todo.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
              ) : (
                <div style={{ fontSize: 12, opacity: 0.6 }}>No pinned actions yet.</div>
              )}
            </div>
          </div>
        </div>
        </section>
      </div>
    </main>
  )
}
