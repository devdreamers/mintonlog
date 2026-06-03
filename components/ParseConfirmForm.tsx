// components/ParseConfirmForm.tsx
'use client'

import type { ParseResult, ParsedMatch } from '@/types'
import type { ReactNode } from 'react'
import { useTransition, useState } from 'react'

const CONFIDENCE_THRESHOLD = 0.7

interface Props {
  parsed: ParseResult
  screenshotPreviewUrl: string | null
  action: (formData: FormData) => Promise<void>
  file: File | null
  isManual?: boolean
}

function fieldClass(confidence: number): string {
  return confidence < CONFIDENCE_THRESHOLD
    ? 'border-amber-400 bg-amber-50 focus:border-amber-500'
    : 'border-violet-400 bg-violet-50 focus:border-violet-500'
}

function fieldHint(confidence: number): ReactNode {
  return confidence < CONFIDENCE_THRESHOLD ? (
    <p className="mt-1 text-xs text-amber-600">⚠ 불확실 — 확인해주세요</p>
  ) : (
    <p className="mt-1 text-xs text-green-600">✓ AI가 읽어옴</p>
  )
}

function emptyMatch(): ParsedMatch {
  return { round: '', result: 'win', opponent1: '', opponent2: '', score_us: null, score_them: null }
}

export default function ParseConfirmForm({
  parsed,
  screenshotPreviewUrl,
  action,
  file,
  isManual = false,
}: Props) {
  const { confidence } = parsed
  const [isPending, startTransition] = useTransition()
  const [submitError, setSubmitError] = useState('')
  const [matches, setMatches] = useState<ParsedMatch[]>(parsed.matches ?? [])

  const cls = (c: number) =>
    isManual ? 'border-gray-300 focus:border-violet-400' : fieldClass(c)
  const hint = (c: number) => (isManual ? null : fieldHint(c))

  function updateMatch(i: number, patch: Partial<ParsedMatch>) {
    setMatches((prev) => prev.map((m, idx) => idx === i ? { ...m, ...patch } : m))
  }

  function removeMatch(i: number) {
    setMatches((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitError('')
    const fd = new FormData(e.currentTarget)
    if (file) fd.append('file', file)
    fd.set('matches_json', JSON.stringify(matches))
    startTransition(async () => {
      try {
        await action(fd)
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : '저장에 실패했어요. 다시 시도해주세요.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* 스크린샷 미리보기 */}
      {screenshotPreviewUrl && (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screenshotPreviewUrl}
            alt="업로드한 스크린샷"
            className="max-h-48 w-full object-contain bg-gray-100"
          />
          <p className="bg-white px-3 py-2 text-xs text-green-600">
            ● AI가 아래 정보를 읽어왔어요. 틀린 부분은 수정해주세요.
          </p>
        </div>
      )}

      {/* 대회명 */}
      <div>
        <label htmlFor="field-name" className="mb-1 block text-sm font-medium text-gray-700">대회명</label>
        <input
          id="field-name"
          name="name"
          defaultValue={parsed.name ?? ''}
          required
          className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${cls(confidence.name)}`}
          placeholder="경기도 배드민턴 동호인 대회"
        />
        {hint(confidence.name)}
      </div>

      {/* 날짜 */}
      <div>
        <label htmlFor="field-date" className="mb-1 block text-sm font-medium text-gray-700">날짜</label>
        <input
          id="field-date"
          name="date"
          type="date"
          defaultValue={parsed.date ?? ''}
          required
          className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${cls(confidence.date)}`}
          style={{ WebkitAppearance: 'none', width: '100%', boxSizing: 'border-box' }}
        />
        {hint(confidence.date)}
      </div>

      {/* 종목 */}
      <div>
        <label htmlFor="field-event" className="mb-1 block text-sm font-medium text-gray-700">종목</label>
        <select
          id="field-event"
          name="event"
          defaultValue={parsed.event ?? ''}
          required
          className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${cls(confidence.event)}`}
        >
          <option value="">선택</option>
          {['남복', '여복', '혼복', '남단', '여단'].map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        {hint(confidence.event)}
      </div>

      {/* 나이대/급수 + 순위 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="field-category" className="mb-1 block text-sm font-medium text-gray-700">나이대/급수</label>
          <input
            id="field-category"
            name="category"
            defaultValue={parsed.category ?? ''}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${cls(confidence.category)}`}
            placeholder="예: 30D, 2030BC"
          />
          {hint(confidence.category)}
        </div>
        <div>
          <label htmlFor="field-placement" className="mb-1 block text-sm font-medium text-gray-700">순위/결과</label>
          <input
            id="field-placement"
            name="placement"
            defaultValue={parsed.placement ?? ''}
            required
            className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${cls(confidence.placement)}`}
            placeholder="1위"
          />
          {hint(confidence.placement)}
        </div>
      </div>

      {/* 체육관 */}
      <div>
        <label htmlFor="field-venue" className="mb-1 block text-sm font-medium text-gray-700">체육관 (선택)</label>
        <input
          id="field-venue"
          name="venue"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
          placeholder="은평다목적체육관"
        />
      </div>

      {/* 파트너 */}
      <div>
        <label htmlFor="field-partner" className="mb-1 block text-sm font-medium text-gray-700">파트너 (선택)</label>
        <input
          id="field-partner"
          name="partner"
          defaultValue={parsed.partner ?? ''}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${cls(confidence.partner)}`}
          placeholder="파트너 이름"
        />
        {hint(confidence.partner)}
      </div>

      {/* 경기 기록 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            경기 기록
            {matches.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-gray-400">{matches.length}경기</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setMatches((prev) => [...prev, emptyMatch()])}
            className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            + 추가
          </button>
        </div>

        {matches.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 py-4 text-center text-xs text-gray-400">
            파싱된 경기 기록이 없어요. 직접 추가할 수 있어요.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {matches.map((m, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                {/* 승/패 + 라운드 */}
                <div className="mb-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateMatch(i, { result: m.result === 'win' ? 'loss' : 'win' })}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-colors ${
                      m.result === 'win' ? 'bg-green-500 hover:bg-green-400' : 'bg-red-400 hover:bg-red-300'
                    }`}
                  >
                    {m.result === 'win' ? '승' : '패'}
                  </button>
                  <input
                    value={m.round}
                    onChange={(e) => updateMatch(i, { round: e.target.value })}
                    placeholder="라운드 (예: 8강, 결승)"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeMatch(i)}
                    className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    aria-label="경기 삭제"
                  >
                    ✕
                  </button>
                </div>

                {/* 상대 선수 */}
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <input
                    value={m.opponent1}
                    onChange={(e) => updateMatch(i, { opponent1: e.target.value })}
                    placeholder="상대 선수 1"
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
                  />
                  <input
                    value={m.opponent2}
                    onChange={(e) => updateMatch(i, { opponent2: e.target.value })}
                    placeholder="상대 선수 2 (복식)"
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
                  />
                </div>

                {/* 점수 */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">점수</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={30}
                    value={m.score_us ?? ''}
                    onChange={(e) => updateMatch(i, { score_us: e.target.value === '' ? null : Number(e.target.value) })}
                    placeholder="내"
                    className="w-14 rounded-lg border border-gray-300 px-2 py-1.5 text-center text-sm focus:border-violet-400 focus:outline-none"
                  />
                  <span className="text-gray-300">:</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={30}
                    value={m.score_them ?? ''}
                    onChange={(e) => updateMatch(i, { score_them: e.target.value === '' ? null : Number(e.target.value) })}
                    placeholder="상대"
                    className="w-14 rounded-lg border border-gray-300 px-2 py-1.5 text-center text-sm focus:border-violet-400 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {submitError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-violet-600 py-3.5 text-base font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? '저장 중...' : '저장하기 →'}
      </button>
    </form>
  )
}
