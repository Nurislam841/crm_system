'use client'

import { useActionState, useRef } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

import {
  createEnrollmentAction,
  type EnrollmentFormState,
} from '../actions'

const initial: EnrollmentFormState = null

export function AddEnrollmentForm({
  studentId,
  courses,
}: {
  studentId: string
  courses: { id: string; name: string }[]
}) {
  const action = createEnrollmentAction.bind(null, studentId)
  const [state, formAction, isPending] = useActionState(action, initial)
  const formRef = useRef<HTMLFormElement>(null)
  if (state?.ok && formRef.current) formRef.current.reset()
  const errors = state && state.ok === false ? state.fieldErrors ?? {} : {}
  const topError = state && state.ok === false ? state.message : undefined

  if (courses.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Сначала создайте курс в разделе «Курсы».
      </p>
    )
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[180px] space-y-1.5">
          <Label htmlFor={`courseId-${studentId}`} className="text-xs">
            Записать на курс
          </Label>
          <select
            id={`courseId-${studentId}`}
            name="courseId"
            className={cn(
              'flex h-8 w-full items-center rounded-md border border-input bg-transparent px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            )}
            defaultValue=""
            required
          >
            <option value="" disabled>
              Выберите…
            </option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm" disabled={isPending}>
          <Plus />
          {isPending ? 'Записываем…' : 'Записать'}
        </Button>
      </div>
      {errors.courseId && <p className="text-xs text-destructive">{errors.courseId}</p>}
      {topError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {topError}
        </p>
      )}
    </form>
  )
}
