'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import { api } from '@/lib/api'

function toast(message: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('auth:logged_out', { detail: { message } }))
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 10, 8, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 99999,
  padding: 16,
}

const modalStyle: CSSProperties = {
  width: 'min(720px, 92vw)',
  background: 'linear-gradient(160deg, rgba(217, 178, 161, 0.92), rgba(198, 159, 143, 0.94))',
  borderRadius: 20,
  padding: 22,
  boxShadow: '0 22px 55px rgba(56, 36, 25, 0.35)',
  border: '1px solid rgba(95, 74, 62, 0.25)',
}

const fieldLabelStyle: CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  opacity: 0.7,
  marginBottom: 6,
}

const inputStyle: CSSProperties = {
  width: '100%',
  borderRadius: 12,
  border: '1px solid rgba(95, 74, 62, 0.28)',
  padding: '10px 12px',
  fontSize: 14,
  background: 'rgba(255, 255, 255, 0.9)',
}

const buttonStyle: CSSProperties = {
  borderRadius: 999,
  border: '1px solid rgba(95, 74, 62, 0.35)',
  background: 'rgba(255, 255, 255, 0.75)',
  padding: '10px 16px',
  fontWeight: 600,
  cursor: 'pointer',
}

type AffirmationsEntry = {
  id: number
  title: string
  entry_date: string
  content: string
  image_url?: string | null
  created_at: string
  updated_at: string
}

function formatEntryDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value ?? ''
  return date.toLocaleDateString('en-US')
}

const DAILY_AFFIRMATIONS = [
  'Wealth is my standard.',
  'Money respects me.',
  'I earn at higher levels.',
  'Profit follows purpose.',
  'My net worth grows.',
  'I think like an owner.',
  'Capital flows freely.',
  'I steward wealth wisely.',
  'My income upgrades.',
  'I welcome large sums.',
  'Money meets mastery.',
  'I scale with integrity.',
  'I create surplus.',
  'Premium clients find me.',
  'My value is undeniable.',
  'I attract elite rooms.',
  'Revenue loves precision.',
  'I am financially sovereign.',
  'Wealth builds quietly.',
  'I monetize brilliance.',
  'My assets appreciate.',
  'I multiply resources.',
  'Money trusts my leadership.',
  'I expand earning capacity.',
  'I command higher returns.',
  'Abundance backs my moves.',
  'My brand creates wealth.',
  'I receive luxury easily.',
  'Cash flow is constant.',
  'I prosper intentionally.',
  'I execute at scale.',
  'Success fits me well.',
  'I finish what I start.',
  'My focus creates results.',
  'I move with certainty.',
  'I win strategically.',
  'I choose bold action.',
  'Momentum favors me.',
  'I outgrow old limits.',
  'My vision materializes.',
  'I operate in excellence.',
  'Discipline builds destiny.',
  'I think long-term.',
  'I elevate every room.',
  'Results respond to me.',
  'I am solution-oriented.',
  'My standards are high.',
  'I lead with clarity.',
  'Growth is inevitable.',
  'I build lasting legacy.',
  'My ideas compound.',
  'I expand my territory.',
  'Success feels normal.',
  'I convert dreams to plans.',
  'I execute like a CEO.',
  'I embody my next level.',
  'I think from abundance.',
  'I act as my future self.',
  'My habits reflect wealth.',
  'I choose powerful thoughts.',
  'I am internally upgraded.',
  'I release outdated identities.',
  'I operate from certainty.',
  'I trust my evolution.',
  'I outgrow small thinking.',
  'I am emotionally regulated.',
  'I respond, not react.',
  'My energy is premium.',
  'I move with composure.',
  'I am the standard.',
  'I invest in growth.',
  'I embody discipline.',
  'I am consistent daily.',
  'I rewrite my story.',
  'I choose expansion.',
  'I upgrade my self-concept.',
  'I align thoughts and action.',
  'I am architect of reality.',
  'I normalize greatness.',
  'I own my narrative.',
  'My cells are energized.',
  'I nourish my body.',
  'My mind is clear.',
  'I prioritize restoration.',
  'Strength grows within me.',
  'I move with vitality.',
  'My body heals efficiently.',
  'I choose clean energy.',
  'I protect my peace.',
  'I rest without guilt.',
  'I fuel my brilliance.',
  'My nervous system is calm.',
  'I radiate wellness.',
  'My breath centers me.',
  'I honor my rhythms.',
  'I am physically resilient.',
  'My focus is sharp.',
  'I glow with health.',
  'I sustain high performance.',
  'My body supports my mission.',
  'I build strength daily.',
  'Wellness is my baseline.',
  'I age powerfully.',
  'I feel strong and aligned.',
]

const SAVED_AFFIRMATION_TITLE = 'Saved affirmation'

export default function MyAffirmationsPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<AffirmationsEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newEntryOpen, setNewEntryOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [draftTitle, setDraftTitle] = useState('')
  const [draftDate, setDraftDate] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [draftImageUrl, setDraftImageUrl] = useState('')
  const [draftImageFile, setDraftImageFile] = useState<File | null>(null)
  const [draftImageName, setDraftImageName] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [etherNoticeCount, setEtherNoticeCount] = useState(0)
  const [etherNoticeLoaded, setEtherNoticeLoaded] = useState(false)
  const [dailyAffirmation, setDailyAffirmation] = useState(DAILY_AFFIRMATIONS[0])
  const [savingDaily, setSavingDaily] = useState(false)
  const [savePulse, setSavePulse] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const affirmationNavRef = useRef<HTMLDivElement | null>(null)
  const [etherPortalVisible, setEtherPortalVisible] = useState(false)
  const [treasureChipOpen, setTreasureChipOpen] = useState(false)
  const treasureChipRef = useRef<HTMLDivElement | null>(null)
  const treasureChipMenuRef = useRef<HTMLDivElement | null>(null)

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
    loadEntries()
    loadMe()
  }, [])

  useEffect(() => {
    function pickDaily(now: Date) {
      const shifted = new Date(now.getTime() - 3 * 60 * 60 * 1000)
      const key = shifted.toISOString().slice(0, 10)
      let hash = 0
      for (let i = 0; i < key.length; i += 1) {
        hash = (hash * 31 + key.charCodeAt(i)) % 100000
      }
      const index = hash % DAILY_AFFIRMATIONS.length
      return DAILY_AFFIRMATIONS[index]
    }

    const now = new Date()
    setDailyAffirmation(pickDaily(now))

    const next = new Date(now)
    next.setHours(3, 0, 0, 0)
    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }
    const timeoutId = window.setTimeout(() => {
      setDailyAffirmation(pickDaily(new Date()))
    }, next.getTime() - now.getTime())

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [])

  async function loadMe() {
    try {
      const res = await api.get('/auth/me')
      const verified = Boolean(res.data?.email_verified)
      setIsVerified(verified)
      if (verified) {
        loadProfile().catch(() => {})
        loadEtherNoticeCount().catch(() => {})
      } else {
        setProfile(null)
      }
    } catch {
      setIsVerified(false)
    }
  }

  async function loadProfile() {
    try {
      const res = await api.get('/ether/me-profile')
      setProfile(res.data)
    } catch {
      setProfile(null)
    }
  }

  async function loadEtherNoticeCount() {
    if (etherNoticeLoaded) return
    try {
      const [notesRes, syncRes] = await Promise.allSettled([
        api.get('/ether/notifications'),
        api.get('/ether/sync/requests'),
      ])
      const list = notesRes.status === 'fulfilled' ? notesRes.value.data : []
      const syncs = syncRes.status === 'fulfilled' ? syncRes.value.data : []
      const unread = Array.isArray(list) ? list.filter((item: any) => !item?.read_at).length : 0
      let profileId = profile?.id ?? null
      if (!profileId) {
        try {
          const profileRes = await api.get('/ether/me-profile')
          profileId = profileRes.data?.id ?? null
        } catch {
          profileId = null
        }
      }
      const myLineUnread = await countUnreadThreads(profileId)
      setEtherNoticeCount(unread + (Array.isArray(syncs) ? syncs.length : 0) + myLineUnread)
    } catch {
      setEtherNoticeCount(0)
    } finally {
      setEtherNoticeLoaded(true)
    }
  }

  function loadEntries() {
    setLoading(true)
    setError('')
    api
      .get('/affirmations')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : []
        setEntries(list)
      })
      .catch((err) => {
        setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to load affirmation entries')
      })
      .finally(() => setLoading(false))
  }

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  }, [entries])

  const savedAffirmations = useMemo(
    () => sortedEntries.filter((entry) => entry.title === SAVED_AFFIRMATION_TITLE),
    [sortedEntries]
  )

  const affirmationsEntries = useMemo(
    () => sortedEntries.filter((entry) => entry.title !== SAVED_AFFIRMATION_TITLE),
    [sortedEntries]
  )
  const confirmDeleteEntry = useMemo(
    () => affirmationsEntries.find((entry) => entry.id === confirmDeleteId) ?? null,
    [affirmationsEntries, confirmDeleteId]
  )

  const isDailySaved = useMemo(() => {
    const needle = dailyAffirmation.trim()
    return savedAffirmations.some((entry) => entry.content.trim() === needle)
  }, [savedAffirmations, dailyAffirmation])

  function resetDraft() {
    setDraftTitle('')
    setDraftDate('')
    setDraftContent('')
    setDraftImageUrl('')
    setDraftImageFile(null)
    setDraftImageName(null)
  }

  function openNewEntry() {
    resetDraft()
    setNewEntryOpen(true)
  }

  function closeModal() {
    setNewEntryOpen(false)
    resetDraft()
  }

  async function uploadImageIfNeeded(): Promise<string | null> {
    if (!draftImageFile) return draftImageUrl || null
    const body = new FormData()
    body.append('file', draftImageFile)
    const res = await api.post('/affirmations/upload-image', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data?.url ?? null
  }

  async function saveEntry() {
    if (!draftTitle.trim() || !draftDate.trim() || !draftContent.trim()) {
      setError('Please fill in title, date, and entry text.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const imageUrl = await uploadImageIfNeeded()
      await api.post('/affirmations', {
        title: draftTitle.trim(),
        entry_date: draftDate,
        content: draftContent.trim(),
        image_url: imageUrl,
      })
      await refreshAfterSave()
      closeModal()
      toast('Affirmation saved.')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to save entry.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry(entryId: number) {
    try {
      await api.delete(`/affirmations/${entryId}`)
      await refreshAfterSave()
      toast('Affirmation deleted.')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to delete entry.')
    }
  }

  async function saveDailyAffirmation() {
    if (!dailyAffirmation || savingDaily) return
    if (isDailySaved) {
      toast('Affirmation already saved.')
      return
    }
    setSavingDaily(true)
    setError('')
    try {
      const today = new Date()
      const entryDate = today.toISOString().slice(0, 10)
      await api.post('/affirmations', {
        title: SAVED_AFFIRMATION_TITLE,
        entry_date: entryDate,
        content: dailyAffirmation,
        image_url: null,
      })
      await refreshAfterSave()
      toast('Affirmation saved.')
      setSavePulse(true)
      window.setTimeout(() => setSavePulse(false), 480)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to save affirmation.')
    } finally {
      setSavingDaily(false)
    }
  }

  async function refreshAfterSave() {
    const res = await api.get('/affirmations')
    const list = Array.isArray(res.data) ? res.data : []
    setEntries(list)
  }

  useEffect(() => {
    const target = affirmationNavRef.current
    if (!target) return
    const updateVisibility = () => {
      if (!affirmationNavRef.current) return
      const rect = affirmationNavRef.current.getBoundingClientRect()
      setEtherPortalVisible(rect.bottom <= 0)
    }
    updateVisibility()
    if (typeof IntersectionObserver === 'undefined') {
      window.addEventListener('scroll', updateVisibility)
      window.addEventListener('resize', updateVisibility)
      return () => {
        window.removeEventListener('scroll', updateVisibility)
        window.removeEventListener('resize', updateVisibility)
      }
    }
    const observer = new IntersectionObserver(() => updateVisibility(), { threshold: 0 })
    observer.observe(target)
    window.addEventListener('scroll', updateVisibility)
    window.addEventListener('resize', updateVisibility)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', updateVisibility)
      window.removeEventListener('resize', updateVisibility)
    }
  }, [])

  useEffect(() => {
    if (!treasureChipOpen) return
    function handleClick(event: MouseEvent) {
      const target = event.target as Node
      if (
        treasureChipRef.current &&
        !treasureChipRef.current.contains(target) &&
        (!treasureChipMenuRef.current || !treasureChipMenuRef.current.contains(target))
      ) {
        setTreasureChipOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setTreasureChipOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [treasureChipOpen])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--page-bg)' }}>
      <div ref={affirmationNavRef}>
        <Navbar showAccountsDropdown />
      </div>
      {isVerified && etherPortalVisible ? (
        <div
          className="ether-portal-chip"
          style={{
            zIndex: 1400,
            display: 'grid',
            gap: 8,
          }}
        >
          <Link href="/ether" style={{ textDecoration: 'none' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid rgba(140, 92, 78, 0.7)',
                background: 'linear-gradient(135deg, rgba(140, 92, 78, 0.35), rgba(245, 234, 226, 0.95))',
                boxShadow: '0 0 16px rgba(140, 92, 78, 0.45)',
                color: '#4a2f26',
                fontWeight: 700,
                letterSpacing: 0.2,
                maxWidth: 'calc(100vw - 24px)',
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  border: '1px solid rgba(95, 74, 62, 0.35)',
                  background: 'rgba(255,255,255,0.95)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: 12 }}>
                    {profile?.display_name?.slice(0, 1)?.toUpperCase() ?? '◎'}
                  </span>
                )}
              </span>
              Enter The Ether™
              {etherNoticeCount > 0 ? (
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
                    boxShadow: '0 0 10px rgba(182, 121, 103, 0.65)',
                    marginLeft: 2,
                  }}
                >
                  {etherNoticeCount}
                </span>
              ) : null}
            </span>
          </Link>
          <div ref={treasureChipRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setTreasureChipOpen((open) => !open)}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid rgba(140, 92, 78, 0.7)',
                background: 'linear-gradient(135deg, rgba(140, 92, 78, 0.35), rgba(245, 234, 226, 0.95))',
                cursor: 'pointer',
                fontWeight: 700,
                color: '#4a2f26',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 0 16px rgba(140, 92, 78, 0.45)',
                maxWidth: 'calc(100vw - 24px)',
              }}
              aria-haspopup="menu"
              aria-expanded={treasureChipOpen}
            >
              My Treasure Chest
              <span style={{ fontSize: 12, opacity: 0.7 }}>▾</span>
            </button>
            {treasureChipOpen ? (
              <div
                ref={treasureChipMenuRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 10,
                  minWidth: 200,
                  maxWidth: 'calc(100vw - 24px)',
                  borderRadius: 12,
                  border: '1px solid rgba(140, 92, 78, 0.45)',
                  background: 'rgba(252, 245, 240, 0.98)',
                  boxShadow: '0 20px 44px rgba(12, 10, 12, 0.32)',
                  padding: 10,
                  display: 'grid',
                  gap: 8,
                  zIndex: 99999,
                }}
                role="menu"
              >
                <Link
                  href="/myjournal"
                  style={{ textDecoration: 'none', fontWeight: 600, color: '#4a2f26' }}
                  role="menuitem"
                  onClick={() => setTreasureChipOpen(false)}
                >
                  My Journal
                </Link>
                <Link
                  href="/myaffirmations"
                  style={{ textDecoration: 'none', fontWeight: 600, color: '#4a2f26' }}
                  role="menuitem"
                  onClick={() => setTreasureChipOpen(false)}
                >
                  Affirmations
                </Link>
                <Link
                  href="/mystatments"
                  style={{ textDecoration: 'none', fontWeight: 600, color: '#4a2f26' }}
                  role="menuitem"
                  onClick={() => setTreasureChipOpen(false)}
                >
                  My Statements
                </Link>
                <Link
                  href="/mychecks"
                  style={{ textDecoration: 'none', fontWeight: 600, color: '#4a2f26' }}
                  role="menuitem"
                  onClick={() => setTreasureChipOpen(false)}
                >
                  My Checks
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ display: 'grid', justifyItems: 'center', gap: 10, marginBottom: 18 }}>
          <div
            style={{
              fontFamily: '"Playfair Display", "Cormorant Garamond", "Libre Baskerville", serif',
              fontSize: 26,
              fontWeight: 700,
              color: 'rgba(122, 86, 72, 0.9)',
              textAlign: 'center',
              maxWidth: 520,
              lineHeight: 1.4,
              padding: '10px 16px',
              borderRadius: 14,
              background:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.7), rgba(255,255,255,0) 55%), radial-gradient(circle at 80% 30%, rgba(255,233,210,0.75), rgba(255,233,210,0) 60%), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.6), rgba(255,255,255,0) 55%)',
              textShadow: '0 0 6px rgba(255, 236, 215, 0.7), 0 0 10px rgba(255, 236, 215, 0.5)',
            }}
          >
            {dailyAffirmation.split(' ').map((word, index) => (
              <div key={`${word}-${index}`}>{word}</div>
            ))}
          </div>
          <div className={savePulse ? 'align-heart-pulse' : undefined}>
            <button
              type="button"
              onClick={saveDailyAffirmation}
              disabled={savingDaily}
              style={{
                borderRadius: 999,
                border: '1px solid rgba(130, 92, 78, 0.6)',
                background: 'linear-gradient(135deg, rgba(210, 165, 145, 0.85), rgba(182, 121, 103, 0.95))',
                padding: '8px 14px',
                fontWeight: 700,
                color: '#fffaf7',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 8px 18px rgba(34, 20, 14, 0.25)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 18,
                  height: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isDailySaved ? '#fffaf7' : 'rgba(255, 255, 255, 0.9)',
                  transition: 'transform 160ms ease',
                }}
              >
                {isDailySaved ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M4 9.5c0-1.38 1.12-2.5 2.5-2.5h11c1.38 0 2.5 1.12 2.5 2.5v7c0 2.49-2.01 4.5-4.5 4.5h-7A4.5 4.5 0 0 1 4 16.5v-7Zm2.5-4.5h11A4.5 4.5 0 0 1 22 9.5V10H2v-.5A4.5 4.5 0 0 1 6.5 5Zm3.5 7h4a1 1 0 0 0 0-2h-4a1 1 0 0 0 0 2Z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M4 9.5c0-1.38 1.12-2.5 2.5-2.5h11c1.38 0 2.5 1.12 2.5 2.5v7c0 2.49-2.01 4.5-4.5 4.5h-7A4.5 4.5 0 0 1 4 16.5v-7Z" />
                    <path d="M2 10V9.5A4.5 4.5 0 0 1 6.5 5h11A4.5 4.5 0 0 1 22 9.5V10" />
                    <path d="M10 11h4" />
                  </svg>
                )}
              </span>
              {savingDaily ? 'Saving…' : isDailySaved ? 'Saved' : 'Save affirmation'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                ...buttonStyle,
                background: 'transparent',
              }}
            >
              ← Back
            </button>
            <h1 style={{ marginTop: 16, fontFamily: 'var(--font-serif)', fontSize: 30 }}>My Affirmations</h1>
            <p style={{ marginTop: 6, opacity: 0.75 }}>Capture and save the affirmations that shape your day.</p>
          </div>
          <div style={{ display: 'grid', gap: 12, minWidth: 240 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" onClick={openNewEntry} style={buttonStyle}>
                New Entry
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (savedAffirmations.length > 0) {
                  router.push('/myaffirmations/saved')
                }
              }}
              style={{
                borderRadius: 16,
                border: '1px solid rgba(95, 74, 62, 0.2)',
                background:
                  'linear-gradient(140deg, rgba(199, 140, 122, 0.35), rgba(255, 244, 236, 0.92))',
                padding: 12,
                boxShadow: '0 12px 24px rgba(0,0,0,0.05)',
                textAlign: 'left',
                cursor: savedAffirmations.length > 0 ? 'pointer' : 'default',
                width: '100%',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Saved affirmations</div>
              {loading ? (
                <div style={{ fontSize: 12, opacity: 0.7 }}>Loading…</div>
              ) : savedAffirmations.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.7 }}>No saved affirmations yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {savedAffirmations.slice(0, 1).map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        textAlign: 'left',
                        borderRadius: 12,
                        padding: 10,
                        border: '1px solid rgba(95, 74, 62, 0.2)',
                        background: 'rgba(255, 255, 255, 0.85)',
                      }}
                    >
                      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                        {formatEntryDate(entry.entry_date)}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#3b2b24' }}>
                        {entry.content.length > 60 ? `${entry.content.slice(0, 60)}…` : entry.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </button>
          </div>
        </div>

        {error ? (
          <div
            style={{
              marginTop: 18,
              color: '#7a2e2e',
              background: 'rgba(255, 244, 236, 0.85)',
              border: '1px solid rgba(140, 92, 78, 0.3)',
              padding: '10px 12px',
              borderRadius: 12,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {loading ? (
            <div style={{ opacity: 0.7 }}>Loading entries…</div>
          ) : affirmationsEntries.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No affirmation entries yet.</div>
          ) : (
            affirmationsEntries.map((entry) => (
              <div
                key={entry.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/myaffirmations/${entry.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    router.push(`/myaffirmations/${entry.id}`)
                  }
                }}
                style={{
                  textAlign: 'left',
                  borderRadius: 16,
                  padding: 16,
                  border: '1px solid rgba(95, 74, 62, 0.2)',
                  background: 'rgba(255, 255, 255, 0.75)',
                  cursor: 'pointer',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.05)',
                  position: 'relative',
                  outline: 'none',
                }}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setConfirmDeleteId(entry.id)
                  }}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    borderRadius: 999,
                    border: '1px solid rgba(140, 92, 78, 0.4)',
                    background: 'rgba(255, 255, 255, 0.85)',
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{entry.title}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{entry.entry_date}</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  {entry.content.length > 120 ? `${entry.content.slice(0, 120)}…` : entry.content}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {newEntryOpen && (
        <div style={overlayStyle} onClick={closeModal}>
          <div
            style={modalStyle}
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 18 }}>New Affirmations Entry</div>
              <button type="button" onClick={closeModal} style={{ ...buttonStyle, padding: '6px 12px' }}>
                Close
              </button>
            </div>
            {error ? (
              <div
                style={{
                  marginTop: 12,
                  color: '#7a2e2e',
                  background: 'rgba(255, 244, 236, 0.9)',
                  border: '1px solid rgba(140, 92, 78, 0.3)',
                  padding: '10px 12px',
                  borderRadius: 12,
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            ) : null}

            <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
              <div>
                <div style={fieldLabelStyle}>Entry Title</div>
                <input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  style={inputStyle}
                  placeholder="Name this entry"
                />
              </div>
              <div>
                <div style={fieldLabelStyle}>Entry Date</div>
                <input
                  type="date"
                  value={draftDate}
                  onChange={(event) => setDraftDate(event.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={fieldLabelStyle}>Your Entry</div>
                <textarea
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                  style={{ ...inputStyle, minHeight: 160, resize: 'vertical' }}
                  placeholder="Write your entry here..."
                />
              </div>
              <div>
                <div style={fieldLabelStyle}>Photo</div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...buttonStyle }}>
                  Choose File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      setDraftImageFile(file)
                      setDraftImageName(file?.name ?? null)
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
                {draftImageName ? (
                  <span
                    style={{
                      marginLeft: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#6b3f2b',
                      textShadow: '0 0 10px rgba(222, 176, 155, 0.7)',
                    }}
                  >
                    {draftImageName}
                  </span>
                ) : null}
                {draftImageUrl ? (
                  <div style={{ marginTop: 10 }}>
                    <img
                      src={draftImageUrl}
                      alt="Affirmations"
                      style={{ width: '100%', borderRadius: 12, objectFit: 'cover' }}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={saveEntry}
                style={{
                  ...buttonStyle,
                  background: 'rgba(146, 102, 84, 0.9)',
                  color: '#fff',
                  border: 'none',
                }}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId !== null ? (
        <div
          style={overlayStyle}
          onClick={() => {
            setConfirmDeleteId(null)
          }}
        >
          <div
            style={{
              ...modalStyle,
              maxWidth: 480,
              background: 'linear-gradient(160deg, rgba(217, 178, 161, 0.95), rgba(186, 140, 122, 0.97))',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ fontWeight: 700, fontSize: 18, color: '#3b2a22' }}>Delete affirmation?</div>
            <div style={{ marginTop: 8, opacity: 0.85, color: '#3b2a22' }}>
              This will permanently remove the affirmation.
            </div>
            {confirmDeleteEntry ? (
              <div
                style={{
                  marginTop: 10,
                  fontWeight: 600,
                  color: '#4a2f26',
                  background: 'rgba(255, 255, 255, 0.65)',
                  border: '1px solid rgba(140, 92, 78, 0.35)',
                  borderRadius: 12,
                  padding: '8px 10px',
                }}
              >
                {confirmDeleteEntry.title}
              </div>
            ) : null}
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  ...buttonStyle,
                  background: 'rgba(255,255,255,0.8)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetId = confirmDeleteId
                  setConfirmDeleteId(null)
                  if (targetId !== null) {
                    await deleteEntry(targetId)
                  }
                }}
                style={{
                  ...buttonStyle,
                  border: '1px solid rgba(140, 92, 78, 0.6)',
                  background: 'linear-gradient(135deg, rgba(182, 121, 103, 0.95), rgba(146, 94, 78, 0.95))',
                  color: '#fffaf7',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
