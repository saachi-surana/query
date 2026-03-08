'use client'

import { useEffect } from 'react'
import { generateBrandTheme } from '@/lib/brand-colors'

/**
 * BrandOverride — applies a host's brand color as CSS custom properties.
 *
 * When brandColor is set (a hex string like "#F97316"), this component
 * generates tinted CSS variables and applies them to the document root.
 * Falls back to the default theme when brandColor is null.
 *
 * This component renders nothing visually — it only applies side effects.
 */
export function BrandOverride({ brandColor }: { brandColor: string | null }) {
  useEffect(() => {
    if (!brandColor) return

    // Validate hex format
    const isValidHex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(brandColor)
    if (!isValidHex) return

    const hex = brandColor.startsWith('#') ? brandColor : `#${brandColor}`
    const theme = generateBrandTheme(hex)

    // Apply all CSS variables to the document root
    const entries = Object.entries(theme)
    entries.forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value)
    })

    // Cleanup: remove overrides when component unmounts or brandColor changes
    return () => {
      entries.forEach(([key]) => {
        document.documentElement.style.removeProperty(key)
      })
    }
  }, [brandColor])

  return null
}
