import { readFileSync } from 'node:fs'
import path from 'node:path'
import { Prisma } from '@prisma/client'
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { migratedDb } from './helpers'

/**
 * Guards against the hand-reviewed migration drifting from prisma/schema.prisma.
 * The expected shape comes from Prisma's own generated datamodel (Prisma.dmmf), not from a copy.
 */
const dm = Prisma.dmmf.datamodel
const models = dm.models.filter((m) => m.name.startsWith('Business'))
const schemaText = readFileSync(path.resolve(__dirname, '../../prisma/schema.prisma'), 'utf8')

const typeMap: Record<string, string> = {
  String: 'text', Int: 'integer', Float: 'double precision', Boolean: 'boolean', DateTime: 'timestamp without time zone', Json: 'jsonb',
}

let db: PGlite
beforeAll(async () => { db = await migratedDb() })
afterAll(async () => { await db.close() })

describe('migration matches prisma/schema.prisma', () => {
  it('covers all 14 directory models', () => {
    expect(models.map((m) => m.name).sort()).toEqual([
      'BusinessAuditLog', 'BusinessCategory', 'BusinessCategoryExternalMapping', 'BusinessCategoryStage', 'BusinessDataSource',
      'BusinessFieldProvenance', 'BusinessImage', 'BusinessLegacyCategoryMap', 'BusinessListing', 'BusinessListingCategory',
      'BusinessLocation', 'BusinessServiceArea', 'BusinessSourceRecord', 'BusinessUserLink',
    ])
  })

  it('creates every table and column with the right type and nullability', async () => {
    for (const m of models) {
      const { rows } = await db.query<{ column_name: string; data_type: string; udt_name: string; is_nullable: string }>(
        `SELECT column_name, data_type, udt_name, is_nullable FROM information_schema.columns WHERE table_name = $1`, [m.dbName]
      )
      expect(rows.length, `table ${m.dbName}`).toBeGreaterThan(0)
      const byName = new Map(rows.map((r) => [r.column_name, r]))
      for (const f of m.fields.filter((f) => f.kind !== 'object')) {
        const col = byName.get(f.dbName ?? f.name)
        expect(col, `${m.dbName}.${f.name}`).toBeTruthy()
        if (f.kind === 'enum') expect(col!.udt_name, `${m.dbName}.${f.name}`).toBe(f.type)
        else if (f.isList) expect(col!.data_type, `${m.dbName}.${f.name}`).toBe('ARRAY')
        else expect(col!.data_type, `${m.dbName}.${f.name}`).toBe(typeMap[f.type])
        expect(col!.is_nullable === 'NO', `${m.dbName}.${f.name} required`).toBe(f.isRequired && !f.isList)
      }
      expect(rows.length, `${m.dbName} has no extra columns`).toBe(m.fields.filter((f) => f.kind !== 'object').length)
    }
  })

  it('creates every enum with exactly the Prisma values', async () => {
    for (const e of dm.enums.filter((e) => /^(Business|SourcePolicy)/.test(e.name))) {
      const { rows } = await db.query<{ enumlabel: string }>(
        `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = $1 ORDER BY e.enumsortorder`, [e.name]
      )
      expect(rows.map((r) => r.enumlabel), e.name).toEqual(e.values.map((v) => v.name))
    }
  })

  it('keeps every identifier within PostgreSQL\'s 63-character limit (no silent truncation)', async () => {
    const { rows } = await db.query<{ name: string }>(
      `SELECT indexname AS name FROM pg_indexes WHERE schemaname = 'public'
       UNION SELECT conname FROM pg_constraint WHERE connamespace = 'public'::regnamespace`
    )
    for (const r of rows) expect(r.name.length, r.name).toBeLessThanOrEqual(63)
    // The source SQL must not rely on truncation either.
    const { MIGRATION_SQL } = await import('./helpers')
    for (const id of MIGRATION_SQL.match(/"[A-Za-z0-9_]+"/g) ?? []) expect(id.length - 2, id).toBeLessThanOrEqual(63)
  })

  it('creates every unique and plain index Prisma expects, with Prisma naming', async () => {
    const { rows } = await db.query<{ indexname: string }>(`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`)
    const have = new Set(rows.map((r) => r.indexname))
    for (const m of models) {
      const expected: string[] = [`${m.dbName}_pkey`]
      for (const f of m.fields.filter((f) => f.isUnique && !f.isId)) expected.push(`${m.dbName}_${f.name}_key`)
      const block = schemaText.split(new RegExp(`^model ${m.name} \\{`, 'm'))[1].split(/^\}/m)[0]
      const named = new Map<string, string>()
      for (const mm of block.matchAll(/@@unique\(\[([^\]]+)\](?:,\s*map:\s*"([^"]+)")?\)/g)) named.set(mm[1].split(',').map((x) => x.trim()).join('_'), mm[2])
      for (const u of m.uniqueFields ?? []) expected.push(named.get(u.join('_')) ?? `${m.dbName}_${u.join('_')}_key`)
      for (const mm of block.matchAll(/@@index\(\[([^\]]+)\]\)/g)) expected.push(`${m.dbName}_${mm[1].split(',').map((x) => x.trim()).join('_')}_idx`)
      for (const name of expected) expect(have.has(name), name).toBe(true)
    }
  })

  it('creates every foreign key with the delete behaviour declared in the schema', async () => {
    const { rows } = await db.query<{ constraint_name: string; delete_rule: string }>(
      `SELECT constraint_name, delete_rule FROM information_schema.referential_constraints`
    )
    const have = new Map(rows.map((r) => [r.constraint_name, r.delete_rule]))
    const rule: Record<string, string> = { Cascade: 'CASCADE', SetNull: 'SET NULL', Restrict: 'RESTRICT' }
    let checked = 0
    for (const m of models) {
      for (const f of m.fields.filter((f) => f.kind === 'object' && f.relationFromFields?.length)) {
        const name = `${m.dbName}_${f.relationFromFields!.join('_')}_fkey`
        expect(have.has(name), name).toBe(true)
        expect(have.get(name), name).toBe(rule[f.relationOnDelete ?? ''] ?? (f.isRequired ? 'RESTRICT' : 'SET NULL'))
        checked++
      }
    }
    expect(checked).toBe(22)
  })
})
