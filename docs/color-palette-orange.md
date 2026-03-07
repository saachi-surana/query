# Query — Color Palette: Orange

## Philosophy
Warm, lively, AI-forward. Energetic but not neon. Distinct from every competitor in the Q&A space.

## Core Palette

### Primary — Warm Orange
| Role           | Tailwind Class | Hex       | Usage                              |
|----------------|----------------|-----------|------------------------------------|
| Primary        | orange-500     | #F97316   | Buttons, links, focus rings        |
| Primary hover  | orange-600     | #EA580C   | Button hover states                |
| Primary light  | orange-100     | #FFEDD5   | Backgrounds, badges, highlights    |
| Primary subtle | orange-50      | #FFF7ED   | Very light tints, selected states  |

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
| Background     | bg-orange-950     | Full-screen dark base (#431407)|

### Gradient Blobs
| Tailwind Class       | Opacity | Blur     | Position            | Purple Equivalent    |
|----------------------|---------|----------|---------------------|----------------------|
| bg-orange-800        | /50     | 120px    | Top-left            | bg-violet-800/50     |
| bg-amber-700         | /40     | 130px    | Top-right           | bg-purple-800/40     |
| bg-amber-600         | /45     | 100px    | Bottom-right        | bg-purple-700/45     |
| bg-orange-700        | /35     | 110px    | Bottom-left         | bg-violet-700/35     |
| bg-orange-500        | /25     | 90px     | Center-right        | bg-violet-600/25     |
| bg-red-800           | /30     | 110px    | Center-left (depth) | bg-indigo-800/30     |
| bg-yellow-600        | /15     | 80px     | Top-center (accent) | bg-fuchsia-700/15    |

### Text on Dark Background
| Role          | Tailwind Class       | Purple Equivalent      | Usage                          |
|---------------|----------------------|------------------------|--------------------------------|
| Heading       | text-white           | text-white             | Logo, feature titles           |
| Subheading    | text-orange-200/90   | text-violet-200/90     | Tagline                        |
| Muted         | text-orange-300/50   | text-violet-300/50     | Descriptions, feature captions |
| Divider text  | text-orange-400/60   | text-violet-400/60     | "or" separator text            |
| Divider line  | bg-orange-500/20     | bg-violet-500/20       | Separator lines                |
| Error bg      | bg-rose-500/15       | bg-rose-500/15         | Error banner background        |
| Error border  | border-rose-400/20   | border-rose-400/20     | Error banner border            |
| Error text    | text-rose-200        | text-rose-200          | Error banner text              |

### Cards on Dark Background
| Role          | Tailwind Class                  | Purple Equivalent              |
|---------------|---------------------------------|--------------------------------|
| Card bg       | bg-white                        | bg-white                       |
| Card shadow   | shadow-2xl shadow-orange-950/50 | shadow-2xl shadow-violet-950/50|
| Button shadow | shadow-lg shadow-orange-500/25  | shadow-lg shadow-violet-600/25 |

### Feature Icons on Dark Background
| Role          | Tailwind Class       | Purple Equivalent    |
|---------------|----------------------|----------------------|
| Icon bg       | bg-orange-500/20     | bg-violet-500/20     |
| Icon color    | text-orange-300      | text-violet-300      |

## Usage Guidelines

### Buttons
- **Primary action**: `bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/25`
- **Secondary action**: `bg-slate-900 hover:bg-slate-800 text-white rounded-xl`
- **Ghost/outline**: `border border-slate-200 hover:bg-slate-50 text-slate-700`

### Focus States
- `focus:ring-2 focus:ring-orange-500 focus:border-transparent`

### Cards
- On light bg: `bg-white border border-slate-200 rounded-xl`
- On dark bg: `bg-white rounded-2xl shadow-2xl shadow-orange-950/50`
- Highlighted/active: `border-orange-300 bg-orange-50`

### Text Hierarchy (Light Background)
1. Headings: `text-slate-900 font-semibold`
2. Body: `text-slate-500`
3. Muted/caption: `text-slate-400`
4. Links: `text-orange-500 hover:text-orange-600`

### Status Indicators
- Approved/answered: `text-emerald-600 bg-emerald-50`
- Pending/review: `text-amber-600 bg-amber-50`
- Rejected/error: `text-rose-600 bg-rose-50`

## Color Mapping Reference (Purple → Orange)

Quick find-and-replace guide:

| Purple                | Orange               |
|-----------------------|----------------------|
| violet-950            | orange-950           |
| violet-800            | orange-800           |
| violet-700            | orange-700           |
| violet-600            | orange-500           |
| violet-500            | orange-500           |
| violet-400            | orange-400           |
| violet-300            | orange-300           |
| violet-200            | orange-200           |
| violet-100            | orange-100           |
| violet-50             | orange-50            |
| purple-800            | amber-700            |
| purple-700            | amber-600            |
| indigo-800            | red-800              |
| fuchsia-700           | yellow-600           |