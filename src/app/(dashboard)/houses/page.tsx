import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, ProgressBar, EmptyState } from '@/components/ui/index'
import { Building2, Plus, MapPin, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'My Houses' }

export default async function HousesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/onboarding')

  const houses = await prisma.house.findMany({
    where: {
      OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
    },
    include: {
      houseType: true,
      houseStages: { select: { status: true } },
      houseAlerts: { where: { acknowledged: false }, select: { id: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const statusLabel: Record<string, string> = {
    PLANNING: 'Planning',
    ACTIVE: 'Active',
    COMPLETED: 'Completed',
    ARCHIVED: 'Archived',
  }

  const statusVariant: Record<string, 'outline' | 'info' | 'success' | 'warning'> = {
    PLANNING: 'outline',
    ACTIVE: 'info',
    COMPLETED: 'success',
    ARCHIVED: 'warning',
  }

  return (
    <div>
      <PageHeader
        title="My Projects"
        description="All your house construction projects"
        action={
          <Link href="/houses/new">
            <Button leftIcon={<Plus className="h-4 w-4" />} size="sm">New Project</Button>
          </Link>
        }
      />

      <div className="max-w-5xl mx-auto px-6 py-6">
        {houses.length === 0 ? (
          <Card>
            <EmptyState
              icon={Building2}
              title="No projects yet"
              description="Create your first house project to get started with HCOS. We'll guide you through every stage of construction."
              action={
                <Link href="/houses/new">
                  <Button leftIcon={<Plus className="h-4 w-4" />}>Create Your First Project</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {houses.map((house) => {
              const completed = house.houseStages.filter(
                (s) => s.status === 'COMPLETED' || s.status === 'COMPLETED_WITH_WARNINGS'
              ).length
              const total = house.houseStages.length
              return (
                <Link key={house.id} href={`/houses/${house.id}`}>
                  <Card hover className="h-full group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                      </div>
                      <Badge variant={statusVariant[house.projectStatus]}>
                        {statusLabel[house.projectStatus]}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">
                      {house.projectName}
                    </h3>

                    <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                      <MapPin className="h-3 w-3" />
                      {house.city}, {house.state}
                    </div>

                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                      {house.houseType?.name} · {house.floors}F · {house.bedrooms}BR · {house.bathrooms}BA
                    </div>

                    <ProgressBar value={total > 0 ? (completed / total) * 100 : 0} size="sm" className="mb-2" />
                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{completed}/{total} stages</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(house.createdAt)}
                      </div>
                    </div>

                    {house.houseAlerts.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <Badge variant="danger">{house.houseAlerts.length} alert{house.houseAlerts.length !== 1 ? 's' : ''}</Badge>
                      </div>
                    )}
                  </Card>
                </Link>
              )
            })}

            {/* Add new project card */}
            <Link href="/houses/new">
              <div className="h-full rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center py-10 px-6 text-center hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group">
                <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center mb-3 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                  <Plus className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">New Project</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Add a house to track</p>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
