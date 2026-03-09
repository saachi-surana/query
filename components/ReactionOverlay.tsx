'use client'

type FloatingReaction = {
  id: string
  emoji: string
  x: number
}

export function ReactionOverlay({ reactions }: { reactions: FloatingReaction[] }) {
  if (reactions.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {reactions.map((r) => (
        <span
          key={r.id}
          className="absolute text-2xl"
          style={{
            left: `${r.x}%`,
            bottom: '0',
            animation: 'reactionFloat 3s ease-out forwards',
          }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  )
}
