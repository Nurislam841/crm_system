'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import {
  createCourseAction,
  updateCourseAction,
  type CourseFormState,
} from '../actions'

type Initial = {
  name?: string
  description?: string | null
  monthlyPrice?: number | string | null
}

const initial: CourseFormState = null

export function CourseForm({
  mode,
  courseId,
  initialValues,
}: {
  mode: 'create' | 'edit'
  courseId?: string
  initialValues?: Initial
}) {
  const action =
    mode === 'create' ? createCourseAction : updateCourseAction.bind(null, courseId!)
  const [state, formAction, isPending] = useActionState(action, initial)
  const errors = state && state.ok === false ? state.fieldErrors ?? {} : {}
  const topError = state && state.ok === false ? state.message : undefined
  const priceDefault =
    initialValues?.monthlyPrice == null
      ? ''
      : typeof initialValues.monthlyPrice === 'string'
        ? initialValues.monthlyPrice
        : String(initialValues.monthlyPrice)

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">
          Название <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={initialValues?.name ?? ''}
          placeholder="Английский для младших"
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="monthlyPrice">
          Стоимость в месяц, ₸ <span className="text-destructive">*</span>
        </Label>
        <Input
          id="monthlyPrice"
          name="monthlyPrice"
          required
          inputMode="numeric"
          defaultValue={priceDefault}
          placeholder="35000"
        />
        {errors.monthlyPrice && (
          <p className="text-xs text-destructive">{errors.monthlyPrice}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initialValues?.description ?? ''}
          placeholder="Опционально — для своих заметок"
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description}</p>
        )}
      </div>
      {topError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {topError}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? 'Сохраняем…'
            : mode === 'create'
              ? 'Создать курс'
              : 'Сохранить изменения'}
        </Button>
        <Link href="/courses" className={buttonVariants({ variant: 'ghost' })}>
          Отмена
        </Link>
      </div>
    </form>
  )
}
