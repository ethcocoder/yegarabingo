# Production Fix Report — Issues 1-4

## Date: 2026-07-18

---

## Issue 1: Game UI Must Match Image Exactly (Side-by-Side on ALL Devices)

### Current Problem
`flex-col md:flex-row` stacks master grid on top of cartela on all phones (<768px). User wants side-by-side always.

### Image Analysis
- LEFT: Master grid (5×15, compact cells) — ~50% width, scrollable
- RIGHT: Called tags + Number circle + Cartela (5×5) — ~50% width
- Stats bar: horizontal scrollable row
- Bottom bar: compact Leave/Refresh/Automatic

### Implementation
- `game-board.html`: Change to `flex-row` always, `w-1/2` both panels, `gap-1.5`
- `game.css`: Master grid `max-height: calc(100vh - 220px)`, font-size 6px mobile
- `components.css`: Master cell font-size 7px, number circle responsive (56px→80px→110px)
- `game-board.js`: Cartela cells `text-[10px] py-1.5`
- Stats bar: `flex overflow-x-auto` with `flex-shrink-0` pills

---

## Issue 2: Revert Timer — Real-Time 35s Selection + 5s Game

### Current Problem
Timer was removed. User wants it back as a real-time countdown.

### Implementation
- Server: Add `SELECTION_DURATION = 35` to `round_engine.py`
- Server: Store `selection_deadline` in round document
- Server: Game loop waits for deadline OR starts when player_count > 0 (whichever first)
- Client card-select: Show 35s countdown bar using `serverNow()` vs `selection_deadline`
- Client game-board: Show 5s countdown between number calls using `next_number_at`
- Both timers use `serverNow()` for accurate sync

---

## Issue 3: Winning Logic — Standard Bingo (Row, Column, Diagonal)

### Current Problem
`checkBingoLocal` already checks all 12 lines (5 rows + 5 columns + 2 diagonals) correctly.
Free space (center=0) is handled. The issue may be:
1. Bingo check triggers at `>= 4` numbers — correct minimum but may miss edge cases
2. The winning claim transaction may have race conditions

### Implementation
- Verify `checkBingoLocal` is correct (it is — all 12 lines checked)
- Ensure `checkMyBingo` is called on every new number call (not just `>= 4`)
- Add server-side bingo verification in `end_round`
- Ensure winner is properly published and history shows it

---

## Issue 4: Add Telegram Bot Commands

### Current Problem
Only `/start` is registered. Need `/play`, `/deposit`, `/withdraw`, `/register`, `/balance`, `/transfer`, `/invite`, `/help`.

### Implementation
Add CommandHandler registrations in `main()` for each:
- `/play` → same as `handle_play`
- `/deposit` → same as `handle_deposit`  
- `/withdraw` → same as `handle_withdraw`
- `/register` → same as `handle_register`
- `/balance` → same as `handle_balance`
- `/transfer` → same as `handle_transfer`
- `/invite` → same as `handle_invite`
- `/help` → show available commands

---

## Implementation Order
1. Timer revert (Issue 2) — foundational
2. Game UI (Issue 1) — visual, independent
3. Winning logic verification (Issue 3) — logic check
4. Bot commands (Issue 4) — independent
