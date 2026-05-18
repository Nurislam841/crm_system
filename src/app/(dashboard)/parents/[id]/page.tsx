import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, BookOpen, CalendarDays, Phone } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getParent } from '@/features/parents/queries'
import { AddStudentForm } from '@/features/students/components/add-student-form'
import { requireUser } from '@/lib/auth/server'

const BIRTH_FMT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Almaty',
})

export default async function ParentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireUser()
  const { id } = await params
  const parent = await getParent(id)
  if (!parent) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/parents"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        К списку семей
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{parent.fullName}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <Phone className="size-3" />
              {parent.phone}
            </span>
            {parent.email && <span>{parent.email}</span>}
            <span>
              на платформе с {BIRTH_FMT.format(parent.createdAt)}
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Дети</CardTitle>
          <CardDescription>
            Добавьте ученика — потом запишете на курс и настроите оплату.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <AddStudentForm parentId={parent.id} />
          <Separator />
          {parent.students.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Пока ни одного ребёнка не добавлено.
            </p>
          ) : (
            <ul className="space-y-2">
              {parent.students.map((s) => {
                const enrolledCourses = s.enrollments.map((e) => e.course.name)
                return (
                  <li
                    key={s.id}
                    className="rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="font-medium">{s.fullName}</div>
                        {s.birthDate && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="size-3" />
                            {BIRTH_FMT.format(s.birthDate)}
                          </div>
                        )}
                      </div>
                      {enrolledCourses.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <BookOpen className="size-3" />
                          {enrolledCourses.join(', ')}
                        </div>
                      )}
                    </div>
                    {s.notes && (
                      <p className="mt-2 text-xs text-muted-foreground">{s.notes}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Платежи</CardTitle>
          <CardDescription>
            Появятся на следующей неделе Phase 2 (запись платежа + баланс + рассрочки).
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          В разработке.
        </CardContent>
      </Card>
    </div>
  )
}
