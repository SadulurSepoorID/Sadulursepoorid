let cropper; 
let newFotoUrl = ""; 
let idleTimer; 
const IDLE_LIMIT = 2 * 60 * 1000; 

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('user_session')) { window.location.replace("../login/index.html"); return; }
    try { window.currentUser = JSON.parse(localStorage.getItem('user_session')); } catch (e) { logoutLocal(); return; }
    initDashboard();
    setupAutoLogout();     
    setTimeout(setupBackButtonBlocker, 500);
});

function initDashboard() {
    const dateEl = document.getElementById('date-display');
    if (dateEl) { const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }; dateEl.innerText = new Date().toLocaleDateString('id-ID', options); }
    const greetEl = document.getElementById('greet-msg');
    if (greetEl) { const h = new Date().getHours(); greetEl.innerText = (h<12?"Selamat Pagi":h<15?"Selamat Siang":h<18?"Selamat Sore":"Selamat Malam") + ","; }
    updateUI(window.currentUser);
    fetchUserData(); 
    fetchDashboardStats();
}

function updateUI(user) {
    if (!user) return;
    const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };
    setText('top-nama', user.nama);
    setText('top-jabatan', user.jabatan || "Anggota");
    setText('stat-nia', user.nia || window.currentUser.nia);
    const avatarUrl = user.foto && user.foto.length > 5 ? user.foto : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=0056b3&color=fff`;
    if(document.getElementById('top-avatar')) document.getElementById('top-avatar').src = avatarUrl;
    if(document.getElementById('edit-avatar-preview')) document.getElementById('edit-avatar-preview').src = avatarUrl;
    document.getElementById('edit-nama').value = user.nama;

    const menuGrid = document.querySelector('.menu-grid');
    if(!menuGrid) return;
    
    // Reset Default Menu
    menuGrid.innerHTML = `
        <a href="../presensi/index.html" class="menu-card"><i class="fa-solid fa-qrcode"></i><span>Scan Presensi</span></a>
        <a href="../jadwal/index.html" class="menu-card"><i class="fa-solid fa-calendar-check"></i><span>Jadwal Terdekat</span></a>
        <a href="../anggota/index.html" class="menu-card"><i class="fa-solid fa-user-group"></i><span>Cari Anggota</span></a>
        <a href="../iuran/index.html" class="menu-card"><i class="fa-solid fa-file-invoice"></i><span>Iuran Kas</span></a>
    `;

    const role = (user.jabatan || "").toLowerCase().trim();
    if (role !== 'anggota') {
        if ((role.includes('ketua') || role.includes('msdm') || role.includes('sdm'))) {
            menuGrid.innerHTML = `<a href="../msdm/index.html" class="menu-card" style="background:#f3e5f5; color:#6a1b9a; border:1px solid #e1bee7"><i class="fa-solid fa-users-gear"></i><span>Panel MSDM</span></a>` + menuGrid.innerHTML;
        }
        if (role.includes('bendahara')) {
            menuGrid.innerHTML = `<a href="../bendahara/index.html" class="menu-card" style="background:#fff3e0; color:#e65100; border:1px solid #ffe0b2"><i class="fa-solid fa-vault"></i><span>Panel Bendahara</span></a>` + menuGrid.innerHTML;
        }
    }
}

async function fetchDashboardStats() {
    const statHadir = document.getElementById('stat-kehadiran');
    const statPoin = document.getElementById('stat-poin');
    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'get_dashboard_stats', nia: window.currentUser.nia })
        });
        const data = await response.json();
        if (data.status) {
            if (statHadir) statHadir.innerHTML = `<span style="font-size:1.1rem; font-weight:700">${data.user_hadir}</span> <span style="font-size:0.8rem; color:#666">/ ${data.total_kegiatan} Kegiatan</span>`;
            if (statPoin) {
                const poin = data.poin !== undefined ? data.poin : 100;
                statPoin.innerText = poin + " Poin";
                statPoin.style.color = poin < 100 ? "#d32f2f" : "#2e7d32";
            }
        }
    } catch (e) { console.log(e); }
}

// --- LOGIKA RIWAYAT POIN ---
function openPoinHistory() {
    document.getElementById('poin-modal').classList.remove('hidden');
    fetchPoinHistory();
}
function closePoinModal() { document.getElementById('poin-modal').classList.add('hidden'); }

async function fetchPoinHistory() {
    const list = document.getElementById('poin-history-list');
    list.innerHTML = '<p style="text-align:center; color:#666;"><i class="fa-solid fa-spinner fa-spin"></i> Memuat...</p>';
    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'get_sanction_history', nia: window.currentUser.nia })
        });
        const data = await response.json();
        if (data.status && data.history.length > 0) {
            let html = '<div style="display:flex; flex-direction:column; gap:10px;">';
            data.history.forEach(item => {
                const isViolation = item.raw_poin > 0;
                const bg = isViolation ? '#ffebee' : '#e8f5e9';
                const icon = isViolation ? '<i class="fa-solid fa-circle-exclamation" style="color:#d32f2f"></i>' : '<i class="fa-solid fa-gift" style="color:#2e7d32"></i>';
                const op = isViolation ? '-' : '+';
                const color = isViolation ? '#d32f2f' : '#2e7d32';
                
                html += `
                <div style="background:${bg}; padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:10px; align-items:center;">
                        <div style="font-size:1.2rem;">${icon}</div>
                        <div>
                            <div style="font-weight:600; font-size:0.9rem; color:#333;">${item.masalah}</div>
                            <div style="font-size:0.75rem; color:#666;">${item.tanggal}</div>
                        </div>
                    </div>
                    <div style="font-weight:bold; font-size:1rem; color:${color};">${op}${item.poin}</div>
                </div>`;
            });
            html += '</div>';
            list.innerHTML = html;
        } else {
            list.innerHTML = `<div style="text-align:center; padding:20px; color:#888;"><i class="fa-solid fa-check-circle" style="font-size:3rem; margin-bottom:10px; color:#c8e6c9;"></i><p>Riwayat bersih!</p></div>`;
        }
    } catch (e) { list.innerHTML = "Gagal memuat data."; }
}

// --- FUNGSI STANDAR LAINNYA (Logout, Crop, dll tetap sama) ---
async function fetchUserData() { /* ... kode sama ... */ }
function setupAutoLogout() { /* ... kode sama ... */ }
async function logout() { /* ... kode sama ... */ }
function logoutLocal() { localStorage.removeItem('user_session'); window.location.replace("../login/index.html"); }
function openEditModal() { document.getElementById('edit-modal').classList.remove('hidden'); }
function closeEditModal() { document.getElementById('edit-modal').classList.add('hidden'); }
function handleFileSelect(e) { /* ... kode sama ... */ }
function closeCropModal() { /* ... kode sama ... */ }
async function cropAndUpload() { /* ... kode sama ... */ }
async function saveProfile() { /* ... kode sama ... */ }
function toggleSidebar() { document.getElementById('mySidebar').classList.toggle('active'); document.getElementById('sidebar-overlay').classList.toggle('active'); }
function setupBackButtonBlocker() { history.pushState(null, document.title, location.href); window.addEventListener('popstate', function (event) { history.pushState(null, document.title, location.href); }); }