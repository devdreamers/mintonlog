import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ParseResult } from '@/types'

const PARSE_PROMPT = `이 배드민턴 대회 관련 스크린샷을 꼼꼼히 분석해서 정보를 추출해줘.

추출할 정보:
- name: 대회명 (예: "2025 서울시배드민턴대회", 없으면 null)
- date: 날짜 YYYY-MM-DD 형식 (예: "2025-11-30", 없으면 null)
- event: 종목 — 반드시 남복/여복/혼복/남단/여단 중 하나만 (없으면 null)
- category: 나이대+급수 조합 (예: "30D", "2030BC", "40C", 없으면 null)
- placement: 최종 순위 또는 결과 (예: "1위", "우승", "8강", 없으면 null)
- partner: 파트너 이름 — 복식이라면 같은 팀 선수 이름 (없으면 null)
- confidence: 각 필드 확실도 0.0~1.0

힌트:
- 경기 결과 목록이 보이면 전승이면 "우승" 또는 "1위"일 가능성이 높음
- 여복/남복/혼복 텍스트가 반복되면 그게 종목
- 이미지에서 보이는 모든 텍스트를 빠짐없이 읽어줘`

export async function callClaudeVision(
  base64Image: string,
  mimeType: string
): Promise<ParseResult | null> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: base64Image,
        },
      },
      PARSE_PROMPT,
    ])

    const parsed = JSON.parse(result.response.text())

    return {
      name: parsed.name ?? null,
      date: parsed.date ?? null,
      event: parsed.event ?? null,
      category: parsed.category ?? null,
      placement: parsed.placement ?? null,
      partner: parsed.partner ?? null,
      confidence: parsed.confidence ?? {
        name: 0,
        date: 0,
        event: 0,
        category: 0,
        placement: 0,
        partner: 0,
      },
    }
  } catch {
    return null
  }
}
