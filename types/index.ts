// types/index.ts
export interface Tournament {
  id: string
  created_at: string
  name: string
  date: string          // 'YYYY-MM-DD'
  event: string         // '남복' | '여복' | '혼복' | '남단' | '여단'
  category: string      // '30D', '2030BC' 등 나이대+급수
  placement: string     // '1위', '8강' 등
  venue: string | null
  partner: string | null
  screenshot_url: string
}

export interface Match {
  id: string
  tournament_id: string
  round: string         // '8강', '준결승', '결승' 등
  opponent_team: string | null
  opponent1: string | null
  opponent2: string | null
  result: 'win' | 'loss'
  // Supabase returns JSONB as unknown at runtime — always cast: `data as Match[]`
  scores: ScoreGame[]
  created_at: string
}

export interface ScoreGame {
  game: number
  us: number
  them: number
}

export interface ParseResult {
  name: string | null
  date: string | null
  event: string | null
  category: string | null
  placement: string | null
  partner: string | null
  confidence: {
    name: number
    date: number
    event: number
    category: number
    placement: number
    partner: number
  }
}

export interface Stats {
  gold: number
  silver: number
  bronze: number
  total: number
}
