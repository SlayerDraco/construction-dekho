import { cn } from '@/lib/utils'

interface CardProps {
  className?: string
  children: React.ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

export function Card({ className, children, padding = 'md', hover = false }: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-zinc-900/80 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm shadow-zinc-900/5 dark:shadow-black/30',
        paddingClasses[padding],
        hover && 'transition-all duration-200 hover:border-brand-500/60 hover:shadow-lg hover:shadow-brand-600/10 hover:-translate-y-0.5 cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-sm font-semibold text-zinc-900 dark:text-zinc-100', className)}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-xs text-zinc-500 dark:text-zinc-400 mt-0.5', className)}>
      {children}
    </p>
  )
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
}: {
  label: string
  value: string | number
  sub?: string
  icon?: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</p>
        {Icon && <span className="h-8 w-8 rounded-lg bg-brand-600/10 dark:bg-brand-600/20 flex items-center justify-center"><Icon className="h-4 w-4 text-brand-600 dark:text-accent" /></span>}
      </div>
      <p className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>}
    </Card>
  )
}
