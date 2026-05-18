// components/MatchTimeline.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Match } from '@/types'

interface Props {
  matches: Match[]
  isLoggedIn: boolean
  onMatchUpdated: () => void
}

interface EditState {
  round: string
  opponent_team: string
  opponent1: string
  opponent2: string
  result: 'win' | 'loss'
  us: string
  them: string
}

function toEditState(match: Match): EditState {
  const score = match.scores[0] ?? { us: 0, them: 0 }
  return {
    round: match.round,
    opponent_team: match.opponent_team ?? '',
    opponent1: match.opponent1 ?? '',
    opponent2: match.opponent2 ?? '',
    result: match.result,
    us: String(score.us),
    them: String(score.them),
  }
}

function handleScoreChange(value: string, setter: (v: string) => void) {
  if (value === '') { setter(''); return }
  const n = Math.max(0, Math.min(30, Number(value)))
  setter(String(n))
}

function opponentLabel(match: Match): string | null {
  const parts = [match.opponent_team, match.opponent1, match.opponent2].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

export default function MatchTimeline({ matches, isLoggedIn, onMatchUpdated }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  function startEdit(match: Match) {
    setEditingId(match.id)
    setEdit(toEditState(match))
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEdit(null)
    setError('')
  }

  async function deleteMatch(matchId: string) {
    setDeleting(true)
    const supabase = createClient()
    const { error: err } = await supabase.from('matches').delete().eq('id', matchId)
    if (err) {
      setError('삭제에 실패했어요. 다시 시도해주세요.')
      setDeleting(false)
      return
    }
    setDeletingId(null)
    setDeleting(false)
    onMatchUpdated()
  }

  async function saveEdit(matchId: string) {
    if (!edit) return
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase
      .from('matches')
      .update({
        round: edit.round.trim(),
        opponent_team: edit.opponent_team.trim() || null,
        opponent1: edit.opponent1.trim() || null,
        opponent2: edit.opponent2.trim() || null,
        result: edit.result,
        scores: [{ game: 1, us: Number(edit.us) || 0, them: Number(edit.them) || 0 }],
      })
      .eq('id', matchId)

    if (err) {
      setError('저장에 실패했어요. 다시 시도해주세요.')
      setSaving(false)
      return
    }

    setSaving(false)
    setEditingId(null)
    setEdit(null)
    onMatchUpdated()
  }

  if (matches.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-400">
        아직 등록된 경기 기록이 없어요
      </p>
    )
  }

  return (
    <div className="relative flex flex-col gap-4">
      <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200" aria-hidden="true" />

      {matches.map((match) => {
        const isEditing = editingId === match.id
        const displayResult = isEditing && edit ? edit.result : match.result

        return (
          <div key={match.id} className="relative flex gap-4 pl-10">
            <div
              className={`absolute left-1.5 top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ${
                displayResult === 'win' ? 'bg-green-500' : 'bg-red-400'
              }`}
              aria-label={displayResult === 'win' ? '승' : '패'}
            >
              {displayResult === 'win' ? '승' : '패'}
            </div>

            <div className="flex-1 rounded-xl bg-white p-3 shadow-sm">
              {isEditing && edit ? (
                <div className="flex flex-col gap-2">
                  {error && <p className="text-xs text-red-500">{error}</p>}

                  {/* 라운드 + 결과 */}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={edit.round}
                      onChange={(e) => setEdit({ ...edit, round: e.target.value })}
                      placeholder="라운드"
                      className="col-span-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                      aria-label="라운드"
                    />
                    <select
                      value={edit.result}
                      onChange={(e) => setEdit({ ...edit, result: e.target.value as 'win' | 'loss' })}
                      className="col-span-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                      aria-label="경기 결과"
                    >
                      <option value="win">승</option>
                      <option value="loss">패</option>
                    </select>
                  </div>

                  {/* 상대팀 + 선수 2명 */}
                  <input
                    value={edit.opponent_team}
                    onChange={(e) => setEdit({ ...edit, opponent_team: e.target.value })}
                    placeholder="상대팀 이름 (선택)"
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    aria-label="상대팀 이름"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={edit.opponent1}
                      onChange={(e) => setEdit({ ...edit, opponent1: e.target.value })}
                      placeholder="상대 1 (선택)"
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                      aria-label="상대 선수 1"
                    />
                    <input
                      value={edit.opponent2}
                      onChange={(e) => setEdit({ ...edit, opponent2: e.target.value })}
                      placeholder="상대 2 (선택)"
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                      aria-label="상대 선수 2"
                    />
                  </div>

                  {/* 점수 */}
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-xs text-gray-500">점수</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={30}
                      value={edit.us}
                      placeholder="0"
                      onChange={(e) => handleScoreChange(e.target.value, (v) => setEdit({ ...edit, us: v }))}
                      className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm"
                      aria-label="내 점수"
                    />
                    <span className="text-gray-400" aria-hidden="true">:</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={30}
                      value={edit.them}
                      placeholder="0"
                      onChange={(e) => handleScoreChange(e.target.value, (v) => setEdit({ ...edit, them: v }))}
                      className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm"
                      aria-label="상대 점수"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(match.id)}
                      disabled={saving || !edit.round.trim()}
                      className="flex-1 rounded-lg bg-violet-600 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
                    >
                      {saving ? '저장 중...' : '저장'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="flex-1 rounded-lg border border-gray-300 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">{match.round}</span>
                      {opponentLabel(match) && (
                        <span className="text-xs text-gray-400">vs {opponentLabel(match)}</span>
                      )}
                    </div>
                    {match.scores[0] && (
                      <p
                        className={`mt-0.5 font-mono text-xs ${
                          match.scores[0].us > match.scores[0].them
                            ? 'text-green-600 font-semibold'
                            : 'text-red-500'
                        }`}
                      >
                        {match.scores[0].us}-{match.scores[0].them}
                      </p>
                    )}
                  </div>
                  {isLoggedIn && (
                    <div className="ml-2 flex gap-1">
                      {deletingId === match.id ? (
                        <>
                          <span className="self-center text-xs text-gray-500">삭제할까요?</span>
                          <button
                            type="button"
                            onClick={() => deleteMatch(match.id)}
                            disabled={deleting}
                            className="rounded-lg bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-400 disabled:opacity-50 transition-colors"
                          >
                            {deleting ? '…' : '확인'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            disabled={deleting}
                            className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(match)}
                            className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            aria-label="경기 수정"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(match.id)}
                            className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            aria-label="경기 삭제"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
