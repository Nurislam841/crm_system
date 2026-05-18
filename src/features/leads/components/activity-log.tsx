import {
  CircleArrowRight,
  CalendarClock,
  MessageSquare,
  Phone,
  Sparkles,
  UserCog,
  type LucideIcon,
} from 'lucide-react'

import type { LeadActivity } from '@prisma/client'

import { cn } from '@/lib/utils'

import {
  ACTIVITY_LABEL_RU,
  type ActivityType,
} from '../lib/activity'
import { STAGE_LABEL_RU } from '../lib/stages'

type ActivityWithAuthor = LeadActivity & {
  author: { id: string; fullName: string }
}

const ICONS: Record<ActivityType, LucideIcon> = {
  lead_created: Sparkles,
  stage_changed: CircleArrowRight,
  assignment_changed: UserCog,
  next_contact_set: CalendarClock,
  note: MessageSquare,
  call: Phone,
}

export function ActivityLog({ activities }: { activities: ActivityWithAuthor[] }) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Пока ничего не происходило.</p>
    )
  }

  return (
    <ul className="space-y-3">
      {activities.map((a) => {
        const type = (a.type as ActivityType) ?? 'note'
        const Icon = ICONS[type] ?? MessageSquare
        return (
          <li key={a.id} className="flex gap-3">
            <div
              className={cn(
                'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full',
                type === 'note' || type === 'call'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <Icon className="size-3.5" />
            </div>
            <div className="flex-1 space-y-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-medium">{ACTIVITY_LABEL_RU[type] ?? a.type}</span>
                <span className="text-xs text-muted-foreground">
                  · {a.author.fullName} · {formatDate(a.createdAt)}
                </span>
              </div>
              <ActivityBody type={type} payload={a.payload as Record<string, unknown>} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function ActivityBody({
  type,
  payload,
}: {
  type: ActivityType
  payload: Record<string, unknown>
}) {
  if (type === 'note' || type === 'call') {
    const body = typeof payload.body === 'string' ? payload.body : ''
    return body ? (
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{body}</p>
    ) : null
  }
  if (type === 'stage_changed') {
    const from = typeof payload.from === 'string' ? payload.from : ''
    const to = typeof payload.to === 'string' ? payload.to : ''
    return (
      <p className="text-xs text-muted-foreground">
        {(STAGE_LABEL_RU as Record<string, string>)[from] ?? from} →{' '}
        {(STAGE_LABEL_RU as Record<string, string>)[to] ?? to}
      </p>
    )
  }
  if (type === 'assignment_changed') {
    return (
      <p className="text-xs text-muted-foreground">
        {payload.toUserId ? 'Назначен сотрудник' : 'Снят с назначения'}
      </p>
    )
  }
  if (type === 'next_contact_set') {
    const at = typeof payload.at === 'string' ? payload.at : null
    return at ? (
      <p className="text-xs text-muted-foreground">{formatDate(new Date(at))}</p>
    ) : (
      <p className="text-xs text-muted-foreground">Напоминание снято</p>
    )
  }
  return null
}

const DATE_FMT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Almaty',
})

function formatDate(d: Date) {
  return DATE_FMT.format(d)
}
