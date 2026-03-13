'use client'

const USERNAME_MAX_LENGTH = 21
const USERNAME_MIN_LENGTH = 3
const ALLOWED_RE = /^[A-Za-z0-9_.]+$/

const HARD_BLOCK = new Set([
  'fuck',
  'fucker',
  'fucking',
  'motherfucker',
  'shit',
  'bullshit',
  'asshole',
  'bitch',
  'bastard',
  'dick',
  'dickhead',
  'pussy',
  'cunt',
  'slut',
  'whore',
  'damn',
  'goddamn',
  'prick',
  'jackass',
  'asshat',
  'twat',
  'wanker',
  'porn',
  'porno',
  'pornhub',
  'xxx',
  'sex',
  'sexy',
  'blowjob',
  'handjob',
  'cum',
  'jizz',
  'orgasm',
  'nudes',
  'naked',
  'fetish',
  'bdsm',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'spic',
  'kike',
  'chink',
  'gook',
  'tranny',
  'dyke',
  'cocaine',
  'heroin',
  'meth',
  'crack',
  'weed',
  'druglord',
  'cartel',
  'dealer',
  'kill',
  'killer',
  'murder',
  'rapist',
  'rape',
  'terrorist',
  'suicide',
  'cock',
])

const ROOT_BLOCK = ['kill', 'sex', 'drug', 'rape', 'porn', 'nude']

const BYPASS_PATTERNS = [
  /f[\W_]*u[\W_]*c[\W_]*k/i,
  /sh[\W_]*i[\W_]*t/i,
  /b[\W_]*i[\W_]*t[\W_]*c[\W_]*h/i,
  /a[\W_]*\${2,}|\b(a55)\b/i,
  /d[\W_]*i[\W_]*c[\W_]*k/i,
  /c[\W_]*0[\W_]*c[\W_]*k/i,
]

const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '$': 's',
  '!': 'i',
  '@': 'a',
}

function normalizeForMatch(value: string) {
  const lowered = value.toLowerCase()
  const mapped = lowered
    .split('')
    .map((ch) => LEET_MAP[ch] ?? ch)
    .join('')
  return mapped.replace(/[^a-z0-9]/g, '')
}

export function validateUsername(value: string): { ok: boolean; reason?: string } {
  const raw = value.trim()
  if (!raw) return { ok: false, reason: 'Username is required.' }
  if (raw.includes('@')) return { ok: false, reason: "Usernames cannot include '@'." }
  if (raw.length < USERNAME_MIN_LENGTH || raw.length > USERNAME_MAX_LENGTH) {
    return { ok: false, reason: `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters.` }
  }
  if (!ALLOWED_RE.test(raw)) {
    return { ok: false, reason: 'Usernames may only use letters, numbers, and underscores.' }
  }
  const normalized = normalizeForMatch(raw)
  if (!normalized) {
    return { ok: false, reason: 'Username must include letters or numbers.' }
  }
  for (const pattern of BYPASS_PATTERNS) {
    if (pattern.test(raw)) {
      return {
        ok: false,
        reason:
          'Usernames should reflect prosperity, creativity, and positive identity. Please choose a different name.',
      }
    }
  }
  for (const word of HARD_BLOCK) {
    if (normalized.includes(word)) {
      return {
        ok: false,
        reason:
          'Usernames should reflect prosperity, creativity, and positive identity. Please choose a different name.',
      }
    }
  }
  for (const root of ROOT_BLOCK) {
    if (normalized.includes(root)) {
      return {
        ok: false,
        reason:
          'Usernames should reflect prosperity, creativity, and positive identity. Please choose a different name.',
      }
    }
  }
  return { ok: true }
}
