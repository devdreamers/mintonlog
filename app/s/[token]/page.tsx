import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { computeStats } from '@/lib/stats'
import StatsBar from '@/components/StatsBar'
import MedalBadge from '@/components/MedalBadge'
import type { Tournament, Match } from '@/types'

export default async function SharedPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createServiceClient()

  // Validate token and get owner's user_id
  const { data: settings } = await supabase
    .from('share_settings')
    .select('token, user_id')
    .eq('token', token)
    .single()

  if (!settings) notFound()

  const [{ data: rawT }, { data: rawM }] = await Promise.all([
    supabase.from('tournaments').select('*').eq('user_id', settings.user_id).order('date', { ascending: false }),
    supabase.from('matches').select('*'),
  ])

  const tournaments = (rawT ?? []) as Tournament[]
  const matches = (rawM ?? []) as Match[]

  const stats = computeStats(tournaments.map((t) => t.placement))

  const byTid: Record<string, Match[]> = {}
  for (const m of matches) {
    if (!byTid[m.tournament_id]) byTid[m.tournament_id] = []
    byTid[m.tournament_id].push(m)
  }

  // Group by year
  const byYear: Record<string, Tournament[]> = {}
  for (const t of tournaments) {
    const y = t.date.slice(0, 4)
    if (!byYear[y]) byYear[y] = []
    byYear[y].push(t)
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      <StatsBar stats={stats} />

      {/* Read-only banner */}
      <div className="bg-violet-50 border-b border-violet-100 px-5 py-2 text-center text-xs text-violet-500">
        읽기 전용 공유 페이지
      </div>

      <div className="px-5 pt-4 space-y-8">
        {Object.entries(byYear)
          .sort(([a], [b]) => Number(b) - Number(a))
          .map(([yr, items]) => (
            <div key={yr}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {yr}년
              </p>
              <div className="flex flex-col gap-4">
                {items.map((t) => {
                  const ms = byTid[t.id] ?? []
                  const wins = ms.filter((m) => m.result === 'win').length
                  const losses = ms.filter((m) => m.result === 'loss').length
                  const meta = [t.event, t.category, t.venue].filter(Boolean).join(' · ')
                  return (
                    <div key={t.id} className="rounded-xl bg-white shadow-sm overflow-hidden">
                      {/* Tournament header */}
                      <div className="flex items-center gap-3 p-4">
                        <MedalBadge placement={t.placement} />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">{t.name}</p>
                          <p className="text-xs text-gray-400 truncate">{t.date}{meta ? ` · ${meta}` : ''}</p>
                          {t.partner && (
                            <p className="text-xs text-gray-400">파트너: {t.partner}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-violet-600">{t.placement}</p>
                          {ms.length > 0 && (
                            <p className="text-xs text-gray-400">{wins}승 {losses}패</p>
                          )}
                        </div>
                      </div>

                      {/* Match list */}
                      {ms.length > 0 && (
                        <div className="border-t border-gray-100 divide-y divide-gray-50">
                          {ms.map((m) => {
                            const score = m.scores?.[0]
                            const opponentParts = [m.opponent_team, m.opponent1, m.opponent2].filter(Boolean)
                            return (
                              <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                                    m.result === 'win' ? 'bg-green-500' : 'bg-red-400'
                                  }`}
                                >
                                  {m.result === 'win' ? '승' : '패'}
                                </span>
                                <span className="text-sm text-gray-700 flex-1">{m.round}</span>
                                {opponentParts.length > 0 && (
                                  <span className="text-xs text-gray-400">vs {opponentParts.join(' · ')}</span>
                                )}
                                {score && (
                                  <span className={`text-xs font-mono font-semibold ${
                                    score.us > score.them ? 'text-green-600' : 'text-red-500'
                                  }`}>
                                    {score.us}-{score.them}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

        {tournaments.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400">등록된 대회가 없어요</p>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-gray-300">
        MintonLog · 배드민턴 대회 기록
      </p>
    </main>
  )
}
