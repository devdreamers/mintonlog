'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  async function handleGoogleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#1a1a2e] px-6">
      {/* Background glow blobs */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-violet-800/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="mb-4 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-3xl shadow-lg shadow-violet-900/50">
              🏸
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Minton<span className="text-violet-400">Log</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            배드민턴 대회 기록을 한 곳에서
          </p>
        </div>

        {/* Feature highlights */}
        <div className="mb-8 space-y-2">
          {[
            { icon: '🏆', text: '대회 성적 & 경기 기록 관리' },
            { icon: '📊', text: '승률·파트너·상대 통계 분석' },
            { icon: '✨', text: 'AI 스크린샷 자동 파싱' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
              <span className="text-lg">{icon}</span>
              <span className="text-sm text-gray-300">{text}</span>
            </div>
          ))}
        </div>

        {/* Google login button */}
        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-gray-800 shadow-lg shadow-black/30 transition-all hover:bg-gray-50 active:scale-[0.98]"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google로 계속하기
        </button>

        <p className="mt-5 text-center text-xs text-gray-600">
          로그인 시 서비스 이용약관에 동의하는 것으로 간주됩니다
        </p>
      </div>
    </main>
  )
}
