import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge, EmptyState } from '@/components/ui/index'
import { Building2, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Admin – Houses' }

export default async function AdminHousesPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const sp = await searchParams
  const page = parseInt(sp.page ?? '1')
  const limit = 25
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (sp.q) where.projectName = { contains: sp.q, mode: 'insensitive' }
  if (sp.status) where.projectStatus = sp.status

  const [houses, total] = await Promise.all([
    prisma.house.findMany({
      where,
      include: {
        owner: { select: { fullName: true, email: true } },
        houseType: true,
        _count: { select: { members: true, progressUpdates: true, houseAlerts: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.house.count({ where }),
  ])

  const statusVariant: Record<string, 'info' | 'success' | 'outline' | 'warning'> = {
    PLANNING: 'outline',
    ACTIVE: 'info',
    COMPLETED: 'success',
    ARCHIVED: 'warning',
  }

  return (
    <div>
      <PageHeader title="Houses" description={`${total} total projects`} />

      <div className="max-w-6xl mx-auto px-6 py-6">
        {houses.length === 0 ? (
          <Card>
            <EmptyState icon={Building2} title="No houses found" description="Houses appear here once users create them." />
          </Card>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Project</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Owner</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Progress</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Created</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">View</th>
                  </tr>
                </thead>
                <tbody>
                  {houses.map((house) => (
                    <tr key={house.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{house.projectName}</p>
                        <p className="text-xs text-zinc-400">{house.houseType?.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-zinc-700 dark:text-zinc-300">{house.owner?.fullName}</p>
                        <p className="text-xs text-zinc-400">{house.owner?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                        {house.city}, {house.state}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full"
                              style={{ width: `${house.currentProgress}%` }}
                            />
                          </div>
                          <span className="text-xs text-zinc-500">{Math.round(house.currentProgress)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[house.projectStatus] ?? 'outline'}>
                          {house.projectStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs">
                        {formatDate(house.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/houses/${house.id}`}
                          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
