'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MedalBadge from '@/components/MedalBadge'
import type { Tournament } from '@/types'

interface EditState {
  name: string
  date: string
  event: string
  category: string
  placement: string
  venue: string
  partner: string
}

const EVENTS = ['남복', '여복', '혼복', '남단', '여단']

interface Props {
  tournament: Tournament
  isLoggedIn: boolean
}

function toEditState(t: Tournament): EditState {
  return {
    name: t.name,
    date: t.date,
    event: t.event,
    category: t.category,
    placement: t.placement,
    venue: t.venue ?? '',
    partner: t.partner ?? '',
  }
}

export default function TournamentSection({ tournament, isLoggedIn }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [edit, setEdit] = useState<EditState>(toEditState(tournament))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('matches').delete().eq('tournament_id', tournament.id)
    const { error: err } = await supabase.from('tournaments').delete().eq('id', tournament.id)
    if (err) {
      setError('삭제에 실패했어요. 다시 시도해주세요.')
      setDeleting(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  const meta = [tournament.event, tournament.category, tournament.venue]
    .filter(Boolean)
    .join(' · ')

  async function handleSave() {
    if (!edit.name.trim() || !edit.date || !edit.event || !edit.placement.trim()) {
      setError('필수 항목을 모두 입력해주세요.')
      return
    }
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase
      .from('tournaments')
      .update({
        name: edit.name.trim(),
        date: edit.date,
        event: edit.event,
        category: edit.category.trim(),
        placement: edit.placement.trim(),
        venue: edit.venue.trim() || null,
        partner: edit.partner.trim() || null,
      })
      .eq('id', tournament.id)

    if (err) {
      setError('저장에 실패했어요. 다시 시도해주세요.')
      setSaving(false)
      return
    }

    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  function handleCancel() {
    setEdit(toEditState(tournament))
    setEditing(false)
    setError('')
  }

  return (
    <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
      {editing ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-violet-700">대회 정보 수정</p>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          {/* 대회명 */}
          <input
            value={edit.name}
            onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            placeholder="대회명"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
          />

          {/* 날짜 + 종목 */}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={edit.date}
              onChange={(e) => setEdit({ ...edit, date: e.target.value })}
              required
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
            />
            <select
              value={edit.event}
              onChange={(e) => setEdit({ ...edit, event: e.target.value })}
              required
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
            >
              <option value="">종목 선택</option>
              {EVENTS.map((ev) => (
                <option key={ev} value={ev}>{ev}</option>
              ))}
            </select>
          </div>

          {/* 나이대/급수 + 순위 */}
          <div className="grid grid-cols-2 gap-2">
            <input
              value={edit.category}
              onChange={(e) => setEdit({ ...edit, category: e.target.value })}
              placeholder="나이대/급수 (예: 30D)"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
            />
            <input
              value={edit.placement}
              onChange={(e) => setEdit({ ...edit, placement: e.target.value })}
              placeholder="순위 (예: 1위)"
              required
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
            />
          </div>

          {/* 체육관 */}
          <input
            value={edit.venue}
            onChange={(e) => setEdit({ ...edit, venue: e.target.value })}
            placeholder="체육관 (선택)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
          />

          {/* 파트너 */}
          <input
            value={edit.partner}
            onChange={(e) => setEdit({ ...edit, partner: e.target.value })}
            placeholder="파트너 이름 (선택)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
          />

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-start gap-4">
            <MedalBadge placement={tournament.placement} />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 break-words">{tournament.name}</h1>
              <time dateTime={tournament.date} className="mt-0.5 text-sm text-gray-500">
                {new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(
                  new Date(tournament.date + 'T00:00:00')
                )}
              </time>
              {meta && <p className="mt-0.5 text-xs text-gray-400">{meta}</p>}
              {tournament.partner && (
                <p className="mt-0.5 text-xs text-violet-500">파트너 {tournament.partner}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="text-lg font-bold text-violet-600">{tournament.placement}</span>
              {isLoggedIn && (
                confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">삭제할까요?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="rounded-lg bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-400 disabled:opacity-50 transition-colors"
                    >
                      {deleting ? '…' : '확인'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
