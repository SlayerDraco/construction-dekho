'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Badge, EmptyState, Modal, Select } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Users, Search, ChevronLeft, ChevronRight, Edit2, Building2 } from 'lucide-react'

const ROLES = ['OWNER', 'FAMILY_MEMBER', 'CONTRACTOR', 'SERVICE_PROVIDER', 'ARCHITECT', 'ADMIN']

interface AdminUsersTableProps {
  users: any[]
  total: number
  page: number
  totalPages: number
  initialFilters: { q?: string; role?: string }
}

export function AdminUsersTable({ users, total, page, totalPages, initialFilters }: AdminUsersTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [q, setQ] = useState(initialFilters.q ?? '')
  const [role, setRole] = useState(initialFilters.role ?? '')
  const [editUser, setEditUser] = useState<any | null>(null)
  const [newRole, setNewRole] = useState('')
  const [saving, setSaving] = useState(false)

  function applyFilters(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams()
    const qv = overrides.q ?? q
    const rv = overrides.role ?? role
    if (qv) params.set('q', qv)
    if (rv) params.set('role', rv)
    params.set('page', '1')
    startTransition(() => router.push(`/admin/users?${params.toString()}`))
  }

  async function handleSaveRole() {
    if (!editUser || !newRole) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users?userId=${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) {
        toast.success('User role updated')
        setEditUser(null)
        router.refresh()
      } else {
        toast.error('Failed to update role')
      }
    } finally {
      setSaving(false)
    }
  }

  const roleVariant: Record<string, 'danger' | 'warning' | 'info' | 'success' | 'outline'> = {
    ADMIN: 'danger',
    OWNER: 'info',
    CONTRACTOR: 'warning',
    ARCHITECT: 'success',
    SERVICE_PROVIDER: 'outline',
    FAMILY_MEMBER: 'outline',
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search name or email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300"
          />
        </div>
        <Select
          value={role}
          onChange={(e) => { setRole(e.target.value); applyFilters({ role: e.target.value }) }}
          options={[{ label: 'All roles', value: '' }, ...ROLES.map((r) => ({ label: r, value: r }))]}
          className="w-44"
        />
        <Button size="sm" onClick={() => applyFilters()} loading={isPending}>Search</Button>
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title="No users found" description="Try different search terms." />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Houses</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-400 shrink-0">
                          {user.fullName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{user.fullName}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={roleVariant[user.role] ?? 'outline'}>{user.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{user._count?.ownedHouses ?? 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                        onClick={() => { setEditUser(user); setNewRole(user.role) }}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Showing {users.length} of {total} users
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              disabled={page <= 1}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
              onClick={() => {
                const params = new URLSearchParams()
                if (q) params.set('q', q)
                if (role) params.set('role', role)
                params.set('page', String(page - 1))
                router.push(`/admin/users?${params.toString()}`)
              }}
            >Prev</Button>
            <Button
              variant="outline" size="sm"
              disabled={page >= totalPages}
              rightIcon={<ChevronRight className="h-4 w-4" />}
              onClick={() => {
                const params = new URLSearchParams()
                if (q) params.set('q', q)
                if (role) params.set('role', role)
                params.set('page', String(page + 1))
                router.push(`/admin/users?${params.toString()}`)
              }}
            >Next</Button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title="Edit User Role"
        description={editUser?.email}
      >
        <div className="space-y-4">
          <Select
            label="Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            options={ROLES.map((r) => ({ label: r, value: r }))}
          />
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSaveRole} loading={saving}>Save Changes</Button>
            <Button variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
