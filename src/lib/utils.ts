import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`
  return `₹${amount.toFixed(0)}`
}

export function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(date)
}

export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

export function getStageStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'text-green-600 bg-green-50 border-green-200'
    case 'COMPLETED_WITH_WARNINGS': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'NOT_STARTED': return 'text-zinc-500 bg-zinc-50 border-zinc-200'
    default: return 'text-zinc-500 bg-zinc-50 border-zinc-200'
  }
}

export function getAlertSeverityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return 'text-red-700 bg-red-50 border-red-200'
    case 'HIGH': return 'text-orange-700 bg-orange-50 border-orange-200'
    case 'MEDIUM': return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    case 'LOW': return 'text-blue-700 bg-blue-50 border-blue-200'
    default: return 'text-zinc-700 bg-zinc-50 border-zinc-200'
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - 3) + '...'
}
