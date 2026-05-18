import Link from 'next/link'
import { Plus } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { LeadKanban } from '@/features/leads/components/lead-kanban'
import { LeadList } from '@/features/leads/components/lead-list'
import { StageFilter } from '@/features/leads/components/stage-filter'
import { ViewToggle } from '@/features/leads/components/view-toggle'
import { countLeadsByStage, listLeads } from '@/features/leads/queries'
import { LEAD_STAGE_VALUES } from '@/features/leads/schemas'

type SearchParams = { stage?: string; view?: string }

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { stage, view } = await searchParams
  const validStage =
    stage && (LEAD_STAGE_VALUES as readonly string[]).includes(stage)
      ? (stage as (typeof LEAD_STAGE_VALUES)[number])
      : undefined
  const currentView: 'kanban' | 'list' = view === 'list' ? 'list' : 'kanban'

  const [leads, counts] = await Promise.all([
    listLeads(validStage ? { stage: validStage } : {}),
    countLeadsByStage(),
  ])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Лиды</h1>
          <p className="text-sm text-muted-foreground">
            Воронка от первой заявки до подписания договора.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle value={currentView} />
          <Link href="/leads/new" className={buttonVariants()}>
            <Plus />
            Новый лид
          </Link>
        </div>
      </div>

      {currentView === 'list' ? (
        <>
          <StageFilter counts={counts} />
          <LeadList leads={leads} />
        </>
      ) : (
        <LeadKanban leads={leads} />
      )}
    </div>
  )
}
