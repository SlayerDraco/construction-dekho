'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Toaster } from 'sonner'
import { cn } from '@/lib/utils'

export const THEME_KEY = 'hcos-theme'
type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {}
  window.dispatchEvent(new CustomEvent('hcos-theme-change', { detail: theme }))
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const read = () => setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    read()
    window.addEventListener('hcos-theme-change', read)
    return () => window.removeEventListener('hcos-theme-change', read)
  }, [])

  return { theme, set: applyTheme }
}

/** Segmented Light | Dark switch (used in the sidebar). */
export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, set } = useTheme()
  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
  ]

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn('grid grid-cols-2 gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900', className)}
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            onClick={() => set(value)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all',
              active
                ? 'bg-white text-brand-700 shadow-sm dark:bg-brand-600 dark:text-white'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            )}
          >
            <Icon className={cn('h-3.5 w-3.5', active && 'dark:text-accent')} />
            {label}
          </button>
        )
      })}
    </div>
  )
}

/** Compact round icon button (used on mobile). */
export function ThemeIconButton({ className }: { className?: string }) {
  const { theme, set } = useTheme()
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      onClick={() => set(next)}
      aria-label={`Switch to ${next} mode`}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-700 shadow-sm backdrop-blur transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-800',
        className
      )}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4 text-accent" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

/** Sonner toaster that follows the active theme. */
export function ThemedToaster() {
  const { theme } = useTheme()
  return <Toaster theme={theme} position="top-right" richColors closeButton />
}

/** Runs before first paint so there is no flash of the wrong theme. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}')||'dark';document.documentElement.classList.toggle('dark',t==='dark')}catch(e){document.documentElement.classList.add('dark')}})()`
