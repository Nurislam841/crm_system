'use client'

import { useActionState, useState } from 'react'
import { CalendarClock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatKzt } from '@/lib/money'

import { createPlanAction, type PlanFormState } from '../actions'

const initial: PlanFormState = null

export function CreatePlanForm({
  enrollmentId,
  enrollmentLabel,
  suggestedMonthly,
}: {
  enrollmentId: string
  enrollmentLabel: string
  suggestedMonthly: number
}) {
  const [show, setShow] = useState(false)
  const [state, formAction, isPending] = useActionState(createPlanAction, initial)
  const errors = state && state.ok === false ? state.fieldErrors ?? {} : {}
  const topError = state && state.ok === false ? state.message : undefined

  // First-of-next-month default
  const today = new Date()
  const firstOfNext = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const defaultDate = firstOfNext.toISOString().slice(0, 10)

  if (state?.ok && show) {
    // Form just succeeded — collapse it
    setTimeout(() => setShow(false), 0)
  }

  if (!show) {
    return (
      <Button
        type="button"
        size="xs"
        variant="outline"
        onClick={() => setShow(true)}
      >
        <CalendarClock />
        Создать рассрочку
      </Button>
    )
  }

  return (
    <form action={formAction} className="space-y-3 rounded-md border border-border bg-background p-3">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <div className="text-xs font-medium text-muted-foreground">
        Рассрочка для: {enrollmentLabel}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`monthly-${enrollmentId}`} className="text-xs">
            Сумма в месяц, ₸
          </Label>
          <Input
            id={`monthly-${enrollmentId}`}
            name="monthlyAmount"
            inputMode="numeric"
            required
            defaultValue={suggestedMonthly}
          />
          {errors.monthlyAmount && (
            <p className="text-xs text-destructive">{errors.monthlyAmount}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`count-${enrollmentId}`} className="text-xs">
            Кол-во месяцев
          </Label>
          <Input
            id={`count-${enrollmentId}`}
            name="installments"
            type="number"
            inputMode="numeric"
            min={1}
            max={48}
            required
            defaultValue={4}
          />
          {errors.installments && (
            <p className="text-xs text-destructive">{errors.installments}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`first-${enrollmentId}`} className="text-xs">
            Первая дата
          </Label>
          <Input
            id={`first-${enrollmentId}`}
            name="firstDueAt"
            type="date"
            required
            defaultValue={defaultDate}
          />
          {errors.firstDueAt && (
            <p className="text-xs text-destructive">{errors.firstDueAt}</p>
          )}
        </div>
      </div>
      {topError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {topError}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Создастся {`{`} N {`}`} платежей по {formatKzt(suggestedMonthly)} с шагом в месяц. Можно редактировать каждый отдельно после создания.
      </p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Создаём…' : 'Создать'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setShow(false)}
        >
          Отмена
        </Button>
      </div>
    </form>
  )
}
