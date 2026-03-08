'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function WordCloudCreate({
  sessionId,
  onCreated,
}: {
  sessionId: string
  onCreated: () => void
}) {
  const [prompt, setPrompt] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim() || submitting) return
    setSubmitting(true)

    // Deactivate any existing active word clouds for this session
    await supabase
      .from('word_clouds')
      .update({ is_active: false })
      .eq('session_id', sessionId)
      .eq('is_active', true)

    // Create the new word cloud
    await supabase.from('word_clouds').insert({
      session_id: sessionId,
      prompt: prompt.trim(),
      is_active: true,
    })

    setPrompt('')
    setSubmitting(false)
    onCreated()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Word Cloud Prompt
      </label>
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder='e.g. "Describe this session in one word"'
        maxLength={200}
        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent"
      />
      <button
        type="submit"
        disabled={submitting || !prompt.trim()}
        className="px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Starting...' : 'Start Word Cloud'}
      </button>
    </form>
  )
}
