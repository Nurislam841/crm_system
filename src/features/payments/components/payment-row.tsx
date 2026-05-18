'use client'

import { useActionState, useState, useTransition } from 'react'
import { Check, Pencil, Trash2, Undo2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatKzt } from '@/lib/money'
import { cn } from '@/lib/utils'

import {
  deletePaymentAction,
  markPaidAction,
  refundPaymentAction,
  updatePaymentAction,
  type PaymentFormState,
} from '../actions'
import { PAYMENT_METHOD_LABEL_RU, PAYMENT_METHOD_VALUES } from '../schemas'
import type { PaymentRow as PaymentRowType } from '../queries'

const DATE_FMT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: '2-digit',
  timeZone: 'Asia/Almaty',
})

type Mode = 'view' | 'mark-paid' | 'edit' | 'refund'

export function PaymentRow({
  payment,
  showParent = false,
  showStudent = true,
  isAdmin = false,
}: {
  payment: PaymentRowType
  showParent?: boolean
  showStudent?: boolean
  isAdmin?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<Mode>('view')

  const isPaid = !!payment.paidAt
  const isRefunded = !!payment.refundedAt
  const isOverdue = !isPaid && !isRefunded && payment.dueAt.getTime() < Date.now()
  const tone = isRefunded
    ? 'refunded'
    : isPaid
      ? 'paid'
      : isOverdue
        ? 'overdue'
        : 'scheduled'

  function markPaid(form: FormData) {
    startTransition(async () => {
      const res = await markPaidAction({
        paymentId: payment.id,
        paidAt: String(form.get('paidAt') ?? ''),
        method: String(form.get('method') ?? ''),
        reference: String(form.get('reference') ?? '') || undefined,
      })
      if (!res.ok) alert(res.message ?? 'Не получилось')
      else setMode('view')
    })
  }

  function remove() {
    if (!confirm('Удалить платёж? Это действие необратимо.')) return
    startTransition(async () => {
      const res = await deletePaymentAction(payment.id)
      if (res && !res.ok) alert(res.message ?? 'Не получилось удалить')
    })
  }

  const today = new Date().toISOString().slice(0, 10)
  const amount = Number(payment.amount.toString())
  const refundedAmount = payment.refundedAmount
    ? Number(payment.refundedAmount.toString())
    : 0

  return (
    <li
      className={cn(
        'rounded-lg border p-3',
        tone === 'paid' && 'border-emerald-300/40 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-950/20',
        tone === 'overdue' && 'border-rose-300/40 bg-rose-50/40 dark:border-rose-500/20 dark:bg-rose-950/20',
        tone === 'scheduled' && 'border-border bg-card',
        tone === 'refunded' && 'border-amber-300/40 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-950/20',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-base font-medium">
            <span className={cn(isRefunded && 'line-through opacity-70')}>
              {formatKzt(amount)}
            </span>
            <StatusBadge tone={tone} />
            {isRefunded && refundedAmount > 0 && refundedAmount < amount && (
              <span className="text-xs text-muted-foreground">
                (возврат {formatKzt(refundedAmount)})
              </span>
            )}
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
            {showParent && <span>· {payment.parent.fullName}</span>}
            {showStudent && payment.enrollment && (
              <span>
                · {payment.enrollment.student.fullName} / {payment.enrollment.course.name}
              </span>
            )}
            {isRefunded && payment.refundedAt && (
              <span>· возврат {DATE_FMT.format(payment.refundedAt)}</span>
            )}
          </div>
          {payment.notes && (
            <p className="mt-1 text-xs text-muted-foreground">{payment.notes}</p>
          )}
          {payment.refundReason && (
            <p className="mt-1 text-xs italic text-amber-700 dark:text-amber-300">
              Причина возврата: {payment.refundReason}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {!isPaid && !isRefunded && (
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => setMode(mode === 'mark-paid' ? 'view' : 'mark-paid')}
              disabled={isPending}
            >
              <Check />
              Получили
            </Button>
          )}
          {isAdmin && isPaid && !isRefunded && (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => setMode(mode === 'refund' ? 'view' : 'refund')}
              disabled={isPending}
              title="Оформить возврат"
            >
              <Undo2 />
            </Button>
          )}
          {isAdmin && (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
              disabled={isPending}
              title="Редактировать платёж"
            >
              <Pencil />
            </Button>
          )}
          {isAdmin && (
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
          )}
        </div>
      </div>

      {mode === 'mark-paid' && !isPaid && (
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

      {mode === 'refund' && isAdmin && isPaid && !isRefunded && (
        <RefundForm
          paymentId={payment.id}
          maxAmount={amount}
          onDone={() => setMode('view')}
        />
      )}

      {mode === 'edit' && isAdmin && (
        <EditForm payment={payment} onDone={() => setMode('view')} />
      )}
    </li>
  )
}

function StatusBadge({ tone }: { tone: 'paid' | 'overdue' | 'scheduled' | 'refunded' }) {
  const label =
    tone === 'paid'
      ? 'Оплачен'
      : tone === 'overdue'
        ? 'Просрочен'
        : tone === 'refunded'
          ? 'Возврат'
          : 'Ожидается'
  return (
    <span
      className={cn(
        'inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        tone === 'paid' && 'bg-emerald-200 text-emerald-900 dark:bg-emerald-500/30 dark:text-emerald-200',
        tone === 'overdue' && 'bg-rose-200 text-rose-900 dark:bg-rose-500/30 dark:text-rose-200',
        tone === 'scheduled' && 'bg-muted text-muted-foreground',
        tone === 'refunded' && 'bg-amber-200 text-amber-900 dark:bg-amber-500/30 dark:text-amber-200',
      )}
    >
      {label}
    </span>
  )
}

function RefundForm({
  paymentId,
  maxAmount,
  onDone,
}: {
  paymentId: string
  maxAmount: number
  onDone: () => void
}) {
  const action = refundPaymentAction.bind(null, paymentId)
  const [state, formAction, isPending] = useActionState<PaymentFormState, FormData>(
    action,
    null,
  )
  if (state?.ok) onDone()
  const errors = state && state.ok === false ? state.fieldErrors ?? {} : {}
  const topError = state && state.ok === false ? state.message : undefined
  const today = new Date().toISOString().slice(0, 10)

  return (
    <form
      action={formAction}
      className="mt-3 space-y-2 rounded-md border border-amber-300/40 bg-amber-50/50 p-3 dark:border-amber-500/30 dark:bg-amber-950/30"
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_2fr]">
        <div className="space-y-1">
          <Label htmlFor={`r-amt-${paymentId}`} className="text-xs">
            Сумма возврата
          </Label>
          <Input
            id={`r-amt-${paymentId}`}
            name="refundedAmount"
            defaultValue={maxAmount}
            required
          />
          {errors.refundedAmount && (
            <p className="text-xs text-destructive">{errors.refundedAmount}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`r-date-${paymentId}`} className="text-xs">
            Дата
          </Label>
          <Input
            id={`r-date-${paymentId}`}
            name="refundedAt"
            type="date"
            defaultValue={today}
            required
          />
          {errors.refundedAt && (
            <p className="text-xs text-destructive">{errors.refundedAt}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`r-reason-${paymentId}`} className="text-xs">
            Причина (опционально)
          </Label>
          <Input
            id={`r-reason-${paymentId}`}
            name="refundReason"
            placeholder="Перенос в другую школу / ошибочный платёж…"
          />
        </div>
      </div>
      {topError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {topError}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={isPending}>
          <X />
          Отмена
        </Button>
        <Button type="submit" size="sm" variant="destructive" disabled={isPending}>
          <Undo2 />
          {isPending ? 'Оформляем…' : 'Оформить возврат'}
        </Button>
      </div>
    </form>
  )
}

function EditForm({
  payment,
  onDone,
}: {
  payment: PaymentRowType
  onDone: () => void
}) {
  const action = updatePaymentAction.bind(null, payment.id)
  const [state, formAction, isPending] = useActionState<PaymentFormState, FormData>(
    action,
    null,
  )
  if (state?.ok) onDone()
  const errors = state && state.ok === false ? state.fieldErrors ?? {} : {}
  const topError = state && state.ok === false ? state.message : undefined

  const dueDate = payment.dueAt.toISOString().slice(0, 10)
  const paidDate = payment.paidAt
    ? payment.paidAt.toISOString().slice(0, 10)
    : ''

  return (
    <form
      action={formAction}
      className="mt-3 space-y-2 rounded-md border border-border bg-background p-3"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`e-amt-${payment.id}`} className="text-xs">
            Сумма
          </Label>
          <Input
            id={`e-amt-${payment.id}`}
            name="amount"
            defaultValue={Number(payment.amount.toString())}
            required
          />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`e-due-${payment.id}`} className="text-xs">
            Срок
          </Label>
          <Input
            id={`e-due-${payment.id}`}
            name="dueAt"
            type="date"
            defaultValue={dueDate}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`e-paid-${payment.id}`} className="text-xs">
            Оплачен (если есть)
          </Label>
          <Input
            id={`e-paid-${payment.id}`}
            name="paidAt"
            type="date"
            defaultValue={paidDate}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`e-method-${payment.id}`} className="text-xs">
            Метод
          </Label>
          <select
            id={`e-method-${payment.id}`}
            name="method"
            defaultValue={payment.method ?? ''}
            className="flex h-9 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">—</option>
            {PAYMENT_METHOD_VALUES.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABEL_RU[m]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`e-ref-${payment.id}`} className="text-xs">
            № чека / референс
          </Label>
          <Input
            id={`e-ref-${payment.id}`}
            name="reference"
            defaultValue={payment.reference ?? ''}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`e-notes-${payment.id}`} className="text-xs">
            Заметки
          </Label>
          <Input
            id={`e-notes-${payment.id}`}
            name="notes"
            defaultValue={payment.notes ?? ''}
          />
        </div>
      </div>
      {topError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {topError}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={isPending}>
          <X />
          Отмена
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </div>
    </form>
  )
}
