import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import {
  intakeCreateLead,
  intakePayloadSchema,
  intakeSecretHeader,
  resolveTenantBySecret,
} from '@/features/leads/lib/intake'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': `Content-Type, ${intakeSecretHeader}`,
  'Access-Control-Max-Age': '86400',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: Request) {
  const secret = req.headers.get(intakeSecretHeader)
  const tenant = await resolveTenantBySecret(secret)
  if (!tenant) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401, headers: CORS_HEADERS },
    )
  }

  let body: unknown
  const ct = req.headers.get('content-type') ?? ''
  try {
    if (ct.includes('application/json')) {
      body = await req.json()
    } else if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
      const form = await req.formData()
      body = Object.fromEntries(form.entries())
    } else {
      body = await req.json()
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_body' },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  const parsed = intakePayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'validation_failed',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400, headers: CORS_HEADERS },
    )
  }

  const result = await intakeCreateLead({
    tenantId: tenant.id,
    payload: parsed.data,
  })
  revalidatePath('/leads')

  return NextResponse.json(result, {
    status: result.deduped ? 200 : 201,
    headers: CORS_HEADERS,
  })
}
