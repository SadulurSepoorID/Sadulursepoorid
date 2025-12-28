// --- KONFIGURASI ---
const API_URL = "https://script.google.com/macros/s/AKfycbzaLFLCiTPEnVNIcwnuUi-d6YErJhJxkRe-ixbPQVQFfrpTO92dlaKT-ZmIl9fuWeas6g/exec"; 

let cropper; 
let newFotoUrl = ""; 
let idleTimer; 
const IDLE_LIMIT = 2 * 60 * 1000; // 2 Menit

// --- INISIALISASI ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cek Sesi Awal
    if (!localStorage.getItem('user_session')) { 
        window.location.replace("../login/index.html"); 
        return; 
    }
    
    try { 
        window.currentUser = JSON.parse(localStorage.getItem('user_session')); 
    } catch (e) {
        logoutLocal(); // Data korup, paksa logout
        return;
    }

    initDashboard();
    setupAutoLogout();
    setupSessionIntegrity(); // Fitur Baru: Cek Hapus Cache
    setupTabCloseHandler();  // Fitur Baru: Cek Tutup Tab
    
    // Setup Back Button Blocker (Delay sedikit agar aman di Mobile)
    setTimeout(setupBackButtonBlocker, 500);
});

// --- FITUR BARU: DETEKSI HAPUS CACHE & TUTUP TAB ---

// 1. Cek terus menerus apakah storage dihapus manual
function setupSessionIntegrity() {
    setInterval(() => {
        if (!localStorage.getItem('user_session')) {
            // Jika user menghapus data situs/cache saat sedang login
            alert("Sesi Anda telah berakhir atau data browser dihapus.");
            window.location.replace("../login/index.html");
        }
    }, 1000); // Cek setiap 1 detik
}

// 2. Kirim sinyal Logout saat Tab/Browser ditutup paksa
function setupTabCloseHandler() {
    // 'pagehide' adalah event paling reliabel di Mobile (iOS/Android) untuk tutup tab
    window.addEventListener('pagehide', function() {
        // Gunakan Beacon: Cara browser mengirim data 'terakhir' saat mati
        // Kita tidak bisa menunggu response, jadi ini 'Fire and Forget'
        if (navigator.sendBeacon && window.currentUser) {
            const data = JSON.stringify({ action: 'logout', nia: window.currentUser.nia });
            // Bungkus dalam Blob agar format text/plain terbaca GAS
            const blob = new Blob([data], {type: 'text/plain;charset=utf-8'});
            navigator.sendBeacon(API_URL, blob);
        }
    });
}

// --- FITUR: ANTI BACK BUTTON ---
function setupBackButtonBlocker() {
    history.pushState(null, document.title, location.href);
    history.pushState(null, document.title, location.href);

    window.addEventListener('popstate', function (event) {
        history.pushState(null, document.title, location.href);
        if (confirm("Anda menekan tombol kembali.\nSistem mengharuskan Logout untuk keamanan.\n\nIngin Logout sekarang?")) {
            logout();
        }
    });
}

function initDashboard() {
    const dateEl = document.getElementById('date-display');
    if (dateEl) { const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }; dateEl.innerText = new Date().toLocaleDateString('id-ID', options); }
    const greetEl = document.getElementById('greet-msg');
    if (greetEl) { const h = new Date().getHours(); greetEl.innerText = (h<12?"Selamat Pagi":h<15?"Selamat Siang":h<18?"Selamat Sore":"Selamat Malam") + ","; }
    
    updateUI(window.currentUser);
    fetchUserData(); 

    // Close Dropdown on outside click
    document.addEventListener('click', function(event) {
        const wrapper = document.querySelector('.profile-wrapper');
        const dropdown = document.getElementById('profile-dropdown');
        if (wrapper && !wrapper.contains(event.target)) {
            if (dropdown && dropdown.classList.contains('show')) dropdown.classList.remove('show');
        }
    });
}

// --- FITUR: AUTO LOGOUT ---
function setupAutoLogout() {
    function resetTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            // Bersihkan listener
            document.onmousemove = null; document.onclick = null;
            document.ontouchstart = null; document.onscroll = null;
            
            alert("Sesi habis (2 Menit Tidak Aktif). Logout otomatis.");
            logout();
        }, IDLE_LIMIT); 
    }

    window.onload = resetTimer;
    document.onmousemove = resetTimer;
    document.onclick = resetTimer;
    document.ontouchstart = resetTimer;
    document.onscroll = resetTimer;
}

// --- LOGOUT UTAMA ---
async function logout() { 
    // UI Loading
    const btnLogout = document.querySelector('.btn-logout');
    if(btnLogout) {
        btnLogout.disabled = true;
        btnLogout.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Keluar...';
    }
    document.body.style.cursor = 'wait';

    const payload = JSON.stringify({ action: 'logout', nia: window.currentUser.nia });
    
    // Coba Fetch dengan Timeout, fallback ke Beacon jika gagal
    try {
        const fetchRequest = fetch(API_URL, {
            method: 'POST', redirect: 'follow', 
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: payload
        });
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2500)); // Tunggu max 2.5 detik
        await Promise.race([fetchRequest, timeoutPromise]);
    } catch (e) {
        // Fallback Beacon jika fetch gagal/koneksi putus
        if (navigator.sendBeacon) {
            const blob = new Blob([payload], {type: 'text/plain;charset=utf-8'});
            navigator.sendBeacon(API_URL, blob);
        }
    }

    logoutLocal();
}

function logoutLocal() {
    localStorage.removeItem('user_session'); 
    document.body.style.cursor = 'default';
    window.location.replace("../login/index.html"); 
}

function logoutManual() {
    if(confirm("Yakin ingin keluar?")) {
        logout();
    }
}

// --- FETCH & UI ---
async function fetchUserData() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'get_profile', nia: window.currentUser.nia })
        });
        const data = await response.json();
        if (data.status) {
            updateUI(data);
            window.currentUser = { ...window.currentUser, ...data };
            localStorage.setItem('user_session', JSON.stringify(window.currentUser));
        }
    } catch (error) {}
}

function updateUI(user) {
    if (!user) return;
    const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };
    const setValue = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
    
    setText('top-nama', user.nama);
    setText('top-jabatan', user.jabatan || "Anggota");
    setText('stat-nia', user.nia || window.currentUser.nia);

    const avatarUrl = user.foto && user.foto.length > 5 ? user.foto : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=0056b3&color=fff`;
    if(document.getElementById('top-avatar')) document.getElementById('top-avatar').src = avatarUrl;
    if(document.getElementById('edit-avatar-preview')) document.getElementById('edit-avatar-preview').src = avatarUrl;
    setValue('edit-nama', user.nama);
}

// --- INTERAKSI LAINNYA ---
function toggleProfileMenu() {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

function toggleSidebar() {
    document.getElementById('mySidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

function openEditModal() { 
    const dropdown = document.getElementById('profile-dropdown');
    if(dropdown) dropdown.classList.remove('show');
    document.getElementById('edit-modal').classList.remove('hidden'); 
}
function closeEditModal() { document.getElementById('edit-modal').classList.add('hidden'); }

// --- CROPPER ---
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('image-to-crop').src = e.target.result;
            document.getElementById('crop-modal').classList.remove('hidden'); 
            if (cropper) cropper.destroy();
            cropper = new Cropper(document.getElementById('image-to-crop'), { aspectRatio: 1, viewMode: 1, minContainerHeight: 250 });
        };
        reader.readAsDataURL(file);
    }
    event.target.value = ''; 
}

function closeCropModal() {
    document.getElementById('crop-modal').classList.add('hidden');
    if (cropper) cropper.destroy();
}

async function cropAndUpload() {
    if (!cropper) return;
    const btn = document.getElementById('btn-crop-save');
    btn.innerText = "Mengupload..."; btn.disabled = true;
    const canvas = cropper.getCroppedCanvas({ width: 500, height: 500 });
    const base64Image = canvas.toDataURL('image/png');

    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'upload_foto', nia: window.currentUser.nia, image: base64Image })
        });
        const result = await response.json();
        if (result.status) {
            newFotoUrl = result.url; 
            document.getElementById('edit-avatar-preview').src = newFotoUrl; 
            closeCropModal();
            alert("Foto siap disimpan! Klik 'Simpan Perubahan'.");
        } else { alert("Gagal upload: " + result.message); }
    } catch (e) { alert("Error koneksi upload."); }
    btn.innerText = "Potong & Upload"; btn.disabled = false;
}

async function saveProfile() {
    const newNama = document.getElementById('edit-nama').value;
    if (!newNama) return alert("Nama wajib diisi.");
    const finalFoto = newFotoUrl || window.currentUser.foto;
    const btn = document.getElementById('btn-save-main');
    btn.innerText = "Menyimpan..."; btn.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'update_profile', nia: window.currentUser.nia, nama: newNama, foto: finalFoto })
        });
        const result = await response.json();
        if (result.status) {
            alert("Berhasil disimpan!");
            closeEditModal();
            fetchUserData(); 
        } else { alert("Gagal: " + result.message); }
    } catch (e) { alert("Error koneksi server."); }
    btn.innerText = "Simpan Perubahan"; btn.disabled = false;
}
