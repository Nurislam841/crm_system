'use client'

import { useActionState, useRef, useState } from 'react'
import { CreditCard, CalendarClock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import {
  recordPaymentAction,
  schedulePaymentAction,
  type PaymentFormState,
} from '../actions'
import { PAYMENT_METHOD_LABEL_RU, PAYMENT_METHOD_VALUES } from '../schemas'

const initial: PaymentFormState = null

type EnrollmentOption = {
  id: string
  label: string
}

export function RecordPaymentForm({
  parentId,
  enrollments,
}: {
  parentId: string
  enrollments: EnrollmentOption[]
}) {
  const [mode, setMode] = useState<'received' | 'scheduled'>('received')
  const action =
    mode === 'received'
      ? recordPaymentAction.bind(null, parentId)
      : schedulePaymentAction.bind(null, parentId)
  const [state, formAction, isPending] = useActionState(action, initial)
  const formRef = useRef<HTMLFormElement>(null)
  if (state?.ok && formRef.current) formRef.current.reset()
  const errors = state && state.ok === false ? state.fieldErrors ?? {} : {}
  const topError = state && state.ok === false ? state.message : undefined

  const today = new Date().toISOString().slice(0, 10)

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="flex gap-1">
        <ModeButton active={mode === 'received'} onClick={() => setMode('received')}>
          <CreditCard className="size-3.5" />
          Получили
        </ModeButton>
        <ModeButton active={mode === 'scheduled'} onClick={() => setMode('scheduled')}>
          <CalendarClock className="size-3.5" />
          Запланировать
        </ModeButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="amount">
            Сумма, ₸ <span className="text-destructive">*</span>
          </Label>
          <Input
            id="amount"
            name="amount"
            inputMode="numeric"
            required
            placeholder="35000"
          />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
        </div>
        {mode === 'received' ? (
          <div className="space-y-1.5">
            <Label htmlFor="paidAt">
              Дата получения <span className="text-destructive">*</span>
            </Label>
            <Input id="paidAt" name="paidAt" type="date" defaultValue={today} required />
            {errors.paidAt && <p className="text-xs text-destructive">{errors.paidAt}</p>}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="dueAt">
              Срок <span className="text-destructive">*</span>
            </Label>
            <Input id="dueAt" name="dueAt" type="date" defaultValue={today} required />
            {errors.dueAt && <p className="text-xs text-destructive">{errors.dueAt}</p>}
          </div>
        )}
      </div>

      {mode === 'received' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="method">
              Метод <span className="text-destructive">*</span>
            </Label>
            <select
              id="method"
              name="method"
              required
              defaultValue=""
              className={cn(
                'flex h-9 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              )}
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
            {errors.method && <p className="text-xs text-destructive">{errors.method}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reference">№ чека / референс</Label>
            <Input id="reference" name="reference" placeholder="Опционально" />
          </div>
        </div>
      )}

      {enrollments.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="enrollmentId">Привязать к зачислению</Label>
          <select
            id="enrollmentId"
            name="enrollmentId"
            defaultValue=""
            className={cn(
              'flex h-9 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            )}
          >
            <option value="">Без привязки</option>
            {enrollments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
          {errors.enrollmentId && (
            <p className="text-xs text-destructive">{errors.enrollmentId}</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="notes">Заметки</Label>
        <Textarea id="notes" name="notes" rows={2} placeholder="Опционально" />
      </div>

      {topError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {topError}
        </p>
      )}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? 'Сохраняем…'
            : mode === 'received'
              ? 'Зафиксировать платёж'
              : 'Запланировать'}
        </Button>
      </div>
    </form>
  )
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition',
        active
          ? 'border-foreground/30 bg-foreground text-background'
          : 'border-border bg-background hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}
