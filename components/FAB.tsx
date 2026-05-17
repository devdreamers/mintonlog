import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function FAB() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return (
    <Link
      href="/add"
      className="fixed bottom-6 right-5 flex h-13 w-13 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-300 hover:bg-violet-500 transition-colors text-2xl"
      aria-label="대회 기록 추가"
    >
      +
    </Link>
  )
}
