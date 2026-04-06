'use client'

import { useEffect, useMemo, useState } from 'react'

const PROMPTS = [
  'I want to make a deposit.',
  'Deposit and the account name',
  'Transfer money...',
  'Create a new account',
  'Put 2,000 in savings',
  'Give me affirmations',
  'Add 500 to travel account',
  'Drop $1,000 into rent',
  'Give me a script for a smooth day.',
  'Deposit 300 checking',
  'withdraw 900',
  "I'd like to make a withdrawal",
  'Withdraw $4,000 from my Wealth Builder account',
  'New account for rent',
]

export default function TellerStarterPrompt({ enabled = true }: { enabled?: boolean }) {
  const prompts = useMemo(() => PROMPTS, [])
  const [index, setIndex] = useState(0)
  const [subIndex, setSubIndex] = useState(0)
  const [typing, setTyping] = useState(true)

  useEffect(() => {
    if (!prompts.length) return
    const current = prompts[index]
    if (typing) {
      if (subIndex < current.length) {
        const t = setTimeout(() => setSubIndex((v) => v + 1), 35)
        return () => clearTimeout(t)
      }
      const pause = setTimeout(() => setTyping(false), 900)
      return () => clearTimeout(pause)
    }
    const t = setTimeout(() => {
      setTyping(true)
      setSubIndex(0)
      setIndex((v) => (v + 1) % prompts.length)
    }, 900)
    return () => clearTimeout(t)
  }, [index, subIndex, typing, prompts])

  const text = prompts[index]?.slice(0, subIndex) ?? ''

  if (!enabled) return null

  return (
    <div style={{ fontSize: 12, opacity: 0.7 }}>
      <span style={{ fontWeight: 600 }}>Try asking Fortune:</span>{' '}
      <span style={{ fontStyle: 'italic' }}>{text}</span>
    </div>
  )
}
