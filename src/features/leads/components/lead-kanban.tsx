'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CalendarClock } from 'lucide-react'
import type { LeadStage } from '@prisma/client'

import { cn } from '@/lib/utils'

import { moveLeadStageAction } from '../actions'
import { SOURCE_LABEL_RU } from '../lib/sources'
import { LEAD_STAGES, STAGE_LABEL_RU } from '../lib/stages'
import type { LeadListItem } from '../queries'

const COLUMN_TONE: Record<LeadStage, string> = {
  NEW: 'bg-slate-50 dark:bg-slate-900/40',
  CONTACTED: 'bg-blue-50/60 dark:bg-blue-950/40',
  TRIAL_BOOKED: 'bg-violet-50/60 dark:bg-violet-950/40',
  TRIAL_DONE: 'bg-indigo-50/60 dark:bg-indigo-950/40',
  NEGOTIATION: 'bg-amber-50/60 dark:bg-amber-950/40',
  WON: 'bg-emerald-50/60 dark:bg-emerald-950/40',
  LOST: 'bg-rose-50/60 dark:bg-rose-950/40',
}

export function LeadKanban({ leads }: { leads: LeadListItem[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useState<Record<string, LeadStage>>({})
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  function effectiveStage(lead: LeadListItem): LeadStage {
    return optimistic[lead.id] ?? lead.stage
  }

  const byStage: Record<LeadStage, LeadListItem[]> = {
    NEW: [],
    CONTACTED: [],
    TRIAL_BOOKED: [],
    TRIAL_DONE: [],
    NEGOTIATION: [],
    WON: [],
    LOST: [],
  }
  for (const l of leads) byStage[effectiveStage(l)].push(l)

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const overId = e.over?.id
    if (!overId) return
    const lead = leads.find((l) => l.id === e.active.id)
    if (!lead) return
    const targetStage = String(overId) as LeadStage
    if (!LEAD_STAGES.includes(targetStage)) return
    if (effectiveStage(lead) === targetStage) return

    setOptimistic((p) => ({ ...p, [lead.id]: targetStage }))
    startTransition(async () => {
      const res = await moveLeadStageAction({ leadId: lead.id, stage: targetStage })
      if (!res.ok) {
        setOptimistic((p) => {
          const { [lead.id]: _, ...rest } = p
          void _
          return rest
        })
      }
      router.refresh()
    })
  }

  const dragged = activeId ? leads.find((l) => l.id === activeId) : null

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div
        className={cn(
          '-mx-2 flex gap-2 overflow-x-auto px-2 pb-2',
          isPending && 'opacity-90',
        )}
      >
        {LEAD_STAGES.map((stage) => (
          <KanbanColumn key={stage} stage={stage} leads={byStage[stage]} />
        ))}
      </div>
      <DragOverlay>
        {dragged ? <KanbanCard lead={dragged} dragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn({ stage, leads }: { stage: LeadStage; leads: LeadListItem[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border border-border transition',
        COLUMN_TONE[stage],
        isOver && 'ring-2 ring-foreground/30',
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>{STAGE_LABEL_RU[stage]}</span>
        <span className="rounded bg-background/70 px-1.5 py-0.5 text-[10px] text-foreground">
          {leads.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
        {leads.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/70 p-3 text-center text-xs text-muted-foreground">
            пусто
          </div>
        ) : (
          leads.map((l) => <KanbanCard key={l.id} lead={l} />)
        )}
      </div>
    </div>
  )
}

function KanbanCard({ lead, dragging }: { lead: LeadListItem; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  })

  const overdue =
    lead.nextContactAt &&
    new Date(lead.nextContactAt).getTime() < Date.now() &&
    lead.stage !== 'WON' &&
    lead.stage !== 'LOST'

  return (
    <div
      ref={setNodeRef}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
          : undefined
      }
      {...attributes}
      {...listeners}
      className={cn(
        'group rounded-md border border-border bg-card p-3 text-left shadow-sm transition',
        (isDragging || dragging) && 'opacity-80 ring-2 ring-foreground/30',
      )}
    >
      <Link
        href={`/leads/${lead.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block space-y-1.5"
      >
        <div className="text-sm font-medium leading-tight">{lead.parentName}</div>
        <div className="text-xs text-muted-foreground">{lead.parentPhone}</div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span>{SOURCE_LABEL_RU[lead.acquisitionSource]}</span>
          {lead.assignee ? <span>· {lead.assignee.fullName}</span> : null}
        </div>
        {lead.nextContactAt && (
          <div
            className={cn(
              'mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]',
              overdue
                ? 'bg-destructive/10 text-destructive'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <CalendarClock className="size-3" />
            {formatShort(lead.nextContactAt)}
          </div>
        )}
      </Link>
    </div>
  )
}

const SHORT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  timeZone: 'Asia/Almaty',
})

function formatShort(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  return SHORT.format(date)
}
