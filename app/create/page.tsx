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

export default function CreatePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    setError('')

    // Try up to 3 times in case of code collision
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = generateCode()
      const { data, error: dbErr } = await supabase
        .from('sessions')
        .insert({
          code,
          title: title.trim(),
          description: description.trim() || null,
          starts_at: startsAt || null,
        })
        .select('code')
        .single()

      if (dbErr) {
        // Unique violation on code — try again
        if (dbErr.code === '23505') continue
        setError('Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      if (data) {
        router.push(`/session/${data.code}`)
        return
      }
    }

    setError('Could not generate a unique session code. Please try again.')
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
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
              Description{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Q&A session for incoming engineering interns about compensation and culture"
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-400">
              Used by AI to better group questions into topics.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="starts_at" className="block text-sm font-medium text-gray-700">
              Start Time{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="starts_at"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400">
              Set a future start time to collect questions before the session begins.
            </p>
          </div>

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
            {loading ? 'Creating…' : 'Create Session'}
          </button>
        </form>
      </div>
    </main>
  )
}
