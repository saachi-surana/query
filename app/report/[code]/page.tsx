'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { jsPDF } from 'jspdf'
import { supabase, Session, Question, Cluster, Reply, FaqEntry, ClusterWithQuestions } from '@/lib/supabase'
import { MeshHeader } from '@/components/MeshHeader'
import { Sidebar } from '@/components/Sidebar'

export default function ReportPage() {
  const params = useParams()
  const code = (params.code as string).toUpperCase()

  const [session, setSession] = useState<Session | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [replies, setReplies] = useState<Reply[]>([])
  const [faqs, setFaqs] = useState<FaqEntry[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [allSessions, setAllSessions] = useState<Session[]>([])

  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 768)
  }, [])
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const [{ data }, { data: ss }] = await Promise.all([
        supabase.from('sessions').select('*').eq('code', code).single(),
        supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(50),
      ])
      if (!data) { setNotFound(true); return }
      setSession(data)
      setAllSessions(ss || [])

      const [{ data: qs }, { data: cs }, { data: rs }, { data: fs }] = await Promise.all([
        supabase.from('questions').select('*').eq('session_id', data.id).eq('approved', true).order('upvotes', { ascending: false }),
        supabase.from('clusters').select('*').eq('session_id', data.id).order('created_at', { ascending: true }),
        supabase.from('replies').select('*').eq('session_id', data.id).order('created_at', { ascending: true }),
        supabase.from('faq_entries').select('*').eq('session_id', data.id).order('created_at', { ascending: true }),
      ])
      setQuestions(qs || [])
      setClusters(cs || [])
      setReplies(rs || [])
      setFaqs(fs || [])
    }
    load()
  }, [code])

  if (notFound) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Session not found</p>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="h-screen flex flex-col bg-slate-50 overflow-hidden">
        <div className="relative overflow-hidden px-4 sm:px-6 py-3 shrink-0 z-20 bg-slate-200 animate-pulse h-12" />
        <div className="flex-1 p-6 max-w-3xl mx-auto w-full space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 animate-pulse">
                <div className="h-8 bg-slate-200 rounded w-12 mx-auto" />
                <div className="h-3 bg-slate-100 rounded w-16 mx-auto" />
              </div>
            ))}
          </div>
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-2/3" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      </main>
    )
  }

  const answeredQuestions = questions.filter((q) => q.status === 'answered')
  const unansweredQuestions = questions.filter((q) => q.status !== 'answered')
  const totalUpvotes = questions.reduce((s, q) => s + q.upvotes, 0)

  function exportCSV() {
    const escapeCSV = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val
    }

    const header = ['Question', 'Author', 'Upvotes', 'Status', 'Cluster', 'Replies']
    const rows = questions.map((q) => {
      const cluster = clusters.find((c) => c.id === q.cluster_id)
      const questionReplies = replies
        .filter((r) => r.question_id === q.id)
        .map((r) => `${r.is_host ? '[Host]' : '[Attendee]'} ${r.author_name || 'Anonymous'}: ${r.text}`)
        .join(' | ')
      return [
        escapeCSV(q.text),
        escapeCSV(q.is_anonymous ? 'Anonymous' : q.author_name || 'Anonymous'),
        String(q.upvotes),
        q.status,
        escapeCSV(cluster?.title || 'Uncategorized'),
        escapeCSV(questionReplies || ''),
      ].join(',')
    })

    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `query-${code}-export.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function exportPDF() {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const maxWidth = pageWidth - margin * 2
    let y = 20

    function checkPageBreak(needed: number) {
      if (y + needed > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage()
        y = 20
      }
    }

    // Title
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(session!.title, margin, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text(`Session Code: ${code}`, margin, y)
    y += 5
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y)
    y += 10

    // Stats
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Summary', margin, y)
    y += 7

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const stats = [
      `Total Questions: ${questions.length}`,
      `Answered: ${answeredQuestions.length}`,
      `Unanswered: ${unansweredQuestions.length}`,
      `Total Upvotes: ${totalUpvotes}`,
    ]
    stats.forEach((stat) => {
      doc.text(stat, margin, y)
      y += 5
    })
    y += 8

    // Helper to render a cluster section
    function renderClusterSection(title: string, clusterList: ClusterWithQuestions[], color: [number, number, number]) {
      if (clusterList.length === 0) return

      checkPageBreak(20)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...color)
      doc.text(title, margin, y)
      y += 8

      clusterList.forEach((c) => {
        checkPageBreak(25)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        const clusterTitle = `${c.title} (${c.questions.length} question${c.questions.length !== 1 ? 's' : ''})`
        doc.text(clusterTitle, margin, y)
        y += 6

        if (c.summary_question) {
          doc.setFontSize(9)
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(80, 80, 80)
          const summaryLines = doc.splitTextToSize(`AI Summary: ${c.summary_question}`, maxWidth)
          checkPageBreak(summaryLines.length * 4 + 4)
          doc.text(summaryLines, margin + 4, y)
          y += summaryLines.length * 4 + 2
        }

        c.questions.forEach((q) => {
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
          const author = q.is_anonymous ? 'Anonymous' : q.author_name || 'Anonymous'
          const prefix = `[${q.upvotes} votes] `
          const questionLines = doc.splitTextToSize(`${prefix}${q.text} — ${author}`, maxWidth - 8)
          checkPageBreak(questionLines.length * 4 + 4)
          doc.text(questionLines, margin + 8, y)
          y += questionLines.length * 4 + 2
        })

        y += 4
      })
    }

    renderClusterSection(
      `Unanswered Questions (${unansweredQuestions.length})`,
      unansweredClusters,
      [220, 38, 38]
    )

    // Unclustered unanswered
    if (unclusteredUnanswered.length > 0) {
      checkPageBreak(20)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(`Uncategorized (${unclusteredUnanswered.length})`, margin, y)
      y += 6

      unclusteredUnanswered.forEach((q) => {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        const questionLines = doc.splitTextToSize(`[${q.upvotes} votes] ${q.text}`, maxWidth - 8)
        checkPageBreak(questionLines.length * 4 + 4)
        doc.text(questionLines, margin + 8, y)
        y += questionLines.length * 4 + 2
      })
      y += 4
    }

    renderClusterSection(
      `Answered Topics (${answeredClusters.length})`,
      answeredClusters,
      [22, 163, 74]
    )

    // FAQ section
    if (faqs.length > 0) {
      checkPageBreak(20)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text(`FAQ Library (${faqs.length})`, margin, y)
      y += 8

      faqs.forEach((f) => {
        checkPageBreak(20)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(f.cluster_title, margin, y)
        y += 5

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        const qLines = doc.splitTextToSize(`Q: ${f.summary_question}`, maxWidth - 4)
        checkPageBreak(qLines.length * 4 + 4)
        doc.text(qLines, margin + 4, y)
        y += qLines.length * 4 + 2

        doc.setTextColor(60, 60, 60)
        const aLines = doc.splitTextToSize(`A: ${f.answer}`, maxWidth - 4)
        checkPageBreak(aLines.length * 4 + 4)
        doc.text(aLines, margin + 4, y)
        y += aLines.length * 4 + 4
        doc.setTextColor(0, 0, 0)
      })
    }

    doc.save(`query-${code}-report.pdf`)
  }

  const unansweredClusters: ClusterWithQuestions[] = clusters
    .filter((c) => c.status === 'unanswered')
    .map((c) => ({ ...c, questions: unansweredQuestions.filter((q) => q.cluster_id === c.id) }))
    .filter((c) => c.questions.length > 0)
    .sort((a, b) => b.questions.reduce((s, q) => s + q.upvotes, 0) - a.questions.reduce((s, q) => s + q.upvotes, 0))

  const answeredClusters: ClusterWithQuestions[] = clusters
    .filter((c) => c.status === 'answered')
    .map((c) => ({ ...c, questions: answeredQuestions.filter((q) => q.cluster_id === c.id) }))
    .filter((c) => c.questions.length > 0)

  const unclusteredUnanswered = unansweredQuestions.filter((q) => !q.cluster_id)

  return (
    <main className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <MeshHeader>
        <div className="relative flex items-baseline gap-3">
          <button onClick={() => setSidebarOpen((o) => !o)} className="self-center shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5" style={{ color: 'var(--theme-dark-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          {session.logo_url ? (
            <div className="shrink-0 rounded-lg bg-white/95 p-1.5 flex items-center justify-center self-center">
              <img src={session.logo_url} alt="Host logo" className="h-7 max-w-[100px] object-contain" decoding="async" />
            </div>
          ) : null}
          <a href="/" className="text-2xl font-bold text-white hover:opacity-80 transition-opacity tracking-tight">Query</a>
          <span className="text-white/30 text-lg font-light select-none">/</span>
          <a href="/analytics" className="text-lg font-medium hover:opacity-80 transition-opacity" style={{ color: 'var(--theme-header-text-muted)' }}>Analytics</a>
          <span className="text-white/30 text-lg font-light select-none">/</span>
          <span className="text-lg font-medium truncate" style={{ color: 'var(--theme-header-text)' }}>{session.title}</span>
        </div>
      </MeshHeader>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          allSessions={allSessions}
          currentCode={code}
          expandedSeries={expandedSeries}
          setExpandedSeries={setExpandedSeries}
          activePage="report"
        />

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-8">
            {/* Back button + description */}
            <div className="space-y-2">
              <a href="/analytics" className="inline-flex items-center gap-1.5 text-sm text-theme-primary hover:text-theme-primary-hover transition-colors font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back to Analytics
              </a>
              {session.description && <p className="text-sm text-slate-500">{session.description}</p>}
            </div>

            {/* Export buttons */}
            <div className="flex justify-end gap-2">
              <button
                onClick={exportPDF}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border"
                style={{
                  background: 'var(--theme-primary-subtle)',
                  color: 'var(--theme-primary-hover)',
                  borderColor: 'var(--theme-primary-light)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--theme-primary)'
                  e.currentTarget.style.color = '#ffffff'
                  e.currentTarget.style.borderColor = 'var(--theme-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--theme-primary-subtle)'
                  e.currentTarget.style.color = 'var(--theme-primary-hover)'
                  e.currentTarget.style.borderColor = 'var(--theme-primary-light)'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                Export PDF
              </button>
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border"
                style={{
                  background: 'var(--theme-primary-subtle)',
                  color: 'var(--theme-primary-hover)',
                  borderColor: 'var(--theme-primary-light)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--theme-primary)'
                  e.currentTarget.style.color = '#ffffff'
                  e.currentTarget.style.borderColor = 'var(--theme-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--theme-primary-subtle)'
                  e.currentTarget.style.color = 'var(--theme-primary-hover)'
                  e.currentTarget.style.borderColor = 'var(--theme-primary-light)'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export CSV
              </button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{questions.length}</p>
                <p className="text-xs text-slate-500">Total Questions</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{answeredQuestions.length}</p>
                <p className="text-xs text-slate-500">Answered</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-red-500">{unansweredQuestions.length}</p>
                <p className="text-xs text-slate-500">Unanswered</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-theme-primary">{totalUpvotes}</p>
                <p className="text-xs text-slate-500">Total Upvotes</p>
              </div>
            </div>

            {/* Unanswered questions */}
            {unansweredQuestions.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide">
                  Unanswered Questions ({unansweredQuestions.length})
                </h2>

                {unansweredClusters.map((c) => (
                  <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{c.title}</h3>
                      <span className="text-xs text-slate-400">{c.questions.length} question{c.questions.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="rounded-lg bg-theme-primary-subtle border border-theme-primary-light px-3 py-2">
                      <p className="text-xs font-semibold text-theme-primary">AI Summary</p>
                      <p className="text-sm" style={{ color: 'var(--theme-primary-hover)' }}>{c.summary_question}</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {c.questions.map((q) => (
                        <div key={q.id} className="py-2 flex items-start gap-3">
                          <span className="shrink-0 font-mono text-xs font-bold text-theme-primary bg-theme-primary-subtle px-2 py-0.5 rounded">
                            ▲ {q.upvotes}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-800">{q.text}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {q.is_anonymous ? 'Anonymous' : q.author_name || 'Anonymous'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {unclusteredUnanswered.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-slate-900">Uncategorized</h3>
                    <div className="divide-y divide-slate-100">
                      {unclusteredUnanswered.map((q) => (
                        <div key={q.id} className="py-2 flex items-start gap-3">
                          <span className="shrink-0 font-mono text-xs font-bold text-theme-primary bg-theme-primary-subtle px-2 py-0.5 rounded">
                            ▲ {q.upvotes}
                          </span>
                          <p className="text-sm text-slate-800">{q.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Answered clusters summary */}
            {answeredClusters.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-green-600 uppercase tracking-wide">
                  Answered Topics ({answeredClusters.length})
                </h2>
                {answeredClusters.map((c) => {
                  const clusterReplies = replies.filter((r) => r.is_host && c.questions.some((q) => q.id === r.question_id))
                  return (
                    <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        <h3 className="text-sm font-semibold text-slate-700">{c.title}</h3>
                        <span className="text-xs text-slate-400">{c.questions.length} question{c.questions.length !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-sm text-slate-600">{c.summary_question}</p>
                      {clusterReplies.length > 0 && (
                        <div className="ml-4 pl-3 border-l-2 border-green-200 space-y-1">
                          {clusterReplies.map((r) => (
                            <p key={r.id} className="text-sm text-slate-700">{r.text}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </section>
            )}

            {/* FAQ Library */}
            {faqs.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  FAQ Library ({faqs.length})
                </h2>
                {faqs.map((f) => (
                  <div key={f.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-slate-900">{f.cluster_title}</h3>
                    <p className="text-sm font-medium text-slate-700">{f.summary_question}</p>
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{f.answer}</p>
                  </div>
                ))}
              </section>
            )}

            {/* No unanswered */}
            {unansweredQuestions.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <p className="text-lg font-medium">All questions have been answered!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
