// ==================== FIRESTORE LISTENERS ====================
db.collection('users').onSnapshot(function (snap) {
    allUsers = [];
    snap.forEach(function (doc) {
        var data = doc.data();
        data._docId = doc.id;
        allUsers.push(data);
    });
    renderUsersTable();
    processDashboardData();
}, function (err) {
    console.error('Users snapshot error:', err);
});

db.collection('rounds').onSnapshot(function (snap) {
    allRounds = [];
    snap.forEach(function (doc) {
        var data = doc.data();
        data.id = doc.id;
        allRounds.push(data);
    });
    processDashboardData();
    renderGames();
    updateReports();
}, function (err) {
    console.error('Rounds snapshot error:', err);
});
