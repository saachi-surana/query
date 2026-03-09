'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'

type FloatingReaction = {
  id: string
  emoji: string
  x: number
}

export type { FloatingReaction }

export function useReactions(sessionId: string | null) {
  const [reactions, setReactions] = useState<FloatingReaction[]>([])
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!sessionId) return

    const channel = supabase.channel(`reactions:${sessionId}`)
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const emoji = payload?.emoji as string
        if (!emoji) return
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
        const x = 10 + Math.random() * 80
        setReactions(prev => {
          const updated = [...prev, { id, emoji, x }]
          return updated.slice(-25) // Keep max 25 on screen
        })
        setTimeout(() => {
          setReactions(prev => prev.filter(r => r.id !== id))
        }, 3000)
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [sessionId])

  const sendReaction = useCallback((emoji: string) => {
    if (!channelRef.current) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'reaction',
      payload: { emoji },
    })
  }, [])

  return { reactions, sendReaction }
}
