import { SignIn } from '@clerk/nextjs'
import { Building2 } from 'lucide-react'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-zinc-900 dark:bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-white dark:text-zinc-900" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">HCOS</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">House Construction Operating System</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: 'bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium',
              card: 'shadow-none border border-zinc-200 dark:border-zinc-800 rounded-xl',
              headerTitle: 'text-zinc-900 dark:text-zinc-100',
              headerSubtitle: 'text-zinc-500 dark:text-zinc-400',
            },
          }}
        />
      </div>
    </div>
  )
}
