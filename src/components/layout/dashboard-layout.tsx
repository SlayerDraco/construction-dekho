import { AppSidebar, MobileNav } from '@/components/layout/sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
  houseId?: string
  isAdmin?: boolean
}

export function DashboardLayout({ children, houseId, isAdmin }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <AppSidebar houseId={houseId} isAdmin={isAdmin} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <MobileNav houseId={houseId} isAdmin={isAdmin} />
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
    <div className="flex items-start justify-between px-6 py-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{title}</h1>
        {description && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  )
}
