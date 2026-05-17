'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  years: string[]
  events: string[]
}

export default function FilterChips({ years, events }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeYear = searchParams.get('year') ?? ''
  const activeEvent = searchParams.get('event') ?? ''

  function setFilter(key: 'year' | 'event', value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (params.get(key) === value) {
      params.delete(key)
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
