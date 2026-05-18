'use client'

import { useActionState, useState } from 'react'
import { Pencil, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { updateParentAction, type ParentFormState } from '../actions'

const initial: ParentFormState = null

export function EditParentForm({
  parent,
}: {
  parent: { id: string; fullName: string; phone: string; email: string | null }
}) {
  const [isEditing, setIsEditing] = useState(false)
  const action = updateParentAction.bind(null, parent.id)
  const [state, formAction, isPending] = useActionState(action, initial)
  if (state?.ok && isEditing) {
    setIsEditing(false)
  }
  const errors = state && state.ok === false ? state.fieldErrors ?? {} : {}
  const topError = state && state.ok === false ? state.message : undefined

  if (!isEditing) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => setIsEditing(true)}
        title="Изменить контакты"
      >
        <Pencil />
        Изменить
      </Button>
    )
  }

  return (
    <form action={formAction} className="space-y-3 rounded-md border border-border bg-card p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`parent-name-${parent.id}`}>Имя родителя</Label>
          <Input
            id={`parent-name-${parent.id}`}
            name="fullName"
            defaultValue={parent.fullName}
            required
          />
          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`parent-phone-${parent.id}`}>Телефон</Label>
          <Input
            id={`parent-phone-${parent.id}`}
            name="phone"
            type="tel"
            defaultValue={parent.phone}
            required
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`parent-email-${parent.id}`}>Email</Label>
          <Input
            id={`parent-email-${parent.id}`}
            name="email"
            type="email"
            defaultValue={parent.email ?? ''}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>
      </div>
      {topError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {topError}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(false)}
          disabled={isPending}
        >
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
