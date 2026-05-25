'use client'

export const BALANCE_PREVIEW_TITLE = 'Balance Preview Expired'
export const BALANCE_PREVIEW_BODY =
  'Free members can view newly posted balances for 12 hours. Upgrade to ManifestBank™ Signature to keep your full balance history, progress snapshots, and long-term wealth tracking unlocked.'
export const BALANCE_PREVIEW_CTA = 'Unlock with Signature'

export const BALANCE_PREVIEW_NOTICE =
  'Free members can view newly posted balances for 12 hours. After that, your balance is safely stored but locked from view. Upgrade to Signature to keep full balance history unlocked.'

export type PreviewVisibility = {
  preview_expires_at?: string | null
  is_preview_expired?: boolean
  visible_to_user?: boolean
}

export function isVisibleToUser(item: PreviewVisibility | null | undefined) {
  return item?.visible_to_user !== false
}

export function formatPreviewCountdown(expiresAt?: string | null, nowMs = Date.now()) {
  if (!expiresAt) return ''
  const diff = new Date(expiresAt).getTime() - nowMs
  if (!Number.isFinite(diff) || diff <= 0) return 'Balance preview locked'
  const totalMinutes = Math.max(1, Math.floor(diff / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `Balance preview locks in ${hours}h ${minutes}m`
}

export function getSoonestPreviewExpiry(items: PreviewVisibility[]) {
  return items
    .filter((item) => item.preview_expires_at && isVisibleToUser(item))
    .map((item) => item.preview_expires_at as string)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null
}

export function getLatestLockedPreviewExpiry(items: PreviewVisibility[]) {
  return items
    .filter((item) => item.preview_expires_at && item.visible_to_user === false)
    .map((item) => item.preview_expires_at as string)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null
}

export function getBalancePreviewNotificationKey(scope: string, expiresAt?: string | null) {
  if (!expiresAt) return null
  return `balance-preview-notice:${scope}:${expiresAt}`
}
