# Yegara Bingo — Design Changes

## 1. Registration Flow (bot.py)

### Current Flow (3 steps)
1. Click "Register" → ask for full name
2. Type name → ask for phone number (+2519XXXXXXXX)
3. Type phone → ask for TeleBirr name
4. Type TeleBirr name → registration complete

### New Flow (2 steps — auto-fetch contact)
1. Click "Register 📝" → ask for full name + show "Share Contact" ReplyKeyboard button
2. Type name → show "Share Contact" button again
3. User taps "Share Contact" → Telegram requests permission → phone auto-sent
4. Registration complete (name + phone only, NO telebirr_name)

### Implementation

#### State machine
```python
# OLD
REG_NAME, REG_PHONE, REG_TELEBIRR_NAME = range(3)

# NEW
REG_NAME, REG_CONTACT = range(2)  # REG_TELEBIRR_NAME removed
```

#### handle_register (entry point)
```python
async def handle_register(update, context):
    # Check if already registered
    # ...
    # Ask for name + show Share Contact keyboard
    kb = ReplyKeyboardMarkup(
        [[KeyboardButton("📱 Share Contact", request_contact=True)]],
        one_time_keyboard=True, resize_keyboard=True
    )
    await update.effective_message.reply_text(
        "📝 Please enter your full name:",
        reply_markup=kb
    )
    return REG_NAME
```

#### reg_name handler
```python
async def reg_name(update, context):
    context.user_data['reg_name'] = update.message.text.strip()
    # Show Share Contact keyboard again
    kb = ReplyKeyboardMarkup(
        [[KeyboardButton("📱 Share Contact", request_contact=True)]],
        one_time_keyboard=True, resize_keyboard=True
    )
    await update.message.reply_text(
        "📱 Now share your contact so we can get your phone number automatically.\n"
        "Tap the button below:",
        reply_markup=kb
    )
    return REG_CONTACT
```

#### reg_contact handler (NEW — replaces reg_phone + reg_telebirr_name)
```python
async def reg_contact(update, context):
    contact = update.message.contact
    if not contact:
        await update.message.reply_text("❌ Please tap the Share Contact button.")
        return REG_CONTACT

    phone = contact.phone_number
    if not phone.startswith('+'):
        phone = '+' + phone

    name = context.user_data.get('reg_name', update.effective_user.first_name)
    await user_manager.register_user(update.effective_user.id, name, phone, '')
    await update.message.reply_text(
        f"✅ Registration complete!\n\n"
        f"Name: {name}\n"
        f"Phone: {phone}",
        reply_markup=MAIN_KEYBOARD,
    )
    return ConversationHandler.END
```

#### ConversationHandler update
```python
reg_conv = ConversationHandler(
    entry_points=[
        MessageHandler(filters.Regex("^📝 Register$"), handle_register),
        CallbackQueryHandler(handle_register, pattern="^menu_register$"),
    ],
    states={
        REG_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, reg_name)],
        REG_CONTACT: [MessageHandler(filters.CONTACT, reg_contact),
                       MessageHandler(filters.TEXT & ~filters.COMMAND, reg_contact)],
    },
    fallbacks=[CommandHandler("start", start)],
)
```

#### Cleanup
- Remove `REG_TELEBIRR_NAME` constant
- Remove `reg_telebirr_name` function
- Remove `telebirr_name` from `register_user()` call (pass empty string)
- Update `is_registered()` in user_manager.py to NOT require telebirr_name
- Update "already registered" message to remove TeleBirr Name line

---

## 2. TeleBirr Name in Deposit & Withdraw

### Current
- telebirr_name collected during registration and stored in user document
- Sent with deposit/withdrawal request as `telebirrName` from user profile

### New
- telebirr_name NOT collected during registration
- Asked EVERY TIME during deposit and withdrawal flow
- Stored with the specific transaction (not in user profile)

### Deposit Flow Change

Current flow:
1. Enter amount → 2. Send screenshot → 3. Submit

New flow:
1. Enter amount → 2. Enter TeleBirr name → 3. Send screenshot → 4. Submit

#### New state
```python
DEPOSIT_AMOUNT, DEPOSIT_TELEBIRR_NAME, AWAIT_PHOTO = 11, 12, 3
```

#### New handler: deposit_telebirr_name
```python
async def deposit_telebirr_name(update, context):
    context.user_data['telebirr_name'] = update.message.text.strip()
    amount = context.user_data.get('deposit_amount', 0)
    await update.message.reply_text(
        f"💵 *Deposit {amount} ETB via TeleBirr*\n\n"
        f"1. Send *{TELEBIRR_NUMBER}* via TeleBirr\n"
        f"2. Take a screenshot of the confirmation\n"
        f"3. Send the screenshot here\n\n"
        f"⏳ Waiting for your screenshot...",
        parse_mode='Markdown',
    )
    return AWAIT_PHOTO
```

#### Update deposit_amount handler
```python
async def deposit_amount(update, context):
    # ... existing amount validation ...
    context.user_data['deposit_amount'] = amount
    await update.message.reply_text(
        "💰 Please enter your TeleBirr name\n"
        "(The name registered on your TeleBirr account):"
    )
    return DEPOSIT_TELEBIRR_NAME  # NEW — was AWAIT_PHOTO
```

#### Update deposit_data in handle_screenshot
```python
deposit_data = {
    # ... existing fields ...
    'telebirrName': context.user_data.get('telebirr_name', ''),  # from conversation, not user profile
}
```

#### Update ConversationHandler states
```python
deposit_conv = ConversationHandler(
    # ... entry_points same ...
    states={
        DEPOSIT_AMOUNT: [MessageHandler(filters.TEXT & ~filters.COMMAND, deposit_amount)],
        DEPOSIT_TELEBIRR_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, deposit_telebirr_name)],
        AWAIT_PHOTO: [MessageHandler(filters.PHOTO, handle_screenshot)],
    },
    # ... fallbacks same ...
)
```

### Withdrawal Flow Change

Current flow:
1. Enter amount → 2. Enter phone → 3. Submit

New flow:
1. Enter amount → 2. Enter TeleBirr name → 3. Submit (phone from profile)

Actually — withdraw should also ask for TeleBirr name:
1. Enter amount → 2. Enter TeleBirr name → 3. Submit

#### Update withdraw_amount handler
```python
async def withdraw_amount(update, context):
    # ... existing validation ...
    context.user_data['withdraw_amount'] = amount
    await update.message.reply_text(
        "💰 Please enter your TeleBirr name\n"
        "(The name registered on your TeleBirr account):"
    )
    return WITHDRAW_TELEBIRR_NAME  # NEW state
```

#### New state
```python
WITHDRAW_AMOUNT, WITHDRAW_TELEBIRR_NAME = 4, 13
```

#### New handler
```python
async def withdraw_telebirr_name(update, context):
    context.user_data['telebirr_name'] = update.message.text.strip()
    uid = update.effective_user.id
    u = await user_manager.get_user(uid)
    amount = context.user_data.get('withdraw_amount', 0)
    phone = u.get('phone', '')
    # Create withdrawal request
    # ... submit with telebirr_name from context.user_data ...
    return ConversationHandler.END
```

---

## 3. Game UI Redesign (game.html + game.js)

### Reference: Yehulu Bingo (second image)

### Current Layout
```
┌─────────────────────────────────┐
│  Info Bar (Game/Players/Bet/..) │
├─────────────────────────────────┤
│  Called Numbers Strip (scroll)  │
├─────────────────────────────────┤
│  Music/Voice/Volume Controls    │
├──────────────┬──────────────────┤
│ Master Grid  │  Cartela #       │
│ (5x15)       │  [prev] [next]   │
│              │  B I N G O       │
│              │  (5x5 grid)      │
├──────────────┴──────────────────┤
│  Leave | Auto Toggle | Refresh  │
└─────────────────────────────────┘
```

### New Layout (matching reference)
```
┌─────────────────────────────────┐
│  Info Bar (same)                │
├─────────────────────────────────┤
│ Called Tags  ┌─────────┐        │
│ O-73 G-50   │  O-73   │ 🔊     │
│              │ (circle)│        │
│              └─────────┘        │
├──────────────┬──────────────────┤
│ Master Grid  │  CARTela NO: 37  │
│ B I N G O    │  B I N G O       │
│ (5x15)       │  (5x5 grid)     │
│              ├──────────────────┤
│              │  CARTela NO: 22  │
│              │  B I N G O       │
│              │  (5x5 grid)     │
├──────────────┴──────────────────┤
│ ×Leave  Refresh  Auto ═══ AUTOMATIC │
└─────────────────────────────────┘
```

### Key Changes

#### A. Two Cartelas Stacked (no prev/next)

**game.html** — Replace single cartela section with dual cartela containers:
```html
<div class="flex-1 glass rounded-xl p-1.5 min-w-0 flex flex-col gap-1.5">
    <!-- Cartela 1 -->
    <div class="flex-1 min-h-0">
        <div class="text-[9px] text-white/40 uppercase text-center mb-0.5">
            Cartela #<span id="cartela-number-1">0</span>
        </div>
        <div class="grid grid-cols-5 gap-px" id="cartela-grid-headers-1">
            <!-- B I N G O headers -->
        </div>
        <div class="grid grid-cols-5 gap-px" id="cartela-grid-1"></div>
    </div>
    <!-- Cartela 2 (hidden if only 1 cartela) -->
    <div id="cartela-container-2" class="flex-1 min-h-0">
        <div class="text-[9px] text-white/40 uppercase text-center mb-0.5">
            Cartela #<span id="cartela-number-2">0</span>
        </div>
        <div class="grid grid-cols-5 gap-px" id="cartela-grid-headers-2">
            <!-- B I N G O headers -->
        </div>
        <div class="grid grid-cols-5 gap-px" id="cartela-grid-2"></div>
    </div>
</div>
```

**game.js** — Update `setupGameBoard()`:
```javascript
function setupGameBoard() {
    const nums = Object.keys(myCartelas).map(Number);
    calledNumbers = new Set();

    // Info bar (same)
    // ...

    // Master grid (same)
    buildMasterGrid();

    // Build BOTH cartelas
    if (nums.length >= 1) {
        document.getElementById('cartela-number-1').textContent = nums[0];
        buildCartelaGrid('cartela-grid-1', myCartelas[nums[0]]);
    }
    if (nums.length >= 2) {
        document.getElementById('cartela-container-2').classList.remove('hidden');
        document.getElementById('cartela-number-2').textContent = nums[1];
        buildCartelaGrid('cartela-grid-2', myCartelas[nums[1]]);
    } else {
        document.getElementById('cartela-container-2').classList.add('hidden');
    }
    // No prev/next buttons needed
}
```

**Remove**: `switchCartela()`, `cartela-prev`, `cartela-next`, `currentCardIndex`

**Update** `buildCartelaGrid()` to take a target grid ID:
```javascript
function buildCartelaGrid(gridId, flat) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';
    // ... same logic as before ...
}
```

**Update** `autoMarkAllCartelas()` to mark cells in BOTH grids:
```javascript
function autoMarkAllCartelas(num) {
    if (!autoMarkEnabled) return;
    const grids = ['cartela-grid-1', 'cartela-grid-2'];
    for (const gridId of grids) {
        const grid = document.getElementById(gridId);
        if (!grid) continue;
        grid.querySelectorAll('.cartela-cell').forEach(cell => {
            if (parseInt(cell.dataset.num) === num && !cell.classList.contains('marked')) {
                markCartelaCell(cell, num);
            }
        });
    }
}
```

#### B. Number Announcement — Small Circle (not full-screen overlay)

**game.html** — Replace `number-announce` overlay:
```html
<!-- OLD: Full screen overlay -->
<div id="number-announce" class="fixed inset-0 z-[180] hidden">...</div>

<!-- NEW: Small circle in top-right of game board -->
<div id="number-announce" class="absolute top-1 right-1 z-10 hidden">
    <div class="w-14 h-14 rounded-full flex items-center justify-center"
         style="background: linear-gradient(135deg, #FF8C00, #F97316); box-shadow: 0 0 20px rgba(255,140,0,0.4);">
        <div class="text-center">
            <div id="announce-letter" class="text-[10px] font-black text-white/80"></div>
            <div id="announce-number" class="text-lg font-black text-white"></div>
        </div>
    </div>
</div>
```

**game.js** — Update `showNumberAnnouncement()`:
```javascript
function showNumberAnnouncement(num) {
    const letter = getNumberLetter(num);
    document.getElementById('announce-letter').textContent = letter;
    document.getElementById('announce-number').textContent = num;
    const el = document.getElementById('number-announce');
    el.classList.remove('hidden');
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = '';
    setTimeout(() => el.classList.add('hidden'), 2000);
}
```

**Remove**: `announce-countdown` element

#### C. Called Numbers — Tags at Top (not scrolling strip)

**game.html** — Replace `called-numbers-display` strip with inline tags:
```html
<!-- Move called tags + number announce into game-board-container -->
<div class="px-3 py-1 flex gap-2 relative" id="game-board-container">
    <div class="flex-1 glass rounded-xl p-1.5 min-w-0">
        <!-- Master grid -->
    </div>
    <div class="flex-1 glass rounded-xl p-1.5 min-w-0 relative flex flex-col gap-1.5">
        <!-- Number announce circle (absolute positioned top-right) -->
        <div id="number-announce" class="absolute top-1 right-1 z-10 hidden">...</div>
        <!-- Called tags row at top -->
        <div class="flex gap-1 flex-wrap" id="called-tags"></div>
        <!-- Cartela 1 -->
        <div class="flex-1 min-h-0">...</div>
        <!-- Cartela 2 -->
        <div id="cartela-container-2" class="flex-1 min-h-0">...</div>
    </div>
</div>
```

**Remove from top**: The separate `called-numbers-display` div between info-bar and music controls

**game.js** — Update `addCalledNumberStrip()` → `addCalledNumberTag()`:
```javascript
function addCalledNumberTag(num) {
    const strip = document.getElementById('called-tags');
    const letter = getNumberLetter(num);
    const color = getLetterColor(letter);
    const el = document.createElement('span');
    el.className = 'inline-flex flex-col items-center rounded-md px-1.5 py-0.5';
    el.style.background = color + '22';
    el.style.border = '1px solid ' + color + '44';
    el.innerHTML = '<div class="text-[7px] font-bold" style="color:' + color + '">' + letter + '</div>' +
                   '<div class="text-[10px] font-black text-white">' + num + '</div>';
    strip.appendChild(el);
}
```

#### D. Bottom Bar Update

**game.html** — Match reference layout:
```html
<div class="px-3 py-2 mt-auto">
    <div class="glass rounded-xl p-2 flex items-center justify-between">
        <button onclick="navigateTo('home')" class="bg-red-500/20 text-red-400 px-3 py-2 rounded-lg text-[11px] font-semibold btn-hover flex items-center gap-1">
            <svg ...>×</svg>
            Leave
        </button>
        <button onclick="refreshGame()" class="bg-white/10 text-white/70 px-3 py-2 rounded-lg text-[11px] font-semibold btn-hover flex items-center gap-1">
            Refresh
        </button>
        <div class="flex items-center gap-2">
            <span class="text-[10px] text-white/50">Automatic</span>
            <div id="auto-toggle" class="auto-toggle" onclick="toggleAutoMark()"></div>
        </div>
        <button onclick="toggleAutoMark()" class="bg-bingo-orange/20 text-bingo-orange px-3 py-2 rounded-lg text-[11px] font-semibold btn-hover">
            AUTOMATIC
        </button>
    </div>
</div>
```

#### E. Remove from game.html
- `cartela-prev` button
- `cartela-next` button
- `called-numbers-display` div (replaced by `called-tags`)
- `announce-countdown` element

#### F. Remove from game.js
- `switchCartela()` function
- `currentCardIndex` variable (no longer needed)
- `numberCallInterval` variable (was for old countdown)
- Update `buildCartelaGrid` to accept grid ID parameter
- Update `checkMyBingo` — iterate both cartela grids
- Update `showWinModal` — show winning cartela from correct grid

---

## 4. Files to Modify

| File | Changes |
|------|---------|
| `bot.py` | Registration flow (remove telebirr_name, add contact sharing), deposit/withdraw telebirr_name step |
| `handlers/user_manager.py` | Update `is_registered()` to not require telebirr_name |
| `dashboard/game.html` | Game layout (dual cartela, number announce circle, called tags, bottom bar) |
| `dashboard/js/game.js` | Game logic (dual cartela rendering, auto-mark both, remove switchCartela) |
| `config.py` | Add new conversation state constants if needed |

## 5. Conversation States Summary

```python
# Registration
REG_NAME = 0
REG_CONTACT = 1  # was REG_PHONE

# Deposit
DEPOSIT_AMOUNT = 11
DEPOSIT_TELEBIRR_NAME = 12  # NEW
AWAIT_PHOTO = 3

# Withdraw
WITHDRAW_AMOUNT = 4
WITHDRAW_TELEBIRR_NAME = 13  # NEW
WITHDRAW_PHONE = 5  # REMOVE (phone from profile)

# Transfer (unchanged)
TRANSFER_ID = 6
TRANSFER_AMOUNT = 7
TRANSFER_CONFIRM = 8

# Bonus (unchanged)
BONUS_CONFIRM = 9
PLAY_STAKE = 10
```

## 6. Testing Checklist

### Registration
- [ ] Click Register → asks for name + shows Share Contact button
- [ ] Type name → asks for contact
- [ ] Tap Share Contact → phone auto-extracted → registration complete
- [ ] Deny contact → can still type phone manually
- [ ] Already registered → shows info without telebirr_name

### Deposit
- [ ] Click Deposit → enter amount → enter TeleBirr name → send screenshot → submitted
- [ ] TeleBirr name shown in admin notification
- [ ] TeleBirr name NOT required in user profile

### Withdraw
- [ ] Click Withdraw → enter amount → enter TeleBirr name → submitted
- [ ] TeleBirr name shown in admin notification

### Game UI
- [ ] Both cartelas visible (stacked) when user has 2
- [ ] Only one cartela visible when user has 1
- [ ] Number announcement is small circle, not overlay
- [ ] Called numbers shown as tags, not scrolling strip
- [ ] Auto-mark works on both cartelas
- [ ] Bingo check works on both cartelas
- [ ] Leave/Refresh/Automatic buttons work
