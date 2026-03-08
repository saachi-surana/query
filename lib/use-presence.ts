'use client'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function usePresence(sessionId: string | null, role: 'host' | 'attendee' = 'attendee') {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!sessionId) return

    const channel = supabase.channel(`presence:${sessionId}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        // Count unique users (each key in state is a user)
        const uniqueUsers = Object.keys(state).length
        setCount(uniqueUsers)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ role, joined_at: new Date().toISOString() })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [sessionId, role])

  return count
}
