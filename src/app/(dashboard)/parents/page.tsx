import Link from 'next/link'
import { Phone, Users } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { listParents } from '@/features/parents/queries'

export default async function ParentsPage() {
  const parents = await listParents()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Семьи</h1>
        <p className="text-sm text-muted-foreground">
          Родители, заключившие договор. Запись из лида создаётся автоматически при стадии «Заключён».
        </p>
      </div>

      {parents.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Пока нет ни одной семьи. Закройте лид в стадию «Заключён» — родитель появится здесь.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {parents.map((p) => (
            <li key={p.id}>
              <Link
                href={`/parents/${p.id}`}
                className="block rounded-lg border border-border bg-card p-4 transition hover:border-foreground/20 hover:bg-accent/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{p.fullName}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="size-3" />
                      {p.phone}
                      {p.email && <span>· {p.email}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="size-3.5" />
                    {p._count.students}{' '}
                    {pluralStudents(p._count.students)}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function pluralStudents(n: number) {
  if (n === 1) return 'ребёнок'
  if (n >= 2 && n <= 4) return 'ребёнка'
  return 'детей'
}
