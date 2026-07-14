# Yegara Bingo - Master Plan
## Based on Yehulu Bingo Reference

---

## CORRECT Game Flow

### Step 1: Player Pays Stake
- Player selects 10 or 20 ETB stake
- Deducts from play wallet
- Enters waiting room

### Step 2: Card Selection Screen (24 second timer)
```
┌─────────────────────────────────┐
│  MAIN WALLET    PLAY WALLET     │
│    0.00            0.00         │
│                                 │
│  STAKE: 10    DERASH: 64        │
│              TIMER: 24s         │
├─────────────────────────────────┤
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ... │
│  │ 1│ │ 2│ │ 3│ │ 4│ │ 5│     │
│  └──┘ └──┘ └──┘ └──┘ └──┘     │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐     │
│  │ 9│ │10│ │11│ │12│ │13│     │
│  └──┘ └──┘ └──┘ └──┘ └──┘     │
│  ...                            │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐     │
│  │73│ │74│ │75│ │76│ │77│     │
│  └──┘ └──┘ └──┘ └──┘ └──┘     │
├─────────────────────────────────┤
│  [BACK]            [REFRESH]    │
│                                 │
│  Game    History   Wallet  Profile│
└─────────────────────────────────┘
```

- Scrollable grid of 400 card numbers (each = a pre-generated cartela)
- **Orange highlight** = already taken by another player
- Player TAPS a number to SELECT that card
- Timer counts down from 24 seconds
- **DERASH: 64** = available cards remaining
- If timer runs out → player doesn't play

### Step 3: Game Starts (After Timer)
- Player sees their selected cartela (5×5 grid)
- Left side: Master grid showing numbers 1-75 (B-I-N-G-O columns)
- Right side: Player's personal cartela
- Numbers begin calling one by one

### Step 4: Number Calling (1-75)
```
Called: O-73, G-50

Left Master Grid:          Right Cartela (No. 37):
B   I   N   G   O         B   I   N   G   O
1   16  31  46  61        14  30  38  60  68
2   17  32  47  62         5  29  44  49  72
3   18  33  48  63         1  16   ⭐ 51  63
4   19  34  49  64         4  28  31  55  65
5   20  35 [50] 65         3  24  36  52  74
...
13  28  43  58 [73]
```

- Numbers called with letter prefix: **O-73**, **G-50**
- Matching numbers highlighted on both grids
- Player marks matching numbers on their cartela (manually or auto)
- **First to complete a line wins**

### Step 5: Win Detection
- Row, column, or diagonal complete = BINGO
- System validates the claim
- If valid → player wins prize (Stake × 15.2)
- If false claim → penalty

---

## Card Generation (Admin Managed)

### How Cards Are Created
1. **Admin generates cards** via dashboard "Cartela Pool"
2. System creates 400 pre-generated cartelas
3. Each cartela = 5×5 grid with random numbers (B:1-15, I:16-30, N:31-45, G:46-60, O:61-75)
4. Center cell is free (star ⭐)
5. Stored in Firestore `cartela_pool` collection

### Card Selection Flow
1. Player enters game → sees scrollable grid of 400 card numbers
2. Available cards = white/light
3. Taken cards = orange/highlighted
3. Player taps a card number → selects it
4. Timer counts down (24 seconds)
5. If selected before timer → plays with that card
6. If not selected → doesn't play

---

## Number Calling System

### Standard Bingo Numbers (1-75)
```
B: 1-15    (Green)
I: 16-30   (Blue)
N: 31-45   (Purple)
G: 46-60   (Orange)
O: 61-75   (Teal)
```

### Calling Flow
1. Shuffle all 75 numbers
2. Call one number at a time (every 6 seconds)
3. Show big announcement: "O-73" with vibration
4. 5-second countdown to mark
5. Highlight on master grid and player's cartela
6. Check for bingo after each mark

---

## Game Board Layout (During Play)

### Top Bar
- **Game ID**: #2263D1
- **Players**: 12 (number of players in this game)
- **Bet**: 10 (stake amount)
- **Derash**: 96 (numbers remaining to call)
- **Called**: 2 (how many numbers called so far)

### Left Side: Master Grid (15×5 = 75 numbers)
- Shows ALL possible numbers 1-75
- Called numbers highlighted
- Reference for player

### Right Side: Player's Cartela (5×5)
- Shows player's specific numbers
- Called numbers get highlighted
- Can have multiple cartelas
- Center is free (⭐)

### Bottom Controls
- **Leave**: Exit game (no winner)
- **Refresh**: Refresh game state
- **Automatic Toggle**: Switch manual/auto marking
- **AUTOMATIC**: Enable auto mode

---

## Winning Rules

### How to Win
1. Complete any ROW (5 numbers)
2. Complete any COLUMN (5 numbers)
3. Complete any DIAGONAL (5 numbers)
4. First to complete any line wins

### Prize Calculation
- Stake × 15.2
- 10 ETB → 152 ETB
- 20 ETB → 304 ETB

### False Bingo Penalty
- If player claims bingo falsely → penalty
- System validates before declaring winner
- Admin can block false claims

---

## Admin Controls

### 1. Cartela Pool Management
- Generate cartelas (batch of 10)
- View available/assigned/used counts
- Delete cartelas

### 2. Game Control (Per Game)
- **Allow Win**: Next dangerous number gets called → player wins
- **Block Win**: Dangerous numbers skipped → game ends with no winner
- **Random**: Enable random winning
- **End Game**: Force end with no winner

### 3. Real-time Sync
- Bot and dashboard stay in sync via Firestore
- Admin actions update instantly across all platforms
- Player sees nothing about admin control

---

## Database Structure

### Firestore Collections
```
users/{userId}/
  first_name, username, balance, play_wallet
  total_games, wins, is_playing

games/{gameId}/
  user_id, stake, status, called_numbers, marked_numbers
  cartela (flat 25), cartela_number
  allow_win, win_user_id, admin_action
  winner, prize, created_at, updated_at

cartela_pool/{docId}/
  cartela (flat 25), status ('available'|'assigned'|'used')
  number (card identifier 1-400)
  assigned_to, game_id, generated_at, assigned_at

deposits/{docId}/
  userId, amount, transactionId, status, createdAt

withdrawals/{docId}/
  userId, amount, telebirrNumber, status, createdAt
```

---

## Bots

### 1. Game Bot (@yegarabingobot)
- /start → Creates user, shows Play Now
- Menu button → Opens Mini App

### 2. Payment Bot (@yegarapaymentbot)
- /start → Balance, Deposit, Withdraw buttons
- Deposit: TeleBirr → screenshot → OCR → admin approval

### 3. Admin Bot (@yegaraadminbot)
- /games → Active games with control buttons
- Allow/Block/Random win
- Deposit/withdrawal approval

---

## Implementation Checklist

### Phase 1: Card Selection Screen
- [x] Scrollable grid showing 400 card numbers (each = a cartela)
- [x] 24-second timer countdown
- [x] Orange = taken, white = available
- [x] Tap to select card
- [x] DERASH counter (available cards)

### Phase 2: Game Board (During Play)
- [x] Left: Master grid (1-75, B-I-N-G-O)
- [x] Right: Player's cartela (5×5)
- [x] Top: Game ID, Players, Bet, Derash, Called
- [x] Bottom: Leave, Refresh, Automatic toggle
- [x] Big number announcement with sound

### Phase 3: Number Calling (1-75)
- [x] Standard bingo letters (B:1-15, I:16-30, etc.)
- [x] 6-second interval between calls
- [x] 5-second countdown per number
- [x] Phone vibration
- [x] Highlight on both grids
- [x] Sound effect on number call

### Phase 4: Win Detection
- [x] Row/column/diagonal check
- [x] Auto-detect bingo
- [x] Admin approval flow
- [x] Prize calculation (stake × 15.2)

### Phase 5: Admin Integration
- [x] Cartela pool management (generate 400, sequential numbering)
- [x] Game control (Allow/Block/Random)
- [x] Real-time sync
- [x] Player stats

---

## Key Differences from Current Build

### Must Change
1. Card selection grid (1-400 scrollable) instead of "pick 1 of 3 cartelas"
2. 24-second selection timer
3. Master grid on left (1-75) during game
4. Player's cartela on right during game
5. Automatic toggle for marking
6. Derash counter
7. Sound for number calls

### Keep Same
1. Smart algorithm (dangerous number detection)
2. Admin control (Allow/Block/Random)
3. Cartela pool management
4. Payment system
5. Real-time sync
