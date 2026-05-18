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
  z
    .number({ message: 'Введите число' })
    .min(0, 'Не может быть отрицательным')
    .max(10_000_000, 'Слишком большое значение'),
)

export const createCourseSchema = z.object({
  name: z.string().trim().min(2, 'Минимум 2 символа').max(120),
  description: z.preprocess(optionalString, z.string().trim().max(500).optional()),
  monthlyPrice: moneyValue,
})

export type CreateCourseInput = z.infer<typeof createCourseSchema>

export const updateCourseSchema = createCourseSchema
