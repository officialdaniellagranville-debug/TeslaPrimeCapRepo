# TeslaPrimeCapital — Phase 2 Design System

> **Version:** 2.0.0-draft
> **Last Updated:** 2025-01
> **Status:** Production Specification
> **Audience:** Frontend Engineers, UI Engineers, Design System Maintainers

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography System](#3-typography-system)
4. [Spacing System](#4-spacing-system)
5. [Border & Radius System](#5-border--radius-system)
6. [Component Tokens](#6-component-tokens)
7. [Layout System](#7-layout-system)
8. [Animation & Motion](#8-animation--motion)
9. [Icon System](#9-icon-system)
10. [Responsive Breakpoints](#10-responsive-breakpoints)
11. [Dark Theme Specification](#11-dark-theme-specification)
12. [Tailwind Configuration](#12-tailwind-configuration)
13. [Accessibility Requirements](#13-accessibility-requirements)

---

## 1. Design Philosophy

### 1.1 Dark Premium Aesthetic

TeslaPrimeCapital's visual identity is rooted in a dark, premium aesthetic directly inspired by the Tesla automotive brand. Every surface, card, and interactive element is designed to communicate institutional-grade financial management. The dark palette is not a secondary or alternate theme — it is the singular, canonical visual expression of the platform. This choice eliminates theme-switching complexity and ensures pixel-perfect consistency across every viewport and device. The near-black backgrounds create a cinematic canvas that allows the red accent color to function as a powerful focal point, drawing the user's eye to calls-to-action, critical data points, and navigational indicators. The design language borrows from Tesla's own digital properties: expansive negative space, razor-sharp typography, and an unwavering commitment to minimal ornamentation. Every decorative element must earn its place; if it does not serve an informational or interactive purpose, it is removed.

### 1.2 Trust-Signaling Through Professional Design

As a managed investment plan platform, TeslaPrimeCapital must immediately establish credibility and trust with every visitor. The design system achieves this through several deliberate strategies. First, typographic hierarchy is strictly enforced — headings carry authoritative weight through the Poppins family at 600–700 weight, while body content remains highly legible via Rubik at 400–500 weight. Second, data presentation follows financial industry conventions: monospaced numerals for financial figures, consistent decimal alignment, and color-coded performance indicators (green for gains, red for losses, amber for warnings). Third, interactive elements provide immediate and unambiguous feedback — buttons respond to hover and press states, form fields validate inline with clear error messaging, and navigation elements maintain persistent active states. Fourth, generous whitespace and structured grid layouts convey a sense of order and meticulous organization, reinforcing the perception that the platform itself is as disciplined as the investment strategies it manages.

### 1.3 Mobile-First Approach

All layout and component decisions begin at the smallest viewport (320px) and progressively enhance upward. This methodology ensures that the core experience — viewing investment plans, checking portfolio performance, initiating transactions — is fully functional on mobile devices without reliance on desktop-specific patterns. Responsive behavior is not an afterthought applied via media query overrides; it is the foundational design methodology. Components are designed in their mobile configuration first, then adapted for tablet and desktop contexts. Navigation collapses into a hamburger menu on mobile, cards stack vertically, data tables transform into card-based layouts, and modals become full-screen overlays. The mobile-first approach also enforces strict touch target sizing (minimum 44×44px) and thumb-friendly placement of primary actions within the lower half of the viewport.

### 1.4 Accessibility Standards (WCAG 2.1 AA)

TeslaPrimeCapital targets WCAG 2.1 Level AA compliance as a minimum baseline. All text meets or exceeds the 4.5:1 contrast ratio requirement for normal text and 3:1 for large text (18px+ or 14px+ bold) against their respective backgrounds. Interactive elements provide visible focus indicators using a 2px solid ring with a 2px offset in the primary red color, ensuring keyboard navigability is not only functional but discoverable. Color is never used as the sole means of conveying information — status indicators always include accompanying icons or text labels. All images and icons carry appropriate ARIA attributes, and dynamic content updates (toasts, live portfolio values) leverage ARIA live regions. The `prefers-reduced-motion` media query is respected throughout, replacing animations with instant state changes for users who have enabled this setting at the OS level.

---

## 2. Color System

### 2.1 Core Brand Palette

The TeslaPrimeCapital color system is anchored in a red-and-black palette that directly references Tesla's brand identity. Black serves as the dominant visual weight, establishing gravitas and sophistication. Red functions as the singular accent color, used sparingly to mark interactivity, urgency, and brand presence.

| Token Name | Hex | HSL | RGB | Tailwind Class | Usage |
|---|---|---|---|---|---|
| `--color-primary` | `#DC2626` | `0 84% 50%` | `220, 38, 38` | `red-600` | Primary actions, CTAs, active states |
| `--color-primary-dark` | `#B91C1C` | `0 79% 42%` | `185, 28, 28` | `red-700` | Primary hover, pressed states |
| `--color-primary-darker` | `#991B1B` | `0 72% 35%` | `153, 27, 27` | `red-800` | Primary active, deep emphasis |
| `--color-primary-light` | `#EF4444` | `0 84% 60%` | `239, 68, 68` | `red-500` | Error states, destructive actions |
| `--color-primary-50` | `#FEF2F2` | `0 100% 98%` | `254, 242, 242` | `red-50` | Subtle red tint backgrounds (rare) |
| `--color-primary-100` | `#FEE2E2` | `0 100% 95%` | `254, 226, 226` | `red-100` | Error background tint |
| `--color-primary-200` | `#FECACA` | `0 100% 91%` | `254, 202, 202` | `red-200` | Error border tint |

### 2.2 Background & Surface Palette

| Token Name | Hex | HSL | RGB | Tailwind Class | Usage |
|---|---|---|---|---|---|
| `--color-bg-base` | `#000000` | `0 0% 0%` | `0, 0, 0` | `black` | Page-level base background |
| `--color-bg-elevated` | `#0A0A0A` | `0 0% 4%` | `10, 10, 10` | Custom `neutral-950` | Slightly elevated surfaces |
| `--color-bg-surface` | `#111827` | `220 39% 11%` | `17, 24, 39` | `gray-900` | Card backgrounds, panels |
| `--color-bg-surface-raised` | `#1F2937` | `220 26% 18%` | `31, 41, 55` | `gray-800` | Raised cards, input backgrounds |
| `--color-bg-overlay` | `#374151` | `218 19% 27%` | `55, 65, 81` | `gray-700` | Dropdowns, overlays, hover fills |
| `--color-bg-muted` | `#111827` at 80% opacity | — | — | `gray-900/80` | Backdrop overlays, modal dimming |

### 2.3 Text Color Palette

| Token Name | Hex | RGB | Tailwind Class | Usage |
|---|---|---|---|---|
| `--color-text-primary` | `#FFFFFF` | `255, 255, 255` | `white` | Headings, primary body text, high-emphasis content |
| `--color-text-secondary` | `#9CA3AF` | `156, 163, 175` | `gray-400` | Descriptions, labels, secondary body text |
| `--color-text-muted` | `#6B7280` | `107, 114, 128` | `gray-500` | Placeholders, disabled text, timestamps |
| `--color-text-accent` | `#DC2626` | `220, 38, 38` | `red-600` | Links, accent text, brand references |
| `--color-text-inverse` | `#000000` | `0, 0, 0` | `black` | Text on red/colored backgrounds |

### 2.4 Semantic Color Mapping

| Semantic Role | Token | Hex | Tailwind Class | Context |
|---|---|---|---|---|
| Success | `--color-success` | `#10B981` | `emerald-500` | Positive returns, completed transactions, verified status |
| Success Muted | `--color-success-muted` | `#065F46` | `emerald-800` | Success backgrounds, subtle positive indicators |
| Success Border | `--color-success-border` | `#34D399` | `emerald-400` | Success state input borders |
| Warning | `--color-warning` | `#F59E0B` | `amber-500` | Pending states, risk alerts, expiring soon |
| Warning Muted | `--color-warning-muted` | `#92400E` | `amber-800` | Warning backgrounds |
| Error | `--color-error` | `#EF4444` | `red-500` | Validation errors, failed transactions, critical alerts |
| Error Muted | `--color-error-muted` | `#991B1B` | `red-800` | Error backgrounds |
| Info | `--color-info` | `#3B82F6` | `blue-500` | Informational toasts, tooltips, help text |
| Info Muted | `--color-info-muted` | `#1E3A5F` | `blue-900` | Info backgrounds |

### 2.5 Border Color Tokens

| Token Name | Value | Tailwind Class | Usage |
|---|---|---|---|
| `--border-subtle` | `rgba(255, 255, 255, 0.1)` | `border-white/10` | Card borders, dividers, subtle separators |
| `--border-medium` | `rgba(255, 255, 255, 0.2)` | `border-white/20` | Input borders, prominent dividers |
| `--border-strong` | `rgba(255, 255, 255, 0.3)` | `border-white/30` | Focused inputs, active elements |
| `--border-accent` | `#DC2626` | `border-red-600` | Accent borders, selected items |
| `--border-error` | `#EF4444` | `border-red-500` | Error state borders |

### 2.6 Gradient Specifications

| Gradient Name | CSS Value | Usage |
|---|---|---|
| `--gradient-primary` | `linear-gradient(135deg, #DC2626 0%, #991B1B 100%)` | Primary buttons, hero accents |
| `--gradient-subtle` | `linear-gradient(180deg, #111827 0%, #0A0A0A 100%)` | Section backgrounds, page transitions |
| `--gradient-surface` | `linear-gradient(135deg, #1F2937 0%, #111827 100%)` | Elevated card backgrounds |
| `--gradient-overlay` | `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%)` | Image overlays |
| `--gradient-glow` | `radial-gradient(ellipse at center, rgba(220,38,38,0.15) 0%, transparent 70%)` | Ambient red glow behind featured elements |

### 2.7 Opacity Scale

The design system uses a consistent opacity scale for layered and translucent elements. All opacity values derive from Tailwind's default scale:

| Step | Value | Typical Usage |
|---|---|---|
| 0 | `0%` | Fully hidden |
| 5 | `5%` | Barely perceptible tints |
| 10 | `10%` | Subtle borders, disabled overlays |
| 20 | `20%` | Medium borders, hover backgrounds |
| 30 | `30%` | Strong borders, active states |
| 40 | `40%` | Medium overlays |
| 50 | `50%` | Half-overlay, dimmed content |
| 60 | `60%` | Prominent overlays |
| 70 | `70%` | Strong overlays |
| 80 | `80%` | Modal backdrop dimming |
| 90 | `90%` | Near-opaque overlays |
| 95 | `95%` | Almost opaque, subtle translucency |
| 100 | `100%` | Fully opaque |

---

## 3. Typography System

### 3.1 Font Family Declarations

The typography system employs three distinct font families, each serving a specific communicative role. All fonts are loaded from Google Fonts with `display=swap` to prevent layout shift.

```css
/* Headings — Poppins */
--font-heading: 'Poppins', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;

/* Body Text — Rubik */
--font-body: 'Rubik', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;

/* Editorial/Accent — Merriweather */
--font-editorial: 'Merriweather', ui-serif, Georgia, 'Times New Roman', serif;

/* Monospace/Code — JetBrains Mono (supplemental) */
--font-mono: 'JetBrains Mono', ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
```

### 3.2 Type Scale

All type sizes follow Tailwind's default scale with exact pixel values and recommended line-heights. Letter-spacing values are calibrated for readability against dark backgrounds.

| Token | Tailwind Class | Size (px) | Line Height | Letter Spacing | Font Weight | Usage |
|---|---|---|---|---|---|---|
| `--text-3xs` | `text-[10px]` | 10px | 14px (1.4) | 0.05em | 400 | Legal disclaimers, micro-labels |
| `--text-2xs` | `text-[11px]` | 11px | 16px (1.45) | 0.02em | 500 | Captions, timestamps, badges |
| `--text-xs` | `text-xs` | 12px | 16px (1.33) | 0.02em | 400-500 | Small labels, helper text |
| `--text-sm` | `text-sm` | 14px | 20px (1.43) | 0.01em | 400-500 | Default body text, descriptions |
| `--text-base` | `text-base` | 16px | 24px (1.5) | 0em | 400-500 | Standard body, form inputs |
| `--text-lg` | `text-lg` | 18px | 28px (1.56) | -0.01em | 500 | Subheadings, emphasized body |
| `--text-xl` | `text-xl` | 20px | 28px (1.4) | -0.01em | 600 | Section titles (h3) |
| `--text-2xl` | `text-2xl` | 24px | 32px (1.33) | -0.02em | 600-700 | Page subtitles (h2) |
| `--text-3xl` | `text-3xl` | 30px | 36px (1.2) | -0.02em | 700 | Page titles (h1 on mobile) |
| `--text-4xl` | `text-4xl` | 36px | 40px (1.1) | -0.025em | 700 | Hero headings (h1 on desktop) |
| `--text-5xl` | `text-5xl` | 48px | 48px (1.0) | -0.03em | 700 | Display headings (rare) |
| `--text-6xl` | `text-6xl` | 60px | 60px (1.0) | -0.03em | 700 | Marketing hero (rare) |

### 3.3 Heading Hierarchy

Every heading level has a precisely defined style. Headings use the Poppins font family exclusively and carry progressively tighter letter-spacing as size increases.

| Element | Mobile Style | Desktop Style | Font Family | Weight |
|---|---|---|---|---|
| `h1` | `text-3xl` (30px), leading-tight, tracking-tighter | `text-4xl` (36px), leading-none, tracking-tighter | Poppins | 700 |
| `h2` | `text-2xl` (24px), leading-8, tracking-tight | `text-3xl` (30px), leading-9, tracking-tight | Poppins | 600 |
| `h3` | `text-xl` (20px), leading-7, tracking-tight | `text-2xl` (24px), leading-8, tracking-tight | Poppins | 600 |
| `h4` | `text-lg` (18px), leading-7 | `text-xl` (20px), leading-7 | Poppins | 600 |
| `h5` | `text-base` (16px), leading-6, font-medium | `text-lg` (18px), leading-7 | Poppins | 500 |
| `h6` | `text-sm` (14px), leading-5, font-medium | `text-base` (16px), leading-6 | Poppins | 500 |

### 3.4 Body Text Variants

| Variant | Tailwind Classes | Description |
|---|---|---|
| Body Default | `text-sm text-gray-400 font-normal leading-relaxed font-rubik` | Standard paragraph text for descriptions, summaries |
| Body Large | `text-base text-gray-400 font-normal leading-relaxed font-rubik` | Primary reading content, longer-form text |
| Body Small | `text-xs text-gray-400 font-normal leading-relaxed font-rubik` | Helper text, footnotes, secondary descriptions |
| Body Strong | `text-sm text-white font-medium leading-relaxed font-rubik` | Emphasized body text, key data labels |
| Label | `text-xs text-gray-500 font-medium uppercase tracking-wider font-poppins` | Form labels, section labels, table headers |
| Caption | `text-[11px] text-gray-500 font-medium font-rubik` | Timestamps, metadata, micro-copy |
| Editorial | `text-lg text-gray-300 font-normal leading-relaxed font-merriweather` | Testimonials, featured quotes, marketing copy |
| Numerical | `text-base text-white font-mono tabular-nums` | Financial figures, percentages, portfolio values |
| Numerical Large | `text-2xl text-white font-mono tabular-nums font-semibold` | Hero portfolio value, prominent metrics |

### 3.5 Monospace / Code Font Specifications

Monospace text uses JetBrains Mono (supplemented by system monospace fallbacks). It is reserved for financial figures, transaction IDs, code snippets, and any content requiring character-level alignment. All numerical displays use `font-variant-numeric: tabular-nums` to ensure consistent digit widths. The default size for inline code is `text-sm` with a background of `rgba(255,255,255,0.05)` and `rounded px-1.5 py-0.5` padding. Block code uses `text-sm` with `rounded-lg p-4 bg-gray-900` and `overflow-x-auto`.

---

## 4. Spacing System

### 4.1 Base Unit

The spacing system is built on a **4px base unit**. All spacing values are multiples of this base unit, ensuring visual rhythm and consistency. Tailwind CSS's default spacing scale maps directly to this system, where `1` = 4px, `2` = 8px, `3` = 12px, and so on.

### 4.2 Spacing Scale

| Tailwind Token | Value (px/rem) | Common Usage |
|---|---|---|
| `space-0.5` / `p-0.5` / `m-0.5` | 2px | Tight icon-label gaps |
| `space-1` / `p-1` / `m-1` | 4px | Inline spacing, icon padding |
| `space-1.5` / `p-1.5` / `m-1.5` | 6px | Badge padding, small gaps |
| `space-2` / `p-2` / `m-2` | 8px | Input inner padding, button padding (sm), list item gaps |
| `space-2.5` | 10px | Tight form layouts |
| `space-3` / `p-3` / `m-3` | 12px | Card padding (compact), group spacing |
| `space-4` / `p-4` / `m-4` | 16px | Default card padding, form field gaps, section inner padding |
| `space-5` | 20px | Comfortable form spacing |
| `space-6` / `p-6` / `m-6` | 24px | Card padding (default), section gaps, modal padding |
| `space-8` / `p-8` / `m-8` | 32px | Section vertical padding (mobile), large card padding |
| `space-10` | 40px | Section gaps (desktop) |
| `space-12` / `p-12` | 48px | Section vertical padding (desktop) |
| `space-16` | 64px | Major section separators |
| `space-20` | 80px | Page-level top/bottom padding |
| `space-24` | 96px | Hero section padding |

### 4.3 Component-Specific Spacing Rules

**Cards:**
- Default padding: `p-6` (24px) on all sides
- Compact variant: `p-4` (16px)
- Large/featured variant: `p-8` (32px)
- Internal content gap: `space-y-4` (16px) between child elements
- Card-to-card gap in grids: `gap-6` (24px)

**Sections:**
- Mobile vertical padding: `py-8` to `py-12` (32px–48px)
- Desktop vertical padding: `py-12` to `py-20` (48px–80px)
- Section title to content gap: `mt-6` (24px)
- Between sections: `space-y-16` (64px) or `space-y-20` (80px) at page level

**Form Fields:**
- Label to input gap: `mt-1.5` (6px)
- Input to input vertical gap: `space-y-4` (16px)
- Input horizontal padding: `px-4` (16px)
- Input vertical padding: `py-2.5` to `py-3` (10px–12px)
- Error message to input gap: `mt-1.5` (6px)
- Helper text to input gap: `mt-1` (4px)
- Form group to form group: `space-y-6` (24px)
- Submit button top margin: `mt-8` (32px)

**Buttons:**
- Small: `px-3 py-1.5` (12px horizontal, 6px vertical)
- Default: `px-5 py-2.5` (20px horizontal, 10px vertical)
- Large: `px-8 py-3.5` (32px horizontal, 14px vertical)
- Icon-only (square): `p-2.5` (10px) for 24px icons, `p-2` (8px) for 20px icons
- Button group gap: `gap-3` (12px)

### 4.4 Margin Conventions

- **Page-level margins:** Handled by container max-width; no horizontal margin on the body.
- **Component margins:** Components should NOT export horizontal margins. Spacing between sibling components is the parent's responsibility via flex/grid gap utilities.
- **Section margins:** Sections use vertical padding (`py-*`) rather than margins to maintain consistent background color coverage.
- **Auto margins:** `mx-auto` is used exclusively for centering fixed-width containers and elements. It is not used for alignment within flex or grid contexts (prefer `justify-center`, `items-center`, or `text-center`).

---

## 5. Border & Radius System

### 5.1 Border Radius Scale

| Token | Tailwind Class | Value (px) | Usage |
|---|---|---|---|
| `--radius-none` | `rounded-none` | 0px | Full-bleed elements, dividers |
| `--radius-sm` | `rounded-sm` | 2px | Subtle rounding on small elements |
| `--radius-md` | `rounded-md` | 6px | Buttons, inputs, small cards |
| `--radius-lg` | `rounded-lg` | 8px | Cards, modals, dropdowns |
| `--radius-xl` | `rounded-xl` | 12px | Feature cards, large panels |
| `--radius-2xl` | `rounded-2xl` | 16px | Hero cards, prominent containers |
| `--radius-3xl` | `rounded-3xl` | 24px | Pill-shaped containers, large CTAs |
| `--radius-full` | `rounded-full` | 9999px | Avatars, badges, pills, circular buttons |

### 5.2 Border Width Specifications

| Token | Tailwind Class | Value | Usage |
|---|---|---|---|
| `--border-none` | `border-0` | 0px | Borderless elements |
| `--border-thin` | `border` | 1px | Default card borders, input borders |
| `--border-medium` | `border-2` | 2px | Emphasized borders, focus rings (outer) |
| `--border-thick` | `border-4` | 4px | Rare, decorative use only |

### 5.3 Border Color Rules

All borders on the platform use white with reduced opacity as their base color. This approach ensures borders feel integrated with the dark background rather than appearing as stark, visible lines. The default border color is `border-white/10` (subtle). When an element requires more visual separation, `border-white/20` (medium) is applied. Active or focused elements use `border-white/30` (strong). Accent borders (selected tabs, highlighted cards) use `border-red-600`. Error states use `border-red-500`. Success states use `border-emerald-400`.

### 5.4 Box Shadow Definitions

| Token | Tailwind Class | Value | Usage |
|---|---|---|---|
| `--shadow-sm` | `shadow-sm` | `0 1px 2px 0 rgba(0,0,0,0.3)` | Subtle elevation, input focus |
| `--shadow-md` | `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3)` | Cards at rest, dropdowns |
| `--shadow-lg` | `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -4px rgba(0,0,0,0.4)` | Modals, elevated cards |
| `--shadow-xl` | `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.6), 0 8px 10px -6px rgba(0,0,0,0.4)` | Floating elements, popovers |
| `--shadow-2xl` | `shadow-2xl` | `0 25px 50px -12px rgba(0,0,0,0.7)` | Modals, highest elevation |
| `--shadow-inner` | `shadow-inner` | `inset 0 2px 4px 0 rgba(0,0,0,0.3)` | Inset fields, pressed states |

### 5.5 Glow Effects

Glow effects use box-shadow with colored spread to create an ambient halo around accent elements. These are used sparingly — only on featured cards, active navigation items, and primary CTAs.

| Effect | CSS Value | Usage |
|---|---|---|
| Red Glow (Subtle) | `0 0 20px rgba(220, 38, 38, 0.15)` | Featured card hover, active nav item |
| Red Glow (Medium) | `0 0 40px rgba(220, 38, 38, 0.25)` | Hero CTA hover, highlighted portfolio card |
| Red Glow (Strong) | `0 0 60px rgba(220, 38, 38, 0.35)` | Rare, marketing hero elements only |
| Success Glow | `0 0 20px rgba(16, 185, 129, 0.2)` | Success toast, completed milestone |
| Warning Glow | `0 0 20px rgba(245, 158, 11, 0.2)` | Warning alert emphasis |
| White Glow (Subtle) | `0 0 30px rgba(255, 255, 255, 0.05)` | Elevated surface ambient glow |

---

## 6. Component Tokens

### 6.1 Buttons

Buttons are the primary interactive element and carry the heaviest design token burden. Every button variant must define styles for default, hover, focus-visible, active/pressed, loading, and disabled states.

**Primary Button:**
- Default: `bg-red-600 text-white font-medium rounded-lg px-5 py-2.5 text-sm`
- Hover: `bg-red-700 hover:shadow-[0_0_20px_rgba(220,38,38,0.25)]`
- Focus-visible: `ring-2 ring-red-500 ring-offset-2 ring-offset-gray-900`
- Active/Pressed: `bg-red-800 scale-[0.98]`
- Loading: `opacity-70 cursor-wait` + spinner icon replacing text
- Disabled: `opacity-50 cursor-not-allowed bg-red-600`

**Secondary Button:**
- Default: `bg-transparent text-white border border-white/20 rounded-lg px-5 py-2.5 text-sm font-medium`
- Hover: `border-white/40 bg-white/5`
- Focus-visible: `ring-2 ring-red-500 ring-offset-2 ring-offset-gray-900`
- Active: `bg-white/10 scale-[0.98]`
- Disabled: `opacity-40 cursor-not-allowed`

**Ghost Button:**
- Default: `bg-transparent text-gray-400 rounded-lg px-4 py-2 text-sm font-medium`
- Hover: `text-white bg-white/5`
- Focus-visible: `ring-2 ring-red-500 ring-offset-2 ring-offset-gray-900`
- Active: `bg-white/10`
- Disabled: `opacity-40 cursor-not-allowed`

**Danger Button:**
- Default: `bg-red-500 text-white rounded-lg px-5 py-2.5 text-sm font-medium`
- Hover: `bg-red-600`
- Focus-visible: `ring-2 ring-red-400 ring-offset-2 ring-offset-gray-900`
- Active: `bg-red-700 scale-[0.98]`
- Disabled: `opacity-50 cursor-not-allowed`

### 6.2 Cards

Cards are the foundational container for content grouping. They provide visual boundary definition through background color, borders, and optional shadows.

- **Background:** `bg-gray-800` (standard), `bg-gray-900` (subtle/recessed)
- **Border:** `border border-white/10` (default), `border-white/20` (elevated)
- **Radius:** `rounded-lg` (8px, default), `rounded-xl` (12px, featured)
- **Padding:** `p-6` (default), `p-4` (compact), `p-8` (large)
- **Shadow:** `shadow-md` (resting), `shadow-lg` (hover on interactive cards)
- **Hover (interactive):** `hover:border-white/20 hover:shadow-lg transition-all duration-200`
- **Hover (featured):** `hover:shadow-[0_0_40px_rgba(220,38,38,0.25)] hover:border-red-600/30`
- **Internal gap:** `space-y-4` between child elements

### 6.3 Form Inputs

Form inputs include text inputs, textareas, selects, and custom components like date pickers.

- **Background:** `bg-gray-800` (resting), `bg-gray-700` (focus)
- **Border:** `border border-white/10` (resting), `border-white/30` (focus)
- **Focus Ring:** `focus:ring-2 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-gray-900`
- **Text:** `text-white placeholder-gray-500 text-sm`
- **Padding:** `px-4 py-2.5` (default), `px-3 py-2` (compact)
- **Radius:** `rounded-lg` (8px)
- **Error State:** `border-red-500 focus:ring-red-500` + error message in `text-red-500 text-xs mt-1.5`
- **Disabled State:** `opacity-50 cursor-not-allowed bg-gray-900`
- **Label:** `text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block font-poppins`

### 6.4 Tables

Data tables are used for portfolio holdings, transaction history, and plan comparisons.

- **Container:** `overflow-x-auto rounded-lg border border-white/10`
- **Header Row:** `bg-gray-900` background, `text-xs font-medium text-gray-500 uppercase tracking-wider` for header cells, `px-4 py-3` padding
- **Body Row:** `border-t border-white/5`, `px-4 py-3` padding, `text-sm text-gray-400` default
- **Row Hover:** `hover:bg-white/5` subtle highlight
- **Row Active/Selected:** `bg-red-600/10 border-l-2 border-l-red-600`
- **Numeric Columns:** `text-right font-mono tabular-nums`
- **Status Cells:** Use colored dot + text (e.g., green dot + "Active")

### 6.5 Badges / Pills

Badges provide compact status indicators and category labels.

- **Default (Neutral):** `bg-white/10 text-gray-400 text-xs font-medium px-2.5 py-0.5 rounded-full`
- **Success:** `bg-emerald-500/15 text-emerald-400 border border-emerald-500/20`
- **Warning:** `bg-amber-500/15 text-amber-400 border border-amber-500/20`
- **Error/Danger:** `bg-red-500/15 text-red-400 border border-red-500/20`
- **Info:** `bg-blue-500/15 text-blue-400 border border-blue-500/20`
- **Primary (Brand):** `bg-red-600/15 text-red-400 border border-red-600/20`
- **Size Variants:** `text-[11px] px-2 py-0.5` (small), `text-xs px-2.5 py-0.5` (default), `text-sm px-3 py-1` (large)

### 6.6 Modals / Dialogs

- **Overlay:** `fixed inset-0 bg-black/80 backdrop-blur-sm z-50`
- **Container:** `bg-gray-800 rounded-2xl border border-white/10 shadow-2xl max-w-lg w-full mx-4`
- **Padding:** `p-6` (default), `p-8` (large content)
- **Header:** `flex items-center justify-between mb-6`, title `text-lg font-semibold text-white font-poppins`
- **Close Button:** Ghost button with X icon, `text-gray-400 hover:text-white`
- **Footer:** `flex justify-end gap-3 mt-6 pt-6 border-t border-white/10`
- **Animation:** `animate-in fade-in zoom-in-95 duration-200` (open), `animate-out fade-out zoom-out-95 duration-150` (close)
- **Mobile:** Full-width (`max-w-full mx-0 rounded-none min-h-screen` or bottom sheet)

### 6.7 Toasts / Notifications

- **Container:** Fixed position, `bottom-4 right-4` (desktop), `bottom-0 left-0 right-0` (mobile, stacked)
- **Card:** `bg-gray-800 border border-white/10 rounded-lg shadow-xl p-4 max-w-sm`
- **Icon:** 20px, color matches semantic role (success=emerald, error=red, warning=amber, info=blue)
- **Title:** `text-sm font-medium text-white`
- **Message:** `text-xs text-gray-400 mt-1`
- **Close:** 16px X icon, `text-gray-500 hover:text-white ml-3`
- **Progress Bar (auto-dismiss):** `h-0.5 bg-white/20` at bottom, fills with semantic color
- **Animation:** `slide-in-from-right duration-300` (enter), `slide-out-to-right duration-200` (exit)

### 6.8 Navigation Items

- **Desktop Nav Links:** `text-sm font-medium text-gray-400 hover:text-white transition-colors duration-150 px-3 py-2 rounded-md`
- **Active Nav Link:** `text-white bg-white/5` or `text-red-400` with bottom border indicator
- **Mobile Nav Links:** Full-width, `text-base text-gray-400 hover:text-white hover:bg-white/5 px-4 py-3 rounded-lg`
- **Active Mobile:** `text-white bg-white/5 border-l-2 border-red-600`
- **Sidebar Nav (Dashboard):** Icon + label, `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors`
- **Active Sidebar:** `text-white bg-red-600/10 text-red-400`

---

## 7. Layout System

### 7.1 Container Widths

The layout system uses Tailwind's responsive container utilities with specific max-width constraints.

| Context | Tailwind Classes | Max Width | Description |
|---|---|---|---|
| Content Container | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` | 1280px | Standard page content area |
| Narrow Container | `max-w-3xl mx-auto px-4 sm:px-6` | 768px | Blog posts, single-column forms |
| Wide Container | `max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8` | 1440px | Dashboard layouts, data-heavy pages |
| Full-Width | No container, `w-full` | 100vw | Hero sections, dark atmospheric sections, footer |

The `px-4 sm:px-6 lg:px-8` responsive horizontal padding pattern is the standard across all containers, ensuring content never touches the viewport edge on any device.

### 7.2 Grid Specifications

The layout grid is a **12-column grid** that adapts across breakpoints. Column spans are defined using Tailwind's `col-span-*` utilities.

- **Grid Declaration:** `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6`
- **Gap Values:** `gap-4` (16px, compact), `gap-6` (24px, default), `gap-8` (32px, spacious)
- **Common Layouts:**
  - Two-column: `lg:col-span-6` each
  - Three-column: `lg:col-span-4` each
  - Sidebar + Content: Sidebar `lg:col-span-3`, Content `lg:col-span-9`
  - Sidebar + Content (wide): Sidebar `lg:col-span-4`, Content `lg:col-span-8`
  - Featured + Side panel: Featured `lg:col-span-8`, Side `lg:col-span-4`

### 7.3 Sidebar Layout Specifications (Dashboard)

The dashboard employs a fixed sidebar navigation pattern on desktop that transforms into a slide-out drawer on mobile.

- **Desktop Sidebar Width:** `w-64` (256px)
- **Desktop Sidebar Collapsed Width:** `w-20` (80px, icon-only mode)
- **Sidebar Background:** `bg-gray-900 border-r border-white/10`
- **Sidebar Padding:** `p-4` vertical padding, nav items stacked with `space-y-1`
- **Main Content Offset:** `lg:ml-64` (expanded) or `lg:ml-20` (collapsed)
- **Sidebar Logo Area:** `h-16 flex items-center px-4 border-b border-white/10`
- **Mobile Behavior:** Sidebar is off-screen by default (`-translate-x-full`), triggered via hamburger button. Uses `fixed inset-y-0 left-0 z-40` positioning with `transform transition-transform duration-300 ease-in-out`.
- **Mobile Overlay:** `fixed inset-0 bg-black/60 z-30` when sidebar is open
- **Sidebar Footer:** User avatar + name + role at bottom, separated by `border-t border-white/10`

### 7.4 Stack and Cluster Utilities

The design system provides composable layout primitives for common spacing patterns.

- **Vertical Stack:** `flex flex-col gap-*` — items stacked with consistent vertical gaps. Default gap: `gap-4`.
- **Horizontal Cluster:** `flex flex-wrap gap-*` — items arranged horizontally, wrapping to new lines. Default gap: `gap-3`.
- **Center Stack:** `flex flex-col items-center gap-*` — vertically centered stack.
- **Space Between:** `flex items-center justify-between` — for header bars, card headers with action buttons.
- **Inline Group:** `inline-flex items-center gap-2` — for icon + text pairs, button groups.

---

## 8. Animation & Motion

### 8.1 Design Principles for Motion

Animations on TeslaPrimeCapital serve functional purposes: they provide feedback, indicate state changes, and guide attention. Decorative animation is kept to an absolute minimum. All motion must feel deliberate and fast — the platform should feel responsive and immediate. Animation duration never exceeds 300ms for interactive state changes. Page transitions and complex animations may extend to 500ms but should feel smooth and purposeful.

### 8.2 Transition Durations

| Token | Tailwind Class | Duration | Usage |
|---|---|---|---|
| `--duration-instant` | `duration-75` | 75ms | Micro-interactions, color changes |
| `--duration-fast` | `duration-100` | 100ms | Ripple effects, small state changes |
| `--duration-normal` | `duration-150` | 150ms | Hover transitions, color shifts |
| `--duration-moderate` | `duration-200` | 200ms | Card hover, button press, dropdown open |
| `--duration-slow` | `duration-300` | 300ms | Modal open/close, sidebar slide, page fade |
| `--duration-slower` | Custom `duration-500` | 500ms | Complex page transitions, hero animations |

### 8.3 Easing Functions

| Token | CSS Value | Usage |
|---|---|---|
| `--ease-default` | `ease-in-out` | Standard transitions (color, opacity, background) |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Scale transforms (button press, card lift) |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Enter animations (fade in, slide in) |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exit animations (fade out, slide out) |
| `--ease-bounce` | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Rare, only for playful micro-interactions |

### 8.4 Hover and Focus Transitions

All interactive elements include transition declarations for the properties they animate. Standard pattern:

- **Buttons:** `transition-all duration-200 ease-in-out` — animates background-color, border-color, box-shadow, and transform
- **Links and Nav Items:** `transition-colors duration-150` — animates color only
- **Cards (interactive):** `transition-all duration-200 ease-out` — animates border-color, box-shadow, and transform
- **Inputs:** `transition-colors duration-150, transition-shadow duration-150` — animates border-color and box-shadow independently
- **Toggles and Switches:** `transition-colors duration-200` for track, `transition-transform duration-200` for thumb

### 8.5 Loading Animations

**Skeleton Shimmer:**
Used for content loading placeholders. Applied to `div` elements shaped like the expected content.

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #1F2937 25%,
    #374151 37%,
    #1F2937 63%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 8px;
}
```

Tailwind utility: `animate-pulse bg-gray-700 rounded-lg` as a simpler alternative.

**Spinner:**
- **Small (16px):** Used inline within buttons or text. `border-2 border-white/20 border-t-white rounded-full w-4 h-4 animate-spin`
- **Default (24px):** Used for page-level loading, card loading. `border-2 border-white/20 border-t-white rounded-full w-6 h-6 animate-spin`
- **Large (40px):** Used for full-page loading states. `border-3 border-white/10 border-t-red-600 rounded-full w-10 h-10 animate-spin`

**Progress Bar:**
- Container: `h-1 bg-gray-700 rounded-full overflow-hidden`
- Fill: `h-full bg-red-600 rounded-full transition-all duration-300 ease-out`

### 8.6 Page Transition Approach

Page transitions in Next.js use a subtle fade effect. On route change, the outgoing page fades to `opacity-0` over 150ms while the incoming page fades in from `opacity-0` to `opacity-1` over 200ms. No sliding or scaling is applied to page transitions — the content simply cross-fades, maintaining spatial stability and reducing motion sickness risk. The transition is achieved via Next.js middleware or a layout-level transition wrapper using CSS transitions on opacity with `pointer-events-none` during the transition period.

---

## 9. Icon System

### 9.1 Icon Library

TeslaPrimeCapital uses **Lucide React** as its icon library. Lucide provides a comprehensive set of clean, consistent, and optically balanced icons that align well with the platform's minimal aesthetic. All icons are delivered as React components with full TypeScript support. Lucide icons use a 24×24 viewBox with a 2px default stroke, which is customizable per instance.

Alternative considerations: Heroicons (very similar, also acceptable as a drop-in), Phosphor Icons (more stylistic variety). The decision for Lucide is based on its lightweight tree-shaking, consistent 2px stroke weight, and comprehensive financial/business icon coverage (trending-up, wallet, credit-card, shield, etc.).

### 9.2 Icon Sizing Scale

| Token | Tailwind Class | Size (px) | Usage |
|---|---|---|---|
| `--icon-xs` | `w-4 h-4` | 16px | Inline icons within text, badge icons, close buttons |
| `--icon-sm` | `w-5 h-5` | 20px | Navigation icons (mobile), small action buttons, table action icons |
| `--icon-md` | `w-6 h-6` | 24px | Default size — navigation (desktop), form field icons, card header icons |
| `--icon-lg` | `w-8 h-8` | 32px | Feature icons, empty state illustrations, large action buttons |

### 9.3 Stroke Width

- **Default:** `strokeWidth={1.5}` — used for the majority of icons to maintain a refined, lightweight appearance
- **Emphasis:** `strokeWidth={2}` — used for icons that need stronger visual weight, such as warning indicators, status icons in empty states, or icons displayed at small sizes (16px) where thinner strokes lose legibility
- **Delicate:** `strokeWidth={1}` — rarely used, reserved for decorative icons in marketing contexts at large sizes (32px+)

### 9.4 Color Inheritance Rules

Icons inherit their color from the parent element's `color` CSS property via `currentColor`. This means:

- Icons inside `text-white` containers render as white
- Icons inside `text-gray-400` containers render as gray-400
- Icons inside `text-red-500` containers render as red-500
- Explicit color overrides: Apply `text-*` classes directly to the icon element when it needs a different color from its parent

Icons should **never** use hardcoded `fill` or `stroke` color attributes. All coloring is handled through CSS `color` and the Lucide component's default behavior of applying `currentColor` to the stroke.

### 9.5 Icon Usage Patterns

- **Icon + Label:** `inline-flex items-center gap-2` with icon at `w-4 h-4` or `w-5 h-5` and text at `text-sm`
- **Icon Button:** `p-2 rounded-lg hover:bg-white/5 transition-colors duration-150` with icon at `w-5 h-5`
- **Feature Icon:** Centered in a circular or rounded-square container, `w-12 h-12 rounded-xl bg-red-600/10 flex items-center justify-center` with icon at `w-6 h-6 text-red-400`
- **Empty State Icon:** Large centered icon (`w-12 h-12` or `w-16 h-16`) in `text-gray-600` with descriptive text below

---

## 10. Responsive Breakpoints

### 10.1 Breakpoint Definitions

TeslaPrimeCapital uses Tailwind CSS's default breakpoint system. All responsive design begins at the base (mobile) and progressively enhances at each breakpoint.

| Breakpoint | Tailwind Prefix | Min Width | Typical Device | Primary Layout Strategy |
|---|---|---|---|---|
| Base | (none) | 0px | Mobile phones (portrait) | Single column, stacked, full-width |
| `sm` | `sm:` | 640px | Mobile phones (landscape), small tablets | Two-column grids begin, side-by-side pairs |
| `md` | `md:` | 768px | Tablets (portrait), large phones | Standard tablet layout, sidebar consideration |
| `lg` | `lg:` | 1024px | Tablets (landscape), small laptops | Desktop layouts activate, sidebar appears |
| `xl` | `xl:` | 1280px | Laptops, desktops | Full desktop experience, multi-column |
| `2xl` | `2xl:` | 1536px | Large desktops, external monitors | Max container width reached, wider spacing |

### 10.2 Mobile-Specific Layout Rules

- **Navigation:** Top bar with hamburger menu icon (`<` icon). Sidebar drawer slides in from the left with overlay.
- **Cards:** Single column, full-width with `px-4` page padding. Internal card padding reduces to `p-4` (16px).
- **Form Inputs:** Full-width (`w-full`), stacked vertically with `space-y-4`.
- **Data Tables:** Hidden by default on mobile. Replaced by card-based list layout where each row becomes a card showing key fields. Alternatively, table is placed in horizontal scroll container with sticky first column.
- **Buttons:** Full-width primary CTAs (`w-full`) for single-action forms. Inline buttons remain auto-width.
- **Modals:** Full-screen overlay approach. Modal takes `min-h-screen w-full` with close button at top-right. Bottom sheet pattern is preferred for action sheets.
- **Toasts:** Stacked at bottom of screen, full-width with `mx-4` margin.
- **Typography:** h1 scales to `text-3xl`, h2 to `text-2xl`. No reduction below `text-sm` for body text to maintain readability.
- **Hero Sections:** Full-width images/gradients, stacked content (heading → subtitle → CTA buttons stacked vertically), `py-12` vertical padding.

### 10.3 Tablet Adjustments (md: 768px+)

- **Navigation:** Horizontal top navigation bar may appear for simpler pages. Dashboard sidebar remains as drawer.
- **Cards:** Two-column grid (`grid-cols-2`) for card collections. Card padding returns to `p-6` (24px).
- **Form Layouts:** Two-column form grid for non-sequential fields (e.g., first name + last name side by side).
- **Data Tables:** Horizontal scroll container with all columns visible. Sticky first column if table is wide.
- **Modals:** Centered dialog with `max-w-lg` and rounded corners, no longer full-screen.
- **Typography:** h1 scales to `text-4xl`, h2 to `text-3xl`.

### 10.4 Desktop Multi-Column Layouts (lg: 1024px+)

- **Navigation:** Horizontal top nav for marketing pages. Persistent sidebar for dashboard/app pages.
- **Cards:** Three-column grid (`grid-cols-3`) for standard cards. Feature cards may use asymmetric layouts (8+4, 4+8).
- **Form Layouts:** Sidebar form pattern — form fields on left (9 cols), summary/preview panel on right (3 cols).
- **Data Tables:** Full table with all columns, hover rows, sortable headers. No horizontal scroll needed for standard tables.
- **Modals:** Centered dialog, `max-w-lg` default, `max-w-2xl` for complex content.
- **Spacing:** Section padding increases to `py-16` or `py-20`. Card-to-card gaps increase to `gap-6` or `gap-8`.

---

## 11. Dark Theme Specification

### 11.1 Dark-Only Architecture

TeslaPrimeCapital uses a **dark-only** design approach. There is no light theme toggle, no `prefers-color-scheme` conditional, and no theme-switching mechanism. The dark aesthetic is the definitive visual identity of the platform. This architectural decision simplifies the codebase significantly — no CSS custom property theming layer, no flash-of-unstyled-content (FOUC) prevention, no theme context provider in React, and no theme persistence logic.

All color values defined in this document are the final, production values applied globally. Tailwind's `darkMode` configuration is set to `'class'` as a safety mechanism, but the `dark` class is applied permanently at the root `<html>` element and never removed.

### 11.2 Surface Elevation Hierarchy

In a dark theme, elevation is communicated through **lightness** — higher-elevation surfaces are slightly lighter than their parent surfaces. This creates a visual stacking order without relying solely on shadows (which are less perceptible against dark backgrounds).

| Elevation Level | Background Token | Tailwind Class | Lightness | Usage |
|---|---|---|---|---|
| Level 0 (Base) | `#000000` | `bg-black` | 0% | Page background, `<body>` |
| Level 1 (Sunken) | `#0A0A0A` | `bg-[#0A0A0A]` | 4% | Subtle inset areas, footer background |
| Level 2 (Default Surface) | `#111827` | `bg-gray-900` | 11% | Standard panels, sidebar, table header |
| Level 3 (Raised) | `#1F2937` | `bg-gray-800` | 18% | Cards, inputs, dropdowns |
| Level 4 (Overlay) | `#374151` | `bg-gray-700` | 27% | Hover states, pressed buttons, tooltips |
| Level 5 (Modal) | `#1F2937` + `shadow-2xl` | `bg-gray-800 shadow-2xl` | 18% + shadow | Modals, popovers (shadow adds perceived elevation) |

### 11.3 Text Contrast Ratios

All text-surface color combinations have been verified against WCAG 2.1 AA contrast requirements.

| Text Color | On Surface | Contrast Ratio | Passes AA Normal (4.5:1) | Passes AA Large (3:1) |
|---|---|---|---|---|
| `#FFFFFF` (white) | `#000000` (black) | 21:1 | Yes | Yes |
| `#FFFFFF` (white) | `#0A0A0A` | 19.93:1 | Yes | Yes |
| `#FFFFFF` (white) | `#111827` (gray-900) | 17.4:1 | Yes | Yes |
| `#FFFFFF` (white) | `#1F2937` (gray-800) | 13.6:1 | Yes | Yes |
| `#9CA3AF` (gray-400) | `#000000` (black) | 7.1:1 | Yes | Yes |
| `#9CA3AF` (gray-400) | `#111827` (gray-900) | 5.9:1 | Yes | Yes |
| `#9CA3AF` (gray-400) | `#1F2937` (gray-800) | 4.6:1 | Yes (barely) | Yes |
| `#6B7280` (gray-500) | `#000000` (black) | 4.6:1 | Yes (barely) | Yes |
| `#6B7280` (gray-500) | `#111827` (gray-900) | 3.8:1 | No | Yes |
| `#6B7280` (gray-500) | `#1F2937` (gray-800) | 3.0:1 | No | Yes (barely) |
| `#DC2626` (red-600) | `#000000` (black) | 5.5:1 | Yes | Yes |
| `#DC2626` (red-600) | `#111827` (gray-900) | 4.6:1 | Yes (barely) | Yes |
| `#10B981` (emerald-500) | `#000000` (black) | 8.8:1 | Yes | Yes |
| `#F59E0B` (amber-500) | `#000000` (black) | 10.3:1 | Yes | Yes |

**Critical Note:** `#6B7280` (gray-500) on `#1F2937` (gray-800) yields only a 3.0:1 contrast ratio. This combination is acceptable ONLY for large text (18px+ or 14px+ bold) or decorative/non-essential text. It must NOT be used for body text, labels, or any information-critical content on `gray-800` surfaces. For small text on `gray-800`, use `#9CA3AF` (gray-400) minimum.

### 11.4 Visual Depth Techniques

Beyond surface lightness, the dark theme employs additional techniques to communicate depth:

- **Shadows:** All shadow definitions use black-based values (`rgba(0,0,0,*)`) with higher opacity than light themes (0.3–0.7 range). Shadows are more visible on dark surfaces when the shadow is darker than the surface.
- **Borders:** Subtle white borders (`rgba(255,255,255,0.1)`) define edges where background lightness differences are insufficient.
- **Glow Effects:** Red glow on accent elements creates a sense of energy and interactivity that pure elevation cannot convey.
- **Backdrop Blur:** `backdrop-blur-sm` (4px) or `backdrop-blur` (8px) on overlay elements (modals, mobile nav) creates frosted-glass depth that reinforces z-axis layering.

---

## 12. Tailwind Configuration

### 12.1 tailwind.config.ts Structure

The following is the complete `tailwind.config.ts` structure for TeslaPrimeCapital Phase 2. This configuration extends Tailwind's default theme with project-specific design tokens and defines custom animations and utilities.

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
          950: "#450A0A",
        },
        surface: {
          base: "#000000",
          sunken: "#0A0A0A",
          DEFAULT: "#111827",
          raised: "#1F2937",
          overlay: "#374151",
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.1)",
          medium: "rgba(255, 255, 255, 0.2)",
          strong: "rgba(255, 255, 255, 0.3)",
        },
      },
      fontFamily: {
        heading: [
          "'Poppins'",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "'Segoe UI'",
          "sans-serif",
        ],
        body: [
          "'Rubik'",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "'Segoe UI'",
          "sans-serif",
        ],
        editorial: [
          "'Merriweather'",
          "ui-serif",
          "Georgia",
          "'Times New Roman'",
          "serif",
        ],
        mono: [
          "'JetBrains Mono'",
          "ui-monospace",
          "'Cascadia Code'",
          "'Fira Code'",
          "monospace",
        ],
      },
      fontSize: {
        "3xs": ["10px", { lineHeight: "14px", letterSpacing: "0.05em" }],
        "2xs": ["11px", { lineHeight: "16px", letterSpacing: "0.02em" }],
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
        112: "28rem",
        128: "32rem",
      },
      borderRadius: {
        4: "1rem",
      },
      boxShadow: {
        glow: "0 0 20px rgba(220, 38, 38, 0.15)",
        "glow-md": "0 0 40px rgba(220, 38, 38, 0.25)",
        "glow-lg": "0 0 60px rgba(220, 38, 38, 0.35)",
        "glow-success": "0 0 20px rgba(16, 185, 129, 0.2)",
        "glow-warning": "0 0 20px rgba(245, 158, 11, 0.2)",
        "glow-white": "0 0 30px rgba(255, 255, 255, 0.05)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #DC2626 0%, #991B1B 100%)",
        "gradient-subtle": "linear-gradient(180deg, #111827 0%, #0A0A0A 100%)",
        "gradient-surface": "linear-gradient(135deg, #1F2937 0%, #111827 100%)",
        "gradient-overlay":
          "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%)",
        "gradient-glow":
          "radial-gradient(ellipse at center, rgba(220,38,38,0.15) 0%, transparent 70%)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-out-right": {
          "0%": { transform: "translateX(0)", opacity: "1" },
          "100%": { transform: "translateX(100%)", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "scale-out": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.95)", opacity: "0" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-out-left": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-100%)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(220, 38, 38, 0.15)" },
          "50%": { boxShadow: "0 0 40px rgba(220, 38, 38, 0.3)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.2s ease-in",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.15s ease-in",
        "scale-in": "scale-in 0.2s ease-out",
        "scale-out": "scale-out 0.15s ease-in",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "slide-out-left": "slide-out-left 0.3s ease-in",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
```

### 12.2 Global CSS (app/globals.css)

The global stylesheet establishes CSS custom properties, base dark theme styles, font loading, and utility classes that complement Tailwind:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Rubik:wght@400;500&family=Merriweather:wght@400;700&family=JetBrains+Mono:wght@400;500&display=swap');

  html {
    @apply scroll-smooth antialiased;
    color-scheme: dark;
  }

  body {
    @apply bg-black text-gray-400 font-body;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  h1, h2, h3, h4, h5, h6 {
    @apply font-heading text-white;
  }

  ::selection {
    @apply bg-red-600/30 text-white;
  }

  :focus-visible {
    @apply outline-none ring-2 ring-red-500 ring-offset-2 ring-offset-gray-900;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

### 12.3 Custom Utility Classes

Beyond the standard Tailwind utilities, the following custom utility classes are defined in the `@layer utilities` block:

```css
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }

  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  }

  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }

  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
}
```

---

## 13. Accessibility Requirements

### 13.1 Contrast Ratio Standards

All text must meet WCAG 2.1 Level AA contrast requirements against its immediate background:

- **Normal text (below 18px, or below 14px bold):** Minimum contrast ratio of **4.5:1**
- **Large text (18px+ or 14px+ bold):** Minimum contrast ratio of **3:1**
- **UI components and graphical objects:** Minimum contrast ratio of **3:1** against adjacent colors
- **Non-text contrast:** Borders, form field outlines, and icon separators must maintain at least 3:1 contrast against their background

The contrast ratios for all text-surface combinations used in this design system are documented in Section 11.3 (Dark Theme Specification). Any new color combination introduced during implementation must be manually verified using a contrast checker tool before merging.

### 13.2 Focus Indicators

Focus indicators are critical for keyboard navigation. The design system enforces a consistent, highly visible focus ring:

- **Style:** 2px solid ring in red-500 (`#EF4444`)
- **Offset:** 2px ring-offset in gray-900 (`#111827`) to ensure visibility against any background
- **Border-radius:** Inherits from the focused element's border-radius
- **CSS:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900`
- **Global Default:** Applied in the `@layer base` stylesheet so all focusable elements inherit this behavior unless explicitly overridden
- **Custom Components:** Custom components (buttons, links, inputs) may apply their own focus styles, but must maintain the same ring color and offset pattern for consistency

The `focus-visible` pseudo-class is used instead of `:focus` to ensure focus indicators appear only during keyboard navigation, not on mouse clicks. This prevents visual noise for mouse users while preserving full accessibility for keyboard users.

### 13.3 Touch Target Sizes

All interactive elements must meet minimum touch target dimensions to ensure usability on touch devices:

- **Minimum size:** 44×44 pixels (WCAG 2.5.5)
- **Measured size:** The touch target includes any visible padding around the clickable area. A 24px icon inside a 44px padded button meets the requirement.
- **Minimum spacing:** 8px between adjacent touch targets to prevent accidental activation
- **Inline links:** Text links within paragraphs are exempt from the 44px height requirement but should have generous line-height (`leading-relaxed` or `leading-7`) and surrounding whitespace
- **Form controls:** Checkboxes and radio buttons should have a minimum 44×44px tap area, which may be achieved via invisible padding on a wrapping `<label>` element
- **Implementation pattern:** Use `min-h-[44px] min-w-[44px]` Tailwind utilities on interactive elements, or ensure that `px-4 py-2.5` (which yields ~40px height for 16px text with 14px line-height, rounded up by the browser) is the minimum button padding

### 13.4 Screen Reader Considerations

- **Language:** The `<html>` element must declare `lang="en"` for proper screen reader pronunciation
- **Page titles:** Every page must have a unique, descriptive `<title>` tag following the pattern "Page Name | TeslaPrimeCapital"
- **Heading hierarchy:** Headings must follow a logical nesting order (h1 → h2 → h3, never skipping levels). Each page should have exactly one `<h1>`
- **ARIA landmarks:** The layout uses semantic HTML landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`, `<aside>`, `<section>`) to provide navigation structure. Explicit `role` attributes are unnecessary when using semantic elements
- **ARIA labels:** Icon-only buttons must have `aria-label` describing their action (e.g., `aria-label="Close modal"`, `aria-label="Open navigation menu"`)
- **Live regions:** Dynamic content updates use `aria-live="polite"` for non-urgent updates (portfolio value changes) and `aria-live="assertive"` for critical notifications (error messages, transaction confirmations)
- **Form accessibility:** All form inputs must have associated `<label>` elements (using `htmlFor`/`id` pairing). Error messages must be associated via `aria-describedby`. Required fields must use `aria-required="true"`
- **Skip navigation:** A "Skip to main content" link must be present at the top of every page, visually hidden but accessible via keyboard (`Tab` key)
- **Modal focus trapping:** When a modal is open, focus must be trapped within the modal container. Tabbing must cycle through focusable elements inside the modal only. On close, focus must return to the element that triggered the modal
- **Image alt text:** Decorative images use `alt=""`. Informational images have descriptive alt text. Complex charts and graphs have extended descriptions via `aria-describedby` or adjacent visually-hidden text

### 13.5 Reduced Motion Support

The design system fully supports the `prefers-reduced-motion: reduce` media query. This setting is commonly enabled by users with vestibular disorders, motion sensitivity, or those who simply prefer less animation.

- **Global rule:** When `prefers-reduced-motion: reduce` is active, all `animation-duration` and `transition-duration` values are set to `0.01ms`, and `animation-iteration-count` is set to `1`
- **Scroll behavior:** `scroll-behavior: auto` replaces `scroll-smooth` to prevent smooth scrolling animations
- **Skeleton loaders:** Replace shimmer animation with static `bg-gray-700` placeholder blocks
- **Spinners:** Replace `animate-spin` with a static progress indicator or text label ("Loading...")
- **Hover effects:** `transform` changes on hover (scale, translate) are disabled. Color and background transitions may remain at `duration-0` (instant)
- **Page transitions:** Disabled entirely; pages swap instantly
- **Implementation:** The global CSS in `app/globals.css` includes a `@media (prefers-reduced-motion: reduce)` block that handles the majority of cases. Component-level animations should also check this preference via `useReducedMotion()` hook (from `framer-motion` or custom implementation) when framework-level control is needed

### 13.6 Keyboard Navigation

- **Tab order:** Interactive elements must follow a logical left-to-right, top-to-bottom tab order that matches the visual layout
- **Focus management:** Modal dialogs must implement focus trapping. Dropdown menus must return focus to the trigger element on close. After page navigation, focus should move to the page's main heading or a skip-link target
- **Keyboard shortcuts:** If keyboard shortcuts are implemented, they must be documented in an accessible help panel. All keyboard shortcuts must use modifier keys (Ctrl/Cmd) to avoid conflicts with screen reader commands
- **Custom widgets:** Any custom interactive component (tabs, accordions, carousels) must follow WAI-ARIA Authoring Practices Guide (APG) patterns for the respective widget role

---

## Appendix A: Design Token Quick Reference

### Color Tokens (CSS Custom Properties)

```
--color-primary: #DC2626
--color-primary-dark: #B91C1C
--color-primary-darker: #991B1B
--color-primary-light: #EF4444
--color-success: #10B981
--color-warning: #F59E0B
--color-error: #EF4444
--color-info: #3B82F6
--color-bg-base: #000000
--color-bg-elevated: #0A0A0A
--color-bg-surface: #111827
--color-bg-raised: #1F2937
--color-bg-overlay: #374151
--color-text-primary: #FFFFFF
--color-text-secondary: #9CA3AF
--color-text-muted: #6B7280
--border-subtle: rgba(255, 255, 255, 0.1)
--border-medium: rgba(255, 255, 255, 0.2)
--border-strong: rgba(255, 255, 255, 0.3)
```

### Typography Tokens (CSS Custom Properties)

```
--font-heading: 'Poppins', ui-sans-serif, system-ui, sans-serif
--font-body: 'Rubik', ui-sans-serif, system-ui, sans-serif
--font-editorial: 'Merriweather', ui-serif, Georgia, serif
--font-mono: 'JetBrains Mono', ui-monospace, monospace
```

### Spacing Tokens

```
--space-base: 4px
--space-xs: 4px
--space-sm: 8px
--space-md: 16px
--space-lg: 24px
--space-xl: 32px
--space-2xl: 48px
--space-3xl: 64px
```

---

## Appendix B: File Structure Reference

```
design-system/
├── tokens/
│   ├── colors.ts          # Color token definitions
│   ├── typography.ts      # Font & type scale tokens
│   ├── spacing.ts         # Spacing scale tokens
│   └── shadows.ts         # Shadow & glow definitions
├── components/
│   ├── Button.tsx          # Button component with all variants
│   ├── Card.tsx            # Card component with variants
│   ├── Input.tsx           # Form input component
│   ├── Badge.tsx           # Badge/pill component
│   ├── Modal.tsx           # Modal/dialog component
│   ├── Toast.tsx           # Toast notification component
│   ├── Table.tsx           # Data table component
│   └── Skeleton.tsx        # Loading skeleton component
├── layouts/
│   ├── Container.tsx       # Responsive container
│   ├── Sidebar.tsx         # Dashboard sidebar
│   └── PageHeader.tsx      # Consistent page header
└── utils/
    ├── cn.ts               # Tailwind class merge utility (clsx + twMerge)
    └── focus-ring.ts       # Focus ring style constants
```

---

*This design system document serves as the single source of truth for all visual and interaction decisions in TeslaPrimeCapital Phase 2. Any deviation from these specifications requires explicit approval from the design system maintainers. All component implementations must be validated against these tokens before merging to the main branch.*