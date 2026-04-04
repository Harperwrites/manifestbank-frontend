'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import { api } from '@/lib/api'
import { formatLocalDate, parseServerDate } from '@/lib/time'

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

type JournalEntry = {
  id: number
  title: string
  entry_date: string
  content: string
  image_url?: string | null
  created_at: string
  updated_at: string
}

function formatEntryDate(value?: string | null) {
  return formatLocalDate(value)
}

export default function MyJournalPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<JournalEntry[]>([])
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
  const journalNavRef = useRef<HTMLDivElement | null>(null)
  const [etherPortalVisible, setEtherPortalVisible] = useState(false)
  const [promptIndex, setPromptIndex] = useState(0)
  const [promptList, setPromptList] = useState<{ text: string; category: string }[]>([])
  const [activePrompt, setActivePrompt] = useState<string | null>(null)
  const [promptCategory, setPromptCategory] = useState<'All' | 'Identity' | 'Nervous System' | 'Emotional' | 'Wealth Practice'>('All')
  const [usedPrompts, setUsedPrompts] = useState<{ text: string; category: string; used_at: string }[]>([])
  const [toast, setToast] = useState<{ title: string; body?: string } | null>(null)

  function getThreadReadAt(threadId: number) {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(`ether:thread_read:${threadId}`)
  }

  async function countUnreadThreads(profileId: number | null) {
    if (!profileId) return 0
    try {
      const previewsRes = await api.get('/ether/threads/previews')
      const previews = Array.isArray(previewsRes.data) ? previewsRes.data : []
      if (!previews.length) return 0
      return previews.reduce((sum: number, preview: any) => {
        const lastAt = preview.last_message_at
        const senderId = preview.last_sender_profile_id
        if (!lastAt) return sum
        const readAt = getThreadReadAt(preview.id)
        const isUnread =
          senderId !== profileId &&
          (!readAt ||
            (parseServerDate(lastAt)?.getTime() ?? 0) > (parseServerDate(readAt)?.getTime() ?? 0))
        return sum + (isUnread ? 1 : 0)
      }, 0)
    } catch {
      return 0
    }
  }

  useEffect(() => {
    loadEntries()
    loadMe()
    const prompts = [
      { text: 'Who am I becoming as my relationship with abundance stabilizes?', category: 'Identity' },
      { text: 'What version of me already knows how to hold large amounts of wealth calmly?', category: 'Identity' },
      { text: 'If my identity were an account, what traits are compounding daily?', category: 'Identity' },
      { text: 'What old identity feels too small for the life unfolding now?', category: 'Identity' },
      { text: 'How does my posture, voice, and pace change when I feel financially secure?', category: 'Nervous System' },
      { text: 'What do I no longer need to prove now that I trust myself?', category: 'Identity' },
      { text: 'If abundance were my default setting, what decisions would feel obvious?', category: 'Wealth Practice' },
      { text: 'What does “I am safe with more” mean in my body?', category: 'Nervous System' },
      { text: 'How would my future self describe me today?', category: 'Identity' },
      { text: 'Where in my body do I feel the most grounded right now?', category: 'Nervous System' },
      { text: 'How do I respond when I imagine money arriving easily?', category: 'Emotional' },
      { text: 'What sensations tell me I’m relaxed around receiving?', category: 'Nervous System' },
      { text: 'If wealth had a temperature, how warm would it feel today?', category: 'Emotional' },
      { text: 'What helps my body trust consistency?', category: 'Nervous System' },
      { text: 'Where am I holding tension about outcomes?', category: 'Emotional' },
      { text: 'What would it feel like to not rush abundance?', category: 'Nervous System' },
      { text: 'How does my nervous system respond to stability?', category: 'Nervous System' },
      { text: 'What part of me needs reassurance before expansion?', category: 'Emotional' },
      { text: 'What forms of wealth already circulate in my life?', category: 'Wealth Practice' },
      { text: 'How does money like to move through me?', category: 'Wealth Practice' },
      { text: 'What abundance am I now able to sustain?', category: 'Wealth Practice' },
      { text: 'Where have I underestimated my capacity to receive?', category: 'Identity' },
      { text: 'What does overflow look like without urgency?', category: 'Wealth Practice' },
      { text: 'What patterns show me I am supported?', category: 'Emotional' },
      { text: 'How does gratitude sharpen my perception of wealth?', category: 'Wealth Practice' },
      { text: 'What feels luxurious without spending?', category: 'Wealth Practice' },
      { text: 'If money were neutral energy, how would I interact with it?', category: 'Wealth Practice' },
      { text: 'What does ease teach me about prosperity?', category: 'Wealth Practice' },
      { text: 'What does my ideal financial day feel like from morning to night?', category: 'Wealth Practice' },
      { text: 'How does my environment reflect inner abundance?', category: 'Wealth Practice' },
      { text: 'If I replayed a future memory of success, what detail stands out?', category: 'Identity' },
      { text: 'What color does fulfillment carry today?', category: 'Emotional' },
      { text: 'How does my body move when my needs are met?', category: 'Nervous System' },
      { text: 'What conversations feel normal in my abundant reality?', category: 'Identity' },
      { text: 'How do I celebrate progress internally?', category: 'Emotional' },
      { text: 'What do my hands feel like when holding opportunity?', category: 'Nervous System' },
      { text: 'What feelings arise when I slow down my goals?', category: 'Emotional' },
      { text: 'How do I respond to small wins emotionally?', category: 'Emotional' },
      { text: 'What emotion is asking to be acknowledged before expansion?', category: 'Emotional' },
      { text: 'How do I metabolize disappointment now versus before?', category: 'Emotional' },
      { text: 'What emotional state makes wealth feel inevitable?', category: 'Emotional' },
      { text: 'How do I come back to center after excitement?', category: 'Nervous System' },
      { text: 'What inner harmony feels like readiness?', category: 'Nervous System' },
      { text: 'What emotion tells me I’m in flow?', category: 'Emotional' },
      { text: 'What deposit did I make into my future today?', category: 'Wealth Practice' },
      { text: 'What belief earned interest this week?', category: 'Identity' },
      { text: 'Where did I authorize abundance without resistance?', category: 'Wealth Practice' },
      { text: 'What internal expense no longer serves me?', category: 'Emotional' },
      { text: 'What account in me is growing fastest?', category: 'Identity' },
      { text: 'What would a healthy balance feel like emotionally?', category: 'Emotional' },
      { text: 'What aligns me more than effort?', category: 'Identity' },
      { text: 'How did I practice trust today?', category: 'Identity' },
      { text: 'What does consistency look like in my inner economy?', category: 'Wealth Practice' },
      { text: 'What internal asset appreciated today without effort?', category: 'Wealth Practice' },
      { text: 'Where did I stop overdrafting my energy?', category: 'Emotional' },
      { text: 'What belief finally cleared and settled?', category: 'Identity' },
      { text: 'What pattern quietly matured this week?', category: 'Identity' },
      { text: 'Where did I choose sustainability over urgency?', category: 'Identity' },
      { text: 'What internal transfer increased my sense of safety?', category: 'Nervous System' },
      { text: 'What felt solvent in my emotions today?', category: 'Emotional' },
      { text: 'Where did I allow abundance to post without review?', category: 'Wealth Practice' },
      { text: 'What habit is now yielding predictable returns?', category: 'Identity' },
      { text: 'What internal agreement did I renegotiate in my favor?', category: 'Identity' },
      { text: 'What did I stop insuring against that I now trust?', category: 'Identity' },
      { text: 'Where did I allow flow instead of micromanagement?', category: 'Nervous System' },
      { text: 'What inner account is no longer volatile?', category: 'Identity' },
      { text: 'What expectation softened into certainty?', category: 'Identity' },
      { text: 'Where did I hold value without proving it?', category: 'Identity' },
      { text: 'What stabilized once I stopped monitoring it?', category: 'Identity' },
      { text: 'What internal surplus surprised me today?', category: 'Wealth Practice' },
      { text: 'What belief no longer needs reinforcement to hold?', category: 'Identity' },
      { text: 'What did I authorize simply because it felt aligned?', category: 'Wealth Practice' },
      { text: 'What part of my system now self-regulates wealth?', category: 'Nervous System' },
      { text: 'What part of me is now officially upgraded?', category: 'Identity' },
    ]
    const shuffled = prompts.sort(() => Math.random() - 0.5)
    setPromptList(shuffled)
    setPromptIndex(0)
    if (typeof window !== 'undefined') {
      const usedRaw = window.localStorage.getItem('journal:used_prompts')
      if (usedRaw) {
        try {
          const parsed = JSON.parse(usedRaw)
          if (Array.isArray(parsed)) {
            if (parsed.length && typeof parsed[0] === 'string') {
              setUsedPrompts(parsed.map((text: string) => ({ text, category: 'Identity', used_at: '' })))
            } else {
              setUsedPrompts(parsed)
            }
          }
        } catch {
          // ignore
        }
      }
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
      .get('/journal')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : []
        setEntries(list)
      })
      .catch((err) => {
        setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to load journal entries')
      })
      .finally(() => setLoading(false))
  }

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  }, [entries])

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

  function openPromptEntry(prompt: string) {
    resetDraft()
    setActivePrompt(prompt)
    setDraftTitle('Journal Prompt')
    setDraftDate(new Date().toISOString().slice(0, 10))
    setDraftContent(`Prompt: ${prompt}\n\n`)
    setNewEntryOpen(true)
  }

  function closeModal() {
    setNewEntryOpen(false)
    resetDraft()
    setActivePrompt(null)
  }

  async function uploadImageIfNeeded(): Promise<string | null> {
    if (!draftImageFile) return draftImageUrl || null
    const body = new FormData()
    body.append('file', draftImageFile)
    const res = await api.post('/journal/upload-image', body, {
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
    let beforeSummary: any = null
    try {
      if (activePrompt) {
        try {
          const beforeRes = await api.get('/credit/summary?days=7')
          beforeSummary = beforeRes.data
        } catch {
          beforeSummary = null
        }
      }
      const imageUrl = await uploadImageIfNeeded()
      let contentToSave = draftContent.trim()
      if (activePrompt && !contentToSave.startsWith('Prompt:')) {
        contentToSave = `Prompt: ${activePrompt}\n\n${contentToSave}`
      }
      const res = await api.post('/journal', {
        title: draftTitle.trim(),
        entry_date: draftDate,
        content: contentToSave,
        image_url: imageUrl,
      })
      if (activePrompt) {
        const promptItem = promptList.find((item) => item.text === activePrompt)
        const promptCategoryName = promptItem?.category ?? 'Identity'
        setUsedPrompts((prev) => {
          const exists = prev.some((item) => item.text === activePrompt)
          const next = exists
            ? prev
            : [...prev, { text: activePrompt, category: promptCategoryName, used_at: new Date().toISOString() }]
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('journal:used_prompts', JSON.stringify(next))
          }
          return next
        })
        let deltaText = ''
        if (beforeSummary) {
          try {
            const afterRes = await api.get('/credit/summary?days=7')
            const afterSummary = afterRes.data
            const iabDelta = (afterSummary?.scores?.iab ?? 0) - (beforeSummary?.scores?.iab ?? 0)
            if (iabDelta > 0) deltaText = `+${iabDelta} IAB`
          } catch {
            // ignore
          }
        }
        const awarded = Boolean(res.data?.credit_awarded)
        if (awarded) {
          setToast({
            title: 'Prompt recorded for credit.',
            body: deltaText
              ? `${deltaText} · ${promptCategoryName} focus`
              : `${promptCategoryName} focus logged in Identity Assurance Bureau.`,
          })
        } else {
          setToast({
            title: 'Prompt saved.',
            body: 'Credit points not added this time (daily cap or credit not available).',
          })
        }
      }
      await refreshAfterSave()
      closeModal()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to save entry.')
    } finally {
      setSaving(false)
    }
  }

  async function refreshAfterSave() {
    const res = await api.get('/journal')
    const list = Array.isArray(res.data) ? res.data : []
    setEntries(list)
  }

  useEffect(() => {
    const target = journalNavRef.current
    if (!target) return
    const updateVisibility = () => {
      if (!journalNavRef.current) return
      const rect = journalNavRef.current.getBoundingClientRect()
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
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const promptCategories: Array<typeof promptCategory> = ['All', 'Identity', 'Nervous System', 'Emotional', 'Wealth Practice']

  const filteredPrompts = useMemo(() => {
    if (promptCategory === 'All') return promptList
    return promptList.filter((prompt) => prompt.category === promptCategory)
  }, [promptCategory, promptList])

  useEffect(() => {
    setPromptIndex(0)
  }, [promptCategory, promptList.length])

  return (
    <main className="mb-page-offset" style={{ minHeight: '100vh', background: 'var(--page-bg)' }}>
      <div ref={journalNavRef}>
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
        </div>
      ) : null}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px' }}>
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
            <div style={{ fontWeight: 700 }}>{toast.title}</div>
            {toast.body ? <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{toast.body}</div> : null}
          </div>
        ) : null}
        {filteredPrompts.length ? (
          <div style={{ display: 'grid', justifyItems: 'center', gap: 12, marginBottom: 22 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {promptCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setPromptCategory(category)}
                  style={{
                    borderRadius: 999,
                    border: '1px solid rgba(130, 92, 78, 0.45)',
                    background:
                      promptCategory === category
                        ? 'linear-gradient(135deg, rgba(210, 165, 145, 0.8), rgba(182, 121, 103, 0.95))'
                        : 'rgba(255,255,255,0.8)',
                    color: promptCategory === category ? '#fffaf7' : '#5b3a2a',
                    padding: '6px 12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: promptCategory === category ? '0 10px 18px rgba(34,20,14,0.2)' : 'none',
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', gap: 12, alignItems: 'center' }}>
              <button
                type="button"
                aria-label="Previous prompt"
                onClick={() =>
                  setPromptIndex((idx) => (idx - 1 + filteredPrompts.length) % filteredPrompts.length)
                }
                style={{
                  borderRadius: 999,
                  border: '1px solid rgba(130, 92, 78, 0.6)',
                  background: 'rgba(255,255,255,0.85)',
                  width: 36,
                  height: 36,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ←
              </button>
              <div
                style={{
                  fontFamily: '"Playfair Display", "Cormorant Garamond", "Libre Baskerville", serif',
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'rgba(122, 86, 72, 0.9)',
                  textAlign: 'center',
                  maxWidth: 520,
                  lineHeight: 1.45,
                  padding: '12px 18px',
                  borderRadius: 14,
                  background:
                    'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.7), rgba(255,255,255,0) 55%), radial-gradient(circle at 80% 30%, rgba(255,233,210,0.75), rgba(255,233,210,0) 60%), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.6), rgba(255,255,255,0) 55%)',
                  textShadow: '0 0 6px rgba(255, 236, 215, 0.7), 0 0 10px rgba(255, 236, 215, 0.5)',
                }}
              >
                {filteredPrompts[promptIndex]?.text}
              </div>
              <button
                type="button"
                aria-label="Next prompt"
                onClick={() => setPromptIndex((idx) => (idx + 1) % filteredPrompts.length)}
                style={{
                  borderRadius: 999,
                  border: '1px solid rgba(130, 92, 78, 0.6)',
                  background: 'rgba(255,255,255,0.85)',
                  width: 36,
                  height: 36,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                →
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => openPromptEntry(filteredPrompts[promptIndex]?.text)}
                style={{
                  borderRadius: 999,
                  border: '1px solid rgba(130, 92, 78, 0.6)',
                  background: 'linear-gradient(135deg, rgba(210, 165, 145, 0.85), rgba(182, 121, 103, 0.95))',
                  padding: '6px 14px',
                  fontWeight: 700,
                  color: '#fffaf7',
                  cursor: 'pointer',
                  boxShadow: '0 8px 18px rgba(34, 20, 14, 0.25)',
                }}
              >
                Respond to Prompt
              </button>
            </div>
            {usedPrompts.length ? (
              <div
                style={{
                  borderRadius: 14,
                  border: '1px solid rgba(130, 92, 78, 0.25)',
                  background: 'rgba(255,255,255,0.7)',
                  padding: '10px 12px',
                  maxWidth: 640,
                  width: '100%',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Used Prompts
                </div>
                <div style={{ display: 'grid', gap: 6, marginTop: 8, maxHeight: 160, overflowY: 'auto' }}>
                  {usedPrompts
                    .slice()
                    .reverse()
                    .slice(0, 12)
                    .map((item) => (
                      <div
                        key={`${item.text}-${item.used_at}`}
                        style={{ fontSize: 12, opacity: 0.75, display: 'flex', gap: 8, alignItems: 'baseline' }}
                      >
                        <span style={{ fontWeight: 700 }}>{item.category}</span>
                        <span>{item.text}</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
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
            <h1 style={{ marginTop: 16, fontFamily: 'var(--font-serif)', fontSize: 30 }}>My Journal</h1>
            <p style={{ marginTop: 6, opacity: 0.75 }}>Capture your reflections, milestones, and daily wins.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" data-testid="journal-new-entry-button" onClick={openNewEntry} style={buttonStyle}>
              New Entry
            </button>
          </div>
        </div>

        {error ? (
          <div style={{ marginTop: 18, color: '#7a2e2e' }}>{error}</div>
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
          ) : sortedEntries.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No journal entries yet.</div>
          ) : (
            sortedEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => router.push(`/myjournal/${entry.id}`)}
                style={{
                  textAlign: 'left',
                  borderRadius: 16,
                  padding: 16,
                  border: '1px solid rgba(95, 74, 62, 0.2)',
                  background: 'rgba(255, 255, 255, 0.75)',
                  cursor: 'pointer',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{entry.title}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                  {formatEntryDate(entry.entry_date)}
                </div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  {entry.content.length > 120 ? `${entry.content.slice(0, 120)}…` : entry.content}
                </div>
              </button>
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
              <div style={{ fontWeight: 600, fontSize: 18 }}>New Journal Entry</div>
              <button type="button" onClick={closeModal} style={{ ...buttonStyle, padding: '6px 12px' }}>
                Close
              </button>
            </div>

            <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
              {activePrompt ? (
                <div
                  style={{
                    borderRadius: 14,
                    border: '1px solid rgba(130, 92, 78, 0.35)',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.85)',
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Prompt</div>
                  <div style={{ opacity: 0.8 }}>{activePrompt}</div>
                </div>
              ) : null}
              {error ? (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(122, 75, 62, 0.35)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    color: '#7a4b3e',
                    textShadow: '0 0 8px rgba(182, 121, 103, 0.55), 0 0 16px rgba(182, 121, 103, 0.35)',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {error}
                </div>
              ) : null}
              <div>
                <div style={fieldLabelStyle}>Entry Title</div>
                <input
                  data-testid="journal-title-input"
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
                  data-testid="journal-date-input"
                  value={draftDate}
                  onChange={(event) => setDraftDate(event.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={fieldLabelStyle}>Your Entry</div>
                <textarea
                  data-testid="journal-content-input"
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
                    data-testid="journal-image-input"
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
                      alt="Journal"
                      style={{ width: '100%', borderRadius: 12, objectFit: 'cover' }}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                data-testid="journal-save-button"
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
    </main>
  )
}
