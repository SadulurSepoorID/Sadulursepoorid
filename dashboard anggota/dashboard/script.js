// --- KONFIGURASI ---
// GANTI URL DI BAWAH INI DENGAN HASIL DEPLOY TERBARU (New Version)
const API_URL = "https://script.google.com/macros/s/AKfycbyHhZ3YejR3Yju0E6CT_TLMMMdoxCP-oC5FibbjlIMfX0TBlkTgtaTDSFU-tAh1SYKsIQ/exec"; 

let cropper; // Variabel untuk menyimpan instance cropper
let newFotoUrl = ""; // Menyimpan URL foto yang baru diupload

document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('user_session');
    if (!session) { window.location.href = "../login/index.html"; return; }
    try { window.currentUser = JSON.parse(session); } catch (e) {
        localStorage.removeItem('user_session'); window.location.href = "../login/index.html"; return;
    }
    initDashboard();
});

function initDashboard() {
    // Set Tanggal & Salam
    const dateEl = document.getElementById('date-display');
    if (dateEl) { const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }; dateEl.innerText = new Date().toLocaleDateString('id-ID', options); }
    const greetEl = document.getElementById('greet-msg');
    if (greetEl) { const h = new Date().getHours(); greetEl.innerText = (h<12?"Selamat Pagi":h<15?"Selamat Siang":h<18?"Selamat Sore":"Selamat Malam") + ","; }
    
    // Tampilkan Data
    updateUI(window.currentUser);
    fetchUserData();
}

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

// --- LOGIKA CROPPER & UPLOAD ---
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('image-to-crop').src = e.target.result;
            document.getElementById('crop-modal').classList.remove('hidden'); // Buka Modal Crop
            
            // Inisialisasi Cropper 1:1
            if (cropper) cropper.destroy();
            const image = document.getElementById('image-to-crop');
            cropper = new Cropper(image, { aspectRatio: 1, viewMode: 1, minContainerHeight: 300 });
        };
        reader.readAsDataURL(file);
    }
    event.target.value = ''; // Reset input
}

function closeCropModal() {
    document.getElementById('crop-modal').classList.add('hidden');
    if (cropper) cropper.destroy();
}

async function cropAndUpload() {
    if (!cropper) return;
    const btn = document.getElementById('btn-crop-save');
    btn.innerText = "Mengupload..."; btn.disabled = true;

    // Ambil hasil crop (Resize ke 500x500 biar ringan)
    const canvas = cropper.getCroppedCanvas({ width: 500, height: 500 });
    const base64Image = canvas.toDataURL('image/png');

    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'upload_foto', nia: window.currentUser.nia, image: base64Image })
        });
        const result = await response.json();

        if (result.status) {
            newFotoUrl = result.url; // Simpan URL baru
            document.getElementById('edit-avatar-preview').src = newFotoUrl; // Update preview
            closeCropModal();
            alert("Foto terupload! Klik 'Simpan Perubahan' untuk mengonfirmasi.");
        } else {
            alert("Gagal upload: " + result.message);
        }
    } catch (e) { alert("Error koneksi upload."); }
    
    btn.innerText = "Potong & Upload"; btn.disabled = false;
}

// --- SAVE PROFILE UTAMA ---
async function saveProfile() {
    const newNama = document.getElementById('edit-nama').value;
    if (!newNama) return alert("Nama wajib diisi.");

    // Gunakan URL baru jika ada, kalau tidak pakai yang lama
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
            newFotoUrl = ""; // Reset temp
            fetchUserData(); // Refresh dashboard
        } else {
            alert("Gagal: " + result.message);
        }
    } catch (e) { alert("Error koneksi server."); }
    
    btn.innerText = "Simpan Perubahan"; btn.disabled = false;
}

function openEditModal() { document.getElementById('edit-modal').classList.remove('hidden'); }
function closeEditModal() { document.getElementById('edit-modal').classList.add('hidden'); }
function logout() { if(confirm("Keluar?")) { localStorage.removeItem('user_session'); window.location.href = "../login/index.html"; } }