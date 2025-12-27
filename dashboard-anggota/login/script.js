const API_URL = "https://script.google.com/macros/s/AKfycbzaLFLCiTPEnVNIcwnuUi-d6YErJhJxkRe-ixbPQVQFfrpTO92dlaKT-ZmIl9fuWeas6g/exec"; 

async function handleLogin() {
    const nia = document.getElementById('nia').value;
    const pass = document.getElementById('pass').value;
    const btn = document.querySelector('button');

    btn.innerText = "Memproses..."; btn.disabled = true;

    try {
        const req = await fetch(API_URL, {
            method: 'POST', 
            // Tambahkan header agar tidak kena CORS di beberapa browser
            redirect: 'follow',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'login', nia: nia, password: pass })
        });
        const res = await req.json();

        if (res.status) {
            // Simpan data user ke browser
            localStorage.setItem('user_session', JSON.stringify({ nama: res.nama, nia: res.nia }));
            window.location.href = "../dashboard/index.html"; // Pindah ke folder dashboard
        } else {
            alert(res.message);
        }
    } catch (e) {
        alert("Gagal koneksi server atau Password Salah.");
        console.error(e);
    }
    btn.innerText = "Masuk Sekarang"; btn.disabled = false;
}

// --- FITUR BARU: LIHAT PASSWORD ---
function togglePassword() {
    const passInput = document.getElementById('pass');
    const eyeIcon = document.getElementById('eye-icon');

    if (passInput.type === 'password') {
        passInput.type = 'text'; // Ubah jadi teks biasa
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash'); // Ganti ikon jadi mata dicoret
    } else {
        passInput.type = 'password'; // Ubah jadi titik-titik lagi
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye'); // Ganti ikon jadi mata biasa
    }
}