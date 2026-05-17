import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()

// Anthropic SDK mock
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {
        messages: {
          create: mockCreate,
        },
      }
    }),
  }
})

import { callClaudeVision } from '../parse'

describe('callClaudeVision', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('정상 JSON 응답이면 ParseResult 반환', async () => {
    mockCreate.mockResolvedValueOnce({
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
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '죄송합니다, 이미지를 인식할 수 없습니다.' }],
    })

    const result = await callClaudeVision('base64data', 'image/jpeg')
    expect(result).toBeNull()
  })

  it('API 오류 발생하면 null 반환', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API Error'))

    const result = await callClaudeVision('base64data', 'image/jpeg')
    expect(result).toBeNull()
  })

  it('null 필드는 빈 문자열로 정규화', async () => {
    mockCreate.mockResolvedValueOnce({
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
