import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Archive, ArchiveRestore, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  archiveCourseAction,
  deleteCourseAction,
  unarchiveCourseAction,
} from '@/features/courses/actions'
import { CourseForm } from '@/features/courses/components/course-form'
import { getCourse } from '@/features/courses/queries'
import { requireUser } from '@/lib/auth/server'

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireUser()
  if (user.role !== 'ADMIN') redirect('/courses')
  const { id } = await params
  const course = await getCourse(id)
  if (!course) notFound()

  const archive = async () => {
    'use server'
    await archiveCourseAction(id)
  }
  const unarchive = async () => {
    'use server'
    await unarchiveCourseAction(id)
  }
  const hardDelete = async () => {
    'use server'
    await deleteCourseAction(id)
  }

  const canHardDelete = course._count.enrollments === 0

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link
        href="/courses"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        К списку курсов
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{course.name}</CardTitle>
          <CardDescription>
            {course.archivedAt
              ? 'Курс в архиве. Новых зачислений не будет, существующие сохранены.'
              : 'Редактирование курса. Изменения не затрагивают уже выставленные платежи.'}
            {course._count.enrollments > 0 && (
              <span className="ml-1">
                На курсе {course._count.enrollments}{' '}
                {pluralEnrollments(course._count.enrollments)}.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CourseForm
            mode="edit"
            courseId={course.id}
            initialValues={{
              name: course.name,
              description: course.description,
              monthlyPrice: Number(course.monthlyPrice.toString()),
            }}
          />
          <Separator className="my-6" />
          <div className="flex flex-wrap gap-2">
            {course.archivedAt ? (
              <form action={unarchive}>
                <Button type="submit" variant="outline" size="sm">
                  <ArchiveRestore />
                  Вернуть из архива
                </Button>
              </form>
            ) : (
              <form action={archive}>
                <Button type="submit" variant="outline" size="sm">
                  <Archive />
                  Архивировать
                </Button>
              </form>
            )}
            {canHardDelete && (
              <form action={hardDelete}>
                <Button type="submit" variant="destructive" size="sm">
                  <Trash2 />
                  Удалить курс
                </Button>
              </form>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {canHardDelete
              ? 'На курсе нет зачислений — его можно удалить полностью. После добавления первого зачисления останется только архивация.'
              : 'Курс уже используется — доступна только архивация (история сохранится).'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function pluralEnrollments(n: number) {
  if (n === 1) return 'зачисление'
  if (n >= 2 && n <= 4) return 'зачисления'
  return 'зачислений'
}
