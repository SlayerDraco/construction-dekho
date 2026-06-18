import { SignIn } from '@clerk/nextjs'
import { Building2 } from 'lucide-react'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">HCOS</h1>
          <p className="text-sm text-zinc-500 mt-1">House Construction Operating System</p>
        </div>
        <SignIn
          fallbackRedirectUrl="/dashboard"
          appearance={{
            elements: {
              formButtonPrimary: 'bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium',
              card: 'shadow-none border border-zinc-200 rounded-xl',
              headerTitle: 'text-zinc-900',
              headerSubtitle: 'text-zinc-500',
            },
          }}
        />
      </div>
    </div>
  )
}