// Global variable untuk menyimpan data sementara (untuk fungsi edit)
let activitiesData = []; 

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('user_session')) { window.location.replace("../login/index.html"); return; }
    window.currentUser = JSON.parse(localStorage.getItem('user_session'));
    initUI();
    loadActivities();
});

function initUI() {
    const dateEl = document.getElementById('date-display');
    if (dateEl) { const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }; dateEl.innerText = new Date().toLocaleDateString('id-ID', options); }
    
    // Cek Role Pengurus
    const role = (window.currentUser.jabatan || "").toLowerCase().trim();
    if (role !== "anggota") {
        document.getElementById('admin-panel').classList.remove('hidden');
    }
}

async function loadActivities() {
    const container = document.getElementById('timeline-container');
    const isPengurus = (window.currentUser.jabatan || "").toLowerCase().trim() !== "anggota";
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'get_activities' })
        });
        const result = await response.json();
        
        container.innerHTML = "";
        
        if (result.status && result.data.length > 0) {
            activitiesData = result.data; // Simpan data global
            
            // Tanggal Hari Ini (00:00:00) untuk komparasi
            const today = new Date();
            today.setHours(0,0,0,0);

            result.data.forEach((item, index) => {
                // 1. Logic Tombol Absen (Mati jika lewat tanggal)
                const activityDate = new Date(item.tanggal_raw);
                let btnAttr = "";
                let btnText = `Absen Sekarang <i class="fa-solid fa-arrow-right"></i>`;
                
                if (activityDate < today) {
                    btnAttr = `style="background:#ccc; cursor:not-allowed; pointer-events:none;"`;
                    btnText = `<i class="fa-solid fa-lock"></i> Selesai`;
                }

                // 2. Logic Tombol Edit (Khusus Pengurus)
                let btnEdit = "";
                if (isPengurus) {
                    btnEdit = `<button onclick="openEditModal(${index})" style="margin-right:10px; border:1px solid #f39c12; background:none; color:#f39c12; padding:6px 15px; border-radius:20px; cursor:pointer; font-weight:500; font-size:0.8rem;"><i class="fa-solid fa-pen"></i> Edit</button>`;
                }

                const mapHtml = item.map_html ? item.map_html : `<div style="text-align:center; padding:30px; color:#aaa;">Peta belum disematkan.</div>`;

                // Render Card
                const card = `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="activity-card">
                        <div class="card-main">
                            <div class="card-info">
                                <div class="date-badge mb-2">${item.tanggal_display} &bull; ${item.jam} WIB</div>
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
                                ${btnEdit}
                                <a href="../presensi/index.html" class="btn-presensi-link" ${btnAttr}>
                                    ${btnText}
                                </a>
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

// --- LOGIKA EDIT ---
function openEditModal(index) {
    const data = activitiesData[index];
    if(!data) return;
    document.getElementById('edit-id').value = data.id;
    document.getElementById('edit-nama').value = data.nama;
    document.getElementById('edit-lokasi').value = data.lokasi;
    document.getElementById('edit-tanggal').value = data.tanggal_raw;
    document.getElementById('edit-jam').value = data.jam;
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
    const map = document.getElementById('edit-map').value;

    const btn = document.getElementById('btn-save-edit');
    btn.innerHTML = "Menyimpan..."; btn.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'update_activity', id: id, nama_kegiatan: nama, lokasi: lokasi, tanggal: tgl, jam: jam, map_html: map })
        });
        const result = await response.json();
        if(result.status) { alert("Data berhasil diperbarui!"); closeEditModal(); loadActivities(); }
        else { alert("Gagal update: " + result.message); }
    } catch(e) { alert("Error koneksi."); }
    btn.innerHTML = "Simpan Perubahan"; btn.disabled = false;
}

// --- LOGIKA TAMBAH ---
async function addActivity() {
    const nama = document.getElementById('input-nama').value;
    const lokasi = document.getElementById('input-lokasi').value;
    const tanggal = document.getElementById('input-tanggal').value;
    const jam = document.getElementById('input-jam').value;
    const mapCode = document.getElementById('input-map').value;

    if (!nama || !lokasi || !tanggal) return alert("Mohon lengkapi Nama, Lokasi, dan Tanggal!");

    const btn = document.getElementById('btn-submit');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Menyimpan...'; btn.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'add_activity', nama_kegiatan: nama, lokasi: lokasi, tanggal: tanggal, jam: jam, map_html: mapCode })
        });
        const result = await response.json();
        if (result.status) {
            alert("Kegiatan Berhasil Ditambahkan!");
            document.getElementById('input-nama').value = "";
            document.getElementById('input-lokasi').value = "";
            document.getElementById('input-tanggal').value = "";
            document.getElementById('input-jam').value = "";
            document.getElementById('input-map').value = "";
            loadActivities();
        } else { alert("Gagal: " + result.message); }
    } catch (e) { alert("Error koneksi."); }
    btn.innerHTML = originalText; btn.disabled = false;
}

// Utilitas
function toggleMap(id, btn) {
    const el = document.getElementById(id);
    el.classList.toggle('open');
    const icon = btn.querySelector('.fa-chevron-down, .fa-chevron-up');
    if(el.classList.contains('open')) { icon.classList.replace('fa-chevron-down','fa-chevron-up'); btn.innerHTML = `<i class="fa-solid fa-map"></i> Tutup Peta <i class="fa-solid fa-chevron-up"></i>`; }
    else { icon.classList.replace('fa-chevron-up','fa-chevron-down'); btn.innerHTML = `<i class="fa-solid fa-map"></i> Peta <i class="fa-solid fa-chevron-down"></i>`; }
}
function toggleSidebar() { document.getElementById('mySidebar').classList.toggle('active'); document.getElementById('sidebar-overlay').classList.toggle('active'); }
function logout() { localStorage.removeItem('user_session'); window.location.replace("../login/index.html"); }

// --- FITUR KEAMANAN (SERAGAM DENGAN DASHBOARD) ---
let inactivityTime = function () {
    let time;
    window.onload = resetTimer;
    document.onmousemove = resetTimer;
    document.onkeypress = resetTimer;
    document.ontouchstart = resetTimer; 

    function logoutUser() {
        alert("Sesi Anda telah berakhir karena tidak aktif.");
        logout();
    }

    function resetTimer() {
        clearTimeout(time);
        time = setTimeout(logoutUser, 120000); // 2 menit
    }
};
inactivityTime();

history.pushState(null, null, location.href);
window.onpopstate = function () {
    history.go(1);
};