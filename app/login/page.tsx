'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [noAccount, setNoAccount] = useState(false)
  const [loading, setLoading] = useState(false)

  const redirect = searchParams.get('redirect')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError('')
    setNoAccount(false)

    const { error: authError } = await signIn(email.trim(), password)

    if (authError) {
      if (authError.message === 'Invalid login credentials') {
        setNoAccount(true)
      } else {
        setError(authError.message)
      }
      setLoading(false)
      return
    }

    router.push(redirect || '/')
  }

  const inputClasses = 'w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent transition-colors'

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 bg-theme-mesh-base" />
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px]" style={{ background: 'var(--theme-mesh-1)' }} />
      <div className="absolute top-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full blur-[130px]" style={{ background: 'var(--theme-mesh-2)' }} />
      <div className="absolute bottom-[-15%] right-[-5%] w-[50%] h-[55%] rounded-full blur-[100px]" style={{ background: 'var(--theme-mesh-3)' }} />
      <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full blur-[110px]" style={{ background: 'var(--theme-mesh-4)' }} />
      <div className="absolute top-[25%] right-[10%] w-[40%] h-[40%] rounded-full blur-[90px]" style={{ background: 'var(--theme-mesh-6)' }} />
      <div className="absolute bottom-[15%] left-[10%] w-[35%] h-[40%] rounded-full blur-[110px]" style={{ background: 'var(--theme-mesh-6)' }} />
      <div className="absolute top-[5%] left-[30%] w-[35%] h-[35%] rounded-full blur-[80px]" style={{ background: 'var(--theme-mesh-7)' }} />
      <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full blur-[140px]" style={{ background: 'var(--theme-mesh-center)' }} />

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <a href="/" className="text-5xl font-bold tracking-tight text-white hover:opacity-80 transition-opacity">Query</a>
          <p className="text-sm mt-2" style={{ color: 'var(--theme-dark-muted)' }}>Sign in to manage your sessions</p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl bg-white p-6 shadow-2xl space-y-5" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
          <div>
            <h2 className="font-semibold text-slate-900 text-lg">Sign In</h2>
            <p className="text-sm text-slate-500 mt-0.5">Welcome back to Query.</p>
          </div>

          {noAccount && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              Looks like you don&apos;t have an account yet.{' '}
              <a href={`/signup${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="font-semibold text-theme-primary hover:text-theme-primary-hover underline">
                Sign up now
              </a>{' '}
              to get started.
            </div>
          )}

          {error && !noAccount && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={inputClasses}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                className={inputClasses}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full py-3 px-4 bg-theme-primary text-white rounded-2xl font-medium text-sm hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Sign up link */}
        <p className="text-center text-sm" style={{ color: 'var(--theme-dark-muted)' }}>
          Don&apos;t have an account?{' '}
          <a href={`/signup${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="font-medium text-white underline underline-offset-2 hover:opacity-80 transition-opacity">
            Sign up
          </a>
        </p>
      </div>
    </main>
  )
}
