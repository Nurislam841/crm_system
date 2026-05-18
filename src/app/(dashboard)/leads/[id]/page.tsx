import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'

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
import { LeadForm } from '@/features/leads/components/lead-form'
import { StageBadge } from '@/features/leads/components/stage-badge'
import { SOURCE_LABEL_RU } from '@/features/leads/lib/sources'
import { getLead } from '@/features/leads/queries'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const lead = await getLead(id)
  if (!lead) notFound()

  const deleteAction = async () => {
    'use server'
    await deleteLeadAction(id)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Назад к списку
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
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
        </CardHeader>
        <CardContent>
          <LeadForm
            mode="edit"
            leadId={lead.id}
            initial={{
              parentName: lead.parentName,
              parentPhone: lead.parentPhone,
              parentEmail: lead.parentEmail,
              childName: lead.childName,
              childAge: lead.childAge,
              acquisitionSource: lead.acquisitionSource,
              notes: lead.notes,
              stage: lead.stage,
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
    </div>
  )
}
