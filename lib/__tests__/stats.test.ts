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
