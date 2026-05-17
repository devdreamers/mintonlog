// components/AddMatchForm.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ScoreGame } from '@/types'

interface Props {
  tournamentId: string
  onAdded: () => void
}

export default function AddMatchForm({ tournamentId, onAdded }: Props) {
  const [round, setRound] = useState('')
  const [opponent, setOpponent] = useState('')
  const [result, setResult] = useState<'win' | 'loss'>('win')
  const [games, setGames] = useState<ScoreGame[]>([{ game: 1, us: 0, them: 0 }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addGame() {
    if (games.length >= 5) return
    setGames((prev) => [...prev, { game: prev.length + 1, us: 0, them: 0 }])
  }

  function updateGame(idx: number, field: 'us' | 'them', value: number) {
    const clamped = Math.max(0, Math.min(30, Number.isNaN(value) ? 0 : value))
    setGames((prev) =>
      prev.map((g, i) => (i === idx ? { ...g, [field]: clamped } : g))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!round.trim()) return
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: insertError } = await supabase.from('matches').insert({
      tournament_id: tournamentId,
      round: round.trim(),
      opponent: opponent.trim() || null,
      result,
      scores: games,
    })

    if (insertError) {
      setError('저장에 실패했어요. 다시 시도해주세요.')
      setSaving(false)
      return
    }

    setRound('')
    setOpponent('')
    setResult('win')
    setGames([{ game: 1, us: 0, them: 0 }])
    setSaving(false)
    onAdded()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-violet-200 bg-violet-50 p-4">
      <p className="mb-3 text-sm font-semibold text-violet-700">경기 추가</p>
      {error && (
        <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <input
          id="match-round"
          value={round}
          onChange={(e) => setRound(e.target.value)}
          placeholder="라운드 (예: 8강)"
          required
          className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          aria-label="라운드"
        />
        <input
          id="match-opponent"
          value={opponent}
          onChange={(e) => setOpponent(e.target.value)}
          placeholder="상대 이름 (선택)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          aria-label="상대 이름"
        />
        <select
          id="match-result"
          value={result}
          onChange={(e) => setResult(e.target.value as 'win' | 'loss')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          aria-label="경기 결과"
        >
          <option value="win">승</option>
          <option value="loss">패</option>
        </select>
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {games.map((g, i) => (
          <div key={g.game} className="flex items-center gap-2 text-sm">
            <span className="w-12 text-xs text-gray-500">게임 {g.game}</span>
            <input
              type="number"
              min={0}
              max={30}
              value={g.us}
              onChange={(e) => updateGame(i, 'us', Number(e.target.value))}
              className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm"
              aria-label={`게임 ${g.game} 내 점수`}
            />
            <span className="text-gray-400" aria-hidden="true">:</span>
            <input
              type="number"
              min={0}
              max={30}
              value={g.them}
              onChange={(e) => updateGame(i, 'them', Number(e.target.value))}
              className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm"
              aria-label={`게임 ${g.game} 상대 점수`}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addGame}
          disabled={games.length >= 5}
          className="mt-1 text-left text-xs text-violet-600 underline disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + 게임 추가
        </button>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="mt-3 w-full rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
      >
        {saving ? '저장 중...' : '저장'}
      </button>
    </form>
  )
}
