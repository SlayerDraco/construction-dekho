'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()

  useEffect(() => {
    async function syncUser() {
      try {
        const res = await fetch('/api/user', { method: 'POST' })
        if (res.ok) {
          router.replace('/dashboard')
        } else {
          console.error('Failed to sync user')
          router.replace('/dashboard')
        }
      } catch {
        router.replace('/dashboard')
      }
    }
    syncUser()
  }, [router])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-zinc-900 dark:bg-zinc-100 rounded-2xl flex items-center justify-center animate-pulse">
          <Building2 className="h-6 w-6 text-white dark:text-zinc-900" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Setting up your account...</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Just a moment</p>
        </div>
      </div>
    </div>
  )
}
