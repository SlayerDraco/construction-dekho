import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/dashboard-layout'
import { AdminProvidersView } from '@/components/admin/providers-view'

export const metadata = { title: 'Admin – Providers' }

export default async function AdminProvidersPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; verified?: string; page?: string }> }) {
  const sp = await searchParams
  const page = parseInt(sp.page ?? '1')
  const limit = 20
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (sp.q) where.businessName = { contains: sp.q, mode: 'insensitive' }
  if (sp.verified !== undefined && sp.verified !== '') where.verified = sp.verified === 'true'

  const [providers, total, categories] = await Promise.all([
    prisma.serviceProvider.findMany({
      where,
      include: {
        user: { select: { fullName: true, email: true } },
        categories: { include: { category: true } },
        serviceAreas: true,
        _count: { select: { reviews: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.serviceProvider.count({ where }),
    prisma.serviceCategory.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div>
      <PageHeader title="Service Providers" description={`${total} providers`} />
      <AdminProvidersView
        providers={providers}
        total={total}
        page={page}
        totalPages={Math.ceil(total / limit)}
        categories={categories}
        initialFilters={{ q: sp.q, verified: sp.verified }}
      />
    </div>
  )
}
