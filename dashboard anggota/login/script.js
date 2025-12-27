const API_URL = "https://script.google.com/macros/s/AKfycbyHhZ3YejR3Yju0E6CT_TLMMMdoxCP-oC5FibbjlIMfX0TBlkTgtaTDSFU-tAh1SYKsIQ/exec"; // <--- GANTI INI

async function handleLogin() {
    const nia = document.getElementById('nia').value;
    const pass = document.getElementById('pass').value;
    const btn = document.querySelector('button');

    btn.innerText = "Memproses..."; btn.disabled = true;

    try {
        const req = await fetch(API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'login', nia: nia, password: pass })
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
        alert("Gagal koneksi server");
    }
    btn.innerText = "Masuk Sekarang"; btn.disabled = false;
}