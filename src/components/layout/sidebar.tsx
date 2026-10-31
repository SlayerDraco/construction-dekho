'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home, Map, CheckSquare, DollarSign, FileText,
  Users, Bell, Building2, ShieldCheck, BarChart3,
  AlertTriangle, Wrench
} from 'lucide-react'

import { SwitchProfileButton } from './switch-profile-button'
import { ThemeSwitch } from './theme-toggle'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
}

const mainNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3, exact: true },
  { href: '/houses', label: 'My Houses', icon: Home },
  { href: '/providers', label: 'Service Providers', icon: Wrench },
  { href: '/notifications', label: 'Notifications', icon: Bell },
]

const houseNav = (houseId: string): NavItem[] => [
  { href: `/houses/${houseId}`, label: 'Overview', icon: Home, exact: true },
  { href: `/houses/${houseId}/roadmap`, label: 'Roadmap', icon: Map },
  { href: `/houses/${houseId}/tasks`, label: 'Tasks', icon: CheckSquare },
  { href: `/houses/${houseId}/budget`, label: 'Budget', icon: DollarSign },
  { href: `/houses/${houseId}/documents`, label: 'Documents', icon: FileText },
  { href: `/houses/${houseId}/progress`, label: 'Progress', icon: BarChart3 },
  { href: `/houses/${houseId}/alerts`, label: 'Alerts', icon: AlertTriangle },
  { href: `/houses/${houseId}/members`, label: 'Team', icon: Users },
]

const adminNav: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: ShieldCheck, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/houses', label: 'Houses', icon: Building2 },
  { href: '/admin/providers', label: 'Providers', icon: Wrench },
  { href: '/admin/claims', label: 'Claims', icon: CheckSquare },
]

interface SidebarProps {
  user?: { name: string; label: string; isAdmin: boolean }
}

/** Derives which navigation to show from the current route. */
function useNav() {
  const pathname = usePathname()
  const houseMatch = pathname.match(/^\/houses\/([^/]+)/)
  const houseId = houseMatch && houseMatch[1] !== 'new' ? houseMatch[1] : undefined
  const isAdminRoute = pathname.startsWith('/admin')
  return { houseId, isAdminRoute }
}

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        'relative',
        isActive
          ? 'bg-brand-600/10 text-brand-700 dark:bg-brand-600/20 dark:text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r before:bg-brand-600 dark:before:bg-accent'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white'
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-brand-600 dark:text-accent')} />
      <span>{item.label}</span>
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{children}</p>
}

export function AppSidebar({ user }: SidebarProps) {
  const { houseId, isAdminRoute } = useNav()

  return (
    <aside className="flex flex-col w-64 h-screen border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/90 backdrop-blur shrink-0">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-600/40">
          <Building2 className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-none">Construction Dekho</p>
          <p className="text-[11px] text-zinc-500 mt-1">Construction OS</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {isAdminRoute ? (
          <div>
            <SectionLabel>Administration</SectionLabel>
            <div className="space-y-0.5">{adminNav.map((i) => <NavLink key={i.href} item={i} />)}</div>
            <div className="mt-6">
              <SectionLabel>Platform</SectionLabel>
              <div className="space-y-0.5">{mainNav.map((i) => <NavLink key={i.href} item={i} />)}</div>
            </div>
          </div>
        ) : (
          <>
            {houseId && (
              <div>
                <SectionLabel>Project</SectionLabel>
                <div className="space-y-0.5">{houseNav(houseId).map((i) => <NavLink key={i.href} item={i} />)}</div>
              </div>
            )}
            <div>
              <SectionLabel>{houseId ? 'Platform' : 'Navigation'}</SectionLabel>
              <div className="space-y-0.5">{mainNav.map((i) => <NavLink key={i.href} item={i} />)}</div>
            </div>
            {user?.isAdmin && (
              <div>
                <SectionLabel>Admin</SectionLabel>
                <div className="space-y-0.5">
                  <NavLink item={{ href: '/admin', label: 'Admin Console', icon: ShieldCheck }} />
                </div>
              </div>
            )}
          </>
        )}
      </nav>

      <div className="border-t border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
        <ThemeSwitch />
        {user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-brand-600 text-white dark:bg-accent dark:text-zinc-950 text-xs font-semibold flex items-center justify-center">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-zinc-500">{user.label}</p>
            </div>
          </div>
        )}
        <SwitchProfileButton />
      </div>
    </aside>
  )
}

export function MobileNav({ user }: SidebarProps) {
  const { houseId, isAdminRoute } = useNav()
  const pathname = usePathname()
  const nav = isAdminRoute ? adminNav : houseId ? houseNav(houseId) : mainNav

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around px-1 py-2 md:hidden">
      {nav.slice(0, 5).map((item) => {
        const Icon = item.icon
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} className={cn('flex flex-col items-center gap-0.5 px-2 py-1 rounded-md', active ? 'text-brand-600 dark:text-accent' : 'text-zinc-500')}>
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
      {user && (
        <div className="px-1"><SwitchProfileButton className="!w-auto !px-2 [&>svg]:h-5 [&>svg]:w-5 flex-col gap-0.5 text-[10px]" /></div>
      )}
    </nav>
  )
}
