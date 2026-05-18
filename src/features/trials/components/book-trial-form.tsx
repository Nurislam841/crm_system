'use client'

import { useActionState, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { bookTrialAction, type TrialFormState } from '../actions'

const initial: TrialFormState = null

export function BookTrialForm({ leadId }: { leadId: string }) {
  const action = bookTrialAction.bind(null, leadId)
  const [state, formAction, isPending] = useActionState(action, initial)
  const formRef = useRef<HTMLFormElement>(null)

  if (state?.ok && formRef.current) formRef.current.reset()

  const errors = state && state.ok === false ? state.fieldErrors ?? {} : {}
  const topError = state && state.ok === false ? state.message : undefined

  // Default value: tomorrow at 12:00 local time
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(12, 0, 0, 0)
  const defaultValue = toDatetimeLocal(tomorrow)

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="trial-when">Дата и время</Label>
          <Input
            id="trial-when"
            name="scheduledAt"
            type="datetime-local"
            defaultValue={defaultValue}
            required
          />
          {errors.scheduledAt && (
            <p className="text-xs text-destructive">{errors.scheduledAt}</p>
          )}
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Записываем…' : 'Записать на пробный'}
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="trial-notes">Заметки (опционально)</Label>
        <Textarea
          id="trial-notes"
          name="notes"
          rows={2}
          placeholder="С каким педагогом, кабинет, на что обратить внимание…"
        />
        {errors.notes && <p className="text-xs text-destructive">{errors.notes}</p>}
      </div>
      {topError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {topError}
        </p>
      )}
    </form>
  )
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
