'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ArrowRight } from 'lucide-react'
import { DEMO_COOKIE, DEMO_PROFILES } from '@/lib/demo-profiles'

export default function ProfilePicker() {
  const router = useRouter()
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    setMissing(new URLSearchParams(window.location.search).has('reset'))
  }, [])

  const select = (id: string) => {
    document.cookie = `${DEMO_COOKIE}=${id}; path=/; max-age=86400; samesite=lax`
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-white flex flex-col items-center justify-center px-6 py-16">
      <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: 'radial-gradient(60rem 30rem at 50% -10%, rgba(99,102,241,0.25), transparent), radial-gradient(40rem 25rem at 90% 110%, rgba(16,185,129,0.15), transparent)' }} />

      <div className="relative flex flex-col items-center text-center">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-xl bg-white text-zinc-900 flex items-center justify-center shadow-lg">
            <Building2 className="h-6 w-6" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Construction Dekho</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Who&apos;s viewing the demo?</h1>
        <p className="mt-4 max-w-xl text-zinc-400">
          Pick a profile to explore the platform instantly. No sign-up needed. You can switch profiles any time from the sidebar.
        </p>
      </div>

      {missing && (
        <div className="relative mt-8 max-w-xl rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Demo data wasn&apos;t found in the database this app is connected to. Run <code className="font-mono">npm run db:setup</code> and make sure <code className="font-mono">DATABASE_URL</code> in <code className="font-mono">.env.local</code> (if present) matches <code className="font-mono">.env</code>.
        </div>
      )}

      <div className="relative mt-14 grid w-full max-w-4xl gap-5 sm:grid-cols-3">
        {DEMO_PROFILES.map((p) => (
          <button
            key={p.id}
            onClick={() => select(p.id)}
            className="group text-left rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.08] focus-visible:outline-white"
          >
            <div className={`h-16 w-16 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center text-2xl font-semibold shadow-lg`}>
              {p.name.charAt(0)}
            </div>
            <h2 className="mt-5 text-lg font-semibold">{p.name}</h2>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mt-0.5">{p.label}</p>
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{p.blurb}</p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-zinc-300 group-hover:text-white">
              Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        ))}
      </div>
    </main>
  )
}
