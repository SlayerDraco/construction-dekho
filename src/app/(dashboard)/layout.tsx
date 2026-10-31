import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { getCurrentUser } from '@/lib/auth'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/?reset=1')

  return (
    <DashboardLayout user={{ name: user.name, label: user.label, isAdmin: user.role === 'ADMIN' }}>
      {children}
    </DashboardLayout>
  )
}
