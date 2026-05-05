'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Question {
  id: string
  text: string
  status: 'pending' | 'answered'
  clusterId: string | null
}

interface Cluster {
  id: string
  title: string
  summary: string
  questionIds: string[]
  answered: boolean
}

const INITIAL_QUESTIONS: Question[] = [
  { id: 'q1', text: 'What is the base salary for new grads?', status: 'pending', clusterId: 'c1' },
  { id: 'q2', text: 'Are there stock options or equity?', status: 'pending', clusterId: 'c1' },
  { id: 'q3', text: 'What does the bonus structure look like?', status: 'pending', clusterId: 'c1' },
  { id: 'q4', text: 'How many interview rounds are there?', status: 'pending', clusterId: 'c2' },
  { id: 'q5', text: 'How long until I hear back after finals?', status: 'pending', clusterId: 'c2' },
  { id: 'q6', text: 'Is remote work available?', status: 'pending', clusterId: 'c3' },
  { id: 'q7', text: 'What is the team culture like?', status: 'pending', clusterId: 'c3' },
  { id: 'q8', text: 'How much ownership do junior engineers get?', status: 'pending', clusterId: 'c3' },
]

const INITIAL_CLUSTERS: Cluster[] = [
  {
    id: 'c1',
    title: 'Compensation',
    summary: 'What is the total compensation and salary range for new grad engineers?',
    questionIds: ['q1', 'q2', 'q3'],
    answered: false,
  },
  {
    id: 'c2',
    title: 'Interview Process',
    summary: 'What does the end-to-end interview process look like and how long does it take?',
    questionIds: ['q4', 'q5'],
    answered: false,
  },
  {
    id: 'c3',
    title: 'Culture & Team',
    summary: 'How collaborative and flexible is the day-to-day work environment?',
    questionIds: ['q6', 'q7', 'q8'],
    answered: false,
  },
]

function classifyQuestion(text: string): string {
  const lower = text.toLowerCase()
  if (/salary|pay|compensation|equity|bonus|stock/.test(lower)) return 'c1'
  if (/interview|process|round|hear back|hiring|recruiter/.test(lower)) return 'c2'
  if (/culture|remote|team|ownership|work|environment|collaborate/.test(lower)) return 'c3'
  return 'other'
}

export default function DemoPage() {
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS)
  const [clusters, setClusters] = useState<Cluster[]>(INITIAL_CLUSTERS)
  const [inputValue, setInputValue] = useState('')
  const [clustering, setClustering] = useState(false)
  const [nextId, setNextId] = useState(100)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = inputValue.trim()
    if (!text || clustering) return

    const newId = `q${nextId}`
    setNextId(n => n + 1)
    setInputValue('')

    const pendingQuestion: Question = { id: newId, text, status: 'pending', clusterId: null }
    setQuestions(prev => [...prev, pendingQuestion])
    setClustering(true)

    setTimeout(() => {
      const targetClusterId = classifyQuestion(text)

      setQuestions(prev =>
        prev.map(q => (q.id === newId ? { ...q, clusterId: targetClusterId } : q))
      )

      setClusters(prev => {
        const existing = prev.find(c => c.id === targetClusterId)
        if (existing) {
          return prev.map(c =>
            c.id === targetClusterId
              ? { ...c, questionIds: [...c.questionIds, newId] }
              : c
          )
        }
        return [
          ...prev,
          {
            id: 'other',
            title: 'Other Questions',
            summary: 'Additional questions from the audience.',
            questionIds: [newId],
            answered: false,
          },
        ]
      })

      setClustering(false)
    }, 1500)
  }

  function markAnswered(clusterId: string) {
    setClusters(prev =>
      prev.map(c => (c.id === clusterId ? { ...c, answered: true } : c))
    )
    const cluster = clusters.find(c => c.id === clusterId)
    if (!cluster) return
    setQuestions(prev =>
      prev.map(q =>
        cluster.questionIds.includes(q.id) ? { ...q, status: 'answered' } : q
      )
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Banner */}
      <div
        className="w-full py-3 px-6 flex items-center justify-between"
        style={{ background: 'var(--theme-mesh-base)' }}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            LIVE DEMO
          </span>
          <span className="text-white font-semibold text-sm tracking-wide">
            Query — Smart Q&amp;A Platform
          </span>
        </div>
        <Link
          href="/"
          className="text-white/80 hover:text-white text-sm transition-colors flex items-center gap-1"
        >
          ← Back to Home
        </Link>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-2 gap-0 border-b border-slate-200">
        <div className="px-8 py-4 border-r border-slate-200 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-400" />
          <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
            Attendee View
          </span>
        </div>
        <div className="px-8 py-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
            Moderator View
          </span>
          <span className="ml-auto text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            AI Clustering On
          </span>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
        {/* LEFT — Attendee View */}
        <div className="border-r border-slate-200 flex flex-col p-8 overflow-y-auto">
          <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Type your question..."
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent bg-white"
              style={{ '--tw-ring-color': 'var(--theme-primary)' } as React.CSSProperties}
              disabled={clustering}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || clustering}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--theme-primary)' }}
              onMouseEnter={e => {
                if (!e.currentTarget.disabled)
                  e.currentTarget.style.background = 'var(--theme-primary-hover)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--theme-primary)'
              }}
            >
              Submit
            </button>
          </form>

          {clustering && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              AI is clustering...
            </div>
          )}

          <div className="space-y-2">
            {questions.map(q => (
              <div
                key={q.id}
                className="flex items-start justify-between gap-3 px-4 py-3 rounded-lg border transition-all"
                style={{
                  background: q.status === 'answered' ? '#F0FDF4' : '#ffffff',
                  borderColor: q.status === 'answered' ? '#BBF7D0' : '#E2E8F0',
                }}
              >
                <span
                  className="text-sm leading-snug"
                  style={{ color: q.status === 'answered' ? '#166534' : '#334155' }}
                >
                  {q.text}
                </span>
                {q.status === 'answered' ? (
                  <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Answered
                  </span>
                ) : (
                  <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                    Pending
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Moderator View */}
        <div className="flex flex-col p-8 overflow-y-auto gap-4">
          {clusters.map(cluster => {
            const clusterQuestions = questions.filter(q => cluster.questionIds.includes(q.id))
            return (
              <div
                key={cluster.id}
                className="rounded-xl border overflow-hidden transition-all"
                style={{
                  borderColor: cluster.answered ? '#BBF7D0' : '#E2E8F0',
                  background: cluster.answered ? '#F0FDF4' : '#ffffff',
                  opacity: cluster.answered ? 0.75 : 1,
                }}
              >
                {/* Cluster header */}
                <div
                  className="flex items-center justify-between px-5 py-3 border-b"
                  style={{ borderColor: cluster.answered ? '#BBF7D0' : '#E2E8F0' }}
                >
                  <div className="flex items-center gap-2">
                    {cluster.answered && (
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <span
                      className="font-semibold text-sm"
                      style={{ color: cluster.answered ? '#166534' : '#0F172A' }}
                    >
                      {cluster.title}
                    </span>
                    <span className="text-xs text-slate-400">
                      {clusterQuestions.length} question{clusterQuestions.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {!cluster.answered && (
                    <button
                      onClick={() => markAnswered(cluster.id)}
                      className="text-xs font-medium px-3 py-1 rounded-full border transition-colors text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                    >
                      Mark Answered
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {/* AI Summary */}
                  <div
                    className="rounded-lg p-3 border"
                    style={{
                      background: cluster.answered ? '#DCFCE7' : 'var(--theme-primary-subtle)',
                      borderColor: cluster.answered ? '#BBF7D0' : 'var(--theme-primary-light)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <svg className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-xs font-semibold" style={{ color: 'var(--theme-primary)' }}>
                        AI Summary
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-snug">{cluster.summary}</p>
                  </div>

                  {/* Individual questions */}
                  <div className="space-y-1.5">
                    {clusterQuestions.map(q => (
                      <div
                        key={q.id}
                        className="flex items-start gap-2 px-3 py-2 rounded-lg text-sm"
                        style={{
                          background: cluster.answered ? 'transparent' : '#F8FAFC',
                          color: '#475569',
                        }}
                      >
                        <span className="mt-1 w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                        {q.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
