import { AppSidebar, MobileNav } from '@/components/layout/sidebar'
import { ThemeIconButton } from '@/components/layout/theme-toggle'

interface DashboardLayoutProps {
  children: React.ReactNode
  user?: { name: string; label: string; isAdmin: boolean }
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-transparent text-zinc-900 dark:text-zinc-100">
      <div className="hidden md:flex">
        <AppSidebar user={user} />
      </div>
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
      <ThemeIconButton className="fixed right-3 top-3 z-40 md:hidden" />
      <MobileNav user={user} />
    </div>
  )
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-6 md:px-8 py-5 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">{title}</h1>
        {description && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
