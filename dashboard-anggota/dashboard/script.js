let cropper; 
let newFotoUrl = ""; 
let idleTimer; 
const IDLE_LIMIT = 5 * 60 * 1000; // Logout otomatis setelah 5 menit diam

document.addEventListener('DOMContentLoaded', () => {
    // Cek Sesi Login
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
    // Tampilkan Tanggal
    const dateEl = document.getElementById('date-display');
    if (dateEl) { 
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }; 
        dateEl.innerText = new Date().toLocaleDateString('id-ID', options); 
    }
    
    // Tampilkan Salam (Pagi/Siang/Sore/Malam)
    const greetEl = document.getElementById('greet-msg');
    if (greetEl) { 
        const h = new Date().getHours(); 
        greetEl.innerText = (h<11?"Selamat Pagi":h<15?"Selamat Siang":h<18?"Selamat Sore":"Selamat Malam") + ","; 
    }

    // Load Data
    updateUI(window.currentUser); // Load dari cache dulu biar cepat
    fetchUserData(); // Ambil data terbaru dari server
    fetchDashboardStats(); // Ambil statistik poin/kehadiran
}

function updateUI(user) {
    if (!user) return;
    const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };
    
    setText('top-nama', user.nama);
    setText('top-jabatan', user.jabatan || "Anggota");
    setText('stat-nia', user.nia || window.currentUser.nia);
    
    // --- PERBAIKAN LOGIKA FOTO PROFIL ---
    let avatarUrl = "";
    if (user.foto && user.foto.length > 5) {
        // Cek jika link masih format mentah Google Drive
        if (user.foto.includes("drive.google.com") || user.foto.includes("open?id=")) {
            const idMatch = user.foto.match(/[-\w]{25,}/);
            if (idMatch) {
                // Gunakan Google User Content agar bisa dicache browser & tampil
                avatarUrl = `https://lh3.googleusercontent.com/d/${idMatch[0]}=s200`;
            } else {
                avatarUrl = user.foto;
            }
        } else {
            avatarUrl = user.foto;
        }
    } else {
        // Fallback ke inisial nama jika tidak ada foto
        avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=0056b3&color=fff`;
    }

    // Update elemen gambar di HTML
    if(document.getElementById('top-avatar')) document.getElementById('top-avatar').src = avatarUrl;
    if(document.getElementById('edit-avatar-preview')) document.getElementById('edit-avatar-preview').src = avatarUrl;
    if(document.getElementById('edit-nama')) document.getElementById('edit-nama').value = user.nama;
    // ------------------------------------

    const menuGrid = document.querySelector('.menu-grid');
    if(!menuGrid) return;
    
    // Reset Default Menu
    menuGrid.innerHTML = `
        <a href="../presensi/index.html" class="menu-card"><i class="fa-solid fa-qrcode"></i><span>Scan Presensi</span></a>
        <a href="../jadwal/index.html" class="menu-card"><i class="fa-solid fa-calendar-check"></i><span>Jadwal Terdekat</span></a>
        <a href="../anggota/index.html" class="menu-card"><i class="fa-solid fa-user-group"></i><span>Cari Anggota</span></a>
        <a href="../iuran/index.html" class="menu-card"><i class="fa-solid fa-file-invoice"></i><span>Iuran Kas</span></a>
    `;

    // Tampilkan Menu Khusus Admin/Pengurus
    const role = (user.jabatan || "").toLowerCase().trim();
    if (role !== 'anggota') {
        if ((role.includes('ketua') || role.includes('msdm') || role.includes('sdm'))) {
            menuGrid.innerHTML = `<a href="../msdm/index.html" class="menu-card" style="background:#f3e5f5; color:#6a1b9a; border:1px solid #e1bee7"><i class="fa-solid fa-users-gear"></i><span>Panel MSDM</span></a>` + menuGrid.innerHTML;
        }
        if (role.includes('bendahara') || role.includes('ketua')) {
            menuGrid.innerHTML = `<a href="../bendahara/index.html" class="menu-card" style="background:#fff3e0; color:#e65100; border:1px solid #ffe0b2"><i class="fa-solid fa-vault"></i><span>Panel Bendahara</span></a>` + menuGrid.innerHTML;
        }
    }
}

// --- API FUNCTIONS ---

async function fetchUserData() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST', 
            redirect: 'follow', 
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'get_profile', nia: window.currentUser.nia })
        });
        const data = await response.json();
        if (data.status) {
            // Gabungkan data baru dengan data lama (nia, dll)
            const updatedUser = { ...window.currentUser, ...data };
            localStorage.setItem('user_session', JSON.stringify(updatedUser));
            updateUI(updatedUser);
        }
    } catch (e) {
        console.error("Gagal update profil:", e);
    }
}

async function fetchDashboardStats() {
    const statHadir = document.getElementById('stat-kehadiran');
    const statPoin = document.getElementById('stat-poin');
    
    // Set loading state
    if(statHadir) statHadir.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    if(statPoin) statPoin.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

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
    } catch (e) { 
        console.log(e); 
        if(statHadir) statHadir.innerText = "-";
        if(statPoin) statPoin.innerText = "-";
    }
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

// --- LOGIKA EDIT PROFIL (CROP & UPLOAD) ---

function openEditModal() { document.getElementById('edit-modal').classList.remove('hidden'); }
function closeEditModal() { document.getElementById('edit-modal').classList.add('hidden'); }

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('image-to-crop').src = e.target.result;
            document.getElementById('crop-modal').classList.remove('hidden');
            
            // Hapus cropper lama jika ada
            if (cropper) cropper.destroy();
            
            // Inisialisasi Cropper.js
            const image = document.getElementById('image-to-crop');
            cropper = new Cropper(image, {
                aspectRatio: 1, // Wajib kotak 1:1
                viewMode: 1,
                autoCropArea: 1,
            });
        };
        reader.readAsDataURL(file);
    }
}

function closeCropModal() {
    document.getElementById('crop-modal').classList.add('hidden');
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    document.getElementById('file-input').value = ""; // Reset input
}

async function cropAndUpload() {
    if (!cropper) return;
    
    // Ambil tombol untuk efek loading
    const btnSave = document.getElementById('btn-crop-save');
    const originalText = btnSave.innerText;
    btnSave.innerText = "Mengupload...";
    btnSave.disabled = true;

    // Convert hasil crop ke Base64
    const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });
    const base64Image = canvas.toDataURL('image/png'); // Hasil akhir (newFotoUrl)
    
    // Upload ke Google Drive via GAS
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ 
                action: 'upload_foto', 
                nia: window.currentUser.nia, 
                image: base64Image 
            })
        });
        
        const result = await response.json();
        
        if (result.status) {
            newFotoUrl = result.url; // Simpan URL dari drive
            
            // Update preview di modal edit
            document.getElementById('edit-avatar-preview').src = base64Image;
            
            // Tutup modal crop
            closeCropModal();
            alert("Foto berhasil diupload! Tekan 'Simpan' untuk menerapkan.");
        } else {
            alert("Gagal upload foto: " + result.message);
        }
    } catch (e) {
        alert("Terjadi kesalahan koneksi.");
        console.error(e);
    } finally {
        btnSave.innerText = originalText;
        btnSave.disabled = false;
    }
}

async function saveProfile() {
    const namaBaru = document.getElementById('edit-nama').value;
    const btnSave = document.getElementById('btn-save-main');
    
    if(!namaBaru) { alert("Nama tidak boleh kosong"); return; }
    
    btnSave.innerText = "Menyimpan...";
    btnSave.disabled = true;

    const payload = {
        action: 'update_profile',
        nia: window.currentUser.nia,
        nama: namaBaru,
        foto: newFotoUrl // Kirim URL foto baru jika ada
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.status) {
            // Update Data Lokal
            let user = JSON.parse(localStorage.getItem('user_session'));
            user.nama = namaBaru;
            if(newFotoUrl) user.foto = newFotoUrl;
            localStorage.setItem('user_session', JSON.stringify(user));
            
            updateUI(user);
            closeEditModal();
            alert("Profil berhasil diperbarui!");
        } else {
            alert("Gagal update profil.");
        }
    } catch(e) {
        alert("Error: " + e.toString());
    } finally {
        btnSave.innerText = "Simpan";
        btnSave.disabled = false;
    }
}

// --- SYSTEM FUNCTIONS (Logout, Sidebar, Back Button) ---

async function logout() {
    const confirmLogout = confirm("Apakah Anda yakin ingin keluar?");
    if (!confirmLogout) return;

    localStorage.removeItem('user_session');
    
    // Panggil API logout untuk update status online/offline di Spreadsheet (Opsional)
    try {
        fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'logout', nia: window.currentUser.nia })
        });
    } catch(e) {}

    window.location.replace("../login/index.html"); 
}

function logoutLocal() { 
    localStorage.removeItem('user_session'); 
    window.location.replace("../login/index.html"); 
}

function setupAutoLogout() {
    resetTimer();
    window.onmousemove = resetTimer;
    window.onmousedown = resetTimer; 
    window.onclick = resetTimer;     
    window.onkeypress = resetTimer;   
    window.addEventListener('scroll', resetTimer, true); 
}

function resetTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(logoutLocal, IDLE_LIMIT);
}

function toggleSidebar() { 
    document.getElementById('mySidebar').classList.toggle('active'); 
    document.getElementById('sidebar-overlay').classList.toggle('active'); 
}

function setupBackButtonBlocker() { 
    history.pushState(null, document.title, location.href); 
    window.addEventListener('popstate', function (event) { 
        history.pushState(null, document.title, location.href); 
    }); 
}