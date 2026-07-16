# Improved Game UI Design — Yehulu Bingo Clone

## Reference: Yehulu Bingo Screenshots

### Layout Structure (Side-by-Side)

```
┌─────────────────────────────────────────────┐
│  X  │      Yegara Bingo       │  ▼  │  ⋮   │  ← Header
├─────────────────────────────────────────────┤
│ GAME ID │ PLAYERS │ BET │ DERASH │ CALLED  │  ← Info pills
├──────────────────┬──────────────────────────┤
│                  │  [O-70] [I-30] [I-24] 🔊│  ← Called tags + sound
│  B  I  N  G  O  │                          │
│  1 16 31 46 61  │     ┌──────────┐         │
│  2 17 32 47 62  │     │  O-70    │         │  ← Number circle
│  3 18 33 48 63  │     │ (large)  │         │
│  4 19 34 49 64  │     └──────────┘         │
│  5 20 35 50 65  │                          │
│  6 21 36 51 66  │  ┌─ CARTela NO: 37 ──┐  │  ← Cartela 1
│  7 22 37 52 67  │  │ B  I  N  G  O    │  │
│  8 23 38 53 68  │  │ 14 30 38 60 68   │  │
│  9 24 39 54 69  │  │ 5  29 44 49 72   │  │
│ 10 25 40 55 70  │  │ 1  16  ★  51 63  │  │
│ 11 26 41 56 71  │  │ 4  28 31 55 65   │  │
│ 12 27 42 57 72  │  │ 3  24 36 52 74   │  │
│ 13 28 43 58 73  │  └──────────────────┘  │
│ 14 29 44 59 74  │                          │
│ 15 30 45 60 75  │  ┌─ CARTela NO: 22 ──┐  │  ← Cartela 2
│                  │  │ B  I  N  G  O    │  │
│  (Master Grid)  │  │ ...               │  │
│                  │  └──────────────────┘  │
├──────────────────┴──────────────────────────┤
│ ✕ LEAVE  │  ↻ REFRESH  │ Auto [ON] │ AUTO │  ← Bottom bar
└─────────────────────────────────────────────┘
```

### Key Design Elements

#### 1. Master Grid (Left Side - 50% width)
- **5 columns × 15 rows** showing all 75 numbers
- Column layout: B(1-15) | I(16-30) | N(31-45) | G(46-60) | O(61-75)
- **Column colors** (matching headers):
  - B: Green (#10B981)
  - I: Blue (#3B82F6)
  - N: Purple (#8B5CF6)
  - G: Orange (#FF8C00)
  - O: Teal (#14B8A6)
- Called numbers highlighted with column color
- **Last called number**: Yellow/bright highlight with glow effect
- Numbers are compact (small font, tight spacing)

#### 2. Right Side Panel (50% width)
- **Top**: Called number tags strip (horizontal scroll)
  - Each tag: Letter + Number (e.g., "O-70")
  - Colored by column
  - Sound icon 🔊 at far right
- **Middle**: Large number announcement circle
  - Circular with golden/orange gradient border
  - Shows "LETTER-NUMBER" (e.g., "O-70")
  - Animated pulse/glow effect
- **Bottom**: Player's cartela(s)
  - "CARTela NO: X" header with colored background (orange gradient)
  - 5×5 grid with B-I-N-G-O headers
  - Free space (★) in center with star icon
  - Marked numbers: Green background
  - Unmarked numbers: Dark background

#### 3. Info Bar (Top)
- Horizontal pills: GAME ID | PLAYERS | BET | DERASH | CALLED
- Each pill: Label (small, dim) + Value (bold, colored)
- Colors: Orange, Green, Blue, Purple, Teal (matching columns)

#### 4. Bottom Bar
- **Left**: ✕ LEAVE (red text, red bg)
- **Center**: ↻ REFRESH (white text, glass bg)
- **Right**: Automatic toggle + AUTOMATIC button
  - Toggle: Green when ON, gray when OFF
  - Button: Orange text, orange bg

#### 5. Spectator Mode (No cartela selected)
- Shows "Game in Progress — Watching Only" text
- Eye icon (👁) above text
- Amharic text: "የእርስዎ ቅርጫት አልተመረጠም :: ለዚህ ዙር እድሜዎ አልባ ነው::"
- No cartela grids shown

### Color Scheme (Keep Current)
- Background: #0D1117 (dark)
- Card bg: #1A1A2E (glass)
- B: #10B981 (green)
- I: #3B82F6 (blue)
- N: #8B5CF6 (purple)
- G: #FF8C00 (orange)
- O: #14B8A6 (teal)
- Accent: #FF8C00 (orange)
- Success: #10B981 (green)
- Danger: #EF4444 (red)

### Changes from Current Implementation

1. **Master Grid**: Already correct (5×15), just needs column colors on numbers
2. **Right Panel Reorder**: Move called tags to TOP, then circle, then cartelas
3. **Cartela Header**: Add "CARTela NO: X" with orange gradient background
4. **Number Circle**: Add golden border/glow effect
5. **Spectator Mode**: Add eye icon and Amharic text
6. **Bottom Bar**: Keep current layout (already matches)
7. **Sound Icon**: Add to called tags strip area

### Files to Modify
1. `dashboard/game.html` — Restructure right panel HTML
2. `dashboard/css/game.css` — Add new styles for cartela headers, golden circle, spectator mode
3. `dashboard/js/game-board.js` — Update number announcement, add spectator UI
