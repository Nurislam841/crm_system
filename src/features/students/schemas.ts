import { z } from 'zod'

const optionalString = (s: unknown) =>
  typeof s === 'string' && s.trim().length === 0 ? undefined : s

const optionalDate = z.preprocess(
  (v) => {
    if (v === undefined || v === null || v === '') return undefined
    if (v instanceof Date) return v
    const d = new Date(String(v))
    return Number.isNaN(d.getTime()) ? v : d
  },
  z.date().optional(),
)

export const createStudentSchema = z.object({
  parentId: z.string().trim().min(1),
  fullName: z.string().trim().min(2, 'Минимум 2 символа').max(120),
  birthDate: optionalDate,
  notes: z.preprocess(optionalString, z.string().trim().max(2000).optional()),
})

export type CreateStudentInput = z.infer<typeof createStudentSchema>

export const updateStudentSchema = createStudentSchema.omit({ parentId: true })
