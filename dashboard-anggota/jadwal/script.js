let activitiesData = []; 

document.addEventListener('DOMContentLoaded', () => {
    try {
        window.currentUser = JSON.parse(localStorage.getItem('user_session'));
        if (!window.currentUser) throw new Error("No Session");
    } catch(e) {
        window.location.replace("../login/index.html");
        return;
    }
    initUI();
    loadActivities();
});

function initUI() {
    const dateEl = document.getElementById('date-display');
    if (dateEl) { 
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }; 
        dateEl.innerText = new Date().toLocaleDateString('id-ID', options); 
    }
    const role = (window.currentUser.jabatan || "").toLowerCase().trim();
    if (role !== "anggota") {
        document.getElementById('admin-panel').classList.remove('hidden');
    }
}

async function loadActivities() {
    const container = document.getElementById('timeline-container');
    const role = (window.currentUser.jabatan || "").toLowerCase().trim();
    const isPengurus = role !== "anggota";
    const myNIA = window.currentUser.nia;
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'get_activities' })
        });
        const result = await response.json();
        
        container.innerHTML = "";
        
        if (result.status && result.data.length > 0) {
            activitiesData = result.data;
            const now = new Date();
            const todayStart = new Date(); todayStart.setHours(0,0,0,0);

            result.data.forEach((item, index) => {
                const activityDate = new Date(item.tanggal_raw);
                
                // LOGIKA H-3 (Window Tiket Dibuka)
                const hMin3 = new Date(activityDate);
                hMin3.setDate(activityDate.getDate() - 3);

                // Cek status user & kuota
                const isRegistered = item.peserta && item.peserta.includes(myNIA);
                const kuotaMax = parseInt(item.batas_anggota) || 0;
                const terisi = parseInt(item.jumlah_peserta) || 0;
                const isFull = kuotaMax > 0 && terisi >= kuotaMax;

                let actionButton = "";

                // 1. PENGURUS
                if (isPengurus) {
                    actionButton = `<a href="../presensi/index.html" class="btn-presensi-link">Cek Presensi <i class="fa-solid fa-arrow-right"></i></a>`;
                } 
                // 2. ANGGOTA
                else {
                    // Kasus A: Sudah Lewat
                    if (activityDate < todayStart) {
                         actionButton = `<button class="btn-presensi-link" style="background:#ccc; cursor:not-allowed;"><i class="fa-solid fa-lock"></i> Selesai</button>`;
                    }
                    // Kasus B: SUDAH MASUK H-3 (Sampai Hari H)
                    else if (now >= hMin3) {
                        // Jika sudah punya tiket -> Tombol Absen/Tiket Ready
                        if (isRegistered) {
                             actionButton = `<a href="../presensi/index.html" class="btn-presensi-link">Absen Sekarang <i class="fa-solid fa-arrow-right"></i></a>`;
                        } 
                        // Jika belum punya tiket
                        else {
                            if (isFull) {
                                actionButton = `<button class="btn-presensi-link" style="background:#dc3545; cursor:not-allowed;"><i class="fa-solid fa-ban"></i> Kuota Penuh</button>`;
                            } else {
                                // TOMBOL AMBIL TIKET AKTIF
                                actionButton = `<button onclick="openTicketModal('${item.id}')" class="btn-presensi-link" style="background:#17a2b8; cursor:pointer;"><i class="fa-solid fa-hand-point-up"></i> Ambil Tiket</button>`;
                            }
                        }
                    }
                    // Kasus C: MASIH JAUH (Belum H-3)
                    else {
                        // Tombol dikunci (Belum dibuka)
                        actionButton = `<button class="btn-presensi-link" style="background:#ccc; cursor:not-allowed; color:#666;"><i class="fa-solid fa-clock"></i> Dibuka H-3</button>`;
                    }
                }

                // Badge Kuota
                let badgeKuota = "";
                if(kuotaMax > 0) {
                    let color = isFull ? "#dc3545" : "#28a745";
                    badgeKuota = `<span style="font-size:0.75rem; background:${color}; color:white; padding:2px 8px; border-radius:10px; margin-left:5px;">
                        <i class="fa-solid fa-users"></i> ${terisi}/${kuotaMax}
                    </span>`;
                }

                // Admin Buttons
                let adminButtons = "";
                if (isPengurus) {
                    adminButtons += `<button onclick="openEditModal(${index})" style="margin-right:5px; border:1px solid #f39c12; background:none; color:#f39c12; padding:6px 12px; border-radius:20px; cursor:pointer; font-weight:500; font-size:0.8rem;"><i class="fa-solid fa-pen"></i> Edit</button>`;
                    adminButtons += `<button onclick="deleteActivity('${item.id}', '${item.nama}')" style="margin-right:10px; border:1px solid #d32f2f; background:none; color:#d32f2f; padding:6px 12px; border-radius:20px; cursor:pointer; font-weight:500; font-size:0.8rem;"><i class="fa-solid fa-trash"></i></button>`;
                }

                const mapHtml = item.map_html ? item.map_html : `<div style="text-align:center; padding:30px; color:#aaa;">Peta belum disematkan.</div>`;

                const card = `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="activity-card">
                        <div class="card-main">
                            <div class="card-info">
                                <div class="date-badge mb-2">
                                    ${item.tanggal_display} • ${item.jam} WIB
                                    ${badgeKuota}
                                </div>
                                <h2>${item.nama}</h2>
                                <div class="meta-info">
                                    <span><i class="fa-solid fa-location-dot"></i> ${item.lokasi}</span>
                                </div>
                            </div>
                        </div>
                        <div class="card-actions">
                            <div style="display:flex; align-items:center;">
                                <button class="btn-toggle-map" onclick="toggleMap('map-${index}', this)">
                                    <i class="fa-solid fa-map"></i> Peta <i class="fa-solid fa-chevron-down"></i>
                                </button>
                            </div>
                            <div>
                                ${adminButtons}
                                ${actionButton}
                            </div>
                        </div>
                        <div id="map-${index}" class="map-drawer">
                            <div class="map-content">${mapHtml}</div>
                        </div>
                    </div>
                </div>`;
                container.innerHTML += card;
            });
        } else {
            container.innerHTML = `<div class="state-msg"><i class="fa-regular fa-calendar-xmark fa-2x"></i><br><br>Belum ada jadwal kegiatan.</div>`;
        }
    } catch (e) {
        container.innerHTML = `<div class="state-msg" style="color:red">Gagal memuat data.</div>`;
    }
}

// EDIT
function openEditModal(index) {
    const data = activitiesData[index];
    if(!data) return;
    document.getElementById('edit-id').value = data.id;
    document.getElementById('edit-nama').value = data.nama;
    document.getElementById('edit-lokasi').value = data.lokasi;
    document.getElementById('edit-tanggal').value = data.tanggal_raw;
    document.getElementById('edit-jam').value = data.jam;
    document.getElementById('edit-batas').value = data.batas_anggota;
    document.getElementById('edit-map').value = data.map_html;
    document.getElementById('modal-edit').classList.remove('hidden');
}
function closeEditModal() { document.getElementById('modal-edit').classList.add('hidden'); }
async function saveEditActivity() {
    const id = document.getElementById('edit-id').value;
    const nama = document.getElementById('edit-nama').value;
    const lokasi = document.getElementById('edit-lokasi').value;
    const tgl = document.getElementById('edit-tanggal').value;
    const jam = document.getElementById('edit-jam').value;
    const batas = document.getElementById('edit-batas').value;
    const map = document.getElementById('edit-map').value;

    const btn = document.getElementById('btn-save-edit');
    btn.innerHTML = "Menyimpan..."; btn.disabled = true;
    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'update_activity', id: id, nama_kegiatan: nama, lokasi: lokasi, tanggal: tgl, jam: jam, batas_anggota: batas, map_html: map })
        });
        const result = await response.json();
        if(result.status) { alert("Data berhasil diperbarui!"); closeEditModal(); loadActivities(); }
        else { alert("Gagal update: " + result.message); }
    } catch(e) { alert("Error koneksi."); }
    btn.innerHTML = "Simpan Perubahan"; btn.disabled = false;
}

// TAMBAH
async function addActivity() {
    const nama = document.getElementById('input-nama').value;
    const lokasi = document.getElementById('input-lokasi').value;
    const tanggal = document.getElementById('input-tanggal').value;
    const jam = document.getElementById('input-jam').value;
    const batas = document.getElementById('input-batas').value;
    const mapCode = document.getElementById('input-map').value;

    if (!nama || !lokasi || !tanggal) return alert("Mohon lengkapi Nama, Lokasi, dan Tanggal!");

    const btn = document.getElementById('btn-submit');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Menyimpan...'; btn.disabled = true;
    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'add_activity', nama_kegiatan: nama, lokasi: lokasi, tanggal: tanggal, jam: jam, batas_anggota: batas, map_html: mapCode })
        });
        const result = await response.json();
        if (result.status) {
            alert("Kegiatan Berhasil Ditambahkan!");
            document.getElementById('input-nama').value = "";
            document.getElementById('input-lokasi').value = "";
            document.getElementById('input-tanggal').value = "";
            document.getElementById('input-jam').value = "";
            document.getElementById('input-batas').value = ""; 
            document.getElementById('input-map').value = "";
            loadActivities();
        } else { alert("Gagal: " + result.message); }
    } catch (e) { alert("Error koneksi."); }
    btn.innerHTML = originalText; btn.disabled = false;
}

// HAPUS
async function deleteActivity(id, nama) {
    if (!confirm(`Hapus kegiatan "${nama}"?`)) return;
    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'delete_activity', id: id })
        });
        const result = await response.json();
        if (result.status) { alert("Dihapus."); loadActivities(); } 
        else { alert("Gagal: " + result.message); }
    } catch (e) { alert("Error koneksi."); }
}

// TIKET
function openTicketModal(idKegiatan) {
    document.getElementById('ticket-id-target').value = idKegiatan;
    document.getElementById('modal-ticket').classList.remove('hidden');
}
function closeTicketModal() { document.getElementById('modal-ticket').classList.add('hidden'); }
async function confirmTakeTicket() {
    const idKegiatan = document.getElementById('ticket-id-target').value;
    const btn = document.getElementById('btn-confirm-ticket');
    btn.innerHTML = 'Memproses...'; btn.disabled = true;
    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'take_ticket', id_kegiatan: idKegiatan, nia: window.currentUser.nia })
        });
        const result = await response.json();
        if (result.status) { alert("Berhasil! " + result.message); closeTicketModal(); loadActivities(); } 
        else { alert("Gagal: " + result.message); }
    } catch (e) { alert("Terjadi kesalahan koneksi."); }
    btn.innerHTML = 'Ambil Tiket'; btn.disabled = false;
}

// UTILS
function toggleMap(id, btn) {
    const el = document.getElementById(id);
    el.classList.toggle('open');
    const icon = btn.querySelector('.fa-chevron-down, .fa-chevron-up');
    if(el.classList.contains('open')) { icon.classList.replace('fa-chevron-down','fa-chevron-up'); btn.innerHTML = `<i class="fa-solid fa-map"></i> Tutup Peta <i class="fa-solid fa-chevron-up"></i>`; }
    else { icon.classList.replace('fa-chevron-up','fa-chevron-down'); btn.innerHTML = `<i class="fa-solid fa-map"></i> Peta <i class="fa-solid fa-chevron-down"></i>`; }
}
function toggleSidebar() { document.getElementById('mySidebar').classList.toggle('active'); document.getElementById('sidebar-overlay').classList.toggle('active'); }
function logout() { localStorage.removeItem('user_session'); window.location.replace("../login/index.html"); }
let inactivityTime = function () {
    let time; window.onload = resetTimer; document.onmousemove = resetTimer; document.onkeypress = resetTimer; document.ontouchstart = resetTimer; 
    function logoutUser() { alert("Sesi Anda berakhir."); logout(); }
    function resetTimer() { clearTimeout(time); time = setTimeout(logoutUser, 120000); }
};
inactivityTime();
history.pushState(null, null, location.href);
window.onpopstate = function () { history.go(1); };