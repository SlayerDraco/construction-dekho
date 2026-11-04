import type { PrismaClient } from '@prisma/client'
import { backfillBusinessDirectory, type BackfillReport } from './backfill'
import { applyDirectoryConstraints } from './constraints'
import { prismaExecutor } from './prisma-executor'
import { seedDataSources } from './sources-data'
import { seedTaxonomy, type TaxonomySeedReport } from './taxonomy-seed'

export interface DirectorySeedReport {
  constraintsAdded: string[]
  dataSourcesCreated: number
  taxonomy: TaxonomySeedReport
  backfill: BackfillReport
}

const TX = { timeout: 120_000, maxWait: 10_000 }

/**
 * Applies the directory foundation to a database whose tables already exist
 * (via `prisma db push` or prisma/sql/001_business_directory_foundation.sql).
 * Idempotent: safe to run on every deploy.
 */
export async function runDirectoryFoundation(prisma: PrismaClient): Promise<DirectorySeedReport> {
  const constraintsAdded = await applyDirectoryConstraints(prismaExecutor(prisma))

  const { dataSources, taxonomy } = await prisma.$transaction(async (tx) => {
    const exec = prismaExecutor(tx)
    return { dataSources: await seedDataSources(exec), taxonomy: await seedTaxonomy(exec) }
  }, TX)

  const backfill = await prisma.$transaction((tx) => backfillBusinessDirectory(prismaExecutor(tx)), TX)

  return { constraintsAdded, dataSourcesCreated: dataSources.created, taxonomy, backfill }
}
