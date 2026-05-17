// components/MatchTimeline.tsx
import type { Match } from '@/types'

interface Props {
  matches: Match[]
}

function ScoreDisplay({ scores }: { scores: Match['scores'] }) {
  return (
    <div className="flex gap-2 text-xs">
      {scores.map((s) => (
        <span
          key={s.game}
          className={`font-mono ${
            s.us > s.them ? 'text-green-600 font-semibold' : 'text-red-500'
          }`}
        >
          {s.us}-{s.them}
        </span>
      ))}
    </div>
  )
}

export default function MatchTimeline({ matches }: Props) {
  if (matches.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-400">
        아직 등록된 경기 기록이 없어요
      </p>
    )
  }

  return (
    <div className="relative flex flex-col gap-4">
      {/* vertical line */}
      <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200" aria-hidden="true" />

      {matches.map((match) => (
        <div key={match.id} className="relative flex gap-4 pl-10">
          <div
            className={`absolute left-1.5 top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ${
              match.result === 'win' ? 'bg-green-500' : 'bg-red-400'
            }`}
            aria-label={match.result === 'win' ? '승' : '패'}
          >
            {match.result === 'win' ? '승' : '패'}
          </div>
          <div className="flex-1 rounded-xl bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">{match.round}</span>
              {match.opponent && (
                <span className="text-xs text-gray-400">vs {match.opponent}</span>
              )}
            </div>
            <div className="mt-1">
              <ScoreDisplay scores={match.scores} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
