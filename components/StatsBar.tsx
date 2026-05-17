// components/StatsBar.tsx
import type { Stats } from '@/types'

interface Props {
  stats: Stats
}

const CARDS = [
  { key: 'gold' as const, label: '금', icon: '🥇', color: 'text-amber-400' },
  { key: 'silver' as const, label: '은', icon: '🥈', color: 'text-gray-300' },
  { key: 'bronze' as const, label: '동', icon: '🥉', color: 'text-orange-400' },
  { key: 'total' as const, label: '출전', icon: '🏸', color: 'text-violet-400' },
]

export default function StatsBar({ stats }: Props) {
  return (
    <div className="bg-[#1a1a2e] px-5 pb-8 pt-6">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
        전체 수상 실적
      </p>
      <div className="grid grid-cols-4 gap-3">
        {CARDS.map(({ key, label, icon, color }) => (
          <div
            key={key}
            className="flex flex-col items-center rounded-xl bg-white/10 py-3"
          >
            <span className="text-xl">{icon}</span>
            <span className={`text-2xl font-bold ${color}`}>{stats[key]}</span>
            <span className="text-xs text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
