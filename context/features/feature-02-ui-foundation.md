# Feature 02 — UI foundation

**Depends on:** 01
**Status:** done

## Goal

The dispatch console's skin: the token palette, the three typefaces, the
app shell. Everything built afterwards inherits from this, so it is worth
getting exactly right rather than approximately right.

`../ui-context.md` is the specification for this feature. Read it in
full. It is a protected file — implement it, do not edit it.

## In scope

- The complete color token set as CSS custom properties.
- Tailwind v4 `@theme` wiring so tokens are usable as utility classes.
- Archivo, Barlow Condensed, and JetBrains Mono via `next/font`.
- The type scale.
- The app shell: 220px left nav, 40px top status bar.
- `components/ui/` primitives.
- Delete the `create-next-app` boilerplate page.

## Out of scope

- Real nav destinations. Nav items link to placeholder pages.
- Real status bar counters — placeholder mono values for now.
- The score meter. That is feature 05, deliberately separate.

## Implementation

### Tokens

Every color from `../ui-context.md`'s table becomes a CSS custom property
on `:root` in `app/globals.css`, then is exposed through Tailwind v4's
`@theme` block so components use utility classes rather than inline
styles.

**Dark only. No light mode.** Do not add a `prefers-color-scheme` block
or a theme toggle — the design deliberately commits to one look.

### Fonts

Three faces, three jobs, no overlap:

| Face | Variable | Used for |
| --- | --- | --- |
| Archivo | `--font-sans` | Headings and prose |
| Barlow Condensed | `--font-condensed` | Uppercase labels, column headers, chips |
| JetBrains Mono | `--font-mono` | Every value the system computed |

Load via `next/font/google` in `app/layout.tsx` with CSS variable output.
JetBrains Mono needs `font-variant-numeric: tabular-nums` — the column
alignment is the entire point of a board.

### The type scale

Six tokens: `display` 40/44, `title` 24/30, `heading` 17/24, `body`
15/24, `data` 13/18, `label` 11/14. Define them in `@theme`, not as
one-off classes.

### The shell

`app/(console)/layout.tsx`:

- Fixed 220px left nav with a right border, grouped into sections per
  `../ui-context.md`'s information architecture.
- 40px top status bar spanning the content area, mono counters.
- Content scrolls beneath both.

**Only show nav items for screens that exist.** Anything not yet built is
absent from the nav, not rendered disabled. The nav grows as features
land.

### Primitives

`components/ui/` — Button, Chip, Field, Modal, EmptyState, Skeleton,
StatusChip. Presentation only, no business logic.

Buttons carry no brand color: `--text-primary` on `--bg-raised` with
`--border-strong`. Emphasis comes from weight and contrast. Focus rings
are `--text-primary`, 2px, 2px offset — achromatic so they never collide
with a verdict color.

Radii: `rounded-sm` inline and inputs, `rounded` cards and rows,
`rounded-md` modals.

## Files

- `app/globals.css`
- `app/layout.tsx`
- `app/(console)/layout.tsx`
- `components/shell/Nav.tsx`
- `components/shell/StatusBar.tsx`
- `components/ui/*.tsx`
- delete the scaffold content in `app/page.tsx`

## Verification

1. The shell renders dark, with the nav and status bar in position.
2. All three typefaces are visibly distinct on screen — a heading, an
   uppercase label, and a mono figure side by side.
3. Mono figures in a column align on the decimal. If they do not,
   `tabular-nums` is not applied.
4. **Zero `#` hex literals outside the `@theme` token block in
   `app/globals.css`.** That block is the one place raw colour values are
   defined — it is the token layer, not a component reading a colour.
   Every other file (components, pages, `lib/`) must be hex-free. This is
   the check for invariant 8.
5. Tab through the shell — focus rings are visible and achromatic on
   every surface.
6. `npm run build` passes.

## Notes

- Transitions are 120ms, on hover and focus only. No page transitions, no
  entrance animations.
- Empty states are a Barlow Condensed label, one Archivo sentence, and
  the action that fills the space. Never an illustration.

### Implementation notes (what actually happened)

- Tokens live in a Tailwind v4 `@theme` block in `app/globals.css`:
  palette as `--color-*` (→ `bg-*` / `text-*` / `border-*` utilities),
  `--font-sans` / `--font-condensed` / `--font-mono`, the six `--text-*`
  scale tokens with matching `--text-*--line-height`, and radius
  overrides (`--radius-sm: 2px`, `--radius: 4px`, `--radius-md: 6px`).
- `.eyebrow` and `.heading` helper classes in `globals.css` `@layer
  components` — the Barlow Condensed uppercase label treatment and the
  Archivo 600 / `-0.02em` heading treatment, both used everywhere.
- `font-variant-numeric: tabular-nums` is applied globally to anything
  matching `[class*="font-mono"]`, so every mono value gets tabular
  figures without each call site remembering.
- `prefers-reduced-motion: reduce` kills transitions/animations globally
  in `globals.css`.
- `lib/cn.ts` — a 3-line class-name joiner, no `clsx` dependency.
- Fonts loaded in `app/layout.tsx` via `next/font/google`
  (`Archivo`, `Barlow_Condensed` weights 400/500/600, `JetBrains_Mono`).
- `components/shell/PagePlaceholder.tsx` — shared title + `EmptyState`
  wrapper for the pre-feature console screens. Replaced wholesale as
  features ship.
- Nav shows only in-scope screens: Discover (Job feed, Scan runs),
  Pipeline (Tracker, Follow-ups), Studio (CV & variants, Application
  emails), and Profile & preferences in the footer. `app/page.tsx`
  redirects `/` → `/feed`.
- `Field` and `Modal` are `"use client"` (`useId`, Esc handler / portal);
  `Button`, `Chip`, `StatusChip`, `EmptyState`, `Skeleton` stay server
  components.

## Verification — result

1. Shell renders dark: 220px nav with right border and grouped sections,
   40px status bar with mono counters, content scrolls beneath both.
   Screenshotted at 1280×800.
2. Three typefaces visibly distinct: "Job feed" (Archivo) / "DISCOVER",
   "NO JOBS YET" (Barlow Condensed) / "0 live · 0 overdue · 0 due today"
   (JetBrains Mono) all on screen together.
3. `tabular-nums` applied via the global `[class*="font-mono"]` rule.
4. Hex check: only the 14 `@theme` token definitions in `globals.css`
   contain `#`, each matching the `ui-context.md` table. `app/`,
   `components/`, `lib/` are otherwise hex-free.
5. Focus ring is a global `:focus-visible` rule — 2px solid
   `--color-text-primary`, 2px offset, achromatic.
6. `npm run build` passes (11 routes). `npm run lint` clean.
