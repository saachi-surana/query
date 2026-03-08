/**
 * Brand Color Generation Utility
 *
 * Takes a single hex color and generates a full set of CSS custom properties
 * for theming the app with a host's brand color. Uses HSL conversion for
 * reliable lightening/darkening.
 */

function hexToHsl(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [0, 0, 50]

  let r = parseInt(result[1], 16) / 255
  let g = parseInt(result[2], 16) / 255
  let b = parseInt(result[3], 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)))
  }
  return [f(0), f(8), f(4)]
}

/**
 * Generate a complete theme variables map from a single brand hex color.
 */
export function generateBrandTheme(hex: string): Record<string, string> {
  const [h, s, l] = hexToHsl(hex)

  // Primary: the color itself
  const primary = hex.startsWith('#') ? hex : `#${hex}`

  // Primary hover: 10% darker
  const hoverL = Math.max(0, l - 10)
  const primaryHover = hslToHex(h, s, hoverL)

  // Primary light: 90% lighter (almost white tint)
  const primaryLight = hslToHex(h, Math.min(100, s), Math.min(95, l + (95 - l) * 0.9))

  // Primary subtle: 95% lighter
  const primarySubtle = hslToHex(h, Math.min(100, s), Math.min(97, l + (97 - l) * 0.95))

  // Primary muted: 30% lighter
  const mutedL = Math.min(100, l + 30)
  const primaryMuted = hslToHex(h, s, mutedL)

  // Mesh base: 40% darker
  const meshBaseL = Math.max(0, l - 40)
  const meshBase = hslToHex(h, s, meshBaseL)

  // RGB values for mesh colors at various opacities
  const [mr, mg, mb] = hslToRgb(h, s, l)
  const [lr, lg, lb] = hslToRgb(h, Math.min(100, s - 10), Math.min(100, l + 20))
  const [dr, dg, db] = hslToRgb(h, s, Math.max(0, l - 20))

  return {
    '--theme-primary': primary,
    '--theme-primary-hover': primaryHover,
    '--theme-primary-light': primaryLight,
    '--theme-primary-subtle': primarySubtle,
    '--theme-primary-muted': primaryMuted,
    '--theme-mesh-base': meshBase,
    '--theme-mesh-1': `rgba(${mr}, ${mg}, ${mb}, 0.70)`,
    '--theme-mesh-2': `rgba(${lr}, ${lg}, ${lb}, 0.50)`,
    '--theme-mesh-3': `rgba(${mr}, ${mg}, ${mb}, 0.50)`,
    '--theme-mesh-4': `rgba(${lr}, ${lg}, ${lb}, 0.60)`,
    '--theme-mesh-5': `rgba(${dr}, ${dg}, ${db}, 0.50)`,
    '--theme-mesh-6': `rgba(${mr}, ${mg}, ${mb}, 0.40)`,
    '--theme-mesh-7': `rgba(${lr}, ${lg}, ${lb}, 0.35)`,
    '--theme-mesh-center': `rgba(${lr}, ${lg}, ${lb}, 0.50)`,
    '--theme-dark-muted': `rgba(${lr}, ${lg}, ${lb}, 0.80)`,
    '--theme-sidebar-active-bg': primarySubtle,
    '--theme-sidebar-active-text': primaryHover,
    '--theme-sidebar-section-label': primary,
  }
}
