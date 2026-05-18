import { z } from 'zod'

const moneyValue = z.preprocess(
  (v) => {
    if (v === null || v === undefined || v === '') return undefined
    const s = String(v).replace(/\s/g, '').replace(',', '.')
    const n = Number(s)
    return Number.isFinite(n) ? n : v
  },
  z
    .number({ message: 'Введите сумму' })
    .positive('Должно быть больше 0')
    .max(10_000_000),
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

export const createPlanSchema = z.object({
  enrollmentId: z.string().trim().min(1),
  monthlyAmount: moneyValue,
  installments: z.preprocess(
    (v) => {
      if (v === null || v === undefined || v === '') return undefined
      const n = Number(v)
      return Number.isFinite(n) ? n : v
    },
    z.number().int().min(1, 'Минимум 1 месяц').max(48, 'Максимум 48 месяцев'),
  ),
  firstDueAt: requiredDate,
})

export type CreatePlanInput = z.infer<typeof createPlanSchema>
