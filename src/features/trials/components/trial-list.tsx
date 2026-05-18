'use client'

import { useTransition } from 'react'
import type { TrialLesson } from '@prisma/client'
import { Check, CalendarClock, UserX, Ban } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { setTrialStatusAction } from '../actions'
import {
  TRIAL_STATUS_LABEL_RU,
  TRIAL_STATUS_TONE,
  type TrialStatus,
} from '../lib/statuses'

const TONE_CLASS: Record<'neutral' | 'progress' | 'success' | 'danger', string> = {
  neutral: 'bg-muted text-foreground',
  progress: 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200',
  success: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200',
  danger: 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200',
}

const DATE_FMT = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Almaty',
})

export function TrialList({ trials }: { trials: TrialLesson[] }) {
  if (trials.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Пробных пока не назначено. Запишите выше — лид автоматически перейдёт на этап «Пробный записан».
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {trials.map((t) => (
        <TrialRow key={t.id} trial={t} />
      ))}
    </ul>
  )
}

function TrialRow({ trial }: { trial: TrialLesson }) {
  const [isPending, startTransition] = useTransition()
  const status = trial.status as TrialStatus
  const tone = TRIAL_STATUS_TONE[status] ?? 'neutral'

  function setStatus(next: TrialStatus) {
    if (status === next) return
    startTransition(async () => {
      await setTrialStatusAction({ trialId: trial.id, status: next })
    })
  }

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <CalendarClock className="size-4 text-muted-foreground" />
          <span className="font-medium">{DATE_FMT.format(trial.scheduledAt)}</span>
          <Badge
            variant="secondary"
            className={cn('border-none', TONE_CLASS[tone])}
          >
            {TRIAL_STATUS_LABEL_RU[status] ?? status}
          </Badge>
        </div>
        {status === 'BOOKED' && (
          <div className="flex gap-1">
            <Button
              size="xs"
              variant="outline"
              type="button"
              onClick={() => setStatus('DONE')}
              disabled={isPending}
              title="Отметить как проведён"
            >
              <Check />
              Проведён
            </Button>
            <Button
              size="xs"
              variant="outline"
              type="button"
              onClick={() => setStatus('NO_SHOW')}
              disabled={isPending}
              title="Не пришёл"
            >
              <UserX />
              Не пришёл
            </Button>
            <Button
              size="xs"
              variant="ghost"
              type="button"
              onClick={() => setStatus('CANCELLED')}
              disabled={isPending}
              title="Отменить"
            >
              <Ban />
            </Button>
          </div>
        )}
      </div>
      {trial.notes && (
        <p className="mt-1.5 whitespace-pre-wrap text-xs text-muted-foreground">
          {trial.notes}
        </p>
      )}
    </li>
  )
}
