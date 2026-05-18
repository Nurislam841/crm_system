'use server'

import { revalidatePath } from 'next/cache'

import { requireUser } from '@/lib/auth/server'
import { db } from '@/lib/db/prisma'

import { createEnrollmentSchema } from './schemas'

export type EnrollmentFormState =
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

export async function createEnrollmentAction(
  studentId: string,
  _prev: EnrollmentFormState,
  form: FormData,
): Promise<EnrollmentFormState> {
  try {
    const user = await requireUser()
    const parsed = createEnrollmentSchema.safeParse({
      studentId,
      courseId: form.get('courseId'),
    })
    if (!parsed.success) {
      return { ok: false, fieldErrors: flatten(parsed.error) }
    }

    const student = await db.student.findFirst({
      where: { id: studentId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true, parentId: true },
    })
    if (!student) return { ok: false, message: 'Ученик не найден' }

    const course = await db.course.findFirst({
      where: { id: parsed.data.courseId, tenantId: user.tenantId, archivedAt: null },
      select: { id: true },
    })
    if (!course) {
      return { ok: false, fieldErrors: { courseId: 'Курс не найден или в архиве' } }
    }

    const existing = await db.enrollment.findFirst({
      where: {
        tenantId: user.tenantId,
        studentId,
        courseId: parsed.data.courseId,
        endedAt: null,
      },
      select: { id: true },
    })
    if (existing) {
      return { ok: false, message: 'Ученик уже записан на этот курс' }
    }

    await db.enrollment.create({
      data: {
        tenantId: user.tenantId,
        studentId,
        courseId: parsed.data.courseId,
      },
    })

    revalidatePath(`/parents/${student.parentId}`)
    return { ok: true }
  } catch (e) {
    console.error('[createEnrollmentAction]', e)
    const msg = e instanceof Error ? e.message : 'Не удалось записать на курс'
    return { ok: false, message: msg }
  }
}

export async function endEnrollmentAction(enrollmentId: string) {
  const user = await requireUser()
  const enrollment = await db.enrollment.findFirst({
    where: { id: enrollmentId, tenantId: user.tenantId, endedAt: null },
    include: { student: { select: { parentId: true } } },
  })
  if (!enrollment) return
  await db.enrollment.update({
    where: { id: enrollmentId },
    data: { endedAt: new Date() },
  })
  revalidatePath(`/parents/${enrollment.student.parentId}`)
}
