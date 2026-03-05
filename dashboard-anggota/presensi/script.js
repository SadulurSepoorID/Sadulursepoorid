let html5Scanner = null;
let isScanning = false;
let selectedEvent = null;
let registeredNIAs = new Set(); 

// --- CONFIG SUARA ---
let isSoundOn = true;
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playBeep() {
    if (!isSoundOn) return;
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.type = "square"; 
        oscillator.frequency.value = 1200; 
        gainNode.gain.value = 1.0; 
        oscillator.start();
        setTimeout(() => { oscillator.stop(); }, 150); 
    } catch(e) { console.error("Audio Error:", e); }
}

function playErrorSound() {
    if (!isSoundOn) return;
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.type = "sawtooth"; 
        oscillator.frequency.value = 200; 
        gainNode.gain.value = 1.0; 
        oscillator.start();
        setTimeout(() => { oscillator.stop(); }, 300); 
    } catch(e) { console.error("Audio Error:", e); }
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
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        playBeep(); 
    } else {
        btn.style.background = "#f1f5f9";
        btn.style.color = "#64748b";
        icon.className = "fa-solid fa-volume-xmark";
        showToast("Suara Mati", "normal");
    }
}

// --- INIT APP ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil Sesi 
    try {
        window.currentUser = JSON.parse(localStorage.getItem('user_session'));
        if (!window.currentUser) throw new Error("No Session");
    } catch(e) {
        window.location.replace("../login/index.html");
        return;
    }

    // 2. Set Tanggal Header
    try {
        const dateEl = document.getElementById('date-display');
        if (dateEl) { 
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }; 
            dateEl.innerText = new Date().toLocaleDateString('id-ID', options); 
        }
    } catch(e) { console.error("Gagal set tanggal", e); }

    // 3. Init View Berdasarkan Role
    try {
        const role = (window.currentUser.jabatan || "").toLowerCase().trim();
        if (role === "anggota") {
            initMember();
        } else {
            initAdmin();
        }
    } catch(e) { console.error("Init View Error", e); }
});

// LOGIKA ANGGOTA
function initMember() {
    document.getElementById('view-anggota').classList.remove('hidden');
    document.getElementById('lbl-nama').innerText = window.currentUser.nama;
    document.getElementById('lbl-nia').innerText = window.currentUser.nia;
    
    const qrContainer = document.getElementById("qrcode");
    if(qrContainer) {
        const content = `https://sadulursepoor.web.id/anggota/kta/${window.currentUser.nia}.html`;
        new QRCode(qrContainer, { text: content, width: 180, height: 180, colorDark : "#0056b3", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H });
    }
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
        registeredNIAs.clear(); 
        
        if (json.status && json.list.length > 0) {
            
            // --- FITUR SORTING (Baru) ---
            // Urutkan: Belum Hadir (Alpa/Kosong) di ATAS, Sudah Hadir di BAWAH.
            // Jika status sama, urutkan Nama A-Z.
            json.list.sort((a, b) => {
                const getScore = (status) => {
                    // Skor 0 = Prioritas Tinggi (Belum Absen)
                    // Skor 1 = Prioritas Rendah (Sudah Absen/Izin/Sakit)
                    if (!status || status === "" || status === "Alpa") return 0;
                    return 1;
                };

                const scoreA = getScore(a.status);
                const scoreB = getScore(b.status);

                if (scoreA !== scoreB) {
                    return scoreA - scoreB;
                }
                return a.nama.localeCompare(b.nama);
            });
            // ---------------------------

            json.list.forEach(user => {
                // Hanya kunci Scanner jika status SUDAH TERISI dan BUKAN Alpa
                if (user.status && user.status !== "" && user.status !== "Alpa") {
                    registeredNIAs.add(user.nia); 
                }

                // Cek status "Selesai" untuk visual
                const isDone = (user.status && user.status !== "" && user.status !== "Alpa");

                const div = document.createElement('div');
                div.className = 'att-item';
                
                // Jika sudah absen, beri background abu-abu
                if (isDone) {
                    div.style.background = "#f8fafc";
                    div.style.opacity = "0.75";
                }

                const selectHtml = `
                    <select class="status-select ${user.status}" onchange="changeStatus('${user.nia}', this)">
                        <option value="" ${!user.status || user.status=='' ? 'selected' : ''} style="color:#999;">-- Belum --</option>
                        <option value="Hadir" ${user.status=='Hadir'?'selected':''}>Hadir</option>
                        <option value="Izin" ${user.status=='Izin'?'selected':''}>Izin</option>
                        <option value="Sakit" ${user.status=='Sakit'?'selected':''}>Sakit</option>
                        <option value="Alpa" ${user.status=='Alpa'?'selected':''}>Alpa</option>
                    </select>
                `;
                
                div.innerHTML = `
                    <div class="att-info">
                        <h4 style="${isDone ? 'color:#64748b' : ''}">${user.nama}</h4>
                        <span>${user.nia}</span>
                    </div>
                    <div>${selectHtml}</div>
                `;
                list.appendChild(div);
            });
        } else {
            list.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">Belum ada data presensi.</div>';
        }
    } catch(e) { list.innerHTML = "Gagal memuat."; console.error(e); }
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

        // Update Set registeredNIAs secara real-time
        // Jika status diubah jadi Kosong/Alpa, hapus dari list registered (agar bisa discan ulang jika perlu)
        if (newStatus === "" || newStatus === "Alpa") {
            registeredNIAs.delete(nia); 
            showToast(`Status ${nia} di-reset`, "normal");
        } else {
            registeredNIAs.add(nia);
            showToast(`Status ${nia} diubah: ${newStatus}`, "success");
        }
        
        // Opsional: Reload list jika ingin sorting langsung berubah saat itu juga
        // loadAdminAttendeeList(); 

    } catch(e) { showToast("Gagal update status", "error"); }
}

function startScanner() {
    if(!selectedEvent) return showToast("Pilih kegiatan dulu!", "error");
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    document.getElementById('card-setup').classList.add('hidden');
    document.getElementById('card-scanner').classList.remove('hidden');

    if(!html5Scanner) html5Scanner = new Html5Qrcode("reader");

    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

    html5Scanner.start({ facingMode: "environment" }, config, onScanSuccess)
    .catch(err => { alert("Gagal membuka kamera. Pastikan izin diberikan."); stopScanner(); });
}

function stopScanner() {
    if(html5Scanner) html5Scanner.stop().then(()=>html5Scanner.clear()).catch(()=>{});
    document.getElementById('card-scanner').classList.add('hidden');
    document.getElementById('card-setup').classList.remove('hidden');
    loadAdminAttendeeList(); // Saat scanner ditutup, list direfresh & disorting ulang
}

async function onScanSuccess(decodedText) {
    if(isScanning) return; 
    isScanning = true; 
    html5Scanner.pause();
    
    let match = decodedText.match(/(SS|SSBD)[-]?[0-9]+/i);
    let finalNia = match ? match[0] : decodedText;

    if (registeredNIAs.has(finalNia)) {
        showToast("⚠️ " + finalNia + " SUDAH ABSEN!", "error");
        playErrorSound(); 
        setTimeout(() => { html5Scanner.resume(); isScanning = false; }, 2500); 
        return; 
    }

    playBeep(); 
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
            registeredNIAs.add(finalNia); 
        } else {
            showToast("❌ " + data.message, "error");
            playErrorSound();
        }
    } catch(e) { showToast("Error Koneksi", "error"); playErrorSound(); }
    
    setTimeout(() => { html5Scanner.resume(); isScanning = false; }, 1500);
}

function showToast(msg, type="normal") {
    const toast = document.getElementById('toast'); toast.innerText = msg;
    toast.style.background = type=="success"?"#10b981":type=="error"?"#ef4444":"#1e293b";
    toast.style.display = "block"; setTimeout(() => { toast.style.display = "none"; }, 2500);
}

function toggleSidebar() { 
    const sidebar = document.getElementById('mySidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if(sidebar) sidebar.classList.toggle('active'); 
    if(overlay) overlay.classList.toggle('active'); 
}

function logout() { 
    localStorage.removeItem('user_session'); 
    window.location.replace("../login/index.html"); 
}

let inactivityTime = function () {
    let time;
    window.onload = resetTimer;
    document.onmousemove = resetTimer;
    document.onkeypress = resetTimer;
    document.ontouchstart = resetTimer; 
    function logoutUser() { alert("Sesi Anda telah berakhir."); logout(); }
    function resetTimer() { clearTimeout(time); time = setTimeout(logoutUser, 120000); }
};
inactivityTime();

history.pushState(null, null, location.href);
window.onpopstate = function () { history.go(1); };