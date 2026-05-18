# 04 — Database

Postgres + Prisma. Multi-tenant by `tenantId` column. Money in `Decimal`. Soft delete where audit matters. Schema rolls out phase by phase — only what each phase needs.

## Schema rollout per phase

| Phase | Tables added |
|---|---|
| 0 — Setup | `Tenant`, `User`, `Session`, `VerificationToken` |
| 1 — Leads | `Lead`, `LeadActivity`, `TrialLesson` |
| 2 — Payments & students | `Parent`, `Student`, `Course`, `Enrollment`, `Payment`, `InstallmentPlan`, `Notification` |
| 3 — Telegram | (no new tables — `Parent.telegramChatId` already exists from Phase 2) |
| 4 — Schedule | `Group`, `GroupMember`, `Lesson`, `Attendance` |
| 5 — SaaS | `TenantSubscription`, `TenantInvoice` |

Don't create empty tables for future phases. Add them when the phase starts.

## Phase 0 — foundation

```prisma
model Tenant {
  id           String   @id @default(cuid())
  slug         String   @unique          // "my_school", later "school_almaty_2"
  name         String
  timezone     String   @default("Asia/Almaty")
  currency     String   @default("KZT")
  createdAt    DateTime @default(now())

  users        User[]
}

model User {
  id           String   @id @default(cuid())
  tenantId     String
  email        String
  fullName     String
  passwordHash String
  role         UserRole @default(MANAGER)
  createdAt    DateTime @default(now())
  deletedAt    DateTime?

  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  sessions     Session[]

  @@unique([tenantId, email])            // one email can exist in two schools
  @@index([tenantId])
}

enum UserRole {
  ADMIN
  MANAGER
  TEACHER
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  expires      DateTime
  sessionToken String   @unique

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## Phase 1 — leads

```prisma
model Lead {
  id                  String         @id @default(cuid())
  tenantId            String
  parentName          String
  parentPhone         String                                  // canonical: +7XXXXXXXXXX
  parentEmail         String?
  childName           String?
  childAge            Int?
  acquisitionSource   AcquisitionSource
  stage               LeadStage      @default(NEW)
  assignedTo          String?
  notes               String?
  convertedParentId   String?                                 // set when stage → WON
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
  deletedAt           DateTime?

  assignee            User?          @relation(fields: [assignedTo], references: [id])
  activities          LeadActivity[]
  trials              TrialLesson[]

  @@index([tenantId, stage])
  @@index([tenantId, parentPhone])                            // dedup lookup
  @@index([tenantId, assignedTo])
}

enum LeadStage {
  NEW
  CONTACTED
  TRIAL_BOOKED
  TRIAL_DONE
  NEGOTIATION
  WON
  LOST
}

enum AcquisitionSource {
  INSTAGRAM
  WEBSITE
  REFERRAL
  WALK_IN
  TELEGRAM
  OTHER
}

model LeadActivity {
  id          String   @id @default(cuid())
  tenantId    String
  leadId      String
  authorId    String
  type        String                                          // "call", "note", "stage_change", ...
  payload     Json
  createdAt   DateTime @default(now())

  lead        Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  author      User     @relation(fields: [authorId], references: [id])

  @@index([tenantId, leadId, createdAt])
}

model TrialLesson {
  id          String   @id @default(cuid())
  tenantId    String
  leadId      String
  scheduledAt DateTime
  status      String   @default("BOOKED")                     // BOOKED | DONE | NO_SHOW | CANCELLED
  notes       String?

  lead        Lead     @relation(fields: [leadId], references: [id])

  @@index([tenantId, scheduledAt])
}
```

## Phase 2 — parents, students, payments

```prisma
model Parent {
  id                  String   @id @default(cuid())
  tenantId            String
  fullName            String
  phone               String
  email               String?
  telegramChatId      String?                                 // set during bot linking, Phase 3
  acquisitionSource   AcquisitionSource                       // denormalized from Lead — for fast analytics
  createdAt           DateTime @default(now())
  deletedAt           DateTime?

  students            Student[]
  payments            Payment[]

  @@unique([tenantId, phone])
  @@index([tenantId])
  @@index([tenantId, telegramChatId])
}

model Student {
  id           String   @id @default(cuid())
  tenantId     String
  parentId     String
  fullName     String
  birthDate    DateTime?
  createdAt    DateTime @default(now())
  deletedAt    DateTime?

  parent       Parent   @relation(fields: [parentId], references: [id])
  enrollments  Enrollment[]

  @@index([tenantId, parentId])
}

model Course {
  id           String   @id @default(cuid())
  tenantId     String
  name         String
  monthlyPrice Decimal  @db.Decimal(12, 2)

  enrollments  Enrollment[]

  @@index([tenantId])
}

model Enrollment {
  id          String   @id @default(cuid())
  tenantId    String
  studentId   String
  courseId    String
  startedAt   DateTime @default(now())
  endedAt     DateTime?

  student     Student  @relation(fields: [studentId], references: [id])
  course      Course   @relation(fields: [courseId], references: [id])
  payments    Payment[]
  plans       InstallmentPlan[]

  @@index([tenantId, studentId])
}

model Payment {
  id           String        @id @default(cuid())
  tenantId     String
  parentId     String
  enrollmentId String?
  amount       Decimal       @db.Decimal(12, 2)
  currency     String        @default("KZT")
  dueAt        DateTime
  paidAt       DateTime?
  method       PaymentMethod?                                 // KASPI, CARD, CASH, TRANSFER
  reference    String?                                        // Kaspi check number, etc.
  createdAt    DateTime      @default(now())

  parent       Parent        @relation(fields: [parentId], references: [id])
  enrollment   Enrollment?   @relation(fields: [enrollmentId], references: [id])
  plan         InstallmentPlan? @relation(fields: [planId], references: [id])
  planId       String?

  @@index([tenantId, dueAt])                                  // overdue / dueWithin queries
  @@index([tenantId, parentId, dueAt])
}

enum PaymentMethod {
  KASPI
  CARD
  CASH
  TRANSFER
}

model InstallmentPlan {
  id           String   @id @default(cuid())
  tenantId     String
  enrollmentId String
  totalAmount  Decimal  @db.Decimal(12, 2)
  installments Int
  createdAt    DateTime @default(now())

  enrollment   Enrollment @relation(fields: [enrollmentId], references: [id])
  payments     Payment[]

  @@index([tenantId, enrollmentId])
}

model Notification {
  id            String   @id @default(cuid())
  tenantId      String
  channel       String                                        // "telegram" | "sms" | "email"
  recipientType String                                        // "parent" | "user"
  recipientId   String
  triggerType   String                                        // "payment_due", "trial_reminder", ...
  triggerId     String                                        // payment.id / trial.id — key for dedup
  payload       Json
  sentAt        DateTime @default(now())
  status        String   @default("sent")                     // sent | failed | retried

  @@index([tenantId, triggerType, triggerId, sentAt])         // the dedup index
  @@index([tenantId, recipientId, sentAt])
}
```

## Phase 4 — schedule (only if you commit to building it)

```prisma
model Group {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  courseId    String
  teacherId   String

  course      Course   @relation(fields: [courseId], references: [id])
  teacher     User     @relation(fields: [teacherId], references: [id])
  members     GroupMember[]
  lessons     Lesson[]

  @@index([tenantId])
}

model GroupMember {
  id         String   @id @default(cuid())
  groupId    String
  studentId  String
  joinedAt   DateTime @default(now())
  leftAt     DateTime?

  group      Group    @relation(fields: [groupId], references: [id])
  student    Student  @relation(fields: [studentId], references: [id])

  @@unique([groupId, studentId])
}

model Lesson {
  id           String   @id @default(cuid())
  tenantId     String
  groupId      String
  scheduledAt  DateTime
  durationMin  Int
  status       String   @default("PLANNED")                   // PLANNED | DONE | CANCELLED | REPLACED
  notes        String?

  group        Group    @relation(fields: [groupId], references: [id])
  attendance   Attendance[]

  @@index([tenantId, scheduledAt])
}

model Attendance {
  id         String   @id @default(cuid())
  lessonId   String
  studentId  String
  present    Boolean
  arrivedAt  DateTime?

  lesson     Lesson   @relation(fields: [lessonId], references: [id])
  student    Student  @relation(fields: [studentId], references: [id])

  @@unique([lessonId, studentId])
}
```

## Non-obvious decisions

These are the choices that look weird until you've debugged the alternative.

### `Lead.parentPhone` is not a FK to `Parent`

A lead is a parent who *hasn't paid yet*. There is no `Parent` row at the lead stage — creating one prematurely pollutes the parents table with people who never enrolled. When the lead converts (`stage = WON`), an action creates the `Parent` and sets `Lead.convertedParentId` to link them.

Dedup at intake: `@@index([tenantId, parentPhone])` enables a fast lookup before creating a lead — same phone, same tenant, already exists? Update instead of insert.

### `Parent.acquisitionSource` is denormalized from `Lead`

"How many parents came from Instagram this year?" should not need to join with archived leads. Copying the source at conversion makes analytics queries trivial and survives lead deletions.

### `Notification` dedup via `(triggerType, triggerId, sentAt)` index

When a cron retries or two workers fire at once, a parent can get five identical "payment due tomorrow" messages. The fix: before sending, query for an existing `Notification` with the same `triggerType + triggerId` in the last N hours. If present, skip. The composite index makes this an O(1) check. See [05-backend-patterns.md](05-backend-patterns.md) for the helper.

### FK to `Tenant` is omitted on the "heavy" tables

`Attendance`, `GroupMember`, `LeadActivity` have `tenantId` for filtering but no FK to `Tenant`. Reasons:

- Tenant is reachable through the parent chain (`Attendance → Lesson → Group → ...`) for integrity checks.
- Saves an index and a FK enforcement on what will be the highest-write tables.
- If you want paranoid cross-tenant isolation, turn on Postgres **row-level security** with a `tenant_id = current_setting('app.current_tenant')` policy instead of relying on every query author to remember.

### Soft delete on `User`, `Parent`, `Student`, `Lead`

Audit matters. A manager who left the school still needs to be visible on past lead activities. A parent who "left" might come back. Hard deletes destroy history. `deletedAt` + a `WHERE deletedAt IS NULL` filter on every list query is enough.

### `Decimal(12, 2)` for money — never `Float`

`Float` loses cents. `Decimal(12, 2)` holds up to 9,999,999,999.99 — comfortable for a school's lifetime revenue. Prisma exposes it as `Prisma.Decimal`; convert through `formatKzt()` (see [03-project-structure.md](03-project-structure.md)) for display.

### `KZT` and `Asia/Almaty` as defaults

Hard-coded on `Tenant` so every Phase 5 tenant inherits them. International tenants override at signup. No localization framework needed — one currency, one timezone — until a paying foreign customer asks.

### Phone format `+7XXXXXXXXXX` enforced at the schema layer (Zod)

DB column is `String`, but the Zod schema (`features/leads/schemas.ts`) regex-validates the format on every write. This is cheaper than a CHECK constraint and easier to evolve when Phase 5 adds non-KZ tenants.

## Migration discipline

- One migration per feature, named after it: `prisma migrate dev --name add_leads`, `add_payments`, `add_telegram_chat_id_to_parent`.
- Never edit a migration after it lands in `main`. Add a new one.
- For destructive changes (drop column), do it in three steps across deploys: deploy code that doesn't read the column → deploy migration that drops it → cleanup later.
- The first 200 students of historical data come in via `scripts/import-students-from-excel.ts`, not via a migration.
