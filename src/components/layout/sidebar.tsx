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
        isActive ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
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
    <aside className="flex flex-col w-64 h-screen border-r border-zinc-200 bg-white shrink-0">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-zinc-200">
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900 leading-none">Construction Dekho</p>
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

      <div className="border-t border-zinc-200 p-3 space-y-1">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-zinc-900 text-white text-xs font-semibold flex items-center justify-center">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">{user.name}</p>
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-zinc-200 flex items-center justify-around px-1 py-2 md:hidden">
      {nav.slice(0, 5).map((item) => {
        const Icon = item.icon
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} className={cn('flex flex-col items-center gap-0.5 px-2 py-1 rounded-md', active ? 'text-zinc-900' : 'text-zinc-500')}>
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
