import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DocumentVault } from '@/components/documents/document-vault'

export const metadata = { title: 'Documents' }

export default async function DocumentsPage({ params }: { params: Promise<{ houseId: string }> }) {
  const { houseId } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/onboarding')

  const house = await prisma.house.findUnique({ where: { id: houseId } })
  if (!house) notFound()

  const isOwner = house.ownerId === user.id
  const isMember = await prisma.houseMember.findUnique({ where: { houseId_userId: { houseId, userId: user.id } } })
  if (!isOwner && !isMember && user.role !== 'ADMIN') redirect('/houses')

  const documents = await prisma.document.findMany({
    where: { houseId },
    orderBy: { uploadedAt: 'desc' },
  })

  const canUpload = isOwner || user.role === 'ADMIN' || isMember?.role === 'ARCHITECT'

  return (
    <DashboardLayout houseId={houseId}>
      <DocumentVault
        houseId={houseId}
        houseName={house.projectName}
        documents={documents}
        canUpload={canUpload}
        canDelete={isOwner || user.role === 'ADMIN'}
      />
    </DashboardLayout>
  )
}
