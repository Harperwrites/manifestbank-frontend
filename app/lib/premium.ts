export const PREMIUM_TIER_NAME = 'ManifestBank\u2122 Signature'
export const PREMIUM_CTA = 'Upgrade to Manifest Signature'
export const PREMIUM_ANNUAL_PRICE = '$72/yr'
export const PREMIUM_MONTHLY_PRICE = '$8.88/mo'
export const PREMIUM_ANNUAL_NOTE = 'Save 33% with Annual — $72/yr ($6/mo)'
export const SIGNATURE_PROMO_PRICE_ID = 'price_1Tb5TuG68D8afulEfDfoBqVg'
export const SIGNATURE_PROMO_CODE = 'SIGNATURE50'
export const SIGNATURE_PROMO_DISCOUNTED_PRICE = '$36/yr'
export const SIGNATURE_PROMO_START_AT = '2026-05-25T00:00:00-05:00'
export const SIGNATURE_PROMO_END_AT = '2026-06-01T00:59:00-04:00'

export const FREE_LIMIT_COPY = {
  transactions: '2 deposits + 2 expenses per 7 days',
  checks: '1 check per 7 days',
  scheduled: 'Scheduled movements are locked',
  affirmations: '10 affirmation entries',
  accounts: '1 account',
  statements: 'Statements are locked',
  savedAffirmations: 'Saved affirmations are locked',
}

export function isSignaturePromoActive(now = Date.now()) {
  const start = new Date(SIGNATURE_PROMO_START_AT).getTime()
  const end = new Date(SIGNATURE_PROMO_END_AT).getTime()
  return now >= start && now <= end
}
