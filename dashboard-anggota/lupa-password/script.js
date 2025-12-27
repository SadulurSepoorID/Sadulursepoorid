const API_URL = "https://script.google.com/macros/s/AKfycbzaLFLCiTPEnVNIcwnuUi-d6YErJhJxkRe-ixbPQVQFfrpTO92dlaKT-ZmIl9fuWeas6g/exec"; // <--- GANTI INI

async function requestKode() {
    const nia = document.getElementById('r-nia').value;
    const email = document.getElementById('r-email').value;
    const btn = document.querySelector('#step-1 button');

    btn.innerText = "Mengirim..."; btn.disabled = true;

    try {
        const req = await fetch(API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'request_reset', nia, email })
        });
        const res = await req.json();

        if (res.status) {
            document.getElementById('step-1').style.display = 'none';
            document.getElementById('step-2').style.display = 'block';
        } else {
            alert(res.message);
        }
    } catch (e) { alert("Error koneksi"); }
    btn.innerText = "Kirim Kode OTP"; btn.disabled = false;
}

async function verifyKode() {
    const nia = document.getElementById('r-nia').value;
    const code = document.getElementById('r-code').value;
    const newPass = document.getElementById('r-newpass').value;

    const req = await fetch(API_URL, {
        method: 'POST', body: JSON.stringify({ action: 'verify_reset', nia, code, newPass })
    });
    const res = await req.json();

    if (res.status) {
        alert("Sukses! Silakan Login.");
        window.location.href = "../login/index.html";
    } else {
        alert(res.message);
    }
}