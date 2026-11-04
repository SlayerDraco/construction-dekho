import type { Prisma, PrismaClient } from '@prisma/client'
import type { SqlExecutor } from './sql-executor'

type Client = PrismaClient | Prisma.TransactionClient

export function prismaExecutor(client: Client): SqlExecutor {
  return {
    all: <T>(sql: string, params: unknown[] = []) => client.$queryRawUnsafe<T[]>(sql, ...params),
    run: (sql: string, params: unknown[] = []) => client.$executeRawUnsafe(sql, ...params),
  }
}
