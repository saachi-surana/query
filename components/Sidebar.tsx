'use client'

import { Session } from '@/lib/supabase'

export interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  allSessions: Session[]
  currentCode?: string  // to highlight active session
  expandedSeries: Set<string>
  setExpandedSeries: React.Dispatch<React.SetStateAction<Set<string>>>
  activePage?: 'session' | 'analytics' | 'report' | 'settings'
}

export function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  allSessions,
  currentCode,
  expandedSeries,
  setExpandedSeries,
  activePage,
}: SidebarProps) {
  const liveSessions = allSessions.filter((s) => !s.ended_at && (!s.starts_at || new Date(s.starts_at) <= new Date()))
  const upcomingSessions = allSessions.filter((s) => s.starts_at && new Date(s.starts_at) > new Date() && !s.ended_at)
  const pastSessions = allSessions.filter((s) => s.ended_at).slice(0, 10)

  return (
    <>
      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-10 sm:hidden" onClick={() => setSidebarOpen(false)} />}
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} shrink-0 bg-theme-sidebar-bg border-r border-theme-sidebar-border overflow-y-auto overflow-x-hidden transition-all duration-200 fixed top-12 sm:relative sm:top-auto z-20 sm:z-auto h-[calc(100vh-48px)] sm:h-auto`}>
        <div className="p-4 space-y-6 w-64">
          {/* Live Sessions */}
          {liveSessions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[0.8125rem] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live ({liveSessions.length})
              </p>
              {liveSessions.map((s) => (
                <a
                  key={s.id}
                  href={`/session/${s.code}`}
                  className={`block px-3 py-2.5 rounded-lg text-[0.9375rem] leading-snug truncate transition-colors ${
                    activePage === 'session' && s.code === currentCode
                      ? 'bg-theme-sidebar-active-bg text-theme-sidebar-active-text font-medium'
                      : 'text-theme-sidebar-text hover:bg-theme-sidebar-hover-bg'
                  }`}
                >
                  {s.title}
                  <span className="block text-xs text-slate-500 font-mono mt-0.5">{s.code}</span>
                </a>
              ))}
            </div>
          )}

          {/* Upcoming Sessions */}
          {upcomingSessions.length > 0 && (() => {
            const sorted = [...upcomingSessions].sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime())
            const standalone = sorted.filter((s) => !s.recurrence_parent_id)
            const recurringMap = new Map<string, Session[]>()
            sorted.forEach((s) => {
              if (s.recurrence_parent_id) {
                const group = recurringMap.get(s.recurrence_parent_id) || []
                group.push(s)
                recurringMap.set(s.recurrence_parent_id, group)
              }
            })
            return (
              <div className="space-y-1.5">
                <p className="text-[0.8125rem] font-bold text-theme-primary uppercase tracking-wider">Upcoming</p>
                {standalone.map((s) => (
                  <a
                    key={s.id}
                    href={`/session/${s.code}`}
                    className={`block px-3 py-2.5 rounded-lg text-[0.9375rem] leading-snug font-medium truncate transition-colors ${
                      activePage === 'session' && s.code === currentCode
                        ? 'bg-theme-sidebar-active-bg text-theme-sidebar-active-text'
                        : 'text-theme-sidebar-text hover:bg-theme-sidebar-hover-bg'
                    }`}
                  >
                    {s.title}
                    <span className="block text-xs text-slate-500 mt-0.5">{new Date(s.starts_at!).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </a>
                ))}
                {Array.from(recurringMap.entries()).map(([parentId, group]) => {
                  const first = group[0]
                  const rest = group.slice(1)
                  const isExpanded = expandedSeries.has(parentId)
                  return (
                    <div key={parentId}>
                      <a
                        href={`/session/${first.code}`}
                        className={`block px-3 py-2.5 rounded-lg text-[0.9375rem] leading-snug font-medium truncate transition-colors ${
                          activePage === 'session' && first.code === currentCode
                            ? 'bg-theme-sidebar-active-bg text-theme-sidebar-active-text'
                            : 'text-theme-sidebar-text hover:bg-theme-sidebar-hover-bg'
                        }`}
                      >
                        {first.title}
                      </a>
                      {!isExpanded && rest.length > 0 ? (
                        <button
                          onClick={() => setExpandedSeries((prev) => { const next = new Set(prev); next.add(parentId); return next })}
                          className="block px-3 py-1 text-xs text-slate-400 hover:text-theme-primary transition-colors"
                        >
                          {new Date(first.starts_at!).toLocaleDateString([], { month: 'short', day: 'numeric' })} · +{rest.length} more ▾
                        </button>
                      ) : (
                        <>
                          {group.map((s) => (
                            <a
                              key={s.id}
                              href={`/session/${s.code}`}
                              className={`block px-3 py-1 text-xs transition-colors ${
                                activePage === 'session' && s.code === currentCode
                                  ? 'text-theme-sidebar-active-text font-medium'
                                  : 'text-slate-400 hover:text-theme-primary'
                              }`}
                            >
                              {new Date(s.starts_at!).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </a>
                          ))}
                          {rest.length > 0 && (
                            <button
                              onClick={() => setExpandedSeries((prev) => { const next = new Set(prev); next.delete(parentId); return next })}
                              className="block px-3 py-1 text-xs text-slate-400 hover:text-theme-primary transition-colors"
                            >
                              ▴ Show less
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* Past Sessions */}
          {pastSessions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[0.8125rem] font-bold text-slate-400 uppercase tracking-wider">Past</p>
              {pastSessions.map((s) => (
                <a
                  key={s.id}
                  href={`/report/${s.code}`}
                  className={`block px-3 py-2.5 rounded-lg text-[0.9375rem] leading-snug truncate transition-colors ${
                    activePage === 'report' && s.code === currentCode
                      ? 'bg-theme-sidebar-active-bg text-theme-sidebar-active-text font-medium'
                      : 'text-slate-400 hover:bg-theme-sidebar-hover-bg'
                  }`}
                >
                  {s.title}
                  <span className="block text-xs text-slate-500 font-mono mt-0.5">{s.code}</span>
                </a>
              ))}
            </div>
          )}

          {/* Bottom links */}
          <div className="pt-4 border-t border-theme-sidebar-divider space-y-1">
            <a href="/create" className="block px-3 py-2.5 rounded-lg text-[0.9375rem] text-theme-sidebar-active-text hover:bg-theme-sidebar-hover-bg font-semibold transition-colors">+ New Session</a>
            <a
              href="/analytics"
              className={`block px-3 py-2.5 rounded-lg text-[0.9375rem] font-medium transition-colors ${
                activePage === 'analytics'
                  ? 'bg-theme-sidebar-active-bg text-theme-sidebar-active-text font-semibold'
                  : 'text-theme-sidebar-text hover:bg-theme-sidebar-hover-bg'
              }`}
            >
              Analytics
            </a>
            <a
              href="/settings"
              className={`block px-3 py-2.5 rounded-lg text-[0.9375rem] font-medium transition-colors ${
                activePage === 'settings'
                  ? 'bg-theme-sidebar-active-bg text-theme-sidebar-active-text font-semibold'
                  : 'text-theme-sidebar-text hover:bg-theme-sidebar-hover-bg'
              }`}
            >
              Settings
            </a>
          </div>
        </div>
      </aside>
    </>
  )
}
