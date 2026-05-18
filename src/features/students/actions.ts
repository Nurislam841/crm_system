'use server'

import { revalidatePath } from 'next/cache'

import { requireUser } from '@/lib/auth/server'
import { db } from '@/lib/db/prisma'

import { createStudentSchema, updateStudentSchema } from './schemas'

export type StudentFormState =
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

export async function createStudentAction(
  parentId: string,
  _prev: StudentFormState,
  form: FormData,
): Promise<StudentFormState> {
  try {
    const user = await requireUser()
    const parsed = createStudentSchema.safeParse({
      parentId,
      fullName: form.get('fullName'),
      birthDate: form.get('birthDate'),
      notes: form.get('notes'),
    })
    if (!parsed.success) {
      return { ok: false, fieldErrors: flatten(parsed.error) }
    }
    const parent = await db.parent.findFirst({
      where: { id: parentId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!parent) return { ok: false, message: 'Семья не найдена' }

    await db.student.create({
      data: {
        tenantId: user.tenantId,
        parentId,
        fullName: parsed.data.fullName,
        birthDate: parsed.data.birthDate ?? null,
        notes: parsed.data.notes ?? null,
      },
    })
    revalidatePath(`/parents/${parentId}`)
    revalidatePath('/parents')
    return { ok: true }
  } catch (e) {
    console.error('[createStudentAction]', e)
    const msg = e instanceof Error ? e.message : 'Не удалось добавить ученика'
    return { ok: false, message: msg }
  }
}

export async function updateStudentAction(
  studentId: string,
  _prev: StudentFormState,
  form: FormData,
): Promise<StudentFormState> {
  const user = await requireUser()
  const parsed = updateStudentSchema.safeParse({
    fullName: form.get('fullName'),
    birthDate: form.get('birthDate'),
    notes: form.get('notes'),
  })
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error) }
  }
  const student = await db.student.findFirst({
    where: { id: studentId, tenantId: user.tenantId, deletedAt: null },
    select: { id: true, parentId: true },
  })
  if (!student) return { ok: false, message: 'Ученик не найден' }

  await db.student.update({
    where: { id: studentId },
    data: {
      fullName: parsed.data.fullName,
      birthDate: parsed.data.birthDate ?? null,
      notes: parsed.data.notes ?? null,
    },
  })
  revalidatePath(`/parents/${student.parentId}`)
  return { ok: true }
}

export async function deleteStudentAction(studentId: string) {
  const user = await requireUser()
  const student = await db.student.findFirst({
    where: { id: studentId, tenantId: user.tenantId, deletedAt: null },
    select: { parentId: true },
  })
  if (!student) return
  await db.student.update({
    where: { id: studentId },
    data: { deletedAt: new Date() },
  })
  revalidatePath(`/parents/${student.parentId}`)
}
