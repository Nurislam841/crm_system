import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { IntakeSecretCard } from '@/features/leads/components/intake-secret-card'
import { getIntakeSettings } from '@/features/leads/queries'
import { requireUser } from '@/lib/auth/server'

export default async function IntakePage() {
  const user = await requireUser()
  if (user.role !== 'ADMIN') redirect('/leads')

  const tenant = await getIntakeSettings()
  if (!tenant) redirect('/leads')

  // Resolve absolute URL from request headers (works in dev and on Vercel)
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('host') ?? 'localhost:3000'
  const intakeUrl = `${proto}://${host}/api/lead-intake`

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Назад к воронке
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Публичный приём лидов</CardTitle>
          <CardDescription>
            Этот URL принимает заявки с формы на сайте школы или из любой внешней системы.
            Дедуп по телефону работает автоматически — повторная отправка не создаст копию.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenant.intakeSecret ? (
            <IntakeSecretCard initialSecret={tenant.intakeSecret} intakeUrl={intakeUrl} />
          ) : (
            <p className="text-sm text-destructive">
              Секрет не настроен. Запустите prisma db seed или нажмите «Заменить».
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Какие поля принимает endpoint</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm sm:grid-cols-[160px_1fr]">
            <Row label="parentName" value="строка, мин. 2 символа" required />
            <Row label="parentPhone" value="+7XXXXXXXXXX" required />
            <Row label="parentEmail" value="опционально, валидный email" />
            <Row label="childName" value="опционально" />
            <Row label="childAge" value="число, 2–99" />
            <Row
              label="source"
              value="INSTAGRAM, WEBSITE, REFERRAL, WALK_IN, TELEGRAM, OTHER (по умолчанию WEBSITE)"
            />
            <Row label="notes" value="до 2000 символов" />
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

function Row({
  label,
  value,
  required,
}: {
  label: string
  value: string
  required?: boolean
}) {
  return (
    <>
      <dt className="font-mono text-xs text-foreground">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </dt>
      <dd className="text-xs text-muted-foreground">{value}</dd>
    </>
  )
}
