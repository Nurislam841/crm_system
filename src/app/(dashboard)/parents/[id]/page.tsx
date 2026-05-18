import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, BookOpen, CalendarDays, Phone, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { listCourses } from '@/features/courses/queries'
import { endEnrollmentAction } from '@/features/enrollments/actions'
import { AddEnrollmentForm } from '@/features/enrollments/components/add-enrollment-form'
import { getParent } from '@/features/parents/queries'
import { BalanceSummary } from '@/features/payments/components/balance-summary'
import { PaymentRow } from '@/features/payments/components/payment-row'
import { RecordPaymentForm } from '@/features/payments/components/record-payment-form'
import { getParentBalance, listPaymentsForParent } from '@/features/payments/queries'
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
  const [parent, courses, payments, balance] = await Promise.all([
    getParent(id),
    listCourses(),
    listPaymentsForParent(id),
    getParentBalance(id),
  ])
  if (!parent) notFound()

  const enrollmentOptions = parent.students.flatMap((s) =>
    s.enrollments.map((e) => ({
      id: e.id,
      label: `${s.fullName} · ${e.course.name}`,
    })),
  )

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
            <span>на платформе с {BIRTH_FMT.format(parent.createdAt)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BalanceSummary balance={balance} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Дети и зачисления</CardTitle>
          <CardDescription>
            Запишите ребёнка на курс — потом сможете фиксировать платежи с привязкой.
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
            <ul className="space-y-3">
              {parent.students.map((s) => (
                <li
                  key={s.id}
                  className="space-y-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-medium">{s.fullName}</div>
                      {s.birthDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="size-3" />
                          {BIRTH_FMT.format(s.birthDate)}
                        </div>
                      )}
                    </div>
                  </div>
                  {s.enrollments.length > 0 && (
                    <ul className="space-y-1">
                      {s.enrollments.map((e) => {
                        const endAction = async () => {
                          'use server'
                          await endEnrollmentAction(e.id)
                        }
                        return (
                          <li
                            key={e.id}
                            className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs"
                          >
                            <span className="flex items-center gap-1.5">
                              <BookOpen className="size-3" />
                              {e.course.name}
                            </span>
                            <form action={endAction}>
                              <Button
                                type="submit"
                                size="xs"
                                variant="ghost"
                                title="Завершить зачисление"
                              >
                                <X />
                              </Button>
                            </form>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  <AddEnrollmentForm studentId={s.id} courses={courses} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Платёж</CardTitle>
          <CardDescription>
            «Получили» — деньги уже пришли (создаст оплаченный платёж). «Запланировать» — выставить ожидание без оплаты.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecordPaymentForm parentId={parent.id} enrollments={enrollmentOptions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>История платежей</CardTitle>
          <CardDescription>
            Просроченные — красным, оплаченные — зелёным. Кнопка «Получили» отметит запланированный как пришедший.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Платежей пока нет.</p>
          ) : (
            <ul className="space-y-2">
              {payments.map((p) => (
                <PaymentRow key={p.id} payment={p} showStudent />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
