// app/page.tsx
import { createClient } from '@/lib/supabase/server'
import { computeStats } from '@/lib/stats'
import StatsBar from '@/components/StatsBar'
import FilterChips from '@/components/FilterChips'
import TournamentCard from '@/components/TournamentCard'
import FAB from '@/components/FAB'
import ShareButton from '@/components/ShareButton'
import type { Tournament } from '@/types'

interface SearchParams {
  year?: string
  event?: string
  category?: string
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { year, event, category } = await searchParams
  const supabase = await createClient()

  // All tournaments for stats, years, events, and categories
  const { data: allRaw, error: allError } = await supabase
    .from('tournaments')
    .select('placement, date, event, category')
  if (allError) throw allError
  const allItems = (allRaw ?? []) as { placement: string; date: string; event: string; category: string | null }[]

  const stats = computeStats(allItems.map((t) => t.placement))
  const years = [...new Set(allItems.map((t) => t.date.slice(0, 4)))].sort(
    (a, b) => Number(b) - Number(a)
  )
  const events = [...new Set(allItems.map((t) => t.event))].filter(Boolean)
  const categories = [...new Set(allItems.map((t) => t.category).filter(Boolean) as string[])].sort()

  // Filtered tournaments for display
  let query = supabase
    .from('tournaments')
    .select('*')
    .order('date', { ascending: false })

  if (year) {
    query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
  }

  if (event === 'award') {
    query = query.in('placement', ['1위', '2위', '3위', '우승', '준우승', '공동3위'])
  } else if (event) {
    query = query.eq('event', event)
  }

  if (category) {
    query = query.eq('category', category)
  }

  const { data: tournaments, error: filteredError } = await query
  if (filteredError) throw filteredError

  // Share token (non-blocking — null if table doesn't exist yet)
  const { data: shareData } = await supabase
    .from('share_settings')
    .select('token')
    .single()
  const shareToken = shareData?.token ?? null

  // Group by year
  const byYear: Record<string, Tournament[]> = {}
  for (const t of (tournaments ?? []) as Tournament[]) {
    const y = t.date.slice(0, 4)
    if (!byYear[y]) byYear[y] = []
    byYear[y].push(t)
  }

  return (
    <main>
      <StatsBar stats={stats} />
      <FilterChips years={years} events={events} categories={categories} />
      <div className="flex justify-end border-b border-gray-100 bg-white px-4 py-1">
        <ShareButton initialToken={shareToken} />
      </div>
      <div className="px-5 pb-24 pt-3">
        {Object.keys(byYear).length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400">
            아직 등록된 대회가 없어요
          </p>
        )}
        {Object.entries(byYear).sort(([a], [b]) => Number(b) - Number(a)).map(([yr, items]) => (
          <div key={yr}>
            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {yr}년
            </p>
            <div className="flex flex-col gap-2.5">
              {items.map((t) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <FAB />
    </main>
  )
}
