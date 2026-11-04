import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { SqlExecutor } from '../../src/lib/directory/sql-executor'

const root = path.resolve(__dirname, '../..')
export const LEGACY_SQL = readFileSync(path.join(__dirname, 'fixtures/legacy-schema.sql'), 'utf8')
export const MIGRATION_SQL = readFileSync(path.join(root, 'prisma/sql/001_business_directory_foundation.sql'), 'utf8')
export const CHECKS_MARKER = '-- Database-level guards'
export const MIGRATION_DDL_ONLY = MIGRATION_SQL.split(CHECKS_MARKER)[0]

export function pgliteExecutor(db: PGlite): SqlExecutor {
  return {
    all: async <T>(sql: string, params: unknown[] = []) => (await db.query(sql, params)).rows as T[],
    run: async (sql: string, params: unknown[] = []) => (await db.query(sql, params)).affectedRows ?? 0,
  }
}

/** A database that looks like the app BEFORE this phase (legacy tables only). */
export async function legacyDb() {
  const db = new PGlite()
  await db.exec(LEGACY_SQL)
  return db
}

/** Legacy tables + the Phase 1 migration applied on top. */
export async function migratedDb(opts: { ddlOnly?: boolean } = {}) {
  const db = await legacyDb()
  await db.exec(opts.ddlOnly ? MIGRATION_DDL_ONLY : MIGRATION_SQL)
  return db
}

export const STAGE_NAMES = ['Site Preparation', 'Foundation', 'Structure', 'MEP', 'Finishing', 'Handover']

export async function insertStages(db: PGlite, names = STAGE_NAMES) {
  for (const [i, name] of names.entries()) {
    await db.query(`INSERT INTO stages (id, name, "displayOrder", active) VALUES ($1, $2, $3, true)`, [`stage-${i + 1}`, name, i + 1])
  }
}

export async function insertUser(db: PGlite, id: string, email: string, role = 'OWNER') {
  await db.query(`INSERT INTO users (id, "fullName", email, role, "updatedAt") VALUES ($1, $2, $3, $4::"UserRole", now())`, [id, id, email, role])
}

export async function insertLegacyCategory(db: PGlite, id: string, name: string) {
  await db.query(`INSERT INTO service_categories (id, name) VALUES ($1, $2)`, [id, name])
}

export async function insertLegacyProvider(
  db: PGlite,
  p: { id: string; userId: string; name: string; description?: string | null; verified?: boolean; active?: boolean; categories?: string[]; areas?: [string, number][] }
) {
  await db.query(
    `INSERT INTO service_providers (id, "userId", "businessName", description, verified, active) VALUES ($1,$2,$3,$4,$5,$6)`,
    [p.id, p.userId, p.name, p.description ?? null, p.verified ?? false, p.active ?? true]
  )
  for (const [i, cat] of (p.categories ?? []).entries()) {
    await db.query(`INSERT INTO service_provider_categories (id, "providerId", "categoryId") VALUES ($1,$2,$3)`, [`${p.id}-c${i}`, p.id, cat])
  }
  for (const [i, [city, radius]] of (p.areas ?? []).entries()) {
    await db.query(`INSERT INTO service_areas (id, "providerId", city, radius) VALUES ($1,$2,$3,$4)`, [`${p.id}-a${i}`, p.id, city, radius])
  }
}

export async function count(db: PGlite, table: string, where = 'true') {
  const r = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM "${table}" WHERE ${where}`)
  return r.rows[0].n
}
