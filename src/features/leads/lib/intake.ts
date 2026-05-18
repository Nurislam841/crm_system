import crypto from 'node:crypto'

import { z } from 'zod'

import { db } from '@/lib/db/prisma'

import { ACQUISITION_SOURCE_VALUES } from '../schemas'
import { logActivity } from './activity'
import { findExistingByPhone } from './dedup'

export const intakeSecretHeader = 'x-intake-secret'

const PHONE_REGEX = /^\+7\d{10}$/

const optionalString = (s: unknown) =>
  typeof s === 'string' && s.trim().length === 0 ? undefined : s

export const intakePayloadSchema = z.object({
  parentName: z.string().trim().min(2).max(120),
  parentPhone: z.string().trim().regex(PHONE_REGEX, 'Формат: +7XXXXXXXXXX'),
  parentEmail: z.preprocess(
    optionalString,
    z.string().trim().email().optional(),
  ),
  childName: z.preprocess(
    optionalString,
    z.string().trim().min(1).max(120).optional(),
  ),
  childAge: z.preprocess(
    (v) => {
      if (v === undefined || v === null || v === '') return undefined
      const n = Number(v)
      return Number.isNaN(n) ? v : n
    },
    z.number().int().min(2).max(99).optional(),
  ),
  source: z
    .preprocess(
      (v) => (typeof v === 'string' ? v.toUpperCase() : v),
      z.enum(ACQUISITION_SOURCE_VALUES),
    )
    .optional(),
  notes: z.preprocess(optionalString, z.string().trim().max(2000).optional()),
})

export type IntakePayload = z.infer<typeof intakePayloadSchema>

export async function resolveTenantBySecret(secret: string | null | undefined) {
  if (!secret || secret.length < 16) return null
  return db.tenant.findFirst({
    where: { intakeSecret: secret },
    select: { id: true, slug: true, name: true },
  })
}

export async function intakeCreateLead(args: {
  tenantId: string
  payload: IntakePayload
}) {
  const { tenantId, payload } = args

  const existing = await findExistingByPhone(tenantId, payload.parentPhone)
  if (existing) {
    return { ok: true as const, deduped: true as const, leadId: existing.id }
  }

  const lead = await db.lead.create({
    data: {
      tenantId,
      parentName: payload.parentName,
      parentPhone: payload.parentPhone,
      parentEmail: payload.parentEmail ?? null,
      childName: payload.childName ?? null,
      childAge: payload.childAge ?? null,
      acquisitionSource: payload.source ?? 'WEBSITE',
      notes: payload.notes ?? null,
      stage: 'NEW',
    },
  })

  // No author for public intake — pick any tenant admin (or first user) to satisfy FK.
  // If no user found, skip activity log.
  const firstUser = await db.user.findFirst({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (firstUser) {
    await logActivity({
      tenantId,
      leadId: lead.id,
      authorId: firstUser.id,
      type: 'lead_created',
      payload: {
        source: payload.source ?? 'WEBSITE',
        channel: 'public-intake',
      },
    })
  }

  return { ok: true as const, deduped: false as const, leadId: lead.id }
}

export function makeIntakeSecret() {
  return 'iks_' + crypto.randomBytes(24).toString('base64url')
}
