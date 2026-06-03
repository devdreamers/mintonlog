'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  years: string[]
  events: string[]
  categories: string[]
}

function FilterChipsInner({ years, events, categories }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeYear = searchParams.get('year') ?? ''
  const activeEvent = searchParams.get('event') ?? ''
  const activeCategory = searchParams.get('category') ?? ''

  function setFilter(key: 'year' | 'event' | 'category', value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (params.get(key) === value) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/?${params.toString()}`)
  }

  // Filter out 'award' from events prop to prevent duplication with the hardcoded chip
  const safeEvents = events.filter((e) => e !== 'award')

  const chips = [
    ...years.map((y) => ({ label: y, key: 'year' as const, value: y })),
    ...safeEvents.map((e) => ({ label: e, key: 'event' as const, value: e })),
    { label: '수상만', key: 'event' as const, value: 'award' },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-gray-200 bg-white px-5 py-3 scrollbar-none">
      {chips.map(({ label, key, value }) => {
        const isActive =
          (key === 'year' && activeYear === value) ||
          (key === 'event' && activeEvent === value) ||
          (key === 'category' && activeCategory === value)
        return (
          <button
            type="button"
            key={`${key}-${value}`}
            onClick={() => setFilter(key, value)}
            aria-pressed={isActive}
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

export default function FilterChips(props: Props) {
  return (
    <Suspense fallback={<div className="h-11 border-b border-gray-200 bg-white" />}>
      <FilterChipsInner {...props} />
    </Suspense>
  )
}
