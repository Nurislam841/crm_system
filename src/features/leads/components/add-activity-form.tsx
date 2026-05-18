'use client'

import { useActionState, useRef, useState } from 'react'
import { MessageSquare, Phone } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { addActivityAction, type AddActivityState } from '../actions'

const initial: AddActivityState = null

export function AddActivityForm({ leadId }: { leadId: string }) {
  const [type, setType] = useState<'note' | 'call'>('note')
  const formRef = useRef<HTMLFormElement>(null)
  const action = addActivityAction.bind(null, leadId)
  const [state, formAction, isPending] = useActionState(action, initial)
  const error =
    state && state.ok === false
      ? state.fieldErrors?.body ?? state.message
      : undefined

  if (state?.ok && formRef.current) {
    formRef.current.reset()
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="type" value={type} />
      <div className="flex gap-1">
        <TypeButton active={type === 'note'} onClick={() => setType('note')}>
          <MessageSquare className="size-3.5" /> Заметка
        </TypeButton>
        <TypeButton active={type === 'call'} onClick={() => setType('call')}>
          <Phone className="size-3.5" /> Звонок
        </TypeButton>
      </div>
      <Textarea
        name="body"
        rows={3}
        placeholder={
          type === 'call'
            ? 'Что обсудили на звонке?'
            : 'Добавьте заметку — что узнали, договорились…'
        }
        required
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button size="sm" type="submit" disabled={isPending}>
          {isPending ? 'Сохраняем…' : 'Добавить'}
        </Button>
      </div>
    </form>
  )
}

function TypeButton({
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
