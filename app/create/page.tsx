'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (recurrence !== 'none' && !startsAt) {
      setError('Start time is required for recurring sessions.')
      return
    }

    setLoading(true)
    setError('')

    // Create the first (parent) session
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

    // Create recurring instances
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
        })
      }
    }

    router.push(`/session/${parentCode}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="space-y-1">
          <a href="/" className="text-2xl font-bold text-gray-900 hover:opacity-80 transition-opacity">
            Query
          </a>
          <h2 className="text-2xl font-semibold text-gray-900 pt-2">Host a Session</h2>
          <p className="text-sm text-gray-500">Set up your live Q&amp;A session.</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Session Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Spring Recruiting AMA"
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Q&A session for incoming engineering interns about compensation and culture"
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-400">Used by AI to better group questions into topics.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="starts_at" className="block text-sm font-medium text-gray-700">
              Start Time <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="starts_at"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400">Set a future start time to collect questions before the session begins.</p>
          </div>

          {/* Recurrence */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Recurrence <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(['none', 'weekly', 'biweekly', 'monthly', 'custom'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setRecurrence(opt)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    recurrence === opt
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt === 'none' ? 'One-time' : opt === 'biweekly' ? 'Every 2 weeks' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>

            {recurrence !== 'none' && !startsAt && (
              <p className="text-xs text-amber-600">Set a start time above for recurring sessions.</p>
            )}

            {recurrence !== 'none' && startsAt && recurrence !== 'custom' && (
              <p className="text-xs text-gray-500">
                This will create {recurrence === 'monthly' ? '6' : '12'} future sessions ({recurrence === 'biweekly' ? 'every 2 weeks' : recurrence}).
              </p>
            )}

            {recurrence === 'custom' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={customDateInput}
                    onChange={(e) => setCustomDateInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customDateInput) {
                        setCustomDates((prev) => [...prev, new Date(customDateInput).toISOString()])
                        setCustomDateInput('')
                      }
                    }}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {customDates.length > 0 && (
                  <div className="space-y-1">
                    {customDates.map((d, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-sm">
                        <span className="text-gray-700">
                          {new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCustomDates((prev) => prev.filter((_, j) => j !== i))}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <p className="text-xs text-gray-500">{customDates.length} additional session{customDates.length !== 1 ? 's' : ''} will be created.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSuggest}
              onChange={(e) => setAutoSuggest(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">AI Auto-Suggest Answers</span>
              <p className="text-xs text-gray-400">AI will automatically draft suggested answers for each question.</p>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? 'Creating…' : recurrence !== 'none' ? 'Create Recurring Sessions' : 'Create Session'}
          </button>
        </form>
      </div>
    </main>
  )
}
