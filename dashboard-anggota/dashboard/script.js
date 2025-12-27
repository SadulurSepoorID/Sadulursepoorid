// --- KONFIGURASI ---
// GANTI DENGAN URL GAS TERBARU KAMU
const API_URL = "MASUKAN_URL_GAS_DISINI"; 

let cropper; 
let newFotoUrl = ""; 

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('user_session');
    if (!session) { window.location.href = "../login/index.html"; return; }
    try { window.currentUser = JSON.parse(session); } catch (e) {
        localStorage.removeItem('user_session'); window.location.href = "../login/index.html"; return;
    }
    initDashboard();
});

function initDashboard() {
    // Tanggal & Salam
    const dateEl = document.getElementById('date-display');
    if (dateEl) { const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }; dateEl.innerText = new Date().toLocaleDateString('id-ID', options); }
    const greetEl = document.getElementById('greet-msg');
    if (greetEl) { const h = new Date().getHours(); greetEl.innerText = (h<12?"Selamat Pagi":h<15?"Selamat Siang":h<18?"Selamat Sore":"Selamat Malam") + ","; }
    
    updateUI(window.currentUser);
    fetchUserData();

    // Event Klik Luar untuk menutup Dropdown
    document.addEventListener('click', function(event) {
        const wrapper = document.querySelector('.profile-wrapper');
        const dropdown = document.getElementById('profile-dropdown');
        // Jika klik bukan di wrapper (tombol) dan bukan di dalam dropdown, maka tutup
        if (wrapper && !wrapper.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    });
}

// --- TOGGLE PROFILE MENU (BARU) ---
function toggleProfileMenu() {
    const dropdown = document.getElementById('profile-dropdown');
    dropdown.classList.toggle('show');
}

// --- TOGGLE SIDEBAR ---
function toggleSidebar() {
    document.getElementById('mySidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

// --- FETCH DATA ---
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
    } catch (error) { console.error("Offline:", error); }
}

function updateUI(user) {
    if (!user) return;
    const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };
    const setValue = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
    const setSrc = (id, url) => { const el = document.getElementById(id); if(el) el.src = url; };

    setText('top-nama', user.nama);
    setText('top-jabatan', user.jabatan || "Anggota");
    setText('stat-nia', user.nia || window.currentUser.nia);

    const avatarUrl = user.foto && user.foto.length > 5 ? user.foto : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=0056b3&color=fff`;
    setSrc('top-avatar', avatarUrl);
    setSrc('edit-avatar-preview', avatarUrl);
    setValue('edit-nama', user.nama);
}

// --- CROPPER ---
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('image-to-crop').src = e.target.result;
            document.getElementById('crop-modal').classList.remove('hidden'); 
            if (cropper) cropper.destroy();
            cropper = new Cropper(document.getElementById('image-to-crop'), { 
                aspectRatio: 1, viewMode: 1, minContainerHeight: 250 
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

// --- SAVE PROFILE ---
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

function openEditModal() { 
    document.getElementById('profile-dropdown').classList.remove('show'); // Tutup menu
    document.getElementById('edit-modal').classList.remove('hidden'); 
}
function closeEditModal() { document.getElementById('edit-modal').classList.add('hidden'); }

async function logout() { 
    if(confirm("Keluar dari aplikasi?")) { 
        // Kirim sinyal logout ke server (optional, biar status offline)
        try {
            fetch(API_URL, {
                method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: 'logout', nia: window.currentUser.nia })
            });
        } catch(e){}
        
        localStorage.removeItem('user_session'); 
        window.location.href = "../login/index.html"; 
    } 
}