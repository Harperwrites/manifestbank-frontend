export const TELLER_AI_CONSENT_VERSION = '2026-04-05a'

function storageKey(userId: number | null | undefined) {
  return `mb_teller_ai_consent:${TELLER_AI_CONSENT_VERSION}:${userId ?? 'anon'}`
}

export function hasAcceptedTellerAiConsent(userId: number | null | undefined) {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(storageKey(userId)) === 'accepted'
}

export function acceptTellerAiConsent(userId: number | null | undefined) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey(userId), 'accepted')
  window.dispatchEvent(new CustomEvent('mb_teller_ai_consent_accepted'))
}
