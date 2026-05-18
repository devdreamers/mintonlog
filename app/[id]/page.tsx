import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TournamentSection from './TournamentSection'
import MatchSection from './MatchSection'
import PartnerShareButton from '@/components/PartnerShareButton'
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

  return (
    <main className="mx-auto max-w-lg px-5 pb-24 pt-4">
      {/* Tournament info */}
      <TournamentSection tournament={tournament} isLoggedIn={isLoggedIn} />

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

      {/* Partner share */}
      {isLoggedIn && matches.length > 0 && (
        <div className="mb-4 flex justify-end">
          <PartnerShareButton tournament={tournament} matches={matches} />
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
