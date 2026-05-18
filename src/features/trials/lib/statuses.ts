export const TRIAL_STATUSES = ['BOOKED', 'DONE', 'NO_SHOW', 'CANCELLED'] as const

export type TrialStatus = (typeof TRIAL_STATUSES)[number]

export const TRIAL_STATUS_LABEL_RU: Record<TrialStatus, string> = {
  BOOKED: 'Запланирован',
  DONE: 'Проведён',
  NO_SHOW: 'Не пришёл',
  CANCELLED: 'Отменён',
}

export const TRIAL_STATUS_TONE: Record<TrialStatus, 'progress' | 'success' | 'danger' | 'neutral'> =
  {
    BOOKED: 'progress',
    DONE: 'success',
    NO_SHOW: 'danger',
    CANCELLED: 'neutral',
  }
