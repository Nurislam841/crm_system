import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth/server'

export default async function DashboardPage() {
  const user = await requireUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Здравствуйте, <span className="font-medium text-foreground">{user.name ?? user.email}</span>.
          Сейчас активен Этап 0 — фундамент готов, модули появятся по мере прохождения этапов.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Этап 1 — Воронка лидов</CardTitle>
            <CardDescription>4–6 недель</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Заявки с сайта, Telegram и ручной ввод → канбан → пробный урок → договор.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Этап 2 — Платежи</CardTitle>
            <CardDescription>4–5 недель</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Учеников, рассрочки и квитанции переносим из Excel в систему.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Этап 3 — Telegram-бот</CardTitle>
            <CardDescription>2–3 недели</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Напоминания родителям, баланс и расписание по запросу.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Контекст сессии</CardTitle>
          <CardDescription>Что NextAuth положил в JWT — используется для проверки доступа.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Row label="Email" value={user.email} />
            <Row label="Имя" value={user.name ?? '—'} />
            <Row label="Роль" value={user.role} />
            <Row label="Tenant" value={user.tenantId} mono />
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono text-xs' : 'text-foreground'}>{value}</span>
    </div>
  )
}
