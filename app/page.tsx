'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

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
    <main className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4">
      {/* Mesh gradient background — colors from CSS variables */}
      <div className="absolute inset-0 bg-theme-mesh-base" />
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px]" style={{ background: 'var(--theme-mesh-1)' }} />
      <div className="absolute top-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full blur-[130px]" style={{ background: 'var(--theme-mesh-2)' }} />
      <div className="absolute bottom-[-15%] right-[-5%] w-[50%] h-[55%] rounded-full blur-[100px]" style={{ background: 'var(--theme-mesh-3)' }} />
      <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full blur-[110px]" style={{ background: 'var(--theme-mesh-4)' }} />
      <div className="absolute top-[25%] right-[10%] w-[40%] h-[40%] rounded-full blur-[90px]" style={{ background: 'var(--theme-mesh-6)' }} />
      <div className="absolute bottom-[15%] left-[10%] w-[35%] h-[40%] rounded-full blur-[110px]" style={{ background: 'var(--theme-mesh-6)' }} />
      <div className="absolute top-[5%] left-[30%] w-[35%] h-[35%] rounded-full blur-[80px]" style={{ background: 'var(--theme-mesh-7)' }} />
      {/* Center brightness — eliminates dark cross */}
      <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full blur-[140px]" style={{ background: 'var(--theme-mesh-center)' }} />

      <div className="relative z-10 w-full max-w-md space-y-10">
        {/* Logo + tagline */}
        <div className="text-center space-y-3">
          <h1 className="text-6xl font-bold tracking-tight text-white">Query</h1>
          <p className="text-lg" style={{ color: 'var(--theme-dark-subheading)' }}>Smarter Q&amp;A for live events</p>
          <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--theme-dark-muted)' }}>
            AI-powered question clustering. Your audience asks, we organize, you answer what matters most.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-2xl bg-rose-500/15 border border-rose-400/20 px-4 py-3 text-sm text-rose-200 text-center backdrop-blur-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          {/* Host */}
          <div className="rounded-2xl bg-white p-6 space-y-4 shadow-2xl" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            {user ? (
              <>
                <div>
                  <h2 className="font-semibold text-slate-900 text-lg">Welcome back</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Manage your sessions and analytics.</p>
                </div>
                <button
                  onClick={() => router.push('/analytics')}
                  className="w-full py-3 px-4 bg-theme-primary text-white rounded-xl font-medium hover:bg-theme-primary-hover transition-colors shadow-lg"
                >
                  My Dashboard
                </button>
                <a href="/create" className="block text-center text-sm text-theme-primary hover:text-theme-primary-hover font-medium transition-colors">
                  + Create New Session
                </a>
              </>
            ) : (
              <>
                <div>
                  <h2 className="font-semibold text-slate-900 text-lg">Host a Session</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Create a live Q&amp;A with AI topic clustering.</p>
                </div>
                <button
                  onClick={() => router.push('/create')}
                  className="w-full py-3 px-4 bg-theme-primary text-white rounded-xl font-medium hover:bg-theme-primary-hover transition-colors shadow-lg"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--theme-dark-accent)' }}>
            <div className="flex-1 h-px" style={{ background: 'var(--theme-dark-divider)' }} />
            or join an existing session
            <div className="flex-1 h-px" style={{ background: 'var(--theme-dark-divider)' }} />
          </div>

          {/* Join */}
          <div className="rounded-2xl bg-white p-6 space-y-4 shadow-2xl" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            <div>
              <h2 className="font-semibold text-slate-900 text-lg">Join a Session</h2>
              <p className="text-sm text-slate-500 mt-0.5">Enter the 6-character code from your host.</p>
            </div>
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
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase tracking-widest text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={joining}
                className="px-6 py-3 bg-theme-primary text-white rounded-xl font-semibold text-sm hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {joining ? 'Joining...' : 'Join'}
              </button>
            </form>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', title: 'AI Clustering', desc: 'Questions grouped by topic' },
            { icon: 'M13 10V3L4 14h7v7l9-11h-7z', title: 'Real-time', desc: 'Live updates everywhere' },
            { icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Free', desc: 'No limits, no paywall' },
          ].map((f) => (
            <div key={f.title} className="space-y-1.5">
              <div className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center" style={{ background: 'var(--theme-mesh-5)' }}>
                <svg className="w-4 h-4" style={{ color: 'var(--theme-dark-subheading)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} /></svg>
              </div>
              <p className="text-sm font-semibold text-white">{f.title}</p>
              <p className="text-xs" style={{ color: 'var(--theme-dark-muted)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
