'use client'

import { useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────
interface Summary {
  total: number
  totalMatches: number
  totalWins: number
  totalLosses: number
  winRate: number
  best: string | null
}

interface Props {
  summary: Summary
  chartData: { label: string; value: number }[]
  avgScoreDiff: number | null
  eventBreakdown: { event: string; count: number }[]
  venueStats: { venue: string; wins: number; losses: number; total: number; winRate: number }[]
  partnerStats: { partner: string; tournaments: number; wins: number; losses: number; winRate: number | null }[]
  opponentStats: { name: string; wins: number; losses: number; total: number; winRate: number }[]
  seasonStats: { season: string; count: number; wins: number; losses: number; winRate: number | null }[]
}

// ── Event colors ───────────────────────────────────────────────────────────
const EVENT_COLORS: Record<string, string> = {
  여복: '#7c3aed', 혼복: '#10b981', 남복: '#3b82f6', 남단: '#f59e0b', 여단: '#ec4899',
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────
function LineChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return <p className="py-6 text-center text-sm text-gray-400">데이터가 없어요</p>

  const W = 320, H = 120
  const pad = { top: 20, right: 16, bottom: 28, left: 32 }
  const iW = W - pad.left - pad.right
  const iH = H - pad.top - pad.bottom
  const n = data.length

  const pts = data.map((d, i) => ({
    x: pad.left + (n === 1 ? iW / 2 : (i / (n - 1)) * iW),
    y: pad.top + (1 - d.value / 100) * iH,
    ...d,
  }))
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 50, 100].map((v) => {
        const y = pad.top + (1 - v / 100) * iH
        return (
          <g key={v}>
            <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={pad.left - 4} y={y + 3.5} textAnchor="end" fill="#9ca3af" fontSize="8">
              {v}%
            </text>
          </g>
        )
      })}
      {n > 1 && (
        <polyline points={polyline} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round" />
      )}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#7c3aed" stroke="white" strokeWidth="1.5" />
          <text x={p.x} y={p.y - 7} textAnchor="middle" fill="#374151" fontSize="8" fontWeight="600">
            {p.value}%
          </text>
          <text x={p.x} y={H - 4} textAnchor="middle" fill="#9ca3af" fontSize="7.5">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ── SVG Donut Chart ────────────────────────────────────────────────────────
function DonutChart({ data }: { data: { label: string; count: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return null
  const R = 36, CX = 48, CY = 48, C = 2 * Math.PI * R

  let offset = 0
  const segs = data.map((d) => {
    const dash = (d.count / total) * C
    const s = { ...d, dash, offset }
    offset += dash
    return s
  })

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 96 96" className="h-20 w-20 -rotate-90 shrink-0">
        {segs.map((s, i) => (
          <circle
            key={i}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="18"
            strokeDasharray={`${s.dash} ${C - s.dash}`}
            strokeDashoffset={-s.offset}
          />
        ))}
      </svg>
      <div className="flex flex-col gap-1.5">
        {segs.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-gray-600">{s.label}</span>
            <span className="text-xs text-gray-400">{s.count}회 ({Math.round((s.count / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Win rate badge ─────────────────────────────────────────────────────────
function WinRateBadge({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-xs text-gray-400">-</span>
  const color = rate >= 60 ? 'text-violet-600' : rate >= 40 ? 'text-gray-600' : 'text-red-500'
  return <span className={`text-sm font-bold ${color}`}>{rate}%</span>
}

// ── Tabs ───────────────────────────────────────────────────────────────────
const TABS = ['경기분석', '시즌분석', '파트너분석', '상대분석'] as const
type Tab = (typeof TABS)[number]

// ── Main component ─────────────────────────────────────────────────────────
export default function StatsClient({
  summary, chartData, avgScoreDiff, eventBreakdown,
  venueStats, partnerStats, opponentStats, seasonStats,
}: Props) {
  const [tab, setTab] = useState<Tab>('경기분석')

  const donutData = eventBreakdown.map((e) => ({
    label: e.event,
    count: e.count,
    color: EVENT_COLORS[e.event] ?? '#94a3b8',
  }))

  // 천적: lowest win rate, at least 1 match
  const nemesis = [...opponentStats].sort((a, b) => a.winRate - b.winRate).slice(0, 5)

  return (
    <main>
      {/* ── Summary cards ── */}
      <div className="bg-[#1a1a2e] px-5 pb-8 pt-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">전체 통계</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '총 참가대회', value: `${summary.total}회` },
            { label: '총 경기수', value: `${summary.totalMatches}경기` },
            { label: '전체 승률', value: `${summary.winRate}%` },
            { label: '최고 결과', value: summary.best ?? '-' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="mt-1 text-xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-gray-500">
          {summary.totalWins}승 {summary.totalLosses}패
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-white">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-semibold transition-colors ${
              tab === t
                ? 'border-b-2 border-violet-600 text-violet-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-lg px-5 pb-24 pt-5 flex flex-col gap-4">

        {/* ══════════════════════════════════════════ 경기분석 */}
        {tab === '경기분석' && (
          <>
            {/* 승률 변화 추이 */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-1 font-semibold text-gray-800">승률 변화 추이</p>
              <p className="mb-3 text-xs text-gray-400">최근 {chartData.length}개 대회의 경기 승률</p>
              <LineChart data={chartData} />
            </div>

            {/* 평균 득점차 + 종목 비율 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-400">평균 득점차</p>
                {avgScoreDiff !== null ? (
                  <>
                    <p className={`mt-2 text-3xl font-bold ${avgScoreDiff >= 0 ? 'text-violet-600' : 'text-red-500'}`}>
                      {avgScoreDiff > 0 ? '+' : ''}{avgScoreDiff}
                      <span className="text-base font-normal text-gray-500"> 점</span>
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {avgScoreDiff >= 0 ? '평균적으로 앞섬' : '평균적으로 뒤짐'}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-gray-400">데이터 없음</p>
                )}
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="mb-2 text-xs text-gray-400">종목 비율</p>
                {donutData.length > 0 ? (
                  <DonutChart data={donutData} />
                ) : (
                  <p className="text-sm text-gray-400">데이터 없음</p>
                )}
              </div>
            </div>

            {/* 행운의 체육관 */}
            {venueStats.length > 0 && (
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-base">📍</span>
                  <p className="font-semibold text-gray-800">행운의 체육관</p>
                </div>
                <div className="flex flex-col gap-2">
                  {venueStats.slice(0, 3).map((v, i) => (
                    <div key={v.venue} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{v.venue}</p>
                          <p className="text-xs text-gray-400">{v.wins}승 {v.losses}패</p>
                        </div>
                      </div>
                      <WinRateBadge rate={v.winRate} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════ 시즌분석 */}
        {tab === '시즌분석' && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="mb-3 font-semibold text-gray-800">시즌별 출전 현황</p>
            {seasonStats.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">데이터가 없어요</p>
            ) : (
              <div className="flex flex-col gap-2">
                {seasonStats.map((s) => (
                  <div key={s.season} className="rounded-xl bg-gray-50 px-3 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-800">{s.season}</p>
                      <WinRateBadge rate={s.winRate} />
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-gray-400">
                      <span>대회 {s.count}회</span>
                      <span>경기 {s.wins + s.losses}전</span>
                      <span>{s.wins}승 {s.losses}패</span>
                    </div>
                    {/* progress bar */}
                    {(s.wins + s.losses) > 0 && (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-violet-500"
                          style={{ width: `${s.winRate ?? 0}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════ 파트너분석 */}
        {tab === '파트너분석' && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="mb-3 font-semibold text-gray-800">파트너별 전적</p>
            {partnerStats.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">파트너 정보가 없어요</p>
            ) : (
              <div className="flex flex-col gap-2">
                {partnerStats.map((p, i) => (
                  <div key={p.partner} className="rounded-xl bg-gray-50 px-3 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400">{i + 1}위</span>
                        <p className="text-sm font-semibold text-gray-800">{p.partner}</p>
                      </div>
                      <WinRateBadge rate={p.winRate} />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      대회 {p.tournaments}회 · {p.wins}승 {p.losses}패
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════ 상대분석 */}
        {tab === '상대분석' && (
          <>
            {opponentStats.length === 0 ? (
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="py-6 text-center text-sm text-gray-400">상대 정보가 없어요</p>
              </div>
            ) : (
              <>
                {/* 최다 대결 TOP 5 */}
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <span>🎯</span>
                    <p className="font-semibold text-gray-800">최다 대결 상대 TOP 5</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {opponentStats.slice(0, 5).map((o, i) => (
                      <div key={o.name} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-xs font-bold text-gray-400">{i + 1}위</span>
                          <p className="text-sm font-semibold text-gray-800">{o.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-violet-600">{o.total}경기</p>
                          <p className="text-xs text-gray-400">{o.wins}승 {o.losses}패 · {o.winRate}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 천적 TOP 5 */}
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <span>😈</span>
                    <p className="font-semibold text-gray-800">나의 천적 TOP 5</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {nemesis.slice(0, 5).map((o, i) => (
                      <div
                        key={o.name}
                        className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-xs font-bold text-gray-400">{i + 1}위</span>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{o.name}</p>
                            <p className="text-xs text-gray-400">{o.wins}승 {o.losses}패 ({o.total}경기)</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-red-500">{o.winRate}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}
