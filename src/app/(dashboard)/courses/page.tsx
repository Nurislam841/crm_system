import Link from 'next/link'
import { Plus } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { listCourses } from '@/features/courses/queries'
import { requireUser } from '@/lib/auth/server'
import { formatKzt } from '@/lib/money'

export default async function CoursesPage() {
  const user = await requireUser()
  const courses = await listCourses({ includeArchived: true })
  const isAdmin = user.role === 'ADMIN'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Курсы</h1>
          <p className="text-sm text-muted-foreground">
            Каталог программ школы. Ученики записываются на курсы, ежемесячная стоимость идёт в платежи.
          </p>
        </div>
        {isAdmin && (
          <Link href="/courses/new" className={buttonVariants()}>
            <Plus />
            Новый курс
          </Link>
        )}
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Курсов пока нет.{' '}
            {isAdmin ? (
              <>Создайте первый — кнопкой выше.</>
            ) : (
              <>Попросите администратора добавить курсы.</>
            )}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {courses.map((c) => (
            <li key={c.id}>
              <Card className="transition hover:border-foreground/20">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {isAdmin ? (
                          <Link
                            href={`/courses/${c.id}`}
                            className="hover:underline underline-offset-2"
                          >
                            {c.name}
                          </Link>
                        ) : (
                          c.name
                        )}
                      </CardTitle>
                      {c.description && (
                        <CardDescription className="mt-1">{c.description}</CardDescription>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-base font-medium">
                        {formatKzt(c.monthlyPrice)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">в месяц</div>
                    </div>
                  </div>
                  {c.archivedAt && (
                    <p className="text-xs text-muted-foreground">
                      Архивирован {new Date(c.archivedAt).toLocaleDateString('ru-RU')}
                    </p>
                  )}
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
