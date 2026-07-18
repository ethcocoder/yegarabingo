// ==================== INIT ====================
var appReady = false;

document.addEventListener('DOMContentLoaded', async function() {
    restoreAudioSettings();
    
    if (window.PageLoader) {
        await PageLoader.initComponents();
    }
    
    if (window.PageLoader) {
        await PageLoader.loadPage('home');
    }
    
    await initUser();
    appReady = true;
});

document.addEventListener('pageLoaded', function(e) {
    var screen = e.detail.screen;
    
    if (screen === 'home' || screen === 'wallet' || screen === 'profile') {
        if (currentUser && typeof updateAllDisplays === 'function') {
            updateAllDisplays();
        }
    }
});
