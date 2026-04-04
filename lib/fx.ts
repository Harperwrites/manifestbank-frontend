export const DEFAULT_RATES: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.74,
  AUD: 0.66,
  NZD: 0.61,
  JPY: 0.0067,
  CNY: 0.14,
  HKD: 0.128,
  SGD: 0.74,
  INR: 0.012,
  KRW: 0.00075,
  CHF: 1.12,
  SEK: 0.095,
  NOK: 0.093,
  DKK: 0.145,
  MXN: 0.058,
  BRL: 0.2,
  ZAR: 0.054,
  AED: 0.272,
  SAR: 0.267,
  QAR: 0.275,
  KWD: 3.25,
  BHD: 2.65,
  OMR: 2.6,
  ILS: 0.27,
  ANG: 0.56,
}

export function convertAmountLocal(amount: number, fromCurrency: string, toCurrency: string): number {
  const from = (fromCurrency || 'USD').toUpperCase()
  const to = (toCurrency || 'USD').toUpperCase()
  const fromRate = DEFAULT_RATES[from] ?? 1
  const toRate = DEFAULT_RATES[to] ?? 1
  if (from === to) return amount
  const usd = amount * fromRate
  const converted = usd / toRate
  return Math.round(converted * 100) / 100
}

export function convertAmountWithRates(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  const from = (fromCurrency || 'USD').toUpperCase()
  const to = (toCurrency || 'USD').toUpperCase()
  const fromRate = rates[from] ?? 1
  const toRate = rates[to] ?? 1
  if (from === to) return amount
  const usd = amount * fromRate
  const converted = usd / toRate
  return Math.round(converted * 100) / 100
}

export function getDefaultRates(): Record<string, number> {
  return { ...DEFAULT_RATES }
}

export function getRateLocal(fromCurrency: string, toCurrency: string): number {
  const from = (fromCurrency || 'USD').toUpperCase()
  const to = (toCurrency || 'USD').toUpperCase()
  const fromRate = DEFAULT_RATES[from] ?? 1
  const toRate = DEFAULT_RATES[to] ?? 1
  if (from === to) return 1
  const rate = fromRate / toRate
  return Math.round(rate * 1000000) / 1000000
}
