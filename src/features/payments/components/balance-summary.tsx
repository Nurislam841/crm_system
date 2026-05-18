import { ArrowDownCircle, AlertCircle, CalendarClock } from 'lucide-react'

import { formatKzt } from '@/lib/money'
import { cn } from '@/lib/utils'

import type { ParentBalance } from '../queries'

export function BalanceSummary({ balance }: { balance: ParentBalance }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Tile
        icon={<ArrowDownCircle className="size-4" />}
        label="Оплачено всего"
        value={formatKzt(balance.paidTotal)}
        tone="success"
      />
      <Tile
        icon={<CalendarClock className="size-4" />}
        label="Запланировано"
        value={formatKzt(balance.scheduledTotal)}
        tone="neutral"
      />
      <Tile
        icon={<AlertCircle className="size-4" />}
        label={
          balance.overdueCount > 0
            ? `Просрочено · ${balance.overdueCount}`
            : 'Просрочено'
        }
        value={formatKzt(balance.overdueTotal)}
        tone={balance.overdueTotal > 0 ? 'danger' : 'neutral'}
      />
    </div>
  )
}

const TONE: Record<'neutral' | 'success' | 'danger', string> = {
  neutral: 'border-border bg-card text-foreground',
  success:
    'border-emerald-300/40 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-100',
  danger:
    'border-rose-300/40 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-100',
}

function Tile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: 'neutral' | 'success' | 'danger'
}) {
  return (
    <div className={cn('rounded-lg border px-3 py-2.5', TONE[tone])}>
      <div className="flex items-center gap-1.5 text-xs opacity-80">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  )
}
