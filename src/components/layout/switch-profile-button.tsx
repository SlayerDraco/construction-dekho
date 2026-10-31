'use client'

import { useRouter } from 'next/navigation'
import { Repeat } from 'lucide-react'
import { DEMO_COOKIE } from '@/lib/demo-profiles'
import { cn } from '@/lib/utils'

export function SwitchProfileButton({ className }: { className?: string }) {
  const router = useRouter()

  const handleSwitch = () => {
    document.cookie = `${DEMO_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleSwitch}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900',
        className
      )}
    >
      <Repeat className="h-4 w-4" />
      Switch Profile
    </button>
  )
}
