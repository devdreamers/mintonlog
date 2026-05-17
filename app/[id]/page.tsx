import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MedalBadge from '@/components/MedalBadge'
import MatchSection from './MatchSection'
import type { Tournament, Match } from '@/types'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('tournaments')
    .select('name')
    .eq('id', id)
    .single()
  return { title: data?.name ? `${data.name} — MintonLog` : 'MintonLog' }
}

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [tournamentRes, matchesRes, userRes] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', id).single(),
    supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', id)
      .order('created_at', { ascending: true }),
    supabase.auth.getUser(),
  ])

  if (tournamentRes.error || !tournamentRes.data) notFound()

  const tournament = tournamentRes.data as Tournament
  const matches = (matchesRes.data ?? []) as Match[]
  const isLoggedIn = !!userRes.data.user

  const meta = [tournament.event, tournament.category, tournament.venue]
    .filter(Boolean)
    .join(' · ')

  return (
    <main className="mx-auto max-w-lg px-5 pb-24 pt-4">
      {/* Tournament info card */}
      <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <MedalBadge placement={tournament.placement} />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 break-words">{tournament.name}</h1>
            <time dateTime={tournament.date} className="mt-0.5 text-sm text-gray-500">
              {new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(tournament.date + 'T00:00:00'))}
            </time>
            {meta && <p className="mt-0.5 text-xs text-gray-400">{meta}</p>}
          </div>
          <span className="shrink-0 text-lg font-bold text-violet-600">
            {tournament.placement}
          </span>
        </div>
        {tournament.note && (
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
            {tournament.note}
          </p>
        )}
      </div>

      {/* Original screenshot */}
      {tournament.screenshot_url && (
        <div className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm">
          <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            원본 스크린샷
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tournament.screenshot_url}
            alt="대회 결과 스크린샷"
            className="mt-2 w-full object-contain"
          />
        </div>
      )}

      {/* Match timeline */}
      <MatchSection
        initialMatches={matches}
        tournamentId={tournament.id}
        isLoggedIn={isLoggedIn}
      />
    </main>
  )
}
