'use client'

import { useActionState, useRef } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { createStudentAction, type StudentFormState } from '../actions'

const initial: StudentFormState = null

export function AddStudentForm({
  parentId,
  autoFocus = false,
}: {
  parentId: string
  autoFocus?: boolean
}) {
  const action = createStudentAction.bind(null, parentId)
  const [state, formAction, isPending] = useActionState(action, initial)
  const formRef = useRef<HTMLFormElement>(null)
  if (state?.ok && formRef.current) formRef.current.reset()
  const errors = state && state.ok === false ? state.fieldErrors ?? {} : {}
  const topError = state && state.ok === false ? state.message : undefined

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor={`fullName-${parentId}`}>
            Имя ученика <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`fullName-${parentId}`}
            name="fullName"
            required
            placeholder="Например: Алина Алимова"
            autoFocus={autoFocus}
          />
          {errors.fullName && (
            <p className="text-xs text-destructive">{errors.fullName}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`birthDate-${parentId}`}>Дата рождения</Label>
          <Input id={`birthDate-${parentId}`} name="birthDate" type="date" />
          {errors.birthDate && (
            <p className="text-xs text-destructive">{errors.birthDate}</p>
          )}
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={isPending}>
            <Plus />
            {isPending ? 'Добавляем…' : 'Добавить ученика'}
          </Button>
        </div>
      </div>
      {topError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {topError}
        </p>
      )}
    </form>
  )
}
