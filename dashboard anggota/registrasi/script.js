const API_URL = "https://script.google.com/macros/s/AKfycbyHhZ3YejR3Yju0E6CT_TLMMMdoxCP-oC5FibbjlIMfX0TBlkTgtaTDSFU-tAh1SYKsIQ/exec"; // <--- GANTI INI

function autoCap(el) { el.value = el.value.replace(/\b\w/g, l => l.toUpperCase()); }

async function handleRegister() {
    const nama = document.getElementById('nama').value;
    const nia = document.getElementById('nia').value;
    const email = document.getElementById('email').value;
    const wa = document.getElementById('wa').value;
    const pass = document.getElementById('pass').value;
    const conf = document.getElementById('conf').value;
    const btn = document.querySelector('button');

    if(pass !== conf) return alert("Password tidak cocok!");
    // Regex Pass
    if (!/^[A-Z](?=.*\d).{7,}$/.test(pass)) return alert("Password: Min 8, Awal Kapital, Ada Angka");

    btn.innerText = "Mendaftarkan..."; btn.disabled = true;

    try {
        const req = await fetch(API_URL, {
            method: 'POST', 
            body: JSON.stringify({ action: 'register', nama, nia, email, wa, password: pass })
        });
        const res = await req.json();

        if (res.status) {
            alert(res.message);
            window.location.href = "../login/index.html";
        } else {
            alert(res.message);
        }
    } catch (e) { alert("Error koneksi"); }
    btn.innerText = "Daftar Sekarang"; btn.disabled = false;
}