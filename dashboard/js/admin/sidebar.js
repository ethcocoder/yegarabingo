// ==================== SIDEBAR ====================
function toggleSidebar() {
    var sb = document.getElementById('sidebar');
    var mc = document.getElementById('mainContent');
    var icon = document.getElementById('collapseIcon');
    sidebarCollapsed = !sidebarCollapsed;
    if (sidebarCollapsed) {
        sb.style.width = '70px';
        mc.style.marginLeft = '70px';
        icon.style.transform = 'rotate(180deg)';
        sb.querySelectorAll('.nav-label').forEach(function (el) { el.style.opacity = '0'; el.style.width = '0'; el.style.overflow = 'hidden'; });
        sb.querySelectorAll('.sidebar-header-text').forEach(function (el) { el.style.opacity = '0'; el.style.width = '0'; el.style.overflow = 'hidden'; });
        sb.querySelectorAll('.sidebar-user-text').forEach(function (el) { el.style.opacity = '0'; el.style.width = '0'; el.style.overflow = 'hidden'; });
    } else {
        sb.style.width = '250px';
        mc.style.marginLeft = '250px';
        icon.style.transform = 'rotate(0deg)';
        sb.querySelectorAll('.nav-label').forEach(function (el) { el.style.opacity = '1'; el.style.width = ''; el.style.overflow = ''; });
        sb.querySelectorAll('.sidebar-header-text').forEach(function (el) { el.style.opacity = '1'; el.style.width = ''; el.style.overflow = ''; });
        sb.querySelectorAll('.sidebar-user-text').forEach(function (el) { el.style.opacity = '1'; el.style.width = ''; el.style.overflow = ''; });
    }
}

function toggleMobileSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
}

// ==================== USER DROPDOWN ====================
function toggleUserDropdown() {
    document.getElementById('userDropdown').classList.toggle('hidden');
}
document.addEventListener('click', function (e) {
    var wrap = document.getElementById('userDropdownWrap');
    if (wrap && !wrap.contains(e.target)) {
        document.getElementById('userDropdown').classList.add('hidden');
    }
});

// ==================== RESPONSIVE ====================
window.addEventListener('resize', function () {
    if (window.innerWidth >= 768 && !sidebarCollapsed) {
        document.getElementById('mainContent').style.marginLeft = '250px';
    } else if (window.innerWidth >= 768 && sidebarCollapsed) {
        document.getElementById('mainContent').style.marginLeft = '70px';
    } else {
        document.getElementById('mainContent').style.marginLeft = '0';
    }
});
