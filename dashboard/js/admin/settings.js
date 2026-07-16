// ==================== SETTINGS ====================
function saveSettings() {
    var stake = 10;
    var inputs = document.querySelectorAll('#section-settings input[type="number"]');
    if (inputs.length > 0) stake = parseInt(inputs[0].value) || 10;
    var maintenance = document.getElementById('maintenanceToggle') && document.getElementById('maintenanceToggle').classList.contains('on');
    db.collection('settings').doc('game').set({
        stake: stake,
        maintenance: maintenance,
        updatedAt: new Date()
    }).then(function () {
        alert('Settings saved!');
    }).catch(function (e) {
        console.error(e);
        alert('Error saving settings.');
    });
}

function changeAdminPassword() {
    var curPw = document.getElementById('settingsCurrentPw').value.trim();
    var newPw = document.getElementById('settingsNewPw').value.trim();
    var confirmPw = document.getElementById('settingsConfirmPw').value.trim();
    var msgEl = document.getElementById('settingsPwMsg');

    if (!curPw || !newPw || !confirmPw) {
        msgEl.textContent = 'All fields are required';
        msgEl.className = 'text-sm rounded-xl px-4 py-3 bg-red-500/10 text-red-400 border border-red-500/20';
        msgEl.classList.remove('hidden');
        return;
    }
    if (newPw !== confirmPw) {
        msgEl.textContent = 'New passwords do not match';
        msgEl.className = 'text-sm rounded-xl px-4 py-3 bg-red-500/10 text-red-400 border border-red-500/20';
        msgEl.classList.remove('hidden');
        return;
    }
    if (newPw.length < 6) {
        msgEl.textContent = 'Password must be at least 6 characters';
        msgEl.className = 'text-sm rounded-xl px-4 py-3 bg-red-500/10 text-red-400 border border-red-500/20';
        msgEl.classList.remove('hidden');
        return;
    }

    var username = localStorage.getItem('username');
    db.collection('admins').where('username', '==', username).limit(1).get()
        .then(function (snap) {
            if (snap.empty) {
                msgEl.textContent = 'Admin not found';
                msgEl.className = 'text-sm rounded-xl px-4 py-3 bg-red-500/10 text-red-400 border border-red-500/20';
                msgEl.classList.remove('hidden');
                return;
            }
            var doc = snap.docs[0];
            if (doc.data().password !== curPw) {
                msgEl.textContent = 'Current password is incorrect';
                msgEl.className = 'text-sm rounded-xl px-4 py-3 bg-red-500/10 text-red-400 border border-red-500/20';
                msgEl.classList.remove('hidden');
                return;
            }
            return doc.ref.update({ password: newPw });
        })
        .then(function () {
            if (msgEl.classList.contains('hidden') || (!msgEl.textContent.includes('incorrect') && !msgEl.textContent.includes('not found'))) {
                msgEl.textContent = 'Password updated!';
                msgEl.className = 'text-sm rounded-xl px-4 py-3 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20';
                msgEl.classList.remove('hidden');
                document.getElementById('settingsCurrentPw').value = '';
                document.getElementById('settingsNewPw').value = '';
                document.getElementById('settingsConfirmPw').value = '';
                setTimeout(function () { msgEl.classList.add('hidden'); }, 2000);
            }
        })
        .catch(function (e) {
            console.error(e);
            msgEl.textContent = 'Error: ' + e.message;
            msgEl.className = 'text-sm rounded-xl px-4 py-3 bg-red-500/10 text-red-400 border border-red-500/20';
            msgEl.classList.remove('hidden');
        });
}
