'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const MIN_OPTIONS = 2
const MAX_OPTIONS = 5

export function PollCreate({
  sessionId,
  onCreated,
}: {
  sessionId: string
  onCreated: () => void
}) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)))
  }

  function addOption() {
    if (options.length < MAX_OPTIONS) {
      setOptions((prev) => [...prev, ''])
    }
  }

  function removeOption(index: number) {
    if (options.length > MIN_OPTIONS) {
      setOptions((prev) => prev.filter((_, i) => i !== index))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedQuestion = question.trim()
    const trimmedOptions = options.map((o) => o.trim()).filter((o) => o.length > 0)

    if (!trimmedQuestion) {
      setError('Please enter a question.')
      return
    }
    if (trimmedOptions.length < MIN_OPTIONS) {
      setError('Please provide at least 2 options.')
      return
    }

    setSubmitting(true)
    setError('')

    const votes: Record<string, number> = {}
    trimmedOptions.forEach((_, i) => {
      votes[String(i)] = 0
    })

    const { error: insertError } = await supabase.from('polls').insert({
      session_id: sessionId,
      question: trimmedQuestion,
      options: trimmedOptions,
      votes,
      allow_multiple: allowMultiple,
      is_active: true,
    })

    if (insertError) {
      setError('Failed to create poll. Please try again.')
      setSubmitting(false)
      return
    }

    setQuestion('')
    setOptions(['', ''])
    setAllowMultiple(false)
    setSubmitting(false)
    onCreated()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Create a Poll</h3>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">Question</label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What would you like to ask?"
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Options</label>
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent"
            />
            {options.length > MIN_OPTIONS && (
              <button
                type="button"
                onClick={() => removeOption(i)}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                title="Remove option"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
        {options.length < MAX_OPTIONS && (
          <button
            type="button"
            onClick={addOption}
            className="text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: 'var(--theme-primary)' }}
          >
            + Add option
          </button>
        )}
      </div>

      <div
        onClick={() => setAllowMultiple((prev) => !prev)}
        className="flex items-center justify-between cursor-pointer bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 hover:border-slate-200 transition-colors"
      >
        <div>
          <p className="text-sm font-medium text-slate-700">Allow multiple selections</p>
          <p className="text-xs text-slate-400 mt-0.5">Attendees can pick more than one option.</p>
        </div>
        <div className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ml-3 ${allowMultiple ? 'bg-theme-primary' : 'bg-slate-300'}`}>
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${allowMultiple ? 'translate-x-5' : ''}`} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 px-4 bg-theme-primary text-white rounded-lg font-medium text-sm hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {submitting && (
          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {submitting ? 'Creating...' : 'Create Poll'}
      </button>
    </form>
  )
}
