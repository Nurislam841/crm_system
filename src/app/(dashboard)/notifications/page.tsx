import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { NotificationList } from '@/features/notifications/components/notification-list'
import { listMyNotifications } from '@/features/notifications/queries'
import { requireUser } from '@/lib/auth/server'

export default async function NotificationsPage() {
  await requireUser()
  const items = await listMyNotifications({ limit: 100 })

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Уведомления</CardTitle>
          <CardDescription>
            Что произошло за смену — кликните, чтобы открыть карточку. Старые
            закрываются автоматически.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationList items={items} />
        </CardContent>
      </Card>
    </div>
  )
}
