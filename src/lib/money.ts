import { Prisma } from '@prisma/client'

const KZT_FMT = new Intl.NumberFormat('ru-KZ', {
  style: 'currency',
  currency: 'KZT',
  maximumFractionDigits: 0,
})

export function formatKzt(value: Prisma.Decimal | number | string | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const n =
    value instanceof Prisma.Decimal
      ? Number(value.toString())
      : typeof value === 'string'
        ? Number(value)
        : value
  if (Number.isNaN(n)) return '—'
  return KZT_FMT.format(n)
}

export function toDecimalString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  const s = String(value).replace(/\s/g, '').replace(',', '.')
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return null
  return n.toFixed(2)
}
