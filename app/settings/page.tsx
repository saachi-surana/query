'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Session } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import { MeshHeader } from '@/components/MeshHeader'
import { Sidebar } from '@/components/Sidebar'

type ThemeName = 'orange' | 'purple' | 'blue'

const themes: Record<ThemeName, Record<string, string>> = {
  orange: {
    '--theme-primary': '#F97316',
    '--theme-primary-hover': '#EA580C',
    '--theme-primary-light': '#FFEDD5',
    '--theme-primary-subtle': '#FFF7ED',
    '--theme-primary-muted': '#FB923C',
    '--theme-mesh-base': '#9a3412',
    '--theme-mesh-1': 'rgba(251, 146, 60, 0.70)',
    '--theme-mesh-2': 'rgba(253, 224, 71, 0.50)',
    '--theme-mesh-3': 'rgba(251, 191, 36, 0.50)',
    '--theme-mesh-4': 'rgba(253, 186, 116, 0.60)',
    '--theme-mesh-5': 'rgba(249, 115, 22, 0.50)',
    '--theme-mesh-6': 'rgba(251, 146, 60, 0.40)',
    '--theme-mesh-7': 'rgba(254, 243, 199, 0.35)',
    '--theme-mesh-center': 'rgba(253, 230, 138, 0.50)',
    '--theme-dark-muted': 'rgba(255, 237, 213, 0.80)',
    '--theme-sidebar-active-bg': '#FFF7ED',
    '--theme-sidebar-active-text': '#EA580C',
    '--theme-sidebar-section-label': '#F97316',
  },
  purple: {
    '--theme-primary': '#8B5CF6',
    '--theme-primary-hover': '#7C3AED',
    '--theme-primary-light': '#EDE9FE',
    '--theme-primary-subtle': '#F5F3FF',
    '--theme-primary-muted': '#A78BFA',
    '--theme-mesh-base': '#5B21B6',
    '--theme-mesh-1': 'rgba(167, 139, 250, 0.70)',
    '--theme-mesh-2': 'rgba(196, 181, 253, 0.50)',
    '--theme-mesh-3': 'rgba(139, 92, 246, 0.50)',
    '--theme-mesh-4': 'rgba(196, 181, 253, 0.60)',
    '--theme-mesh-5': 'rgba(139, 92, 246, 0.50)',
    '--theme-mesh-6': 'rgba(167, 139, 250, 0.40)',
    '--theme-mesh-7': 'rgba(237, 233, 254, 0.35)',
    '--theme-mesh-center': 'rgba(221, 214, 254, 0.50)',
    '--theme-dark-muted': 'rgba(237, 233, 254, 0.80)',
    '--theme-sidebar-active-bg': '#F5F3FF',
    '--theme-sidebar-active-text': '#7C3AED',
    '--theme-sidebar-section-label': '#8B5CF6',
  },
  blue: {
    '--theme-primary': '#3B82F6',
    '--theme-primary-hover': '#2563EB',
    '--theme-primary-light': '#DBEAFE',
    '--theme-primary-subtle': '#EFF6FF',
    '--theme-primary-muted': '#60A5FA',
    '--theme-mesh-base': '#1e40af',
    '--theme-mesh-1': 'rgba(96, 165, 250, 0.70)',
    '--theme-mesh-2': 'rgba(103, 232, 249, 0.50)',
    '--theme-mesh-3': 'rgba(56, 189, 248, 0.50)',
    '--theme-mesh-4': 'rgba(147, 197, 253, 0.60)',
    '--theme-mesh-5': 'rgba(59, 130, 246, 0.50)',
    '--theme-mesh-6': 'rgba(96, 165, 250, 0.40)',
    '--theme-mesh-7': 'rgba(224, 242, 254, 0.35)',
    '--theme-mesh-center': 'rgba(186, 230, 253, 0.50)',
    '--theme-dark-muted': 'rgba(219, 234, 254, 0.80)',
    '--theme-sidebar-active-bg': '#EFF6FF',
    '--theme-sidebar-active-text': '#2563EB',
    '--theme-sidebar-section-label': '#3B82F6',
  },
}

function applyTheme(theme: ThemeName) {
  const vars = themes[theme]
  Object.entries(vars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value)
  })
  localStorage.setItem('query-theme', theme)
}

export default function SettingsPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set())

  // Session defaults
  const [defaultModeration, setDefaultModeration] = useState(false)
  const [defaultAutoSuggest, setDefaultAutoSuggest] = useState(false)

  // Default branding
  const [defaultBrandColor, setDefaultBrandColor] = useState('')
  const [defaultLogoUrl, setDefaultLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [applyingToExisting, setApplyingToExisting] = useState(false)
  const [appliedToExisting, setAppliedToExisting] = useState(false)
  const [brandingError, setBrandingError] = useState('')

  // Theme
  const [activeTheme, setActiveTheme] = useState<ThemeName>('orange')

  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 768)

    // Load saved preferences
    const savedModeration = localStorage.getItem('query-default-moderation')
    if (savedModeration !== null) setDefaultModeration(savedModeration === 'true')

    const savedAutoSuggest = localStorage.getItem('query-default-autosuggest')
    if (savedAutoSuggest !== null) setDefaultAutoSuggest(savedAutoSuggest === 'true')

    const savedTheme = localStorage.getItem('query-theme') as ThemeName | null
    if (savedTheme && themes[savedTheme]) {
      setActiveTheme(savedTheme)
      applyTheme(savedTheme)
    }

    const savedBrandColor = localStorage.getItem('query-default-brand-color')
    if (savedBrandColor) setDefaultBrandColor(savedBrandColor)

    const savedLogoUrl = localStorage.getItem('query-default-logo-url')
    if (savedLogoUrl) {
      setDefaultLogoUrl(savedLogoUrl)
      setLogoPreview(savedLogoUrl)
    }
  }, [])

  useEffect(() => {
    async function load() {
      const user = await getUser()
      if (user) {
        setEmail(user.email ?? null)
      }

      const { data } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      setSessions(data || [])
      setLoading(false)
    }
    load()
  }, [])

  function handleToggleModeration() {
    const next = !defaultModeration
    setDefaultModeration(next)
    localStorage.setItem('query-default-moderation', String(next))
  }

  function handleToggleAutoSuggest() {
    const next = !defaultAutoSuggest
    setDefaultAutoSuggest(next)
    localStorage.setItem('query-default-autosuggest', String(next))
  }

  function handleThemeChange(theme: ThemeName) {
    setActiveTheme(theme)
    applyTheme(theme)
  }

  const brandColorPresets = [
    { color: '#F97316', label: 'Orange' },
    { color: '#8B5CF6', label: 'Purple' },
    { color: '#3B82F6', label: 'Blue' },
    { color: '#10B981', label: 'Green' },
    { color: '#EF4444', label: 'Red' },
    { color: '#EC4899', label: 'Pink' },
    { color: '#6366F1', label: 'Indigo' },
    { color: '#14B8A6', label: 'Teal' },
  ]

  // Auto-save brand color to localStorage on every change
  function handleBrandColorChange(color: string) {
    setDefaultBrandColor(color)
    if (color) {
      localStorage.setItem('query-default-brand-color', color)
    } else {
      localStorage.removeItem('query-default-brand-color')
    }
  }

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setBrandingError('Logo must be under 2 MB.')
      return
    }
    setBrandingError('')

    // Auto-upload immediately
    setLogoUploading(true)
    const ext = file.name.split('.').pop() || 'png'
    const path = `defaults/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: uploadError } = await supabase.storage.from('logos').upload(path, file)
    if (uploadError) {
      setBrandingError('Failed to upload logo. Please try again.')
      setLogoUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
    const url = urlData.publicUrl
    setDefaultLogoUrl(url)
    setLogoPreview(url)
    setLogoFile(null)
    localStorage.setItem('query-default-logo-url', url)
    setLogoUploading(false)
  }

  function removeLogo() {
    setLogoFile(null)
    setLogoPreview('')
    setDefaultLogoUrl('')
    localStorage.removeItem('query-default-logo-url')
  }

  async function handleApplyToExisting() {
    // First ensure branding is saved to localStorage
    if (defaultBrandColor) {
      localStorage.setItem('query-default-brand-color', defaultBrandColor)
    } else {
      localStorage.removeItem('query-default-brand-color')
    }
    if (defaultLogoUrl) {
      localStorage.setItem('query-default-logo-url', defaultLogoUrl)
    } else {
      localStorage.removeItem('query-default-logo-url')
    }

    // Apply to current & upcoming sessions only (not past/ended ones)
    setApplyingToExisting(true)
    const updates: Record<string, string | null> = {
      logo_url: defaultLogoUrl || null,
      brand_color: defaultBrandColor || null,
    }
    const user = await getUser()
    if (user) {
      await supabase.from('sessions').update(updates).eq('user_id', user.id).is('ended_at', null)
    }
    setApplyingToExisting(false)
    setAppliedToExisting(true)
    setTimeout(() => setAppliedToExisting(false), 3000)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <main className="h-screen flex flex-col bg-slate-50 overflow-hidden">
        <div className="relative overflow-hidden px-4 sm:px-6 py-3 shrink-0 z-20 bg-slate-200 animate-pulse h-12" />
        <div className="flex-1 p-6 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-48" />
              <div className="h-10 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </main>
    )
  }

  const themeOptions: { name: ThemeName; color: string; label: string; isDefault: boolean }[] = [
    { name: 'orange', color: '#F97316', label: 'Orange', isDefault: true },
    { name: 'purple', color: '#8B5CF6', label: 'Purple', isDefault: false },
    { name: 'blue', color: '#3B82F6', label: 'Blue', isDefault: false },
  ]

  return (
    <main className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <MeshHeader>
        <div className="relative flex items-baseline gap-4">
          <button onClick={() => setSidebarOpen((o) => !o)} className="self-center shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5" style={{ color: 'var(--theme-dark-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <a href="/" className="text-2xl font-bold text-white hover:opacity-80 transition-opacity tracking-tight">Query</a>
          <span className="text-white/30 text-lg font-light select-none">/</span>
          <span className="text-lg font-medium" style={{ color: 'var(--theme-header-text-muted)' }}>Settings</span>
        </div>
      </MeshHeader>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          allSessions={sessions}
          expandedSeries={expandedSeries}
          setExpandedSeries={setExpandedSeries}
          activePage="settings"
        />

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
            {/* Profile Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Profile</h2>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <div className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 text-slate-500">
                  {email || 'Loading...'}
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-2xl text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Sign Out
              </button>
            </div>

            {/* Session Defaults Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Session Defaults</h2>

              {/* Default Moderation Toggle */}
              <div
                onClick={handleToggleModeration}
                className="flex items-center justify-between cursor-pointer bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3.5 hover:border-slate-200 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">Default Moderation</p>
                  <p className="text-xs text-slate-400 mt-0.5">New sessions will have moderation enabled by default.</p>
                </div>
                <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-3 ${defaultModeration ? 'bg-theme-primary' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${defaultModeration ? 'translate-x-5' : ''}`} />
                </div>
              </div>

              {/* Default AI Auto-Suggest Toggle */}
              <div
                onClick={handleToggleAutoSuggest}
                className="flex items-center justify-between cursor-pointer bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3.5 hover:border-slate-200 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">Default AI Auto-Suggest</p>
                  <p className="text-xs text-slate-400 mt-0.5">New sessions will have AI answer suggestions enabled by default.</p>
                </div>
                <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-3 ${defaultAutoSuggest ? 'bg-theme-primary' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${defaultAutoSuggest ? 'translate-x-5' : ''}`} />
                </div>
              </div>
            </div>

            {/* Appearance Section — merged dashboard theme + session branding */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>

              {/* Subsection: Dashboard Theme */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Dashboard Theme</p>
                  <p className="text-xs text-slate-400 mt-0.5">Changes the color of your host dashboard, sidebar, and headers. Only you see this.</p>
                </div>
                <div className="flex items-start gap-6">
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.name}
                      onClick={() => handleThemeChange(opt.name)}
                      className="flex flex-col items-center gap-2 group w-16"
                      title={opt.label}
                    >
                      <div
                        className={`w-8 h-8 rounded-full transition-all ${
                          activeTheme === opt.name ? 'ring-2 ring-offset-2' : 'hover:scale-110'
                        }`}
                        style={{
                          backgroundColor: opt.color,
                          boxShadow: activeTheme === opt.name ? `0 0 0 2px white, 0 0 0 4px ${opt.color}` : undefined,
                        }}
                      />
                      <div className="flex flex-col items-center">
                        <span className={`text-xs font-medium ${activeTheme === opt.name ? 'text-slate-900' : 'text-slate-400'}`}>
                          {opt.label}
                        </span>
                        {opt.isDefault && <span className="text-[10px] text-slate-400">Default</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Subsection: Session Branding */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">Session Branding</p>
                  <p className="text-xs text-slate-400 mt-0.5">Logo and accent color shown to attendees on join, present, and session pages. Changes save automatically.</p>
                </div>

                {/* Logo upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Logo</label>
                  {logoPreview ? (
                    <div className="flex items-center gap-4">
                      <img src={logoPreview} alt="Logo preview" className="h-12 max-w-[160px] object-contain rounded-lg border border-slate-200 p-1.5 bg-white" />
                      {logoUploading && <span className="text-xs text-slate-400 animate-pulse">Uploading...</span>}
                      <button onClick={removeLogo} className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors">Remove</button>
                    </div>
                  ) : (
                    <label className={`flex items-center justify-center w-full h-20 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-colors bg-slate-50 ${logoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="text-center">
                        {logoUploading ? (
                          <p className="text-sm text-slate-400 animate-pulse">Uploading...</p>
                        ) : (
                          <>
                            <p className="text-sm text-slate-500">Click to upload logo</p>
                            <p className="text-xs text-slate-400">PNG, JPG, SVG, WebP (max 2 MB)</p>
                          </>
                        )}
                      </div>
                      <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoSelect} className="hidden" disabled={logoUploading} />
                    </label>
                  )}
                </div>

                {/* Brand color */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Accent Color</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleBrandColorChange('')}
                      className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${
                        !defaultBrandColor ? 'border-slate-400 ring-2 ring-offset-1 ring-slate-400' : 'border-slate-200 hover:scale-110'
                      }`}
                      title="None (use theme default)"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    {brandColorPresets.map((preset) => (
                      <button
                        key={preset.color}
                        onClick={() => handleBrandColorChange(preset.color)}
                        className={`w-7 h-7 rounded-full transition-all ${
                          defaultBrandColor === preset.color ? 'ring-2 ring-offset-1' : 'hover:scale-110'
                        }`}
                        style={{
                          backgroundColor: preset.color,
                          boxShadow: defaultBrandColor === preset.color ? `0 0 0 1px white, 0 0 0 3px ${preset.color}` : undefined,
                        }}
                        title={preset.label}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={defaultBrandColor}
                      onChange={(e) => handleBrandColorChange(e.target.value)}
                      placeholder="#hex or empty for default"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent"
                    />
                    {defaultBrandColor && (
                      <div className="w-8 h-8 rounded-lg border border-slate-200 shrink-0" style={{ backgroundColor: defaultBrandColor }} />
                    )}
                  </div>
                </div>

                {/* Error */}
                {brandingError && <p className="text-sm text-red-600">{brandingError}</p>}

                {/* Success */}
                {appliedToExisting && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-sm text-emerald-700">Branding applied to all current and upcoming sessions.</p>
                  </div>
                )}

                {/* Action button */}
                <div className="pt-1">
                  <p className="text-xs text-slate-400 mb-2">Branding is automatically saved for future sessions. To update sessions you've already created:</p>
                  <button
                    onClick={handleApplyToExisting}
                    disabled={applyingToExisting}
                    className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors"
                  >
                    {applyingToExisting ? 'Applying...' : appliedToExisting ? 'Applied!' : 'Apply to All Current & Upcoming Sessions'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
