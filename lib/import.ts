import type { Match } from '@/types'

export interface ImportPayload {
  n: string   // name
  d: string   // date
  e: string   // event
  c: string   // category
  p: string   // placement
  v: string   // venue
  m: Array<{
    r: string
    re: 'win' | 'loss'
    s: Array<{ game: number; us: number; them: number }>
    ot?: string
    o1?: string
    o2?: string
  }>
}

export function encodeImportPayload(payload: ImportPayload): string {
  const json = JSON.stringify(payload)
  // TextEncoder handles Unicode safely
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function decodeImportPayload(encoded: string): ImportPayload | null {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const json = Buffer.from(padded, 'base64').toString('utf-8')
    return JSON.parse(json) as ImportPayload
  } catch {
    return null
  }
}

export function matchesFromPayload(
  payload: ImportPayload,
  tournamentId: string
): Omit<Match, 'id' | 'created_at'>[] {
  return payload.m.map((m) => ({
    tournament_id: tournamentId,
    round: m.r,
    result: m.re,
    scores: m.s,
    opponent_team: m.ot ?? null,
    opponent1: m.o1 ?? null,
    opponent2: m.o2 ?? null,
  }))
}
