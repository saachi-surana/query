'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (!code || code.length !== 6) {
      setError('Please enter a 6-character code.')
      return
    }
    setJoining(true)
    setError('')

    const { data } = await supabase
      .from('sessions')
      .select('id')
      .eq('code', code)
      .single()

    if (!data) {
      setError('Session not found. Check your code and try again.')
      setJoining(false)
      return
    }

    router.push(`/join/${code}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-10">
        {/* Logo + tagline */}
        <div className="text-center space-y-3">
          <h1 className="text-6xl font-bold tracking-tight text-gray-900">Query</h1>
          <p className="text-lg text-gray-500">Smarter Q&amp;A for live events</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            AI-powered question clustering. Your audience asks, we organize, you answer what matters most.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          {/* Host */}
          <div className="rounded-xl border border-gray-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Host a Session</h2>
            <p className="text-sm text-gray-500">Create a live Q&amp;A with AI topic clustering. Free, no account needed.</p>
            <button
              onClick={() => router.push('/create')}
              className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Host a Session
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 text-gray-400 text-sm">
            <div className="flex-1 h-px bg-gray-200" />
            or
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Join */}
          <div className="rounded-xl border border-gray-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Join a Session</h2>
            <p className="text-sm text-gray-500">Enter the 6-character code from your host.</p>
            <form onSubmit={handleJoin} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase())
                  setError('')
                }}
                placeholder="ABC123"
                maxLength={6}
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={joining}
                className="px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {joining ? 'Joining...' : 'Join'}
              </button>
            </form>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="space-y-1">
            <p className="text-lg font-semibold text-gray-900">AI Clustering</p>
            <p className="text-xs text-gray-400">Similar questions grouped automatically</p>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-gray-900">Real-time</p>
            <p className="text-xs text-gray-400">Questions and upvotes update live</p>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-gray-900">Free</p>
            <p className="text-xs text-gray-400">No account, no paywall, no limits</p>
          </div>
        </div>
      </div>
    </main>
  )
}
