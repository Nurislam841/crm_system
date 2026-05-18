import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Archive, ArchiveRestore } from 'lucide-react'

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
          {course.archivedAt ? (
            <form action={unarchive}>
              <Button type="submit" variant="outline" size="sm">
                <ArchiveRestore />
                Вернуть из архива
              </Button>
            </form>
          ) : (
            <form action={archive}>
              <Button type="submit" variant="destructive" size="sm">
                <Archive />
                Архивировать
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Курс перестанет появляться в списках, но останется в истории.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
