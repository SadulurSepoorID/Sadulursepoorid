const API_URL = "https://script.google.com/macros/s/AKfycbzAQoSJorqEKzulk7hEntAw1OdCi3RMpjFzxxSe1zX0yE9fSRPUEb6TqtgapyTYcdFJeg/exec"; 

let html5Scanner = null;
let isScanning = false;
let selectedEvent = null;
let registeredNIAs = new Set(); // DATABASE LOKAL: Untuk nyimpen siapa aja yang udah absen di sesi ini

// --- CONFIG SUARA ---
let isSoundOn = true;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep() {
    if (!isSoundOn) return;
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // SETTINGAN BARU: LEBIH KERAS
    oscillator.type = "square"; // Tipe 'square' lebih nyaring/tajam daripada 'sine'
    oscillator.frequency.value = 1200; // Nada lebih tinggi (seperti scanner barcode asli)
    gainNode.gain.value = 1.0; // VOLUME MAX (100%) - Sebelumnya 0.1

    oscillator.start();
    setTimeout(() => { oscillator.stop(); }, 150); // Bunyi 'BEEP' pendek
}

function playErrorSound() {
    if (!isSoundOn) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = "sawtooth"; // Suara kasar untuk error
    oscillator.frequency.value = 200; // Nada rendah
    gainNode.gain.value = 1.0; 

    oscillator.start();
    setTimeout(() => { oscillator.stop(); }, 300); // Bunyi 'TEET' agak panjang
}

function toggleSound() {
    isSoundOn = !isSoundOn;
    const btn = document.getElementById('btn-sound');
    const icon = btn.querySelector('i');
    
    if(isSoundOn) {
        btn.style.background = "#e0f2fe";
        btn.style.color = "#0284c7";
        icon.className = "fa-solid fa-volume-high";
        showToast("Suara Aktif", "success");
        if (audioCtx.state === 'suspended') audioCtx.resume();
        playBeep(); 
    } else {
        btn.style.background = "#f1f5f9";
        btn.style.color = "#64748b";
        icon.className = "fa-solid fa-volume-xmark";
        showToast("Suara Mati", "normal");
    }
}
// --- END CONFIG SUARA ---

document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('user_session');
    if (!session) { window.location.replace("../login/index.html"); return; }
    window.currentUser = JSON.parse(session);

    const role = (window.currentUser.jabatan || "").toLowerCase().trim();
    if (role === "anggota") {
        initMember();
    } else {
        initAdmin();
    }
});

// LOGIKA ANGGOTA
function initMember() {
    document.getElementById('view-anggota').classList.remove('hidden');
    document.getElementById('lbl-nama').innerText = window.currentUser.nama;
    document.getElementById('lbl-nia').innerText = window.currentUser.nia;
    
    const content = `https://sadulursepoor.web.id/anggota/kta/${window.currentUser.nia}.html`;
    new QRCode(document.getElementById("qrcode"), { text: content, width: 180, height: 180, colorDark : "#2563eb", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H });

    loadMemberHistory();
}

async function loadMemberHistory() {
    try {
        const res = await fetch(API_URL, {
            method: 'POST', redirect: 'follow',
            body: JSON.stringify({ action: 'get_member_history', nia: window.currentUser.nia })
        });
        const json = await res.json();
        
        if (json.status) {
            document.getElementById('st-hadir').innerText = json.stats.hadir;
            document.getElementById('st-izin').innerText = json.stats.izin;
            document.getElementById('st-sakit').innerText = json.stats.sakit;
            document.getElementById('st-alpa').innerText = json.stats.alpa;
            document.getElementById('st-total').innerText = json.stats.total;

            const list = document.getElementById('history-list');
            list.innerHTML = "";
            
            if (json.history.length === 0) {
                list.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;">Belum ada riwayat kegiatan</div>';
            } else {
                json.history.forEach(item => {
                    let badgeClass = "bg-alpa";
                    if(item.status == "Hadir") badgeClass = "bg-hadir";
                    else if(item.status == "Izin") badgeClass = "bg-izin";
                    else if(item.status == "Sakit") badgeClass = "bg-sakit";

                    const div = document.createElement('div');
                    div.className = 'hist-item';
                    div.innerHTML = `
                        <div class="hist-info">
                            <h4>${item.nama}</h4>
                            <span><i class="fa-regular fa-calendar"></i> ${item.tanggal} &bull; <i class="fa-solid fa-location-dot"></i> ${item.lokasi}</span>
                        </div>
                        <span class="badge ${badgeClass}">${item.status}</span>
                    `;
                    list.appendChild(div);
                });
            }
        }
    } catch(e) { console.error(e); }
}

// LOGIKA ADMIN
function initAdmin() {
    document.getElementById('view-pengurus').classList.remove('hidden');
    loadEventDropdown();
}

async function loadEventDropdown() {
    const select = document.getElementById('sel-kegiatan');
    try {
        const res = await fetch(API_URL, { method: 'POST', redirect: 'follow', body: JSON.stringify({ action: 'get_activities' }) });
        const json = await res.json();
        
        select.innerHTML = '<option value="">-- Pilih Kegiatan --</option>';
        if (json.status && json.data.length > 0) {
            json.data.forEach(item => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify({ nama: item.nama, tanggal: item.tanggal_raw, lokasi: item.lokasi });
                opt.text = `${item.nama} (${item.tanggal_display}) - ${item.lokasi}`;
                select.appendChild(opt);
            });

            select.addEventListener('change', function() {
                if (this.value) {
                    selectedEvent = JSON.parse(this.value);
                    document.getElementById('admin-actions').classList.remove('hidden');
                    document.getElementById('loc-info').innerText = selectedEvent.lokasi;
                    loadAdminAttendeeList();
                } else {
                    selectedEvent = null;
                    document.getElementById('admin-actions').classList.add('hidden');
                }
            });
        }
    } catch(e) { select.innerHTML = '<option>Gagal memuat data</option>'; }
}

async function loadAdminAttendeeList() {
    const list = document.getElementById('admin-list-container');
    list.innerHTML = '<div style="text-align:center; padding:20px;">Memuat data anggota...</div>';
    
    try {
        const res = await fetch(API_URL, {
            method: 'POST', redirect: 'follow',
            body: JSON.stringify({ 
                action: 'get_activity_recap', 
                nama_kegiatan: selectedEvent.nama, 
                tanggal_kegiatan: selectedEvent.tanggal 
            })
        });
        const json = await res.json();
        
        list.innerHTML = "";
        registeredNIAs.clear(); // Reset daftar lokal
        
        if (json.status && json.list.length > 0) {
            json.list.forEach(user => {
                registeredNIAs.add(user.nia); // SIMPAN NIA YANG SUDAH ABSEN

                const div = document.createElement('div');
                div.className = 'att-item';
                const selectHtml = `
                    <select class="status-select ${user.status}" onchange="changeStatus('${user.nia}', this)">
                        <option value="Hadir" ${user.status=='Hadir'?'selected':''}>Hadir</option>
                        <option value="Izin" ${user.status=='Izin'?'selected':''}>Izin</option>
                        <option value="Sakit" ${user.status=='Sakit'?'selected':''}>Sakit</option>
                        <option value="Alpa" ${user.status=='Alpa'?'selected':''}>Alpa</option>
                    </select>
                `;
                div.innerHTML = `
                    <div class="att-info">
                        <h4>${user.nama}</h4>
                        <span>${user.nia}</span>
                    </div>
                    <div>${selectHtml}</div>
                `;
                list.appendChild(div);
            });
        }
    } catch(e) { list.innerHTML = "Gagal memuat."; }
}

async function changeStatus(nia, selectEl) {
    const newStatus = selectEl.value;
    selectEl.className = `status-select ${newStatus}`;
    try {
        await fetch(API_URL, {
            method: 'POST', redirect: 'follow',
            body: JSON.stringify({
                action: 'update_manual_status',
                nia: nia, status: newStatus,
                nama_kegiatan: selectedEvent.nama,
                tanggal_kegiatan: selectedEvent.tanggal,
                lokasi: selectedEvent.lokasi
            })
        });
        showToast(`Status ${nia} diubah: ${newStatus}`, "success");
    } catch(e) { showToast("Gagal update status", "error"); }
}

// SCANNER & MODAL
function startScanner() {
    if(!selectedEvent) return showToast("Pilih kegiatan dulu!", "error");
    if (audioCtx.state === 'suspended') audioCtx.resume();

    document.getElementById('card-setup').classList.add('hidden');
    document.getElementById('card-scanner').classList.remove('hidden');
    if(!html5Scanner) html5Scanner = new Html5Qrcode("reader");
    html5Scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScanSuccess).catch(err => { alert("Error Kamera"); stopScanner(); });
}

function stopScanner() {
    if(html5Scanner) html5Scanner.stop().then(()=>html5Scanner.clear()).catch(()=>{});
    document.getElementById('card-scanner').classList.add('hidden');
    document.getElementById('card-setup').classList.remove('hidden');
    loadAdminAttendeeList();
}

async function onScanSuccess(decodedText) {
    if(isScanning) return; 
    isScanning = true; 
    html5Scanner.pause();
    
    let match = decodedText.match(/(SS|SSBD)[-]?[0-9]+/i);
    let finalNia = match ? match[0] : decodedText;

    // CEK VALIDASI DUPLIKAT (FITUR BARU)
    if (registeredNIAs.has(finalNia)) {
        showToast("⚠️ " + finalNia + " SUDAH ABSEN!", "error");
        playErrorSound(); // Bunyi TEET (Error)
        setTimeout(() => { 
            html5Scanner.resume(); 
            isScanning = false; 
        }, 2500); // Jeda agak lama biar admin sadar
        return; // BERHENTI DISINI, JANGAN KIRIM KE SERVER
    }

    // Jika belum absen, lanjut proses
    playBeep(); // Bunyi BEEP (Sukses)
    showToast("Memproses: " + finalNia);

    try {
        const res = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: 'record_presensi', target_nia: finalNia,
                nama_kegiatan: selectedEvent.nama,
                tanggal_kegiatan: selectedEvent.tanggal,
                lokasi: selectedEvent.lokasi
            })
        });
        const data = await res.json();
        
        if (data.status) {
            showToast("✅ " + data.message, "success");
            registeredNIAs.add(finalNia); // Tambahkan ke daftar lokal supaya ga bisa scan lagi
        } else {
            showToast("❌ " + data.message, "error");
            playErrorSound();
        }
    } catch(e) { showToast("Error Koneksi", "error"); playErrorSound(); }
    
    setTimeout(() => { html5Scanner.resume(); isScanning = false; }, 1500);
}

// UI HELPERS
function openModal() { document.getElementById('modal-add').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal-add').classList.add('hidden'); }

async function saveActivity() {
    const nama = document.getElementById('new-nama').value;
    const lokasi = document.getElementById('new-lokasi').value;
    const tanggal = document.getElementById('new-tanggal').value;
    const btn = document.getElementById('btn-save');
    if(!nama || !lokasi || !tanggal) return showToast("Lengkapi data!", "error");
    btn.innerText = "Menyimpan..."; btn.disabled = true;
    try {
        await fetch(API_URL, { method: 'POST', redirect: 'follow', body: JSON.stringify({ action: 'add_activity', nama_kegiatan: nama, lokasi: lokasi, tanggal: tanggal }) });
        closeModal(); loadEventDropdown(); showToast("Kegiatan dibuat!", "success");
        document.getElementById('new-nama').value = ""; document.getElementById('new-lokasi').value = ""; document.getElementById('new-tanggal').value = "";
    } catch(e) { showToast("Gagal", "error"); }
    btn.innerText = "Simpan"; btn.disabled = false;
}

function showToast(msg, type="normal") {
    const toast = document.getElementById('toast'); toast.innerText = msg;
    toast.style.background = type=="success"?"#10b981":type=="error"?"#ef4444":"#1e293b";
    toast.style.display = "block"; setTimeout(() => { toast.style.display = "none"; }, 2500);
}