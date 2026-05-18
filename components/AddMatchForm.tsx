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
  const [opponent, setOpponent] = useState('')
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
      opponent: opponent.trim() || null,
      result,
      scores: [{ game: 1, us: Number(us) || 0, them: Number(them) || 0 }],
    })

    if (insertError) {
      setError('저장에 실패했어요. 다시 시도해주세요.')
      setSaving(false)
      return
    }

    setRound('')
    setOpponent('')
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
      <div className="grid grid-cols-2 gap-2">
        <input
          value={round}
          onChange={(e) => setRound(e.target.value)}
          placeholder="라운드 (예: 8강)"
          required
          className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          aria-label="라운드"
        />
        <input
          value={opponent}
          onChange={(e) => setOpponent(e.target.value)}
          placeholder="상대 이름 (선택)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          aria-label="상대 이름"
        />
        <select
          value={result}
          onChange={(e) => setResult(e.target.value as 'win' | 'loss')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          aria-label="경기 결과"
        >
          <option value="win">승</option>
          <option value="loss">패</option>
        </select>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-gray-500 w-8">점수</span>
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
            const n = Math.max(0, Math.min(30, Number(v)))
            setUs(String(n))
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
            const n = Math.max(0, Math.min(30, Number(v)))
            setThem(String(n))
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
