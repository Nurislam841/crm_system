import { z } from 'zod'

const PHONE_REGEX = /^\+7\d{10}$/

export const ACQUISITION_SOURCE_VALUES = [
  'INSTAGRAM',
  'WEBSITE',
  'REFERRAL',
  'WALK_IN',
  'TELEGRAM',
  'OTHER',
] as const

export const LEAD_STAGE_VALUES = [
  'NEW',
  'CONTACTED',
  'TRIAL_BOOKED',
  'TRIAL_DONE',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const

const optionalString = (s: unknown) =>
  typeof s === 'string' && s.trim().length === 0 ? undefined : s

export const createLeadSchema = z.object({
  parentName: z.string().trim().min(2, 'Минимум 2 символа').max(120),
  parentPhone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, 'Формат: +7XXXXXXXXXX (12 символов)'),
  parentEmail: z.preprocess(
    optionalString,
    z.string().trim().email('Некорректный email').optional(),
  ),
  childName: z.preprocess(
    optionalString,
    z.string().trim().min(1).max(120).optional(),
  ),
  childAge: z.preprocess(
    (v) => {
      if (v === undefined || v === null || v === '') return undefined
      const n = Number(v)
      return Number.isNaN(n) ? v : n
    },
    z.number().int().min(2).max(99).optional(),
  ),
  acquisitionSource: z.enum(ACQUISITION_SOURCE_VALUES),
  notes: z.preprocess(optionalString, z.string().trim().max(2000).optional()),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>

export const updateLeadSchema = createLeadSchema.extend({
  stage: z.enum(LEAD_STAGE_VALUES),
})

export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
