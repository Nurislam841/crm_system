import { z } from 'zod'

import { TRIAL_STATUSES } from './lib/statuses'

const optionalString = (s: unknown) =>
  typeof s === 'string' && s.trim().length === 0 ? undefined : s

const requiredDateTime = z.preprocess((v) => {
  if (v instanceof Date) return v
  if (typeof v === 'string' && v.length > 0) {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? v : d
  }
  return v
}, z.date({ message: 'Укажите дату и время' }))

export const bookTrialSchema = z.object({
  scheduledAt: requiredDateTime,
  notes: z.preprocess(optionalString, z.string().trim().max(2000).optional()),
})

export type BookTrialInput = z.infer<typeof bookTrialSchema>

export const setTrialStatusSchema = z.object({
  trialId: z.string().trim().min(1),
  status: z.enum(TRIAL_STATUSES),
})
