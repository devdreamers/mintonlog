'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ImportPayload } from '@/lib/import'

interface Props {
  payload: ImportPayload
  encodedData: string
}

export default function ImportForm({ payload }: Props) {
  const router = useRouter()
  const [partner, setPartner] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const meta = [payload.e, payload.c, payload.v].filter(Boolean).join(' · ')

  async function handleSave() {
    setSaving(true)
    setError('')
    const supabase = createClient()

    // Insert tournament
    const { data: t, error: tErr } = await supabase
      .from('tournaments')
      .insert({
        name: payload.n,
        date: payload.d,
        event: payload.e,
        category: payload.c || null,
        placement: payload.p,
        venue: payload.v || null,
        partner: partner.trim() || null,
        screenshot_url: '',
      })
      .select('id')
      .single()

    if (tErr || !t) {
      setError('저장에 실패했어요. 다시 시도해주세요.')
      setSaving(false)
      return
    }

    // Insert matches
    if (payload.m.length > 0) {
      const { error: mErr } = await supabase.from('matches').insert(
        payload.m.map((m) => ({
          tournament_id: t.id,
          round: m.r,
          result: m.re,
          scores: m.s,
          opponent_team: m.ot ?? null,
          opponent1: m.o1 ?? null,
          opponent2: m.o2 ?? null,
        }))
      )
      if (mErr) {
        setError('경기 기록 저장에 실패했어요.')
        setSaving(false)
        return
      }
    }

    router.push(`/${t.id}`)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Preview card */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-gray-900">{payload.n}</p>
        <p className="mt-0.5 text-xs text-gray-500">{payload.d}{meta ? ` · ${meta}` : ''}</p>
        <p className="mt-1 text-sm font-semibold text-violet-600">{payload.p}</p>

        {payload.m.length > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-3 space-y-1.5">
            {payload.m.map((m, i) => {
              const score = m.s?.[0]
              const opp = [m.ot, m.o1, m.o2].filter(Boolean).join(' · ')
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                    m.re === 'win' ? 'bg-green-500' : 'bg-red-400'
                  }`}>
                    {m.re === 'win' ? '승' : '패'}
                  </span>
                  <span className="text-gray-700">{m.r}</span>
                  {opp && <span className="text-gray-400">vs {opp}</span>}
                  {score && (
                    <span className={`ml-auto font-mono font-semibold ${score.us > score.them ? 'text-green-600' : 'text-red-500'}`}>
                      {score.us}-{score.them}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 파트너 이름 입력 */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">
          파트너 이름 <span className="text-gray-400 font-normal">(선택)</span>
        </label>
        <input
          value={partner}
          onChange={(e) => setPartner(e.target.value)}
          placeholder="함께 출전한 파트너 이름"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-violet-400 focus:outline-none"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
      >
        {saving ? '저장 중...' : '내 계정에 저장'}
      </button>
    </div>
  )
}
