// ==================== PAYMENTS ====================
function toggleAdminOnline() {
    adminOnline = !adminOnline;
    db.collection('system').doc('admin_status').set({
        online: adminOnline,
        updatedAt: new Date()
    }).then(function () {
        updateAdminStatusUI();
        loadPayments();
    });
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
    db.collection('system').doc('admin_status').get().then(function (doc) {
        if (doc.exists) {
            adminOnline = doc.data().online || false;
        }
        updateAdminStatusUI();
    });

    db.collection('deposits').where('status', '==', 'pending').orderBy('createdAt', 'desc').get().then(function (snap) {
        var list = document.getElementById('payPendingList');
        document.getElementById('pay-pending-count').textContent = snap.size;
        if (snap.empty) {
            list.innerHTML = '<div class="text-center py-8"><div class="text-3xl mb-2">📭</div><p class="text-gray-500 text-sm">No pending deposits</p></div>';
            return;
        }
        var totalPending = 0;
        var html = '';
        snap.forEach(function (doc) {
            var d = doc.data();
            var id = doc.id;
            var amt = d.amount || 0;
            totalPending += amt;
            var time = d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : new Date(d.createdAt).toLocaleString()) : 'Unknown';
            var imgHtml = '';
            if (d.imageFileId) {
                var payBotToken = '8801537534:AAEi3UflU4TRCJ10TRlqxMSAF3l7RS4-vYc';
                imgHtml = '<div class="mt-3 rounded-lg overflow-hidden border border-white/10 bg-black/30 p-1"><img src="https://api.telegram.org/file/bot' + payBotToken + '/photos/' + d.imageFileId + '" alt="Screenshot" class="rounded-lg w-full max-h-48 object-contain cursor-pointer" onclick="window.open(this.src,\'_blank\')" onerror="this.parentElement.innerHTML=\'<div class=\\\'text-gray-600 text-xs text-center py-4\\\'>Image available via bot</div>\'" /></div>';
            }
            var ocrHtml = '';
            if (d.ocr) {
                var ocr = d.ocr;
                var confPct = Math.round((ocr.confidence || 0) * 100);
                ocrHtml = '<div class="mt-2 rounded-lg bg-black/20 border border-white/5 p-2 space-y-1">' +
                    '<p class="text-[10px] text-gray-500 font-semibold">OCR Parsed (' + confPct + '% confidence)</p>' +
                    (ocr.status ? '<p class="text-[10px] text-gray-400">Status: <span class="' + (ocr.status === 'success' ? 'text-[#10B981]' : 'text-red-400') + '">' + escHtml(ocr.status) + '</span></p>' : '') +
                    (ocr.amount ? '<p class="text-[10px] text-gray-400">Amount: ' + escHtml(String(ocr.amount)) + ' ETB</p>' : '') +
                    (ocr.transactionDate ? '<p class="text-[10px] text-gray-400">Date: ' + escHtml(ocr.transactionDate) + '</p>' : '') +
                    (ocr.transactionType ? '<p class="text-[10px] text-gray-400">Type: ' + escHtml(ocr.transactionType) + '</p>' : '') +
                    (ocr.receiverName ? '<p class="text-[10px] text-gray-400">Receiver: ' + escHtml(ocr.receiverName) + '</p>' : '') +
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
                imgHtml +
                '</div>' +
                '<div class="flex sm:flex-col gap-2">' +
                '<button onclick="approveDeposit(\'' + id + '\')" class="btn-green-g px-4 py-2 rounded-lg text-xs font-bold text-white flex-1 sm:flex-none">✅ Approve</button>' +
                '<button onclick="rejectDeposit(\'' + id + '\')" class="btn-red-g px-4 py-2 rounded-lg text-xs font-bold text-white flex-1 sm:flex-none">❌ Reject</button>' +
                '</div>' +
                '</div>' +
                '</div>';
        });
        list.innerHTML = html;
    });

    db.collection('deposits').where('status', '==', 'approved').get().then(function (snap) {
        document.getElementById('pay-approved-count').textContent = snap.size;
        var total = 0;
        snap.forEach(function (d) { total += (d.data().amount || 0); });
        document.getElementById('pay-total-amount').textContent = total.toFixed(0);
    });

    db.collection('deposits').where('status', '==', 'rejected').get().then(function (snap) {
        document.getElementById('pay-rejected-count').textContent = snap.size;
    });

    db.collection('deposits').orderBy('createdAt', 'desc').limit(10).get().then(function (snap) {
        var list = document.getElementById('payProcessedList');
        var items = [];
        snap.forEach(function (doc) {
            var d = doc.data();
            if (d.status === 'pending') return;
            var emoji = d.status === 'approved' ? '✅' : '❌';
            var color = d.status === 'approved' ? 'text-green-400' : 'text-red-400';
            var bgColor = d.status === 'approved' ? 'border-green-500/20' : 'border-red-500/20';
            var time = d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : new Date(d.createdAt).toLocaleString()) : 'Unknown';
            items.push(
                '<div class="glass rounded-xl p-3 mb-2 border ' + bgColor + '">' +
                '<div class="flex items-center justify-between">' +
                '<div>' +
                '<span class="' + color + ' font-bold">' + emoji + ' ' + (d.amount || 0) + ' ETB</span>' +
                '<span class="text-[10px] text-gray-500 ml-2">' + (d.firstName || 'Unknown') + '</span>' +
                '</div>' +
                '<span class="text-[10px] text-gray-600">' + time + '</span>' +
                '</div>' +
                '</div>'
            );
        });
        list.innerHTML = items.length > 0 ? items.join('') : '<div class="text-center py-4 text-gray-600 text-sm">No processed deposits</div>';
    });

    db.collection('withdrawals').where('status', '==', 'pending').orderBy('createdAt', 'desc').get().then(function (snap) {
        var list = document.getElementById('withdrawPendingList');
        if (snap.empty) {
            list.innerHTML = '<div class="text-center py-8"><div class="text-3xl mb-2">📭</div><p class="text-gray-500 text-sm">No pending withdrawals</p></div>';
            return;
        }
        var html = '';
        snap.forEach(function (doc) {
            var d = doc.data();
            var id = doc.id;
            var amt = d.amount || 0;
            var time = d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : new Date(d.createdAt).toLocaleString()) : 'Unknown';
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

    db.collection('withdrawals').orderBy('createdAt', 'desc').limit(10).get().then(function (snap) {
        var list = document.getElementById('withdrawProcessedList');
        var items = [];
        snap.forEach(function (doc) {
            var d = doc.data();
            if (d.status === 'pending') return;
            var emoji = d.status === 'approved' ? '✅' : '❌';
            var color = d.status === 'approved' ? 'text-green-400' : 'text-red-400';
            var bgColor = d.status === 'approved' ? 'border-green-500/20' : 'border-red-500/20';
            var time = d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : new Date(d.createdAt).toLocaleString()) : 'Unknown';
            items.push(
                '<div class="glass rounded-xl p-3 mb-2 border ' + bgColor + '">' +
                '<div class="flex items-center justify-between">' +
                '<div>' +
                '<span class="' + color + ' font-bold">' + emoji + ' ' + (d.amount || 0) + ' ETB</span>' +
                '<span class="text-[10px] text-gray-500 ml-2">' + (d.firstName || 'Unknown') + '</span>' +
                '<span class="text-[10px] text-gray-600 ml-2">📞 ' + (d.phone || 'N/A') + '</span>' +
                '</div>' +
                '<span class="text-[10px] text-gray-600">' + time + '</span>' +
                '</div>' +
                '</div>'
            );
        });
        list.innerHTML = items.length > 0 ? items.join('') : '<div class="text-center py-4 text-gray-600 text-sm">No processed withdrawals</div>';
    });
}

function approveDeposit(id) {
    var depRef = db.collection('deposits').doc(id);
    db.runTransaction(function (transaction) {
        return transaction.get(depRef).then(function (doc) {
            if (!doc.exists) throw new Error('Deposit not found.');
            var d = doc.data();
            if (d.status !== 'pending') throw new Error('Deposit already ' + d.status + '.');
            var userId = String(d.userId);
            var amount = d.amount || 0;
            var userRef = db.collection('users').doc(userId);
            return transaction.get(userRef).then(function (userDoc) {
                if (!userDoc.exists) throw new Error('User not found.');
                transaction.update(depRef, {
                    status: 'approved',
                    processedAt: new Date(),
                    adminNote: 'Approved by admin'
                });
                transaction.update(userRef, {
                    balance: firebase.firestore.FieldValue.increment(amount),
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
                return { userId: userId, amount: amount };
            });
        });
    }).then(function (result) {
        fetch(API_BASE + '/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: parseInt(result.userId),
                text: '✅ Deposit approved!\n💰 ' + result.amount + ' ETB has been added to your wallet.'
            })
        }).catch(console.error);
        loadPayments();
        alert('Deposit approved! ' + result.amount + ' ETB added to user balance.');
    }).catch(function (e) {
        console.error(e);
        alert('Error: ' + e.message);
    });
}

function rejectDeposit(id) {
    db.collection('deposits').doc(id).get().then(function (doc) {
        if (!doc.exists) return alert('Deposit not found.');
        var d = doc.data();
        if (d.status !== 'pending') return alert('Deposit already ' + d.status + '.');
        var note = prompt('Reason for rejection (optional):', '');
        if (note === null) return;
        db.collection('deposits').doc(id).update({
            status: 'rejected',
            processedAt: new Date(),
            adminNote: note || 'Rejected by admin'
        }).then(function () {
            fetch(API_BASE + '/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: parseInt(d.userId),
                    text: '❌ Deposit rejected.\nReason: ' + (note || 'Rejected by admin') + '\nPlease contact support if you need help.'
                })
            }).catch(console.error);
            loadPayments();
            alert('Deposit rejected.');
        }).catch(function (e) {
            console.error(e);
            alert('Error rejecting deposit.');
        });
    });
}

function approveWithdrawal(id) {
    db.collection('withdrawals').doc(id).get().then(function (doc) {
        if (!doc.exists) return alert('Withdrawal not found.');
        var d = doc.data();
        if (d.status !== 'pending') return alert('Withdrawal already ' + d.status + '.');
        var userId = String(d.userId);
        var amount = d.amount || 0;
        var userRef = db.collection('users').doc(userId);
        db.runTransaction(function (transaction) {
            return transaction.get(userRef).then(function (userDoc) {
                if (!userDoc.exists) throw new Error('User not found');
                var bal = userDoc.data().balance || 0;
                if (bal < amount) throw new Error('Insufficient balance: ' + bal + ' ETB');
                transaction.update(userRef, {
                    balance: firebase.firestore.FieldValue.increment(-amount),
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
                transaction.update(doc.ref, {
                    status: 'approved',
                    processedAt: new Date(),
                    adminNote: 'Approved by admin'
                });
            });
        }).then(function () {
            fetch(API_BASE + '/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: parseInt(userId),
                    text: '✅ Withdrawal approved!\n💸 ' + amount + ' ETB will be sent to your TeleBirr account.'
                })
            }).catch(console.error);
            loadPayments();
            alert('Withdrawal approved! ' + amount + ' ETB deducted from user.');
        }).catch(function (e) {
            console.error(e);
            alert('Error: ' + e.message);
        });
    });
}

function rejectWithdrawal(id) {
    db.collection('withdrawals').doc(id).get().then(function (doc) {
        if (!doc.exists) return alert('Withdrawal not found.');
        var d = doc.data();
        if (d.status !== 'pending') return alert('Withdrawal already ' + d.status + '.');
        var userId = String(d.userId);
        var amount = d.amount || 0;
        var note = prompt('Reason for rejection (optional):', '');
        if (note === null) return;
        var userRef = db.collection('users').doc(userId);
        db.runTransaction(function (transaction) {
            return transaction.get(userRef).then(function (userDoc) {
                transaction.update(userRef, {
                    balance: firebase.firestore.FieldValue.increment(amount),
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
                transaction.update(doc.ref, {
                    status: 'rejected',
                    processedAt: new Date(),
                    adminNote: note || 'Rejected by admin'
                });
            });
        }).then(function () {
            fetch(API_BASE + '/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: parseInt(userId),
                    text: '❌ Withdrawal rejected.\nAmount ' + amount + ' ETB has been refunded to your wallet.\nReason: ' + (note || 'Rejected by admin')
                })
            }).catch(console.error);
            loadPayments();
            alert('Withdrawal rejected. ' + amount + ' ETB refunded.');
        }).catch(function (e) {
            console.error(e);
            alert('Error rejecting withdrawal.');
        });
    });
}
