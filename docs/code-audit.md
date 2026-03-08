# Query Code Quality Audit

**Date**: 2026-03-07
**Scope**: All source files in `app/`, `lib/`, `middleware.ts`, `tailwind.config.ts`, `globals.css`, and `docs/`.

---

## 1. Dead Code / Unused Files

### Unused Imports
- **`app/page.tsx` line 3**: `useRef` is imported but `inputRef` is only used as a ref on the input element. It is technically used, but the ref is never programmatically accessed (e.g., no `.current.focus()` call), making it unnecessary.

### Unused Exports in `lib/auth.ts`
- **`signOut()`** (line 11): Exported but never imported or called anywhere in the codebase. No sign-out button exists in any page.
- **`onAuthStateChange()`** (line 20): Exported but never imported or called anywhere in the codebase.

### Unused CSS
- **`globals.css` line 70-73**: The `.text-balance` utility class is defined but never used in any component.
- **`globals.css` line 76-78**: The `@keyframes fadeIn` animation is only used in one place (`session/[code]/page.tsx` line 817). It is used, but barely.

### Unused Tailwind Config Paths
- **`tailwind.config.ts` line 5**: `"./pages/**/*.{js,ts,jsx,tsx,mdx}"` references a `pages/` directory that does not exist (this is an App Router project, not Pages Router). Similarly, `"./components/**/*.{js,ts,jsx,tsx,mdx}"` references a `components/` directory that does not exist.

### Stale Migration File
- **`supabase-migrations-sprint7.sql`**: Sits at the project root. Contains a TODO comment (line 12) for a feature that may or may not have been completed. Should be moved to a `migrations/` directory or removed if already applied.

---

## 2. Hardcoded Values That Should Be Variables

### `text-orange-900` Used Directly Instead of Theme Variable
Five occurrences of the hardcoded Tailwind class `text-orange-900` that bypass the theme system entirely. If the theme were switched from orange to blue/purple, these would remain orange:
- `app/analytics/page.tsx` line 355: AI Insights text
- `app/report/[code]/page.tsx` line 341: Cluster summary question
- `app/session/[code]/page.tsx` line 141: AI suggested answer text
- `app/session/[code]/page.tsx` line 261: Cluster title (highlighted state)
- `app/session/[code]/page.tsx` line 309: Cluster summary question

**Recommendation**: Replace with `text-theme-primary-hover` or a new `--theme-text-on-subtle` CSS variable, since these all appear on `bg-theme-primary-subtle` backgrounds.

### `text-gray-*` vs `text-slate-*` Inconsistency
The project uses `slate-*` as its neutral palette throughout, but several files use `gray-*` instead:
- `app/layout.tsx` line 16: `text-gray-900` (should be `text-slate-900`)
- `app/create/page.tsx` lines 179, 195, 224: `text-gray-400` (should be `text-slate-400`)
- `app/report/[code]/page.tsx` lines 350, 370: `text-gray-800` (should be `text-slate-800`)
- `app/report/[code]/page.tsx` lines 394, 418: `text-gray-600` (should be `text-slate-600`)

### `divide-gray-100` vs `divide-slate-100`
- `app/analytics/page.tsx` line 389: `divide-gray-100`
- `app/report/[code]/page.tsx` lines 343, 364: `divide-gray-100`

### Hardcoded `boxShadow` Inline Styles
The shadow `0 25px 50px -12px rgba(0,0,0,0.4)` is hardcoded inline on cards in:
- `app/page.tsx` lines 73, 94
- `app/login/page.tsx` line 57
- `app/signup/page.tsx` line 75

Could be a Tailwind extend or a CSS variable for consistency.

---

## 3. Duplicated Code

### Mesh Gradient Background (Landing Pages)
The exact same 8-blob mesh gradient background is copy-pasted across three files:
- `app/page.tsx` lines 42-51
- `app/login/page.tsx` lines 39-47
- `app/signup/page.tsx` lines 57-65

**Recommendation**: Extract into a `<MeshBackground />` component.

### Mesh Gradient Header Bar
The same 4-blob header gradient is repeated across five files:
- `app/create/page.tsx` lines 133-137
- `app/analytics/page.tsx` lines 163-167
- `app/join/[code]/page.tsx` lines 341-345
- `app/present/[code]/page.tsx` lines 191-194
- `app/report/[code]/page.tsx` lines 143-147

(Plus the session page uses the same pattern.)

**Recommendation**: Extract into a `<MeshHeader />` component.

### Sidebar Component
The entire sidebar (live/upcoming/past sessions, recurring group expand/collapse, navigation links) is duplicated nearly identically across:
- `app/analytics/page.tsx` lines 182-277
- `app/report/[code]/page.tsx` lines 164-266
- `app/session/[code]/page.tsx` (similar pattern)

Each copy includes the same `expandedSeries` state, the same `recurringMap` logic, and the same navigation links. This is ~100 lines duplicated three times.

**Recommendation**: Extract into a `<Sidebar />` component with props for active page.

### Loading Spinner SVG
The same inline spinner SVG is repeated in:
- `app/create/page.tsx` lines 322-325
- `app/login/page.tsx` lines 102-105
- `app/signup/page.tsx` lines 154-157
- `app/join/[code]/page.tsx` lines 513-516
- `app/session/[code]/page.tsx` (extracted as `Spinner` component locally, good)

**Recommendation**: The session page already has a local `Spinner` component. Promote it to a shared component.

### `inputClasses` String
The same Tailwind class string for form inputs is defined in:
- `app/create/page.tsx` line 127
- `app/login/page.tsx` line 34
- `app/signup/page.tsx` line 52

### `ClusterWithQuestions` Type
Defined identically in:
- `app/join/[code]/page.tsx` line 7
- `app/present/[code]/page.tsx` line 7
- `app/report/[code]/page.tsx` line 7
- `app/session/[code]/page.tsx` line 7

**Recommendation**: Export from `lib/supabase.ts`.

### Duplicate Mobile Sidebar Backdrop
In `app/analytics/page.tsx`, there are TWO mobile sidebar backdrop overlays:
- Line 180: `bg-black/30 z-10 sm:hidden`
- Line 279-284: `bg-black/20 z-10 sm:hidden`

The second one (after `</aside>`) is a duplicate with a different opacity. Same issue in `app/session/[code]/page.tsx`.

---

## 4. Inconsistencies

### Neutral Color Palette: `gray-*` vs `slate-*`
The project overwhelmingly uses `slate-*` for neutrals (as documented in `docs/color-palette-orange.md`), but `gray-*` leaks in at ~11 locations (see Section 2 above). These are visually different colors in Tailwind.

### Error Banner Styling
Two different error banner styles are used:
- **Dark background** (landing/login): `bg-rose-500/15 border-rose-400/20 text-rose-200` (page.tsx line 65)
- **Light background** (create/signup): `bg-rose-50 border-rose-200 text-rose-700` (create/page.tsx line 154)

This is arguably intentional (dark vs light context), but the patterns are inconsistent in their border radius and padding.

### "Not Found" Page Styling
Each page handles "not found" differently:
- `join/[code]/page.tsx`: Full-page centered with "Go Back" button styled `bg-gray-900`
- `present/[code]/page.tsx`: Simple centered `<p>` with no navigation
- `report/[code]/page.tsx`: Simple centered `<p>` with no navigation

### `useEffect` with `[session]` Dependency
In `app/join/[code]/page.tsx` line 204 and `app/present/[code]/page.tsx` line 137, the realtime subscription `useEffect` depends on `[session]` (the full object). Since `session` is a state object that gets replaced on every update, this could cause the subscription to tear down and re-subscribe on every session state change. Should depend on `session?.id` instead.

---

## 5. Old/Stale References

### Wrong Doc Filename in CSS Comment
- **`globals.css` line 12**: References `docs/color-palette-purple.md` (singular) but the actual file is `docs/color-palette-purples.md` (plural).

### Outdated Sprint Plan
- **`docs/sprint-plan.md`**: Contains an extensive sprint plan with checkboxes. Many items under "What's Missing for MVP" are now implemented (presentation view, moderation, export, etc.). The checklist is significantly out of date.

### TODO in Migration File
- **`supabase-migrations-sprint7.sql` line 12**: Contains a TODO about adding a user indicator to the session header. This is stale planning commentary left in a SQL file.

### Placeholder Text in Color Palette Docs
- **`docs/color-palette-orange.md`**: References Tailwind classes like `bg-orange-950` and `shadow-orange-950/50` that are NOT actually used in the codebase (the theme system uses CSS variables instead). The doc predates the theme variable system and is partially outdated.

### "Coming Soon" Placeholders in Sidebar
Three files contain placeholder sidebar items:
- `Profile (coming soon)` and `Settings (coming soon)` in `app/analytics/page.tsx`, `app/report/[code]/page.tsx`, and `app/session/[code]/page.tsx`.

These are visible to users and may give an impression of incompleteness.

---

## 6. Module Organization

### `app/session/[code]/page.tsx` — ~1000+ Lines
This is the largest file in the project. It contains:
- `ChevronIcon` component
- `Spinner` component
- `QuestionRow` component (~120 lines)
- `ClusterCard` component (~100 lines)
- Main `SessionPage` component (~700+ lines)
- Full sidebar logic, header, moderation queue, cluster management, reply handling, session controls

**Recommendation**: Even without restructuring the main component, `ChevronIcon`, `Spinner`, `QuestionRow`, and `ClusterCard` could be extracted to separate files.

### `app/analytics/page.tsx` — ~473 Lines
Contains the full sidebar, all metrics computation, chart rendering, and the AI insight generator. The sidebar alone is ~100 lines that are duplicated elsewhere.

### `app/report/[code]/page.tsx` — ~435 Lines
Similar to analytics: sidebar + report content in one file.

### No `components/` Directory
The project has zero shared components. Every page is a self-contained monolith. Common patterns (mesh gradients, headers, sidebars, spinners, error banners) are copy-pasted.

---

## 7. Type Safety

### `any` Type in `lib/auth.ts`
- **Line 20**: `callback: (user: any) => void` — The `user` parameter should be typed as `User | null` from `@supabase/supabase-js`.

### Missing `user_id` in Session Type
- **`lib/supabase.ts`**: The `Session` type does not include `user_id`, but it is written to the database in `app/create/page.tsx` line 82 (`...(userId ? { user_id: userId } : {})`). The field exists in the database (per migration file) but is missing from the TypeScript type.

### Type Assertions on Supabase Payloads
Throughout the realtime subscription handlers, `payload.new` is cast with `as Question`, `as Cluster`, etc. Supabase's `payload.new` is typed as `Record<string, any>`. This is a known Supabase SDK limitation, but it means no compile-time validation of the shape.

### Untyped API Response in Analytics
- **`app/analytics/page.tsx` line 110**: The `fetch('/api/suggest-answer', ...)` call result (`res`) is checked for `!res.ok` but the response body is never parsed or used. The entire API call appears to be a workaround/hack to trigger something, and the actual insights are computed locally.

---

## Summary of Safe Cleanup Actions

The following changes are safe and non-breaking:
1. Remove the stale CSS comment referencing `docs/color-palette-purple.md` (should be `color-palette-purples.md`)
2. Remove the unused `.text-balance` utility from `globals.css`
3. Remove the duplicate mobile sidebar backdrop in `app/analytics/page.tsx` (lines 279-284)
4. Fix `text-orange-900` hardcoded references to use theme-aware styling (in analytics, report, session pages)
5. Fix `text-gray-*` / `divide-gray-*` inconsistencies to use `slate-*`
