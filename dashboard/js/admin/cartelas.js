// ==================== CARTELA POOL ====================
var _cartelaPoolUnsubscribe = null;

function generateOneCartela() {
    var ranges = [{ min: 1, max: 15 }, { min: 16, max: 30 }, { min: 31, max: 45 }, { min: 46, max: 60 }, { min: 61, max: 75 }];
    var cartela = [];
    for (var col = 0; col < 5; col++) {
        var colNums = [];
        var avail = [];
        for (var n = ranges[col].min; n <= ranges[col].max; n++) avail.push(n);
        for (var row = 0; row < 5; row++) {
            if (col === 2 && row === 2) { colNums.push(0); continue; }
            var idx = Math.floor(Math.random() * avail.length);
            colNums.push(avail.splice(idx, 1)[0]);
        }
        cartela.push(colNums);
    }
    return cartela;
}

async function generateCartelaPool() {
    if (!confirm('Generate the 500 fixed cartelas? This will call the API.')) return;
    console.log('[CART-DBG] API_BASE:', API_BASE);
    var MAX_RETRIES = 2;
    var RETRY_DELAY = 3000;
    var TIMEOUT_MS = 300000;
    for (var attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            var url = API_BASE + '/api/cartelas/generate';
            console.log('[CART-DBG] Attempt ' + (attempt + 1) + '/' + (MAX_RETRIES + 1) + ' - POST', url);
            var controller = new AbortController();
            var timeoutId = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
            var t0 = Date.now();
            var res = await fetch(url, { method: 'POST', signal: controller.signal });
            var fetchMs = Date.now() - t0;
            clearTimeout(timeoutId);
            console.log('[CART-DBG] Status:', res.status, res.statusText, '| Time:', fetchMs + 'ms');
            console.log('[CART-DBG] Content-Type:', res.headers.get('content-type'));
            console.log('[CART-DBG] Content-Length:', res.headers.get('content-length'));
            if (!res.ok) {
                var errText = '';
                try { errText = await res.text(); } catch (_) {}
                console.log('[CART-DBG] Error body:', errText.substring(0, 500));
                throw new Error(errText || ('Server error: ' + res.status));
            }
            var raw = await res.text();
            console.log('[CART-DBG] Response length:', raw.length, 'chars');
            console.log('[CART-DBG] Response preview:', raw.substring(0, 200));
            if (!raw) throw new Error('Empty response from server');
            var data = JSON.parse(raw);
            console.log('[CART-DBG] Parsed OK:', JSON.stringify(data).substring(0, 300));
            alert(data.status === 'already_exists' ? 'Cartelas already exist.' : 'Generated 500 cartelas successfully!');
            return;
        } catch (e) {
            console.error('[CART-DBG] Attempt ' + (attempt + 1) + ' FAILED:', e.name, e.message);
            var isNetworkError = e.name === 'TypeError';
            var isTimeout = e.name === 'AbortError';
            var isParseError = e instanceof SyntaxError;
            var errorMsg;
            if (isTimeout) {
                errorMsg = 'Request timed out after 5 minutes.';
            } else if (isNetworkError) {
                errorMsg = 'Network error. Please check your connection.';
            } else if (isParseError) {
                errorMsg = 'Invalid response format from server.';
            } else {
                errorMsg = 'Server error: ' + e.message;
            }
            if (attempt < MAX_RETRIES && (isNetworkError || !raw)) {
                console.log('[CART-DBG] Retrying in ' + (RETRY_DELAY / 1000) + 's...');
                await new Promise(function (r) { setTimeout(r, RETRY_DELAY); });
                continue;
            }
            alert('Error generating cartelas: ' + errorMsg);
            return;
        }
    }
}

function loadCartelaPool() {
    // Unsubscribe previous listener
    if (_cartelaPoolUnsubscribe) { _cartelaPoolUnsubscribe(); _cartelaPoolUnsubscribe = null; }

    _cartelaPoolUnsubscribe = db.collection('cartelas_master').orderBy('number').onSnapshot(function (snap) {
        var list = document.getElementById('cartelaPoolList');
        var empty = document.getElementById('cartelaPoolEmpty');
        if (!list || !empty) return;

        var items = [];
        snap.forEach(function (doc) {
            items.push({ id: doc.id, data: doc.data() });
        });
        document.getElementById('cartelaAvailableCount').textContent = items.length;
        document.getElementById('cartelaAssignedCount').textContent = 0;
        document.getElementById('cartelaUsedCount').textContent = 0;

        if (items.length === 0) {
            list.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');
        list.innerHTML = items.map(function (item) {
            var d = item.data;
            var num = d.number || item.id;
            var flat = d.cartela || [];
            var mini = '<div class="grid grid-cols-5 gap-0.5 max-w-[120px]">';
            var hdrs = ['B', 'I', 'N', 'G', 'O'];
            var hcls = ['text-[#10B981]', 'text-[#3B82F6]', 'text-[#8B5CF6]', 'text-[#FF8C00]', 'text-[#14B8A6]'];
            for (var i = 0; i < 5; i++) mini += '<div class="' + hcls[i] + ' text-center text-[7px] font-bold">' + hdrs[i] + '</div>';
            for (var r = 0; r < 5; r++) {
                for (var c = 0; c < 5; c++) {
                    var v = flat[r * 5 + c];
                    if (r === 2 && c === 2) mini += '<div class="bg-[#FF8C00]/20 text-[#FF8C00] text-center text-[7px] font-bold rounded">⭐</div>';
                    else mini += '<div class="bg-white/5 text-white/60 text-center text-[7px] font-bold rounded">' + v + '</div>';
                }
            }
            mini += '</div>';
            return '<div class="px-6 py-3 flex items-center justify-between hover:bg-white/[0.02]">' +
                '<div class="flex items-center gap-4">' +
                '<div class="text-sm font-mono text-gray-400">#' + num + '</div>' +
                mini +
                '</div>' +
                '<div class="flex items-center gap-2">' +
                '<span class="text-[10px] px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] font-semibold">Master</span>' +
                '</div>' +
                '</div>';
        }).join('');
    });
}

function stopCartelaPoolListener() {
    if (_cartelaPoolUnsubscribe) { _cartelaPoolUnsubscribe(); _cartelaPoolUnsubscribe = null; }
}
