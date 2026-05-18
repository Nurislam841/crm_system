import type { AcquisitionSource } from '@prisma/client'

export const ACQUISITION_SOURCES: AcquisitionSource[] = [
  'INSTAGRAM',
  'WEBSITE',
  'REFERRAL',
  'WALK_IN',
  'TELEGRAM',
  'OTHER',
]

export const SOURCE_LABEL_RU: Record<AcquisitionSource, string> = {
  INSTAGRAM: 'Instagram',
  WEBSITE: 'Сайт',
  REFERRAL: 'Рекомендация',
  WALK_IN: 'Самостоятельно',
  TELEGRAM: 'Telegram',
  OTHER: 'Другое',
}
