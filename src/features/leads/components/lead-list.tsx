import Link from 'next/link'
import { Phone, User as UserIcon } from 'lucide-react'

import { SOURCE_LABEL_RU } from '../lib/sources'
import type { LeadListItem } from '../queries'
import { StageBadge } from './stage-badge'

export function LeadList({ leads }: { leads: LeadListItem[] }) {
  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
        Лидов пока нет. Создайте первый — кнопкой «Новый лид».
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {leads.map((lead) => (
        <li key={lead.id}>
          <Link
            href={`/leads/${lead.id}`}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition hover:border-foreground/20 hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <UserIcon className="size-4 text-muted-foreground" />
                {lead.parentName}
                {lead.childName ? (
                  <span className="text-muted-foreground">
                    · ребёнок {lead.childName}
                    {lead.childAge ? `, ${lead.childAge}` : ''}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="size-3" />
                  {lead.parentPhone}
                </span>
                <span>{SOURCE_LABEL_RU[lead.acquisitionSource]}</span>
                {lead.assignee ? <span>отв. {lead.assignee.fullName}</span> : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <StageBadge stage={lead.stage} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
