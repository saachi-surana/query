# Query — Color Palette: Purples

## Philosophy
Modern, AI-first aesthetic. Clean and trustworthy. Distinct from Slido (green) and Zoom (blue).

## Core Palette

### Primary — Deep Violet
| Role           | Tailwind Class | Hex       | Usage                              |
|----------------|----------------|-----------|------------------------------------|
| Primary        | violet-600     | #7C3AED   | Buttons, links, focus rings        |
| Primary hover  | violet-700     | #6D28D9   | Button hover states                |
| Primary light  | violet-100     | #EDE9FE   | Backgrounds, badges, highlights    |
| Primary subtle | violet-50      | #F5F3FF   | Very light tints, selected states  |

### Neutrals — Slate
| Role       | Tailwind Class | Hex       | Usage                              |
|------------|----------------|-----------|------------------------------------|
| Headings   | slate-900      | #0F172A   | Page titles, card headings         |
| Body text  | slate-500      | #64748B   | Card descriptions                  |
| Muted text | slate-400      | #94A3B8   | Placeholders, captions             |
| Surface    | slate-50       | #F8FAFC   | Input backgrounds                  |
| Border     | slate-200      | #E2E8F0   | Input borders, dividers            |
| Background | white          | #FFFFFF   | Card backgrounds                   |

### Semantic Colors
| Role    | Tailwind Class | Hex       | Usage                              |
|---------|----------------|-----------|------------------------------------|
| Success | emerald-600    | #059669   | Answered, approved, positive       |
| Warning | amber-500      | #F59E0B   | Pending, attention needed          |
| Error   | rose-600       | #E11D48   | Errors, destructive actions        |

## Dark Mesh Gradient Background (Landing Page)

### Base
| Role           | Tailwind Class    | Usage                          |
|----------------|-------------------|--------------------------------|
| Background     | bg-violet-950     | Full-screen dark base          |

### Gradient Blobs
| Tailwind Class       | Opacity | Blur     | Position           |
|----------------------|---------|----------|--------------------|
| bg-violet-800        | /50     | 120px    | Top-left           |
| bg-purple-800        | /40     | 130px    | Top-right          |
| bg-purple-700        | /45     | 100px    | Bottom-right       |
| bg-violet-700        | /35     | 110px    | Bottom-left        |
| bg-violet-600        | /25     | 90px     | Center-right       |
| bg-indigo-800        | /30     | 110px    | Center-left        |
| bg-fuchsia-700       | /15     | 80px     | Top-center (accent)|

### Text on Dark Background
| Role          | Tailwind Class       | Usage                          |
|---------------|----------------------|--------------------------------|
| Heading       | text-white           | Logo, feature titles           |
| Subheading    | text-violet-200/90   | Tagline                        |
| Muted         | text-violet-300/50   | Descriptions, feature captions |
| Divider text  | text-violet-400/60   | "or" separator text            |
| Divider line  | bg-violet-500/20     | Separator lines                |
| Error bg      | bg-rose-500/15       | Error banner background        |
| Error border  | border-rose-400/20   | Error banner border            |
| Error text    | text-rose-200        | Error banner text              |

### Cards on Dark Background
| Role          | Tailwind Class              | Usage                      |
|---------------|-----------------------------|----------------------------|
| Card bg       | bg-white                    | Card surface               |
| Card shadow   | shadow-2xl shadow-violet-950/50 | Deep shadow on dark bg |
| Button shadow | shadow-lg shadow-violet-600/25  | Primary button glow    |

### Feature Icons on Dark Background
| Role          | Tailwind Class       | Usage                      |
|---------------|----------------------|----------------------------|
| Icon bg       | bg-violet-500/20     | Icon container background  |
| Icon color    | text-violet-300      | Icon stroke color          |

## Usage Guidelines

### Buttons
- **Primary action**: `bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-lg shadow-violet-600/25`
- **Secondary action**: `bg-slate-900 hover:bg-slate-800 text-white rounded-xl`
- **Ghost/outline**: `border border-slate-200 hover:bg-slate-50 text-slate-700`

### Focus States
- `focus:ring-2 focus:ring-violet-500 focus:border-transparent`

### Cards
- On light bg: `bg-white border border-slate-200 rounded-xl`
- On dark bg: `bg-white rounded-2xl shadow-2xl shadow-violet-950/50`
- Highlighted/active: `border-violet-300 bg-violet-50`

### Text Hierarchy (Light Background)
1. Headings: `text-slate-900 font-semibold`
2. Body: `text-slate-500`
3. Muted/caption: `text-slate-400`
4. Links: `text-violet-600 hover:text-violet-700`

### Status Indicators
- Approved/answered: `text-emerald-600 bg-emerald-50`
- Pending/review: `text-amber-600 bg-amber-50`
- Rejected/error: `text-rose-600 bg-rose-50`