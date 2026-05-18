'use client'

import { useTransition } from 'react'
import type { Prisma } from '@prisma/client'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatKzt } from '@/lib/money'
import { cn } from '@/lib/utils'

import { cancelPlanAction } from '../actions'

type PlanWithPayments = {
  id: string
  totalAmount: Prisma.Decimal
  installments: number
  payments: {
    id: string
    amount: Prisma.Decimal
    dueAt: Date
    paidAt: Date | null
  }[]
}

const DATE_FMT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  timeZone: 'Asia/Almaty',
})

export function PlanSummary({ plan }: { plan: PlanWithPayments }) {
  const [isPending, startTransition] = useTransition()

  function cancel() {
    if (
      !confirm(
        'Отменить план? Запланированные неоплаченные платежи будут удалены. Оплаченные останутся в истории.',
      )
    )
      return
    startTransition(async () => {
      const res = await cancelPlanAction(plan.id)
      if (!res.ok) alert(res.message ?? 'Не получилось')
    })
  }

  const paid = plan.payments.filter((p) => p.paidAt).length
  const paidAmount = plan.payments
    .filter((p) => p.paidAt)
    .reduce((sum, p) => sum + Number(p.amount.toString()), 0)
  const total = Number(plan.totalAmount.toString())

  return (
    <div className="rounded-md border border-border bg-muted/40 p-2.5 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs">
          <span className="font-medium">Рассрочка:</span>{' '}
          <span className="text-muted-foreground">
            {formatKzt(total)} / {plan.installments} платежей · оплачено {paid}/{plan.installments}
            {paid > 0 && (
              <> · {formatKzt(paidAmount)}</>
            )}
          </span>
        </div>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={cancel}
          disabled={isPending}
          title="Отменить план"
        >
          <Trash2 />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {plan.payments.map((p, idx) => (
          <PaymentChip key={p.id} index={idx + 1} payment={p} />
        ))}
      </div>
    </div>
  )
}

function PaymentChip({
  index,
  payment,
}: {
  index: number
  payment: { dueAt: Date; paidAt: Date | null }
}) {
  const isPaid = !!payment.paidAt
  const isOverdue = !isPaid && payment.dueAt.getTime() < Date.now()
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]',
        isPaid && 'bg-emerald-200 text-emerald-900 dark:bg-emerald-500/30 dark:text-emerald-200',
        isOverdue && 'bg-rose-200 text-rose-900 dark:bg-rose-500/30 dark:text-rose-200',
        !isPaid && !isOverdue && 'bg-background text-muted-foreground border border-border',
      )}
      title={isPaid ? `Оплачен` : `Срок ${DATE_FMT.format(payment.dueAt)}`}
    >
      #{index} {DATE_FMT.format(payment.dueAt)}
    </span>
  )
}
