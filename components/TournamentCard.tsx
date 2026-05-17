// components/TournamentCard.tsx
import Link from 'next/link'
import MedalBadge from './MedalBadge'
import type { Tournament } from '@/types'

interface Props {
  tournament: Tournament
}

function placementColor(placement: string): string {
  if (placement === '1위' || placement === '우승') return 'text-amber-500 font-bold'
  if (placement === '2위' || placement === '준우승') return 'text-gray-500 font-bold'
  if (placement === '3위' || placement === '공동3위') return 'text-orange-500 font-bold'
  return 'text-violet-600 font-bold'
}

export default function TournamentCard({ tournament }: Props) {
  const meta = [tournament.date, tournament.event, tournament.category, tournament.venue]
    .filter(Boolean)
    .join(' · ')

  return (
    <Link href={`/${tournament.id}`}>
      <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
        <MedalBadge placement={tournament.placement} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">{tournament.name}</p>
          <p className="truncate text-xs text-gray-500">{meta}</p>
        </div>
        <span className={`shrink-0 text-sm ${placementColor(tournament.placement)}`}>
          {tournament.placement}
        </span>
      </div>
    </Link>
  )
}
