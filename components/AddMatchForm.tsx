// components/AddMatchForm.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  tournamentId: string
  onAdded: () => void
}

function clamp(v: number) {
  return Math.max(0, Math.min(30, Number.isNaN(v) ? 0 : v))
}

export default function AddMatchForm({ tournamentId, onAdded }: Props) {
  const [round, setRound] = useState('')
  const [opponentTeam, setOpponentTeam] = useState('')
  const [opponent1, setOpponent1] = useState('')
  const [opponent2, setOpponent2] = useState('')
  const [result, setResult] = useState<'win' | 'loss'>('win')
  const [us, setUs] = useState('')
  const [them, setThem] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!round.trim()) return
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: insertError } = await supabase.from('matches').insert({
      tournament_id: tournamentId,
      round: round.trim(),
      opponent_team: opponentTeam.trim() || null,
      opponent1: opponent1.trim() || null,
      opponent2: opponent2.trim() || null,
      result,
      scores: [{ game: 1, us: Number(us) || 0, them: Number(them) || 0 }],
    })

    if (insertError) {
      setError('저장에 실패했어요. 다시 시도해주세요.')
      setSaving(false)
      return
    }

    setRound('')
    setOpponentTeam('')
    setOpponent1('')
    setOpponent2('')
    setResult('win')
    setUs('')
    setThem('')
    setSaving(false)
    onAdded()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-violet-200 bg-violet-50 p-4">
      <p className="mb-3 text-sm font-semibold text-violet-700">경기 추가</p>
      {error && (
        <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      {/* 라운드 + 결과 */}
      <div className="grid grid-cols-2 gap-2">
        <input
          value={round}
          onChange={(e) => setRound(e.target.value)}
          placeholder="라운드 (예: 8강)"
          required
          className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          aria-label="라운드"
        />
        <select
          value={result}
          onChange={(e) => setResult(e.target.value as 'win' | 'loss')}
          className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          aria-label="경기 결과"
        >
          <option value="win">승</option>
          <option value="loss">패</option>
        </select>
      </div>

      {/* 상대팀 + 상대 선수 2명 */}
      <div className="mt-2 flex flex-col gap-2">
        <input
          value={opponentTeam}
          onChange={(e) => setOpponentTeam(e.target.value)}
          placeholder="상대팀 이름 (선택)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          aria-label="상대팀 이름"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={opponent1}
            onChange={(e) => setOpponent1(e.target.value)}
            placeholder="상대 1 이름 (선택)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            aria-label="상대 선수 1"
          />
          <input
            value={opponent2}
            onChange={(e) => setOpponent2(e.target.value)}
            placeholder="상대 2 이름 (선택)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            aria-label="상대 선수 2"
          />
        </div>
      </div>

      {/* 점수 */}
      <div className="mt-2 flex items-center gap-2">
        <span className="w-8 text-xs text-gray-500">점수</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={30}
          value={us}
          placeholder="0"
          onChange={(e) => {
            const v = e.target.value
            if (v === '') { setUs(''); return }
            setUs(String(clamp(Number(v))))
          }}
          className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm"
          aria-label="내 점수"
        />
        <span className="text-gray-400" aria-hidden="true">:</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={30}
          value={them}
          placeholder="0"
          onChange={(e) => {
            const v = e.target.value
            if (v === '') { setThem(''); return }
            setThem(String(clamp(Number(v))))
          }}
          className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm"
          aria-label="상대 점수"
        />
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
