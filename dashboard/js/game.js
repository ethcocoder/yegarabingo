// =====================================================================
// Yegara Bingo — Round-Based Multiplayer Game (Complete Rewrite)
// =====================================================================

// ==================== FIREBASE INIT ====================
const firebaseConfig = {
    apiKey: "AIzaSyBzemnXChPIBwCSCBIT2TgfMVhYiHc_JrY",
    authDomain: "bingo-bot-5c708.firebaseapp.com",
    projectId: "bingo-bot-5c708",
    storageBucket: "bingo-bot-5c708.firebasestorage.app",
    messagingSenderId: "988357359269",
    appId: "1:988357359269:web:eb8ce31819d6853c717f4c",
    measurementId: "G-2P5YYZWKF1"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

auth.onAuthStateChanged(function(user) {
    if (!user) {
        auth.signInAnonymously().catch(function(e) {
            console.warn('Anonymous auth failed:', e);
        });
    }
});

// ==================== CONSTANTS ====================
const STAKE = 10;
const MAX_CARTELAS = 2;
const SELECTION_SECONDS = 35;
const NUMBER_CALL_INTERVAL = 4000; // 4s between calls
const PRIZE_MULTIPLIER = 7.5;
const ADMIN_CUT = 0.25;

const BINGO_RANGES = [
    { min: 1, max: 15, letter: 'B', color: '#10B981' },
    { min: 16, max: 30, letter: 'I', color: '#3B82F6' },
    { min: 31, max: 45, letter: 'N', color: '#8B5CF6' },
    { min: 46, max: 60, letter: 'G', color: '#FF8C00' },
    { min: 61, max: 75, letter: 'O', color: '#14B8A6' }
];

// ==================== STATE ====================
let currentUser = null;
let currentScreen = 'home';
let currentRoundId = null;
let roundUnsubscribe = null;
let userUnsubscribe = null;
let statsUnsubscribe = null;
let selectionTimer = null;
let selectionDeadline = 0;
let selectedCartelas = [];
let myCartelas = {};       // { cartelaNum: [flat 25 ints] }
let currentCardIndex = 0;
let autoMarkEnabled = false;
let calledNumbers = new Set();
let numberCallInterval = null;
let winCountdownInterval = null;
let selectionHandled = false;

// Audio state
let musicEnabled = false;
let voiceEnabled = true;
let masterVolume = 0.8;
let bgMusicAudio = null;
let audioCtx = null;

// ==================== TELEGRAM INIT ====================
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#0D1117');
    tg.setBackgroundColor('#0D1117');
}

// ==================== AMHARIC NUMBER NAMES ====================
const AMHARIC_NUMBERS = {
    0:'ዜሮ',1:'አንድ',2:'ሁለት',3:'ሦስት',4:'አራት',5:'አምስት',
    6:'ስድስት',7:'ሰባት',8:'ስምንት',9:'ዘጠኝ',10:'አሥር',
    11:'አስራ አንድ',12:'አስራ ሁለት',13:'አስራ ሦስት',14:'አስራ አራት',15:'አስራ አምስት',
    16:'አስራ ስድስት',17:'አስራ ሰባት',18:'አስራ ስምንት',19:'አስራ ዘጠኝ',20:'ሀያ',
    21:'ሀያ አንድ',22:'ሀያ ሁለት',23:'ሀያ ሦስት',24:'ሀያ አራት',25:'ሀያ አምስት',
    26:'ሀያ ስድስት',27:'ሀያ ሰባት',28:'ሀያ ስምንት',29:'ሀያ ዘጠኝ',30:'ሠላሳ',
    31:'ሠላሳ አንድ',32:'ሠላሳ ሁለት',33:'ሠላሳ ሦስት',34:'ሠላሳ አራት',35:'ሠላሳ አምስት',
    36:'ሠላሳ ስድስት',37:'ሠላሳ ሰባት',38:'ሠላሳ ስምንት',39:'ሠላሳ ዘጠኝ',40:'አርባ',
    41:'አርባ አንድ',42:'አርባ ሁለት',43:'አርባ ሦስት',44:'አርባ አራት',45:'አርባ አምስት',
    46:'አርባ ስድስት',47:'አርባ ሰባት',48:'አርባ ስምንት',49:'አርባ ዘጠኝ',50:'ሃምሳ',
    51:'ሃምሳ አንድ',52:'ሃምሳ ሁለት',53:'ሃምሳ ሦስት',54:'ሃምሳ አራት',55:'ሃምሳ አምስት',
    56:'ሃምሳ ስድስት',57:'ሃምሳ ሰባት',58:'ሃምሳ ስምንት',59:'ሃምሳ ዘጠኝ',60:'ስልሳ',
    61:'ስልሳ አንድ',62:'ስልሳ ሁለት',63:'ስልሳ ሶስት',64:'ስልሳ አራት',65:'ስልሳ አምስት',
    66:'ስልሳ ስድስት',67:'ስልሳ ሰባት',68:'ስልሳ ስምንት',69:'ስልሳ ዘጠኝ',70:'ሰባ',
    71:'ሰባ አንድ',72:'ሰባ ሁለት',73:'ሰባ ሦስት',74:'ሰባ አራት',75:'ሰባ አምስት'
};

// ==================== AUDIO ====================
function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}
function playNumberSound() {
    if (!voiceEnabled) return;
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
    } catch(e) {}
}
function playMarkSound() {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
    } catch(e) {}
}
function playWinSound() {
    if (!voiceEnabled) return;
    try {
        const ctx = getAudioCtx();
        [523.25, 659.25, 783.99, 1046.50].forEach(function(freq, i) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
            gain.gain.setValueAtTime(masterVolume * 0.3, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.3);
        });
    } catch(e) {}
}
function toggleMusic() {
    musicEnabled = !musicEnabled;
    document.getElementById('music-icon').textContent = musicEnabled ? '🎵' : '🔇';
    if (musicEnabled) startBgMusic(); else stopBgMusic();
    localStorage.setItem('yegara_music', musicEnabled ? '1' : '0');
}
function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    document.getElementById('voice-icon').textContent = voiceEnabled ? '🔊' : '🔇';
    localStorage.setItem('yegara_voice', voiceEnabled ? '1' : '0');
}
function setVolume(val) {
    masterVolume = val / 100;
    document.getElementById('volume-slider').style.setProperty('--vol-pct', val + '%');
    localStorage.setItem('yegara_volume', val);
    if (bgMusicAudio) bgMusicAudio.volume = masterVolume * 0.3;
}
function startBgMusic() {
    if (bgMusicAudio) return;
    try {
        bgMusicAudio = new Audio('public/audio/bg_music.wav');
        bgMusicAudio.loop = true;
        bgMusicAudio.volume = masterVolume * 0.3;
        bgMusicAudio.play().catch(function() { bgMusicAudio = null; musicEnabled = false; });
    } catch(e) { bgMusicAudio = null; }
}
function stopBgMusic() {
    if (bgMusicAudio) { bgMusicAudio.pause(); bgMusicAudio.currentTime = 0; bgMusicAudio = null; }
}
function restoreAudioSettings() {
    if (localStorage.getItem('yegara_music') === '1') { musicEnabled = true; document.getElementById('music-icon').textContent = '🎵'; }
    if (localStorage.getItem('yegara_voice') === '0') { voiceEnabled = false; document.getElementById('voice-icon').textContent = '🔇'; }
    var vol = localStorage.getItem('yegara_volume');
    if (vol) { masterVolume = parseInt(vol) / 100; document.getElementById('volume-slider').value = vol; document.getElementById('volume-slider').style.setProperty('--vol-pct', vol + '%'); }
}

// ==================== HELPERS ====================
function getNumberLetter(num) {
    for (const r of BINGO_RANGES) { if (num >= r.min && num <= r.max) return r.letter; }
    return '?';
}
function getLetterColor(letter) {
    for (const r of BINGO_RANGES) { if (r.letter === letter) return r.color; }
    return '#FF8C00';
}
function showToast(msg) {
    const el = document.getElementById('toast');
    document.getElementById('toast-text').textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3000);
}
function showLoading(msg) {
    document.getElementById('loading-text').textContent = msg || 'Loading...';
    document.getElementById('loading-overlay').classList.remove('hidden');
}
function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

// ==================== AUTH / USER ====================
function getTelegramUser() {
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) return tg.initDataUnsafe.user;
    if (tg && tg.initData && tg.initData.length > 10) {
        try { const p = new URLSearchParams(tg.initData); const u = p.get('user'); if (u) return JSON.parse(u); } catch(e) {}
    }
    return null;
}

async function initUser() {
    if (!tg) {
        document.getElementById('user-greeting').textContent = '';
        const hero = document.querySelector('#screen-home .glass.rounded-2xl.p-5');
        if (hero) hero.innerHTML = '<div class="text-3xl mb-2">📱</div><h2 class="text-lg font-bold text-white mb-2">Open from Telegram</h2><p class="text-sm text-white/60 mb-4">Please open this game from the Telegram bot.</p><a href="https://t.me/yegarabingobot" target="_blank" class="inline-block gradient-orange text-white px-6 py-3 rounded-xl font-semibold text-sm">Open Bot</a>';
        return;
    }

    let tgUser = getTelegramUser();
    if (!tgUser || !tgUser.id) {
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 250));
            tgUser = getTelegramUser();
            if (tgUser && tgUser.id) break;
        }
    }
    if (!tgUser || !tgUser.id) {
        document.getElementById('user-greeting').innerHTML = 'Error loading user. <a href="javascript:location.reload()" style="color:#FF8C00;text-decoration:underline;">Tap to retry</a>';
        return;
    }

    const uid = tgUser.id;
    try {
        const userDoc = await db.collection('users').doc(String(uid)).get();
        if (userDoc.exists) {
            currentUser = { id: uid, ...userDoc.data() };
        } else {
            const newUser = {
                user_id: uid,
                first_name: tgUser.first_name || 'Player',
                username: tgUser.username || 'player' + uid,
                phone: '', balance: 0, play_wallet: 0, bonus: 0,
                total_games: 0, wins: 0, losses: 0, is_playing: false,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };
            await db.collection('users').doc(String(uid)).set(newUser);
            currentUser = { id: uid, ...newUser };
        }
        updateAllDisplays();
        listenToUserData();
        startStatsListener();
        if (!currentUser.phone) showRegistration();
    } catch (err) {
        console.error('Error initializing user:', err);
        document.getElementById('user-greeting').textContent = 'Error: ' + err.message;
    }
}

function showRegistration() {
    document.getElementById('regName').value = currentUser.first_name || '';
    document.getElementById('regPhone').value = currentUser.phone || '';
    document.getElementById('registerModal').classList.remove('hidden');
}

async function submitRegistration() {
    const name = document.getElementById('regName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    if (!name) { showToast('Please enter your name'); return; }
    if (!phone || !phone.startsWith('+251')) { showToast('Enter valid phone (+251...)'); return; }
    try {
        await db.collection('users').doc(String(currentUser.id)).update({
            first_name: name, phone: phone, registered: true,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        currentUser.first_name = name;
        currentUser.phone = phone;
        updateAllDisplays();
        document.getElementById('registerModal').classList.add('hidden');
        showToast('Profile complete!');
    } catch (err) { showToast('Error saving profile.'); }
}

function listenToUserData() {
    if (userUnsubscribe) userUnsubscribe();
    userUnsubscribe = db.collection('users').doc(String(currentUser.id)).onSnapshot(doc => {
        if (doc.exists) { currentUser = { id: currentUser.id, ...doc.data() }; updateAllDisplays(); }
    });
}

function startStatsListener() {
    if (statsUnsubscribe) statsUnsubscribe();
    // Live player count from active rounds
    statsUnsubscribe = db.collection('rounds').where('status', 'in', ['selecting', 'playing']).onSnapshot(snap => {
        let totalPlayers = 0;
        snap.forEach(doc => { totalPlayers += (doc.data().player_count || 0); });
        document.getElementById('stat-players').textContent = totalPlayers;
    });
    db.collection('rounds').where('status', '==', 'completed').get().then(snap => {
        document.getElementById('stat-games').textContent = snap.size;
    }).catch(() => {});
    // Winners today
    const today = new Date(); today.setHours(0, 0, 0, 0);
    db.collection('rounds').where('status', '==', 'completed').get().then(snap => {
        let winners = 0;
        snap.forEach(doc => {
            const d = doc.data();
            if (d.winners && d.winners.length > 0) {
                const ca = d.completed_at;
                if (ca) {
                    const dt = ca.toDate ? ca.toDate() : new Date(ca);
                    if (dt >= today) winners += d.winners.length;
                }
            }
        });
        document.getElementById('stat-winners').textContent = winners;
    }).catch(() => {});
}

// ==================== DISPLAY UPDATES ====================
function updateAllDisplays() {
    if (!currentUser) return;
    const bal = currentUser.balance || 0;
    const pw = currentUser.play_wallet || 0;
    document.getElementById('home-balance').textContent = bal + ' ETB';
    document.getElementById('home-play-wallet').textContent = pw + ' ETB';
    document.getElementById('wallet-balance').textContent = bal + ' ETB';
    document.getElementById('wallet-play').textContent = pw + ' ETB';
    document.getElementById('user-greeting').textContent = 'Hello, ' + (currentUser.first_name || 'Player') + '!';
    document.getElementById('profile-name').textContent = currentUser.first_name || 'Player';
    document.getElementById('profile-id').textContent = '@' + (currentUser.username || 'player');
    document.getElementById('profile-avatar').textContent = (currentUser.first_name || 'P')[0].toUpperCase();
    document.getElementById('profile-games').textContent = currentUser.total_games || 0;
    document.getElementById('profile-wins').textContent = currentUser.wins || 0;
    const tg2 = currentUser.total_games || 0;
    const w2 = currentUser.wins || 0;
    document.getElementById('profile-winrate').textContent = (tg2 > 0 ? Math.round((w2 / tg2) * 100) : 0) + '%';
    document.getElementById('profile-earnings').textContent = ((currentUser.wins || 0) * STAKE * PRIZE_MULTIPLIER) + ' ETB';
}

// ==================== NAVIGATION ====================
function navigateTo(screen) {
    if (currentScreen === 'game' && screen !== 'game') leaveGame();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('screen-' + screen);
    if (target) { target.classList.add('active'); target.classList.add('screen-transition'); }
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navBtn = document.querySelector('.nav-item[data-screen="' + screen + '"]');
    if (navBtn) navBtn.classList.add('active');
    currentScreen = screen;
    document.getElementById('bottom-nav').style.display = (screen === 'game') ? 'none' : '';
    if (screen === 'history') loadHistory();
}

// ==================== PLAY NOW ====================
async function playNow() {
    if (!currentUser) { showToast('Loading user data...'); return; }
    const pw = currentUser.play_wallet || 0;
    if (pw < STAKE) {
        showToast('Not enough balance! Need at least ' + STAKE + ' ETB');
        return;
    }

    showLoading('Finding game...');
    try {
        // Find or create active round
        let roundSnap = await db.collection('rounds')
            .where('status', '==', 'selecting')
            .orderBy('created_at', 'desc')
            .limit(1).get();

        let roundData, roundId;
        if (!roundSnap.empty) {
            const doc = roundSnap.docs[0];
            roundData = doc.data();
            roundId = doc.id;
            // Check if user already joined
            if (roundData.players && roundData.players[String(currentUser.id)]) {
                hideLoading();
                showToast('You already joined this round!');
                currentRoundId = roundId;
                navigateTo('game');
                await loadMyCartelas(roundData);
                listenToRound(roundId);
                return;
            }
        } else {
            // Create new round
            const now = new Date();
            const deadline = new Date(now.getTime() + SELECTION_SECONDS * 1000);
            roundData = {
                status: 'selecting',
                stake: STAKE,
                players: {},
                player_count: 0,
                taken_cartelas: [],
                called_numbers: [],
                winners: [],
                prize_per_winner: 0,
                admin_profit: 0,
                selection_deadline: firebase.firestore.Timestamp.fromDate(deadline),
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                completed_at: null,
            };
            const ref = await db.collection('rounds').add(roundData);
            roundId = ref.id;
        }

        currentRoundId = roundId;
        hideLoading();
        showCardSelection(roundId, roundData);
    } catch (err) {
        hideLoading();
        console.error('Error finding/creating round:', err);
        showToast('Error: ' + err.message);
    }
}

// ==================== CARD SELECTION (35s timer) ====================
async function showCardSelection(roundId, roundData) {
    selectedCartelas = [];
    updateSelectedInfo();

    document.getElementById('cs-stake').textContent = STAKE + ' ETB';
    document.getElementById('cs-main-wallet').textContent = (currentUser.balance || 0) + ' ETB';
    document.getElementById('cs-play-wallet').textContent = (currentUser.play_wallet || 0) + ' ETB';
    document.getElementById('card-select-screen').classList.remove('hidden');

    const grid = document.getElementById('card-select-grid');
    grid.innerHTML = '<div class="text-center py-8 col-span-10"><div class="text-3xl mb-2 float-anim">🃏</div><p class="text-white/50 text-sm">Loading cartelas...</p></div>';

    try {
        // Load all 500 master cartelas
        const masterSnap = await db.collection('cartelas_master').orderBy('number').get();
        if (masterSnap.empty) {
            grid.innerHTML = '<div class="col-span-10 text-center py-12 px-4"><div class="text-4xl mb-3">😓</div><p class="text-white/80 text-sm font-bold mb-1">No Cards Generated</p><p class="text-white/40 text-xs">Admin needs to generate cartelas first.</p></div>';
            return;
        }

        // Get taken cartelas for this round
        const takenSet = new Set(roundData.taken_cartelas || []);
        const playerCount = roundData.player_count || 0;
        const derash = (playerCount + 1) * STAKE * (1 - ADMIN_CUT); // estimate with current player joining
        document.getElementById('cs-derash').textContent = Math.round(derash);

        grid.innerHTML = '';
        masterSnap.forEach(doc => {
            const d = doc.data();
            const num = d.number;
            const cell = document.createElement('div');
            cell.className = 'card-num font-bold';
            cell.textContent = num;
            cell.dataset.num = num;

            if (takenSet.has(num)) {
                cell.classList.add('taken');
                cell.style.opacity = '0.3';
                cell.style.pointerEvents = 'none';
                cell.style.background = 'rgba(255,255,255,0.03)';
                cell.style.color = 'rgba(255,255,255,0.2)';
            } else {
                cell.classList.add('bg-white/10', 'text-white/80', 'border', 'border-white/10');
                cell.onclick = () => toggleCardSelection(num, cell);
            }
            grid.appendChild(cell);
        });

        // Start timer
        const deadline = roundData.selection_deadline;
        if (deadline) {
            const deadlineMs = deadline.toDate ? deadline.toDate().getTime() : new Date(deadline).getTime();
            selectionDeadline = deadlineMs;
        } else {
            selectionDeadline = Date.now() + SELECTION_SECONDS * 1000;
        }
        startSelectionTimer();

        // Listen for real-time updates to taken cartelas
        if (roundUnsubscribe) roundUnsubscribe();
        roundUnsubscribe = db.collection('rounds').doc(roundId).onSnapshot(snap => {
            if (!snap.exists) return;
            const rd = snap.data();
            // Update taken cartelas in real-time
            const nowTaken = new Set(rd.taken_cartelas || []);
            grid.querySelectorAll('.card-num').forEach(cell => {
                const n = parseInt(cell.dataset.num);
                if (nowTaken.has(n) && !selectedCartelas.includes(n)) {
                    cell.classList.remove('bg-white/10', 'text-white/80', 'border', 'border-white/10', 'selected');
                    cell.classList.add('taken');
                    cell.style.opacity = '0.3';
                    cell.style.pointerEvents = 'none';
                    cell.style.background = 'rgba(255,255,255,0.03)';
                    cell.style.color = 'rgba(255,255,255,0.2)';
                    cell.style.boxShadow = '';
                    cell.onclick = null;
                }
            });
            // Update player count & derash
            const pc = rd.player_count || 0;
            document.getElementById('cs-derash').textContent = Math.round((pc + 1) * STAKE * (1 - ADMIN_CUT));

            // If round moved to 'playing', auto-confirm if user hasn't joined
            if (rd.status === 'playing') {
                const uid = String(currentUser.id);
                if (rd.players && rd.players[uid]) {
                    // Already joined, go to game
                    stopSelectionTimer();
                    selectionHandled = true;
                    document.getElementById('card-select-screen').classList.add('hidden');
                    navigateTo('game');
                    loadMyCartelas(rd);
                    listenToRound(roundId);
                } else if (!selectionHandled && selectedCartelas.length > 0) {
                    stopSelectionTimer();
                    selectionHandled = true;
                    confirmSelection();
                } else if (!selectionHandled) {
                    stopSelectionTimer();
                    selectionHandled = true;
                    enterSpectatorMode();
                }
            }
        });
    } catch (err) {
        console.error('Error loading cartelas:', err);
        grid.innerHTML = '<div class="text-center py-8"><p class="text-red-400 text-sm">Error: ' + err.message + '</p></div>';
    }
}

function toggleCardSelection(num, cell) {
    const idx = selectedCartelas.indexOf(num);
    if (idx > -1) {
        selectedCartelas.splice(idx, 1);
        cell.className = 'card-num font-bold bg-white/10 text-white/80 border border-white/10';
        cell.style.boxShadow = '';
    } else {
        if (selectedCartelas.length >= MAX_CARTELAS) {
            showToast('Maximum ' + MAX_CARTELAS + ' cartelas!');
            return;
        }
        const budgetMax = Math.floor((currentUser.play_wallet || 0) / STAKE);
        if (selectedCartelas.length >= budgetMax) {
            showToast('Not enough balance for more cards!');
            return;
        }
        selectedCartelas.push(num);
        cell.className = 'card-num font-bold selected';
        cell.style.boxShadow = '0 0 15px rgba(16,185,129,0.5)';
    }
    updateSelectedInfo();
}

function updateSelectedInfo() {
    const count = selectedCartelas.length;
    const info = document.getElementById('cs-selected-info');
    const btn = document.getElementById('cs-confirm-btn');
    if (count > 0) {
        info.classList.remove('hidden');
        btn.classList.remove('hidden');
        document.getElementById('cs-selected-count').textContent = count + '/' + MAX_CARTELAS;
        document.getElementById('cs-selected-total').textContent = (count * STAKE) + ' ETB';
        btn.textContent = 'Confirm (' + count + ' cartela' + (count > 1 ? 's' : '') + ')';
    } else {
        info.classList.add('hidden');
        btn.classList.add('hidden');
    }
}

function startSelectionTimer() {
    stopSelectionTimer();
    selectionHandled = false;
    const timerEl = document.getElementById('cs-timer');
    timerEl.classList.remove('text-red-400');
    selectionTimer = setInterval(() => {
        const rem = Math.max(0, Math.ceil((selectionDeadline - Date.now()) / 1000));
        timerEl.textContent = rem;
        if (rem <= 5) timerEl.classList.add('text-red-400');
        if (rem <= 0) {
            stopSelectionTimer();
            if (selectionHandled) return;
            selectionHandled = true;
            if (selectedCartelas.length > 0) {
                confirmSelection();
            } else {
                enterSpectatorMode();
            }
        }
    }, 200);
}

function stopSelectionTimer() {
    if (selectionTimer) { clearInterval(selectionTimer); selectionTimer = null; }
}

function cancelCardSelect() {
    stopSelectionTimer();
    selectedCartelas = [];
    if (roundUnsubscribe) { roundUnsubscribe(); roundUnsubscribe = null; }
    document.getElementById('card-select-screen').classList.add('hidden');
}

let isSpectator = false;

function enterSpectatorMode() {
    isSpectator = true;
    stopSelectionTimer();
    selectionHandled = true;
    document.getElementById('card-select-screen').classList.add('hidden');
    navigateTo('game');
    setupGameBoard();
    listenToRound(currentRoundId);
    showToast('Spectating...');
}

function refreshCardSelect() {
    if (currentRoundId) {
        db.collection('rounds').doc(currentRoundId).get().then(doc => {
            if (doc.exists) showCardSelection(currentRoundId, doc.data());
        });
    }
}

// ==================== CONFIRM SELECTION & JOIN ROUND ====================
async function confirmSelection() {
    if (selectedCartelas.length === 0) { showToast('Select at least one card!'); return; }
    stopSelectionTimer();
    showLoading('Joining round...');

    try {
        const totalCost = selectedCartelas.length * STAKE;
        const uidStr = String(currentUser.id);
        const roundRef = db.collection('rounds').doc(currentRoundId);
        const userRef = db.collection('users').doc(uidStr);

        // Atomic transaction: check balance + check round status + deduct + join
        await db.runTransaction(async (txn) => {
            const roundSnap = await txn.get(roundRef);
            const userSnap = await txn.get(userRef);
            if (!roundSnap.exists) throw new Error('Round not found.');
            const rd = roundSnap.data();
            if (rd.status !== 'selecting') throw new Error('Round already started.');
            if (rd.players && rd.players[uidStr]) throw new Error('Already joined.');
            const pw = userSnap.data().play_wallet || 0;
            if (pw < totalCost) throw new Error('Not enough balance.');

            txn.update(userRef, {
                play_wallet: pw - totalCost,
                is_playing: true,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            const players = rd.players || {};
            players[uidStr] = {
                cartelas: selectedCartelas,
                name: currentUser.first_name || 'Player',
                joined_at: new Date().toISOString()
            };
            const takenSet = new Set(rd.taken_cartelas || []);
            selectedCartelas.forEach(n => takenSet.add(n));

            txn.update(roundRef, {
                players: players,
                player_count: Object.keys(players).length,
                taken_cartelas: Array.from(takenSet),
            });
        });

        // Load cartela data for my cards
        for (const num of selectedCartelas) {
            const cartelaDoc = await db.collection('cartelas_master').doc(String(num)).get();
            if (cartelaDoc.exists) {
                myCartelas[num] = cartelaDoc.data().cartela;
            }
        }

        hideLoading();
        document.getElementById('card-select-screen').classList.add('hidden');
        navigateTo('game');
        setupGameBoard();
        listenToRound(currentRoundId);
        showToast('Joined! Waiting for game to start...');
    } catch (err) {
        hideLoading();
        console.error('Error joining round:', err);
        showToast('Error: ' + err.message);
    }
}

// ==================== GAME BOARD ====================
function setupGameBoard() {
    const nums = Object.keys(myCartelas).map(Number);
    currentCardIndex = 0;
    calledNumbers = new Set();

    // Info bar
    document.getElementById('game-id-display').textContent = '#' + (currentRoundId || '---').substring(0, 6);
    document.getElementById('game-stake').textContent = STAKE + ' ETB';
    document.getElementById('game-called-count').textContent = '0';
    document.getElementById('game-timer').textContent = '--';
    document.getElementById('game-players').textContent = '...';
    document.getElementById('game-derash').textContent = '...';
    document.getElementById('game-countdown').classList.add('hidden');

    // Build master grid (75 numbers)
    buildMasterGrid();

    // Build cartela display
    if (nums.length > 0) {
        document.getElementById('cartela-number').textContent = nums[0];
        buildCartelaGrid(myCartelas[nums[0]]);
    }
    // Show/hide prev/next buttons
    document.getElementById('cartela-prev').classList.toggle('hidden', nums.length <= 1);
    document.getElementById('cartela-next').classList.toggle('hidden', nums.length <= 1);

    // Called numbers strip
    document.getElementById('called-numbers-display').innerHTML = '';
}

function buildMasterGrid() {
    const grid = document.getElementById('master-grid');
    grid.innerHTML = '';
    for (let num = 1; num <= 75; num++) {
        const cell = document.createElement('div');
        cell.className = 'master-cell text-[9px] font-bold text-center py-1 rounded-sm';
        cell.style.background = 'rgba(255,255,255,0.04)';
        cell.style.color = 'rgba(255,255,255,0.5)';
        cell.textContent = num;
        cell.id = 'master-' + num;
        grid.appendChild(cell);
    }
}

function buildCartelaGrid(flat) {
    const grid = document.getElementById('cartela-grid');
    grid.innerHTML = '';
    if (!flat || flat.length < 25) return;
    for (let i = 0; i < 25; i++) {
        const num = flat[i];
        const cell = document.createElement('div');
        cell.className = 'cartela-cell text-[10px] font-bold text-center py-1.5 rounded-sm cursor-pointer transition-all';
        cell.id = 'cartela-cell-' + i;
        cell.dataset.num = num;
        if (num === 0) {
            cell.textContent = '★';
            cell.style.background = 'rgba(255,140,0,0.3)';
            cell.style.color = '#FF8C00';
            cell.classList.add('marked');
        } else {
            cell.textContent = num;
            cell.style.background = 'rgba(255,255,255,0.06)';
            cell.style.color = 'rgba(255,255,255,0.7)';
            if (calledNumbers.has(num)) {
                markCartelaCell(cell, num);
            }
            cell.onclick = () => manualMark(cell, num);
        }
        grid.appendChild(cell);
    }
}

function switchCartela(dir) {
    const nums = Object.keys(myCartelas).map(Number);
    if (nums.length <= 1) return;
    currentCardIndex = (currentCardIndex + dir + nums.length) % nums.length;
    document.getElementById('cartela-number').textContent = nums[currentCardIndex];
    buildCartelaGrid(myCartelas[nums[currentCardIndex]]);
}

function markCartelaCell(cell, num) {
    cell.classList.add('marked');
    const letter = getNumberLetter(num);
    const color = getLetterColor(letter);
    cell.style.background = color;
    cell.style.color = '#fff';
    cell.style.transform = 'scale(1.05)';
    setTimeout(() => { cell.style.transform = ''; }, 200);
}

function manualMark(cell, num) {
    if (!calledNumbers.has(num)) {
        showToast('Number ' + num + ' not called yet!');
        return;
    }
    if (cell.classList.contains('marked')) return;
    markCartelaCell(cell, num);
    playMarkSound();
}

function highlightMasterNumber(num) {
    const cell = document.getElementById('master-' + num);
    if (!cell) return;
    const letter = getNumberLetter(num);
    const color = getLetterColor(letter);
    cell.style.background = color;
    cell.style.color = '#fff';
    cell.classList.add('called');
}

function addCalledNumberStrip(num) {
    const strip = document.getElementById('called-numbers-display');
    const letter = getNumberLetter(num);
    const color = getLetterColor(letter);
    const el = document.createElement('div');
    el.className = 'flex-shrink-0 rounded-lg px-2 py-1 text-center';
    el.style.background = color + '22';
    el.style.border = '1px solid ' + color + '44';
    el.innerHTML = '<div class="text-[8px] font-bold" style="color:' + color + '">' + letter + '</div><div class="text-[11px] font-black text-white">' + num + '</div>';
    strip.insertBefore(el, strip.firstChild);
    strip.scrollLeft = 0;
}

function autoMarkAllCartelas(num) {
    if (!autoMarkEnabled) return;
    for (const [cartelaNum, flat] of Object.entries(myCartelas)) {
        for (let i = 0; i < flat.length; i++) {
            if (flat[i] === num) {
                const nums = Object.keys(myCartelas).map(Number);
                if (nums[currentCardIndex] === parseInt(cartelaNum)) {
                    const cell = document.getElementById('cartela-cell-' + i);
                    if (cell && !cell.classList.contains('marked')) {
                        markCartelaCell(cell, num);
                    }
                }
            }
        }
    }
}

function toggleAutoMark() {
    autoMarkEnabled = !autoMarkEnabled;
    const toggle = document.getElementById('auto-toggle');
    toggle.classList.toggle('active', autoMarkEnabled);
    showToast(autoMarkEnabled ? 'Auto-mark ON' : 'Auto-mark OFF');
    // If turning on, mark all previously called numbers
    if (autoMarkEnabled) {
        calledNumbers.forEach(num => autoMarkAllCartelas(num));
    }
}

// ==================== LISTEN TO ROUND (real-time) ====================
function listenToRound(roundId) {
    if (roundUnsubscribe) roundUnsubscribe();
    let prevCalledCount = 0;

    roundUnsubscribe = db.collection('rounds').doc(roundId).onSnapshot(snap => {
        if (!snap.exists) return;
        const data = snap.data();

        // Update info bar
        document.getElementById('game-players').textContent = data.player_count || 0;
        const pool = (data.player_count || 0) * STAKE;
        const derash = Math.round(pool * (1 - ADMIN_CUT));
        document.getElementById('game-derash').textContent = derash;
        document.getElementById('game-called-count').textContent = (data.called_numbers || []).length;

        // Handle status changes
        if (data.status === 'selecting') {
            document.getElementById('game-countdown').classList.remove('hidden');
            document.getElementById('game-countdown').textContent = 'Waiting for players...';
        } else if (data.status === 'playing') {
            document.getElementById('game-countdown').classList.add('hidden');

            // Process new called numbers
            const called = data.called_numbers || [];
            for (let i = prevCalledCount; i < called.length; i++) {
                const num = called[i];
                if (!calledNumbers.has(num)) {
                    calledNumbers.add(num);
                    highlightMasterNumber(num);
                    addCalledNumberStrip(num);
                    autoMarkAllCartelas(num);
                    if (i === called.length - 1) {
                        showNumberAnnouncement(num);
                        playNumberSound();
                    }
                }
            }
            prevCalledCount = called.length;

            // Check for bingo after each number
            if (called.length >= 4 && !isSpectator) {
                checkMyBingo();
            }
        } else if (data.status === 'completed') {
            handleRoundCompleted(data);
        }
    });
}

function showNumberAnnouncement(num) {
    const letter = getNumberLetter(num);
    const color = getLetterColor(letter);
    document.getElementById('announce-letter').textContent = letter;
    document.getElementById('announce-letter').style.color = color;
    document.getElementById('announce-number').textContent = num;
    document.getElementById('number-announce').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('number-announce').classList.add('hidden');
    }, 2000);
}

async function checkMyBingo() {
    const calledArr = Array.from(calledNumbers);
    for (const [cartelaNum, flat] of Object.entries(myCartelas)) {
        if (checkBingoLocal(flat, calledArr)) {
            try {
                const roundRef = db.collection('rounds').doc(currentRoundId);
                const uidStr = String(currentUser.id);

                // Use transaction to prevent double bingo claims
                await db.runTransaction(async (txn) => {
                    const roundSnap = await txn.get(roundRef);
                    if (!roundSnap.exists) return;
                    const rd = roundSnap.data();
                    if (rd.status !== 'playing') return;
                    if (rd.winners && rd.winners.length > 0) return;

                    const playerCount = rd.player_count || 0;
                    const pool = playerCount * STAKE;
                    const adminProfit = pool * ADMIN_CUT;
                    const prizePerWinner = (pool - adminProfit);

                    const userRef = db.collection('users').doc(uidStr);
                    const userDoc = await txn.get(userRef);
                    const ud = userDoc.data();
                    txn.update(userRef, {
                        play_wallet: (ud.play_wallet || 0) + prizePerWinner,
                        wins: (ud.wins || 0) + 1,
                        total_games: (ud.total_games || 0) + 1,
                        is_playing: false,
                        updated_at: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    for (const pid of Object.keys(rd.players || {})) {
                        if (pid !== uidStr) {
                            const ref2 = db.collection('users').doc(pid);
                            const d2 = await txn.get(ref2);
                            if (d2.exists) {
                                txn.update(ref2, {
                                    losses: (d2.data().losses || 0) + 1,
                                    total_games: (d2.data().total_games || 0) + 1,
                                    is_playing: false,
                                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            }
                        }
                    }

                    txn.update(roundRef, {
                        status: 'completed',
                        winners: [uidStr],
                        winner_name: currentUser.first_name || 'Player',
                        prize_per_winner: prizePerWinner,
                        admin_profit: adminProfit,
                        winning_cartela: parseInt(cartelaNum),
                        completed_at: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
            } catch (err) {
                console.error('Error claiming bingo:', err);
            }
            return; // stop checking
        }
    }
}

function checkBingoLocal(flat, called) {
    const calledSet = new Set(called);
    const grid = [];
    for (let r = 0; r < 5; r++) grid.push(flat.slice(r * 5, r * 5 + 5));
    const isM = n => n === 0 || calledSet.has(n);
    // Rows
    for (const row of grid) { if (row.every(isM)) return true; }
    // Columns
    for (let c = 0; c < 5; c++) { if (grid.every(row => isM(row[c]))) return true; }
    // Diagonals
    if ([0,1,2,3,4].every(i => isM(grid[i][i]))) return true;
    if ([0,1,2,3,4].every(i => isM(grid[i][4-i]))) return true;
    return false;
}

function handleRoundCompleted(data) {
    if (roundUnsubscribe) { roundUnsubscribe(); roundUnsubscribe = null; }
    const uidStr = String(currentUser.id);
    const isWinner = (data.winners || []).includes(uidStr);

    if (isWinner) {
        playWinSound();
        showWinModal(data);
    } else if (isSpectator) {
        const winnerName = data.winner_name || 'Unknown';
        const prize = Math.round(data.prize_per_winner || 0);
        showToast(`${winnerName} won ${prize} ETB!`);
        setTimeout(() => { isSpectator = false; navigateTo('home'); }, 5000);
    } else {
        showToast('Game over! Better luck next time.');
        setTimeout(() => navigateTo('home'), 3000);
    }
}

function showWinModal(data) {
    document.getElementById('winner-name').textContent = currentUser.first_name || 'Player';
    document.getElementById('winner-cartela').textContent = data.winning_cartela || '?';
    document.getElementById('winner-prize').textContent = Math.round(data.prize_per_winner || 0) + ' ETB';

    // Build winning cartela grid
    const cartelaNum = data.winning_cartela;
    const flat = myCartelas[cartelaNum];
    const winGrid = document.getElementById('win-cartela-grid');
    winGrid.innerHTML = '';
    if (flat) {
        const calledArr = data.called_numbers || [];
        const calledSet = new Set(calledArr);
        for (let i = 0; i < 25; i++) {
            const num = flat[i];
            const cell = document.createElement('div');
            cell.className = 'rounded text-[9px] font-bold text-center py-1';
            if (num === 0) {
                cell.textContent = '★';
                cell.style.background = 'rgba(255,140,0,0.5)';
                cell.style.color = '#fff';
            } else if (calledSet.has(num)) {
                cell.textContent = num;
                cell.style.background = 'rgba(16,185,129,0.5)';
                cell.style.color = '#fff';
            } else {
                cell.textContent = num;
                cell.style.background = 'rgba(255,255,255,0.1)';
                cell.style.color = 'rgba(255,255,255,0.5)';
            }
            winGrid.appendChild(cell);
        }
    }

    document.getElementById('win-modal').classList.remove('hidden');
    // Auto-close countdown
    let secs = 8;
    document.getElementById('win-countdown').textContent = secs;
    winCountdownInterval = setInterval(() => {
        secs--;
        document.getElementById('win-countdown').textContent = secs;
        if (secs <= 0) {
            clearInterval(winCountdownInterval);
            document.getElementById('win-modal').classList.add('hidden');
            navigateTo('home');
        }
    }, 1000);
}

function loadMyCartelas(roundData) {
    const uidStr = String(currentUser.id);
    const playerInfo = roundData.players ? roundData.players[uidStr] : null;
    if (!playerInfo) return Promise.resolve();
    myCartelas = {};
    const promises = (playerInfo.cartelas || []).map(num =>
        db.collection('cartelas_master').doc(String(num)).get().then(doc => {
            if (doc.exists) myCartelas[num] = doc.data().cartela;
        })
    );
    return Promise.all(promises).then(() => {
        setupGameBoard();
        const called = roundData.called_numbers || [];
        called.forEach(num => {
            calledNumbers.add(num);
            highlightMasterNumber(num);
            addCalledNumberStrip(num);
            autoMarkAllCartelas(num);
        });
    }).catch(err => {
        console.error('Error loading cartelas:', err);
        showToast('Error loading cartela data');
    });
}

function leaveGame() {
    isSpectator = false;
    if (roundUnsubscribe) { roundUnsubscribe(); roundUnsubscribe = null; }
    if (numberCallInterval) { clearInterval(numberCallInterval); numberCallInterval = null; }
    if (winCountdownInterval) { clearInterval(winCountdownInterval); winCountdownInterval = null; }
    if (selectionTimer) { stopSelectionTimer(); }
    myCartelas = {};
    calledNumbers = new Set();
    selectedCartelas = [];
    autoMarkEnabled = false;
    stopBgMusic();
}

function refreshGame() {
    if (currentRoundId) {
        db.collection('rounds').doc(currentRoundId).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                calledNumbers = new Set();
                setupGameBoard();
                (data.called_numbers || []).forEach(num => {
                    calledNumbers.add(num);
                    highlightMasterNumber(num);
                    addCalledNumberStrip(num);
                    autoMarkAllCartelas(num);
                });
                document.getElementById('game-called-count').textContent = (data.called_numbers || []).length;
            }
        });
    }
}

// ==================== HISTORY ====================
async function loadHistory() {
    const list = document.getElementById('history-list');
    document.getElementById('history-loading').classList.remove('hidden');
    document.getElementById('history-empty').classList.add('hidden');
    try {
        const snap = await db.collection('rounds')
            .where('status', '==', 'completed')
            .orderBy('created_at', 'desc')
            .limit(20).get();

        document.getElementById('history-loading').classList.add('hidden');
        if (snap.empty) {
            document.getElementById('history-empty').classList.remove('hidden');
            return;
        }

        // Clear and rebuild
        list.innerHTML = '';
        const uidStr = String(currentUser.id);
        snap.forEach(doc => {
            const d = doc.data();
            const isWinner = (d.winners || []).includes(uidStr);
            const wasPlayer = d.players && d.players[uidStr];
            if (!wasPlayer) return;

            const el = document.createElement('div');
            el.className = 'glass rounded-xl p-4';
            const prize = isWinner ? Math.round(d.prize_per_winner || 0) : 0;
            const date = d.created_at ? (d.created_at.toDate ? d.created_at.toDate().toLocaleDateString() : '') : '';
            el.innerHTML = '<div class="flex items-center justify-between mb-2">' +
                '<span class="text-sm font-bold ' + (isWinner ? 'text-bingo-green' : 'text-red-400') + '">' + (isWinner ? '🏆 Won!' : '❌ Lost') + '</span>' +
                '<span class="text-xs text-white/40">' + date + '</span>' +
                '</div>' +
                '<div class="flex items-center justify-between text-xs text-white/60">' +
                '<span>Players: ' + (d.player_count || 0) + '</span>' +
                '<span>Prize: ' + prize + ' ETB</span>' +
                '</div>';
            list.appendChild(el);
        });
    } catch (err) {
        document.getElementById('history-loading').classList.add('hidden');
        console.error('History error:', err);
    }
}

// ==================== WALLET ====================
function openDepositBot() {
    if (tg) { tg.openTelegramLink('https://t.me/yegarabingobot'); }
    else { window.open('https://t.me/yegarabingobot', '_blank'); }
}

function requestWithdrawal() {
    const bal = currentUser ? currentUser.balance || 0 : 0;
    document.getElementById('withdraw-available').textContent = bal + ' ETB';
    document.getElementById('withdrawModal').classList.remove('hidden');
}

async function submitWithdrawal() {
    const amount = parseInt(document.getElementById('withdrawAmount').value);
    const phone = document.getElementById('withdrawTelebirr').value.trim();
    const name = document.getElementById('withdrawTelebirrName').value.trim();
    if (!amount || amount < 10) { showToast('Min withdrawal: 10 ETB'); return; }
    if (!phone) { showToast('Enter phone number'); return; }
    const bal = currentUser.balance || 0;
    if (amount > bal) { showToast('Insufficient balance!'); return; }
    try {
        await db.collection('users').doc(String(currentUser.id)).update({
            balance: bal - amount,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        await db.collection('withdrawals').add({
            userId: String(currentUser.id),
            firstName: currentUser.first_name,
            username: currentUser.username,
            amount: amount,
            phone: phone,
            telebirrName: name,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        hideScreen('withdrawModal');
        showToast('Withdrawal request submitted!');
    } catch (err) { showToast('Error: ' + err.message); }
}

function showTransferModal() { document.getElementById('transfer-modal').classList.remove('hidden'); }
function hideTransferModal() { document.getElementById('transfer-modal').classList.add('hidden'); }

async function transferFunds(direction) {
    const amount = parseInt(document.getElementById('transfer-amount').value);
    if (!amount || amount < 1) { showToast('Enter a valid amount'); return; }
    const userRef = db.collection('users').doc(String(currentUser.id));
    try {
        const snap = await userRef.get();
        const u = snap.data();
        if (direction === 'toPlay') {
            if ((u.balance || 0) < amount) { showToast('Insufficient balance!'); return; }
            await userRef.update({
                balance: (u.balance || 0) - amount,
                play_wallet: (u.play_wallet || 0) + amount,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            if ((u.play_wallet || 0) < amount) { showToast('Insufficient play wallet!'); return; }
            await userRef.update({
                play_wallet: (u.play_wallet || 0) - amount,
                balance: (u.balance || 0) + amount,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        hideTransferModal();
        showToast('Transfer successful!');
        document.getElementById('transfer-amount').value = '';
    } catch (err) { showToast('Error: ' + err.message); }
}

// ==================== RULES ====================
function showRules() { document.getElementById('rules-modal').classList.remove('hidden'); }
function hideRules() { document.getElementById('rules-modal').classList.add('hidden'); }
function hideScreen(id) { document.getElementById(id).classList.add('hidden'); }

function logout() {
    if (tg) tg.close();
    else window.location.reload();
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
    restoreAudioSettings();
    initUser();
});