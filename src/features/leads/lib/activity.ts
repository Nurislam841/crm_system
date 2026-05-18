import type { Prisma } from '@prisma/client'

import { db } from '@/lib/db/prisma'

export type ActivityType =
  | 'lead_created'
  | 'stage_changed'
  | 'assignment_changed'
  | 'next_contact_set'
  | 'note'
  | 'call'

export type ActivityPayload = Prisma.JsonObject

export async function logActivity(args: {
  tenantId: string
  leadId: string
  authorId: string
  type: ActivityType
  payload: ActivityPayload
}) {
  return db.leadActivity.create({
    data: {
      tenantId: args.tenantId,
      leadId: args.leadId,
      authorId: args.authorId,
      type: args.type,
      payload: args.payload,
    },
  })
}

export const ACTIVITY_LABEL_RU: Record<ActivityType, string> = {
  lead_created: 'Лид создан',
  stage_changed: 'Этап изменён',
  assignment_changed: 'Назначен ответственный',
  next_contact_set: 'Запланирован контакт',
  note: 'Заметка',
  call: 'Звонок',
}
