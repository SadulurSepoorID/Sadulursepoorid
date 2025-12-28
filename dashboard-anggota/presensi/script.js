const API_URL = "https://script.google.com/macros/s/AKfycbxInCic-g9Iu_i9PmZynmybvso1FqBYjPFIabQ2qhyTGfjiGuaFUTrsCxY8OeJhcVUToQ/exec"; 

let html5QrcodeScanner;
let isScanning = false;
let audioSuccess = new Audio('https://www.soundjay.com/buttons/beep-01a.mp3'); 

document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('user_session');
    if (!session) { window.location.replace("../login/index.html"); return; }
    window.currentUser = JSON.parse(session);
    
    // Switch Tampilan
    if (window.currentUser.jabatan === "Anggota") initAnggota();
    else initPengurus();
});

function initAnggota() {
    document.getElementById('view-anggota').classList.remove('hidden');
    document.getElementById('lbl-nama').innerText = window.currentUser.nama;
    document.getElementById('lbl-nia').innerText = window.currentUser.nia;
    
    // Generate QR Code berisi URL Profile (agar kompatibel)
    const qrContent = `https://sadulursepoor.web.id/anggota/kta/${window.currentUser.nia}.html`;
    
    new QRCode(document.getElementById("qrcode"), {
        text: qrContent,
        width: 180,
        height: 180,
        colorDark : "#0056b3",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
}

function initPengurus() {
    document.getElementById('view-pengurus').classList.remove('hidden');
}

function startScannerMode() {
    const keg = document.getElementById('inp-kegiatan').value;
    const lok = document.getElementById('inp-lokasi').value;

    if (!keg || !lok) {
        showToast("Kegiatan & Lokasi wajib diisi!", "error");
        return;
    }

    document.getElementById('card-setup').classList.add('hidden');
    document.getElementById('card-scanner').classList.remove('hidden');

    if (!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5Qrcode("reader");
    }

    // Kamera Setting
    html5QrcodeScanner.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: { width: 220, height: 220 } }, 
        onScanSuccess
    ).catch(err => {
        alert("Gagal akses kamera: " + err);
        stopScannerMode();
    });
}

function stopScannerMode() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => html5QrcodeScanner.clear()).catch(err=>{});
    }
    document.getElementById('card-scanner').classList.add('hidden');
    document.getElementById('card-setup').classList.remove('hidden');
}

// --- INTELLIGENT SCANNER LOGIC ---
async function onScanSuccess(decodedText, decodedResult) {
    if (isScanning) return; 
    isScanning = true;

    // 1. Pause Kamera & Bunyi
    html5QrcodeScanner.pause(); 
    audioSuccess.play();

    // 2. EKSTRAKSI POLA NIA (REGEX)
    // Mencari "SS" atau "SSBD", diikuti strip opsional, diikuti angka
    // Contoh: "https://.../SS-0098.html" -> Ketemu "SS-0098"
    // Contoh: "SS0098" -> Ketemu "SS0098"
    let match = decodedText.match(/(SS|SSBD)[-]?[0-9]+/i);
    
    let finalNia = "";
    if (match) {
        finalNia = match[0]; // Ambil hasil Regex
    } else {
        finalNia = decodedText; // Fallback ambil mentah jika format beda
    }

    showToast("Memproses: " + finalNia, "normal");

    // 3. Kirim ke Server
    const keg = document.getElementById('inp-kegiatan').value;
    const lok = document.getElementById('inp-lokasi').value;

    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: 'record_presensi',
                target_nia: finalNia,
                kegiatan: keg,
                lokasi: lok
            })
        });
        
        const data = await response.json();

        if (data.status) {
            showToast("✅ " + data.message, "success");
            addAttendeeToList(data.nama, data.nia);
        } else {
            showToast("❌ " + data.message, "error");
        }

    } catch (e) {
        showToast("Gagal koneksi server", "error");
    }

    // 4. Resume Kamera Otomatis (1.5 detik)
    setTimeout(() => {
        html5QrcodeScanner.resume();
        isScanning = false;
    }, 1500); 
}

// --- UI HELPERS ---
function showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    
    if (type === "success") toast.style.background = "#28a745";
    else if (type === "error") toast.style.background = "#dc3545";
    else toast.style.background = "#333";

    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 2500);
}

function addAttendeeToList(nama, nia) {
    const list = document.getElementById('attendee-list');
    const empty = document.getElementById('empty-state');
    if (empty) empty.style.display = 'none';

    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const item = document.createElement('div');
    item.className = 'attendee-item';
    item.innerHTML = `
        <div class="att-info">
            <h4 style="font-size:0.9rem; font-weight:600; margin:0;">${nama}</h4>
            <span style="font-size:0.8rem; color:#666;">${nia}</span>
        </div>
        <div style="font-size:0.8rem; font-weight:600; color:#0056b3;">${time}</div>
    `;
    
    // Tambah di paling atas
    list.insertBefore(item, list.firstChild);
}