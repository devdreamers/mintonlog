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
  if (placement === '예선탈락' || placement === '예탈') {
    return { bg: 'bg-green-50', content: '🌱' }
  }
  return { bg: 'bg-violet-100', content: placement }
}

export default function MedalBadge({ placement }: Props) {
  const { bg, content } = getStyle(placement)
  const isEmoji = /\p{Emoji}/u.test(content)

  return (
    <div
      aria-label={placement}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg} ${
        isEmoji ? 'text-xl' : 'text-xs font-bold text-violet-700'
      }`}
    >
      {content}
    </div>
  )
}
