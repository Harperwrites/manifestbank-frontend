export function parseServerDate(value?: string | null): Date | null {
  if (!value) return null
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
  const normalized = hasTz ? value : `${value}Z`
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export function formatLocalDate(value?: string | null): string {
  const date = parseServerDate(value)
  return date ? date.toLocaleDateString() : ''
}

export function formatLocalDateTime(value?: string | null): string {
  const date = parseServerDate(value)
  return date ? date.toLocaleString() : ''
}

export function formatLocalTime(
  value?: string | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseServerDate(value)
  return date ? date.toLocaleTimeString(undefined, options) : ''
}
