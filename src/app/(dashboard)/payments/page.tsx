import Link from 'next/link'
import { AlertCircle, ArrowDownCircle, CalendarClock } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PaymentFilterChips } from '@/features/payments/components/filter-chips'
import { PaymentRow } from '@/features/payments/components/payment-row'
import { listPayments, paymentStats, type PaymentFilter } from '@/features/payments/queries'
import { requireUser } from '@/lib/auth/server'
import { formatKzt } from '@/lib/money'
import { cn } from '@/lib/utils'

const VALID_FILTERS: PaymentFilter[] = [
  'overdue',
  'this_week',
  'this_month',
  'paid_this_month',
  'all',
]

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  await requireUser()
  const sp = await searchParams
  const filter = (
    sp.filter && (VALID_FILTERS as string[]).includes(sp.filter)
      ? sp.filter
      : 'overdue'
  ) as PaymentFilter

  const [payments, stats] = await Promise.all([listPayments(filter), paymentStats()])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Платежи</h1>
        <p className="text-sm text-muted-foreground">
          Сводка по школе. По умолчанию — просроченные, чтобы было видно сразу что зовут менеджеров.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          icon={<AlertCircle className="size-4" />}
          label={
            stats.overdueCount > 0
              ? `Просрочено · ${stats.overdueCount}`
              : 'Просрочено'
          }
          value={formatKzt(stats.overdueAmount)}
          tone={stats.overdueAmount > 0 ? 'danger' : 'neutral'}
        />
        <Stat
          icon={<CalendarClock className="size-4" />}
          label={`Ожидается · ${stats.dueThisMonthCount}`}
          value={formatKzt(stats.dueThisMonthAmount)}
          tone="neutral"
          subtitle="в этом месяце"
        />
        <Stat
          icon={<ArrowDownCircle className="size-4" />}
          label={`Получено · ${stats.paidThisMonthCount}`}
          value={formatKzt(stats.paidThisMonthAmount)}
          tone="success"
          subtitle="в этом месяце"
        />
      </div>

      <PaymentFilterChips active={filter} />

      <Card>
        <CardContent className="pt-4">
          {payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              По этому фильтру платежей нет.{' '}
              <Link href="/parents" className="underline underline-offset-2">
                Перейти к семьям
              </Link>{' '}
              и записать первый.
            </p>
          ) : (
            <ul className="space-y-2">
              {payments.map((p) => (
                <PaymentRow key={p.id} payment={p} showParent showStudent />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
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

function Stat({
  icon,
  label,
  value,
  subtitle,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtitle?: string
  tone: 'neutral' | 'success' | 'danger'
}) {
  return (
    <Card className={cn('border', TONE[tone])}>
      <CardHeader className="pb-1">
        <CardDescription className="flex items-center gap-1.5 text-xs opacity-80">
          {icon}
          {label}
        </CardDescription>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
      {subtitle && (
        <CardContent className="pt-0 text-xs opacity-80">{subtitle}</CardContent>
      )}
    </Card>
  )
}
