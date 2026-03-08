'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function generateRecurringDates(startsAt: string, type: string, customDates: string[]): string[] {
  if (type === 'custom') return customDates
  const start = new Date(startsAt)
  const dates: string[] = []
  const intervalDays = type === 'weekly' ? 7 : type === 'biweekly' ? 14 : 30
  const count = type === 'monthly' ? 6 : 12
  for (let i = 1; i <= count; i++) {
    dates.push(addDays(start, intervalDays * i).toISOString())
  }
  return dates
}

export default function CreatePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [autoSuggest, setAutoSuggest] = useState(false)
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'biweekly' | 'monthly' | 'custom'>('none')
  const [customDates, setCustomDates] = useState<string[]>([])
  const [customDateInput, setCustomDateInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    getUser().then((user) => {
      if (user) setUserId(user.id)
    })
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (recurrence !== 'none' && !startsAt) {
      setError('Start time is required for recurring sessions.')
      return
    }

    setLoading(true)
    setError('')

    let parentCode: string | null = null
    let parentId: string | null = null

    for (let attempt = 0; attempt < 3; attempt++) {
      const code = generateCode()
      const { data, error: dbErr } = await supabase
        .from('sessions')
        .insert({
          code,
          title: title.trim(),
          description: description.trim() || null,
          starts_at: startsAt || null,
          auto_suggest: autoSuggest,
          recurrence_type: recurrence === 'none' ? null : recurrence,
          recurrence_dates: recurrence !== 'none'
            ? generateRecurringDates(startsAt, recurrence, customDates)
            : null,
          ...(userId ? { user_id: userId } : {}),
        })
        .select('id, code')
        .single()

      if (dbErr) {
        if (dbErr.code === '23505') continue
        setError('Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      if (data) {
        parentCode = data.code
        parentId = data.id
        break
      }
    }

    if (!parentCode || !parentId) {
      setError('Could not generate a unique session code. Please try again.')
      setLoading(false)
      return
    }

    if (recurrence !== 'none') {
      const futureDates = generateRecurringDates(startsAt, recurrence, customDates)
      for (const date of futureDates) {
        const code = generateCode()
        await supabase.from('sessions').insert({
          code,
          title: title.trim(),
          description: description.trim() || null,
          starts_at: date,
          auto_suggest: autoSuggest,
          recurrence_type: recurrence,
          recurrence_parent_id: parentId,
          ...(userId ? { user_id: userId } : {}),
        })
      }
    }

    router.push(`/session/${parentCode}`)
  }

  const inputClasses = 'w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent transition-colors'

  return (
    <main className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="relative overflow-hidden px-4 sm:px-6 py-3 shrink-0 z-20">
        <div className="absolute inset-0 bg-theme-mesh-base" />
        <div className="absolute top-[-80%] left-[-10%] w-[40%] h-[300%] rounded-full blur-[60px]" style={{ background: 'var(--theme-mesh-1)' }} />
        <div className="absolute top-[-80%] left-[25%] w-[35%] h-[300%] rounded-full blur-[60px]" style={{ background: 'var(--theme-mesh-2)' }} />
        <div className="absolute top-[-80%] right-[10%] w-[30%] h-[300%] rounded-full blur-[60px]" style={{ background: 'var(--theme-mesh-5)' }} />
        <div className="absolute top-[-80%] right-[-10%] w-[25%] h-[300%] rounded-full blur-[40px]" style={{ background: 'var(--theme-mesh-base)' }} />
        <div className="relative flex items-baseline gap-3">
          <a href="/" className="text-2xl font-bold text-white hover:opacity-80 transition-opacity tracking-tight">Query</a>
          <span className="text-white/30 text-lg font-light select-none">/</span>
          <span className="text-lg font-medium" style={{ color: 'var(--theme-header-text-muted)' }}>Host a Session</span>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-slate-900">Host a Session</h2>
            <p className="text-sm text-slate-500">Set up your live Q&amp;A session.</p>
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-6">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="title" className="block text-sm font-medium text-slate-700">
              Session Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Spring Recruiting AMA"
              required
              className={inputClasses}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-sm font-medium text-slate-700">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Q&A session for incoming engineering interns"
              rows={3}
              className={`${inputClasses} resize-none`}
            />
            <p className="text-xs text-slate-400">Used by AI to better group questions into topics.</p>
          </div>

          {/* Date + Time split */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Start Date & Time <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="flex gap-3">
              <input
                type="date"
                value={startsAt ? startsAt.split('T')[0] : ''}
                onChange={(e) => {
                  const time = startsAt ? startsAt.split('T')[1] || '09:00' : '09:00'
                  setStartsAt(e.target.value ? `${e.target.value}T${time}` : '')
                }}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent transition-colors"
              />
              <input
                type="time"
                value={startsAt ? startsAt.split('T')[1]?.slice(0, 5) || '09:00' : ''}
                onChange={(e) => {
                  const date = startsAt ? startsAt.split('T')[0] : ''
                  if (date) setStartsAt(`${date}T${e.target.value}`)
                }}
                disabled={!startsAt}
                className="w-32 px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent disabled:opacity-40 transition-colors"
              />
            </div>
            <p className="text-xs text-slate-400">Collect questions before the session starts.</p>
          </div>

          {/* Recurrence */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Recurrence <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(['none', 'weekly', 'biweekly', 'monthly', 'custom'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setRecurrence(opt)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    recurrence === opt
                      ? 'bg-theme-primary text-white border-theme-primary shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-theme-primary-light hover:text-theme-primary'
                  }`}
                >
                  {opt === 'none' ? 'One-time' : opt === 'biweekly' ? 'Every 2 weeks' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>

            {recurrence !== 'none' && !startsAt && (
              <p className="text-xs text-amber-700 bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-100">
                Set a start date above for recurring sessions.
              </p>
            )}

            {recurrence !== 'none' && startsAt && recurrence !== 'custom' && (
              <p className="text-xs text-theme-primary-hover bg-theme-primary-subtle px-4 py-2.5 rounded-xl border border-theme-primary-light">
                This will create {recurrence === 'monthly' ? '6' : '12'} future sessions ({recurrence === 'biweekly' ? 'every 2 weeks' : recurrence}).
              </p>
            )}

            {recurrence === 'custom' && (
              <div className="space-y-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Add session dates</p>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={customDateInput ? customDateInput.split('T')[0] : ''}
                    onChange={(e) => setCustomDateInput(e.target.value ? `${e.target.value}T09:00` : '')}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customDateInput) {
                        setCustomDates((prev) => [...prev, new Date(customDateInput).toISOString()])
                        setCustomDateInput('')
                      }
                    }}
                    className="px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:bg-theme-primary-hover transition-colors"
                  >
                    Add
                  </button>
                </div>
                {customDates.length > 0 && (
                  <div className="space-y-1.5">
                    {customDates.map((d, i) => (
                      <div key={i} className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-4 py-2.5 text-sm">
                        <span className="text-slate-700">
                          {new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCustomDates((prev) => prev.filter((_, j) => j !== i))}
                          className="text-rose-400 hover:text-rose-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                    <p className="text-xs text-slate-500 text-center pt-1">{customDates.length} additional session{customDates.length !== 1 ? 's' : ''}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI toggle */}
          <div
            onClick={() => setAutoSuggest((v) => !v)}
            className="flex items-center justify-between cursor-pointer bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3.5 hover:border-slate-200 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-slate-700">AI Auto-Suggest Answers</p>
              <p className="text-xs text-slate-400 mt-0.5">Drafts answers for each question automatically.</p>
            </div>
            <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-3 ${autoSuggest ? 'bg-theme-primary' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoSuggest ? 'translate-x-5' : ''}`} />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full py-3 px-4 bg-theme-primary text-white rounded-2xl font-medium text-sm hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? 'Creating...' : recurrence !== 'none' ? 'Create Recurring Sessions' : 'Create Session'}
          </button>
        </form>
        </div>
      </div>
    </main>
  )
}
