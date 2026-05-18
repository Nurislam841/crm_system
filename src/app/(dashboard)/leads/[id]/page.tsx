import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarClock, CheckCircle2, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { deleteLeadAction } from '@/features/leads/actions'
import { ActivityLog } from '@/features/leads/components/activity-log'
import { AddActivityForm } from '@/features/leads/components/add-activity-form'
import { LeadForm } from '@/features/leads/components/lead-form'
import { StageBadge } from '@/features/leads/components/stage-badge'
import { SOURCE_LABEL_RU } from '@/features/leads/lib/sources'
import {
  getConvertedParent,
  getLead,
  listAssignableUsers,
} from '@/features/leads/queries'
import { BookTrialForm } from '@/features/trials/components/book-trial-form'
import { TrialList } from '@/features/trials/components/trial-list'
import { listTrialsForLead } from '@/features/trials/queries'
import { cn } from '@/lib/utils'

const DATE_FMT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Almaty',
})

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [lead, users] = await Promise.all([getLead(id), listAssignableUsers()])
  if (!lead) notFound()

  const trials = await listTrialsForLead(lead.id)
  const convertedParent = lead.convertedParentId
    ? await getConvertedParent(lead.convertedParentId)
    : null

  const deleteAction = async () => {
    'use server'
    await deleteLeadAction(id)
  }

  const overdue =
    lead.nextContactAt &&
    new Date(lead.nextContactAt).getTime() < Date.now() &&
    lead.stage !== 'WON' &&
    lead.stage !== 'LOST'

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Назад к воронке
      </Link>

      {lead.stage === 'WON' && convertedParent && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-300/40 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <div>
            <strong className="font-medium">Конверсия в клиента.</strong>{' '}
            Лид стал родителем в системе: {convertedParent.fullName} ({convertedParent.phone}).
            <br />
            <span className="text-xs opacity-80">
              Phase 2 раскроет страницу клиента — пока он живёт в БД как Parent.
            </span>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{lead.parentName}</CardTitle>
              <CardDescription className="space-x-2">
                <span>{lead.parentPhone}</span>
                <span>·</span>
                <span>{SOURCE_LABEL_RU[lead.acquisitionSource]}</span>
                {lead.assignee ? (
                  <>
                    <span>·</span>
                    <span>отв. {lead.assignee.fullName}</span>
                  </>
                ) : null}
              </CardDescription>
            </div>
            <StageBadge stage={lead.stage} />
          </div>
          {lead.nextContactAt && (
            <div
              className={cn(
                'mt-2 inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs',
                overdue
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <CalendarClock className="size-3.5" />
              {overdue ? 'Просрочен контакт: ' : 'Следующий контакт: '}
              {DATE_FMT.format(new Date(lead.nextContactAt))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <LeadForm
            mode="edit"
            leadId={lead.id}
            users={users}
            initial={{
              parentName: lead.parentName,
              parentPhone: lead.parentPhone,
              parentEmail: lead.parentEmail,
              childName: lead.childName,
              childAge: lead.childAge,
              acquisitionSource: lead.acquisitionSource,
              notes: lead.notes,
              stage: lead.stage,
              assignedTo: lead.assignedTo,
              nextContactAt: lead.nextContactAt,
            }}
          />
          <Separator className="my-6" />
          <form action={deleteAction}>
            <Button variant="destructive" size="sm" type="submit">
              <Trash2 />
              Удалить лид
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Soft-delete — данные остаются в базе для аудита, но скрываются из списка.
            </p>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Пробный урок</CardTitle>
          <CardDescription>
            Запишите ребёнка на пробное занятие. После проведения отметьте статус — этап лида подстроится автоматически.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <BookTrialForm leadId={lead.id} />
          <Separator />
          <TrialList trials={trials} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Журнал</CardTitle>
          <CardDescription>
            Заметки, звонки и автоматические события — всё, что происходило с лидом.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <AddActivityForm leadId={lead.id} />
          <Separator />
          <ActivityLog activities={lead.activities} />
        </CardContent>
      </Card>
    </div>
  )
}
