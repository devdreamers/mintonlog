'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  isLoggedIn: boolean
}

export default function NavBarClient({ isLoggedIn }: Props) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign-out failed:', error.message)
      return
    }
    router.refresh()
  }

  return (
    <nav aria-label="Main navigation" className="flex h-13 items-center justify-between bg-[#1a1a2e] px-5">
      <Link href="/" className="text-lg font-bold text-white tracking-tight">
        Minton<span className="text-violet-400">Log</span>
      </Link>
      {isLoggedIn ? (
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg bg-violet-700 px-3 py-1.5 text-sm text-white hover:bg-violet-600 transition-colors"
        >
          로그아웃
        </button>
      ) : (
        <Link
          href="/login"
          className="rounded-lg bg-violet-700 px-3 py-1.5 text-sm text-white hover:bg-violet-600 transition-colors"
        >
          로그인
        </Link>
      )}
    </nav>
  )
}
