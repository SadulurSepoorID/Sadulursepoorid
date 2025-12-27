// --- KONFIGURASI ---
const API_URL = "https://script.google.com/macros/s/AKfycbzaLFLCiTPEnVNIcwnuUi-d6YErJhJxkRe-ixbPQVQFfrpTO92dlaKT-ZmIl9fuWeas6g/exec"; 

let cropper; 
let newFotoUrl = ""; 
let idleTimer; 

// --- INISIALISASI ---
document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('user_session');
    if (!session) { window.location.href = "../login/index.html"; return; }
    
    try { window.currentUser = JSON.parse(session); } catch (e) {
        localStorage.removeItem('user_session'); window.location.href = "../login/index.html"; return;
    }

    initDashboard();

    // SETUP BACK BUTTON (Dengan Timeout agar terbaca di Mobile)
    setTimeout(() => {
        setupBackButtonBlocker();
    }, 500);
    
    setupAutoLogout();
});

// --- FITUR: ANTI BACK BUTTON ---
function setupBackButtonBlocker() {
    window.history.pushState({ page: 1 }, "", window.location.href);
    window.addEventListener('popstate', function (event) {
        if (confirm("Anda menekan tombol kembali. Ingin Keluar (Logout)?")) {
            logout();
        } else {
            window.history.pushState({ page: 1 }, "", window.location.href);
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
            alert("Sesi habis (2 Menit Tidak Aktif). Logout otomatis.");
            logout();
        }, 120000); 
    }
    window.onload = resetTimer;
    document.onmousemove = resetTimer;
    document.onclick = resetTimer;
    document.onkeypress = resetTimer;
    document.ontouchstart = resetTimer;
    document.onscroll = resetTimer;
}

// --- LOGOUT ---
async function logout() { 
    try {
        await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'logout', nia: window.currentUser.nia })
        });
    } catch(e) {}
    localStorage.removeItem('user_session'); 
    window.location.href = "../login/index.html"; 
}

// Fungsi Logout Manual (dipanggil dari tombol)
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
