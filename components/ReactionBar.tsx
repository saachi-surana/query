'use client'
import { useState, useRef } from 'react'

const REACTIONS = [
  { emoji: '\u2764\uFE0F', label: 'Heart' },
  { emoji: '\uD83D\uDC4F', label: 'Clap' },
  { emoji: '\uD83E\uDD2F', label: 'Mind blown' },
  { emoji: '\uD83D\uDC4D', label: 'Thumbs up' },
  { emoji: '\uD83D\uDD25', label: 'Fire' },
  { emoji: '\uD83D\uDE02', label: 'Laugh' },
]

export function ReactionBar({ onReact }: { onReact: (emoji: string) => void }) {
  const [cooldown, setCooldown] = useState(false)
  const lastReactRef = useRef(0)

  function handleReact(emoji: string) {
    const now = Date.now()
    if (now - lastReactRef.current < 1000) return // Rate limit: 1 per second
    lastReactRef.current = now
    setCooldown(true)
    setTimeout(() => setCooldown(false), 500)
    onReact(emoji)
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-slate-200 shadow-sm">
      {REACTIONS.map(({ emoji, label }) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          disabled={cooldown}
          className={`text-xl hover:scale-125 active:scale-90 transition-transform ${cooldown ? 'opacity-50' : ''}`}
          title={label}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
