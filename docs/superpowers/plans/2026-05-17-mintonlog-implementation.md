# MintonLog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배드민턴 대회 이력을 스크린샷 업로드 → Claude Vision AI 파싱 → 수정 저장 흐름으로 관리하는 반응형 웹 구축

**Architecture:** Next.js 15 App Router SSR 페이지 4개, Supabase PostgreSQL + Storage + Google OAuth, Claude Haiku Vision API로 스크린샷 파싱. API Route `/api/parse`가 Claude를 호출하고, Server Action `saveTournament`이 Supabase에 저장.

**Tech Stack:** Next.js 15, Tailwind CSS, Supabase (`@supabase/ssr`), Anthropic SDK (`@anthropic-ai/sdk`), Vitest + Testing Library, Vercel 배포

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts` (create-next-app이 생성)
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `.env.local.example`

- [ ] **Step 1: Next.js 앱 생성**

현재 디렉터리에서 실행:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --no-git
```

프롬프트가 나오면 모두 기본값(Enter)으로 진행.

- [ ] **Step 2: 추가 패키지 설치**

```bash
npm install @supabase/supabase-js @supabase/ssr @anthropic-ai/sdk
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom vite-tsconfig-paths
```

- [ ] **Step 3: vitest.config.ts 작성**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 4: vitest.setup.ts 작성**

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: package.json에 test 스크립트 추가**

`package.json`의 `"scripts"` 블록에 추가:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: 환경변수 예시 파일 작성**

```bash
# .env.local.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-...
```

`.env.local`을 `.gitignore`에 추가 (create-next-app이 이미 포함했는지 확인):

```bash
grep ".env.local" .gitignore || echo ".env.local" >> .gitignore
```

- [ ] **Step 7: 빌드 확인**

```bash
npm run build
```

Expected: 오류 없이 완료. (app/page.tsx 기본 템플릿 상태)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 + Supabase + Vitest"
```

---

## Task 2: TypeScript Types + DB Schema

**Files:**
- Create: `types/index.ts`
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Step 1: types/index.ts 작성**

```typescript
// types/index.ts
export interface Tournament {
  id: string
  created_at: string
  name: string
  date: string          // 'YYYY-MM-DD'
  event: string         // '남복' | '여복' | '혼복' | '단' | '여단'
  category: string      // 'B조', 'A부' 등
  placement: string     // '1위', '8강' 등
  venue: string | null
  note: string | null
  screenshot_url: string
}

export interface Match {
  id: string
  tournament_id: string
  round: string         // '8강', '준결승', '결승' 등
  opponent: string | null
  result: 'win' | 'loss'
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
  confidence: {
    name: number
    date: number
    event: number
    category: number
    placement: number
  }
}

export interface Stats {
  gold: number
  silver: number
  bronze: number
  total: number
}
```

- [ ] **Step 2: DB 마이그레이션 SQL 작성**

```sql
-- supabase/migrations/001_initial.sql

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  date date not null,
  event text not null,
  category text not null default '',
  placement text not null default '',
  venue text,
  note text,
  screenshot_url text not null default ''
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  round text not null,
  opponent text,
  result text not null check (result in ('win', 'loss')),
  scores jsonb not null default '[]'::jsonb
);

-- Supabase Storage 버킷은 대시보드에서 생성:
-- 버킷 이름: screenshots
-- Public: true
```

- [ ] **Step 3: Supabase 대시보드에서 마이그레이션 실행**

Supabase 대시보드 → SQL Editor에서 위 SQL 파일 내용을 실행.

- [ ] **Step 4: screenshots 버킷 생성**

Supabase 대시보드 → Storage → New bucket:
- Name: `screenshots`
- Public: 체크 (공개 읽기)

- [ ] **Step 5: Commit**

```bash
git add types/ supabase/
git commit -m "feat: add TypeScript types and DB migration SQL"
```

---

## Task 3: Supabase Clients + Auth Middleware

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `middleware.ts`
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: 브라우저 Supabase 클라이언트 작성**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: 서버 Supabase 클라이언트 작성**

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서는 쿠키 세팅 불가 — 무시
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Next.js 미들웨어 작성 (/add 보호)**

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/add')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/add', '/add/:path*'],
}
```

- [ ] **Step 4: Google OAuth 콜백 라우트 작성**

```typescript
// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/`)
}
```

- [ ] **Step 5: TypeScript 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음 (또는 Next.js 템플릿 관련 기존 오류만)

- [ ] **Step 6: Commit**

```bash
git add lib/ middleware.ts app/auth/
git commit -m "feat: add Supabase clients and auth middleware"
```

---

## Task 4: Stats Calculation (TDD)

**Files:**
- Create: `lib/stats.ts`
- Create: `lib/__tests__/stats.test.ts`

- [ ] **Step 1: 테스트 파일 작성 (실패하는 테스트)**

```typescript
// lib/__tests__/stats.test.ts
import { describe, it, expect } from 'vitest'
import { computeStats } from '../stats'

describe('computeStats', () => {
  it('빈 배열이면 모두 0', () => {
    expect(computeStats([])).toEqual({ gold: 0, silver: 0, bronze: 0, total: 0 })
  })

  it('1위는 금메달로 카운트', () => {
    expect(computeStats(['1위'])).toEqual({ gold: 1, silver: 0, bronze: 0, total: 1 })
  })

  it('우승도 금메달로 카운트', () => {
    expect(computeStats(['우승'])).toEqual({ gold: 1, silver: 0, bronze: 0, total: 1 })
  })

  it('2위는 은메달로 카운트', () => {
    expect(computeStats(['2위'])).toEqual({ gold: 0, silver: 1, bronze: 0, total: 1 })
  })

  it('준우승도 은메달로 카운트', () => {
    expect(computeStats(['준우승'])).toEqual({ gold: 0, silver: 1, bronze: 0, total: 1 })
  })

  it('3위는 동메달로 카운트', () => {
    expect(computeStats(['3위'])).toEqual({ gold: 0, silver: 0, bronze: 1, total: 1 })
  })

  it('8강은 수상 없음, total에만 카운트', () => {
    expect(computeStats(['8강'])).toEqual({ gold: 0, silver: 0, bronze: 0, total: 1 })
  })

  it('복합 배열 — 금 2, 은 1, 동 1, 출전 5', () => {
    expect(computeStats(['1위', '우승', '2위', '3위', '8강'])).toEqual({
      gold: 2,
      silver: 1,
      bronze: 1,
      total: 5,
    })
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npm test -- lib/__tests__/stats.test.ts
```

Expected: FAIL — `Cannot find module '../stats'`

- [ ] **Step 3: lib/stats.ts 구현**

```typescript
// lib/stats.ts
import type { Stats } from '@/types'

export function computeStats(placements: string[]): Stats {
  return {
    gold: placements.filter(
      (p) => p === '1위' || p === '우승'
    ).length,
    silver: placements.filter(
      (p) => p === '2위' || p === '준우승'
    ).length,
    bronze: placements.filter(
      (p) => p === '3위' || p === '공동3위'
    ).length,
    total: placements.length,
  }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npm test -- lib/__tests__/stats.test.ts
```

Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/stats.ts lib/__tests__/stats.test.ts
git commit -m "feat: add computeStats with tests"
```

---

## Task 5: Claude Vision Parse Lib (TDD)

**Files:**
- Create: `lib/parse.ts`
- Create: `lib/__tests__/parse.test.ts`

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// lib/__tests__/parse.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Anthropic SDK mock
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  }
})

import Anthropic from '@anthropic-ai/sdk'
import { callClaudeVision } from '../parse'

function getMockCreate() {
  const instance = new (Anthropic as any)()
  return instance.messages.create as ReturnType<typeof vi.fn>
}

describe('callClaudeVision', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('정상 JSON 응답이면 ParseResult 반환', async () => {
    getMockCreate().mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            name: '경기도 대회',
            date: '2025-04-12',
            event: '남복',
            category: 'B조',
            placement: '1위',
            confidence: { name: 0.95, date: 0.9, event: 0.85, category: 0.7, placement: 0.95 },
          }),
        },
      ],
    })

    const result = await callClaudeVision('base64data', 'image/jpeg')

    expect(result).toEqual({
      name: '경기도 대회',
      date: '2025-04-12',
      event: '남복',
      category: 'B조',
      placement: '1위',
      confidence: { name: 0.95, date: 0.9, event: 0.85, category: 0.7, placement: 0.95 },
    })
  })

  it('JSON 파싱 실패하면 null 반환', async () => {
    getMockCreate().mockResolvedValueOnce({
      content: [{ type: 'text', text: '죄송합니다, 이미지를 인식할 수 없습니다.' }],
    })

    const result = await callClaudeVision('base64data', 'image/jpeg')
    expect(result).toBeNull()
  })

  it('API 오류 발생하면 null 반환', async () => {
    getMockCreate().mockRejectedValueOnce(new Error('API Error'))

    const result = await callClaudeVision('base64data', 'image/jpeg')
    expect(result).toBeNull()
  })

  it('null 필드는 빈 문자열로 정규화', async () => {
    getMockCreate().mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            name: '테스트 대회',
            date: null,
            event: null,
            category: null,
            placement: '8강',
            confidence: { name: 0.9, date: 0, event: 0, category: 0, placement: 0.8 },
          }),
        },
      ],
    })

    const result = await callClaudeVision('base64data', 'image/jpeg')
    expect(result?.date).toBe('')
    expect(result?.event).toBe('')
    expect(result?.category).toBe('')
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npm test -- lib/__tests__/parse.test.ts
```

Expected: FAIL — `Cannot find module '../parse'`

- [ ] **Step 3: lib/parse.ts 구현**

```typescript
// lib/parse.ts
import Anthropic from '@anthropic-ai/sdk'
import type { ParseResult } from '@/types'

const PARSE_PROMPT = `이 배드민턴 대회 결과 스크린샷에서 다음 정보를 추출해서 JSON으로만 응답해줘. 다른 텍스트 없이 JSON만:
{
  "name": "대회명 (모르면 null)",
  "date": "날짜 YYYY-MM-DD 형식 (모르면 null)",
  "event": "종목 - 남복/여복/혼복/단/여단 중 하나 (모르면 null)",
  "category": "부수 또는 조 (예: B조, A부, 모르면 null)",
  "placement": "최종 순위 또는 결과 (예: 1위, 8강, 우승, 모르면 null)",
  "confidence": {
    "name": 0.0~1.0,
    "date": 0.0~1.0,
    "event": 0.0~1.0,
    "category": 0.0~1.0,
    "placement": 0.0~1.0
  }
}`

export async function callClaudeVision(
  base64Image: string,
  mimeType: string
): Promise<ParseResult | null> {
  try {
    const client = new Anthropic()

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as
                  | 'image/jpeg'
                  | 'image/png'
                  | 'image/gif'
                  | 'image/webp',
                data: base64Image,
              },
            },
            { type: 'text', text: PARSE_PROMPT },
          ],
        },
      ],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    const parsed = JSON.parse(text)

    return {
      name: parsed.name ?? '',
      date: parsed.date ?? '',
      event: parsed.event ?? '',
      category: parsed.category ?? '',
      placement: parsed.placement ?? '',
      confidence: parsed.confidence ?? {
        name: 0,
        date: 0,
        event: 0,
        category: 0,
        placement: 0,
      },
    }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npm test -- lib/__tests__/parse.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: 전체 테스트 실행**

```bash
npm test
```

Expected: PASS (12 tests total)

- [ ] **Step 6: Commit**

```bash
git add lib/parse.ts lib/__tests__/parse.test.ts
git commit -m "feat: add callClaudeVision with tests"
```

---

## Task 6: /login Page + API Parse Route

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/api/parse/route.ts`

- [ ] **Step 1: /login 페이지 작성**

```typescript
// app/login/page.tsx
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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md text-center">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Minton<span className="text-violet-600">Log</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            대회 기록을 관리하려면 로그인하세요
          </p>
        </div>
        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google로 로그인
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Supabase 대시보드에서 Google OAuth 설정**

Supabase 대시보드 → Authentication → Providers → Google:
1. Google Cloud Console에서 OAuth 2.0 클라이언트 ID/Secret 생성
2. Authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
3. Supabase에 Client ID, Client Secret 입력 후 저장

- [ ] **Step 3: /api/parse 라우트 작성**

```typescript
// app/api/parse/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaudeVision } from '@/lib/parse'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let file: File | null = null
  try {
    const formData = await request.formData()
    file = formData.get('file') as File | null
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Use JPEG, PNG, GIF, or WebP.' },
      { status: 415 }
    )
  }

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')

  const result = await callClaudeVision(base64, file.type)

  if (!result) {
    return NextResponse.json(
      { error: 'Could not parse image. Please fill in manually.' },
      { status: 422 }
    )
  }

  return NextResponse.json(result)
}
```

- [ ] **Step 4: .env.local 파일 생성 (실제 값 채우기)**

```bash
cp .env.local.example .env.local
# 에디터로 열어서 실제 Supabase URL, 키, Anthropic 키 채우기
```

- [ ] **Step 5: dev 서버 실행 후 /login 접속 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000/login` 열기. Google 로그인 버튼이 보이면 OK.

- [ ] **Step 6: /add 미들웨어 확인**

미로그인 상태에서 `http://localhost:3000/add` 접속 → `/login`으로 리다이렉트되면 OK.

- [ ] **Step 7: Commit**

```bash
git add app/login/ app/api/ app/auth/
git commit -m "feat: add login page and /api/parse route"
```

---

## Task 7: Root Layout + Navigation

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: globals.css 업데이트**

`app/globals.css`를 다음으로 교체:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: app/layout.tsx 작성**

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import NavBar from '@/components/NavBar'

export const metadata: Metadata = {
  title: 'MintonLog — 배드민턴 대회 이력',
  description: '나의 배드민턴 대회 이력과 수상 결과를 한 곳에서 관리',
  openGraph: {
    title: 'MintonLog',
    description: '배드민턴 대회 이력 관리',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen">
        <NavBar />
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: NavBar 컴포넌트 작성**

```typescript
// components/NavBar.tsx
import { createClient } from '@/lib/supabase/server'
import NavBarClient from './NavBarClient'

export default async function NavBar() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <NavBarClient isLoggedIn={!!user} />
}
```

- [ ] **Step 4: NavBarClient 컴포넌트 작성**

```typescript
// components/NavBarClient.tsx
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
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <nav className="flex h-13 items-center justify-between bg-[#1a1a2e] px-5">
      <Link href="/" className="text-lg font-bold text-white tracking-tight">
        Minton<span className="text-violet-400">Log</span>
      </Link>
      {isLoggedIn ? (
        <button
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
```

- [ ] **Step 5: 빌드 확인**

```bash
npm run build
```

Expected: 오류 없음

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/globals.css components/NavBar.tsx components/NavBarClient.tsx
git commit -m "feat: add root layout and navigation"
```

---

## Task 8: UI Primitives — MedalBadge + StatsBar + TournamentCard

**Files:**
- Create: `components/MedalBadge.tsx`
- Create: `components/StatsBar.tsx`
- Create: `components/TournamentCard.tsx`

- [ ] **Step 1: MedalBadge 컴포넌트 작성**

```typescript
// components/MedalBadge.tsx
interface Props {
  placement: string
}

function getStyle(placement: string): { bg: string; content: string } {
  if (placement === '1위' || placement === '우승') {
    return { bg: 'bg-amber-100', content: '🥇' }
  }
  if (placement === '2위' || placement === '준우승') {
    return { bg: 'bg-gray-100', content: '🥈' }
  }
  if (placement === '3위' || placement === '공동3위') {
    return { bg: 'bg-orange-100', content: '🥉' }
  }
  // 8강, 16강 등 텍스트 뱃지
  const short = placement.replace(/강$/, '강').replace(/위$/, '위')
  return { bg: 'bg-violet-100', content: short }
}

export default function MedalBadge({ placement }: Props) {
  const { bg, content } = getStyle(placement)
  const isEmoji = /\p{Emoji}/u.test(content)

  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg} ${
        isEmoji ? 'text-xl' : 'text-xs font-bold text-violet-700'
      }`}
    >
      {content}
    </div>
  )
}
```

- [ ] **Step 2: StatsBar 컴포넌트 작성**

```typescript
// components/StatsBar.tsx
import type { Stats } from '@/types'

interface Props {
  stats: Stats
}

const CARDS = [
  { key: 'gold' as const, label: '금', icon: '🥇', color: 'text-amber-400' },
  { key: 'silver' as const, label: '은', icon: '🥈', color: 'text-gray-300' },
  { key: 'bronze' as const, label: '동', icon: '🥉', color: 'text-orange-400' },
  { key: 'total' as const, label: '출전', icon: '🏸', color: 'text-violet-400' },
]

export default function StatsBar({ stats }: Props) {
  return (
    <div className="bg-[#1a1a2e] px-5 pb-8 pt-6">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
        전체 수상 실적
      </p>
      <div className="grid grid-cols-4 gap-3">
        {CARDS.map(({ key, label, icon, color }) => (
          <div
            key={key}
            className="flex flex-col items-center rounded-xl bg-white/10 py-3"
          >
            <span className="text-xl">{icon}</span>
            <span className={`text-2xl font-bold ${color}`}>{stats[key]}</span>
            <span className="text-xs text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TournamentCard 컴포넌트 작성**

```typescript
// components/TournamentCard.tsx
import Link from 'next/link'
import MedalBadge from './MedalBadge'
import type { Tournament } from '@/types'

interface Props {
  tournament: Tournament
}

function placementColor(placement: string): string {
  if (placement === '1위' || placement === '우승') return 'text-amber-500 font-bold'
  if (placement === '2위' || placement === '준우승') return 'text-gray-500 font-bold'
  if (placement === '3위' || placement === '공동3위') return 'text-orange-500 font-bold'
  return 'text-violet-600 font-bold'
}

export default function TournamentCard({ tournament }: Props) {
  const meta = [tournament.date, tournament.event, tournament.category, tournament.venue]
    .filter(Boolean)
    .join(' · ')

  return (
    <Link href={`/${tournament.id}`}>
      <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
        <MedalBadge placement={tournament.placement} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">{tournament.name}</p>
          <p className="truncate text-xs text-gray-500">{meta}</p>
        </div>
        <span className={`shrink-0 text-sm ${placementColor(tournament.placement)}`}>
          {tournament.placement}
        </span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: dev 서버에서 컴포넌트 확인 (임시)**

`app/page.tsx`에 임시 import 추가해서 오류 없는지 확인:

```bash
npm run dev
```

브라우저 콘솔에 오류 없으면 OK. (실제 데이터 연결은 Task 9에서)

- [ ] **Step 5: Commit**

```bash
git add components/MedalBadge.tsx components/StatsBar.tsx components/TournamentCard.tsx
git commit -m "feat: add MedalBadge, StatsBar, TournamentCard components"
```

---

## Task 9: FilterChips + FAB Components

**Files:**
- Create: `components/FilterChips.tsx`
- Create: `components/FAB.tsx`

- [ ] **Step 1: FilterChips 컴포넌트 작성**

필터 상태는 URL searchParams로 관리 (SSR 친화적).

```typescript
// components/FilterChips.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  years: string[]      // ['2025', '2024', '2023'] — DB에서 distinct year 목록
  events: string[]     // ['남복', '혼복', '단'] — DB에서 distinct event 목록
}

export default function FilterChips({ years, events }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeYear = searchParams.get('year') ?? ''
  const activeEvent = searchParams.get('event') ?? ''

  function setFilter(key: 'year' | 'event', value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (params.get(key) === value) {
      params.delete(key)   // 같은 칩 다시 클릭 → 해제
    } else {
      params.set(key, value)
    }
    router.push(`/?${params.toString()}`)
  }

  const chips = [
    ...years.map((y) => ({ label: y, key: 'year' as const, value: y })),
    ...events.map((e) => ({ label: e, key: 'event' as const, value: e })),
    { label: '수상만', key: 'event' as const, value: 'award' },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-gray-200 bg-white px-5 py-3 scrollbar-none">
      {chips.map(({ label, key, value }) => {
        const isActive =
          (key === 'year' && activeYear === value) ||
          (key === 'event' && activeEvent === value)
        return (
          <button
            key={`${key}-${value}`}
            onClick={() => setFilter(key, value)}
            className={`shrink-0 rounded-full border px-3.5 py-1 text-sm transition-colors ${
              isActive
                ? 'border-violet-600 bg-violet-600 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: FAB 컴포넌트 작성**

```typescript
// components/FAB.tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add components/FilterChips.tsx components/FAB.tsx
git commit -m "feat: add FilterChips and FAB components"
```

---

## Task 10: / Home Page (SSR)

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 메인 페이지 작성**

```typescript
// app/page.tsx
import { createClient } from '@/lib/supabase/server'
import { computeStats } from '@/lib/stats'
import StatsBar from '@/components/StatsBar'
import FilterChips from '@/components/FilterChips'
import TournamentCard from '@/components/TournamentCard'
import FAB from '@/components/FAB'
import type { Tournament } from '@/types'

interface SearchParams {
  year?: string
  event?: string
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { year, event } = await searchParams
  const supabase = await createClient()

  // 전체 대회 목록 (스탯 계산용)
  const { data: allTournaments } = await supabase
    .from('tournaments')
    .select('placement')
    .order('date', { ascending: false })

  const stats = computeStats(
    (allTournaments ?? []).map((t: { placement: string }) => t.placement)
  )

  // 필터 적용 후 표시용 대회 목록
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

  const { data: tournaments } = await query

  // 연도별 그룹핑
  const byYear: Record<string, Tournament[]> = {}
  for (const t of (tournaments ?? []) as Tournament[]) {
    const y = t.date.slice(0, 4)
    if (!byYear[y]) byYear[y] = []
    byYear[y].push(t)
  }

  // 필터 칩용 distinct 값
  const { data: allRaw } = await supabase
    .from('tournaments')
    .select('date, event')
  const allItems = (allRaw ?? []) as { date: string; event: string }[]
  const years = [...new Set(allItems.map((t) => t.date.slice(0, 4)))].sort(
    (a, b) => Number(b) - Number(a)
  )
  const events = [...new Set(allItems.map((t) => t.event))].filter(Boolean)

  return (
    <main>
      <StatsBar stats={stats} />
      <FilterChips years={years} events={events} />
      <div className="px-5 pb-24 pt-3">
        {Object.keys(byYear).length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400">
            아직 등록된 대회가 없어요
          </p>
        )}
        {Object.entries(byYear).map(([yr, items]) => (
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
```

- [ ] **Step 2: dev 서버에서 메인 페이지 확인**

```bash
npm run dev
```

`http://localhost:3000` 접속. Supabase DB가 비어있으면 "아직 등록된 대회가 없어요" 메시지, 스탯은 모두 0으로 나오면 OK.

- [ ] **Step 3: 빌드 확인**

```bash
npm run build
```

Expected: 오류 없음

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: implement SSR home page with stats and tournament list"
```

---

## Task 11: UploadDropzone + ParseConfirmForm + saveTournament Action

**Files:**
- Create: `components/UploadDropzone.tsx`
- Create: `components/ParseConfirmForm.tsx`
- Create: `app/add/actions.ts`

- [ ] **Step 1: UploadDropzone 작성**

```typescript
// components/UploadDropzone.tsx
'use client'

import { useRef, useState } from 'react'

interface Props {
  onFileSelect: (file: File) => void
}

export default function UploadDropzone({ onFileSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    onFileSelect(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-colors ${
        isDragging
          ? 'border-violet-500 bg-violet-50'
          : 'border-gray-300 bg-gray-50 hover:border-violet-400 hover:bg-violet-50'
      }`}
    >
      <span className="text-4xl">📷</span>
      <p className="mt-3 text-center text-sm text-gray-500">
        <span className="font-semibold text-violet-600">클릭하거나 드래그</span>해서 스크린샷을 올려주세요
        <br />
        배드민턴 앱 결과 화면, 대회 결과표 모두 OK
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: ParseConfirmForm 작성**

```typescript
// components/ParseConfirmForm.tsx
'use client'

import type { ParseResult } from '@/types'

const CONFIDENCE_THRESHOLD = 0.7

interface Props {
  parsed: ParseResult
  screenshotPreviewUrl: string
  action: (formData: FormData) => Promise<void>
  file: File
}

function fieldClass(confidence: number): string {
  return confidence < CONFIDENCE_THRESHOLD
    ? 'border-amber-400 bg-amber-50 focus:border-amber-500'
    : 'border-violet-400 bg-violet-50 focus:border-violet-500'
}

function fieldHint(confidence: number): React.ReactNode {
  return confidence < CONFIDENCE_THRESHOLD ? (
    <p className="mt-1 text-xs text-amber-600">⚠ 불확실 — 확인해주세요</p>
  ) : (
    <p className="mt-1 text-xs text-green-600">✓ AI가 읽어옴</p>
  )
}

export default function ParseConfirmForm({
  parsed,
  screenshotPreviewUrl,
  action,
  file,
}: Props) {
  const { confidence } = parsed

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.append('file', file)
    await action(fd)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* 스크린샷 미리보기 */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screenshotPreviewUrl}
          alt="업로드한 스크린샷"
          className="max-h-48 w-full object-contain bg-gray-100"
        />
        <p className="bg-white px-3 py-2 text-xs text-green-600">
          ● AI가 아래 정보를 읽어왔어요. 틀린 부분은 수정해주세요.
        </p>
      </div>

      {/* 대회명 */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">대회명</label>
        <input
          name="name"
          defaultValue={parsed.name ?? ''}
          required
          className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${fieldClass(confidence.name)}`}
          placeholder="경기도 배드민턴 동호인 대회"
        />
        {fieldHint(confidence.name)}
      </div>

      {/* 날짜 + 종목 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">날짜</label>
          <input
            name="date"
            type="date"
            defaultValue={parsed.date ?? ''}
            required
            className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${fieldClass(confidence.date)}`}
          />
          {fieldHint(confidence.date)}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">종목</label>
          <select
            name="event"
            defaultValue={parsed.event ?? ''}
            required
            className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${fieldClass(confidence.event)}`}
          >
            <option value="">선택</option>
            {['남복', '여복', '혼복', '단', '여단'].map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          {fieldHint(confidence.event)}
        </div>
      </div>

      {/* 부수/조 + 순위 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">부수/조</label>
          <input
            name="category"
            defaultValue={parsed.category ?? ''}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${fieldClass(confidence.category)}`}
            placeholder="B조"
          />
          {fieldHint(confidence.category)}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">순위/결과</label>
          <input
            name="placement"
            defaultValue={parsed.placement ?? ''}
            required
            className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none ${fieldClass(confidence.placement)}`}
            placeholder="1위"
          />
          {fieldHint(confidence.placement)}
        </div>
      </div>

      {/* 장소 (선택) */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">장소 (선택)</label>
        <input
          name="venue"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
          placeholder="수원실내체육관"
        />
      </div>

      {/* 메모 (선택) */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">메모 (선택)</label>
        <input
          name="note"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none"
          placeholder="파트너 이름, 특이사항 등"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-violet-600 py-3.5 text-base font-semibold text-white hover:bg-violet-500 transition-colors"
      >
        저장하기 →
      </button>
    </form>
  )
}
```

- [ ] **Step 3: saveTournament 서버 액션 작성**

```typescript
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

  let screenshot_url = ''

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
```

- [ ] **Step 4: Commit**

```bash
git add components/UploadDropzone.tsx components/ParseConfirmForm.tsx app/add/actions.ts
git commit -m "feat: add UploadDropzone, ParseConfirmForm, and saveTournament action"
```

---

## Task 12: /add Page (Multi-Step Flow)

**Files:**
- Modify: `app/add/page.tsx`

- [ ] **Step 1: /add 페이지 작성**

```typescript
// app/add/page.tsx
'use client'

import { useState } from 'react'
import UploadDropzone from '@/components/UploadDropzone'
import ParseConfirmForm from '@/components/ParseConfirmForm'
import { saveTournament } from './actions'
import type { ParseResult } from '@/types'

type Step = 'upload' | 'confirm'

const EMPTY_PARSE: ParseResult = {
  name: null, date: null, event: null, category: null, placement: null,
  confidence: { name: 0, date: 0, event: 0, category: 0, placement: 0 },
}

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { key: 'upload', label: '업로드' },
    { key: 'confirm', label: 'AI 파싱 확인' },
    { key: 'done', label: '저장' },
  ]
  const activeIdx = steps.findIndex((s) => s.key === step)

  return (
    <div className="flex items-center justify-center gap-2 border-b border-gray-200 bg-white py-3">
      {steps.map((s, i) => {
        const isDone = i < activeIdx
        const isActive = i === activeIdx
        return (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-6 bg-gray-200" />}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span
                className={`text-xs ${
                  isActive ? 'font-semibold text-violet-600' : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AddPage() {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [parsed, setParsed] = useState<ParseResult>(EMPTY_PARSE)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleFileSelect(selectedFile: File) {
    setFile(selectedFile)
    setPreviewUrl(URL.createObjectURL(selectedFile))
    setError('')
    setIsLoading(true)

    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      const res = await fetch('/api/parse', { method: 'POST', body: fd })

      if (res.ok) {
        const data = await res.json()
        setParsed(data)
      } else {
        // 파싱 실패 → 빈 폼으로 폴백
        setParsed(EMPTY_PARSE)
        if (res.status !== 422) {
          setError('AI 파싱에 실패했어요. 직접 입력해주세요.')
        }
      }
    } catch {
      setParsed(EMPTY_PARSE)
      setError('네트워크 오류가 발생했어요. 직접 입력해주세요.')
    } finally {
      setIsLoading(false)
      setStep('confirm')
    }
  }

  return (
    <main>
      <StepIndicator step={step} />
      <div className="mx-auto max-w-lg px-5 py-6">
        {step === 'upload' && (
          <div>
            <h1 className="mb-2 text-lg font-bold text-gray-900">대회 기록 추가</h1>
            <p className="mb-5 text-sm text-gray-500">
              스크린샷을 올리면 AI가 대회 정보를 자동으로 읽어드려요
            </p>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-violet-300 bg-violet-50 p-10">
                <div className="text-2xl animate-spin">🏸</div>
                <p className="mt-3 text-sm text-violet-600">AI가 스크린샷을 분석 중이에요...</p>
              </div>
            ) : (
              <UploadDropzone onFileSelect={handleFileSelect} />
            )}
          </div>
        )}

        {step === 'confirm' && file && (
          <div>
            <h1 className="mb-2 text-lg font-bold text-gray-900">파싱 결과 확인</h1>
            {error && (
              <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {error}
              </div>
            )}
            <ParseConfirmForm
              parsed={parsed}
              screenshotPreviewUrl={previewUrl}
              action={saveTournament}
              file={file}
            />
            <button
              onClick={() => { setStep('upload'); setFile(null); setPreviewUrl('') }}
              className="mt-3 w-full rounded-xl border border-gray-300 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              다시 업로드
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: 전체 흐름 수동 테스트**

1. `npm run dev`
2. Google 로그인
3. `http://localhost:3000/add` 접속
4. 배드민턴 앱 스크린샷 업로드
5. AI 파싱 결과 확인 (보라/노랑 테두리)
6. 폼 수정 후 저장
7. `/[id]` 페이지로 리다이렉트 확인 (아직 구현 안 됨 — 404여도 OK)
8. Supabase 대시보드 → Table Editor에서 레코드 생성 확인

- [ ] **Step 3: Commit**

```bash
git add app/add/page.tsx
git commit -m "feat: implement /add multi-step upload and AI parse flow"
```

---

## Task 13: MatchTimeline Component

**Files:**
- Create: `components/MatchTimeline.tsx`
- Create: `components/AddMatchForm.tsx`

- [ ] **Step 1: MatchTimeline 컴포넌트 작성**

```typescript
// components/MatchTimeline.tsx
import type { Match } from '@/types'

interface Props {
  matches: Match[]
}

function ScoreDisplay({ scores }: { scores: Match['scores'] }) {
  return (
    <div className="flex gap-2 text-xs">
      {scores.map((s) => (
        <span
          key={s.game}
          className={`font-mono ${
            s.us > s.them ? 'text-green-600 font-semibold' : 'text-red-500'
          }`}
        >
          {s.us}-{s.them}
        </span>
      ))}
    </div>
  )
}

export default function MatchTimeline({ matches }: Props) {
  if (matches.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-400">
        아직 등록된 경기 기록이 없어요
      </p>
    )
  }

  return (
    <div className="relative flex flex-col gap-4">
      {/* 수직선 */}
      <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200" />

      {matches.map((match) => (
        <div key={match.id} className="relative flex gap-4 pl-10">
          {/* 원 아이콘 */}
          <div
            className={`absolute left-1.5 top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ${
              match.result === 'win' ? 'bg-green-500' : 'bg-red-400'
            }`}
          >
            {match.result === 'win' ? '승' : '패'}
          </div>
          <div className="flex-1 rounded-xl bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">{match.round}</span>
              {match.opponent && (
                <span className="text-xs text-gray-400">vs {match.opponent}</span>
              )}
            </div>
            <div className="mt-1">
              <ScoreDisplay scores={match.scores} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: AddMatchForm 작성 (로그인 사용자용 경기 추가 폼)**

```typescript
// components/AddMatchForm.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ScoreGame } from '@/types'

interface Props {
  tournamentId: string
  onAdded: () => void
}

export default function AddMatchForm({ tournamentId, onAdded }: Props) {
  const [round, setRound] = useState('')
  const [opponent, setOpponent] = useState('')
  const [result, setResult] = useState<'win' | 'loss'>('win')
  const [games, setGames] = useState<ScoreGame[]>([{ game: 1, us: 0, them: 0 }])
  const [saving, setSaving] = useState(false)

  function addGame() {
    setGames((prev) => [...prev, { game: prev.length + 1, us: 0, them: 0 }])
  }

  function updateGame(idx: number, field: 'us' | 'them', value: number) {
    setGames((prev) =>
      prev.map((g, i) => (i === idx ? { ...g, [field]: value } : g))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!round) return
    setSaving(true)

    const supabase = createClient()
    await supabase.from('matches').insert({
      tournament_id: tournamentId,
      round,
      opponent: opponent || null,
      result,
      scores: games,
    })

    setRound('')
    setOpponent('')
    setResult('win')
    setGames([{ game: 1, us: 0, them: 0 }])
    setSaving(false)
    onAdded()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-violet-200 bg-violet-50 p-4">
      <p className="mb-3 text-sm font-semibold text-violet-700">경기 추가</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={round}
          onChange={(e) => setRound(e.target.value)}
          placeholder="라운드 (예: 8강)"
          required
          className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={opponent}
          onChange={(e) => setOpponent(e.target.value)}
          placeholder="상대 이름 (선택)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={result}
          onChange={(e) => setResult(e.target.value as 'win' | 'loss')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="win">승</option>
          <option value="loss">패</option>
        </select>
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {games.map((g, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-12 text-xs text-gray-500">게임 {g.game}</span>
            <input
              type="number"
              min={0}
              max={30}
              value={g.us}
              onChange={(e) => updateGame(i, 'us', Number(e.target.value))}
              className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm"
            />
            <span className="text-gray-400">:</span>
            <input
              type="number"
              min={0}
              max={30}
              value={g.them}
              onChange={(e) => updateGame(i, 'them', Number(e.target.value))}
              className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addGame}
          className="mt-1 text-xs text-violet-600 underline text-left"
        >
          + 게임 추가
        </button>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="mt-3 w-full rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
      >
        {saving ? '저장 중...' : '저장'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/MatchTimeline.tsx components/AddMatchForm.tsx
git commit -m "feat: add MatchTimeline and AddMatchForm components"
```

---

## Task 14: /[id] Tournament Detail Page

**Files:**
- Create: `app/[id]/page.tsx`
- Create: `app/[id]/MatchSection.tsx`

- [ ] **Step 1: MatchSection (클라이언트 컴포넌트 — 경기 추가 후 새로고침)**

```typescript
// app/[id]/MatchSection.tsx
'use client'

import { useState } from 'react'
import MatchTimeline from '@/components/MatchTimeline'
import AddMatchForm from '@/components/AddMatchForm'
import type { Match } from '@/types'

interface Props {
  initialMatches: Match[]
  tournamentId: string
  isLoggedIn: boolean
}

export default function MatchSection({
  initialMatches,
  tournamentId,
  isLoggedIn,
}: Props) {
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const [showForm, setShowForm] = useState(false)

  async function refreshMatches() {
    const res = await fetch(`/api/matches?tournament_id=${tournamentId}`)
    if (res.ok) {
      const data = await res.json()
      setMatches(data)
    }
    setShowForm(false)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          경기 기록
        </h2>
        {isLoggedIn && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-200 transition-colors"
          >
            + 경기 추가
          </button>
        )}
      </div>
      {showForm && (
        <div className="mb-4">
          <AddMatchForm
            tournamentId={tournamentId}
            onAdded={refreshMatches}
          />
        </div>
      )}
      <MatchTimeline matches={matches} />
    </div>
  )
}
```

- [ ] **Step 2: /api/matches 라우트 작성 (MatchSection에서 사용)**

```typescript
// app/api/matches/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tournamentId = searchParams.get('tournament_id')

  if (!tournamentId) {
    return NextResponse.json({ error: 'tournament_id required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

- [ ] **Step 3: /[id]/page.tsx 작성**

```typescript
// app/[id]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MedalBadge from '@/components/MedalBadge'
import MatchSection from './MatchSection'
import type { Tournament, Match } from '@/types'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('tournaments').select('name').eq('id', id).single()
  return { title: data?.name ? `${data.name} — MintonLog` : 'MintonLog' }
}

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [tournamentRes, matchesRes, userRes] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', id).single(),
    supabase.from('matches').select('*').eq('tournament_id', id).order('created_at', { ascending: true }),
    supabase.auth.getUser(),
  ])

  if (tournamentRes.error || !tournamentRes.data) notFound()

  const tournament = tournamentRes.data as Tournament
  const matches = (matchesRes.data ?? []) as Match[]
  const isLoggedIn = !!userRes.data.user

  const meta = [tournament.event, tournament.category, tournament.venue]
    .filter(Boolean)
    .join(' · ')

  return (
    <main className="mx-auto max-w-lg px-5 pb-24 pt-4">
      {/* 대회 기본 정보 */}
      <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <MedalBadge placement={tournament.placement} />
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">{tournament.name}</h1>
            <p className="mt-0.5 text-sm text-gray-500">{tournament.date}</p>
            {meta && <p className="mt-0.5 text-xs text-gray-400">{meta}</p>}
          </div>
          <span className="shrink-0 text-lg font-bold text-violet-600">
            {tournament.placement}
          </span>
        </div>
        {tournament.note && (
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
            {tournament.note}
          </p>
        )}
      </div>

      {/* 원본 스크린샷 */}
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

      {/* 경기 타임라인 */}
      <MatchSection
        initialMatches={matches}
        tournamentId={tournament.id}
        isLoggedIn={isLoggedIn}
      />
    </main>
  )
}
```

- [ ] **Step 4: 수동 테스트**

1. `npm run dev`
2. `/add`에서 대회 저장 → `/[id]` 리다이렉트
3. 대회 정보, 스크린샷, 경기 기록 섹션 확인
4. 로그인 상태에서 경기 추가 버튼 클릭 → AddMatchForm 등장
5. 경기 스코어 입력 후 저장 → MatchTimeline에 바로 반영

- [ ] **Step 5: 빌드 확인**

```bash
npm run build
```

Expected: 오류 없음

- [ ] **Step 6: Commit**

```bash
git add app/[id]/ app/api/matches/
git commit -m "feat: implement tournament detail page with match timeline"
```

---

## Task 15: Mobile Responsiveness + Final Polish

**Files:**
- Modify: `app/page.tsx` (모바일 스크롤 최적화)
- Modify: `tailwind.config.ts` (scrollbar-none 유틸리티)

- [ ] **Step 1: tailwind.config.ts에 scrollbar-none 추가**

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: { extend: {} },
  plugins: [],
}

export default config
```

`globals.css`에 scrollbar-none 유틸리티 추가:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .scrollbar-none {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }
}
```

- [ ] **Step 2: gstack browse로 반응형 확인**

```bash
export PATH="$HOME/.bun/bin:$PATH"
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B goto "http://localhost:3000"
$B viewport 375x812
$B screenshot /tmp/mintonlog-final-mobile.png
$B viewport 1280x800
$B screenshot /tmp/mintonlog-final-desktop.png
```

두 스크린샷을 Read 툴로 열어서 레이아웃 확인.

- [ ] **Step 3: 전체 테스트 실행**

```bash
npm test
```

Expected: PASS (12 tests)

- [ ] **Step 4: Commit**

```bash
git add app/globals.css tailwind.config.ts
git commit -m "chore: add scrollbar-none utility and final polish"
```

---

## Task 16: Vercel 배포

**Files:**
- Create: `vercel.json` (필요 시)

- [ ] **Step 1: GitHub 리포지터리 생성 및 push**

```bash
git remote add origin https://github.com/YOUR_USERNAME/mintonlog.git
git branch -M main
git push -u origin main
```

- [ ] **Step 2: Vercel 프로젝트 연결**

1. `https://vercel.com` → New Project
2. GitHub 리포 선택
3. Framework: Next.js (자동 감지)
4. Environment Variables에 아래 4개 입력:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
5. Deploy 클릭

- [ ] **Step 3: Google OAuth Redirect URI 업데이트**

Google Cloud Console → OAuth 클라이언트 → Authorized redirect URIs에 추가:
```
https://YOUR_PROJECT.supabase.co/auth/v1/callback
```
(이미 추가되어 있으면 스킵)

Supabase 대시보드 → Authentication → URL Configuration → Site URL:
```
https://your-app.vercel.app
```

- [ ] **Step 4: 배포 후 gstack browse로 검증**

```bash
export PATH="$HOME/.bun/bin:$PATH"
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B goto "https://your-app.vercel.app"
$B screenshot /tmp/prod-check.png
$B console
$B network
```

- `screenshot` Read로 열어서 페이지 확인
- `console`: JS 오류 없음 확인
- `network`: 실패한 요청 없음 확인

- [ ] **Step 5: /add 흐름 end-to-end 테스트 (프로덕션)**

1. `https://your-app.vercel.app/login` → Google 로그인
2. `/add` → 스크린샷 업로드 → AI 파싱 확인
3. 저장 → `/[id]` 리다이렉트 확인
4. 경기 기록 추가

- [ ] **Step 6: 최종 커밋**

```bash
git add .
git commit -m "chore: production deployment verified"
git push
```

---

## Self-Review

**스펙 커버리지 체크:**

| 스펙 요구사항 | 구현 태스크 |
|---|---|
| 메인 페이지 스탯 카드 (금/은/동/출전) | Task 4 (stats.ts), Task 8 (StatsBar), Task 10 (/) |
| 연도·종목 필터 칩 | Task 9 (FilterChips), Task 10 (/) |
| 대회 카드 리스트 (메달뱃지, 메타) | Task 8 (TournamentCard), Task 10 (/) |
| 로그인 사용자 FAB | Task 9 (FAB), Task 10 (/) |
| /[id] 대회 상세 + 스크린샷 | Task 14 |
| 경기 스코어 타임라인 | Task 13 (MatchTimeline), Task 14 |
| 경기 추가 (로그인) | Task 13 (AddMatchForm), Task 14 |
| /add 업로드 + AI 파싱 | Task 5 (parse.ts), Task 6 (/api/parse), Task 11, Task 12 |
| 신뢰도 낮으면 노랑 테두리 | Task 11 (ParseConfirmForm) |
| Google OAuth 로그인 | Task 3 (middleware), Task 6 (login page) |
| Vercel 배포 | Task 16 |
| SSR + OG 메타 | Task 7 (layout.tsx), Task 14 (generateMetadata) |

**Placeholder 없음** ✓  
**타입 일관성:** `Tournament`, `Match`, `ParseResult`, `Stats`, `ScoreGame` — Task 2에서 정의, 이후 태스크에서 import해서 사용 ✓  
**TDD 적용:** Task 4 (stats.ts 8 tests), Task 5 (parse.ts 4 tests) ✓
