'use client'

import { useState, useTransition } from 'react'
import { Check, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatKzt } from '@/lib/money'
import { cn } from '@/lib/utils'

import { deletePaymentAction, markPaidAction } from '../actions'
import { PAYMENT_METHOD_LABEL_RU, PAYMENT_METHOD_VALUES } from '../schemas'
import type { PaymentRow as PaymentRowType } from '../queries'

const DATE_FMT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: '2-digit',
  timeZone: 'Asia/Almaty',
})

export function PaymentRow({
  payment,
  showParent = false,
  showStudent = true,
}: {
  payment: PaymentRowType
  showParent?: boolean
  showStudent?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [showMarkPaid, setShowMarkPaid] = useState(false)

  const isPaid = !!payment.paidAt
  const isOverdue = !isPaid && payment.dueAt.getTime() < Date.now()
  const tone = isPaid ? 'paid' : isOverdue ? 'overdue' : 'scheduled'

  function markPaid(form: FormData) {
    startTransition(async () => {
      const res = await markPaidAction({
        paymentId: payment.id,
        paidAt: String(form.get('paidAt') ?? ''),
        method: String(form.get('method') ?? ''),
        reference: String(form.get('reference') ?? '') || undefined,
      })
      if (!res.ok) alert(res.message ?? 'Не получилось')
      else setShowMarkPaid(false)
    })
  }

  function remove() {
    if (!confirm('Удалить платёж? Это действие необратимо.')) return
    startTransition(async () => {
      await deletePaymentAction(payment.id)
    })
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <li
      className={cn(
        'rounded-lg border p-3',
        tone === 'paid' && 'border-emerald-300/40 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-950/20',
        tone === 'overdue' && 'border-rose-300/40 bg-rose-50/40 dark:border-rose-500/20 dark:bg-rose-950/20',
        tone === 'scheduled' && 'border-border bg-card',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-base font-medium">
            {formatKzt(Number(payment.amount.toString()))}
            <span
              className={cn(
                'inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                tone === 'paid' && 'bg-emerald-200 text-emerald-900 dark:bg-emerald-500/30 dark:text-emerald-200',
                tone === 'overdue' && 'bg-rose-200 text-rose-900 dark:bg-rose-500/30 dark:text-rose-200',
                tone === 'scheduled' && 'bg-muted text-muted-foreground',
              )}
            >
              {tone === 'paid' ? 'Оплачен' : tone === 'overdue' ? 'Просрочен' : 'Ожидается'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {isPaid && payment.paidAt ? (
              <span>оплачен {DATE_FMT.format(payment.paidAt)}</span>
            ) : (
              <span>до {DATE_FMT.format(payment.dueAt)}</span>
            )}
            {payment.method && (
              <span>· {PAYMENT_METHOD_LABEL_RU[payment.method as keyof typeof PAYMENT_METHOD_LABEL_RU]}</span>
            )}
            {payment.reference && <span>· {payment.reference}</span>}
            {showParent && (
              <span>· {payment.parent.fullName}</span>
            )}
            {showStudent && payment.enrollment && (
              <span>
                · {payment.enrollment.student.fullName} / {payment.enrollment.course.name}
              </span>
            )}
          </div>
          {payment.notes && (
            <p className="mt-1 text-xs text-muted-foreground">{payment.notes}</p>
          )}
        </div>
        <div className="flex gap-1">
          {!isPaid && (
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => setShowMarkPaid((v) => !v)}
              disabled={isPending}
            >
              <Check />
              Получили
            </Button>
          )}
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={remove}
            disabled={isPending}
            title="Удалить платёж"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      {showMarkPaid && !isPaid && (
        <form
          action={markPaid}
          className="mt-3 grid gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-[1fr_1fr_1.5fr_auto]"
        >
          <div className="space-y-1">
            <Label htmlFor={`mp-paidAt-${payment.id}`} className="text-xs">
              Дата
            </Label>
            <Input
              id={`mp-paidAt-${payment.id}`}
              name="paidAt"
              type="date"
              defaultValue={today}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`mp-method-${payment.id}`} className="text-xs">
              Метод
            </Label>
            <select
              id={`mp-method-${payment.id}`}
              name="method"
              required
              defaultValue=""
              className="flex h-9 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="" disabled>
                Выберите…
              </option>
              {PAYMENT_METHOD_VALUES.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABEL_RU[m]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`mp-ref-${payment.id}`} className="text-xs">
              № чека / референс
            </Label>
            <Input id={`mp-ref-${payment.id}`} name="reference" placeholder="опционально" />
          </div>
          <div className="flex items-end">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? '…' : 'OK'}
            </Button>
          </div>
        </form>
      )}
    </li>
  )
}
