// ==================== FIRESTORE LISTENERS ====================
var _usersRenderTimer = null;
db.collection('users').onSnapshot(function (snap) {
    allUsers = [];
    snap.forEach(function (doc) {
        allUsers.push(Object.assign({}, doc.data(), { _docId: doc.id }));
    });
    if (_usersRenderTimer) clearTimeout(_usersRenderTimer);
    _usersRenderTimer = setTimeout(function() {
        renderUsersTable();
        processDashboardData();
        _usersRenderTimer = null;
    }, 200);
}, function (err) {
    console.error('Users snapshot error:', err);
});

var _roundsRenderTimer = null;
db.collection('rounds').onSnapshot(function (snap) {
    allRounds = [];
    snap.forEach(function (doc) {
        allRounds.push(Object.assign({}, doc.data(), { id: doc.id }));
    });
    if (_roundsRenderTimer) clearTimeout(_roundsRenderTimer);
    _roundsRenderTimer = setTimeout(function() {
        processDashboardData();
        renderGames();
        updateReports();
        _roundsRenderTimer = null;
    }, 200);
}, function (err) {
    console.error('Rounds snapshot error:', err);
});

var _depositsRenderTimer = null;
db.collection('deposits').onSnapshot(function (snap) {
    allDeposits = [];
    snap.forEach(function (doc) {
        allDeposits.push(Object.assign({}, doc.data(), { id: doc.id }));
    });
    if (_depositsRenderTimer) clearTimeout(_depositsRenderTimer);
    _depositsRenderTimer = setTimeout(function() {
        renderPayments();
        _depositsRenderTimer = null;
    }, 500);
}, function (err) {
    console.error('Deposits snapshot error:', err);
});

var _withdrawalsRenderTimer = null;
db.collection('withdrawals').onSnapshot(function (snap) {
    allWithdrawals = [];
    snap.forEach(function (doc) {
        allWithdrawals.push(Object.assign({}, doc.data(), { id: doc.id }));
    });
    if (_withdrawalsRenderTimer) clearTimeout(_withdrawalsRenderTimer);
    _withdrawalsRenderTimer = setTimeout(function() {
        renderPayments();
        _withdrawalsRenderTimer = null;
    }, 500);
}, function (err) {
    console.error('Withdrawals snapshot error:', err);
});

db.collection('system').doc('admin_status').onSnapshot(function (snap) {
    if (snap.exists) {
        adminOnline = snap.data().online || false;
        updateAdminStatusUI();
    }
}, function (err) {
    console.warn('Admin status snapshot error:', err);
});
