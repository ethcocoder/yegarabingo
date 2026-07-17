// ==================== PAYMENTS (SQL REST API) ====================

function toggleAdminOnline() {
    adminOnline = !adminOnline;
    api('POST', '/api/admin/status', { online: adminOnline }).then(function () {
        updateAdminStatusUI();
        loadPayments();
    }).catch(function (e) { showToast('Error updating status: ' + e.message, 'error'); });
}

function updateAdminStatusUI() {
    var dot = document.getElementById('adminStatusDot');
    var txt = document.getElementById('adminStatusText');
    var btn = document.getElementById('adminOnlineBtn');
    if (adminOnline) {
        dot.className = 'w-3 h-3 rounded-full bg-green-500 anim-live';
        txt.textContent = 'Online';
        txt.className = 'text-sm font-semibold text-green-400';
        btn.textContent = 'Go Offline';
        btn.className = 'btn-red-g px-4 py-2 rounded-xl text-sm font-bold text-white';
    } else {
        dot.className = 'w-3 h-3 rounded-full bg-red-500 anim-live';
        txt.textContent = 'Offline';
        txt.className = 'text-sm font-semibold text-gray-400';
        btn.textContent = 'Go Online';
        btn.className = 'btn-grad px-4 py-2 rounded-xl text-sm font-bold text-white';
    }
}

function loadPayments() {
    // Load admin status
    api('GET', '/api/admin/status').then(function (data) {
        adminOnline = data.online || false;
        updateAdminStatusUI();
    });

    // Pending deposits
    api('GET', '/api/admin/deposits?status=pending&limit=50').then(function (deposits) {
        var list = document.getElementById('payPendingList');
        document.getElementById('pay-pending-count').textContent = deposits.length;
        if (!deposits.length) {
            list.innerHTML = '<div class="text-center py-8"><div class="text-3xl mb-2">📭</div><p class="text-gray-500 text-sm">No pending deposits</p></div>';
            return;
        }
        var totalPending = 0;
        var html = '';
        deposits.forEach(function (d) {
            var id = d.id;
            var amt = d.amount || 0;
            totalPending += amt;
            var time = d.createdAt ? new Date(d.createdAt).toLocaleString() : 'Unknown';
            var ocrHtml = '';
            if (d.ocr) {
                var ocr = d.ocr;
                var confPct = Math.round((ocr.confidence || 0) * 100);
                ocrHtml = '<div class="mt-2 rounded-lg bg-black/20 border border-white/5 p-2 space-y-1">' +
                    '<p class="text-[10px] text-gray-500 font-semibold">OCR Parsed (' + confPct + '% confidence)</p>' +
                    (ocr.status ? '<p class="text-[10px] text-gray-400">Status: <span class="' + (ocr.status === 'success' ? 'text-[#10B981]' : 'text-red-400') + '">' + escHtml(ocr.status) + '</span></p>' : '') +
                    (ocr.amount ? '<p class="text-[10px] text-gray-400">Amount: ' + escHtml(String(ocr.amount)) + ' ETB</p>' : '') +
                    (ocr.transactionRef ? '<p class="text-[10px] text-gray-400">Ref: <code>' + escHtml(ocr.transactionRef) + '</code></p>' : '') +
                    '</div>';
            }
            html += '<div class="glass rounded-xl p-4 mb-3 anim-slide border border-yellow-500/20">' +
                '<div class="flex flex-col sm:flex-row sm:items-start gap-3">' +
                '<div class="flex-1">' +
                '<div class="flex items-center gap-2 mb-1">' +
                '<span class="text-yellow-400 text-lg font-black">' + amt + ' ETB</span>' +
                '<span class="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold">PENDING</span>' +
                '</div>' +
                '<p class="text-xs text-gray-400">👤 ' + escHtml(d.firstName || 'Unknown') + ' (@' + escHtml(d.username || 'unknown') + ')</p>' +
                '<p class="text-xs text-gray-500">TXN: <code class="text-gray-400">' + escHtml(d.transactionId || 'N/A') + '</code></p>' +
                '<p class="text-xs text-gray-500">Sender: ' + escHtml(d.senderName || 'Unknown') + '</p>' +
                '<p class="text-xs text-gray-500">TeleBirr Name: ' + escHtml(d.telebirrName || 'N/A') + '</p>' +
                '<p class="text-[10px] text-gray-600 mt-1">🕐 ' + time + '</p>' +
                '<p class="text-[10px] text-gray-600">ID: <code class="text-gray-500">' + id.substring(0, 8) + '</code></p>' +
                ocrHtml +
                '</div>' +
                '<div class="flex sm:flex-col gap-2">' +
                '<button onclick="approveDeposit(\'' + id + '\')" class="btn-green-g px-4 py-2 rounded-lg text-xs font-bold text-white flex-1 sm:flex-none">✅ Approve</button>' +
                '<button onclick="rejectDeposit(\'' + id + '\')" class="btn-red-g px-4 py-2 rounded-lg text-xs font-bold text-white flex-1 sm:flex-none">❌ Reject</button>' +
                '</div>' +
                '</div>' +
                '</div>';
        });
        list.innerHTML = html;
    }).catch(function () {
        document.getElementById('payPendingList').innerHTML = '<div class="text-center py-4 text-red-400 text-sm">Failed to load deposits</div>';
    });

    // Approved count + total
    api('GET', '/api/admin/deposits?status=approved&limit=500').then(function (deposits) {
        document.getElementById('pay-approved-count').textContent = deposits.length;
        var total = deposits.reduce(function (s, d) { return s + (d.amount || 0); }, 0);
        document.getElementById('pay-total-amount').textContent = total.toFixed(0);
    });

    // Rejected count
    api('GET', '/api/admin/deposits?status=rejected&limit=500').then(function (deposits) {
        document.getElementById('pay-rejected-count').textContent = deposits.length;
    });

    // Processed deposits history
    api('GET', '/api/admin/deposits?limit=30').then(function (deposits) {
        var list = document.getElementById('payProcessedList');
        var items = deposits.filter(function (d) { return d.status !== 'pending'; }).slice(0, 10).map(function (d) {
            var emoji = d.status === 'approved' ? '✅' : '❌';
            var color = d.status === 'approved' ? 'text-green-400' : 'text-red-400';
            var bgColor = d.status === 'approved' ? 'border-green-500/20' : 'border-red-500/20';
            var time = d.createdAt ? new Date(d.createdAt).toLocaleString() : 'Unknown';
            return '<div class="glass rounded-xl p-3 mb-2 border ' + bgColor + '">' +
                '<div class="flex items-center justify-between">' +
                '<div><span class="' + color + ' font-bold">' + emoji + ' ' + (d.amount || 0) + ' ETB</span>' +
                '<span class="text-[10px] text-gray-500 ml-2">' + (d.firstName || 'Unknown') + '</span></div>' +
                '<span class="text-[10px] text-gray-600">' + time + '</span>' +
                '</div></div>';
        });
        list.innerHTML = items.length > 0 ? items.join('') : '<div class="text-center py-4 text-gray-600 text-sm">No processed deposits</div>';
    });

    // Pending withdrawals
    api('GET', '/api/admin/withdrawals?status=pending&limit=50').then(function (withdrawals) {
        var list = document.getElementById('withdrawPendingList');
        if (!withdrawals.length) {
            list.innerHTML = '<div class="text-center py-8"><div class="text-3xl mb-2">📭</div><p class="text-gray-500 text-sm">No pending withdrawals</p></div>';
            return;
        }
        var html = '';
        withdrawals.forEach(function (d) {
            var id = d.id;
            var amt = d.amount || 0;
            var time = d.createdAt ? new Date(d.createdAt).toLocaleString() : 'Unknown';
            html += '<div class="glass rounded-xl p-4 mb-3 anim-slide border border-orange-500/20">' +
                '<div class="flex flex-col sm:flex-row sm:items-start gap-3">' +
                '<div class="flex-1">' +
                '<div class="flex items-center gap-2 mb-1">' +
                '<span class="text-orange-400 text-lg font-black">' + amt + ' ETB</span>' +
                '<span class="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold">PENDING</span>' +
                '</div>' +
                '<p class="text-xs text-gray-400">👤 ' + escHtml(d.firstName || 'Unknown') + ' (@' + escHtml(d.username || 'unknown') + ')</p>' +
                '<p class="text-xs text-gray-500">Phone: <code class="text-gray-400">' + escHtml(d.phone || 'N/A') + '</code></p>' +
                '<p class="text-xs text-gray-500">TeleBirr Name: ' + escHtml(d.telebirrName || 'N/A') + '</p>' +
                '<p class="text-[10px] text-gray-600 mt-1">🕐 ' + time + '</p>' +
                '<p class="text-[10px] text-gray-600">ID: <code class="text-gray-500">' + id.substring(0, 8) + '</code></p>' +
                '</div>' +
                '<div class="flex sm:flex-col gap-2">' +
                '<button onclick="approveWithdrawal(\'' + id + '\')" class="btn-green-g px-4 py-2 rounded-lg text-xs font-bold text-white flex-1 sm:flex-none">✅ Approve</button>' +
                '<button onclick="rejectWithdrawal(\'' + id + '\')" class="btn-red-g px-4 py-2 rounded-lg text-xs font-bold text-white flex-1 sm:flex-none">❌ Reject</button>' +
                '</div>' +
                '</div>' +
                '</div>';
        });
        list.innerHTML = html;
    });

    // Processed withdrawals history
    api('GET', '/api/admin/withdrawals?limit=30').then(function (withdrawals) {
        var list = document.getElementById('withdrawProcessedList');
        var items = withdrawals.filter(function (d) { return d.status !== 'pending'; }).slice(0, 10).map(function (d) {
            var emoji = d.status === 'approved' ? '✅' : '❌';
            var color = d.status === 'approved' ? 'text-green-400' : 'text-red-400';
            var bgColor = d.status === 'approved' ? 'border-green-500/20' : 'border-red-500/20';
            var time = d.createdAt ? new Date(d.createdAt).toLocaleString() : 'Unknown';
            return '<div class="glass rounded-xl p-3 mb-2 border ' + bgColor + '">' +
                '<div class="flex items-center justify-between">' +
                '<div><span class="' + color + ' font-bold">' + emoji + ' ' + (d.amount || 0) + ' ETB</span>' +
                '<span class="text-[10px] text-gray-500 ml-2">' + (d.firstName || 'Unknown') + '</span>' +
                '<span class="text-[10px] text-gray-600 ml-2">📞 ' + (d.phone || 'N/A') + '</span></div>' +
                '<span class="text-[10px] text-gray-600">' + time + '</span>' +
                '</div></div>';
        });
        list.innerHTML = items.length > 0 ? items.join('') : '<div class="text-center py-4 text-gray-600 text-sm">No processed withdrawals</div>';
    });
}

function approveDeposit(id) {
    var note = '';
    if (!confirm('Approve this deposit?')) return;
    api('POST', '/api/admin/deposits/' + id + '/approve', { note: note })
        .then(function (res) {
            showToast('✅ Deposit approved! ' + res.amount + ' ETB added.', 'success');
            loadPayments();
        })
        .catch(function (e) { alert('Error: ' + e.message); });
}

function rejectDeposit(id) {
    var note = prompt('Reason for rejection (optional):', '');
    if (note === null) return;
    api('POST', '/api/admin/deposits/' + id + '/reject', { note: note })
        .then(function () { showToast('❌ Deposit rejected.', 'info'); loadPayments(); })
        .catch(function (e) { alert('Error: ' + e.message); });
}

function approveWithdrawal(id) {
    if (!confirm('Approve this withdrawal?')) return;
    api('POST', '/api/admin/withdrawals/' + id + '/approve', { note: '' })
        .then(function (res) {
            showToast('✅ Withdrawal approved! ' + res.amount + ' ETB deducted.', 'success');
            loadPayments();
        })
        .catch(function (e) { alert('Error: ' + e.message); });
}

function rejectWithdrawal(id) {
    var note = prompt('Reason for rejection (optional):', '');
    if (note === null) return;
    api('POST', '/api/admin/withdrawals/' + id + '/reject', { note: note })
        .then(function () { showToast('❌ Withdrawal rejected & refunded.', 'info'); loadPayments(); })
        .catch(function (e) { alert('Error: ' + e.message); });
}
