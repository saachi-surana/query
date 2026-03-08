'use client'

import { useState, useEffect } from 'react'
import { supabase, WordCloud } from '@/lib/supabase'
import { getDeviceId } from '@/lib/device-id'

const MAX_SUBMISSIONS = 3
const MAX_WORD_LENGTH = 30

export function WordCloudSubmit({
  wordCloud,
  onSubmitted,
}: {
  wordCloud: WordCloud
  onSubmitted: () => void
}) {
  const [word, setWord] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submissionCount, setSubmissionCount] = useState(0)

  useEffect(() => {
    const key = `query-wc-submissions-${wordCloud.id}`
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        setSubmissionCount(JSON.parse(saved))
      } catch {
        /* ignore */
      }
    }
  }, [wordCloud.id])

  const canSubmit = submissionCount < MAX_SUBMISSIONS

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!word.trim() || submitting || !canSubmit) return
    setSubmitting(true)

    const deviceId = getDeviceId()
    await supabase.from('word_cloud_entries').insert({
      word_cloud_id: wordCloud.id,
      word: word.trim().toLowerCase(),
      device_id: deviceId,
    })

    const newCount = submissionCount + 1
    setSubmissionCount(newCount)
    localStorage.setItem(
      `query-wc-submissions-${wordCloud.id}`,
      JSON.stringify(newCount)
    )
    setWord('')
    setSubmitting(false)
    onSubmitted()
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-sm font-medium text-slate-900">{wordCloud.prompt}</p>
        {canSubmit ? (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={word}
              onChange={(e) => {
                if (e.target.value.length <= MAX_WORD_LENGTH) {
                  setWord(e.target.value)
                }
              }}
              placeholder="Type a word or short phrase..."
              maxLength={MAX_WORD_LENGTH}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent"
            />
            <button
              type="submit"
              disabled={submitting || !word.trim()}
              className="px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '...' : 'Submit'}
            </button>
          </form>
        ) : (
          <p className="text-sm text-slate-500">
            You have used all {MAX_SUBMISSIONS} submissions for this word cloud.
          </p>
        )}
        <p className="text-xs text-slate-400">
          {submissionCount}/{MAX_SUBMISSIONS} submissions used
        </p>
      </div>
    </div>
  )
}
