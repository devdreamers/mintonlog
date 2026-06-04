// app/add/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { ParsedMatch } from '@/types'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const MAX_FILE_BYTES = 10 * 1024 * 1024

export async function saveTournament(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const file = formData.get('file') as File | null
  const name = formData.get('name') as string
  const date = formData.get('date') as string
  const event = formData.get('event') as string
  const category = (formData.get('category') as string) ?? ''
  const placement = formData.get('placement') as string
  const venue = (formData.get('venue') as string) || null
  const partner = (formData.get('partner') as string) || null
  const matchesJson = (formData.get('matches_json') as string) || '[]'
  let parsedMatches: ParsedMatch[] = []
  try { parsedMatches = JSON.parse(matchesJson) } catch { parsedMatches = [] }

  if (file && file.size > 0) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error('Unsupported file type')
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error('File too large')
    }
  }

  if (!name?.trim() || !date?.trim() || !event?.trim() || !placement?.trim()) {
    throw new Error('Required fields missing')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Invalid date format')
  }

  let screenshot_url = ''

  if (file && file.size > 0) {
    const rawExt = file.name.split('.').pop()?.toLowerCase() ?? ''
    const ext = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : 'jpg'
    const path = `${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(path, file, { contentType: file.type })

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('screenshots')
        .getPublicUrl(path)
      screenshot_url = urlData.publicUrl
    }
  }

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({ name, date, event, category, placement, venue, partner, screenshot_url, user_id: user.id })
    .select()
    .single()

  if (error || !tournament) {
    throw new Error(error?.message ?? 'Failed to save tournament')
  }

  if (parsedMatches.length > 0) {
    const matchRows = parsedMatches
      .filter((m) => m.round?.trim())
      .map((m) => ({
        tournament_id: tournament.id,
        round: m.round.trim(),
        opponent_team: null,
        opponent1: m.opponent1?.trim() || null,
        opponent2: m.opponent2?.trim() || null,
        result: m.result === 'loss' ? 'loss' : 'win',
        scores: (m.score_us != null && m.score_them != null)
          ? [{ game: 1, us: m.score_us, them: m.score_them }]
          : [],
      }))
    if (matchRows.length > 0) {
      await supabase.from('matches').insert(matchRows)
    }
  }

  redirect(`/${tournament.id}`)
}
