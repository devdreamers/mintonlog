import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ParseResult } from '@/types'

const PARSE_PROMPT = `이 배드민턴 대회 결과 스크린샷에서 다음 정보를 추출해서 JSON으로만 응답해줘. 마크다운 코드블록 없이 JSON만:
{
  "name": "대회명 (모르면 null)",
  "date": "날짜 YYYY-MM-DD 형식 (모르면 null)",
  "event": "종목 - 남복/여복/혼복/남단/여단 중 하나 (모르면 null)",
  "category": "나이대+급수 조합 (예: 30D, 2030BC, 30BC, 40D - 모르면 null)",
  "placement": "최종 순위 또는 결과 (예: 1위, 8강, 우승, 모르면 null)",
  "partner": "파트너 이름 (모르면 null)",
  "confidence": {
    "name": 0.0~1.0,
    "date": 0.0~1.0,
    "event": 0.0~1.0,
    "category": 0.0~1.0,
    "placement": 0.0~1.0,
    "partner": 0.0~1.0
  }
}`

export async function callClaudeVision(
  base64Image: string,
  mimeType: string
): Promise<ParseResult | null> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: base64Image,
        },
      },
      PARSE_PROMPT,
    ])

    const raw = result.response.text().trim()
    const jsonText = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(jsonText)

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
