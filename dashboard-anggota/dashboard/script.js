// --- KONFIGURASI ---
// Pastikan URL ini adalah URL Web App Google Apps Script TERBARU (New Version)
const API_URL = "https://script.google.com/macros/s/AKfycbyiIPGuAwa2eNiYsKzjkfNp5sM7anTpMoS1AkhdV8NbDJbj3czhRFm9fU0QinxDRTlGYQ/exec"; 

let cropper; 
let newFotoUrl = ""; 
let idleTimer; // Variabel untuk timer logout otomatis

// --- INISIALISASI SAAT WEBSITE DIMUAT ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cek Sesi Login
    const session = localStorage.getItem('user_session');
    
    if (!session) {
        window.location.href = "../login/index.html";
        return;
    }

    try {
        window.currentUser = JSON.parse(session);
    } catch (e) {
        localStorage.removeItem('user_session');
        window.location.href = "../login/index.html";
        return;
    }

    // 2. Jalankan Fungsi Dashboard Utama
    initDashboard();

    // 3. Aktifkan Fitur Keamanan (Fitur Baru)
    setupAutoLogout(); 
    setupBackButtonBlocker();
});

function initDashboard() {
    // Set Tanggal Hari Ini
    const dateEl = document.getElementById('date-display');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.innerText = new Date().toLocaleDateString('id-ID', options);
    }

    // Set Salam (Pagi/Siang/Sore/Malam)
    const greetEl = document.getElementById('greet-msg');
    if (greetEl) {
        const hours = new Date().getHours();
        let greet = "Selamat Pagi";
        if (hours >= 12 && hours < 15) greet = "Selamat Siang";
        else if (hours >= 15 && hours < 18) greet = "Selamat Sore";
        else if (hours >= 18) greet = "Selamat Malam";
        greetEl.innerText = `${greet},`;
    }

    // Ambil Data User Terbaru & Tutup Dropdown jika klik di luar
    fetchUserData();
    setupDropdownCloseListener();
}

// --- FITUR KEAMANAN 1: AUTO LOGOUT (2 MENIT) ---
function setupAutoLogout() {
    function resetTimer() {
        clearTimeout(idleTimer);
        // Set waktu 2 menit (120.000 milidetik)
        idleTimer = setTimeout(() => {
            alert("Sesi telah habis (2 Menit Tidak Aktif). Anda akan logout otomatis.");
            logout();
        }, 120000); 
    }

    // Reset timer jika ada aktivitas user
    window.onload = resetTimer;
    document.onmousemove = resetTimer;
    document.onkeypress = resetTimer;
    document.onclick = resetTimer;
    document.onscroll = resetTimer;
    document.ontouchstart = resetTimer; // Support layar sentuh
}

// --- FITUR KEAMANAN 2: BLOKIR TOMBOL BACK ---
function setupBackButtonBlocker() {
    // Memanipulasi history browser
    history.pushState(null, null, location.href);

    window.onpopstate = function () {
        // Saat tombol back ditekan, tawarkan logout
        if (confirm("Anda menekan tombol kembali. Apakah ingin Keluar (Logout) dari aplikasi?")) {
            logout();
        } else {
            // Jika batal, tetap di halaman ini (push state lagi)
            history.pushState(null, null, location.href);
        }
    };
}

// --- LOGIKA FETCH DATA ---
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
            updateUI(data);
            // Simpan data terbaru ke session agar sinkron
            window.currentUser = { ...window.currentUser, ...data };
            localStorage.setItem('user_session', JSON.stringify(window.currentUser));
        }
    } catch (error) { console.error("Mode Offline:", error); }
}

function updateUI(user) {
    if (!user) return;
    
    // Helper function
    const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };
    const setValue = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
    const setSrc = (id, url) => { const el = document.getElementById(id); if(el) el.src = url; };

    setText('top-nama', user.nama);
    setText('top-jabatan', user.jabatan || "Anggota");
    setText('stat-nia', user.nia || window.currentUser.nia);

    // Gunakan foto profil atau fallback ke inisial nama
    const avatarUrl = user.foto && user.foto.length > 5 
        ? user.foto 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=0056b3&color=fff`;
        
    setSrc('top-avatar', avatarUrl);
    setSrc('edit-avatar-preview', avatarUrl);
    setValue('edit-nama', user.nama);
}

// --- INTERAKSI UI (DROPDOWN, SIDEBAR, MODAL) ---
function toggleProfileMenu() {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

function setupDropdownCloseListener() {
    document.addEventListener('click', function(event) {
        const wrapper = document.querySelector('.profile-wrapper');
        const dropdown = document.getElementById('profile-dropdown');
        // Tutup jika klik terjadi di luar area profil
        if (wrapper && !wrapper.contains(event.target)) {
            if (dropdown && dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
            }
        }
    });
}

function toggleSidebar() {
    const sidebar = document.getElementById('mySidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

function openEditModal() { 
    // Tutup dropdown menu dulu agar rapi
    const dropdown = document.getElementById('profile-dropdown');
    if(dropdown) dropdown.classList.remove('show');
    
    document.getElementById('edit-modal').classList.remove('hidden'); 
}

function closeEditModal() { 
    document.getElementById('edit-modal').classList.add('hidden'); 
}

// --- LOGIKA CROPPER GAMBAR ---
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('image-to-crop');
            img.src = e.target.result;
            document.getElementById('crop-modal').classList.remove('hidden'); 
            
            if (cropper) cropper.destroy();
            cropper = new Cropper(img, { 
                aspectRatio: 1, 
                viewMode: 1, 
                minContainerHeight: 250 
            });
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

    // Resize gambar agar ringan (500x500px)
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
            alert("Foto terupload! Klik 'Simpan Perubahan' untuk mengonfirmasi.");
        } else {
            alert("Gagal upload: " + result.message);
        }
    } catch (e) { alert("Error koneksi upload."); }
    
    btn.innerText = "Potong & Upload"; btn.disabled = false;
}

// --- SIMPAN PROFIL ---
async function saveProfile() {
    const newNama = document.getElementById('edit-nama').value;
    if (!newNama) return alert("Nama wajib diisi.");

    const finalFoto = newFotoUrl || window.currentUser.foto;
    const btn = document.getElementById('btn-save-main');
    const originalText = btn.innerText;
    
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
            newFotoUrl = ""; 
            fetchUserData(); // Refresh data di layar
        } else {
            alert("Gagal: " + result.message);
        }
    } catch (e) { alert("Error koneksi server."); }
    
    btn.innerText = originalText; btn.disabled = false;
}

// --- LOGOUT ---
async function logout() { 
    // Kirim sinyal logout ke server (untuk update status Offline)
    try {
        await fetch(API_URL, {
            method: 'POST', 
            redirect: 'follow', 
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'logout', nia: window.currentUser.nia })
        });
    } catch(e) { console.error("Logout log error"); }
    
    // Hapus sesi lokal dan redirect
    localStorage.removeItem('user_session'); 
    window.location.href = "../login/index.html"; 
}
