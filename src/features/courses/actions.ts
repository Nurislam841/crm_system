'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireUser } from '@/lib/auth/server'
import { db } from '@/lib/db/prisma'

import { createCourseSchema, updateCourseSchema } from './schemas'

export type CourseFormState =
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

function readForm(form: FormData) {
  return {
    name: form.get('name'),
    description: form.get('description'),
    monthlyPrice: form.get('monthlyPrice'),
  }
}

export async function createCourseAction(
  _prev: CourseFormState,
  form: FormData,
): Promise<CourseFormState> {
  const user = await requireUser()
  if (user.role !== 'ADMIN') {
    return { ok: false, message: 'Только администратор может создавать курсы' }
  }
  const parsed = createCourseSchema.safeParse(readForm(form))
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error) }
  }
  const course = await db.course.create({
    data: {
      tenantId: user.tenantId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      monthlyPrice: parsed.data.monthlyPrice.toFixed(2),
    },
  })
  revalidatePath('/courses')
  redirect(`/courses/${course.id}`)
}

export async function updateCourseAction(
  id: string,
  _prev: CourseFormState,
  form: FormData,
): Promise<CourseFormState> {
  const user = await requireUser()
  if (user.role !== 'ADMIN') {
    return { ok: false, message: 'Только администратор может менять курсы' }
  }
  const parsed = updateCourseSchema.safeParse(readForm(form))
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error) }
  }
  const existing = await db.course.findFirst({
    where: { id, tenantId: user.tenantId },
    select: { id: true },
  })
  if (!existing) return { ok: false, message: 'Курс не найден' }

  await db.course.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      monthlyPrice: parsed.data.monthlyPrice.toFixed(2),
    },
  })
  revalidatePath('/courses')
  revalidatePath(`/courses/${id}`)
  return { ok: true }
}

export async function archiveCourseAction(id: string) {
  const user = await requireUser()
  if (user.role !== 'ADMIN') return
  await db.course.updateMany({
    where: { id, tenantId: user.tenantId, archivedAt: null },
    data: { archivedAt: new Date() },
  })
  revalidatePath('/courses')
  redirect('/courses')
}

export async function unarchiveCourseAction(id: string) {
  const user = await requireUser()
  if (user.role !== 'ADMIN') return
  await db.course.updateMany({
    where: { id, tenantId: user.tenantId },
    data: { archivedAt: null },
  })
  revalidatePath('/courses')
  revalidatePath(`/courses/${id}`)
}
