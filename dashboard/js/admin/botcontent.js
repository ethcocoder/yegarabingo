// ==================== BOT CONTENT CMS ====================
var _botContentCache = {};
var _currentBotCategory = 'welcome';

var BOT_CONTENT_DEFAULTS = {
    welcome: {
        welcome_registered: { label: 'Welcome (Registered User)', default: '👋 Welcome back, {name}!\n\n💰 Main Wallet: *{balance} ETB*\n🎮 Play Wallet: *{play_wallet} ETB*\n\nTap Play to start the game!', vars: 'name, balance, play_wallet' },
        welcome_new: { label: 'Welcome (New User)', default: '👋 Welcome to Yegara Bingo! Choose an Option below.', vars: '' },
        welcome_new_amharic: { label: 'Welcome Amharic', default: '🎮 ጨዋታውን ለመጀመር ከታች ያለውን Play የሚለውን ይጫኑ::\n(Click Play below to start the game)', vars: '' },
    },
    play: {
        play_wallet_info: { label: 'Play Button Info', default: '💰 Your Play Wallet: *{play_wallet} ETB*\n\n🎯 Stake: *10 ETB* per cartela (max 2)\n🏆 Derash: *(Players × Stake × 0.75) / Winners*\n\nTap below to open the game:', vars: 'play_wallet' },
        play_need_start: { label: 'Need /start', default: 'Please /start first.', vars: '' },
        instruction: { label: 'How to Play', default: '📖 *How to Play Yegara Bingo*\n\n1️⃣ Click *Play* and choose your stake (10 or 20 ETB)\n2️⃣ Select up to *3 cartelas* (bingo cards)\n3️⃣ The game board opens — numbers are called every 4 seconds\n4️⃣ Tap numbers on your card to mark them (or use Auto Mark)\n5️⃣ Complete a full line (row, column, or diagonal) to win!\n\n🎯 *Winning:* Complete any row, column, or diagonal\n🏆 *Derash:* 1.5x your stake\n⭐ *Free Space:* Center cell is always free\n\n💰 *Wallets:*\n• Main Wallet — deposit here via TeleBirr\n• Play Wallet — transfer from main to play\n• Bonus — earned from referrals\n\n📤 *Transfer:* Send funds to any user by ID\n🔄 *Convert Bonus:* Turn bonus coins into Play Wallet', vars: '' },
    },
    register: {
        register_already: { label: 'Already Registered', default: '✅ You are already registered!\n\nName: {name}\nPhone: {phone}', vars: 'name, phone' },
        register_ask_contact: { label: 'Ask Contact', default: '📱 Tap the button below to share your contact:', vars: '' },
        register_complete: { label: 'Registration Complete', default: '✅ Registration complete!\n\nName: {name}\nPhone: {phone}', vars: 'name, phone' },
    },
    deposit: {
        deposit_too_many: { label: 'Too Many Pending', default: '⚠️ You have too many pending deposits.\nWait for them to be processed.', vars: '' },
        deposit_ask_name: { label: 'Ask TeleBirr Name', default: '💰 Please enter your TeleBirr name\n(The name registered on your TeleBirr account):', vars: '' },
        deposit_ask_amount: { label: 'Ask Amount', default: '💰 Enter deposit amount (ETB):', vars: '' },
        deposit_min_amount: { label: 'Min Amount Error', default: '⚠️ Minimum deposit is 10 ETB. Enter again:', vars: '' },
        deposit_invalid_number: { label: 'Invalid Number', default: '❌ Enter a valid number:', vars: '' },
        deposit_ask_txn: { label: 'Ask Transaction Number', default: '🔢 Enter the TeleBirr Transaction Number\n(Found on your payment receipt, e.g. DFL35JF5):', vars: '' },
        deposit_admin_offline: { label: 'Admin Offline', default: '⚠️ Admin is offline. Please try again later.', vars: '' },
        deposit_submitted: { label: 'Deposit Submitted', default: '✅ Deposit request submitted!\n\n💵 Amount: {amount} ETB\n👤 Name: {telebirr_name}\n🔢 Transaction: {transaction_id}\n🆔 `{deposit_id}`\n\nAdmin will review and approve shortly.', vars: 'amount, telebirr_name, transaction_id, deposit_id' },
        deposit_approved: { label: 'Deposit Approved', default: '✅ Deposit approved!\n💰 {amount} ETB has been added to your wallet.', vars: 'amount' },
        deposit_rejected: { label: 'Deposit Rejected', default: '❌ Deposit rejected.\nPlease contact support if you need help.', vars: '' },
        deposit_duplicate_txn: { label: 'Duplicate Transaction', default: '❌ This transaction number was already submitted.', vars: '' },
    },
    withdraw: {
        withdraw_min_not_met: { label: 'Minimum Not Met', default: '❌ Minimum withdrawal is {min_withdraw} ETB.\nYour balance: {balance} ETB', vars: 'min_withdraw, balance' },
        withdraw_ask_amount: { label: 'Ask Amount', default: '🎰 *Withdraw*\n\nYour balance: *{balance} ETB*\nMinimum: {min_withdraw} ETB\n\nEnter amount:', vars: 'balance, min_withdraw' },
        withdraw_invalid_range: { label: 'Invalid Range', default: '❌ Enter amount between {min_withdraw} and {balance} ETB.', vars: 'min_withdraw, balance' },
        withdraw_invalid_number: { label: 'Invalid Number', default: '❌ Enter a valid number.', vars: '' },
        withdraw_ask_name: { label: 'Ask TeleBirr Name', default: '💰 Please enter your TeleBirr name\n(The name registered on your TeleBirr account):', vars: '' },
        withdraw_submitted: { label: 'Withdrawal Submitted', default: '✅ Withdrawal request submitted!\n\nAmount: {amount} ETB\nPhone: {phone}\nID: `{withdrawal_id}`\n\nAdmin will process it shortly.', vars: 'amount, phone, withdrawal_id' },
        withdraw_approved: { label: 'Withdrawal Approved', default: '✅ Withdrawal approved!\n💰 {amount} ETB will be sent to your TeleBirr.', vars: 'amount' },
        withdraw_rejected: { label: 'Withdrawal Rejected', default: '❌ Withdrawal rejected.\nPlease contact support.', vars: '' },
        withdraw_no_phone: { label: 'No Phone', default: '❌ Please register with your phone number first.\nUse /register to complete registration.', vars: '' },
        withdraw_above_max: { label: 'Above Maximum', default: '❌ Maximum withdrawal is {max} ETB per request.', vars: 'max' },
        withdraw_account_new: { label: 'Account Too New', default: '❌ Your account is too new.\nPlease wait 24 hours after registration before withdrawing.', vars: '' },
        withdraw_pending_exists: { label: 'Pending Exists', default: '❌ You already have a pending withdrawal.\nWait for it to be processed before requesting another.', vars: '' },
        withdraw_daily_limit: { label: 'Daily Limit', default: '❌ Daily withdrawal limit reached.\nYou can make up to {limit} withdrawals per day. Try again tomorrow.', vars: 'limit' },
        withdraw_cooldown: { label: 'Cooldown', default: '⏳ Please wait {minutes} minutes before making another withdrawal.\n(Cooldown: {hours} hours between requests)', vars: 'minutes, hours' },
    },
    transfer: {
        transfer_no_balance: { label: 'No Balance', default: '❌ No balance to transfer.\nYour balance: {balance} ETB', vars: 'balance' },
        transfer_ask_id: { label: 'Ask Recipient ID', default: '🎁 Transfer\nYour balance: {balance} ETB\n\nEnter recipient\'s Telegram User ID:', vars: 'balance' },
        transfer_invalid_id: { label: 'Invalid ID', default: '❌ Enter a valid numeric User ID.', vars: '' },
        transfer_self: { label: 'Self Transfer', default: '❌ You cannot transfer to yourself.', vars: '' },
        transfer_not_found: { label: 'User Not Found', default: '❌ User not found. Check the ID and try again.', vars: '' },
        transfer_ask_amount: { label: 'Ask Amount', default: '👤 Recipient: {name}\n💰 Enter amount to send (ETB):', vars: 'name' },
        transfer_invalid_amount: { label: 'Invalid Amount', default: '❌ Enter a valid number.', vars: '' },
        transfer_amount_range: { label: 'Amount Out of Range', default: '❌ Enter amount between 1 and {balance} ETB.', vars: 'balance' },
        transfer_confirm: { label: 'Confirm Transfer', default: '📤 Send {amount} ETB to {name}?', vars: 'amount, name' },
        transfer_cancelled: { label: 'Transfer Cancelled', default: 'Transfer cancelled.', vars: '' },
        transfer_sent: { label: 'Transfer Sent', default: '✅ Sent {amount} ETB to {name} successfully!', vars: 'amount, name' },
        transfer_failed: { label: 'Transfer Failed', default: '❌ Transfer failed. Check your balance and try again.', vars: '' },
    },
    bonus: {
        bonus_no_coins: { label: 'No Bonus Coins', default: '❌ No bonus coins to convert.', vars: '' },
        bonus_convert_info: { label: 'Convert Info', default: '🔄 Convert Bonus\n\nYou have: {coins} coins\nRate: {rate} coins = 1 ETB\nYou will receive: {etb} ETB in Play Wallet', vars: 'coins, rate, etb' },
        bonus_cancelled: { label: 'Cancelled', default: 'Cancelled.', vars: '' },
        bonus_converted: { label: 'Converted', default: '✅ Converted! +{etb} ETB added to your Play Wallet.', vars: 'etb' },
        bonus_convert_failed: { label: 'Convert Failed', default: '❌ Conversion failed. No bonus available.', vars: '' },
    },
    invite: {
        invite_link: { label: 'Referral Link', default: '🔗 Your Referral Link\n\n{link}\n\nShare this link with friends!\nYou earn {referral_bonus} ETB for each friend who registers.', vars: 'link, referral_bonus' },
    },
    support: {
        support_info: { label: 'Support Info', default: '🆘 Need help?\n\n👇 For any questions or feedback 👇\n\n👤 @{support_username}', vars: 'support_username' },
    },
    admin: {
        admin_deposit_notification: { label: 'Deposit Notification (Admin)', default: '💵 *New Deposit Request*\n\n👤 *User:* {first_name} (@{username})\n📱 *TeleBirr Name:* {telebirr_name}\n💵 *Amount:* {amount} ETB\n🔢 *Transaction:* {transaction_id}\n\n🆔 `{deposit_id}`\n🕐 {timestamp}', vars: 'first_name, username, telebirr_name, amount, transaction_id, deposit_id, timestamp' },
        admin_withdrawal_notification: { label: 'Withdrawal Notification (Admin)', default: '🎰 *New Withdrawal Request*\n\n👤 {first_name} (@{username})\n💰 TeleBirr Name: {telebirr_name}\n💵 Amount: {amount} ETB\n📱 Phone: {phone}\n🆔 {withdrawal_id}\n🕐 {timestamp}', vars: 'first_name, username, telebirr_name, amount, phone, withdrawal_id, timestamp' },
    },
    stats: {
        stats_title: { label: 'Stats Message', default: '📊 *Your Stats*\n\n🎮 Games Played: {total}\n🏆 Wins: {wins}\n❌ Losses: {losses}\n📈 Win Rate: {win_rate}\n\n💳 Main Wallet: {balance} ETB\n🎮 Play Wallet: {play_wallet} ETB\n🪙 Bonus Coins: {bonus}', vars: 'total, wins, losses, win_rate, balance, play_wallet, bonus' },
        leaderboard_no_games: { label: 'No Games (Leaderboard)', default: '🏆 No games played yet. Be the first!', vars: '' },
        leaderboard_title: { label: 'Leaderboard Title', default: '🏆 *Top Players*\n', vars: '' },
        history_no_games: { label: 'No History', default: 'No game history yet. Play a game first!', vars: '' },
        history_title: { label: 'History Title', default: '📋 *Your Recent Games*\n', vars: '' },
        cancel: { label: 'Cancel Message', default: 'Cancelled.', vars: '' },
    }
};

function loadBotCategory(cat) {
    _currentBotCategory = cat;
    document.querySelectorAll('.botcat-tab').forEach(function(t) {
        t.classList.remove('active');
        t.classList.add('text-gray-400');
    });
    var activeTab = document.querySelector('.botcat-tab[data-cat="' + cat + '"]');
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.classList.remove('text-gray-400');
    }

    var VAR_DESCRIPTIONS = {
        name: 'User\'s name', balance: 'Wallet balance', play_wallet: 'Play wallet balance',
        phone: 'Phone number', amount: 'Amount in ETB', telebirr_name: 'TeleBirr name',
        transaction_id: 'Transaction number', deposit_id: 'Deposit ID', withdrawal_id: 'Withdrawal ID',
        timestamp: 'Date & time', first_name: 'User first name', username: 'Telegram username',
        min_withdraw: 'Min withdrawal', total: 'Total games', wins: 'Win count',
        losses: 'Loss count', win_rate: 'Win percentage', bonus: 'Bonus coins',
        stake: 'Stake amount', players: 'Player count', coins: 'Bonus coins',
        rate: 'Conversion rate', etb: 'ETB amount', link: 'Referral link',
        referral_bonus: 'Referral bonus amount', support_username: 'Support username',
    };

    var messages = BOT_CONTENT_DEFAULTS[cat] || {};
    var editor = document.getElementById('botContentEditor');
    if (!editor) return;
    editor.innerHTML = '';

    Object.keys(messages).forEach(function(key) {
        var msg = messages[key];
        var currentVal = _botContentCache[key] || msg.default;
        var vars = msg.vars ? msg.vars.split(',').map(function(v) { return v.trim(); }).filter(Boolean) : [];

        var card = document.createElement('div');
        card.className = 'mb-6 rounded-xl overflow-hidden';
        card.style.cssText = 'background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)); border: 1px solid rgba(255,255,255,0.06);';

        var varsHtml = '';
        if (vars.length > 0) {
            varsHtml = '<div class="flex flex-wrap items-center gap-1.5 mt-2">' +
                '<span class="text-[10px] text-gray-500 mr-1">Insert:</span>' +
                vars.map(function(v) {
                    var desc = VAR_DESCRIPTIONS[v] || v;
                    return '<button type="button" onclick="insertVar(\'' + key + '\', \'' + v + '\')" ' +
                        'class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer" ' +
                        'style="background: rgba(16,185,129,0.1); color: #34D399; border: 1px solid rgba(16,185,129,0.2);" ' +
                        'onmouseover="this.style.background=\'rgba(16,185,129,0.2)\'" onmouseout="this.style.background=\'rgba(16,185,129,0.1)\'">' +
                        '<span style="color: #6EE7B7;">{</span>' + escHtml(v) + '<span style="color: #6EE7B7;">}</span>' +
                        '</button>';
                }).join('') +
                '</div>';
        }

        card.innerHTML =
            '<div class="px-4 py-3 flex items-center justify-between" style="background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.04);">' +
                '<div>' +
                    '<span class="text-sm font-semibold text-white">' + escHtml(msg.label) + '</span>' +
                    '<span class="text-[10px] text-gray-500 font-mono ml-2">' + key + '</span>' +
                '</div>' +
                '<div class="flex items-center gap-2">' +
                    '<button onclick="saveBotMessage(\'' + key + '\')" class="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all" style="background: rgba(16,185,129,0.15); color: #34D399; border: 1px solid rgba(16,185,129,0.2);">Save</button>' +
                    '<button onclick="resetBotMessage(\'' + key + '\')" class="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all" style="background: rgba(255,255,255,0.05); color: #9CA3AF; border: 1px solid rgba(255,255,255,0.08);">Reset</button>' +
                '</div>' +
            '</div>' +
            '<div class="p-4">' +
                '<textarea id="bce-' + key + '" rows="3" ' +
                    'class="w-full rounded-lg px-3 py-2.5 text-sm text-white border font-mono resize-y focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]/50 transition-all" ' +
                    'style="background: #0D1117; border-color: rgba(255,255,255,0.08);" ' +
                    'placeholder="Type your message here..."' +
                '>' + escHtml(currentVal) + '</textarea>' +
                varsHtml +
                '<div id="bce-status-' + key + '" class="text-[10px] text-gray-500 mt-2 h-4"></div>' +
            '</div>';
        editor.appendChild(card);
    });

    loadBotContentFromFirestore();
}

function insertVar(key, varName) {
    var textarea = document.getElementById('bce-' + key);
    if (!textarea) return;
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var text = textarea.value;
    var before = text.substring(0, start);
    var after = text.substring(end);
    textarea.value = before + '{' + varName + '}' + after;
    textarea.selectionStart = textarea.selectionEnd = start + varName.length + 2;
    textarea.focus();
    textarea.dispatchEvent(new Event('input'));
}

function loadBotContentFromFirestore() {
    db.collection('bot_content').get().then(function(snap) {
        snap.forEach(function(doc) {
            _botContentCache[doc.id] = doc.data().content;
            var textarea = document.getElementById('bce-' + doc.id);
            if (textarea) textarea.value = doc.data().content;
        });
    }).catch(function(e) { console.warn('Failed to load bot_content:', e); });
}

function saveBotMessage(key) {
    var textarea = document.getElementById('bce-' + key);
    if (!textarea) return;
    var value = textarea.value.trim();
    var statusEl = document.getElementById('bce-status-' + key);

    db.collection('bot_content').doc(key).set({
        key: key,
        content: value,
        category: _currentBotCategory,
        updatedAt: new Date()
    }).then(function() {
        _botContentCache[key] = value;
        if (statusEl) {
            statusEl.textContent = '✓ Saved';
            statusEl.className = 'text-[10px] text-[#10B981] ml-2';
            setTimeout(function() { statusEl.textContent = ''; }, 2000);
        }
    }).catch(function(e) {
        if (statusEl) {
            statusEl.textContent = 'Error: ' + e.message;
            statusEl.className = 'text-[10px] text-red-400 ml-2';
        }
    });
}

function resetBotMessage(key) {
    var messages = BOT_CONTENT_DEFAULTS[_currentBotCategory] || {};
    var msg = messages[key];
    if (!msg) return;
    var textarea = document.getElementById('bce-' + key);
    if (textarea) textarea.value = msg.default;
    db.collection('bot_content').doc(key).delete().catch(function() {});
    delete _botContentCache[key];
    var statusEl = document.getElementById('bce-status-' + key);
    if (statusEl) {
        statusEl.textContent = '✓ Reset to default';
        statusEl.className = 'text-[10px] text-[#FF8C00] ml-2';
        setTimeout(function() { statusEl.textContent = ''; }, 2000);
    }
}

function escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function seedBotContent() {
    if (!confirm('This will populate all bot messages with defaults. Existing customizations will be preserved. Continue?')) return;
    var apiBase = window.API_BASE || '';
    fetch(apiBase + '/api/admin/bot-content/seed', { method: 'POST' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            alert('Seeded ' + (data.seeded || 0) + ' messages!');
            loadBotContentFromFirestore();
        })
        .catch(function(e) { alert('Error: ' + e.message); });
}
