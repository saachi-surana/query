# Query — Color Palette

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
| Headings   | slate-900      | #0F172A   | Page titles, strong text           |
| Body text  | slate-600      | #475569   | Paragraphs, descriptions           |
| Muted text | slate-400      | #94A3B8   | Captions, placeholders, helpers    |
| Surface    | slate-50       | #F8FAFC   | Card backgrounds, subtle sections  |
| Border     | slate-200      | #E2E8F0   | Dividers, card borders             |
| Background | white          | #FFFFFF   | Page background                    |

### Semantic Colors
| Role    | Tailwind Class | Hex       | Usage                              |
|---------|----------------|-----------|------------------------------------|
| Success | emerald-600    | #059669   | Answered, approved, positive       |
| Warning | amber-500      | #F59E0B   | Pending, attention needed          |
| Error   | rose-600       | #E11D48   | Errors, destructive actions        |

## Usage Guidelines

### Buttons
- **Primary action**: `bg-violet-600 hover:bg-violet-700 text-white`
- **Secondary action**: `bg-slate-900 hover:bg-slate-700 text-white`
- **Ghost/outline**: `border border-slate-200 hover:bg-slate-50 text-slate-700`

### Focus States
- `focus:ring-2 focus:ring-violet-500 focus:border-transparent`

### Cards
- `bg-white border border-slate-200 rounded-xl`
- Highlighted/active card: `border-violet-300 bg-violet-50`

### Text Hierarchy
1. Headings: `text-slate-900 font-bold`
2. Body: `text-slate-600`
3. Muted/caption: `text-slate-400`
4. Links: `text-violet-600 hover:text-violet-700`

### Status Indicators
- Approved/answered: `text-emerald-600 bg-emerald-50`
- Pending/review: `text-amber-600 bg-amber-50`
- Rejected/error: `text-rose-600 bg-rose-50`