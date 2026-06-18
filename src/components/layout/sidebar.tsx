'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home, Map, CheckSquare, DollarSign, FileText,
  Users, Bell, Settings, Building2, ShieldCheck, BarChart3,
  AlertTriangle, Wrench, LogOut
} from 'lucide-react'
import { UserButton, SignOutButton } from '@clerk/nextjs'

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
  houseId?: string
  isAdmin?: boolean
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
        'hover:bg-zinc-100',
        isActive
          ? 'bg-zinc-100 text-zinc-900'
          : 'text-zinc-600'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}

export function AppSidebar({ houseId, isAdmin }: SidebarProps) {
  const nav = isAdmin ? adminNav : houseId ? houseNav(houseId) : mainNav

  return (
    <aside className="flex flex-col w-64 h-screen border-r border-zinc-200 bg-white shrink-0">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-zinc-200">
        <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-900 leading-none">HCOS</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Construction OS</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {!houseId && !isAdmin && (
          <div className="mb-6">
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Navigation</p>
            <div className="space-y-0.5">
              {mainNav.map((item) => <NavLink key={item.href} item={item} />)}
            </div>
          </div>
        )}
        {houseId && (
          <div className="mb-6">
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Project</p>
            <div className="space-y-0.5">
              {houseNav(houseId).map((item) => <NavLink key={item.href} item={item} />)}
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Platform</p>
              {mainNav.map((item) => <NavLink key={item.href} item={item} />)}
            </div>
          </div>
        )}
        {isAdmin && (
          <div className="space-y-0.5">
            {adminNav.map((item) => <NavLink key={item.href} item={item} />)}
          </div>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-zinc-200 flex items-center justify-between">
        <UserButton />
        <SignOutButton>
          <button className="text-zinc-500 hover:text-zinc-900 flex items-center gap-2 text-sm font-medium transition-colors">
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </SignOutButton>
      </div>
    </aside>
  )
}

export function MobileNav({ houseId, isAdmin }: SidebarProps) {
  const nav = isAdmin ? adminNav : houseId ? houseNav(houseId) : mainNav

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200 flex items-center justify-around px-2 py-2 md:hidden">
      {nav.slice(0, 5).map((item) => {
        const Icon = item.icon
        return (
          <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 px-3 py-1 text-zinc-600">
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}