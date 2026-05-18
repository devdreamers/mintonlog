'use client'

import { useState } from 'react'
import { encodeImportPayload } from '@/lib/import'
import type { Tournament, Match } from '@/types'

interface Props {
  tournament: Tournament
  matches: Match[]
}

export default function PartnerShareButton({ tournament, matches }: Props) {
  const [copied, setCopied] = useState(false)

  function handleShare() {
    const payload = {
      n: tournament.name,
      d: tournament.date,
      e: tournament.event,
      c: tournament.category ?? '',
      p: tournament.placement,
      v: tournament.venue ?? '',
      m: matches.map((m) => ({
        r: m.round,
        re: m.result,
        s: m.scores,
        ...(m.opponent_team ? { ot: m.opponent_team } : {}),
        ...(m.opponent1 ? { o1: m.opponent1 } : {}),
        ...(m.opponent2 ? { o2: m.opponent2 } : {}),
      })),
    }
    const encoded = encodeImportPayload(payload)
    const url = `${window.location.origin}/import/${encoded}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-violet-500 hover:bg-violet-50 hover:text-violet-700 transition-colors"
    >
      {copied ? (
        <>
          <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600 text-xs">링크 복사됨</span>
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs">파트너 공유</span>
        </>
      )}
    </button>
  )
}
