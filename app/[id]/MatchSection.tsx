'use client'

import { useState } from 'react'
import MatchTimeline from '@/components/MatchTimeline'
import AddMatchForm from '@/components/AddMatchForm'
import type { Match } from '@/types'

interface Props {
  initialMatches: Match[]
  tournamentId: string
  isLoggedIn: boolean
}

export default function MatchSection({
  initialMatches,
  tournamentId,
  isLoggedIn,
}: Props) {
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const [showForm, setShowForm] = useState(false)

  async function refreshMatches() {
    try {
      const res = await fetch(`/api/matches?tournament_id=${tournamentId}`)
      if (res.ok) {
        const data = await res.json()
        setMatches(data as Match[])
      } else {
        console.error('Failed to refresh matches', res.status)
      }
    } catch (err) {
      console.error('Network error refreshing matches', err)
    } finally {
      setShowForm(false)
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          경기 기록
        </h2>
        {isLoggedIn && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-200 transition-colors"
          >
            + 경기 추가
          </button>
        )}
      </div>
      {showForm && (
        <div className="mb-4">
          <AddMatchForm
            tournamentId={tournamentId}
            onAdded={refreshMatches}
          />
        </div>
      )}
      <MatchTimeline matches={matches} />
    </div>
  )
}
