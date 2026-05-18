import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Phone,
  X,
} from 'lucide-react'

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
import { CreatePlanForm } from '@/features/installments/components/create-plan-form'
import { PlanSummary } from '@/features/installments/components/plan-summary'
import { EditParentForm } from '@/features/parents/components/edit-parent-form'
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
  const user = await requireUser()
  const isAdmin = user.role === 'ADMIN'
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

  const hasStudents = parent.students.length > 0
  const hasAnyEnrollment = parent.students.some((s) => s.enrollments.length > 0)

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
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-xl">{parent.fullName}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3" />
                  {parent.phone}
                </span>
                {parent.email && <span>{parent.email}</span>}
                <span>на платформе с {BIRTH_FMT.format(parent.createdAt)}</span>
              </CardDescription>
            </div>
            <EditParentForm
              parent={{
                id: parent.id,
                fullName: parent.fullName,
                phone: parent.phone,
                email: parent.email,
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <BalanceSummary balance={balance} />
        </CardContent>
      </Card>

      {/* STEP 1: explicit empty state when no students */}
      {!hasStudents ? (
        <Card className="border-amber-300/40 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="size-4" />
              Шаг 1: добавьте ребёнка
            </CardTitle>
            <CardDescription>
              Сначала добавьте ученика в семью — после этого можно будет записать
              его на курс и фиксировать оплаты.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddStudentForm parentId={parent.id} autoFocus />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Дети и зачисления</CardTitle>
            <CardDescription>
              {hasAnyEnrollment
                ? 'Запишите ещё одного ребёнка или добавьте курсы существующим.'
                : 'Запишите ученика на курс — потом сможете фиксировать платежи с привязкой.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <AddStudentForm parentId={parent.id} />
            <Separator />
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
                  {s.enrollments.length > 0 ? (
                    <ul className="space-y-2">
                      {s.enrollments.map((e) => {
                        const endAction = async () => {
                          'use server'
                          await endEnrollmentAction(e.id)
                        }
                        const enrollmentLabel = `${s.fullName} · ${e.course.name}`
                        const monthlyDefault = Number(
                          e.course.monthlyPrice.toString(),
                        )
                        return (
                          <li
                            key={e.id}
                            className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-2"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="flex items-center gap-1.5">
                                <BookOpen className="size-3" />
                                <strong className="font-medium">{e.course.name}</strong>
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
                            </div>
                            {e.plans.length > 0 ? (
                              <ul className="space-y-2">
                                {e.plans.map((p) => (
                                  <li key={p.id}>
                                    <PlanSummary plan={p} isAdmin={isAdmin} />
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <CreatePlanForm
                                enrollmentId={e.id}
                                enrollmentLabel={enrollmentLabel}
                                suggestedMonthly={monthlyDefault}
                              />
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  ) : courses.length === 0 ? (
                    <div className="rounded-md border border-amber-300/40 bg-amber-50 px-3 py-2 text-xs dark:border-amber-500/30 dark:bg-amber-950/30">
                      Нет ни одного активного курса.{' '}
                      <Link
                        href="/courses/new"
                        className="font-medium underline underline-offset-2"
                      >
                        Создать курс
                      </Link>
                      .
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      Шаг 2: запишите ребёнка на курс ниже.
                    </div>
                  )}
                  <AddEnrollmentForm studentId={s.id} courses={courses} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className={hasStudents ? '' : 'pointer-events-none opacity-60'}>
        <CardHeader>
          <CardTitle>
            Платёж
            {!hasStudents && (
              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 align-middle text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                после ученика
              </span>
            )}
          </CardTitle>
          <CardDescription>
            «Получили» — деньги уже пришли. «Запланировать» — выставить ожидание без оплаты.
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
                <PaymentRow key={p.id} payment={p} showStudent isAdmin={isAdmin} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
