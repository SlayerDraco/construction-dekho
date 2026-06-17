import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { HouseSettings } from '@/components/house/house-settings'

export const metadata = { title: 'House Settings' }

export default async function SettingsPage({ params }: { params: Promise<{ houseId: string }> }) {
  const { houseId } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/onboarding')

  const house = await prisma.house.findUnique({
    where: { id: houseId },
    include: {
      houseType: true,
      houseFeatures: { where: { enabled: true }, include: { feature: true } },
    },
  })
  if (!house) notFound()

  const isOwner = house.ownerId === user.id
  if (!isOwner && user.role !== 'ADMIN') redirect(`/houses/${houseId}`)

  const [houseTypes, allFeatures] = await Promise.all([
    prisma.houseType.findMany({ orderBy: { name: 'asc' } }),
    prisma.feature.findMany({ where: { active: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
  ])

  const enabledFeatureIds = new Set(house.houseFeatures.map((hf) => hf.featureId))

  return (
    <DashboardLayout houseId={houseId}>
      <HouseSettings
        house={{ ...house, enabledFeatureIds: Array.from(enabledFeatureIds) }}
        houseTypes={houseTypes}
        allFeatures={allFeatures.map((f) => ({ ...f, enabled: enabledFeatureIds.has(f.id) }))}
      />
    </DashboardLayout>
  )
}
