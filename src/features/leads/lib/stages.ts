import type { LeadStage } from '@prisma/client'

export const LEAD_STAGES: LeadStage[] = [
  'NEW',
  'CONTACTED',
  'TRIAL_BOOKED',
  'TRIAL_DONE',
  'NEGOTIATION',
  'WON',
  'LOST',
]

export const STAGE_LABEL_RU: Record<LeadStage, string> = {
  NEW: 'Новый',
  CONTACTED: 'Связались',
  TRIAL_BOOKED: 'Пробный записан',
  TRIAL_DONE: 'Пробный проведён',
  NEGOTIATION: 'Переговоры',
  WON: 'Заключён',
  LOST: 'Потерян',
}

export const STAGE_TONE: Record<LeadStage, 'neutral' | 'progress' | 'success' | 'danger'> = {
  NEW: 'neutral',
  CONTACTED: 'progress',
  TRIAL_BOOKED: 'progress',
  TRIAL_DONE: 'progress',
  NEGOTIATION: 'progress',
  WON: 'success',
  LOST: 'danger',
}
