/**
 * Minimal SQL port used by seeds and backfills.
 *
 * Why it exists: these routines are idempotent set-based SQL. Hiding them behind a tiny interface lets
 * the same code run against Prisma in the app and against an in-process Postgres (PGlite) in tests.
 */
export interface SqlExecutor {
  /** Run a statement and return rows (SELECT or INSERT ... RETURNING). */
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>
  /** Run a statement and return the number of affected rows. */
  run(sql: string, params?: unknown[]): Promise<number>
}

/** UTC "now" for TIMESTAMP(3) columns (Prisma stores UTC without a time zone). */
export const SQL_NOW = "(now() AT TIME ZONE 'UTC')"
