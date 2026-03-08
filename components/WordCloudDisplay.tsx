'use client'

import { useMemo } from 'react'
import { WordCloudEntry } from '@/lib/supabase'

const COLORS = [
  'var(--theme-primary)',
  'var(--theme-primary-muted, var(--theme-primary-hover))',
  '#475569', // slate-600
  '#94a3b8', // slate-400
]

const SIZE_CLASSES = [
  'text-sm',    // 1 submission
  'text-base',
  'text-lg',
  'text-xl',
  'text-2xl',
  'text-3xl',
  'text-4xl',
  'text-5xl',  // max submissions
]

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export function WordCloudDisplay({ entries }: { entries: WordCloudEntry[] }) {
  const wordData = useMemo(() => {
    // Group by lowercase word
    const counts = new Map<string, number>()
    for (const entry of entries) {
      const w = entry.word.toLowerCase().trim()
      if (w) counts.set(w, (counts.get(w) || 0) + 1)
    }

    if (counts.size === 0) return []

    const maxCount = Math.max(...counts.values())
    const words = Array.from(counts.entries()).map(([word, count], i) => {
      // Map count to size index
      const sizeIndex =
        maxCount <= 1
          ? 0
          : Math.round(((count - 1) / (maxCount - 1)) * (SIZE_CLASSES.length - 1))
      // Deterministic pseudo-random values based on word content
      const seed = word.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
      const rotation = (seededRandom(seed) * 10 - 5) // -5 to 5 degrees
      const colorIndex = Math.floor(seededRandom(seed + 1) * COLORS.length)

      return {
        word,
        count,
        sizeClass: SIZE_CLASSES[sizeIndex],
        rotation,
        color: COLORS[colorIndex],
      }
    })

    // Shuffle for visual interest (deterministic based on entry count)
    const shuffled = [...words]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(i + entries.length) * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    return shuffled
  }, [entries])

  if (wordData.length === 0) {
    return (
      <div className="min-h-[200px] flex items-center justify-center text-slate-400 text-sm">
        Waiting for submissions...
      </div>
    )
  }

  return (
    <div className="min-h-[200px] flex flex-wrap items-center justify-center gap-3 px-4 py-6">
      {wordData.map((w) => (
        <span
          key={w.word}
          className={`${w.sizeClass} font-semibold leading-tight transition-all duration-500 ease-out`}
          style={{
            color: w.color,
            transform: `rotate(${w.rotation}deg)`,
          }}
          title={`${w.word} (${w.count})`}
        >
          {w.word}
        </span>
      ))}
    </div>
  )
}
