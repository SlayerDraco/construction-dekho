/**
 * Applies only the business-directory foundation (constraints, data sources, taxonomy, backfill).
 * Idempotent. Use on a database that already has users/stages/providers.
 *   npm run db:seed-directory
 */
import { PrismaClient } from '@prisma/client'
import { runDirectoryFoundation } from '../src/lib/directory/run'

const prisma = new PrismaClient()

runDirectoryFoundation(prisma)
  .then((report) => console.log(JSON.stringify(report, null, 2)))
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
