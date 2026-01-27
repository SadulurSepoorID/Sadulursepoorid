// =========================================
// PANTAU PRESENSI SCRIPT
// =========================================

let allData = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cek Auth
    const sessionRaw = localStorage.getItem('user_session');
    if (!sessionRaw) { window.location.replace("../../login/index.html"); return; }
    currentUser = JSON.parse(sessionRaw);
    document.getElementById('admin-name').textContent = currentUser.nama;

    // 2. Load Data
    loadData();

    // 3. Listener Search
    document.getElementById('search-input').addEventListener('keyup', () => renderTable());
});

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function handleLogout() {
    if(confirm("Keluar dari panel?")) {
        localStorage.removeItem('user_session');
        window.location.replace('../../login/index.html');
    }
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// --- CORE LOGIC ---

async function loadData() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Mengambil data presensi...</td></tr>`;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_presence_monitoring' })
        });
        const data = await res.json();
        
        if (data.status) {
            allData = data.data;
            updateStats();
            renderTable();
        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Gagal memuat data.</td></tr>`;
        }
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error koneksi.</td></tr>`;
    }
}

function updateStats() {
    document.getElementById('total-anggota').textContent = allData.length;
    // Hitung yang Alpa > 3
    const dangerCount = allData.filter(m => m.stats.alpa > 3).length;
    document.getElementById('total-pengawasan').textContent = dangerCount;
}

function renderTable() {
    const keyword = document.getElementById('search-input').value.toLowerCase();
    const onlyDanger = document.getElementById('filter-pengawasan').checked;
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = "";

    const filtered = allData.filter(m => {
        const matchName = m.nama.toLowerCase().includes(keyword) || m.nia.toLowerCase().includes(keyword);
        const matchDanger = onlyDanger ? (m.stats.alpa > 3) : true;
        return matchName && matchDanger;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">Tidak ada data.</td></tr>`;
        return;
    }

    filtered.forEach(m => {
        const isDanger = m.stats.alpa > 3;
        
        // Tombol Sanksi (Hanya muncul jika Alpa > 3)
        let btnSanksi = "";
        if (isDanger) {
            btnSanksi = `<button onclick="applyAutoSanction('${m.nia}', '${m.nama}')" 
                style="background:#d32f2f; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; margin-right:4px; font-size:0.8rem;" 
                title="Terapkan Sanksi (-50 Poin)">
                <i class="fa-solid fa-gavel"></i> SP
            </button>`;
        }

        // Tombol WA
        let waLink = "#";
        if (m.wa) {
            let num = m.wa.toString().replace(/\D/g, '');
            if (num.startsWith('0')) num = '62' + num.slice(1);
            waLink = `https://wa.me/${num}?text=Halo%20${encodeURIComponent(m.nama)},%20mohon%20konfirmasi%20terkait%20ketidakhadiran%20Anda.`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${m.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.nama)}`}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                    <div>
                        <div style="font-weight:600; font-size:0.95rem;">${m.nama}</div>
                        <div style="font-size:0.75rem; color:#666;">${m.nia}</div>
                    </div>
                </div>
            </td>
            <td style="text-align:center; color:#15803d; font-weight:600;">${m.stats.hadir}</td>
            <td style="text-align:center; color:#ca8a04;">${m.stats.izin + m.stats.sakit}</td>
            <td style="text-align:center;">
                <span style="${isDanger ? 'color:#b91c1c; font-weight:bold; font-size:1rem;' : ''}">${m.stats.alpa}</span>
            </td>
            <td>
                ${isDanger 
                    ? '<span class="badge-alpa"><i class="fa-solid fa-triangle-exclamation"></i> Pengawasan</span>' 
                    : '<span class="badge-aman"><i class="fa-solid fa-check"></i> Aman</span>'}
            </td>
            <td style="text-align:right;">
                ${btnSanksi}
                <button onclick="openDetail('${m.nia}')" style="background:#0284c7; color:white; border:none; width:32px; height:32px; border-radius:6px; cursor:pointer; margin-right:4px;" title="Lihat Detail">
                    <i class="fa-solid fa-eye"></i>
                </button>
                <a href="${waLink}" target="_blank">
                    <button class="wa-btn" title="Chat WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
                </a>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- ACTION LOGIC ---

async function openDetail(nia) {
    const modal = document.getElementById('detail-modal');
    const container = document.getElementById('history-list');
    const user = allData.find(u => u.nia === nia);
    
    if(!user) return;

    // Isi Header Modal
    document.getElementById('detail-nama').innerText = user.nama;
    document.getElementById('detail-nia').innerText = user.nia;
    document.getElementById('d-hadir').innerText = user.stats.hadir;
    document.getElementById('d-izin').innerText = user.stats.izin + user.stats.sakit;
    document.getElementById('d-alpa').innerText = user.stats.alpa;

    container.innerHTML = '<p style="text-align:center; color:#888;">Memuat riwayat...</p>';
    modal.classList.remove('hidden');

    try {
        // Gunakan API get_member_history yang sudah ada
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_member_history', nia: nia })
        });
        const data = await res.json();

        if (data.status && data.history.length > 0) {
            let html = '';
            data.history.forEach(h => {
                let color = '#333';
                if(h.status === 'Hadir') color = 'green';
                else if(h.status === 'Alpa') color = 'red';
                else color = 'orange';

                html += `
                <div class="detail-row">
                    <div>
                        <div style="font-weight:600;">${h.nama}</div>
                        <small style="color:#666;">${h.tanggal}</small>
                    </div>
                    <div style="font-weight:bold; color:${color};">${h.status}</div>
                </div>`;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p style="text-align:center;">Belum ada riwayat kegiatan.</p>';
        }
    } catch(e) {
        container.innerHTML = '<p style="text-align:center; color:red;">Gagal memuat detail.</p>';
    }
}

async function applyAutoSanction(nia, nama) {
    if (!confirm(`⚠️ Konfirmasi Sanksi\n\nAnggota: ${nama}\nMasalah: Alpa lebih dari 3 kali\nPoin: -50\n\nApakah Anda yakin ingin menerapkan sanksi ini?`)) return;

    // Tanggal hari ini s/d 3 bulan ke depan
    const now = new Date();
    const future = new Date(); 
    future.setMonth(future.getMonth() + 3);

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'submit_sanction',
                target_nia: nia,
                target_nama: nama,
                admin_nia: currentUser.nia,
                masalah: "Sanksi Disiplin: Alpa > 3 Kali", // Judul Sanksi Otomatis
                poin: 50, // Poin Pengurang (Sesuai request)
                start_date: now.toISOString().split('T')[0],
                end_date: future.toISOString().split('T')[0]
            })
        });
        const data = await res.json();
        
        if (data.status) {
            alert("Sanksi berhasil diterapkan!");
            // Opsional: Reload data poin di dashboard utama jika perlu, atau cukup alert saja
        } else {
            alert("Gagal: " + data.message);
        }
    } catch (e) {
        alert("Error koneksi.");
    }
}