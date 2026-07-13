# Yegara Bingo - Complete UI Documentation

## Table of Contents
1. [Overview](#overview)
2. [Design System](#design-system)
3. [Screen 1: Welcome / Home Screen](#screen-1-welcome--home-screen)
4. [Screen 2: Game Board Screen](#screen-2-game-board-screen)
5. [Screen 3: Win Celebration Screen](#screen-3-win-celebration-screen)
6. [Bottom Navigation Bar](#bottom-navigation-bar)
7. [Color Palette](#color-palette)
8. [Typography](#typography)
9. [Component Specifications](#component-specifications)
10. [Responsive Behavior](#responsive-behavior)

---

## Overview

Yegara Bingo is a Telegram Mini App-based bingo game featuring a dark-themed UI with vibrant accent colors. The app consists of 3 primary screens: Welcome/Home, Game Board, and Win Celebration. The interface is mobile-first with a fixed bottom navigation bar.

---

## Design System

### Theme
- **Primary Theme**: Dark mode (deep navy/dark blue background)
- **Accent Colors**: Orange, Green/Teal, Blue/Purple, Purple
- **Border Style**: Rounded corners (12-16px radius for cards, 25-30px for buttons)
- **Shadow/Depth**: Subtle card elevation with slightly lighter dark backgrounds

### Global Elements
- **Status Bar**: Standard mobile status bar (time, signal, battery)
- **Telegram Header**: "X" close button, "Yegara Bingo" title, dropdown arrow, three-dot menu

---

## Screen 1: Welcome / Home Screen

### Layout Structure
```
┌─────────────────────────────┐
│  [B] Yegara Bingo    [Rules]│  ← Header
├─────────────────────────────┤
│                             │
│   Welcome to Yegara Bingo   │  ← Hero Text
│                             │
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │  Choose Your Stake    │  │  ← Stake Selection Card
│  │  ┌─────────────────┐  │  │
│  │  │    Play 10      │  │  │  ← Green Button
│  │  └─────────────────┘  │  │
│  │  ┌─────────────────┐  │  │
│  │  │    Play 20      │  │  │  ← Blue Button
│  │  └─────────────────┘  │  │
│  └───────────────────────┘  │
│                             │
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │     24,557            │  │  ← Statistics Card
│  │   Active Players      │  │
│  │     2,195             │  │
│  │   Games Played        │  │
│  │     477               │  │
│  │   Winners Daily       │  │
│  └───────────────────────┘  │
│                             │
├─────────────────────────────┤
│  Game │ History │ Wallet │ Profile │  ← Bottom Nav
└─────────────────────────────┘
```

### Header Component
| Element | Description |
|---------|-------------|
| Logo Icon | Circular badge with letter "B" (white on dark circle) |
| Title | "Yegara Bingo" - Bold, white text |
| Rules Button | Top-right corner, outlined button with "?" icon + "Rules" text |

### Hero Section
- **Text**: "Welcome to **Yegara Bingo**"
- **"Yegara Bingo"** styled in **orange** color for emphasis
- **Font Size**: Large (approximately 28-32px)
- **Alignment**: Center-aligned

### Stake Selection Card
| Property | Value |
|----------|-------|
| Background | Semi-transparent dark card with subtle border |
| Border | 1px solid, slightly lighter than background |
| Border Radius | ~16px |
| Padding | ~20px internal |

#### Play 10 Button
| Property | Value |
|----------|-------|
| Background | Green to Teal gradient (left to right) |
| Text | "Play 10" - White, bold |
| Icon | Small play icon (triangle or rectangle) before text |
| Height | ~50-55px |
| Border Radius | ~25-30px (fully rounded) |
| Width | 100% of container |

#### Play 20 Button
| Property | Value |
|----------|-------|
| Background | Blue to Purple gradient (left to right) |
| Text | "Play 20" - White, bold |
| Icon | Small play icon before text |
| Height | ~50-55px |
| Border Radius | ~25-30px (fully rounded) |
| Width | 100% of container |

### Statistics Card
| Property | Value |
|----------|-------|
| Background | Semi-transparent dark card |
| Border | Subtle border matching stake card |
| Border Radius | ~16px |
| Alignment | Center-aligned content |

#### Statistics Data
| Metric | Value | Font Style |
|--------|-------|------------|
| Active Players | 24,557 | Large bold number + smaller label |
| Games Played | 2,195 | Large bold number + smaller label |
| Winners Daily | 477 | Large bold number + smaller label |

- **Numbers**: White, large font (~24-28px), bold
- **Labels**: Gray/muted text, smaller font (~14px)

---

## Screen 2: Game Board Screen

### Layout Structure
```
┌─────────────────────────────┐
│ [X] Yegara Bingo     [▼][⋯]│  ← App Header
├─────────────────────────────┤
│ [← Back]        [↻ Refresh] │  ← Action Buttons
├─────────────────────────────┤
│ MAIN    PLAY     STAKE  DERASH  TIMER │  ← Info Bar
│ WALLET  WALLET   10     120    17s    │
├─────────────────────────────┤
│  1   2   3   4   5   6   7   8  │
│ [9] 10  11  12  13 [14] 15  16 │  ← Bingo Grid
│ 17  18  19  20  21  22  23  24 │    (13 rows × 8 cols)
│ 25  26  27  28  29  30  31  32 │    Numbers 1-104
│ 33  34  35  36  37  38  39  40 │
│ 41  42  43  44  45  46  47  48 │
│ 49  50  51  52  53  54  55  56 │
│ 57  58  59  60  61  62  63  64 │
│ 65  66  67  68  69  70  71  72 │
│ 73  74  75  76  77  78  79  80 │
│ 81  82  83  84  85  86  87  88 │
│ 89  90  91  92  93  94  95  96 │
│ 97  98  99 100 101 102 103 104│
├─────────────────────────────┤
│  Game │ History │ Wallet │ Profile │  ← Bottom Nav
└─────────────────────────────┘
```

### App Header
| Element | Position | Description |
|---------|----------|-------------|
| Close (X) | Left | Exit the mini app |
| Title | Center | "Yegara Bingo" - Bold white |
| Dropdown (▼) | Right | Additional options menu |
| Three Dots (⋯) | Far right | Telegram menu options |

### Action Buttons Row
| Button | Style | Description |
|--------|-------|-------------|
| ← Back | Outlined, dark background | Return to previous screen |
| Refresh | Outlined, dark background with icon | Reload game state |

### Information Bar
| Field | Value Shown | Description |
|-------|-------------|-------------|
| MAIN WALLET | 0.00 | Primary wallet balance |
| PLAY WALLET | 20.00 | Gaming wallet balance |
| STAKE | 10 | Current bet amount |
| DERASH | 120 | Currency/token balance |
| TIMER | 17s | Countdown timer (orange text) |

- **Layout**: Horizontal scrollable row
- **Style**: Compact labels with values, slight background tint
- **Timer**: Orange colored to indicate urgency

### Bingo Grid

#### Grid Specifications
| Property | Value |
|----------|-------|
| Columns | 8 |
| Rows | 13 |
| Total Cells | 104 |
| Number Range | 1 - 104 |
| Cell Shape | Square with rounded corners (~8px) |
| Cell Size | Approximately equal, responsive |

#### Cell States

| State | Background | Text Color | Description |
|-------|------------|------------|-------------|
| Default | Dark navy/charcoal | White | Unselected number |
| Selected | Orange (#FF8C00) | White | Player has marked this number |
| Called | May flash/highlight | White | Number just announced |

#### Cell Styling
```
Default Cell:          Selected Cell:
┌──────┐              ┌──────┐
│  45  │              │  9   │
└──────┘              └──────┘
Background: #1a1a2e   Background: #FF8C00 (Orange)
Border: subtle        Border: none
Border-radius: 8px    Border-radius: 8px
```

#### Grid Layout Detail
- **Row 1**: 1, 2, 3, 4, 5, 6, 7, 8
- **Row 2**: 9, 10, 11, 12, 13, 14, 15, 16
- **Row 3**: 17, 18, 19, 20, 21, 22, 23, 24
- **Row 4**: 25, 26, 27, 28, 29, 30, 31, 32
- **Row 5**: 33, 34, 35, 36, 37, 38, 39, 40
- **Row 6**: 41, 42, 43, 44, 45, 46, 47, 48
- **Row 7**: 49, 50, 51, 52, 53, 54, 55, 56
- **Row 8**: 57, 58, 59, 60, 61, 62, 63, 64
- **Row 9**: 65, 66, 67, 68, 69, 70, 71, 72
- **Row 10**: 73, 74, 75, 76, 77, 78, 79, 80
- **Row 11**: 81, 82, 83, 84, 85, 86, 87, 88
- **Row 12**: 89, 90, 91, 92, 93, 94, 95, 96
- **Row 13**: 97, 98, 99, 100, 101, 102, 103, 104

---

## Screen 3: Win Celebration Screen

### Layout Structure
```
┌─────────────────────────────┐
│ [X] Yegara Bingo     [▼][⋯]│  ← App Header
├─────────────────────────────┤
│            👑               │  ← Crown Icon
│                             │
│         BINGO!              │  ← Win Title
│                             │
│  ┌───────────────────────┐  │
│  │ 😊 kid_ddy WON! 😊   │  │  ← Winner Card
│  │                       │  │
│  │ 🏆 Winning Cartela    │  │
│  │        : 213          │  │
│  │                       │  │
│  │ Prize Award: 152.00 ETB│  │
│  │                       │  │
│  │  ┌─┬─┬─┬─┬─┐         │  │
│  │  │B│I│N│G│O│         │  │  ← Bingo Card
│  │  ├─┼─┼─┼─┼─┤         │  │
│  │  │ │ │ │ │ │         │  │
│  │  ├─┼─┼─┼─┼─┤         │  │
│  │  │ │ │ │ │ │         │  │
│  │  ├─┼─┼─┼─┼─┤         │  │
│  │  │ │ │★│ │ │         │  │  ← Free Space
│  │  ├─┼─┼─┼─┼─┤         │  │
│  │  │ │ │ │ │ │         │  │
│  │  ├─┼─┼─┼─┼─┤         │  │
│  │  │ │ │ │ │ │         │  │
│  │  └─┴─┴─┴─┴─┘         │  │
│  └───────────────────────┘  │
│                             │
│  ⚫ Returning to home in 6 s│  ← Countdown
│       @yegarabingobot       │  ← Bot Username
└─────────────────────────────┘
```

### Crown Icon
- **Position**: Top center
- **Size**: Large (~60-80px)
- **Style**: Golden/yellow crown on circular dark background
- **Purpose**: Visual celebration indicator

### Win Title
- **Text**: "BINGO!"
- **Color**: Orange (#FF8C00)
- **Font Size**: Extra large (~36-40px)
- **Font Weight**: Bold
- **Alignment**: Center

### Winner Card
| Property | Value |
|----------|-------|
| Background | Semi-transparent dark card |
| Border | Subtle lighter border |
| Border Radius | ~16px |
| Padding | ~20px |

#### Winner Information
| Element | Content | Style |
|---------|---------|-------|
| Username | 😊 kid_ddy WON! 😊 | White, large, with smiley emojis |
| Label | 🏆 Winning Cartela : 213 | White, with trophy emoji |
| Prize | Prize Award: 152.00 ETB | Orange/gold color, bold |

### Bingo Card (Winner's Card)

#### Card Structure
- **Type**: 5×5 Bingo Card
- **Columns**: B, I, N, G, O

#### Column Headers
| Column | Background Color | Text Color |
|--------|------------------|------------|
| B | Green (#4CAF50) | White |
| I | Blue (#2196F3) | White |
| N | Purple (#9C27B0) | White |
| G | Orange (#FF9800) | White |
| O | Teal (#009688) | White |

#### Cell States

| State | Background | Description |
|-------|------------|-------------|
| Matched (Green) | Bright Green (#4CAF50) | Number was called and is on card |
| Matched (Orange) | Orange (#FF8C00) | Alternative match indicator |
| Unmatched | White (#FFFFFF) | Number not yet matched |
| Free Space | Green with ⭐ | Center cell, automatic match |

#### Sample Card Layout (Winning Card: 213)
```
     B      I      N      G      O
   ┌──────┬──────┬──────┬──────┬──────┐
   │  11  │  16  │  43  │  46  │  66  │
   │ green│orange│white │orange│white │
   ├──────┼──────┼──────┼──────┼──────┤
   │  12  │  24  │  39  │  53  │  69  │
   │orange│ green│white │white │white │
   ├──────┼──────┼──────┼──────┼──────┤
   │  2   │  23  │  ⭐  │  51  │  72  │
   │white │white │green │white │white │
   ├──────┼──────┼──────┼──────┼──────┤
   │  4   │  27  │  34  │  48  │  61  │
   │white │white │orange│ green│white │
   ├──────┼──────┼──────┼──────┼──────┤
   │  5   │  22  │  33  │  59  │  68  │
   │white │white │orange│orange│ green│
   └──────┴──────┴──────┴──────┴──────┘
```

### Return Countdown
- **Text**: "⚫ Returning to home in 6 s"
- **Style**: Muted text with dot indicator
- **Behavior**: Auto-countdown, redirects to home screen
- **Duration**: ~6-10 seconds

### Bot Attribution
- **Text**: "@yegarabingobot"
- **Position**: Bottom of card
- **Style**: Small, muted text

---

## Bottom Navigation Bar

### Structure
```
┌─────────────────────────────────────────┐
│  🎲 Game  │  🕐 History  │  💳 Wallet  │  👤 Profile  │
└─────────────────────────────────────────┘
```

### Navigation Items

| Tab | Icon | Active State | Description |
|-----|------|--------------|-------------|
| Game | Dice/Game icon | Orange highlight | Main game screen (default) |
| History | Clock/History icon | Orange highlight | Game history records |
| Wallet | Wallet/Card icon | Orange highlight | Balance & transactions |
| Profile | Person icon | Orange highlight | User profile settings |

### Styling
- **Background**: Dark (slightly lighter than main background)
- **Inactive Icon/Text**: Gray/muted
- **Active Icon/Text**: Orange (#FF8C00)
- **Height**: ~60px
- **Border**: Subtle top border
- **Layout**: Equal distribution across width

---

## Color Palette

### Primary Colors
| Color | Hex Code | Usage |
|-------|----------|-------|
| Background Dark | #0D1117 / #1A1A2E | Main background |
| Card Dark | #16213E / #1F2937 | Card backgrounds |
| Orange | #FF8C00 / #FFA500 | Accent, selected states, timer |
| Green | #4CAF50 / #10B981 | Play 10 button, matched cells |
| Blue | #3B82F6 / #2196F3 | Play 20 button, I column |
| Purple | #8B5CF6 / #9C27B0 | N column, gradients |
| Teal | #14B8A6 / #009688 | O column, accents |
| White | #FFFFFF | Text, unmatched cells |
| Gray | #6B7280 | Muted text, labels |

### Gradient Definitions
| Gradient | Direction | Colors |
|----------|-----------|--------|
| Play 10 Button | Left → Right | Green (#10B981) → Teal (#14B8A6) |
| Play 20 Button | Left → Right | Blue (#3B82F6) → Purple (#8B5CF6) |

---

## Typography

### Font Family
- Primary: System default (SF Pro on iOS, Roboto on Android)
- Fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto

### Font Sizes
| Element | Size | Weight |
|---------|------|--------|
| App Title | 18-20px | Bold |
| Hero Text | 28-32px | Bold |
| Section Headers | 20-24px | Semi-bold |
| Button Text | 16-18px | Bold |
| Statistics Numbers | 24-28px | Bold |
| Statistics Labels | 12-14px | Regular |
| Grid Numbers | 14-16px | Medium |
| Small Labels | 10-12px | Regular |

---

## Component Specifications

### Buttons

#### Primary Button (Play 10, Play 20)
```
Height: 50-55px
Border Radius: 25-30px (fully rounded)
Padding: 0 24px
Font Size: 16-18px
Font Weight: Bold
Text Color: White
Background: Linear gradient
Shadow: None
```

#### Secondary Button (Back, Refresh, Rules)
```
Height: 36-40px
Border Radius: 8-12px
Padding: 0 16px
Font Size: 14px
Font Weight: Medium
Text Color: White
Background: Transparent
Border: 1px solid rgba(255,255,255,0.2)
```

### Cards
```
Background: rgba(255,255,255,0.05) or #1F2937
Border: 1px solid rgba(255,255,255,0.1)
Border Radius: 12-16px
Padding: 16-24px
Shadow: 0 4px 6px rgba(0,0,0,0.3)
```

### Grid Cells
```
Width: Equal (12.5% of grid width)
Height: Equal (aspect-ratio: 1:1)
Border Radius: 6-8px
Margin: 2-4px gap
Font Size: 14-16px
Font Weight: Medium
```

---

## Responsive Behavior

### Mobile (Primary Target)
- **Width**: 100% viewport
- **Grid**: 8 columns, scrollable if needed
- **Navigation**: Fixed bottom
- **Cards**: Full-width with padding

### Breakpoints
| Breakpoint | Behavior |
|------------|----------|
| < 375px | Compact mode, smaller fonts |
| 375-428px | Standard mobile (iPhone SE to Plus) |
| 428-768px | Larger phones, minor padding increase |
| > 768px | Tablet - centered content, max-width container |

---

## Accessibility Considerations

### Color Contrast
- Orange on dark background: ~4.5:1 ratio (AA compliant)
- White on dark background: ~15:1 ratio (AAA compliant)
- Gray labels on dark: ~3:1 ratio (may need improvement)

### Touch Targets
- Minimum touch target: 44x44px (WCAG guideline)
- Grid cells approximately 40-45px on mobile
- Buttons exceed minimum target size

### Visual Indicators
- Selected numbers: Color + contrast change
- Timer: Color coding (orange for urgency)
- Win state: Multiple visual cues (crown, color, text)

---

## Screen Transitions

```
[Welcome Screen] ──click Play 10/20──► [Game Board]
                                              │
                                              ▼
                                      [Numbers Called]
                                              │
                                              ▼
                                       [BINGO Win!]
                                              │
                                              ▼
                                   [Win Celebration Screen]
                                              │
                                              ▼
                                    [Auto-return to Home]
```

---

## Image References

| Image File | Screen | Timestamp |
|------------|--------|-----------|
| photo_2026-07-13_18-01-31.jpg | Welcome Screen (v1) | 18:01:31 |
| photo_2026-07-13_18-01-05.jpg | Welcome Screen (v2) | 18:01:05 |
| photo_2026-07-13_18-01-12.jpg | Game Board Screen | 18:01:12 |
| photo_2026-07-13_18-00-29.jpg | Win Celebration Screen | 18:00:29 |

---

*Documentation generated from UI screenshot analysis - Yegara Bingo Telegram Mini App*
