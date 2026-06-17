import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/dashboard-layout'
import { AdminClaimsView } from '@/components/admin/claims-view'

export const metadata = { title: 'Admin – Claims' }

export default async function AdminClaimsPage({
  searchParams,
}: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams
  const status = sp.status ?? 'PENDING'

  const claims = await prisma.claimRequest.findMany({
    where: { status },
    include: {
      provider: { select: { id: true, businessName: true, verified: true } },
      claimant: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const counts = await Promise.all([
    prisma.claimRequest.count({ where: { status: 'PENDING' } }),
    prisma.claimRequest.count({ where: { status: 'APPROVED' } }),
    prisma.claimRequest.count({ where: { status: 'REJECTED' } }),
  ])

  return (
    <div>
      <PageHeader title="Claim Requests" description="Review provider ownership claims" />
      <AdminClaimsView
        claims={claims}
        counts={{ PENDING: counts[0], APPROVED: counts[1], REJECTED: counts[2] }}
        activeStatus={status}
      />
    </div>
  )
}
