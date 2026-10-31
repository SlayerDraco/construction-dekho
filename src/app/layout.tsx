import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemedToaster, themeInitScript } from '@/components/layout/theme-toggle'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: 'Construction Dekho – House Construction Operating System',
    template: '%s | Construction Dekho',
  },
  description: 'Your trusted guide through every stage of house construction. Plan, track, and complete your build with confidence.',
  keywords: ['house construction', 'home building', 'construction tracking', 'India'],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    title: 'Construction Dekho',
    description: 'Your trusted guide through every stage of house construction.',
    siteName: 'Construction Dekho',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100`}>
        {children}
        <ThemedToaster />
      </body>
    </html>
  )
}
