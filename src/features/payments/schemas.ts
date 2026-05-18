import { z } from 'zod'

const optionalString = (s: unknown) =>
  typeof s === 'string' && s.trim().length === 0 ? undefined : s

const moneyValue = z.preprocess(
  (v) => {
    if (v === null || v === undefined || v === '') return undefined
    const s = String(v).replace(/\s/g, '').replace(',', '.')
    const n = Number(s)
    return Number.isFinite(n) ? n : v
  },
  z.number({ message: 'Введите сумму' }).positive('Должно быть больше 0').max(100_000_000),
)

const requiredDate = z.preprocess(
  (v) => {
    if (v instanceof Date) return v
    if (typeof v === 'string' && v.length > 0) {
      const d = new Date(v)
      return Number.isNaN(d.getTime()) ? v : d
    }
    return v
  },
  z.date({ message: 'Укажите дату' }),
)

const optionalDate = z.preprocess(
  (v) => {
    if (v === null || v === undefined || v === '') return undefined
    if (v instanceof Date) return v
    const d = new Date(String(v))
    return Number.isNaN(d.getTime()) ? v : d
  },
  z.date().optional(),
)

export const PAYMENT_METHOD_VALUES = ['KASPI', 'CARD', 'CASH', 'TRANSFER'] as const

export const PAYMENT_METHOD_LABEL_RU: Record<
  (typeof PAYMENT_METHOD_VALUES)[number],
  string
> = {
  KASPI: 'Kaspi',
  CARD: 'Карта',
  CASH: 'Наличные',
  TRANSFER: 'Перевод',
}

// "Record received money" — creates a Payment with paidAt set
export const recordPaymentSchema = z.object({
  parentId: z.string().trim().min(1),
  amount: moneyValue,
  paidAt: requiredDate,
  method: z.enum(PAYMENT_METHOD_VALUES),
  enrollmentId: z.preprocess(optionalString, z.string().trim().min(1).optional()),
  reference: z.preprocess(optionalString, z.string().trim().max(120).optional()),
  notes: z.preprocess(optionalString, z.string().trim().max(2000).optional()),
})

// "Schedule a charge" — creates a Payment with paidAt = null
export const schedulePaymentSchema = z.object({
  parentId: z.string().trim().min(1),
  amount: moneyValue,
  dueAt: requiredDate,
  enrollmentId: z.preprocess(optionalString, z.string().trim().min(1).optional()),
  notes: z.preprocess(optionalString, z.string().trim().max(2000).optional()),
})

// Mark an existing scheduled payment as paid
export const markPaidSchema = z.object({
  paymentId: z.string().trim().min(1),
  paidAt: requiredDate,
  method: z.enum(PAYMENT_METHOD_VALUES),
  reference: z.preprocess(optionalString, z.string().trim().max(120).optional()),
})

export const updatePaymentSchema = z.object({
  paymentId: z.string().trim().min(1),
  amount: moneyValue,
  dueAt: requiredDate,
  paidAt: optionalDate,
  method: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.enum(PAYMENT_METHOD_VALUES).optional(),
  ),
  reference: z.preprocess(optionalString, z.string().trim().max(120).optional()),
  notes: z.preprocess(optionalString, z.string().trim().max(2000).optional()),
})

export const refundPaymentSchema = z.object({
  paymentId: z.string().trim().min(1),
  refundedAmount: moneyValue,
  refundedAt: requiredDate,
  refundReason: z.preprocess(optionalString, z.string().trim().max(500).optional()),
})

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>
export type SchedulePaymentInput = z.infer<typeof schedulePaymentSchema>
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>
