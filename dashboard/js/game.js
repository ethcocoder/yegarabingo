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

// Sign in anonymously so Firestore security rules allow reads
auth.onAuthStateChanged(function(user) {
    if (!user) {
        auth.signInAnonymously().catch(function(e) {
            console.warn('Anonymous auth failed:', e);
        });
    }
});

// ==================== STATE ====================
let currentUser = null;
let currentStake = 0;
let currentGameId = null;
let currentGameData = null;
let gameUnsubscribe = null;
let timerInterval = null;
let timerSeconds = 35;
let userUnsubscribe = null;
let statsUnsubscribe = null;
let winCountdownInterval = null;
let currentScreen = 'home';
let numberCallIndex = 0;
let numberCallInterval = null;
let allNumbers = [];
let currentCallingNumber = null;
let announceCountdownInterval = null;
let cardSelectTimerInterval = null;
let cardSelectDeadline = 0;
let autoMarkEnabled = false;
let selectedCards = [];
let musicEnabled = false;
let voiceEnabled = true;
let masterVolume = 0.8;
let bgMusicAudio = null;

// ==================== AUDIO CONTROLS ====================
function toggleMusic() {
    musicEnabled = !musicEnabled;
    var btn = document.getElementById('btn-music-toggle');
    var icon = document.getElementById('music-icon');
    if (musicEnabled) {
        btn.classList.add('on');
        icon.textContent = '🎵';
        startBgMusic();
    } else {
        btn.classList.remove('on');
        icon.textContent = '🔇';
        stopBgMusic();
    }
    localStorage.setItem('yegara_music', musicEnabled ? '1' : '0');
}
function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    var btn = document.getElementById('btn-voice-toggle');
    var icon = document.getElementById('voice-icon');
    if (voiceEnabled) {
        btn.classList.add('on');
        icon.textContent = '🔊';
    } else {
        btn.classList.remove('on');
        icon.textContent = '🔇';
    }
    localStorage.setItem('yegara_voice', voiceEnabled ? '1' : '0');
}
function setVolume(val) {
    masterVolume = val / 100;
    var slider = document.getElementById('volume-slider');
    slider.style.setProperty('--vol-pct', val + '%');
    localStorage.setItem('yegara_volume', val);
    if (bgMusicAudio) bgMusicAudio.volume = masterVolume * 0.3;
}
function startBgMusic() {
    if (bgMusicAudio) return;
    try {
        bgMusicAudio = new Audio('public/audio/bg_music.wav');
        bgMusicAudio.loop = true;
        bgMusicAudio.volume = masterVolume * 0.3;
        bgMusicAudio.play().catch(function() {
            bgMusicAudio = null;
            musicEnabled = false;
            document.getElementById('btn-music-toggle').classList.remove('on');
            document.getElementById('music-icon').textContent = '🔇';
        });
    } catch(e) {
        bgMusicAudio = null;
        musicEnabled = false;
        document.getElementById('btn-music-toggle').classList.remove('on');
        document.getElementById('music-icon').textContent = '🔇';
    }
}
function stopBgMusic() {
    if (bgMusicAudio) {
        bgMusicAudio.pause();
        bgMusicAudio.currentTime = 0;
        bgMusicAudio = null;
    }
}
function restoreAudioSettings() {
    if (localStorage.getItem('yegara_music') === '1') {
        musicEnabled = true;
        document.getElementById('btn-music-toggle').classList.add('on');
        document.getElementById('music-icon').textContent = '🎵';
    }
    if (localStorage.getItem('yegara_voice') === '0') {
        voiceEnabled = false;
        document.getElementById('btn-voice-toggle').classList.remove('on');
        document.getElementById('voice-icon').textContent = '🔇';
    }
    var vol = localStorage.getItem('yegara_volume');
    if (vol) {
        masterVolume = parseInt(vol) / 100;
        document.getElementById('volume-slider').value = vol;
        document.getElementById('volume-slider').style.setProperty('--vol-pct', vol + '%');
    }
}

// ==================== AUDIO CONTEXT FOR SOUND ====================
let audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}
function playNumberSound() {
    if (!voiceEnabled) return;
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch(e) {}
}
function playMarkSound() {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    } catch(e) {}
}
function playWinSound() {
    if (!voiceEnabled) return;
    try {
        const ctx = getAudioCtx();
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach(function(freq, i) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
            gain.gain.setValueAtTime(masterVolume * 0.3, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.3);
        });
    } catch(e) {}
}

// ==================== HUGGINGFACE TTS (Amharic) ====================
const AMHARIC_NUMBERS = {
    0: 'ዜሮ', 1: 'አንድ', 2: 'ሁለት', 3: 'ሦስት', 4: 'አራት', 5: 'አምስት',
    6: 'ስድስት', 7: 'ሰባት', 8: 'ስምንት', 9: 'ዘጠኝ', 10: 'አሥር',
    11: 'አስራ አንድ', 12: 'አስራ ሁለት', 13: 'አስራ ሦስት', 14: 'አስራ አራት', 15: 'አስራ አምስት',
    16: 'አስራ ስድስት', 17: 'አስራ ሰባት', 18: 'አስራ ስምንት', 19: 'አስራ ዘጠኝ', 20: 'ሀያ',
    21: 'ሀያ አንድ', 22: 'ሀያ ሁለት', 23: 'ሀያ ሦስት', 24: 'ሀያ አራት', 25: 'ሀያ አምስት',
    26: 'ሀያ ስድስት', 27: 'ሀያ ሰባት', 28: 'ሀያ ስምንት', 29: 'ሀያ ዘጠኝ', 30: 'ሠላሳ',
    31: 'ሠላሳ አንድ', 32: 'ሠላሳ ሁለት', 33: 'ሠላሳ ሦስት', 34: 'ሠላሳ አራት', 35: 'ሠላሳ አምስት',
    36: 'ሠላሳ ስድስት', 37: 'ሠላሳ ሰባት', 38: 'ሠላሳ ስምንት', 39: 'ሠላሳ ዘጠኝ', 40: 'አርባ',
    41: 'አርባ አንድ', 42: 'አርባ ሁለት', 43: 'አርባ ሦስት', 44: 'አርባ አራት', 45: 'አርባ አምስት',
    46: 'አርባ ስድስት', 47: 'አርባ ሰባት', 48: 'አርባ ስምንት', 49: 'አርባ ዘጠኝ', 50: 'ሃምሳ',
    51: 'ሃምሳ አንድ', 52: 'ሃምሳ ሁለት', 53: 'ሃምሳ ሦስት', 54: 'ሃምሳ አራት', 55: 'ሃምሳ አምስት',
    56: 'ሃምሳ ስድስት', 57: 'ሃምሳ ሰባት', 58: 'ሃምሳ ስምንት', 59: 'ሃምሳ ዘጠኝ', 60: 'ስልሳ',
    61: 'ስልሳ አንድ', 62: 'ስልሳ ሁለት', 63: 'ስልሳ ሶስት', 64: 'ስልሳ አራት', 65: 'ስልሳ አምስት',
    66: 'ስልሳ ስድስት', 67: 'ስልሳ ሰባት', 68: 'ስልሳ ስምንት', 69: 'ስልሳ ዘጠኝ', 70: 'ሰባ',
    71: 'ሰባ አንድ', 72: 'ሰባ ሁለት', 73: 'ሰባ ሦስት', 74: 'ሰባ አራት', 75: 'ሰባ አምስት'
};
const BINGO_LETTERS_AMHARIC = {
    'B': 'ቢ', 'I': 'አይ', 'N': 'ኤን', 'G': 'ጂ', 'O': 'ኦ'
};
let ttsSupported = false;

async function initTTS() {
    try {
        const testResp = await fetch('public/audio/B1.mp3', { method: 'HEAD' });
        if (testResp.ok) {
            ttsSupported = true;
            console.log('Local TTS audio available');
        }
    } catch(e) {
        console.log('Local TTS not available, using fallback tones');
    }
}

function getAudioUrl(letter, num) {
    return 'public/audio/' + letter + num + '.mp3';
}

async function speakAmharic(letter, num) {
    if (!voiceEnabled) return false;
    try {
        const url = getAudioUrl(letter, num);
        const audio = new Audio(url);
        audio.volume = masterVolume;
        audio.preload = 'auto';
        await new Promise((resolve) => {
            let resolved = false;
            audio.onended = () => { resolved = true; resolve(true); };
            audio.onerror = () => { resolved = true; resolve(false); };
            audio.play().catch(() => { if (!resolved) resolve(false); });
            setTimeout(() => { if (!resolved) { resolved = true; resolve(true); } }, 5000);
        });
        return true;
    } catch(e) {
        return false;
    }
}

async function speakNumberWithLetter(letter, num) {
    if (ttsSupported) {
        try {
            const spoken = await speakAmharic(letter, num);
            if (spoken) return;
        } catch(e) {}
    }
    playNumberSound();
}

// ==================== TELEGRAM INIT ====================
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#0D1117');
    tg.setBackgroundColor('#0D1117');
}

// ==================== BINGO CONSTANTS ====================
const BINGO_LETTERS = { B: 1, I: 16, N: 31, G: 46, O: 61 };
const BINGO_RANGES = [
    { min: 1, max: 15, letter: 'B', color: '#10B981' },
    { min: 16, max: 30, letter: 'I', color: '#3B82F6' },
    { min: 31, max: 45, letter: 'N', color: '#8B5CF6' },
    { min: 46, max: 60, letter: 'G', color: '#FF8C00' },
    { min: 61, max: 75, letter: 'O', color: '#14B8A6' }
];

function getNumberLetter(num) {
    for (const r of BINGO_RANGES) {
        if (num >= r.min && num <= r.max) return r.letter;
    }
    return '?';
}

function getLetterColor(letter) {
    for (const r of BINGO_RANGES) {
        if (r.letter === letter) return r.color;
    }
    return '#FF8C00';
}

// ==================== AUTH / USER ====================
function isInsideTelegram() {
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) return true;
    if (tg && tg.initData && tg.initData.length > 10) return true;
    if (window.location.hash && window.location.hash.indexOf('tgWebAppData=') !== -1) return true;
    if (window.location.search && window.location.search.indexOf('tgWebAppData=') !== -1) return true;
    return false;
}

function getTelegramUser() {
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
        return tg.initDataUnsafe.user;
    }
    if (tg && tg.initData && tg.initData.length > 10) {
        try {
            const params = new URLSearchParams(tg.initData);
            const userStr = params.get('user');
            if (userStr) return JSON.parse(userStr);
        } catch(e) {}
    }
    var source = window.location.search || '';
    if (!source && window.location.hash) source = window.location.hash;
    if (source.indexOf('tgWebAppData=') !== -1) {
        try {
            var allParams = new URLSearchParams(source.substring(source.indexOf('?') !== -1 ? source.indexOf('?') : 0));
            var rawData = allParams.get('tgWebAppData');
            if (rawData) {
                var decoded = decodeURIComponent(rawData);
                var parsed = JSON.parse(decoded);
                if (parsed.user) return parsed.user;
                if (parsed.initDataUnsafe && parsed.initDataUnsafe.user) return parsed.initDataUnsafe.user;
            }
        } catch(e) {}
    }
    return null;
}

async function initUser() {
    if (!tg) {
        document.getElementById('user-greeting').textContent = '';
        document.querySelector('#screen-home .glass.rounded-2xl.p-5').innerHTML = 
            '<div class="text-3xl mb-2">&#128244;</div>' +
            '<h2 class="text-lg font-bold text-white mb-2">Open from Telegram</h2>' +
            '<p class="text-sm text-white/60 mb-4">Please open this game from the Telegram bot.</p>' +
            '<a href="https://t.me/yegarabingobot" target="_blank" class="inline-block gradient-orange text-white px-6 py-3 rounded-xl font-semibold text-sm">Open Bot</a>';
        document.getElementById('stat-players').textContent = '0';
        document.getElementById('stat-games').textContent = '0';
        document.getElementById('stat-winners').textContent = '0';
        return;
    }

    let tgUser = getTelegramUser();
    if (!tgUser || !tgUser.id) {
        try { tg.ready(); } catch(e) {}
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 250));
            tgUser = getTelegramUser();
            if (tgUser && tgUser.id) break;
        }
    }
    if (!tgUser || !tgUser.id) {
        document.getElementById('user-greeting').textContent = 'Loading user...';
        await new Promise(r => setTimeout(r, 2000));
        tgUser = getTelegramUser();
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
            const newUserData = {
                user_id: uid,
                first_name: tgUser.first_name || 'Player',
                username: tgUser.username || 'player' + uid,
                phone: '',
                telebirr_name: '',
                balance: 100,
                play_wallet: 50,
                total_games: 0,
                wins: 0,
                losses: 0,
                is_playing: false,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };
            await db.collection('users').doc(String(uid)).set(newUserData);
            currentUser = { id: uid, ...newUserData };
        }
        updateAllDisplays();
        listenToUserData();
        startStatsListener();
        if (!currentUser.phone) {
            showRegistration();
        }
        if (currentUser.is_playing) {
            resumeActiveGame();
        }
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
    if (!phone || !phone.startsWith('+251')) { showToast('Enter valid phone number (+251...)'); return; }
    try {
        await db.collection('users').doc(String(currentUser.id)).update({
            first_name: name, phone: phone, updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        currentUser.first_name = name;
        currentUser.phone = phone;
        updateAllDisplays();
        document.getElementById('registerModal').classList.add('hidden');
        showToast('Profile complete! Enjoy playing!');
    } catch (err) {
        console.error('Registration error:', err);
        showToast('Error saving profile. Try again.');
    }
}

function listenToUserData() {
    if (userUnsubscribe) userUnsubscribe();
    userUnsubscribe = db.collection('users').doc(String(currentUser.id)).onSnapshot(doc => {
        if (doc.exists) {
            currentUser = { id: currentUser.id, ...doc.data() };
            updateAllDisplays();
        }
    });
}

function startStatsListener() {
    if (statsUnsubscribe) statsUnsubscribe();
    statsUnsubscribe = db.collection('users').where('is_playing', '==', true).onSnapshot(snap => {
        document.getElementById('stat-players').textContent = snap.size;
    });
    db.collection('games').get().then(snap => {
        document.getElementById('stat-games').textContent = snap.size;
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    db.collection('games').where('status', '==', 'completed').where('prize', '>', 0).where('updated_at', '>=', today).get().then(snap => {
        document.getElementById('stat-winners').textContent = snap.size;
    }).catch(() => {
        db.collection('games').where('status', '==', 'completed').where('prize', '>', 0).get().then(snap => {
            const todayGames = snap.docs.filter(doc => {
                const data = doc.data();
                if (data.updated_at) {
                    const d = data.updated_at.toDate ? data.updated_at.toDate() : new Date(data.updated_at);
                    return d >= today;
                }
                return false;
            });
            document.getElementById('stat-winners').textContent = todayGames.length;
        });
    });
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
    const initial = (currentUser.first_name || 'P')[0].toUpperCase();
    document.getElementById('profile-avatar').textContent = initial;
    document.getElementById('profile-games').textContent = currentUser.total_games || 0;
    document.getElementById('profile-wins').textContent = currentUser.wins || 0;
    const totalGames = currentUser.total_games || 0;
    const wins = currentUser.wins || 0;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    document.getElementById('profile-winrate').textContent = winRate + '%';
    const earnings = (currentUser.wins || 0) * 152;
    document.getElementById('profile-earnings').textContent = earnings + ' ETB';
}

// ==================== NAVIGATION ====================
function navigateTo(screen) {
    if (currentScreen === 'game' && screen !== 'game') {
        leaveGame();
    }
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('screen-' + screen);
    if (target) {
        target.classList.add('active');
        target.classList.add('screen-transition');
    }
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navBtn = document.querySelector('.nav-item[data-screen="' + screen + '"]');
    if (navBtn) navBtn.classList.add('active');
    currentScreen = screen;
    document.getElementById('bottom-nav').style.display = (screen === 'game') ? 'none' : '';
    if (screen === 'history') loadHistory();
}

// ==================== RESUME ACTIVE GAME ====================
async function resumeActiveGame() {
    try {
        const snap = await db.collection('games')
            .where('user_id', '==', currentUser.id)
            .where('status', '==', 'active')
            .limit(1).get();
        if (snap.empty) {
            await db.collection('users').doc(String(currentUser.id)).update({
                is_playing: false, updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            currentUser.is_playing = false;
            return;
        }
        const gameDoc = snap.docs[0];
        const gameData = gameDoc.data();
        currentGameId = gameDoc.id;
        currentStake = gameData.stake;
        const cartelas = reconstructCartelas(gameData);
        cartelaCount = cartelas.length;
        currentCardIndex = 0;
        const firstCartela = unflattenCartela(cartelas[0] || []);
        const cartelaNumbers = gameData.cartela_numbers || [];
        navigateTo('game');
        setupGameBoard(gameData.stake, firstCartela, cartelaNumbers[0] || gameData.cartela_number, cartelaCount);
        listenToGame(currentGameId);
        showToast('Resuming your game...');
    } catch (err) {
        console.error('Error resuming game:', err);
        try {
            await db.collection('users').doc(String(currentUser.id)).update({
                is_playing: false, updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            currentUser.is_playing = false;
            showToast('Game recovery complete. You can start a new game.');
        } catch (e2) {
            showToast('Connection error. Please refresh.');
        }
    }
}

// ==================== STAKE SELECTION ====================
async function selectStake(stake) {
    if (!currentUser) { showToast('Loading user data...'); return; }
    if (currentUser.is_playing) {
        try {
            const snap = await db.collection('games')
                .where('user_id', '==', currentUser.id)
                .where('status', '==', 'active')
                .limit(1).get();
            if (!snap.empty) {
                resumeActiveGame();
                return;
            }
        } catch (e) {
            console.warn('Resume query failed, resetting is_playing:', e);
        }
        try {
            await db.collection('users').doc(String(currentUser.id)).update({
                is_playing: false, updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) { console.warn('Failed to reset is_playing:', e); }
        currentUser.is_playing = false;
    }
    if ((currentUser.play_wallet || 0) < stake) {
        showToast('Transfer funds to Play Wallet to join!');
        return;
    }
    currentStake = stake;
    showCardSelection(stake);
}

// ==================== CARD SELECTION (dynamic pool, 24s deadline timer) ====================
async function showCardSelection(stake) {
    selectedCards = [];
    updateSelectedInfo();
    document.getElementById('cs-stake').textContent = stake + ' ETB';
    document.getElementById('cs-main-wallet').textContent = (currentUser.balance || 0) + ' ETB';
    document.getElementById('cs-play-wallet').textContent = (currentUser.play_wallet || 0) + ' ETB';
    document.getElementById('card-select-screen').classList.remove('hidden');

    const grid = document.getElementById('card-select-grid');
    grid.innerHTML = '<div class="text-center py-8 col-span-8"><div class="text-3xl mb-2 float-anim">&#127183;</div><p class="text-white/50 text-sm">Loading cards...</p></div>';

    try {
        // Load ALL docs then filter client-side (more reliable than where query)
        const allSnap = await db.collection('cartela_pool').get();
        console.log('Cartela pool total docs:', allSnap.size);
        const poolDocs = [];

        allSnap.forEach(doc => {
            const d = doc.data();
            if (d.number && d.status === 'available') {
                poolDocs.push({ num: d.number, docId: doc.id });
            }
        });

        poolDocs.sort((a, b) => a.num - b.num);
        const availableCount = poolDocs.length;
        console.log('Available cartelas:', availableCount);

        if (availableCount === 0) {
            grid.innerHTML = '<div class="col-span-8 text-center py-12 px-4"><div class="text-4xl mb-3">&#128531;</div><p class="text-white/80 text-sm font-bold mb-1">No Cards Available</p><p class="text-white/40 text-xs">Ask admin to generate cartelas in the dashboard.</p></div>';
            document.getElementById('cs-derash').textContent = '0';
            return;
        }

        grid.innerHTML = '';
        for (const item of poolDocs) {
            const cell = document.createElement('div');
            cell.className = 'card-num font-bold bg-white/10 text-white/80 border border-white/10';
            cell.onclick = () => selectCard(item.num, cell);
            cell.textContent = item.num;
            cell.dataset.num = item.num;
            cell.dataset.docid = item.docId;
            grid.appendChild(cell);
        }

        document.getElementById('cs-derash').textContent = availableCount;
        startCardSelectTimer();
    } catch (err) {
        console.error('Error loading cards:', err);
        grid.innerHTML = '<div class="text-center py-8"><p class="text-red-400 text-sm">Error loading cards: ' + (err.message || err) + '</p><button onclick="cancelCardSelect()" class="mt-3 bg-white/10 text-white px-4 py-2 rounded-xl text-xs font-bold">Go Back</button></div>';
    }
}

function startCardSelectTimer() {
    if (cardSelectTimerInterval) clearInterval(cardSelectTimerInterval);
    const stored = sessionStorage.getItem('cardSelectDeadline');
    if (stored && parseInt(stored) > Date.now()) {
        cardSelectDeadline = parseInt(stored);
    } else {
        cardSelectDeadline = Date.now() + 24000;
    }
    sessionStorage.setItem('cardSelectDeadline', cardSelectDeadline);
    const timerEl = document.getElementById('cs-timer');
    const remaining = Math.max(0, Math.ceil((cardSelectDeadline - Date.now()) / 1000));
    timerEl.textContent = remaining;
    timerEl.classList.add('timer-pulse');
    cardSelectTimerInterval = setInterval(() => {
        const rem = Math.max(0, Math.ceil((cardSelectDeadline - Date.now()) / 1000));
        timerEl.textContent = rem;
        if (rem <= 0) {
            clearInterval(cardSelectTimerInterval);
            cardSelectTimerInterval = null;
            sessionStorage.removeItem('cardSelectDeadline');
            if (selectedCards.length === 0) {
                autoSelectRandomCard();
            } else {
                confirmMultiCardSelection();
            }
        }
    }, 200);
}

async function autoSelectRandomCard() {
    const grid = document.getElementById('card-select-grid');
    const availableCells = grid.querySelectorAll('.card-num:not(.taken):not(.selected)');
    if (availableCells.length === 0) {
        showToast('No available cards! Try again later.');
        cancelCardSelect();
        return;
    }
    const randomIdx = Math.floor(Math.random() * availableCells.length);
    const cell = availableCells[randomIdx];
    const cardNum = parseInt(cell.dataset.num);
    cell.className = 'card-num font-bold selected';
    cell.style.boxShadow = '0 0 15px rgba(16,185,129,0.5)';
    selectedCards.push(cardNum);
    updateSelectedInfo();
    showToast('Auto-selected card #' + cardNum);
    await new Promise(r => setTimeout(r, 500));
    confirmMultiCardSelection();
}

function stopCardSelectTimer() {
    if (cardSelectTimerInterval) { clearInterval(cardSelectTimerInterval); cardSelectTimerInterval = null; }
}

function selectCard(cardNum, cellEl) {
    const maxCards = Math.floor((currentUser.play_wallet || 0) / currentStake);
    const idx = selectedCards.indexOf(cardNum);
    if (idx > -1) {
        selectedCards.splice(idx, 1);
        cellEl.className = 'card-num font-bold bg-white/10 text-white/80 border border-white/10';
        cellEl.style.boxShadow = '';
    } else {
        if (selectedCards.length >= maxCards) {
            showToast('Max ' + maxCards + ' cards with your balance!');
            return;
        }
        selectedCards.push(cardNum);
        cellEl.className = 'card-num font-bold selected';
        cellEl.style.boxShadow = '0 0 15px rgba(16,185,129,0.5)';
    }
    updateSelectedInfo();
}

function updateSelectedInfo() {
    const count = selectedCards.length;
    const info = document.getElementById('cs-selected-info');
    const confirmBtn = document.getElementById('cs-confirm-btn');
    if (count > 0) {
        info.classList.remove('hidden');
        confirmBtn.classList.remove('hidden');
        document.getElementById('cs-selected-count').textContent = count;
        document.getElementById('cs-selected-total').textContent = (count * currentStake) + ' ETB';
        confirmBtn.textContent = 'Confirm (' + count + ' card' + (count > 1 ? 's' : '') + ')';
    } else {
        info.classList.add('hidden');
        confirmBtn.classList.add('hidden');
    }
}

const ADMIN_IDS = [8462274722];
let currentCardIndex = 0;
let cartelaCount = 0;

async function confirmMultiCardSelection() {
    if (selectedCards.length === 0) { showToast('Select at least one card!'); return; }
    const totalCost = selectedCards.length * currentStake;
    if (totalCost > (currentUser.play_wallet || 0)) { showToast('Not enough play wallet!'); return; }
    stopCardSelectTimer();
    sessionStorage.removeItem('cardSelectDeadline');
    document.getElementById('card-select-screen').classList.add('hidden');
    showLoading('Starting ' + selectedCards.length + ' game(s)...');
    try {
        const cardsToProcess = [...selectedCards];
        selectedCards = [];
        const flatCartelas = [];
        const cartelaNumbers = [];
        const poolDocIds = [];
        let gamesCount = 0;
        console.log('[GAME] Starting game with', cardsToProcess.length, 'cards, stake:', currentStake);

        for (let ci = 0; ci < cardsToProcess.length; ci++) {
            const cardNum = cardsToProcess[ci];
            console.log('[GAME] Processing card', cardNum, '(' + (ci+1) + '/' + cardsToProcess.length + ')');
            const grid = document.getElementById('card-select-grid');
            const selectedCell = grid.querySelector('.card-num[data-num="' + cardNum + '"]');
            const poolDocId = selectedCell ? selectedCell.dataset.docid : '';
            let poolData = null;
            let poolDocIdFinal = poolDocId;

            if (poolDocId) {
                console.log('[GAME] Fetching pool doc:', poolDocId);
                const poolDoc = await db.collection('cartela_pool').doc(poolDocId).get();
                if (poolDoc.exists && poolDoc.data().status === 'available') {
                    poolData = poolDoc.data();
                    console.log('[GAME] Pool doc found, status:', poolData.status);
                } else {
                    console.log('[GAME] Pool doc missing or not available:', poolDoc.exists, poolDoc.data() ? poolDoc.data().status : 'N/A');
                }
            }
            if (!poolData) {
                console.log('[GAME] Fallback: querying pool by number', cardNum);
                const poolSnap = await db.collection('cartela_pool').where('number', '==', cardNum).limit(5).get();
                console.log('[GAME] Query returned', poolSnap.size, 'docs');
                for (const doc of poolSnap.docs) {
                    if (doc.data().status === 'available') {
                        poolData = doc.data();
                        poolDocIdFinal = doc.id;
                        break;
                    }
                }
            }
            if (!poolData) {
                console.warn('[GAME] No pool data for card', cardNum, '- skipping');
                continue;
            }

            flatCartelas.push(poolData.cartela || []);
            cartelaNumbers.push(cardNum);
            poolDocIds.push(poolDocIdFinal);
            gamesCount++;
        }

        console.log('[GAME] Resolved', gamesCount, 'valid cartelas');
        if (gamesCount === 0) {
            hideLoading();
            showToast('No cards available. Try again.');
            return;
        }

        const isAdmin = ADMIN_IDS.includes(currentUser.id);
        const gameData = {
            user_id: currentUser.id,
            stake: currentStake,
            status: 'active',
            called_numbers: [],
            marked_numbers: [],
            cartelas: flatCartelas.flat(),
            cartela_count: flatCartelas.length,
            cartela_numbers: cartelaNumbers,
            cartela_cols: 5,
            cartela_rows: 5,
            allow_win: isAdmin,
            win_user_id: isAdmin ? String(currentUser.id) : null,
            admin_notified: false,
            winner: null,
            prize: 0,
            game_started_at: firebase.firestore.FieldValue.serverTimestamp(),
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        };
        console.log('[GAME] Creating game doc...');
        const gameRef = await db.collection('games').add(gameData);
        console.log('[GAME] Game created:', gameRef.id);

        for (let i = 0; i < poolDocIds.length; i++) {
            console.log('[GAME] Updating pool doc:', poolDocIds[i]);
            await db.collection('cartela_pool').doc(poolDocIds[i]).update({
                status: 'assigned',
                assigned_to: currentUser.id,
                game_id: gameRef.id,
                assigned_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('[GAME] Creating cartela doc for card:', cartelaNumbers[i]);
            await db.collection('cartelas').add({
                game_id: gameRef.id,
                user_id: currentUser.id,
                cartela: flatCartelas[i],
                cartela_cols: 5,
                cartela_rows: 5,
                marked: [],
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        const actualCost = gamesCount * currentStake;
        console.log('[GAME] Deducting', actualCost, 'ETB from play wallet');
        await db.collection('users').doc(String(currentUser.id)).update({
            play_wallet: firebase.firestore.FieldValue.increment(-actualCost),
            is_playing: true,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        currentUser.play_wallet = (currentUser.play_wallet || 0) - actualCost;

        hideLoading();
        currentGameId = gameRef.id;
        cartelaCount = gamesCount;
        currentCardIndex = 0;
        navigateTo('game');
        setupGameBoard(currentStake, unflattenCartela(flatCartelas[0]), cartelaNumbers[0], gamesCount);
        listenToGame(currentGameId);
        if (isAdmin) {
            showToast('Admin mode: Win enabled automatically!');
        }
    } catch (err) {
        console.error('Error starting game:', err);
        hideLoading();
        var errMsg = err.message || err.code || String(err);
        if (errMsg.includes('permission') || errMsg.includes('Permission')) {
            showToast('Permission denied. Check Firestore rules.');
        } else if (errMsg.includes('nested') || errMsg.includes('array')) {
            showToast('Data format error. Check cartela structure.');
        } else {
            showToast('Error: ' + errMsg.substring(0, 100));
        }
        try {
            await db.collection('users').doc(String(currentUser.id)).update({
                is_playing: false,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            currentUser.is_playing = false;
        } catch (e) {}
    }
}

function cancelCardSelect() {
    stopCardSelectTimer();
    sessionStorage.removeItem('cardSelectDeadline');
    document.getElementById('card-select-screen').classList.add('hidden');
    selectedCards = [];
    updateSelectedInfo();
}

function refreshCardSelect() {
    if (currentStake > 0) {
        selectedCards = [];
        updateSelectedInfo();
        showCardSelection(currentStake);
    }
}

// ==================== CARTELA GENERATION (Standard Bingo 1-75) ====================
function generateCartela() {
    const ranges = [
        { min: 1, max: 15 },   // B
        { min: 16, max: 30 },  // I
        { min: 31, max: 45 },  // N
        { min: 46, max: 60 },  // G
        { min: 61, max: 75 }   // O
    ];
    const cartela = [];
    for (let col = 0; col < 5; col++) {
        const colNumbers = [];
        const available = [];
        for (let n = ranges[col].min; n <= ranges[col].max; n++) available.push(n);
        for (let row = 0; row < 5; row++) {
            if (col === 2 && row === 2) {
                colNumbers.push(0);
            } else {
                const idx = Math.floor(Math.random() * available.length);
                colNumbers.push(available.splice(idx, 1)[0]);
            }
        }
        cartela.push(colNumbers);
    }
    return cartela;
}

function reconstructCartelas(gameData) {
    var raw = gameData.cartelas;
    if (!raw || !Array.isArray(raw)) {
        if (gameData.cartela) return [gameData.cartela];
        return [];
    }
    if (raw.length > 0 && Array.isArray(raw[0])) return raw;
    var count = gameData.cartela_count || 1;
    var perCard = 25;
    if (raw.length === perCard && count <= 1) return [raw];
    var result = [];
    for (var i = 0; i < count && (i * perCard) < raw.length; i++) {
        result.push(raw.slice(i * perCard, (i + 1) * perCard));
    }
    return result;
}

function unflattenCartela(flat) {
    if (!flat || !Array.isArray(flat)) return null;
    if (flat.length === 25 && Array.isArray(flat[0])) return flat;
    var cols = 5, rows = 5;
    var result = [];
    for (var c = 0; c < cols; c++) {
        var col = [];
        for (var r = 0; r < rows; r++) {
            col.push(flat[c * rows + r]);
        }
        result.push(col);
    }
    return result;
}

// ==================== SMART NUMBER CALLING (1-75, multi-cartela) ====================
async function startNumberCalling(gameId) {
    stopNumberCalling();
    allNumbers = [];
    for (let n = 1; n <= 75; n++) allNumbers.push(n);
    for (let i = allNumbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allNumbers[i], allNumbers[j]] = [allNumbers[j], allNumbers[i]];
    }
    numberCallIndex = 0;

    function isDangerousForAnyCartela(num, gameData, marked) {
        const cartelas = reconstructCartelas(gameData);
        for (const flat of cartelas) {
            const cartela = unflattenCartela(flat);
            if (cartela && wouldCompleteLine(num, cartela, marked)) return true;
        }
        return false;
    }

    async function callNextNumber() {
        try {
            const gameDoc = await db.collection('games').doc(gameId).get();
            if (!gameDoc.exists) return;
            const gameData = gameDoc.data();
            if (gameData.status !== 'active') return;

            const called = gameData.called_numbers || [];
            const marked = gameData.marked_numbers || [];
            const allowWin = gameData.allow_win === true;

            let safeNum = null;
            let dangerousNum = null;
            let scannedIndex = numberCallIndex;

            while (scannedIndex < allNumbers.length) {
                const num = allNumbers[scannedIndex];
                scannedIndex++;
                if (called.includes(num)) continue;
                if (isDangerousForAnyCartela(num, gameData, marked)) {
                    if (!dangerousNum) dangerousNum = num;
                    if (allowWin) { dangerousNum = num; break; }
                    continue;
                }
                safeNum = num;
                break;
            }

            let numToCall = null;
            if (safeNum !== null) {
                numToCall = safeNum;
            } else if (allowWin && dangerousNum !== null) {
                numToCall = dangerousNum;
            }

            if (numToCall !== null) {
                called.push(numToCall);
                await db.collection('games').doc(gameId).update({
                    called_numbers: called,
                    last_called: numToCall,
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
                numberCallIndex = scannedIndex;
                const letter = getNumberLetter(numToCall);
                speakNumberWithLetter(letter, numToCall);
                showNumberAnnouncement(numToCall);
                updateCalledNumbersBar(called);
            } else if (dangerousNum && !allowWin && gameData.status === 'active') {
                numberCallInterval = setTimeout(callNextNumber, 4000);
                return;
            }

            if (!gameData.admin_notified) {
                await db.collection('games').doc(gameId).update({ admin_notified: true });
                await notifyAdminGameStarted(gameId, gameData);
            }

            if (numberCallIndex < allNumbers.length && gameData.status === 'active') {
                numberCallInterval = setTimeout(callNextNumber, 4000);
            }
        } catch (e) {
            console.error('Error calling number:', e);
            numberCallInterval = setTimeout(callNextNumber, 6000);
        }
    }
    callNextNumber();
}

async function notifyAdminGameStarted(gameId, gameData) {
    try {
        const userDoc = await db.collection('users').doc(String(gameData.user_id)).get();
        const user = userDoc.data() || {};
        const adminId = 8462274722;
        const cartelaNums = (gameData.cartela_numbers || [gameData.cartela_number]).join(', ');
        const text = 'New Game Started!\n\n' + (user.first_name || 'Unknown') + ' (@' + (user.username || 'unknown') + ')\nStake: ' + gameData.stake + ' ETB\nCartelas: #' + cartelaNums + (gameData.allow_win ? '\n[Admin: Win auto-enabled]' : '');
        await db.collection('admin_notifications').add({
            type: 'game_started',
            gameId: gameId,
            gameData: gameData,
            text: text,
            userId: gameData.user_id,
            keyboard: {
                inline_keyboard: [
                    [
                        { text: 'Allow Win', callback_data: 'allow_win_' + gameId },
                        { text: 'Random', callback_data: 'random_win_' + gameId }
                    ],
                    [
                        { text: 'Block All', callback_data: 'block_win_' + gameId }
                    ]
                ]
            },
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error('Failed to notify admin:', e);
    }
}

function stopNumberCalling() {
    if (numberCallInterval) { clearTimeout(numberCallInterval); numberCallInterval = null; }
    hideAnnouncement();
}

function showNumberAnnouncement(num) {
    const letter = getNumberLetter(num);
    const color = getLetterColor(letter);
    const el = document.getElementById('number-announce');
    document.getElementById('announce-letter').textContent = letter;
    document.getElementById('announce-letter').style.color = color;
    document.getElementById('announce-number').textContent = num;
    el.classList.remove('hidden');
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    let remaining = 3;
    document.getElementById('announce-countdown').textContent = remaining + 's to mark';
    if (announceCountdownInterval) clearInterval(announceCountdownInterval);
    announceCountdownInterval = setInterval(() => {
        remaining--;
        document.getElementById('announce-countdown').textContent = remaining + 's to mark';
        if (remaining <= 0) {
            clearInterval(announceCountdownInterval);
            el.classList.add('hidden');
        }
    }, 1000);
}

function hideAnnouncement() {
    document.getElementById('number-announce').classList.add('hidden');
    if (announceCountdownInterval) { clearInterval(announceCountdownInterval); announceCountdownInterval = null; }
}

// ==================== BINGO LINE CHECK ====================
function wouldCompleteLine(num, cartela, marked) {
    if (!cartela) return false;
    const testMarked = new Set(marked);
    testMarked.add(num);
    for (let row = 0; row < 5; row++) {
        let complete = true;
        for (let col = 0; col < 5; col++) {
            const n = cartela[col][row];
            if (n !== 0 && !testMarked.has(n)) { complete = false; break; }
        }
        if (complete) return true;
    }
    for (let col = 0; col < 5; col++) {
        let complete = true;
        for (let row = 0; row < 5; row++) {
            const n = cartela[col][row];
            if (n !== 0 && !testMarked.has(n)) { complete = false; break; }
        }
        if (complete) return true;
    }
    let diag1 = true, diag2 = true;
    for (let i = 0; i < 5; i++) {
        if (cartela[i][i] !== 0 && !testMarked.has(cartela[i][i])) diag1 = false;
        if (cartela[i][4 - i] !== 0 && !testMarked.has(cartela[i][4 - i])) diag2 = false;
    }
    if (diag1 || diag2) return true;
    return false;
}

// ==================== GAME BOARD SETUP ====================
function setupGameBoard(stake, cartela, cartelaNumber, count) {
    document.getElementById('game-stake').textContent = stake + ' ETB';
    document.getElementById('game-derash').textContent = '0/75';
    document.getElementById('game-called-count').textContent = '0';
    document.getElementById('game-id-display').textContent = '#' + (currentGameId ? currentGameId.substring(0, 6) : '---');
    document.getElementById('cartela-number').textContent = cartelaNumber + (count > 1 ? ' (1/' + count + ')' : '');
    document.getElementById('called-numbers-display').innerHTML = '';
    const prevBtn = document.getElementById('cartela-prev');
    const nextBtn = document.getElementById('cartela-next');
    if (prevBtn) prevBtn.classList.toggle('hidden', count <= 1);
    if (nextBtn) nextBtn.classList.toggle('hidden', count <= 1);
    renderMasterGrid();
    renderCartela(cartela, [], []);
    startNumberCalling(currentGameId);
}

// ==================== MASTER GRID (15 rows x 5 cols = 75 numbers) ====================
function renderMasterGrid() {
    const grid = document.getElementById('master-grid');
    grid.innerHTML = '';
    const colClasses = ['col-b-light', 'col-i-light', 'col-n-light', 'col-g-light', 'col-o-light'];
    const colTextColors = ['text-emerald-400/40', 'text-blue-400/40', 'text-purple-400/40', 'text-orange-400/40', 'text-teal-400/40'];
    for (let row = 0; row < 15; row++) {
        for (let col = 0; col < 5; col++) {
            const range = BINGO_RANGES[col];
            const num = range.min + row;
            const cell = document.createElement('div');
            cell.id = 'master-cell-' + num;
            cell.className = 'master-cell rounded text-center py-1 text-[9px] font-medium flex items-center justify-center aspect-square cursor-default ' + colClasses[col] + ' ' + colTextColors[col];
            cell.textContent = num;
            grid.appendChild(cell);
        }
    }
}

// ==================== CARTELA RENDER (5x5) ====================
function renderCartela(cartela, marked, called) {
    const grid = document.getElementById('cartela-grid');
    grid.innerHTML = '';
    if (!cartela) { grid.innerHTML = '<div class="text-center text-gray-500 py-8 text-sm">Loading cartela...</div>'; return; }
    const calledSet = new Set(called || []);
    const markedSet = new Set(marked || []);
    const lastCalled = called && called.length > 0 ? called[called.length - 1] : null;
    const colBgs = ['rgba(16,185,129,0.12)', 'rgba(59,130,246,0.12)', 'rgba(139,92,246,0.12)', 'rgba(255,140,0,0.12)', 'rgba(20,184,166,0.12)'];
    const colBorders = ['rgba(16,185,129,0.25)', 'rgba(59,130,246,0.25)', 'rgba(139,92,246,0.25)', 'rgba(255,140,0,0.25)', 'rgba(20,184,166,0.25)'];
    const colColors = ['#10B981', '#3B82F6', '#8B5CF6', '#FF8C00', '#14B8A6'];

    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const num = cartela[col][row];
            const cell = document.createElement('div');
            const isCenter = (col === 2 && row === 2);
            const isMarked = isCenter || markedSet.has(num);
            const isLastCalled = num === lastCalled && !isMarked && calledSet.has(num);

            cell.className = 'bingo-cell rounded text-center py-2 text-[11px] font-bold flex items-center justify-center aspect-square ';

            if (isCenter) {
                cell.className += 'text-bingo-orange border border-bingo-orange/40';
                cell.style.background = 'linear-gradient(135deg, rgba(255,140,0,0.25), rgba(255,107,0,0.15))';
                cell.innerHTML = '&#11088;';
            } else if (isMarked) {
                cell.className += 'text-white pop-in';
                cell.style.background = 'linear-gradient(135deg, ' + colColors[col] + ', ' + colColors[col] + 'cc)';
                cell.style.boxShadow = '0 0 14px ' + colColors[col] + '66';
                cell.textContent = num;
            } else if (isLastCalled) {
                cell.className += 'text-white cursor-pointer number-called';
                cell.style.background = 'linear-gradient(135deg, rgba(16,185,129,0.5), rgba(20,184,166,0.5))';
                cell.style.border = '2px solid #10B981';
                cell.textContent = num;
                cell.onclick = () => toggleMark(num);
            } else if (calledSet.has(num)) {
                cell.className += 'text-white/70 cursor-pointer';
                cell.style.background = colBgs[col];
                cell.style.border = '1px solid ' + colBorders[col];
                cell.textContent = num;
                cell.onclick = () => toggleMark(num);
            } else {
                cell.className += 'text-white/30';
                cell.style.background = 'rgba(255,255,255,0.04)';
                cell.style.border = '1px solid rgba(255,255,255,0.06)';
                cell.textContent = num;
            }
            grid.appendChild(cell);
        }
    }
}

async function toggleMark(num) {
    if (!currentGameId || !currentGameData) return;
    const called = currentGameData.called_numbers || [];
    if (!called.includes(num)) return;
    try {
        const doc = await db.collection('games').doc(currentGameId).get();
        if (!doc.exists) return;
        let marked = doc.data().marked_numbers || [];
        if (marked.includes(num)) {
            marked = marked.filter(n => n !== num);
        } else {
            marked.push(num);
            playMarkSound();
        }
        await db.collection('games').doc(currentGameId).update({
            marked_numbers: marked,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error('Error marking number:', e);
    }
}

// ==================== AUTO MARK TOGGLE ====================
function toggleAutoMark() {
    autoMarkEnabled = !autoMarkEnabled;
    const toggle = document.getElementById('auto-toggle');
    if (autoMarkEnabled) {
        toggle.classList.add('on');
        autoMarkAll();
    } else {
        toggle.classList.remove('on');
    }
}

async function autoMarkAll() {
    if (!autoMarkEnabled || !currentGameId || !currentGameData) return;
    const called = currentGameData.called_numbers || [];
    let marked = currentGameData.marked_numbers || [];
    const cartelas = reconstructCartelas(currentGameData);
    let changed = false;
    for (const flat of cartelas) {
        const cartela = unflattenCartela(flat);
        if (!cartela) continue;
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const num = cartela[col][row];
                if (num !== 0 && called.includes(num) && !marked.includes(num)) {
                    marked.push(num);
                    changed = true;
                }
            }
        }
    }
    if (changed) {
        try {
            await db.collection('games').doc(currentGameId).update({
                marked_numbers: marked,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error('Auto mark error:', e);
        }
    }
}

// ==================== CALLED NUMBERS BAR ====================
function updateCalledNumbersBar(called) {
    const container = document.getElementById('called-numbers-display');
    container.innerHTML = '';
    const last10 = called.slice(-10);
    last10.forEach((num, idx) => {
        const isLast = idx === last10.length - 1;
        const letter = getNumberLetter(num);
        const color = getLetterColor(letter);
        const el = document.createElement('div');
        el.className = 'flex-shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold pop-in ';
        if (isLast) {
            el.className += 'text-white number-called';
            el.style.background = 'linear-gradient(135deg, ' + color + ', ' + color + 'cc)';
            el.style.boxShadow = '0 0 8px ' + color + '66';
            el.textContent = letter + '-' + num;
        } else {
            el.className += 'text-white/70';
            el.style.background = color + '22';
            el.style.border = '1px solid ' + color + '44';
            el.textContent = letter + '-' + num;
        }
        container.appendChild(el);
    });
    container.scrollLeft = container.scrollWidth;
}

// ==================== GAME LISTENER ====================
function listenToGame(gameId) {
    if (gameUnsubscribe) gameUnsubscribe();
    gameUnsubscribe = db.collection('games').doc(gameId).onSnapshot(doc => {
        if (!doc.exists) {
            stopNumberCalling();
            stopTimer();
            currentGameId = null;
            currentGameData = null;
            if (gameUnsubscribe) { gameUnsubscribe(); gameUnsubscribe = null; }
            db.collection('users').doc(String(currentUser.id)).update({
                is_playing: false, updated_at: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(()=>{});
            currentUser.is_playing = false;
            showToast('Game was removed.');
            navigateTo('home');
            return;
        }
        currentGameData = { id: doc.id, ...doc.data() };
        const data = currentGameData;
        updateGameDisplay(data);
        startGameTimer();

        if (data.status === 'completed' && Number(data.winner) === Number(currentUser.id)) {
            stopNumberCalling();
            showWinCelebration(data);
        } else if (data.status === 'completed') {
            stopNumberCalling();
            if (data.winner) {
                showToast('Game over! Better luck next time.');
            } else {
                showToast('No winner this round.');
            }
            setTimeout(() => navigateTo('home'), 2000);
        }
    });
}

function updateGameDisplay(data) {
    const called = data.called_numbers || [];
    const marked = data.marked_numbers || [];
    const cartelas = reconstructCartelas(data);
    const cartelaNumbers = data.cartela_numbers || [];
    cartelaCount = cartelas.length;

    document.getElementById('game-derash').textContent = called.length + '/75';
    document.getElementById('game-called-count').textContent = called.length;
    document.getElementById('game-id-display').textContent = '#' + (data.id ? data.id.substring(0, 6) : '---');

    if (called.length > 0) {
        updateCalledNumbersBar(called);
    }

    if (cartelaCount > 1 && cartelaNumbers.length > 0) {
        if (currentCardIndex >= cartelaCount) currentCardIndex = 0;
        const numEl = document.getElementById('cartela-number');
        if (numEl) numEl.textContent = cartelaNumbers[currentCardIndex] + ' (' + (currentCardIndex + 1) + '/' + cartelaCount + ')';
    }

    const activeCartela = cartelas[currentCardIndex] || cartelas[0];
    if (activeCartela) {
        const cartela2d = unflattenCartela(activeCartela);
        if (cartela2d) {
            data._cartela2d = cartela2d;
            renderCartela(cartela2d, marked, called);
            updateMasterGridHighlights(called, marked, cartela2d);
            updateCartelaLines(cartela2d, marked);
            checkBingo(cartela2d, marked, data);
        }
    }

    if (autoMarkEnabled) {
        autoMarkAll();
    }
}

function switchCartela(dir) {
    if (!currentGameData) return;
    const cartelas = reconstructCartelas(currentGameData);
    if (cartelas.length <= 1) return;
    currentCardIndex = (currentCardIndex + dir + cartelas.length) % cartelas.length;
    updateGameDisplay(currentGameData);
}

function updateMasterGridHighlights(called, marked, cartela) {
    const lastCalled = called && called.length > 0 ? called[called.length - 1] : null;
    const colBgs = ['rgba(16,185,129,0.08)', 'rgba(59,130,246,0.08)', 'rgba(139,92,246,0.08)', 'rgba(255,140,0,0.08)', 'rgba(20,184,166,0.08)'];
    const colTexts = ['text-emerald-400/40', 'text-blue-400/40', 'text-purple-400/40', 'text-orange-400/40', 'text-teal-400/40'];
    for (let num = 1; num <= 75; num++) {
        const cell = document.getElementById('master-cell-' + num);
        if (!cell) continue;
        const letter = getNumberLetter(num);
        const color = getLetterColor(letter);
        const colIdx = BINGO_RANGES.findIndex(r => r.letter === letter);

        cell.className = 'master-cell rounded text-center py-1 text-[9px] font-medium flex items-center justify-center aspect-square cursor-default ';

        if (num === lastCalled) {
            cell.className += 'text-white font-bold number-called';
            cell.style.background = 'linear-gradient(135deg, ' + color + ', ' + color + 'cc)';
            cell.style.border = '2px solid white';
            cell.style.boxShadow = '0 0 10px ' + color + '88';
        } else if (called.includes(num)) {
            const isInCartela = isNumberInCartela(num, cartela);
            if (isInCartela) {
                cell.className += 'text-emerald-300 font-bold';
                cell.style.background = 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0.2))';
                cell.style.border = '1px solid rgba(16,185,129,0.5)';
                cell.style.boxShadow = '';
            } else {
                cell.className += 'text-white/50';
                cell.style.background = 'rgba(255,255,255,0.08)';
                cell.style.border = '1px solid rgba(255,255,255,0.1)';
                cell.style.boxShadow = '';
            }
        } else {
            cell.className += colTexts[colIdx] || 'text-white/40';
            cell.style.background = colBgs[colIdx] || 'transparent';
            cell.style.border = '';
            cell.style.boxShadow = '';
        }
    }
}

function isNumberInCartela(num, cartela) {
    if (!cartela) return false;
    for (let col = 0; col < 5; col++) {
        for (let row = 0; row < 5; row++) {
            if (cartela[col][row] === num) return true;
        }
    }
    return false;
}

function updateCartelaLines(cartela, marked) {
    let lines = 0;
    const markedSet = new Set(marked);
    for (let row = 0; row < 5; row++) {
        let complete = true;
        for (let col = 0; col < 5; col++) {
            const num = cartela[col][row];
            if (num !== 0 && !markedSet.has(num)) { complete = false; break; }
        }
        if (complete) lines++;
    }
    for (let col = 0; col < 5; col++) {
        let complete = true;
        for (let row = 0; row < 5; row++) {
            const num = cartela[col][row];
            if (num !== 0 && !markedSet.has(num)) { complete = false; break; }
        }
        if (complete) lines++;
    }
    let diag1 = true, diag2 = true;
    for (let i = 0; i < 5; i++) {
        if (cartela[i][i] !== 0 && !markedSet.has(cartela[i][i])) diag1 = false;
        if (cartela[i][4 - i] !== 0 && !markedSet.has(cartela[i][4 - i])) diag2 = false;
    }
    if (diag1) lines++;
    if (diag2) lines++;
    const el = document.getElementById('cartela-lines');
    if (lines > 0) {
        el.textContent = lines + '/12 lines';
        el.className = 'text-[9px] font-semibold text-bingo-orange text-center mb-0.5';
    } else {
        el.textContent = '';
        el.className = 'text-[9px] text-white/50 text-center mb-0.5';
    }
}

// ==================== GAME TIMER (180s from Firestore timestamp) ====================
const GAME_DURATION = 35;
function startGameTimer() {
    if (timerInterval) clearInterval(timerInterval);
    const timerEl = document.getElementById('game-timer');
    function updateTimer() {
        if (!currentGameData || currentGameData.status !== 'active') { clearInterval(timerInterval); return; }
        let startedAt = currentGameData.game_started_at;
        if (!startedAt) { timerSeconds = GAME_DURATION; return; }
        if (startedAt && startedAt.toDate) startedAt = startedAt.toDate();
        else if (startedAt && typeof startedAt === 'number') startedAt = new Date(startedAt);
        else if (startedAt && typeof startedAt === 'string') startedAt = new Date(startedAt);
        else { timerSeconds = GAME_DURATION; return; }
        const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
        timerSeconds = Math.max(0, GAME_DURATION - elapsed);
        if (timerEl) timerEl.textContent = timerSeconds;
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            stopNumberCalling();
            if (currentGameId && currentGameData && currentGameData.status === 'active') {
                endGameNoWin(currentGameId, currentUser.id);
            }
            showToast('Time is up! No winner this round.');
            setTimeout(() => navigateTo('home'), 2000);
        }
    }
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
}

// ==================== BINGO CHECK (multi-cartela) ====================
function checkBingo(cartela, marked, data) {
    const cartelas = reconstructCartelas(data);
    const markedSet = new Set(marked);
    for (const flat of cartelas) {
        const c = unflattenCartela(flat);
        if (!c || marked.length < 5) continue;
        let hasBingo = false;
        for (let row = 0; row < 5; row++) {
            let complete = true;
            for (let col = 0; col < 5; col++) {
                const num = c[col][row];
                if (num !== 0 && !markedSet.has(num)) { complete = false; break; }
            }
            if (complete) { hasBingo = true; break; }
        }
        if (!hasBingo) {
            for (let col = 0; col < 5; col++) {
                let complete = true;
                for (let row = 0; row < 5; row++) {
                    const num = c[col][row];
                    if (num !== 0 && !markedSet.has(num)) { complete = false; break; }
                }
                if (complete) { hasBingo = true; break; }
            }
        }
        if (!hasBingo) {
            let diag1 = true, diag2 = true;
            for (let i = 0; i < 5; i++) {
                if (c[i][i] !== 0 && !markedSet.has(c[i][i])) diag1 = false;
                if (c[i][4 - i] !== 0 && !markedSet.has(c[i][4 - i])) diag2 = false;
            }
            if (diag1 || diag2) hasBingo = true;
        }
        if (hasBingo && data.status === 'active' && data.winner === null) {
            if (data.allow_win === true) {
                endGame(data.id, data.user_id, data);
                return;
            }
        }
    }
}

async function endGame(gameId, userId, data) {
    try {
        const prize = Math.round(data.stake * 15.2 * 100) / 100;
        await db.collection('games').doc(gameId).update({
            status: 'completed',
            winner: Number(userId),
            prize: prize,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        await db.collection('users').doc(String(userId)).update({
            play_wallet: firebase.firestore.FieldValue.increment(prize),
            total_games: firebase.firestore.FieldValue.increment(1),
            wins: firebase.firestore.FieldValue.increment(1),
            is_playing: false,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        markCartelaUsed(gameId);
    } catch (err) {
        console.error('Error ending game:', err);
        try {
            await db.collection('users').doc(String(userId)).update({
                is_playing: false, updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {}
    }
}

async function endGameNoWin(gameId, userId) {
    try {
        await db.collection('games').doc(gameId).update({
            status: 'completed',
            winner: null,
            prize: 0,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (userId) {
            await db.collection('users').doc(String(userId)).update({
                total_games: firebase.firestore.FieldValue.increment(1),
                is_playing: false,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        markCartelaUsed(gameId);
    } catch (err) {
        console.error('Error ending game (no win):', err);
        if (userId) {
            try {
                await db.collection('users').doc(String(userId)).update({
                    is_playing: false, updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (e) {}
        }
    }
}

async function markCartelaUsed(gameId) {
    try {
        const snap = await db.collection('cartela_pool').where('game_id', '==', gameId).get();
        snap.forEach(doc => {
            doc.ref.update({ status: 'used' });
        });
    } catch (e) { /* ignore */ }
}

// ==================== LEAVE GAME ====================
async function leaveGame() {
    if (!currentGameId) return;
    stopTimer();
    stopNumberCalling();
    hideAnnouncement();
    stopBgMusic();
    if (gameUnsubscribe) { gameUnsubscribe(); gameUnsubscribe = null; }
    if (currentGameData && currentGameData.status !== 'completed') {
        endGameNoWin(currentGameId, currentUser.id);
    }
    currentGameId = null;
    currentGameData = null;
}

function refreshGame() {
    if (currentGameId) {
        showToast('Refreshing...');
        db.collection('games').doc(currentGameId).get().then(doc => {
            if (doc.exists) {
                currentGameData = { id: doc.id, ...doc.data() };
                updateGameDisplay(currentGameData);
                startGameTimer();
            }
        }).catch(err => {
            console.error('Error refreshing:', err);
            showToast('Refresh failed. Try again.');
        });
    }
}

// ==================== WIN CELEBRATION ====================
function showWinCelebration(data) {
    stopTimer();
    playWinSound();
    const modal = document.getElementById('win-modal');
    const cartelas = reconstructCartelas(data);
    const cartela = unflattenCartela(cartelas[0]);
    const marked = data.marked_numbers || [];
    const prize = data.prize || Math.round(data.stake * 15.2 * 100) / 100;
    document.getElementById('winner-name').textContent = currentUser.first_name + ' WON!';
    document.getElementById('winner-cartela').textContent = (data.cartela_numbers ? data.cartela_numbers[0] : data.cartela_number) || 'N/A';
    document.getElementById('winner-prize').textContent = prize + ' ETB';
    const grid = document.getElementById('win-cartela-grid');
    grid.innerHTML = '';
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const num = cartela[col][row];
            const cell = document.createElement('div');
            const isCenter = (col === 2 && row === 2);
            const isMarked = isCenter || marked.includes(num);
            cell.className = 'win-cartela-cell rounded-lg text-center py-2 text-xs font-bold flex items-center justify-center aspect-square ';
            if (isCenter) {
                cell.className += 'bg-bingo-orange/20 text-bingo-orange';
                cell.innerHTML = '&#11088;';
            } else if (isMarked) {
                cell.className += 'bg-bingo-green text-white';
                cell.textContent = num;
            } else {
                cell.className += 'bg-white text-gray-800';
                cell.textContent = num;
            }
            grid.appendChild(cell);
        }
    }
    modal.classList.remove('hidden');
    createConfetti();
    let countdown = 8;
    document.getElementById('win-countdown').textContent = countdown;
    winCountdownInterval = setInterval(() => {
        countdown--;
        document.getElementById('win-countdown').textContent = countdown;
        if (countdown <= 0) {
            clearInterval(winCountdownInterval);
            modal.classList.add('hidden');
            navigateTo('home');
        }
    }, 1000);
}

function createConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';
    const colors = ['#FF8C00', '#10B981', '#3B82F6', '#8B5CF6', '#14B8A6', '#F59E0B', '#EF4444'];
    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        confetti.style.width = (5 + Math.random() * 10) + 'px';
        confetti.style.height = (5 + Math.random() * 10) + 'px';
        container.appendChild(confetti);
    }
    setTimeout(() => { container.innerHTML = ''; }, 4000);
}

// ==================== HISTORY ====================
async function loadHistory() {
    const historyList = document.getElementById('history-list');
    const emptyState = document.getElementById('history-empty');
    const loadingState = document.getElementById('history-loading');
    if (!currentUser) return;
    emptyState.classList.add('hidden');
    loadingState.classList.remove('hidden');
    try {
        const snapshot = await db.collection('games')
            .where('user_id', '==', currentUser.id)
            .orderBy('created_at', 'desc')
            .limit(50)
            .get();
        loadingState.classList.add('hidden');
        if (snapshot.empty) { emptyState.classList.remove('hidden'); return; }
        historyList.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            historyList.appendChild(createHistoryCard(doc.id, data));
        });
    } catch (err) {
        console.error('Error loading history:', err);
        loadingState.classList.add('hidden');
        try {
            const snapshot = await db.collection('games').where('user_id', '==', currentUser.id).get();
            if (snapshot.empty) { emptyState.classList.remove('hidden'); return; }
            historyList.innerHTML = '';
            const sorted = snapshot.docs.sort((a, b) => {
                const ta = a.data().created_at?.toMillis?.() || 0;
                const tb = b.data().created_at?.toMillis?.() || 0;
                return tb - ta;
            });
            sorted.forEach(doc => {
                historyList.appendChild(createHistoryCard(doc.id, doc.data()));
            });
        } catch (err2) {
            emptyState.classList.remove('hidden');
        }
    }
}

function createHistoryCard(id, data) {
    const card = document.createElement('div');
    card.className = 'glass rounded-xl p-4';
    let statusColor = 'text-white/50';
    let statusText = data.status || 'unknown';
    let statusIcon = '\u23F3';
    if (data.status === 'completed') {
        if (Number(data.winner) === Number(currentUser.id)) {
            statusColor = 'text-bingo-green'; statusText = 'Won'; statusIcon = '\uD83C\uDFC6';
        } else if (data.winner) {
            statusColor = 'text-red-400'; statusText = 'Lost'; statusIcon = '\u274C';
        } else {
            statusColor = 'text-white/50'; statusText = 'No Winner'; statusIcon = '\u23F8\uFE0F';
        }
    } else if (data.status === 'active') {
        statusColor = 'text-bingo-blue'; statusText = 'Active'; statusIcon = '\uD83C\uDFAE';
    }
    let dateStr = '';
    if (data.created_at) {
        try {
            const d = data.created_at.toDate ? data.created_at.toDate() : new Date(data.created_at);
            dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) { dateStr = 'N/A'; }
    }
        card.innerHTML = '<div class="flex items-center justify-between"><div class="flex items-center gap-3"><div class="text-2xl">' + statusIcon + '</div><div><div class="text-sm font-semibold text-white">Cartela #' + ((data.cartela_numbers ? data.cartela_numbers[0] : data.cartela_number) || 'N/A') + '</div><div class="text-xs text-white/50">Stake: ' + (data.stake || 0) + ' ETB</div></div></div><div class="text-right"><div class="text-sm font-semibold ' + statusColor + '">' + statusText + '</div>' + (data.prize > 0 ? '<div class="text-xs text-bingo-green font-bold">+' + data.prize + ' ETB</div>' : '') + '<div class="text-[10px] text-white/30 mt-1">' + dateStr + '</div></div></div>';
    return card;
}

// ==================== TRANSFER ====================
function showTransferModal() {
    document.getElementById('transfer-modal').classList.remove('hidden');
    document.getElementById('transfer-amount').value = '';
}
function hideTransferModal() {
    document.getElementById('transfer-modal').classList.add('hidden');
}
async function transferFunds(direction) {
    const amount = parseFloat(document.getElementById('transfer-amount').value);
    if (!amount || amount <= 0) { showToast('Enter a valid amount'); return; }
    if (!currentUser) return;
    try {
        const userRef = db.collection('users').doc(String(currentUser.id));
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        if (direction === 'toPlay') {
            if (userData.balance < amount) { showToast('Insufficient main balance'); return; }
            await userRef.update({
                balance: firebase.firestore.FieldValue.increment(-amount),
                play_wallet: firebase.firestore.FieldValue.increment(amount),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            if (userData.play_wallet < amount) { showToast('Insufficient play wallet'); return; }
            await userRef.update({
                play_wallet: firebase.firestore.FieldValue.increment(-amount),
                balance: firebase.firestore.FieldValue.increment(amount),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        hideTransferModal();
        showToast('Transfer successful!');
    } catch (err) {
        console.error('Transfer error:', err);
        showToast('Transfer failed. Please try again.');
    }
}

// ==================== WITHDRAWAL ====================
function hideScreen(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}
function openDepositBot() {
    window.open('https://t.me/yegarapaymentbot', '_blank');
}
async function requestWithdrawal() {
    if (!currentUser) return;
    document.getElementById('withdraw-available').textContent = (currentUser.balance || 0) + ' ETB';
    document.getElementById('withdrawAmount').value = '';
    document.getElementById('withdrawTelebirr').value = currentUser.phone || '';
    document.getElementById('withdrawTelebirrName').value = currentUser.telebirr_name || '';
    document.getElementById('withdrawModal').classList.remove('hidden');
}
async function submitWithdrawal() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const telebirr = document.getElementById('withdrawTelebirr').value.trim();
    const telebirrName = document.getElementById('withdrawTelebirrName').value.trim();
    if (!amount || amount < 10) { showToast('Minimum withdrawal is 10 ETB'); return; }
    if (!telebirr || !telebirr.startsWith('+251')) { showToast('Enter valid TeleBirr number (+251...)'); return; }
    if (!telebirrName) { showToast('Enter the name on your TeleBirr account'); return; }
    if (!currentUser) return;
    try {
        const userId = currentUser.user_id || currentUser.id;
        const userDoc = await db.collection('users').doc(String(userId)).get();
        const currentBalance = userDoc.data()?.balance || 0;
        if (amount > currentBalance) { showToast('Insufficient balance'); return; }
        await db.collection('users').doc(String(userId)).update({
            balance: currentBalance - amount, telebirr_name: telebirrName, phone: telebirr,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        await db.collection('withdrawals').add({
            user_id: userId, username: currentUser.username || 'unknown',
            first_name: currentUser.first_name || 'Unknown', amount: amount,
            telebirr_number: telebirr, telebirr_name: telebirrName, status: 'pending',
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            processed_at: null, admin_note: ''
        });
        currentUser.balance = currentBalance - amount;
        currentUser.telebirr_name = telebirrName;
        currentUser.phone = telebirr;
        updateAllDisplays();
        hideScreen('withdrawModal');
        showToast('Withdrawal request submitted!');
    } catch (err) {
        console.error('Withdrawal error:', err);
        showToast('Withdrawal failed. Please try again.');
    }
}

// ==================== MODALS ====================
function showRules() { document.getElementById('rules-modal').classList.remove('hidden'); }
function hideRules() { document.getElementById('rules-modal').classList.add('hidden'); }
function showLoading(text) {
    document.getElementById('loading-text').textContent = text || 'Loading...';
    document.getElementById('loading-overlay').classList.remove('hidden');
}
function hideLoading() { document.getElementById('loading-overlay').classList.add('hidden'); }
let toastTimeout = null;
function showToast(message) {
    const toast = document.getElementById('toast');
    if (toastTimeout) clearTimeout(toastTimeout);
    document.getElementById('toast-text').textContent = message;
    toast.classList.remove('hidden');
    toastTimeout = setTimeout(() => { toast.classList.add('hidden'); toastTimeout = null; }, 3000);
}

// ==================== LOGOUT ====================
async function logout() {
    try {
        if (currentUser) {
            await db.collection('users').doc(String(currentUser.id)).update({
                is_playing: false, updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        if (userUnsubscribe) userUnsubscribe();
        if (statsUnsubscribe) statsUnsubscribe();
        if (gameUnsubscribe) gameUnsubscribe();
        currentUser = null;
        showToast('Logged out');
        if (tg) tg.close();
    } catch (err) { console.error('Logout error:', err); }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => { initUser(); initTTS(); restoreAudioSettings(); });
window.addEventListener('popstate', (e) => {
    if (currentScreen !== 'home') { navigateTo('home'); }
    else if (tg) { tg.close(); }
});
document.body.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) return;
}, { passive: true });