import Link from 'next/link'
import { Plus } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { LEAD_STAGE_VALUES } from '@/features/leads/schemas'
import { LeadList } from '@/features/leads/components/lead-list'
import { StageFilter } from '@/features/leads/components/stage-filter'
import { countLeadsByStage, listLeads } from '@/features/leads/queries'

type SearchParams = { stage?: string }

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { stage } = await searchParams
  const validStage =
    stage && (LEAD_STAGE_VALUES as readonly string[]).includes(stage)
      ? (stage as (typeof LEAD_STAGE_VALUES)[number])
      : undefined

  const [leads, counts] = await Promise.all([
    listLeads(validStage ? { stage: validStage } : {}),
    countLeadsByStage(),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Лиды</h1>
          <p className="text-sm text-muted-foreground">
            Воронка от первой заявки до подписания договора.
          </p>
        </div>
        <Link href="/leads/new" className={buttonVariants()}>
          <Plus />
          Новый лид
        </Link>
      </div>

      <StageFilter counts={counts} />

      <LeadList leads={leads} />
    </div>
  )
}
