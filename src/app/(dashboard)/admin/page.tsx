import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Users, Home, Wrench, Star, FileText, CheckCircle, AlertTriangle } from 'lucide-react'

export default async function AdminDashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (user?.role !== 'ADMIN') redirect('/dashboard')

  const stats = {
    users: await prisma.user.count(),
    houses: await prisma.house.count(),
    providers: await prisma.serviceProvider.count(),
    reviews: await prisma.review.count(),
    activeProjects: await prisma.house.count({ where: { projectStatus: 'ACTIVE' } }),
    completedProjects: await prisma.house.count({ where: { projectStatus: 'COMPLETED' } }),
    pendingClaims: await prisma.claimRequest.count({ where: { status: 'PENDING' } })
  }

  return (
    <div>
      <PageHeader 
        title="Admin Dashboard" 
        description="Platform overview and key statistics" 
      />
      
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase">Total Users</p>
            <p className="text-2xl font-bold text-zinc-900">{stats.users}</p>
          </div>
        </Card>
        
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
            <Home className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase">Total Houses</p>
            <p className="text-2xl font-bold text-zinc-900">{stats.houses}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
            <Wrench className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase">Providers</p>
            <p className="text-2xl font-bold text-zinc-900">{stats.providers}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
            <Star className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase">Reviews</p>
            <p className="text-2xl font-bold text-zinc-900">{stats.reviews}</p>
          </div>
        </Card>
      </div>

      <div className="px-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-zinc-400" /> 
            Projects Activity
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Active Construction
              </div>
              <span className="font-semibold text-zinc-900">{stats.activeProjects}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                Completed Projects
              </div>
              <span className="font-semibold text-zinc-900">{stats.completedProjects}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-zinc-400" /> 
            Pending Actions
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-600">Provider Claim Requests</span>
              <span className={`font-semibold ${stats.pendingClaims > 0 ? 'text-orange-600' : 'text-zinc-900'}`}>
                {stats.pendingClaims}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}