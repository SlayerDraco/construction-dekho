'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Badge, EmptyState, Modal, Select } from '@/components/ui/index'
import { Input } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Users, UserPlus, Trash2, Crown } from 'lucide-react'

const ROLES = [
  { label: 'Family Member', value: 'FAMILY_MEMBER' },
  { label: 'Contractor', value: 'CONTRACTOR' },
  { label: 'Architect', value: 'ARCHITECT' },
]

const ROLE_VARIANT: Record<string, 'info' | 'success' | 'warning' | 'outline'> = {
  OWNER: 'info',
  FAMILY_MEMBER: 'outline',
  CONTRACTOR: 'warning',
  ARCHITECT: 'success',
}

interface MembersViewProps {
  houseId: string
  houseName: string
  owner: any
  members: any[]
  canManage: boolean
  currentUserId: string
}

export function MembersView({ houseId, houseName, owner, members: initialMembers, canManage, currentUserId }: MembersViewProps) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('FAMILY_MEMBER')
  const [inviting, setInviting] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleInvite() {
    if (!inviteEmail.trim()) { toast.error('Enter an email address'); return }
    setInviting(true)
    try {
      const res = await fetch(`/api/houses/${houseId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      if (res.ok) {
        toast.success('Member added successfully')
        setShowInvite(false)
        setInviteEmail('')
        router.refresh()
      } else {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to add member')
      }
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove(memberId: string) {
    setRemoving(memberId)
    try {
      const res = await fetch(`/api/houses/${houseId}/members?memberId=${memberId}`, { method: 'DELETE' })
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId))
        toast.success('Member removed')
      } else {
        toast.error('Failed to remove member')
      }
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Team Members"
        description={`${houseName} · ${members.length + 1} member${members.length !== 0 ? 's' : ''}`}
        action={
          canManage && (
            <Button leftIcon={<UserPlus className="h-4 w-4" />} size="sm" onClick={() => setShowInvite(true)}>
              Add Member
            </Button>
          )
        }
      />

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-3">
        {/* Owner */}
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-sm font-bold text-white dark:text-zinc-900 shrink-0">
              {owner?.fullName?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{owner?.fullName}</p>
                <Crown className="h-3.5 w-3.5 text-yellow-500" />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{owner?.email}</p>
            </div>
            <Badge variant="info">Owner</Badge>
          </div>
        </Card>

        {/* Members */}
        {members.length === 0 && (
          <Card>
            <EmptyState
              icon={Users}
              title="No other members yet"
              description="Add family members, contractors, or architects to collaborate on this project."
              action={
                canManage && (
                  <Button leftIcon={<UserPlus className="h-4 w-4" />} size="sm" onClick={() => setShowInvite(true)}>
                    Add Member
                  </Button>
                )
              }
            />
          </Card>
        )}

        {members.map((member) => (
          <Card key={member.id} padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-600 dark:text-zinc-400 shrink-0">
                {member.user?.fullName?.[0] ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{member.user?.fullName}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{member.user?.email}</p>
              </div>
              <Badge variant={ROLE_VARIANT[member.role] ?? 'outline'}>
                {member.role.replace('_', ' ')}
              </Badge>
              {canManage && member.userId !== currentUserId && (
                <button
                  onClick={() => handleRemove(member.id)}
                  disabled={removing === member.id}
                  className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  {removing === member.id
                    ? <div className="h-4 w-4 border border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                </button>
              )}
            </div>
          </Card>
        ))}

        {/* Role permissions info */}
        <Card padding="sm" className="bg-zinc-50 dark:bg-zinc-800/50">
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Role Permissions</p>
          <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <p><span className="font-medium text-zinc-700 dark:text-zinc-300">Owner</span> — Full access to all features</p>
            <p><span className="font-medium text-zinc-700 dark:text-zinc-300">Family Member</span> — View project, progress, and budget</p>
            <p><span className="font-medium text-zinc-700 dark:text-zinc-300">Contractor</span> — Submit progress updates and view documents</p>
            <p><span className="font-medium text-zinc-700 dark:text-zinc-300">Architect</span> — Upload and view documents</p>
          </div>
        </Card>
      </div>

      <Modal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="Add Team Member"
        description="The user must already have an HCOS account."
      >
        <div className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="member@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
          />
          <Select
            label="Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={ROLES}
          />
          <div className="flex gap-2 pt-1">
            <Button onClick={handleInvite} loading={inviting} leftIcon={<UserPlus className="h-4 w-4" />}>
              Add Member
            </Button>
            <Button variant="ghost" onClick={() => setShowInvite(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
