'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import type { Notification } from '@prisma/client'
import { Check, CheckCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '../actions'

const DATE_FMT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Almaty',
})

export function NotificationList({ items }: { items: Notification[] }) {
  const [isPending, startTransition] = useTransition()
  const hasUnread = items.some((n) => !n.readAt)

  return (
    <div className="space-y-3">
      {hasUnread && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await markAllNotificationsReadAction()
              })
            }
          >
            <CheckCheck />
            Прочитать все
          </Button>
        </div>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Уведомлений пока нет.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <Row key={n.id} n={n} pending={isPending} startTransition={startTransition} />
          ))}
        </ul>
      )}
    </div>
  )
}

function Row({
  n,
  pending,
  startTransition,
}: {
  n: Notification
  pending: boolean
  startTransition: (cb: () => void) => void
}) {
  const unread = !n.readAt
  const handleClick = () => {
    if (unread) {
      startTransition(async () => {
        await markNotificationReadAction(n.id)
      })
    }
  }

  const content = (
    <>
      <div className="flex items-center gap-2">
        {unread && <span className="inline-block size-1.5 rounded-full bg-primary" />}
        <strong className="font-medium">{n.title}</strong>
      </div>
      {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {DATE_FMT.format(n.createdAt)}
      </div>
    </>
  )

  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-lg border border-border p-3 text-sm',
        unread && 'bg-muted/40',
      )}
    >
      {n.link ? (
        <Link href={n.link} className="flex-1 space-y-0.5" onClick={handleClick}>
          {content}
        </Link>
      ) : (
        <div className="flex-1 space-y-0.5" onClick={handleClick}>
          {content}
        </div>
      )}
      {unread && (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          title="Отметить прочитанным"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await markNotificationReadAction(n.id)
            })
          }
        >
          <Check />
        </Button>
      )}
    </li>
  )
}
