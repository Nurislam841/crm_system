import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const slug = process.env.SEED_TENANT_SLUG ?? 'my_school'
  const tenantName = process.env.SEED_TENANT_NAME ?? 'My School'
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@school.local'
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'changeme'
  const fullName = process.env.SEED_ADMIN_NAME ?? 'Admin'

  const tenant = await db.tenant.upsert({
    where: { slug },
    update: {},
    create: { slug, name: tenantName },
  })

  const passwordHash = await bcrypt.hash(password, 12)

  await db.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email } },
    update: {},
    create: {
      tenantId: tenant.id,
      email,
      fullName,
      passwordHash,
      role: 'ADMIN',
    },
  })

  console.log(`Seeded tenant "${slug}" with admin ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
