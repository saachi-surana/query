# Query — Theme & Mesh Gradient Guide

All colors are CSS custom properties in `globals.css`. Components reference them
via `var(--theme-*)` inline styles or Tailwind classes mapped in `tailwind.config.ts`.
To switch themes, **only edit `globals.css`** — no component code changes needed.

---

## Variable Architecture

### 1. Primary Colors (buttons, links, focus rings, light-bg accents)

| Variable                 | Role                           | Orange Value |
|--------------------------|--------------------------------|--------------|
| `--theme-primary`        | Buttons, links, focus rings    | #F97316      |
| `--theme-primary-hover`  | Button hover / active          | #EA580C      |
| `--theme-primary-light`  | Badges, highlights, borders    | #FFEDD5      |
| `--theme-primary-subtle` | Selected-state backgrounds     | #FFF7ED      |
| `--theme-primary-muted`  | Softer accent text             | #FB923C      |

**Palette rule:** Pick a vibrant mid-tone as `primary`, one shade darker for
`hover`, then 100/50/400 equivalents for `light`/`subtle`/`muted`.

### 2. Mesh Gradient Colors (landing page background, header bars)

| Variable               | Role                                      | Orange Value                        |
|------------------------|--------------------------------------------|-------------------------------------|
| `--theme-mesh-base`    | Solid dark fill behind all blobs           | #9a3412 (orange-800)                |
| `--theme-mesh-1`       | Bright accent blob                         | rgba(251,146,60, 0.70) — orange-400 |
| `--theme-mesh-2`       | Contrasting warm blob                      | rgba(253,224,71, 0.50) — yellow-300 |
| `--theme-mesh-3`       | Secondary warm blob                        | rgba(251,191,36, 0.50) — amber-400  |
| `--theme-mesh-4`       | Light accent blob                          | rgba(253,186,116, 0.60) — orange-300|
| `--theme-mesh-5`       | Core/primary blob (matches button color)   | rgba(249,115,22, 0.50) — orange-500 |
| `--theme-mesh-6`       | Fill/padding blob                          | rgba(251,146,60, 0.40) — orange-400 |
| `--theme-mesh-7`       | Soft glow accent                           | rgba(254,243,199, 0.35) — amber-100 |
| `--theme-mesh-center`  | Center brightness (kills dark cross)       | rgba(253,230,138, 0.50) — yellow-200|

**Palette rules for mesh colors:**
- `mesh-base`: Use the **800-shade** of your primary hue. Do NOT use 950 — it
  looks brown/muddy. The base must be dark enough for white text contrast but
  warm/saturated, never near-black.
- `mesh-1` through `mesh-7`: Use shades from the **300–500 range** with
  **0.35–0.70 opacity**. Mix in a neighboring hue (e.g. yellow/amber for orange,
  cyan/teal for blue) for visual interest.
- `mesh-center`: A **light, bright tone (100–200 range)** at ~0.50 opacity.
  This large center blob prevents the "dark cross" artifact where blobs don't
  overlap.
- Keep all mesh colors **semi-transparent** (rgba) so blobs blend naturally
  when layered.

### 3. Text on Mesh / Dark Background

| Variable                   | Role                 | Value                          |
|----------------------------|----------------------|--------------------------------|
| `--theme-dark-subheading`  | High-contrast text   | rgba(255,255,255, 0.90)        |
| `--theme-dark-muted`       | Readable body text   | rgba(255,237,213, 0.80)        |
| `--theme-dark-accent`      | Icons, subtle text   | rgba(255,255,255, 0.75)        |
| `--theme-dark-divider`     | Divider lines        | rgba(255,255,255, 0.20)        |

**Palette rule:** These are always white-based for readability. For
`dark-muted`, tint it with your primary-100 color (e.g. orange-100 for warmth,
blue-100 for cool) to add subtle color harmony.

### 4. Header Elements (on mesh background)

| Variable                     | Role              | Value                          |
|------------------------------|--------------------|--------------------------------|
| `--theme-header-text`        | Primary text       | #ffffff                        |
| `--theme-header-text-muted`  | Secondary text     | rgba(255,255,255, 0.80)        |
| `--theme-header-badge-bg`    | Badge background   | rgba(255,255,255, 0.20)        |
| `--theme-header-badge-text`  | Badge text         | #ffffff                        |
| `--theme-header-btn-border`  | Button borders     | rgba(255,255,255, 0.25)        |
| `--theme-header-btn-text`    | Button text        | rgba(255,255,255, 0.90)        |
| `--theme-header-btn-hover-bg`| Button hover       | rgba(255,255,255, 0.15)        |

**Palette rule:** Header elements are always white-on-dark. These rarely need
changing between themes — just keep them as white with varying opacity.

### 5. Sidebar (light background)

| Variable                      | Role                  | Value    |
|-------------------------------|-----------------------|----------|
| `--theme-sidebar-bg`          | Background            | #ffffff  |
| `--theme-sidebar-border`      | Edge border           | #F1F5F9  |
| `--theme-sidebar-text`        | Default text          | #334155  |
| `--theme-sidebar-text-hover`  | Hovered text          | #0F172A  |
| `--theme-sidebar-hover-bg`    | Hover background      | #F8FAFC  |
| `--theme-sidebar-active-bg`   | Active item bg        | #FFF7ED  |
| `--theme-sidebar-active-text` | Active item text      | #EA580C  |
| `--theme-sidebar-section-label`| Section headers      | #F97316  |
| `--theme-sidebar-divider`     | Dividers              | #F1F5F9  |

**Palette rule:** Sidebar is always white with slate neutrals. Only
`active-bg`, `active-text`, and `section-label` need theme color — use
`primary-subtle`, `primary-hover`, and `primary` respectively.

---

## Mesh Gradient Layouts (DO NOT CHANGE — only change colors)

The blob positions, sizes, and blur radii below are carefully tuned. When
switching themes, change only the CSS variable values — never the layout.

### Landing Page (full-screen, 9 blobs)

```
Blob layout (viewport-relative positions):

  [mesh-7]  soft glow        top-center     35%x35%  blur-80
  [mesh-1]  bright accent    top-left       60%x60%  blur-120
  [mesh-2]  contrast warm    top-right      55%x55%  blur-130
  [mesh-6]  fill             center-right   40%x40%  blur-90
  [mesh-center] brightness   center         60%x60%  blur-140  ← prevents dark cross
  [mesh-6]  fill             center-left    35%x40%  blur-110
  [mesh-4]  light accent     bottom-left    50%x50%  blur-110
  [mesh-3]  secondary warm   bottom-right   50%x55%  blur-100
```

Key design decisions:
- **9 blobs total** — 7 color blobs + 1 center brightness + 1 solid base
- Blobs **overflow edges** (negative positions) to avoid hard cutoffs
- **Center blob** (`mesh-center`) is critical — without it, the gaps between
  corner blobs create a dark cross/plus shape in the middle
- Blur radii range from **80–140px** — larger in center, smaller at edges
- The base color (`mesh-base`) shows through wherever blobs are transparent

### Header Bar (horizontal strip, 5 blobs)

```
Blob layout (left-to-right gradient flow):

  BASE    solid dark fill    full width     ← shows through gaps
  [mesh-1]  bright accent    left-[-10%]    40%w, 300%h  blur-60
  [mesh-2]  yellow/contrast  left-[25%]     35%w, 300%h  blur-60
  [mesh-5]  core/primary     right-[10%]    30%w, 300%h  blur-60  ← transition blob
  [mesh-base] dark           right-[-10%]   25%w, 300%h  blur-40
```

Key design decisions:
- **Horizontal flow**: bright left → warm center → primary transition → dark right
- Blobs are **300% height** with **top-[-80%]** to create a thin horizontal
  gradient strip (they extend far above/below the header)
- The **transition blob** (`mesh-5`, primary/button color) smooths the jump
  between the bright yellow center and the dark right edge
- Blur is **60px** for color blobs, **40px** for the dark edge (sharper = more
  defined dark corner)
- The dark right edge creates visual weight/grounding on the right side

### Report Page Header

Uses the same 5-blob header layout as above (was updated to match).

---

## How to Create a New Theme

1. **Pick your primary hue** (e.g. blue, green, purple)
2. **Fill in `globals.css`** following the palette rules above:
   - Primary: 500-shade, hover: 600-shade, light: 100, subtle: 50, muted: 400
   - Mesh base: **800-shade** (not 950!)
   - Mesh blobs: 300–500 shades at 0.35–0.70 opacity, mix in one neighbor hue
   - Mesh center: 100–200 shade at ~0.50 opacity
   - Dark-muted: tint with your primary-100
   - Sidebar active: primary-50 bg, primary-600 text, primary-500 label
3. **Do NOT touch** any component files, blob positions, sizes, or blur values
4. **Test** the landing page and a session header — look for:
   - Dark cross artifact (fix: brighten `mesh-center`)
   - Muddy/brown base (fix: use 800 not 950)
   - Unreadable header text (fix: ensure `mesh-base` is dark enough for white text)
   - Harsh transitions in header (fix: adjust transition blob opacity)

---

## Example: Blue Theme (reference)

```css
:root {
  --theme-primary: #3B82F6;         /* blue-500 */
  --theme-primary-hover: #2563EB;   /* blue-600 */
  --theme-primary-light: #DBEAFE;   /* blue-100 */
  --theme-primary-subtle: #EFF6FF;  /* blue-50 */
  --theme-primary-muted: #60A5FA;   /* blue-400 */

  --theme-mesh-base: #1e40af;       /* blue-800 */
  --theme-mesh-1: rgba(96, 165, 250, 0.70);   /* blue-400 */
  --theme-mesh-2: rgba(103, 232, 249, 0.50);  /* cyan-300 */
  --theme-mesh-3: rgba(56, 189, 248, 0.50);   /* sky-400 */
  --theme-mesh-4: rgba(147, 197, 253, 0.60);  /* blue-300 */
  --theme-mesh-5: rgba(59, 130, 246, 0.50);   /* blue-500 */
  --theme-mesh-6: rgba(96, 165, 250, 0.40);   /* blue-400 */
  --theme-mesh-7: rgba(224, 242, 254, 0.35);  /* sky-100 */
  --theme-mesh-center: rgba(186, 230, 253, 0.50); /* sky-200 */

  --theme-dark-muted: rgba(219, 234, 254, 0.80);  /* blue-100 */

  --theme-sidebar-active-bg: #EFF6FF;  /* blue-50 */
  --theme-sidebar-active-text: #2563EB; /* blue-600 */
  --theme-sidebar-section-label: #3B82F6; /* blue-500 */
}
```
