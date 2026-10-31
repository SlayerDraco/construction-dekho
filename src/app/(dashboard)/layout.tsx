import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/');
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
