// app/add/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
  const note = (formData.get('note') as string) || null

  let screenshot_url: string | null = null

  if (file && file.size > 0) {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${Date.now()}.${ext}`

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
    .insert({ name, date, event, category, placement, venue, note, screenshot_url })
    .select()
    .single()

  if (error || !tournament) {
    throw new Error(error?.message ?? 'Failed to save tournament')
  }

  redirect(`/${tournament.id}`)
}
