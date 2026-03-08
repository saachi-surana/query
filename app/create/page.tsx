'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import { MeshHeader } from '@/components/MeshHeader'

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

  // Branding state
  const [brandColor, setBrandColor] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [defaultLogoUrl, setDefaultLogoUrl] = useState<string | null>(null)

  // Session context state
  const [contextFile, setContextFile] = useState<File | null>(null)
  const [contextFileName, setContextFileName] = useState<string | null>(null)
  const [contextParsedText, setContextParsedText] = useState<string | null>(null)
  const [contextParsing, setContextParsing] = useState(false)

  useEffect(() => {
    getUser().then((user) => {
      if (user) setUserId(user.id)
    })

    // Load default branding from settings
    const savedBrandColor = localStorage.getItem('query-default-brand-color')
    if (savedBrandColor) setBrandColor(savedBrandColor)

    const savedLogoUrl = localStorage.getItem('query-default-logo-url')
    if (savedLogoUrl) {
      setLogoPreview(savedLogoUrl)
      setDefaultLogoUrl(savedLogoUrl)
    }
  }, [])

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2MB.')
      return
    }
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    setLogoFile(null)
    setLogoPreview(null)
    setDefaultLogoUrl(null)
  }

  async function uploadLogo(): Promise<string | null> {
    // If no new file selected but we have a default logo URL from settings, use that
    if (!logoFile) return defaultLogoUrl || null
    setLogoUploading(true)
    try {
      const ext = logoFile.name.split('.').pop() || 'png'
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('logos')
        .upload(fileName, logoFile, { contentType: logoFile.type })
      if (uploadErr) {
        console.error('Logo upload error:', uploadErr)
        return null
      }
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName)
      return urlData.publicUrl
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleContextSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setContextFile(file)
    setContextFileName(file.name)
    setContextParsing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/parse-document', { method: 'POST', body: formData })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'Failed to parse document')
        setContextFile(null)
        setContextFileName(null)
        return
      }
      setContextParsedText(result.text)
      setContextFileName(result.fileName)
    } catch {
      setError('Failed to parse document.')
      setContextFile(null)
      setContextFileName(null)
    } finally {
      setContextParsing(false)
    }
  }

  function removeContext() {
    setContextFile(null)
    setContextFileName(null)
    setContextParsedText(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (recurrence !== 'none' && !startsAt) {
      setError('Start time is required for recurring sessions.')
      return
    }

    setLoading(true)
    setError('')

    // Upload logo if selected
    const uploadedLogoUrl = await uploadLogo()

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
          logo_url: uploadedLogoUrl || null,
          brand_color: brandColor.trim() || null,
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
          logo_url: uploadedLogoUrl || null,
          brand_color: brandColor.trim() || null,
          ...(userId ? { user_id: userId } : {}),
        })
      }
    }

    // Save session context if a document was uploaded
    if (contextParsedText && parentId) {
      try {
        await supabase.from('session_context').insert({
          session_id: parentId,
          content_type: 'document' as const,
          content_text: contextParsedText,
          file_name: contextFileName,
          source_url: null,
        })
      } catch {
        // Table may not exist yet — non-critical
        console.warn('Could not save session context — session_context table may not exist yet.')
      }
    }

    router.push(`/session/${parentCode}`)
  }

  const inputClasses = 'w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent transition-colors'

  return (
    <main className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <MeshHeader>
        <div className="relative flex items-baseline gap-3">
          <a href="/" className="text-2xl font-bold text-white hover:opacity-80 transition-opacity tracking-tight">Query</a>
          <span className="text-white/30 text-lg font-light select-none">/</span>
          <span className="text-lg font-medium" style={{ color: 'var(--theme-header-text-muted)' }}>Host a Session</span>
        </div>
      </MeshHeader>

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

          {/* Session Context (optional) */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Session Context <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <p className="text-xs text-slate-400">Upload a document (PDF, PPTX, DOCX, TXT, MD) to give AI more context for clustering and answer suggestions.</p>
            {contextFileName ? (
              <div className="flex items-center justify-between bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span className="text-sm text-slate-700 truncate">{contextFileName}</span>
                  {contextParsing && <span className="text-xs text-slate-400">Parsing...</span>}
                  {contextParsedText && <span className="text-xs text-emerald-600">Ready</span>}
                </div>
                <button type="button" onClick={removeContext} className="text-sm text-rose-500 hover:text-rose-700 transition-colors shrink-0 ml-2">Remove</button>
              </div>
            ) : (
              <label className={`flex items-center justify-center gap-2 w-full px-4 py-4 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors ${contextParsing ? 'opacity-50 pointer-events-none' : ''}`}>
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                <span className="text-sm text-slate-500">{contextParsing ? 'Parsing document...' : 'Upload document'}</span>
                <input type="file" accept=".pdf,.pptx,.docx,.txt,.md" onChange={handleContextSelect} className="hidden" disabled={contextParsing} />
              </label>
            )}
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

          {/* Branding (Optional) */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Branding <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <p className="text-xs text-slate-400">Add your logo and brand color. Appears on all session pages for attendees.</p>
            </div>

            {/* Logo upload */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Logo</p>
              {logoPreview ? (
                <div className="flex items-center gap-4">
                  <div className="relative rounded-xl border border-slate-200 bg-white p-3">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="object-contain"
                      style={{ maxHeight: '120px' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="text-sm text-rose-500 hover:text-rose-700 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 w-full px-4 py-4 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-sm text-slate-500">Upload logo (PNG, JPG, SVG &mdash; max 2MB)</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Brand color picker */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Brand Color</p>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { name: 'orange', hex: '#F97316' },
                  { name: 'purple', hex: '#8B5CF6' },
                  { name: 'blue', hex: '#3B82F6' },
                  { name: 'green', hex: '#22C55E' },
                  { name: 'red', hex: '#EF4444' },
                  { name: 'teal', hex: '#14B8A6' },
                  { name: 'pink', hex: '#EC4899' },
                  { name: 'indigo', hex: '#6366F1' },
                ].map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setBrandColor(brandColor === c.hex ? '' : c.hex)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      brandColor === c.hex ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#hexcode"
                  maxLength={7}
                  className="w-32 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent transition-colors font-mono"
                />
                {brandColor && /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(brandColor) && (
                  <div
                    className="w-8 h-8 rounded-lg border border-slate-200 shrink-0"
                    style={{ backgroundColor: brandColor.startsWith('#') ? brandColor : `#${brandColor}` }}
                  />
                )}
                {brandColor && (
                  <button
                    type="button"
                    onClick={() => setBrandColor('')}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
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
