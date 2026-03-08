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

            {/* Appearance Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
              <p className="text-sm text-slate-500">Choose a theme color for the interface.</p>

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
                        activeTheme === opt.name
                          ? 'ring-2 ring-offset-2'
                          : 'hover:scale-110'
                      }`}
                      style={{
                        backgroundColor: opt.color,
                        boxShadow: activeTheme === opt.name
                          ? `0 0 0 2px white, 0 0 0 4px ${opt.color}`
                          : undefined,
                      }}
                    />
                    <div className="flex flex-col items-center">
                      <span className={`text-xs font-medium ${
                        activeTheme === opt.name ? 'text-slate-900' : 'text-slate-400'
                      }`}>
                        {opt.label}
                      </span>
                      {opt.isDefault && (
                        <span className="text-[10px] text-slate-400">Default</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
