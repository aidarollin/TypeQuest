# UI/UX Specification

## Design Philosophy

TypeQuest borrows the visual language of role-playing games — XP bars, level rings, badge collections — and applies it to a productivity tool. The aesthetic is **modern fantasy with restraint**: deep slate backgrounds, electric amber accents (the "XP color"), and clean geometric typography. The product should feel like a piece of equipment a serious writer uses, not a children's game.

## Surfaces

There are five distinct UI surfaces. Each has a different purpose and information density.

### Surface 1: Browser Extension Popup (compact, 360 × 540 px)
Quick-glance card. Opens when user clicks the extension icon.

```
┌────────────────────────────────────┐
│  TypeQuest                  ⚙️ 👤 │
├────────────────────────────────────┤
│                                    │
│      ╭────────╮                    │
│      │   12   │   Wordsmith        │
│      │ LEVEL  │   2,847 / 4,000 XP │
│      ╰────────╯                    │
│   ▓▓▓▓▓▓▓▓▓▓▓░░░░  71%             │
│                                    │
│   ─── TODAY ──────────────────     │
│   Words today      1,243           │
│   Active time      48 min          │
│   Current WPM      52              │
│   Streak           🔥 8 days       │
│                                    │
│   ─── RECENT BADGES ──────         │
│   🏅 🏅 🏅 🏅  +3 more           │
│                                    │
│   [  Open full dashboard  →  ]     │
└────────────────────────────────────┘
```

### Surface 2: Floating In-Doc HUD (50 × 50 px collapsed → 280 × 120 px expanded)
A draggable orb that lives in the corner of the document. Collapsed by default to stay out of the way.

```
Collapsed:               Expanded (on hover):
                         ┌────────────────────────┐
   ╭────╮                │ Lvl 12    ▓▓▓▓▓░░ 71%  │
   │ 12 │                │ Today: 1,243 words     │
   ╰────╯                │ WPM: 52    🔥 8 days   │
                         └────────────────────────┘
```

Drag-to-reposition. Position persists per-user. Settings let the user disable, change opacity, or auto-hide while typing.

### Surface 3: Web Dashboard (full analytics — desktop-first responsive)
The main analytics surface. Three sections stacked vertically.

```
┌──────────────────────────────────────────────────────────────────────┐
│  TypeQuest                              Settings  Account  Sign out  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────┐   Hello, Sarah                                          │
│  │   12    │   Wordsmith                                             │
│  │ LEVEL   │   2,847 / 4,000 XP to next level                        │
│  └─────────┘   ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░  71%                           │
│                                                                      │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐            │
│  │ TODAY    │ THIS WK  │ THIS MO  │ STREAK   │ ALL-TIME │            │
│  │ 1,243    │ 8,419    │ 34,210   │ 🔥 8     │ 247,803  │           │
│  │ words    │ words    │ words    │ days     │ words    │            │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Daily output — last 30 days                  [Day][Wk][Mo]  │    │
│  │                                                              │    │
│  │     ▁▂▃▅▂▁▆▇█▅▃▂▁▄▆▇█▆▃▂▁▅█▇▆▄▃▂▁▇                     │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐      │
│  │  Time-of-day heatmap     │  │  WPM distribution             │     │
│  │  ▓░░░░▓▓▓▓▓▓▓▓▓░░▓▓▓░░░  │  │       ┌─┐                     │     │
│  │  Mon ──────── 11pm       │  │     ┌─┤█├─┐                   │     │
│  └──────────────────────────┘  │   ┌─┤█│█│█├─┐                 │     │
│                                │  20  40  60  80               │     │
│                                └──────────────────────────────┘      │
│                                                                      │
│  Badges (12 / 47)                                       [View all]   │
│  ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐                 │
│  │🏅  │🏅 │🏅 │🏅  │🏅  │🏅 │🏅  │🏅 │🏅  │ +3 │                │
│  └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘                 │
└──────────────────────────────────────────────────────────────────────┘
```

### Surface 4: Badge Unlock Toast (transient, 320 × 80 px, slides in top-right)
Celebration moment when a badge is earned. Appears in-doc and on the dashboard.

```
┌──────────────────────────────────────┐
│  🏅  Badge unlocked!                 |
│      Marathon Mind                   │
│      120 minutes in one session      │
└──────────────────────────────────────┘
```

Auto-dismisses after 5 seconds. Click to navigate to the badge detail.

### Surface 5: Level-Up Modal (full-screen, momentary)
A bigger celebration for level-ups. Particle animation, fanfare optional.

```
            ┌────────────────────────┐
            │                        │
            │     ✨  LEVEL UP  ✨  │
            │                        │
            │       ╭────────╮       │
            │       │   13   │       │
            │       ╰────────╯       │
            │                        │
            │       Chronicler       │
            │                        │
            │   New badges unlocked  │
            │      🏅  🏅           │
            │                        │
            │      [ Continue ]      │
            └────────────────────────┘
```

## Design Tokens

```css
:root {
  /* Color — dark theme primary */
  --tq-bg-base:        #0B0F19;   /* deepest slate */
  --tq-bg-surface:     #131A2B;   /* card backgrounds */
  --tq-bg-elevated:    #1C2540;   /* hover states */
  --tq-border:         #2A3556;   /* subtle borders */

  --tq-text-primary:   #E8EBF5;
  --tq-text-secondary: #9AA3B8;
  --tq-text-muted:     #5C6584;

  --tq-accent:         #F5B342;   /* "XP gold" — primary accent */
  --tq-accent-hot:     #FF6B6B;   /* streaks, alerts */
  --tq-accent-cool:    #6FCFEB;   /* info, links */
  --tq-accent-success: #5FE3A1;   /* level up, badge earned */

  /* Typography */
  --tq-font-display:   "Space Grotesk", sans-serif;  /* headers, level numbers */
  --tq-font-body:      "Inter", system-ui, sans-serif;
  --tq-font-mono:      "JetBrains Mono", monospace;  /* stats, numbers */

  /* Spacing */
  --tq-space-1: 4px;
  --tq-space-2: 8px;
  --tq-space-3: 12px;
  --tq-space-4: 16px;
  --tq-space-6: 24px;
  --tq-space-8: 32px;

  /* Radii */
  --tq-radius-sm: 6px;
  --tq-radius-md: 12px;
  --tq-radius-lg: 20px;

  /* Shadows */
  --tq-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --tq-shadow-md: 0 4px 20px rgba(0,0,0,0.4);
  --tq-shadow-glow: 0 0 24px rgba(245,179,66,0.35);  /* level-up glow */
}
```

## Interaction Patterns

### XP Bar
A horizontal bar with a gradient fill (cool cyan → warm gold) and a crisp percentage label inside. When XP increments, the new portion animates in over 600 ms with an ease-out curve. The whole bar pulses softly when it reaches 100%.

### Level Ring
Circular progress ring around the level number. Stroke is `--tq-accent`. Animates clockwise on first render, then incrementally as XP grows.

### Badge Card
Small square (88 × 88 px) with the badge icon centered, name beneath. Locked badges show a silhouette with `opacity: 0.25` and a small lock icon. Hover reveals the unlock criteria as a tooltip.

### Streak Flame
A flame emoji with a number. The flame's saturation increases with streak length: 1–6 days subdued orange, 7–29 days amber, 30+ days saturated red-orange with a subtle bounce animation.

### Empty States
- **No data yet** — "Start typing in any document. We're listening." with a soft pulsing dot.
- **Streak broken** — "Your streak ended at 8 days. Today is day 1 of the next." (Encouraging, not punitive.)

## Accessibility

- All interactive elements meet WCAG AA contrast (≥ 4.5:1 against their background).
- Animations respect `prefers-reduced-motion`. The level-up modal becomes a static screen with no particles.
- All badge celebrations have a text-equivalent toast — never sound or visuals only.
- Keyboard navigation through the dashboard: `Tab` moves between cards, `Enter` opens detail views.
- Screen-reader labels for the level ring announce "Level 12, 71 percent to level 13."

## Light Theme

A light-mode token set is provided as an opt-in. Base becomes `#FAFBFD`, surfaces white, accent darkens to `#C28A12` for contrast. Switch is in `Settings → Appearance`.