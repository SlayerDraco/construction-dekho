import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

export type AuditAction =
  | 'STAGE_COMPLETED'
  | 'STAGE_COMPLETED_WITH_WARNINGS'
  | 'FEATURE_ADDED'
  | 'FEATURE_REMOVED'
  | 'DECISION_UPDATED'
  | 'ADMIN_ACTION'
  | 'CLAIM_APPROVED'
  | 'CLAIM_REJECTED'
  | 'HOUSE_CREATED'
  | 'HOUSE_UPDATED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_DELETED'
  | 'PROGRESS_VERIFIED'
  | 'PROGRESS_REJECTED'
  | 'EXPENSE_ADDED'
  | 'TASK_COMPLETED'
  | 'TASK_SKIPPED'
  | 'ALERT_ACKNOWLEDGED'
  | 'PROVIDER_CREATED'
  | 'PROVIDER_UPDATED'
  | 'PROVIDER_VERIFIED'

export async function createAuditLog({
  userId,
  houseId,
  action,
  entity,
  entityId,
  metadata,
}: {
  userId: string
  houseId?: string
  action: AuditAction
  entity: string
  entityId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        houseId,
        action,
        entity,
        entityId,
        metadata: (metadata ?? {}) as Prisma.InputJsonValue,
      },
    })
  } catch (err) {
    // Audit log failures should not break core flows
    console.error('[AuditLog] Failed to create audit log:', err)
  }
}
