// =========================================
// MSDM DASHBOARD SCRIPT - CLEAN UI VERSION
// =========================================

let allMembers = [];
let templates = [];
let currentUser = null;

// --- 1. INISIALISASI & AUTH ---
document.addEventListener('DOMContentLoaded', () => {
    if (typeof API_URL === 'undefined') { alert("Error: config.js belum dimuat!"); return; }

    const sessionRaw = localStorage.getItem('user_session');
    if (!sessionRaw) { window.location.replace("../login/index.html"); return; }
    
    try { currentUser = JSON.parse(sessionRaw); } 
    catch (e) { localStorage.removeItem('user_session'); window.location.replace("../login/index.html"); return; }

    const role = (currentUser.jabatan || "").toLowerCase().trim();
    const isAuthorized = role.includes('ketua') || role.includes('sdm') || role.includes('msdm');

    if (!isAuthorized) {
        alert("Akses Ditolak! Halaman ini khusus Tim SDM & Ketua.");
        window.location.replace("../dashboard/index.html");
        return;
    }

    updateAdminUI();
    loadDashboardData();
    loadTemplates();

    const searchInput = document.getElementById('search-input');
    if(searchInput) { searchInput.addEventListener('keyup', (e) => { renderTable(e.target.value); }); }
});

// --- 2. UI UTILITY ---
function updateAdminUI() {
    const elName = document.getElementById('admin-name');
    const elRole = document.getElementById('admin-role');
    if(elName) elName.textContent = currentUser.nama;
    if(elRole) elRole.textContent = currentUser.jabatan;
}

function handleLogout() {
    if(confirm("Keluar dari panel admin?")) {
        localStorage.removeItem('user_session');
        window.location.replace('../login/index.html');
    }
}

// Sidebar Logic (Updated for Overlay)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function closeModal(id) { 
    document.getElementById(id).classList.add('hidden'); 
}

// --- 3. DATA RENDERING (CLEANER HTML) ---
async function loadDashboardData() {
    const tbody = document.getElementById('member-table-body');
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Memuat data terbaru...</td></tr>`;

    try {
        const res = await fetch(API_URL, {
            method: 'POST', redirect: 'follow',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'get_msdm_dashboard' })
        });
        const data = await res.json();
        if (data.status) {
            allMembers = data.members;
            updateStats();
            renderTable();
        } else { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Gagal memuat data.</td></tr>`; }
    } catch (e) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Error koneksi server.</td></tr>`; }
}

function updateStats() {
    const elTotal = document.getElementById('total-anggota');
    const elMasalah = document.getElementById('anggota-bermasalah');
    if(elTotal) elTotal.textContent = allMembers.length;
    const bermasalah = allMembers.filter(m => m.poin < 100).length;
    if(elMasalah) elMasalah.textContent = bermasalah;
}

function renderTable(keyword = "") {
    const tbody = document.getElementById('member-table-body');
    if(!tbody) return;
    tbody.innerHTML = "";

    const filtered = allMembers.filter(m => 
        m.nama.toLowerCase().includes(keyword.toLowerCase()) || 
        m.nia.toLowerCase().includes(keyword.toLowerCase())
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#999;">Tidak ada data ditemukan.</td></tr>`;
        return;
    }

    filtered.forEach(m => {
        let badgeStyle = "color:#166534; background:#dcfce7; padding:4px 8px; border-radius:12px; font-weight:bold; font-size:0.9rem;"; 
        let statusText = '<small style="color:#2e7d32"><i class="fa-solid fa-check-circle"></i> Aman</small>';
        
        if (m.poin < 50) {
            badgeStyle = "color:#991b1b; background:#fee2e2; padding:4px 8px; border-radius:12px; font-weight:bold; font-size:0.9rem;"; 
            statusText = '<small style="color:#c62828; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> SP KERAS</small>';
        } else if (m.poin < 80) {
            badgeStyle = "color:#854d0e; background:#fef9c3; padding:4px 8px; border-radius:12px; font-weight:bold; font-size:0.9rem;"; 
            statusText = '<small style="color:#ef6c00; font-weight:600;"><i class="fa-solid fa-circle-exclamation"></i> Peringatan</small>';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${m.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.nama)}&background=eee&color=333`}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
                    <div>
                        <div style="font-weight:600; color:#1f2937;">${m.nama}</div>
                        <div style="font-size:0.75rem; color:#6b7280;">${m.nia}</div>
                    </div>
                </div>
            </td>
            <td>${m.jabatan}</td>
            <td style="text-align:center;"><span style="${badgeStyle}">${m.poin}</span></td>
            <td>${statusText}</td>
            <td style="text-align:right;">
                <button onclick="openSanksiModal('${m.nia}')" style="background:#d32f2f; color:white; border:none; width:32px; height:32px; border-radius:6px; cursor:pointer; margin-right:4px;" title="Beri Sanksi"><i class="fa-solid fa-gavel"></i></button>
                <button onclick="openHistoryAdmin('${m.nia}', '${m.nama}')" style="background:#0277bd; color:white; border:none; width:32px; height:32px; border-radius:6px; cursor:pointer;" title="Lihat Riwayat"><i class="fa-solid fa-clock-rotate-left"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- 4. LOGIKA SANKSI & TEMPLATE ---

function openSanksiModal(nia) {
    const user = allMembers.find(m => m.nia === nia);
    if(!user) return;

    document.getElementById('target-nia').value = user.nia;
    document.getElementById('target-nama').value = user.nama;
    document.getElementById('display-target-nama').value = user.nama;

    const now = new Date();
    const future = new Date(); future.setMonth(future.getMonth() + 3);
    
    document.getElementById('sanksi-start-date').value = now.toISOString().split('T')[0];
    document.getElementById('sanksi-end-date').value = future.toISOString().split('T')[0];

    document.getElementById('sanksi-masalah').value = "";
    document.getElementById('sanksi-poin').value = "";
    document.getElementById('sanksi-tipe').value = "violation";
    document.getElementById('select-template-apply').value = "";
    
    toggleSanksiType();
    document.getElementById('sanksi-modal').classList.remove('hidden');
}

function toggleSanksiType() {
    const type = document.getElementById('sanksi-tipe').value;
    const label = document.getElementById('label-poin');
    const input = document.getElementById('sanksi-poin');
    const templateGroup = document.getElementById('group-pilih-template');
    const templateSelect = document.getElementById('select-template-apply');
    
    if (type === 'reward') {
        label.innerText = "Poin Tambahan (Pemutihan)";
        label.style.color = "#2e7d32"; 
        input.placeholder = "Contoh: 10";
        
        // HIDE Template
        if(templateGroup) templateGroup.style.display = 'none';
        // Reset Template Selection
        if(templateSelect) templateSelect.value = "";
        
    } else {
        label.innerText = "Poin Pengurang (Sanksi)";
        label.style.color = "#d32f2f"; 
        input.placeholder = "Contoh: 10";
        
        // SHOW Template
        if(templateGroup) templateGroup.style.display = 'block';
    }
}

async function submitSanksi() {
    const nia = document.getElementById('target-nia').value;
    const nama = document.getElementById('target-nama').value;
    const masalah = document.getElementById('sanksi-masalah').value;
    let poin = parseInt(document.getElementById('sanksi-poin').value);
    const startDate = document.getElementById('sanksi-start-date').value;
    const endDate = document.getElementById('sanksi-end-date').value;
    const type = document.getElementById('sanksi-tipe').value;

    if (!masalah || !poin || !startDate || !endDate) return alert("Mohon lengkapi semua data.");

    if (type === 'reward') poin = -Math.abs(poin);
    else poin = Math.abs(poin);

    if (!confirm(`Simpan data ini?`)) return;

    const btn = document.querySelector('#sanksi-modal .btn-save');
    const originalText = btn.innerText;
    btn.innerText = "Menyimpan...";
    btn.disabled = true;

    try {
        const res = await fetch(API_URL, {
            method: 'POST', redirect: 'follow',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: 'submit_sanction',
                target_nia: nia, target_nama: nama, admin_nia: currentUser.nia,
                masalah: masalah, poin: poin,
                start_date: startDate, end_date: endDate
            })
        });
        const data = await res.json();
        if(data.status) {
            alert("Data berhasil disimpan!");
            closeModal('sanksi-modal');
            loadDashboardData();
        } else { alert("Gagal: " + data.message); }
    } catch(e) { alert("Error koneksi server."); }

    btn.innerText = originalText;
    btn.disabled = false;
}

function openTemplateModal() {
    document.getElementById('template-modal').classList.remove('hidden');
    loadTemplates();
}

async function loadTemplates() {
    const container = document.getElementById('template-list-container');
    const dropdown = document.getElementById('select-template-apply');
    
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'get_violation_templates' }) });
        const data = await res.json();
        
        if (data.status) {
            templates = data.templates;
            if(container) {
                container.innerHTML = "";
                if(templates.length === 0) container.innerHTML = "<small>Belum ada template.</small>";
                templates.forEach(t => {
                    container.innerHTML += `
                        <div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #f0f0f0;">
                            <span>${t.judul}</span>
                            <strong style="color:#c62828">-${t.poin}</strong>
                        </div>`;
                });
            }
            if(dropdown) {
                dropdown.innerHTML = '<option value="">-- Pilih Template --</option>';
                templates.forEach((t, index) => {
                    const opt = document.createElement('option');
                    opt.value = index;
                    opt.text = `${t.judul} (-${t.poin})`;
                    dropdown.appendChild(opt);
                });
            }
        }
    } catch (e) { console.error(e); }
}

async function saveTemplate() {
    const judul = document.getElementById('tmpl-judul').value;
    const poin = document.getElementById('tmpl-poin').value;
    if(!judul || !poin) return alert("Isi judul dan poin default!");
    try {
        const res = await fetch(API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'save_violation_template', judul: judul, poin: poin })
        });
        const data = await res.json();
        if(data.status) {
            alert("Template tersimpan!");
            document.getElementById('tmpl-judul').value = "";
            document.getElementById('tmpl-poin').value = "";
            loadTemplates();
        }
    } catch(e) { alert("Gagal menyimpan"); }
}

function applyTemplateToForm() {
    const dropdown = document.getElementById('select-template-apply');
    const index = dropdown.value;
    if (index !== "") {
        const t = templates[index];
        document.getElementById('sanksi-masalah').value = t.judul;
        document.getElementById('sanksi-poin').value = t.poin;
        document.getElementById('sanksi-tipe').value = "violation";
        toggleSanksiType();
    }
}

async function openHistoryAdmin(nia, nama) {
    document.getElementById('history-modal').classList.remove('hidden');
    const list = document.getElementById('admin-history-list');
    const btnDel = document.getElementById('btn-delete-all');
    
    list.innerHTML = `<p style="text-align:center; color:#888;">Mengambil riwayat...</p>`;
    btnDel.onclick = function() { hapusSemuaData(nia, nama); };

    try {
        const res = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'get_sanction_history', nia: nia })
        });
        const data = await res.json();
        
        if (data.status && data.history.length > 0) {
            let html = '';
            data.history.forEach(h => {
                const isViolation = h.raw_poin > 0;
                const color = isViolation ? '#d32f2f' : '#2e7d32'; 
                const bg = isViolation ? '#ffebee' : '#e8f5e9';
                const sign = isViolation ? '-' : '+';
                
                html += `
                <div style="background:${bg}; padding:10px; border-radius:6px; margin-bottom:8px; border-left:4px solid ${color}; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:600; color:#333;">${h.masalah}</div>
                        <div style="font-size:0.75rem; color:#666;">${h.tanggal} <span style="margin:0 5px;">•</span> Exp: ${h.valid_until}</div>
                    </div>
                    <div style="font-weight:bold; font-size:1rem; color:${color};">${sign}${h.poin}</div>
                </div>`;
            });
            list.innerHTML = html;
        } else { list.innerHTML = `<p style="text-align:center; padding:20px; color:#888;">Belum ada riwayat.</p>`; }
    } catch (e) { list.innerHTML = `<p style="text-align:center; color:red;">Gagal memuat riwayat.</p>`; }
}

async function hapusSemuaData(nia, nama) {
    if (!confirm(`⚠️ PERINGATAN: Hapus SEMUA riwayat ${nama}? Poin akan kembali bersih (100).`)) return;
    try {
        const res = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'delete_all_sanctions', nia: nia })
        });
        const data = await res.json();
        if(data.status) { alert(data.message); closeModal('history-modal'); loadDashboardData(); } 
        else { alert("Gagal: " + data.message); }
    } catch(e) { alert("Gagal menghapus data."); }
}