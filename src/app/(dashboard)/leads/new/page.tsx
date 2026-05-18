import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LeadForm } from '@/features/leads/components/lead-form'
import { requireUser } from '@/lib/auth/server'

export default async function NewLeadPage() {
  await requireUser()

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
          <CardTitle>Новый лид</CardTitle>
          <CardDescription>Внесите контакты родителя и источник.</CardDescription>
        </CardHeader>
        <CardContent>
          <LeadForm mode="create" />
        </CardContent>
      </Card>
    </div>
  )
}
