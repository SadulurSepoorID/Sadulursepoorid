// ==========================================
// 1. UTILITY FUNCTIONS
// ==========================================

// Auto Capitalize untuk Nama
function autoCap(el) { 
    el.value = el.value.replace(/\b\w/g, l => l.toUpperCase()); 
}

// Toggle Lihat Password
function togglePassword(id, icon) {
    const input = document.getElementById(id);
    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}

// ==========================================
// 2. VALIDASI PASSWORD REAL-TIME
// ==========================================

const passInput = document.getElementById('pass');
const reqLength = document.getElementById('req-length');
const reqStart = document.getElementById('req-start');
const reqMix = document.getElementById('req-mix');

// Fungsi update status (Merah/Hijau)
function setStatus(element, isValid) {
    if (isValid) {
        element.classList.add('valid');
        element.classList.remove('invalid');
        element.querySelector('i').classList.replace('fa-circle', 'fa-check-circle');
    } else {
        element.classList.remove('valid');
        // Hanya beri warna merah jika user sudah mulai mengetik
        if(passInput && passInput.value.length > 0) element.classList.add('invalid');
        else element.classList.remove('invalid');
        
        element.querySelector('i').classList.replace('fa-check-circle', 'fa-circle');
    }
}

if (passInput) {
    passInput.addEventListener('input', () => {
        const val = passInput.value;

        // A. Min 8 Karakter
        setStatus(reqLength, val.length >= 8);

        // B. Diawali Huruf Kapital
        setStatus(reqStart, /^[A-Z]/.test(val));

        // C. Campuran Huruf dan Angka
        const hasLetter = /[a-zA-Z]/.test(val);
        const hasNumber = /\d/.test(val);
        setStatus(reqMix, hasLetter && hasNumber);
    });
}

// ==========================================
// 3. AUTO FORMATTER (NIA & WHATSAPP) - BARU
// ==========================================

const inputNia = document.getElementById('nia');
const inputWa = document.getElementById('wa');

// --- Logic NIA (SS-0000) ---
if (inputNia) {
    // Saat keluar kolom (Blur): Format jadi SS-XXXX
    inputNia.addEventListener('blur', function() {
        let val = this.value.replace(/\D/g, ''); // Ambil angka saja
        
        if (val === '') return; // Jika kosong, biarkan

        // Batasi max 4 digit angka (cegah input kepanjangan)
        if (val.length > 4) val = val.slice(-4);

        // Tambahkan nol di depan (Padding)
        const padded = val.padStart(4, '0');

        // Hasil akhir
        this.value = 'SS-' + padded;
    });

    // Saat masuk kolom (Focus): Hapus SS- dan 0 depan biar enak diedit
    inputNia.addEventListener('focus', function() {
        let val = this.value;
        if (val.startsWith('SS-')) {
            val = val.replace('SS-', ''); // Hapus SS-
            this.value = parseInt(val).toString(); // Hapus 0 di depan (misal 0098 jadi 98)
        }
    });
}

// --- Logic WhatsApp (628xxx) ---
if (inputWa) {
    inputWa.addEventListener('blur', function() {
        let val = this.value.replace(/\D/g, ''); // Hapus simbol (+, -, spasi)

        if (val === '') return;

        if (val.startsWith('0')) {
            // Ubah 08xx jadi 628xx
            val = '62' + val.slice(1);
        } else if (val.startsWith('8')) {
            // Ubah 8xx jadi 628xx
            val = '62' + val;
        }
        
        this.value = val;
    });
}

// ==========================================
// 4. HANDLE REGISTER SUBMIT
// ==========================================

async function handleRegister() {
    const nama = document.getElementById('nama').value;
    const nia = document.getElementById('nia').value;
    const email = document.getElementById('email').value;
    const wa = document.getElementById('wa').value;
    const pass = document.getElementById('pass').value;
    const conf = document.getElementById('conf').value;
    const btn = document.getElementById('btn-daftar');

    // Validasi Match Password
    if(pass !== conf) return alert("Konfirmasi password tidak cocok!");
    
    // Validasi Regex Password (Final Check)
    const finalRegex = /^[A-Z](?=.*\d)(?=.*[a-zA-Z]).{7,}$/; 
    if (!finalRegex.test(pass)) {
        return alert("Password belum memenuhi semua kriteria yang diminta!");
    }

    // Tombol Loading
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Memproses...'; 
    btn.disabled = true;

    try {
        // Kirim ke Backend
        const req = await fetch(API_URL, {
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'register', 
                nama, 
                nia, // Ini sudah otomatis format SS-XXXX
                email, 
                wa,  // Ini sudah otomatis format 628xxx
                password: pass 
            })
        });
        const res = await req.json();

        if (res.status) {
            alert(res.message);
            window.location.href = "../login/index.html";
        } else {
            alert(res.message);
        }
    } catch (e) { 
        console.error(e);
        alert("Gagal terhubung ke server. Cek koneksi internet Anda."); 
    }
    
    // Reset Tombol
    btn.innerHTML = originalText; 
    btn.disabled = false;
}