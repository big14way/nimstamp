---
name: NimStamp
description: Recharge scratch-card world. One committed ultramarine panel on warm paper, silver scratch strips, perforated edges, ink slab controls in condensed caps, tabular numerals. Built for bright Lagos counters on mid-range Android.

colors:
  panel: "oklch(46% 0.21 272)"        # the committed colour: voucher headers, primary panel actions, punched stamps, redeem ground
  panel-deep: "oklch(36% 0.17 272)"   # hover/active on panel
  panel-tint: "oklch(88% 0.06 272)"   # secondary text ON the panel (tinted from the hue, never grey)
  panel-wash: "oklch(94% 0.03 272)"   # info notices
  ink: "oklch(22% 0.03 272)"          # text, slab buttons, 2px keylines
  ink-soft: "oklch(44% 0.035 272)"    # secondary text on paper (4.5:1+)
  ink-faint: "oklch(60% 0.03 272)"    # placeholders, disabled labels, serials
  paper: "oklch(98.5% 0.006 85)"      # page ground (warm)
  paper-deep: "oklch(95% 0.009 85)"   # unpunched panels, warn notices, hover on outline
  rule: "oklch(88% 0.012 272)"        # hairlines, perforation dashes
  silver: "oklch(84% 0.008 260)"      # scratch strip, disabled hatch
  silver-deep: "oklch(72% 0.01 260)"  # dotted die-cuts, scrollbars
  alert: "oklch(56% 0.2 28)"          # errors only
  alert-wash: "oklch(95% 0.03 28)"
  ok: "oklch(52% 0.15 150)"           # success only
  ok-wash: "oklch(95% 0.04 150)"

typography:
  families:
    sans: "Barlow (500 body, 700 bold), self-hosted latin subset via @fontsource"
    display: "Barlow Semi Condensed 800, uppercase, letter-spacing -0.01em, line-height 0.95"
  roles:
    display-xl: "5.5rem — the redemption code only"
    display-l: "2.5rem — redeem merchant name; 2.25rem voucher merchant name"
    display-m: "2rem — page titles, ledger totals"
    display-s: "1.75rem — role slabs, dashboard codes"
    control: "1.25rem display — every slab button"
    body: "1rem / 1.45"
    secondary: "0.9375rem / 0.875rem"
    label: "0.75rem, 700, uppercase, tracking 0.08em — section rules, field labels, chips"
    meta: "0.6875rem tabular — serials, footers"
  numerals: "tabular-nums everywhere (body font-feature-settings); codes and serials also tracked 0.12em"

spacing:
  base: "4px scale (Tailwind); page gutter 16px; max content width 28rem (max-w-md)"
  rhythm: "tight inside a group (4–12px), 32px between sections, more above a Rule than below it"

components:
  button: "Slab: min-height 52px, 6px radius, display caps 1.25rem. ink (default), panel (the committed action on a surface), outline (2px ink keyline), quiet (text). Disabled = silver hatch, never faded colour."
  voucher: "Ultramarine header (title label, display name, city) → perforation → punch grid → progress + denomination line → reward rule box → serial footer. Never inside another container."
  stamp: "Unpunched: dotted silver-deep die-cut with a tabular number on paper-deep. Punched: panel disc with an inset shadow and a paper-tinted inner hole. A newly punched hole plays `punch` once (260ms, ease-out-quint)."
  scratch: "White PIN box with a 2px ink keyline; `.scratch::after` is a silver hatch strip that wipes left→right (900ms ease-out-expo, 350ms delay) to reveal the code. Reduced-motion: instant."
  notice: "Flat wash (panel-wash / paper-deep / ok-wash) with a stroked icon at left. No thick side borders."
  error: "2px alert keyline on alert-wash, alert icon, bold message, RETRY as a label-link."
  rule: "Section heading = label + hairline to the right. Ledgers use 2px ink top/bottom rules with hairline row dividers."
  field: "Label (label role) over a 2px ink input; focus = panel border + 2px inset panel shadow, no outer outline."
  action-bar: "Fixed bottom, paper ground, 2px ink top rule, safe-area padding. Holds the one primary decision: pay/redeem/connect, or the velocity confirmation."
  perforation: ".perf — 2px dashed rule with 16px round notches at both ends coloured like the surrounding ground (.perf-on-panel / .perf-in-panel)."

motion:
  authored: "The scratch-off reveal on the redemption code is the signature moment."
  state: "punch (stamp landed), rise (notices, 220ms), pulse-soft (skeletons, waiting labels)."
  easing: "ease-out-quint / ease-out-expo only; no bounce."
  duration: "150ms controls, 220–260ms state changes, 900ms scratch."

surfaces:
  browser: "Selection = panel/white; focus ring = 3px panel; caret and accent-color = panel; thin scrollbars in silver-deep."
  ground: "Light only: bright daylight at a counter. The redeem screen inverts to a full panel ground so the cashier finds the white PIN box instantly."

anti-patterns:
  - "No kicker/eyebrow above a heading."
  - "No cards inside cards; sections are separated by rules and perforations, not containers."
  - "No grey text on the panel — tint from the hue."
  - "No hero-metric tiles; totals are a ruled ledger line."
  - "No emoji or unicode icons; every icon is the stroked SVG set in components/ui.tsx."
  - "Gold (#F6B221) is not used; the world is ultramarine + paper + silver."
---

# NimStamp design system

NimStamp looks like the recharge scratch card every customer in Lagos already trusts: a saturated printed panel, a paper body with punch panels, a silver strip you scratch to reveal a PIN. The metaphor does work on every surface. The loyalty card *is* a voucher (`components/Voucher.tsx`), a stamp *is* a hole punched through it (`components/StampGrid.tsx`), and the reward code *is* scratched off (`pages/Redeem.tsx`, `.scratch`).

Tokens live in `packages/web/src/index.css` under `@theme` and are the only source of colour, type and easing. Components in `packages/web/src/components/ui.tsx` are the whole control vocabulary; pages compose them and add nothing new.

Surfaces are Operate mode: familiar affordances, one family, fixed rem scale, density where merchants need it (dashboard ledgers), and the single committed colour reserved for the voucher header, punched stamps, and the surface's committed action.
