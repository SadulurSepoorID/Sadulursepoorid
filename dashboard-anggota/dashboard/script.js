let cropper; 
let newFotoUrl = ""; 
let isPhotoDeleted = false; 
let idleTimer; 
const IDLE_LIMIT = 5 * 60 * 1000; 

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('user_session')) { 
        window.location.replace("../login/index.html"); 
        return; 
    }
    try { 
        window.currentUser = JSON.parse(localStorage.getItem('user_session')); 
    } catch (e) { 
        logoutLocal(); 
        return; 
    }

    initDashboard();
    setupAutoLogout();     
    setTimeout(setupBackButtonBlocker, 500);
});

function initDashboard() {
    const dateEl = document.getElementById('date-display');
    if (dateEl) { 
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }; 
        dateEl.innerText = new Date().toLocaleDateString('id-ID', options); 
    }
    const greetEl = document.getElementById('greet-msg');
    if (greetEl) { 
        const h = new Date().getHours(); 
        greetEl.innerText = (h<11?"Selamat Pagi":h<15?"Selamat Siang":h<18?"Selamat Sore":"Selamat Malam") + ","; 
    }
    
    updateUI(window.currentUser); 
    fetchUserData(); 
    fetchDashboardStats(); 
    fetchRewardStatus(); // Fetch status poin reward langsung saat load
}

function updateUI(user) {
    if (!user) return;
    const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };
    
    setText('top-nama', user.nama);
    setText('top-jabatan', user.jabatan || "Anggota");
    setText('stat-nia', user.nia || window.currentUser.nia);
    
    let avatarUrl = "";
    if (user.foto && user.foto.length > 5) {
        if (user.foto.includes("drive.google.com") || user.foto.includes("open?id=")) {
            const idMatch = user.foto.match(/[-\w]{25,}/);
            avatarUrl = idMatch ? `https://lh3.googleusercontent.com/d/$$${idMatch[0]}` : user.foto;
        } else {
            avatarUrl = user.foto;
        }
    } else {
        avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=0056b3&color=fff`;
    }

    if(document.getElementById('top-avatar')) document.getElementById('top-avatar').src = avatarUrl;
    if(document.getElementById('edit-avatar-preview')) document.getElementById('edit-avatar-preview').src = avatarUrl;
    if(document.getElementById('edit-nama')) document.getElementById('edit-nama').value = user.nama;

    const menuGrid = document.querySelector('.menu-grid');
    if(!menuGrid) return;
    
    menuGrid.innerHTML = `
        <a href="../shop/index.html" class="menu-card" style="background: linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%); border: 1px solid #bbdefb;">
            <i class="fa-solid fa-shirt" style="color: #1565c0;"></i>
            <span style="color: #0d47a1;">Merchandise</span>
        </a>
        <a href="../presensi/index.html" class="menu-card"><i class="fa-solid fa-qrcode"></i><span>Scan Presensi</span></a>
        <a href="../jadwal/index.html" class="menu-card"><i class="fa-solid fa-calendar-check"></i><span>Jadwal Terdekat</span></a>
        <a href="../anggota/index.html" class="menu-card"><i class="fa-solid fa-user-group"></i><span>Cari Anggota</span></a>
        <a href="../iuran/index.html" class="menu-card"><i class="fa-solid fa-file-invoice"></i><span>Iuran Kas</span></a>
    `;

    const role = (user.jabatan || "").toLowerCase().trim();
    if (role !== 'anggota') {
        if ((role.includes('ketua') || role.includes('msdm') || role.includes('sdm'))) {
            menuGrid.innerHTML += `<a href="../msdm/index.html" class="menu-card" style="background:#f3e5f5; color:#6a1b9a; border:1px solid #e1bee7"><i class="fa-solid fa-users-gear"></i><span>Panel MSDM</span></a>`;
        }
        if (role.includes('bendahara') || role.includes('ketua')) {
            menuGrid.innerHTML += `<a href="../bendahara/index.html" class="menu-card" style="background:#fff3e0; color:#e65100; border:1px solid #ffe0b2"><i class="fa-solid fa-vault"></i><span>Panel Bendahara</span></a>`;
        }
        if (role.includes('ketua')) {
            menuGrid.innerHTML += `<a href="../reward_admin/index.html" class="menu-card" style="background:#fffde7; color:#f57f17; border:1px solid #fff59d"><i class="fa-solid fa-gifts"></i><span>Kelola Reward</span></a>`;
        }
    }
}

async function fetchUserData() { 
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'get_profile', nia: window.currentUser.nia }) });
        const data = await response.json();
        if (data.status) { const updated = { ...window.currentUser, ...data }; localStorage.setItem('user_session', JSON.stringify(updated)); updateUI(updated); }
    } catch (e) {}
}

async function fetchDashboardStats() {
    const statHadir = document.getElementById('stat-kehadiran'); const statPoin = document.getElementById('stat-poin');
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'get_dashboard_stats', nia: window.currentUser.nia }) });
        const data = await response.json();
        if (data.status) {
            if (statHadir) statHadir.innerHTML = `<span style="font-size:1.1rem; font-weight:700">${data.user_hadir}</span> <span style="font-size:0.8rem; color:#666">/ ${data.total_kegiatan} Kegiatan</span>`;
            if (statPoin) { const p = data.poin !== undefined ? data.poin : 100; statPoin.innerText = p + " Poin"; statPoin.style.color = p < 100 ? "#d32f2f" : "#2e7d32"; }
        }
    } catch (e) { if(statHadir) statHadir.innerText = "-"; if(statPoin) statPoin.innerText = "-"; }
}

function openPoinHistory() { document.getElementById('poin-modal').classList.remove('hidden'); fetchPoinHistory(); }
function closePoinModal() { document.getElementById('poin-modal').classList.add('hidden'); }

async function fetchPoinHistory() { 
    const list = document.getElementById('poin-history-list'); list.innerHTML = 'Memuat...';
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'get_sanction_history', nia: window.currentUser.nia }) });
        const data = await response.json();
        if (data.status && data.history.length > 0) {
            let html = '<div style="display:flex; flex-direction:column; gap:10px;">';
            data.history.forEach(i => { const isV = i.raw_poin > 0; html += `<div style="background:${isV?'#ffebee':'#e8f5e9'}; padding:12px; border-radius:8px;">${i.masalah} (${isV?'-':'+'}${i.poin})</div>`; });
            list.innerHTML = html + '</div>';
        } else { list.innerHTML = `<p style="text-align:center;">Riwayat bersih!</p>`; }
    } catch (e) { list.innerHTML = "Gagal memuat."; }
}

function openEditModal() { 
    document.getElementById('edit-modal').classList.remove('hidden'); 
    newFotoUrl = ""; isPhotoDeleted = false; 
    document.getElementById('edit-avatar-preview').src = document.getElementById('top-avatar').src;
}
function closeEditModal() { document.getElementById('edit-modal').classList.add('hidden'); }
function handleDeletePhoto() {
    if(!confirm("Hapus foto profil?")) return;
    isPhotoDeleted = true; newFotoUrl = ""; 
    document.getElementById('edit-avatar-preview').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(document.getElementById('edit-nama').value)}&background=0056b3&color=fff`;
}
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('image-to-crop').src = e.target.result;
            document.getElementById('crop-modal').classList.remove('hidden');
            if (cropper) cropper.destroy();
            cropper = new Cropper(document.getElementById('image-to-crop'), { aspectRatio: 1, viewMode: 1, autoCropArea: 1 });
        };
        reader.readAsDataURL(file);
    }
}
function closeCropModal() { document.getElementById('crop-modal').classList.add('hidden'); if (cropper) cropper.destroy(); document.getElementById('file-input').value = ""; }

async function cropAndUpload() { 
    if (!cropper) return;
    const btn = document.getElementById('btn-crop-save'); btn.innerText = "Mengupload..."; btn.disabled = true;
    const base64Image = cropper.getCroppedCanvas({ width: 400, height: 400 }).toDataURL('image/png'); 
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'upload_foto', nia: window.currentUser.nia, image: base64Image }) });
        const result = await response.json();
        if (result.status) { newFotoUrl = result.url; isPhotoDeleted = false; document.getElementById('edit-avatar-preview').src = base64Image; closeCropModal(); } 
        else alert("Gagal");
    } catch (e) {} finally { btn.innerText = "Potong & Upload"; btn.disabled = false; }
}

async function saveProfile() { 
    const namaBaru = document.getElementById('edit-nama').value; const btnSave = document.getElementById('btn-save-main');
    if(!namaBaru) return; btnSave.innerText = "Menyimpan..."; btnSave.disabled = true;
    let fotoPayload = isPhotoDeleted ? "DELETE" : (newFotoUrl ? newFotoUrl : "");
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'update_profile', nia: window.currentUser.nia, nama: namaBaru, foto: fotoPayload }) });
        const result = await response.json();
        if (result.status) {
            let user = JSON.parse(localStorage.getItem('user_session')); user.nama = namaBaru;
            if (isPhotoDeleted) user.foto = ""; else if (newFotoUrl) user.foto = newFotoUrl;
            localStorage.setItem('user_session', JSON.stringify(user)); updateUI(user); closeEditModal();
        }
    } catch(e) {} finally { btnSave.innerText = "Simpan"; btnSave.disabled = false; }
}

async function logout() {
    if (!confirm("Keluar?")) return; localStorage.removeItem('user_session');
    try { fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'logout', nia: window.currentUser.nia }) }); } catch(e) {}
    window.location.replace("../login/index.html"); 
}
function logoutLocal() { localStorage.removeItem('user_session'); window.location.replace("../login/index.html"); }
function setupAutoLogout() { resetTimer(); window.onmousemove=window.onclick=window.onkeypress=resetTimer; }
function resetTimer() { clearTimeout(idleTimer); idleTimer = setTimeout(logoutLocal, IDLE_LIMIT); }
function toggleSidebar() { document.getElementById('mySidebar').classList.toggle('active'); document.getElementById('sidebar-overlay').classList.toggle('active'); }
function setupBackButtonBlocker() { history.pushState(null, document.title, location.href); window.addEventListener('popstate', function () { history.pushState(null, document.title, location.href); }); }


// ==========================================
// MODUL DAILY REWARD & ROADMAP
// ==========================================

async function fetchRewardStatus() {
    const statReward = document.getElementById('stat-reward');
    const forecastContainer = document.getElementById('forecast-container');
    const badgeStreak = document.getElementById('current-streak-badge');

    try {
        const response = await fetch(API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'get_reward_status', nia: window.currentUser.nia })
        });
        const data = await response.json();
        
        if (data.status) {
            statReward.innerHTML = `<span style="color:#f57f17; font-weight:bold;">${data.total_poin}</span> Pts`;
            if (document.getElementById('streak-day')) document.getElementById('streak-day').innerText = data.streak_hari;
            
            let streak = parseInt(data.streak_hari) || 0;
            let bisaKlaim = data.bisa_klaim_hari_ini;
            let configMap = data.config_map || {}; // Ambil data config dari backend
            
            badgeStreak.innerText = `Streak: ${streak} Hari 🔥`;

            let posisiHariIni = streak % 7;
            if (posisiHariIni === 0 && streak > 0) posisiHariIni = 7;
            
            let hariTargetKlaim = -1;
            let baseStreak = streak - posisiHariIni; // Cari tahu user ada di siklus mana

            if (bisaKlaim) {
                hariTargetKlaim = (streak === 0 || posisiHariIni === 7) ? 1 : posisiHariIni + 1;
                if (streak === 0 || posisiHariIni === 7) baseStreak = streak; // Maju ke siklus baru
            }

            let html = '';
            for (let i = 1; i <= 7; i++) {
                // Tentukan hari aslinya untuk mengambil poin yang pas (1-30)
                let actualDay = baseStreak + i;
                if (actualDay > 30) actualDay = ((actualDay - 1) % 30) + 1; 

                // Ambil poin dari config, jika tidak ada di config default ke 10
                let poinHarian = configMap[actualDay] ? configMap[actualDay].poin : 10;
                
                let iconClass = i === 7 ? "fa-gift" : "fa-coins";
                let cardClass = 'day-card';
                let statusHtml = '';
                let extraHtml = '';

                if (bisaKlaim && i === hariTargetKlaim) {
                    cardClass += ' active-klaim';
                    statusHtml = `<div class="active-label">Klaim</div>`;
                    extraHtml = `onclick="claimDailyPoint()"`;
                } 
                else if (
                    (!bisaKlaim && i <= posisiHariIni) || 
                    (bisaKlaim && posisiHariIni !== 7 && i <= posisiHariIni)
                ) {
                    cardClass += ' selesai';
                    statusHtml = `<div class="check-overlay"><i class="fa-solid fa-check"></i></div>`;
                } 

                // Tampilan tetap menggunakan "Hari ${i}" sesuai request
                html += `
                    <div class="${cardClass}" ${extraHtml}>
                        ${statusHtml}
                        <span class="day-label">Hari ${i}</span>
                        <i class="fa-solid ${iconClass} coin-icon"></i>
                        <span class="day-poin">+${poinHarian}</span>
                    </div>
                `;
            }
            forecastContainer.innerHTML = html;
        }
    } catch (e) { 
        if(statReward) statReward.innerText = "Error";
        if(forecastContainer) forecastContainer.innerHTML = `<p style="padding:20px; color:red;">Gagal memuat check-in.</p>`;
    }
}

async function claimDailyPoint() {
    // 1. Kunci agar tidak bisa diklik dobel saat lag
    if (window.isClaimingPoint) return;
    window.isClaimingPoint = true;

    // 2. Ubah UI Tombol Modal (Jika klaim dari modal)
    const btnClaim = document.getElementById('btn-claim-daily');
    let originalBtnText = '';
    if (btnClaim) {
        originalBtnText = btnClaim.innerHTML;
        btnClaim.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
        btnClaim.disabled = true;
    }

    // 3. Ubah UI Kotak Hari di Dashboard (Jika klaim dari dashboard)
    const activeLabel = document.querySelector('.active-klaim .active-label');
    const activeIcon = document.querySelector('.active-klaim .coin-icon');
    let originalLabelText = '';
    
    if (activeLabel) {
        originalLabelText = activeLabel.innerHTML;
        activeLabel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; // Ganti teks Klaim jadi spinner
    }
    if (activeIcon) {
        activeIcon.classList.remove('fa-coins');
        activeIcon.classList.add('fa-spinner', 'fa-spin'); // Ganti ikon koin jadi spinner berputar
    }

    try {
        // Tembak API ke Google Sheet
        const response = await fetch(API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'claim_daily', nia: window.currentUser.nia, nama: window.currentUser.nama })
        });
        const data = await response.json();
        
        if (data.status) {
            // Tunggu data di-fetch ulang dari server agar UI berubah jadi kotak centang/selesai
            await fetchRewardStatus(); 
            // Munculkan notifikasi setelah tampilan UI selesai berubah
            alert(`🎉 Berhasil! Kamu mendapat ${data.poin_didapat} Poin (Streak Hari ke-${data.streak_baru}).`);
        } else {
            alert(data.message);
            await fetchRewardStatus();
        }
    } catch (e) {
        alert("Gagal menghubungi server. Periksa koneksi internetmu.");
        
        // Kembalikan ke tampilan semula jika terjadi error/gagal koneksi
        if (btnClaim) {
            btnClaim.innerHTML = originalBtnText;
            btnClaim.disabled = false;
        }
        if (activeLabel) activeLabel.innerHTML = originalLabelText;
        if (activeIcon) {
            activeIcon.classList.remove('fa-spinner', 'fa-spin');
            activeIcon.classList.add('fa-coins');
        }
    } finally {
        // Buka kembali kuncinya
        window.isClaimingPoint = false;
    }
}

function openRewardModal() {
    document.getElementById('reward-modal').classList.remove('hidden');
    fetchRewardStatus(); 
    fetchRewardCatalog(); 
}

function closeRewardModal() { document.getElementById('reward-modal').classList.add('hidden'); }

async function fetchRewardCatalog() {
    const list = document.getElementById('reward-catalog-list');
    try {
        const response = await fetch(API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'get_reward_catalog' })
        });
        const data = await response.json();
        
        if (data.status && data.katalog.length > 0) {
            let html = '';
            data.katalog.forEach(item => {
                
                // Tentukan ikon berdasarkan tipe
                const t = (item.tipe || "").toLowerCase();
                let iconClass = 'fa-gift';
                let iconColor = '#1565c0'; // Biru default
                
                if (t.includes('voucher') || t.includes('diskon')) { iconClass = 'fa-ticket'; iconColor = '#d32f2f'; }
                else if (t.includes('saldo') || t.includes('wallet')) { iconClass = 'fa-wallet'; iconColor = '#2e7d32'; }
                else if (t.includes('tiket') || t.includes('akses')) { iconClass = 'fa-train-subway'; iconColor = '#f57c00'; }

                html += `
                <div style="border: 1px solid #e0e0e0; border-radius: 12px; padding: 15px; text-align: left; display: flex; flex-direction: column; justify-content: space-between; background: #fafafa; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <div style="font-size: 2rem; color: ${iconColor};"><i class="fa-solid ${iconClass}"></i></div>
                            <span style="background: #e3f2fd; color: #1565c0; font-size: 0.65rem; padding: 3px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase;">${item.tipe}</span>
                        </div>
                        <div style="font-weight: 700; font-size: 1rem; line-height: 1.3; margin-bottom: 6px; color: #333;">${item.nama}</div>
                        
                        <div style="font-size: 0.75rem; color: #666; margin-bottom: 15px; background: #fff; border: 1px dashed #ccc; padding: 8px; border-radius: 6px;">
                            <i class="fa-solid fa-circle-info"></i> ${item.deskripsi || "Tidak ada syarat & ketentuan khusus."}
                        </div>
                        
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: #757575; margin-bottom: 8px; font-weight: 500;">
                            <i class="fa-solid fa-box"></i> Sisa Stok: <span style="font-weight: bold; color: #333;">${item.stok}</span>
                        </div>
                        <button onclick="redeemReward('${item.id}', '${item.nama}', ${item.harga})" style="background: #1565c0; color: white; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; width: 100%; font-weight: bold; transition: 0.2s;">
                            <i class="fa-solid fa-coins"></i> Tukar ${item.harga} Pts
                        </button>
                    </div>
                </div>`;
            });
            list.innerHTML = html;
        } else {
            list.innerHTML = `<p style="text-align:center; color:#888; grid-column: 1 / -1; padding: 20px;">Katalog hadiah belum tersedia.</p>`;
        }
    } catch (e) {
        list.innerHTML = `<p style="text-align:center; color:red; grid-column: 1 / -1;">Gagal memuat katalog.</p>`;
    }
}

async function redeemReward(id_item, nama_item, harga) {
    if(!confirm(`Yakin ingin menukar ${harga} poin dengan ${nama_item}?`)) return;
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'redeem_reward', nia: window.currentUser.nia, nama: window.currentUser.nama, id_item: id_item, harga: harga })
        });
        const data = await response.json();
        
        if (data.status) {
            alert(`✅ Sukses! ${nama_item} berhasil ditukar. Kami akan segera memproses hadiahmu.`);
            fetchRewardStatus();
            fetchRewardCatalog();
        } else {
            alert(`Gagal: ${data.message}`);
        }
    } catch (e) { alert("Terjadi kesalahan sistem."); }
}