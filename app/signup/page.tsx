'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signUp } from '@/lib/auth'

type PasswordReqs = {
  minLength: boolean
  uppercase: boolean
  lowercase: boolean
  number: boolean
  special: boolean
}

function checkPassword(pw: string): PasswordReqs {
  return {
    minLength: pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[!@#$%^&*]/.test(pw),
  }
}

function passwordStrength(reqs: PasswordReqs): 0 | 1 | 2 | 3 {
  const met = Object.values(reqs).filter(Boolean).length
  if (met <= 1) return 0
  if (met <= 3) return 1
  if (met === 4) return 2
  return 3
}

function SignupPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const pwReqs = checkPassword(password)
  const pwStrength = passwordStrength(pwReqs)
  const allReqsMet = Object.values(pwReqs).every(Boolean)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password || !confirmPassword) return

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!allReqsMet) {
      const missing: string[] = []
      if (!pwReqs.minLength) missing.push('at least 8 characters')
      if (!pwReqs.uppercase) missing.push('an uppercase letter')
      if (!pwReqs.lowercase) missing.push('a lowercase letter')
      if (!pwReqs.number) missing.push('a number')
      if (!pwReqs.special) missing.push('a special character (!@#$%^&*)')
      setError(`Password must contain: ${missing.join(', ')}.`)
      return
    }

    setLoading(true)
    setError('')

    const { data, error: authError } = await signUp(email.trim(), password)

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // If email confirmation is required, Supabase returns a user but no session
    if (data.user && !data.session) {
      setSuccess(true)
      setLoading(false)
      return
    }

    // If auto-confirmed, redirect
    const redirect = searchParams.get('redirect') || '/'
    router.push(redirect)
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
          <p className="text-sm mt-2" style={{ color: 'var(--theme-dark-muted)' }}>Create your account to get started</p>
        </div>

        {/* Signup card */}
        <div className="rounded-2xl bg-white p-6 shadow-2xl space-y-5" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
          {success ? (
            <div className="text-center space-y-3 py-4">
              <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center" style={{ background: 'var(--theme-primary-light)' }}>
                <svg className="w-6 h-6" style={{ color: 'var(--theme-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="font-semibold text-slate-900 text-lg">Check your email</h2>
              <p className="text-sm text-slate-500">
                We sent a verification link to <span className="font-medium text-slate-700">{email}</span>. Click the link to activate your account.
              </p>
              <a
                href="/login"
                className="inline-block mt-2 text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color: 'var(--theme-primary)' }}
              >
                Back to sign in
              </a>
            </div>
          ) : (
            <>
              <div>
                <h2 className="font-semibold text-slate-900 text-lg">Create Account</h2>
                <p className="text-sm text-slate-500 mt-0.5">Start hosting Q&A sessions with Query.</p>
              </div>

              {error && (
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
                    onChange={(e) => { setPassword(e.target.value); setPasswordTouched(true) }}
                    placeholder="At least 8 characters"
                    required
                    className={inputClasses}
                  />
                  {/* Strength bar */}
                  {passwordTouched && password && (
                    <div className="space-y-2 mt-1">
                      <div className="flex gap-1">
                        {[0,1,2,3].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              i < pwStrength
                                ? pwStrength === 3 ? 'bg-emerald-500'
                                  : pwStrength === 2 ? 'bg-amber-500'
                                  : 'bg-red-400'
                                : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${pwStrength === 3 ? 'text-emerald-600' : pwStrength === 2 ? 'text-amber-600' : 'text-red-500'}`}>
                        {pwStrength === 3 ? 'Strong' : pwStrength === 2 ? 'Good' : pwStrength === 1 ? 'Weak' : 'Too weak'}
                      </p>
                      <ul className="space-y-1">
                        {[
                          { met: pwReqs.minLength, label: 'At least 8 characters' },
                          { met: pwReqs.uppercase, label: 'One uppercase letter (A-Z)' },
                          { met: pwReqs.lowercase, label: 'One lowercase letter (a-z)' },
                          { met: pwReqs.number, label: 'One number (0-9)' },
                          { met: pwReqs.special, label: 'One special character (!@#$%^&*)' },
                        ].map(({ met, label }) => (
                          <li key={label} className={`flex items-center gap-1.5 text-xs ${met ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {met ? (
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /></svg>
                            )}
                            {label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setConfirmTouched(true) }}
                    placeholder="Repeat your password"
                    required
                    className={inputClasses}
                  />
                  {confirmTouched && confirmPassword && (
                    password === confirmPassword ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs text-emerald-600">Passwords match</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-1">
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-xs text-red-600">Passwords don't match</span>
                      </div>
                    )
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password || !confirmPassword || password !== confirmPassword || !allReqsMet}
                  className="w-full py-3 px-4 bg-theme-primary text-white rounded-2xl font-medium text-sm hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading && (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Sign in link */}
        {!success && (
          <p className="text-center text-sm" style={{ color: 'var(--theme-dark-muted)' }}>
            Already have an account?{' '}
            <a href={`/login${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`} className="font-medium text-white underline underline-offset-2 hover:opacity-80 transition-opacity">
              Sign in
            </a>
          </p>
        )}
      </div>
    </main>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-theme-mesh-base" />}>
      <SignupPageInner />
    </Suspense>
  )
}
