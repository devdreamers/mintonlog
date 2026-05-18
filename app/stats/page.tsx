import { createClient } from '@/lib/supabase/server'
import StatsClient from './StatsClient'
import type { Tournament, Match } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '분석 — MintonLog' }

function bestPlacement(placements: string[]): string | null {
  const order = ['우승', '1위', '준우승', '2위', '공동3위', '3위', '4강', '8강', '16강', '32강']
  for (const p of order) {
    if (placements.includes(p)) return p
  }
  return placements[0] ?? null
}

export default async function StatsPage() {
  const supabase = await createClient()

  const [{ data: rawT }, { data: rawM }] = await Promise.all([
    supabase.from('tournaments').select('*').order('date', { ascending: true }),
    supabase.from('matches').select('*'),
  ])

  const tournaments = (rawT ?? []) as Tournament[]
  const matches = (rawM ?? []) as Match[]

  // Group matches by tournament
  const byTid: Record<string, Match[]> = {}
  for (const m of matches) {
    if (!byTid[m.tournament_id]) byTid[m.tournament_id] = []
    byTid[m.tournament_id].push(m)
  }

  // Per-tournament stats
  const tStats = tournaments.map((t) => {
    const ms = byTid[t.id] ?? []
    const wins = ms.filter((m) => m.result === 'win').length
    const losses = ms.filter((m) => m.result === 'loss').length
    return {
      id: t.id, name: t.name, date: t.date, event: t.event,
      venue: t.venue, partner: t.partner, placement: t.placement,
      wins, losses, total: ms.length,
      winRate: ms.length > 0 ? Math.round((wins / ms.length) * 100) : null,
    }
  })

  // Summary
  const totalWins = matches.filter((m) => m.result === 'win').length
  const totalLosses = matches.filter((m) => m.result === 'loss').length
  const winRate = matches.length > 0 ? Math.round((totalWins / matches.length) * 100) : 0
  const best = bestPlacement(tournaments.map((t) => t.placement))

  // Avg score diff
  const scored = matches.filter((m) => m.scores?.[0])
  const avgScoreDiff =
    scored.length > 0
      ? +(scored.reduce((s, m) => s + (m.scores[0].us - m.scores[0].them), 0) / scored.length).toFixed(1)
      : null

  // Win rate trend: last 6 tournaments with match data
  const chartData = tStats
    .filter((t) => t.total > 0)
    .slice(-6)
    .map((t) => ({ label: t.date.slice(5).replace('-', '/'), value: t.winRate! }))

  // Event breakdown
  const eventMap: Record<string, number> = {}
  for (const t of tournaments) if (t.event) eventMap[t.event] = (eventMap[t.event] || 0) + 1
  const eventBreakdown = Object.entries(eventMap)
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count)

  // Venue stats
  const venueMap: Record<string, { wins: number; losses: number }> = {}
  for (const m of matches) {
    const t = tournaments.find((t) => t.id === m.tournament_id)
    if (t?.venue) {
      if (!venueMap[t.venue]) venueMap[t.venue] = { wins: 0, losses: 0 }
      if (m.result === 'win') venueMap[t.venue].wins++
      else venueMap[t.venue].losses++
    }
  }
  const venueStats = Object.entries(venueMap)
    .map(([venue, s]) => ({ venue, ...s, total: s.wins + s.losses, winRate: Math.round((s.wins / (s.wins + s.losses)) * 100) }))
    .sort((a, b) => b.winRate - a.winRate || b.total - a.total)

  // Partner stats
  const partnerMap: Record<string, { tournaments: number; wins: number; losses: number }> = {}
  for (const t of tStats) {
    if (t.partner) {
      if (!partnerMap[t.partner]) partnerMap[t.partner] = { tournaments: 0, wins: 0, losses: 0 }
      partnerMap[t.partner].tournaments++
      partnerMap[t.partner].wins += t.wins
      partnerMap[t.partner].losses += t.losses
    }
  }
  const partnerStats = Object.entries(partnerMap)
    .map(([partner, s]) => ({
      partner, ...s,
      winRate: (s.wins + s.losses) > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : null,
    }))
    .sort((a, b) => b.tournaments - a.tournaments)

  // Opponent stats (from opponent1 + opponent2)
  const oppMap: Record<string, { wins: number; losses: number }> = {}
  for (const m of matches) {
    for (const name of [m.opponent1, m.opponent2].filter(Boolean) as string[]) {
      if (!oppMap[name]) oppMap[name] = { wins: 0, losses: 0 }
      if (m.result === 'win') oppMap[name].wins++
      else oppMap[name].losses++
    }
  }
  const opponentStats = Object.entries(oppMap)
    .map(([name, s]) => ({ name, ...s, total: s.wins + s.losses, winRate: Math.round((s.wins / (s.wins + s.losses)) * 100) }))
    .sort((a, b) => b.total - a.total)

  // Season stats
  const seasonMap: Record<string, { count: number; wins: number; losses: number }> = {}
  for (const t of tStats) {
    const month = parseInt(t.date.slice(5, 7))
    const season = `${t.date.slice(0, 4)}-${month <= 6 ? '상반기' : '하반기'}`
    if (!seasonMap[season]) seasonMap[season] = { count: 0, wins: 0, losses: 0 }
    seasonMap[season].count++
    seasonMap[season].wins += t.wins
    seasonMap[season].losses += t.losses
  }
  const seasonStats = Object.entries(seasonMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([season, s]) => ({
      season, ...s,
      winRate: (s.wins + s.losses) > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : null,
    }))

  return (
    <StatsClient
      summary={{ total: tournaments.length, totalMatches: matches.length, totalWins, totalLosses, winRate, best }}
      chartData={chartData}
      avgScoreDiff={avgScoreDiff}
      eventBreakdown={eventBreakdown}
      venueStats={venueStats}
      partnerStats={partnerStats}
      opponentStats={opponentStats}
      seasonStats={seasonStats}
    />
  )
}
