'use client'

import { useEffect } from 'react'

const themes: Record<string, Record<string, string>> = {
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

export function ThemeLoader() {
  useEffect(() => {
    const saved = localStorage.getItem('query-theme')
    if (saved && themes[saved]) {
      Object.entries(themes[saved]).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value)
      })
    }
  }, [])

  return null
}
