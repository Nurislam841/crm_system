import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CourseForm } from '@/features/courses/components/course-form'
import { requireUser } from '@/lib/auth/server'

export default async function NewCoursePage() {
  const user = await requireUser()
  if (user.role !== 'ADMIN') redirect('/courses')

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
          <CardTitle>Новый курс</CardTitle>
          <CardDescription>
            Это программа, на которую вы записываете учеников. Например: «Английский
            для младших», «Математика 5–7 лет». Не вписывайте сюда имя ребёнка —
            учеников добавляйте в разделе «Семьи».
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CourseForm mode="create" />
        </CardContent>
      </Card>
    </div>
  )
}
