'use server'

import { revalidatePath } from 'next/cache'

import { requireUser } from '@/lib/auth/server'
import { db } from '@/lib/db/prisma'

import { updateParentSchema } from './schemas'

export type ParentFormState =
  | null
  | { ok: false; message?: string; fieldErrors?: Partial<Record<string, string>> }
  | { ok: true }

function flatten(error: import('zod').ZodError) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

export async function updateParentAction(
  parentId: string,
  _prev: ParentFormState,
  form: FormData,
): Promise<ParentFormState> {
  try {
    const user = await requireUser()
    const parsed = updateParentSchema.safeParse({
      fullName: form.get('fullName'),
      phone: form.get('phone'),
      email: form.get('email'),
    })
    if (!parsed.success) return { ok: false, fieldErrors: flatten(parsed.error) }

    const existing = await db.parent.findFirst({
      where: { id: parentId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true, phone: true },
    })
    if (!existing) return { ok: false, message: 'Семья не найдена' }

    if (existing.phone !== parsed.data.phone) {
      const dup = await db.parent.findFirst({
        where: {
          tenantId: user.tenantId,
          phone: parsed.data.phone,
          deletedAt: null,
          NOT: { id: parentId },
        },
        select: { id: true, fullName: true },
      })
      if (dup) {
        return {
          ok: false,
          fieldErrors: { phone: `Уже занят: ${dup.fullName}` },
        }
      }
    }

    await db.parent.update({
      where: { id: parentId },
      data: {
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email,
      },
    })

    revalidatePath(`/parents/${parentId}`)
    revalidatePath('/parents')
    return { ok: true }
  } catch (e) {
    console.error('[updateParentAction]', e)
    const msg = e instanceof Error ? e.message : 'Не удалось сохранить'
    return { ok: false, message: msg }
  }
}
