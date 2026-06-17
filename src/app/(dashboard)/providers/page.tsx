import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProvidersView } from '@/components/providers/providers-view'
import { PageHeader } from '@/components/layout/dashboard-layout'

export const metadata = { title: 'Service Providers' }

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; category?: string; page?: string }>
}) {
  const sp = await searchParams
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/onboarding')

  const page = parseInt(sp.page ?? '1')
  const limit = 20
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { active: true }
  if (sp.q) {
    where.OR = [
      { businessName: { contains: sp.q, mode: 'insensitive' } },
      { description: { contains: sp.q, mode: 'insensitive' } },
    ]
  }
  if (sp.city) where.serviceAreas = { some: { city: { contains: sp.city, mode: 'insensitive' } } }
  if (sp.category) where.categories = { some: { category: { name: { contains: sp.category, mode: 'insensitive' } } } }

  const [providers, total, categories] = await Promise.all([
    prisma.serviceProvider.findMany({
      where,
      include: {
        categories: { include: { category: true } },
        serviceAreas: true,
        reviews: { select: { wouldHireAgain: true } },
      },
      skip,
      take: limit,
      orderBy: [{ verified: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.serviceProvider.count({ where }),
    prisma.serviceCategory.findMany({ orderBy: { name: 'asc' } }),
  ])

  // Get user's houses for recommendations
  const userHouses = await prisma.house.findMany({
    where: { ownerId: user.id, projectStatus: { not: 'ARCHIVED' } },
    select: { id: true, projectName: true, city: true },
    take: 5,
  })

  return (
    <div>
      <PageHeader
        title="Service Providers"
        description="Find trusted professionals for your construction project"
      />
      <ProvidersView
        providers={providers.map((p) => ({
          ...p,
          reviewCount: p.reviews.length,
          hireAgainRate: p.reviews.length > 0
            ? Math.round((p.reviews.filter((r) => r.wouldHireAgain).length / p.reviews.length) * 100)
            : 0,
        }))}
        total={total}
        page={page}
        totalPages={Math.ceil(total / limit)}
        categories={categories}
        userHouses={userHouses}
        initialFilters={{ q: sp.q, city: sp.city, category: sp.category }}
      />
    </div>
  )
}
