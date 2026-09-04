# UI Context — LOAM-Inspired Menswear System (UI/UX Pro Max Enhanced)

>
> Purpose: This document translates the brand's visual language and UX interaction rules into implementation standards across the application.
> Primary directive: Reshape the website so its UI/UX feels minimal, masculine, editorial, utilitarian, quietly premium, and completely natural to interact with. Preserve all existing backend logic, APIs, Razorpay payment flows, Clerk auth, and seller portals.

---

## 1. Design Direction

The target aesthetic is **bold, minimal, masculine, editorial, utilitarian, and quietly premium**.
The visual language feels like an independent modern menswear label rather than a conventional e-commerce template.

### Core Characteristics
- **Strong editorial typography**: Large, confident serif headlines, clean sans-serif UI/body copy, small monospaced metadata labels.
- **Mineral & Ink palette**: Warm off-white / mineral background (`#F0EEE8`), deep green-black ink (`#18221F`) for text and dark sections, acid/chartreuse green (`#D8EF4A`) as a deliberate accent.
- **Large photography with restrained treatment**: Desaturated, tall portrait aspect ratios (`aspect-[.82]`), warm neutral backgrounds.
- **Generous vertical whitespace**: 80–128px desktop section padding (`py-24 md:py-32`).
- **Thin borders & underlines**: 1px opacity-based borders (`rgba(24,34,31,.15)`) used as structural separators instead of shadows.
- **Asymmetric editorial compositions**: `0.82fr / 1.18fr` hero splits, `1.15fr / .85fr / 1fr` product grids, `0.7fr / 1.3fr` journal entries.
- **Square geometry**: Border radius 0 (`rounded-none`) across all controls, buttons, inputs, product containers, and cards.
- **Natural interaction UX**: Touch targets $\ge 44\times 44\text{px}$, visible focus indicators (`outline: 2px solid var(--ink)`), immediate tactile micro-feedback (toasts, drawer reveals, smooth state transitions), and `prefers-reduced-motion` compliance.

---

## 2. Color System

Use CSS variables/tokens throughout the application. Components reference tokens rather than hardcoded hex values.

| Role | CSS Variable | Value | Usage |
|---|---|---|---|
| Primary background | `--bg-base` | `#F0EEE8` | Main page background |
| Dark ink | `--ink` / `--text-primary` | `#18221F` | Primary text, footer, dark sections, strong borders |
| Dark surface | `--bg-dark` | `#202D29` | Editorial/story sections |
| Accent | `--accent` | `#D8EF4A` | Highlights, CTAs, promo strip, selected states |
| Accent muted | `--accent-muted` | `#879D22` | Metadata, secondary accent text, dividers |
| Image warm gray | `--surface-image` | `#D9D5CC` | Image placeholder/background |
| Hero neutral | `--surface-hero` | `#B5AAA0` | Hero image fallback/background |
| Light text | `--text-on-dark` | `#E8E5DC` | Text on dark surfaces |
| Primary text | `--text-primary` | `#18221F` | Headings and primary copy |
| Secondary text | `--text-secondary` | `rgba(24,34,31,.70)` | Body/supporting copy |
| Muted text | `--text-muted` | `rgba(24,34,31,.55)` | Metadata and secondary information |
| Light border | `--border` | `rgba(24,34,31,.15)` | Structural separators |
| Medium border | `--border-strong` | `rgba(24,34,31,.20)` | Product information rules |
| Dark border | `--border-on-dark` | `rgba(232,229,220,.18)` | Dark-section separators |

### Palette & Contrast Rules
- `#F0EEE8` is the default page ground.
- `#18221F` is primary ink and strongest structural color, ensuring $\ge 4.5:1$ contrast against `#F0EEE8`.
- `#202D29` is reserved for major dark editorial sections with `#E8E5DC` text.
- `#D8EF4A` is the signature acid green accent used for highlights, CTAs, promo strips, and selected states.
- `#879D22` is used for metadata, annotations, and `///` dividers.
- Do not introduce blue as a primary brand color.

---

## 3. Typography

Three-level typography system:

| Role | Font | Variable | CSS Class |
|---|---|---|---|
| Editorial / display | Instrument Serif | `--font-display` | `.serif` |
| UI / body | DM Sans | `--font-sans` | default `font-sans` |
| Metadata / system | DM Mono | `--font-mono` | `.mono` |

### Font Roles & Usage
- **Instrument Serif**: Hero headlines (`clamp(4.5rem, 10vw, 9rem)`), section titles (`text-6xl` to `text-8xl`), brand wordmark (`LOAM.`), pull quotes, large statement copy. Negative tracking (`-.055em`) and tight leading (`.76`–`.90`).
- **DM Sans**: Navigation, buttons, body copy, product UI, forms, prices in interface grids, utility controls, general interface text. Minimum body size `14px`–`16px` with `1.5`–`1.7` line height.
- **DM Mono**: Small metadata (`10px`), product material/fabric details (`dry cotton / charcoal`), collection numbering (`no. 04`), editorial labels (`01 / THE UNIFORM`), status/system information, uppercase annotations with wide tracking (`.2em`).

---

## 4. Interaction, Motion & Accessibility (UI/UX Pro Max)

### Touch & Target Sizing
- All interactive controls (buttons, icon triggers, nav items, wishlist hearts) MUST meet a minimum touch target size of **$44\times 44\text{px}$** (`min-h-[44px] min-w-[44px]` or padding `p-3`).
- Space adjacent touch targets by at least **8px** to prevent mis-taps on mobile viewports.

### Focus & Accessibility
- Visible focus rings MUST be present on all keyboard-navigable controls: `outline: 2px solid var(--ink); outline-offset: 2px` (`broadsheet-focus`).
- Icon-only buttons MUST include descriptive `aria-label` attributes (`"Open shopping bag"`, `"Search catalog"`, `"Add to wishlist"`).
- All images MUST include meaningful `alt` text describing the garment or editorial scene.

### Motion & Tactile Feedback
- **Transitions**: Interactions use smooth `180ms`–`300ms` `cubic-bezier(0.2, 0.7, 0.2, 1)` easing. Nothing bounces.
- **Micro-feedback**: Clicking "Add to bag", wishlisting an item, or subscribing to the newsletter yields immediate feedback (toast notification + drawer reveal).
- **Reduced Motion**: All CSS animations (`.rise`, `.marquee`, transitions) strictly respect `@media (prefers-reduced-motion: reduce)`.

---

## 5. Geometry & Radius

- **Default border radius**: `0px` (`rounded-none`).
- **Buttons**: Square / rectangular, tight padding, uppercase tracked text.
- **Inputs**: Transparent background, bottom border only (`border-b border-[#18221f]`).
- **Product image containers**: Square corners (`aspect-[.82]`).
- **Modals / Drawers**: Square corners, crisp hairline borders.

---

## 6. Layout & Key Sections

### Promotional Strip
- Narrow `#D8EF4A` accent strip above header. Text: `#18221F`, centered, uppercase bold DM Sans, `10px`, tracking `.24em`.

### Header / Masthead
- Desktop: Left navigation links (`SHOP`, `THE NOTES`, `JOURNAL`, `AI CONCIERGE ✦`), center italic serif wordmark (`LOAM.`), right utility controls (`Search`, `Account/Seller`, `Bag`).
- Mobile: Left menu toggle, center wordmark, right utility icons. `1px` bottom border (`border-b border-[#18221f]/15`).

### Hero Section
- Desktop: Asymmetric 2-column split (`0.82fr / 1.18fr`). Left: Mono label, display serif headline (`Dress with intent.`), description, circular scroll button. Right: Tall portrait hero image (`/asset/loam-hero.webp`) with look metadata tag.

### Marquee Strip
- Continuous 22s linear marquee loop with `///` dividers in `#879D22`.

### Product Grid
- 3-column asymmetric grid (`1.15fr / .85fr / 1fr`). Tall portrait aspect ratio (`.82`), wishlist heart button, slide-up hover "Add to bag" CTA in `#D8EF4A`, mono material and price breakdown.

### Editorial Story & Journal Sections
- Dark split section (`bg-[#202d29]`) for brand storytelling. 2-column Field Notes section (`0.7fr / 1.3fr`) with article cards and arrow links.

### Newsletter Dispatch & Footer
- Centered `#D8EF4A` section with bottom-border email input field. Dark endpoint footer (`bg-[#18221f]`, text `#F0EEE8`) with serif `LOAM.` logo and mono copyright.

---

## 7. Implementation Directives & Non-Negotiables

1. All custom property tokens live in `app/globals.css`.
2. Interactive controls adhere to minimum 44px touch targets and visible focus indicators.
3. Every new page and component must adhere strictly to the LOAM menswear visual and UX system.
4. Preserved: All existing backend APIs, Razorpay payment flows, Clerk auth, AI concierge logic, order management, database schemas, and routes.
