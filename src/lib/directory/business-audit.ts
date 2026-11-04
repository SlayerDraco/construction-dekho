import type { Prisma, PrismaClient } from '@prisma/client'

/** Actions that sensitive admin decisions write to the business audit trail. Later phases add the call sites. */
export type BusinessAuditAction =
  | 'CATEGORY_CREATED' | 'CATEGORY_UPDATED' | 'CATEGORY_DEACTIVATED' | 'CATEGORY_REACTIVATED' | 'CATEGORY_DELETED'
  | 'CATEGORY_STAGES_CHANGED' | 'CATEGORY_MAPPINGS_CHANGED'
  | 'LISTING_BACKFILLED' | 'LISTING_PUBLISHED' | 'LISTING_REJECTED' | 'LISTING_EDITED' | 'LISTING_MERGED' | 'LISTING_REMOVED'
  | 'VERIFICATION_GRANTED' | 'VERIFICATION_REVOKED' | 'PROMOTION_CHANGED'

type Db = PrismaClient | Prisma.TransactionClient

export async function writeBusinessAudit(
  db: Db,
  entry: {
    actorId: string | null
    action: BusinessAuditAction
    entityType: string
    entityId?: string | null
    businessId?: string | null
    before?: Prisma.InputJsonValue
    after?: Prisma.InputJsonValue
    reason?: string
  }
) {
  return db.businessAuditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      businessId: entry.businessId ?? null,
      before: entry.before,
      after: entry.after,
      reason: entry.reason,
    },
  })
}
