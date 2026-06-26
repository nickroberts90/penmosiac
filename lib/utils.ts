import { clsx, type ClassValue } from 'clsx'
import { formatDistanceToNow, differenceInSeconds } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function timeUntil(dateStr: string): string {
  const date = new Date(dateStr)
  const diff = differenceInSeconds(date, new Date())
  if (diff <= 0) return 'Expired'
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  if (h > 48) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function isUrgent(dateStr: string): boolean {
  const diff = new Date(dateStr).getTime() - Date.now()
  return diff > 0 && diff < 6 * 3600 * 1000
}

export function timeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '…' : str
}

// Flat 1 point per like for every author, regardless of rank or lifetime
// like count. Bid caps per story tier are the real defense against
// runaway point accumulation — this stays simple and rewards quality
// writing equally at every level.
export function pointsForLike(currentLikes: number): number {
  return 1
}

export function formatPoints(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export const TIER_COLORS: Record<string, string> = {
  Open: 'bg-green-50 text-green-800 border-green-200',
  Established: 'bg-blue-50 text-blue-800 border-blue-200',
  Advanced: 'bg-amber-50 text-amber-800 border-amber-200',
  Elite: 'bg-red-50 text-red-800 border-red-200',
}

export const RANK_COLORS: Record<string, string> = {
  Apprentice: 'bg-gray-100 text-gray-700',
  Journeyman: 'bg-blue-100 text-blue-800',
  Novelist: 'bg-green-100 text-green-800',
  Wordsmith: 'bg-purple-100 text-purple-800',
  Luminary: 'bg-orange-100 text-orange-800',
}
