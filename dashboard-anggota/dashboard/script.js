// --- KONFIGURASI ---
const API_URL = "https://script.google.com/macros/s/AKfycbzaLFLCiTPEnVNIcwnuUi-d6YErJhJxkRe-ixbPQVQFfrpTO92dlaKT-ZmIl9fuWeas6g/exec"; 

let cropper; 
let newFotoUrl = ""; 
let idleTimer; 
const IDLE_LIMIT = 2 * 60 * 1000; // 2 Menit dalam milidetik

// --- INISIALISASI ---
document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('user_session');
    // Cek sesi, jika tidak ada lempar ke login
    if (!session) { 
        window.location.replace("../login/index.html"); 
        return; 
    }
    
    try { 
        window.currentUser = JSON.parse(session); 
    } catch (e) {
        localStorage.removeItem('user_session'); 
        window.location.replace("../login/index.html"); 
        return;
    }

    initDashboard();
    setupAutoLogout();

    // SETUP BACK BUTTON BLOCKER
    // Kita panggil langsung agar history state segera tercatat
    setupBackButtonBlocker();
});

// --- FITUR: ANTI BACK BUTTON (MODIFIKASI) ---
function setupBackButtonBlocker() {
    // Push state saat ini ke history agar ada 'tumpukan'
    history.pushState(null, null, location.href);
    
    window.onpopstate = function () {
        // Saat tombol back ditekan, history berkurang 1.
        // KITA PAKSA PUSH LAGI agar user tetap di halaman ini secara teknis.
        history.pushState(null, null, location.href);
        
        // Tampilkan konfirmasi Logout
        // Menggunakan setTimeout kecil agar UI tidak konflik dengan event browser
        setTimeout(() => {
            if (confirm("Anda menekan tombol kembali. Apakah Anda ingin Keluar (Logout) dari akun?")) {
                logout(); // Panggil fungsi logout
            }
            // Jika user pilih Cancel, mereka tetap di halaman ini karena kita sudah pushState di atas.
        }, 100);
    };
}

function initDashboard() {
    const dateEl = document.getElementById('date-display');
    if (dateEl) { const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }; dateEl.innerText = new Date().toLocaleDateString('id-ID', options); }
    const greetEl = document.getElementById('greet-msg');
    if (greetEl) { const h = new Date().getHours(); greetEl.innerText = (h<12?"Selamat Pagi":h<15?"Selamat Siang":h<18?"Selamat Sore":"Selamat Malam") + ","; }
    
    updateUI(window.currentUser);
    fetchUserData(); // Ambil data terbaru dari spreadsheet agar sinkron

    // Close Dropdown on outside click
    document.addEventListener('click', function(event) {
        const wrapper = document.querySelector('.profile-wrapper');
        const dropdown = document.getElementById('profile-dropdown');
        if (wrapper && !wrapper.contains(event.target)) {
            if (dropdown && dropdown.classList.contains('show')) dropdown.classList.remove('show');
        }
    });
}

// --- FITUR: AUTO LOGOUT (IDLE 2 MENIT) ---
function setupAutoLogout() {
    function resetTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            // Hentikan event listener agar alert tidak muncul berulang
            document.onmousemove = null;
            document.onclick = null;
            document.onkeypress = null;
            document.ontouchstart = null;
            document.onscroll = null;

            alert("Sesi habis (2 Menit Tidak Aktif). Anda akan dilogout otomatis.");
            logout(); // Eksekusi logout ke server
        }, IDLE_LIMIT); 
    }

    // Reset timer setiap ada aktivitas
    window.onload = resetTimer;
    document.onmousemove = resetTimer;
    document.onclick = resetTimer;
    document.onkeypress = resetTimer;
    document.ontouchstart = resetTimer; // Penting untuk Mobile
    document.onscroll = resetTimer;     // Penting untuk Mobile
}

// --- LOGOUT ---
async function logout() { 
    // Tampilkan loading visual (opsional, agar user tahu proses berjalan)
    const btnLogout = document.querySelector('.btn-logout');
    if(btnLogout) btnLogout.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Keluar...';

    try {
        // Kirim request ke GAS untuk update status jadi "Offline" & catat Log
        // Kita gunakan 'await' tapi dibungkus try/catch agar kalau internet putus, lokal tetap logout
        await fetch(API_URL, {
            method: 'POST', 
            redirect: 'follow', 
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'logout', nia: window.currentUser.nia })
        });
    } catch(e) {
        console.log("Gagal kontak server, tetap logout lokal.");
    }

    // Hapus sesi lokal & Redirect
    localStorage.removeItem('user_session'); 
    window.location.replace("../login/index.html"); // Menggunakan replace agar tidak bisa di-back
}

// Fungsi Logout Manual (dipanggil dari tombol)
function logoutManual() {
    if(confirm("Yakin ingin keluar dari aplikasi?")) {
        logout();
    }
}

// --- FETCH & UI (SAMA SEPERTI SEBELUMNYA) ---
async function fetchUserData() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'get_profile', nia: window.currentUser.nia })
        });
        const data = await response.json();
        if (data.status) {
            updateUI(data);
            // Gabungkan data baru dengan sesi yang ada
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
