import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: 'HCOS – House Construction Operating System',
    template: '%s | HCOS',
  },
  description: 'Your trusted guide through every stage of house construction. Plan, track, and complete your build with confidence.',
  keywords: ['house construction', 'home building', 'construction tracking', 'India'],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    title: 'HCOS – House Construction Operating System',
    description: 'Your trusted guide through every stage of house construction.',
    siteName: 'HCOS',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased`}>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </body>
      </html>
    </ClerkProvider>
  )
}