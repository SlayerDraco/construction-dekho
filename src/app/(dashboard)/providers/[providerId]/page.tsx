import { getCurrentUser } from '@/lib/auth';

import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/dashboard-layout'
import { ProviderDetail } from '@/components/providers/provider-detail'

export async function generateMetadata({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params
  const p = await prisma.serviceProvider.findUnique({ where: { id: providerId }, select: { businessName: true } })
  return { title: p?.businessName ?? 'Provider' }
}

export default async function ProviderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ providerId: string }>
  searchParams: Promise<{ houseId?: string }>
}) {
  const { providerId } = await params
  const sp = await searchParams
  const sessionUser = await getCurrentUser();
  const userId = sessionUser?.id;
  if (!userId) redirect('/?reset=1')

  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    include: {
      ownedHouses: { select: { id: true, projectName: true } }
    }
  })
  if (!user) redirect('/?reset=1')

  const provider = await prisma.serviceProvider.findUnique({
    where: { id: providerId },
    include: {
      categories: { include: { category: true } },
      serviceAreas: true,
      houseProviders: true,
      reviews: {
        include: { house: { select: { projectName: true, city: true } } },
        orderBy: { createdAt: 'desc' },
      },
      user: { select: { fullName: true } },
    },
  })

  if (!provider) notFound()

  const houseId = sp.houseId
  let canReview = false
  if (houseId) {
    const house = await prisma.house.findUnique({ where: { id: houseId } })
    canReview = house?.ownerId === user.id || user.role === 'ADMIN'
  }

  const totalReviews = provider.reviews.length
  const hireAgainCount = provider.reviews.filter((r) => r.wouldHireAgain).length

  return (
    <div>
      <PageHeader
        title={provider.businessName}
        description={provider.categories.map((c) => c.category.name).join(' · ')}
      />
      <ProviderDetail
        provider={{
          ...provider,
          reviewCount: totalReviews,
          hireAgainRate: totalReviews > 0 ? Math.round((hireAgainCount / totalReviews) * 100) : 0,
        }}
        houseId={houseId}
        canReview={canReview}
        currentUserId={user.id}
        userHouses={user.ownedHouses}
      />
    </div>
  )
}