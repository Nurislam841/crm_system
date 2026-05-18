'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { ACQUISITION_SOURCES, SOURCE_LABEL_RU } from '../lib/sources'
import { LEAD_STAGES, STAGE_LABEL_RU } from '../lib/stages'
import {
  createLeadAction,
  updateLeadAction,
  type LeadFormState,
} from '../actions'

type LeadFormValues = {
  parentName?: string | null
  parentPhone?: string | null
  parentEmail?: string | null
  childName?: string | null
  childAge?: number | null
  acquisitionSource?: string | null
  notes?: string | null
  stage?: string | null
}

type Props = {
  mode: 'create' | 'edit'
  leadId?: string
  initial?: LeadFormValues
}

const initialState: LeadFormState = null

export function LeadForm({ mode, leadId, initial }: Props) {
  const action =
    mode === 'create'
      ? createLeadAction
      : updateLeadAction.bind(null, leadId!)

  const [state, formAction, isPending] = useActionState(action, initialState)
  const errors = state && state.ok === false ? state.fieldErrors ?? {} : {}
  const topError = state && state.ok === false ? state.message : undefined

  return (
    <form action={formAction} className="space-y-5">
      <FieldGroup>
        <Field label="Имя родителя" name="parentName" error={errors.parentName} required>
          <Input
            id="parentName"
            name="parentName"
            defaultValue={initial?.parentName ?? ''}
            autoComplete="name"
            required
          />
        </Field>
        <Field
          label="Телефон"
          name="parentPhone"
          error={errors.parentPhone}
          hint="+7XXXXXXXXXX"
          required
        >
          <Input
            id="parentPhone"
            name="parentPhone"
            type="tel"
            inputMode="tel"
            placeholder="+77001234567"
            defaultValue={initial?.parentPhone ?? ''}
            required
          />
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field label="Email родителя" name="parentEmail" error={errors.parentEmail}>
          <Input
            id="parentEmail"
            name="parentEmail"
            type="email"
            defaultValue={initial?.parentEmail ?? ''}
            autoComplete="email"
          />
        </Field>
        <Field label="Источник" name="acquisitionSource" error={errors.acquisitionSource} required>
          <NativeSelect
            id="acquisitionSource"
            name="acquisitionSource"
            defaultValue={initial?.acquisitionSource ?? ''}
            required
          >
            <option value="" disabled>
              Выберите источник…
            </option>
            {ACQUISITION_SOURCES.map((src) => (
              <option key={src} value={src}>
                {SOURCE_LABEL_RU[src]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field label="Имя ребёнка" name="childName" error={errors.childName}>
          <Input id="childName" name="childName" defaultValue={initial?.childName ?? ''} />
        </Field>
        <Field label="Возраст" name="childAge" error={errors.childAge}>
          <Input
            id="childAge"
            name="childAge"
            type="number"
            inputMode="numeric"
            min={2}
            max={99}
            defaultValue={initial?.childAge ?? ''}
          />
        </Field>
      </FieldGroup>

      {mode === 'edit' && (
        <Field label="Этап" name="stage" error={errors.stage} required>
          <NativeSelect
            id="stage"
            name="stage"
            defaultValue={initial?.stage ?? 'NEW'}
            required
          >
            {LEAD_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABEL_RU[stage]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}

      <Field label="Заметки" name="notes" error={errors.notes}>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={initial?.notes ?? ''}
          placeholder="Откуда узнали, что ищут, какие пожелания…"
        />
      </Field>

      {topError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {topError}
          {state && state.ok === false && state.duplicateOfId ? (
            <>
              {' · '}
              <Link
                href={`/leads/${state.duplicateOfId}`}
                className="underline underline-offset-2"
              >
                Открыть существующего
              </Link>
            </>
          ) : null}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? 'Сохраняем…'
            : mode === 'create'
              ? 'Создать лид'
              : 'Сохранить изменения'}
        </Button>
        <Link
          href={mode === 'edit' && leadId ? `/leads/${leadId}` : '/leads'}
          className={buttonVariants({ variant: 'ghost' })}
        >
          Отмена
        </Link>
      </div>
    </form>
  )
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}

function Field({
  label,
  name,
  error,
  hint,
  required,
  children,
}: {
  label: string
  name: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function NativeSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'flex h-9 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    />
  )
}
