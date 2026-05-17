import type { Stats } from '@/types'

export function computeStats(placements: string[]): Stats {
  return {
    gold: placements.filter(
      (p) => p === '1위' || p === '우승'
    ).length,
    silver: placements.filter(
      (p) => p === '2위' || p === '준우승'
    ).length,
    bronze: placements.filter(
      (p) => p === '3위' || p === '공동3위'
    ).length,
    total: placements.length,
  }
}
