import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/dashboard-layout'
import { AdminUsersTable } from '@/components/admin/users-table'

export const metadata = { title: 'Admin – Users' }

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>
}) {
  const sp = await searchParams
  const page = parseInt(sp.page ?? '1')
  const limit = 25
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (sp.q) {
    where.OR = [
      { fullName: { contains: sp.q, mode: 'insensitive' } },
      { email: { contains: sp.q, mode: 'insensitive' } },
    ]
  }
  if (sp.role) where.role = sp.role

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        _count: { select: { ownedHouses: true } },
        serviceProvider: { select: { id: true, businessName: true, verified: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ])

  return (
    <div>
      <PageHeader title="Users" description={`${total} total users`} />
      <AdminUsersTable
        users={users}
        total={total}
        page={page}
        totalPages={Math.ceil(total / limit)}
        initialFilters={{ q: sp.q, role: sp.role }}
      />
    </div>
  )
}
