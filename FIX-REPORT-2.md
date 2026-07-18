# Fix Report — Issues 1-6

## Date: 2026-07-18

---

## Issue 1: Timer showing static "60s"
**Root Cause:** `created_at` is `FieldValue.serverTimestamp()` sentinel (not parseable) when round is created client-side in `playNow()`. Server also waits 60s before starting.
**Fix:** Remove timer entirely. Server starts round immediately when first player joins.

## Issue 2: Every page needs manual reload
**Root Cause:** 
- No navigation lock → rapid taps cause race conditions
- `initUser()` not awaited → pages show "0 ETB" before auth completes
- Failed page loads show invisible "Failed to load page" text
**Fix:** Add `isNavigating` guard, disable nav during init, add visible error state.

## Issue 3: Game board mobile responsiveness
**Root Cause:** `flex flex-col md:flex-row` (768px breakpoint) → master grid on top, cartela on bottom on ALL phones. Master grid is 900-1100px tall (2-3 screens).
**Fix:** Reverse layout on mobile (cartela top, master grid bottom in compact horizontal strip). Master grid becomes horizontal scrollable strip.

## Issue 4: Deposit command not responding
**Root Cause:** `_show_deposit_flow` calls `edit_message_text()` on a photo message → Telegram API `BadRequest` → silently caught by global error handler.
**Fix:** Use `reply_text()` to send new message instead of editing photo message.

## Issue 5: "Waiting for players to join" message
**Root Cause:** Server waits for `selection_deadline` (60s) before starting. Game-board.js shows message when `status === 'selecting'`.
**Fix:** Remove selection_deadline. Server starts immediately when `player_count > 0`. Remove "Waiting for players" message.

## Issue 6: Withdraw message must go to admin bot
**Root Cause:** Web dashboard `submitWithdrawal()` writes to Firestore but triggers NO Telegram notification to admin.
**Fix:** Add API endpoint `/api/withdraw` that creates withdrawal record AND sends Telegram notification via bot.

---

## Implementation Order
1. Issue 5 (server timer + waiting message) — foundational, affects other flows
2. Issue 1 (remove card-select timer) — depends on Issue 5
3. Issue 2 (page loader fixes) — independent
4. Issue 3 (game board responsiveness) — independent
5. Issue 4 (deposit bot fix) — independent
6. Issue 6 (withdraw admin notification) — independent
