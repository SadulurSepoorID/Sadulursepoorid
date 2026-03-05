document.addEventListener('DOMContentLoaded', () => {
    // Membaca sesi pengguna dari localStorage
    const user = JSON.parse(localStorage.getItem('user_session'));
    
    // Proteksi Akses: Hanya untuk Ketua
    if (!user || !user.jabatan || !user.jabatan.toLowerCase().includes('ketua')) {
        alert("⛔ AKSES DITOLAK! Halaman ini eksklusif hanya untuk Ketua Umum.");
        window.location.replace("../dashboard/index.html");
        return;
    }
    
    // Set data pengguna ke antarmuka
    document.getElementById('user-name').innerText = user.nama || "Fathir Ahmad Maulana";
    // Mengambil inisial untuk avatar
    const initial = (user.nama || "F").charAt(0).toUpperCase();
    document.querySelector('.avatar').innerText = initial;

    window.currentUser = user;
    
    // Muat data awal
    loadDailyConfig();
    loadCatalog();
});

// ==========================================
// 1. KONTROL ANTARMUKA (UI)
// ==========================================
function toggleSidebar() {
    document.getElementById('mySidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

function switchTab(evt, tabId) {
    // Reset status aktif
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    
    // Set tab yang dipilih menjadi aktif
    document.getElementById(tabId).classList.add('active');
    evt.currentTarget.classList.add('active');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    // Styling dasar untuk toast modern
    toast.style.cssText = `
        background: white; border-radius: 12px; padding: 16px 24px; 
        box-shadow: 0 10px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05); 
        display: flex; align-items: center; gap: 14px; 
        margin-top: 10px; transform: translateX(120%); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        border-left: 4px solid ${type === 'success' ? '#059669' : '#dc2626'}; min-width: 280px;
    `;
    
    const iconColor = type === 'success' ? '#059669' : '#dc2626';
    const iconClass = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass}" style="color: ${iconColor}; font-size: 1.4rem;"></i>
        <span style="font-size: 0.95rem; font-weight: 600; color: #0f172a;">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Animasi masuk
    setTimeout(() => toast.style.transform = 'translateX(0)', 10);
    
    // Animasi keluar dan hapus elemen
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 400); 
    }, 3500);
}

// ==========================================
// 2. KELOLA KONFIGURASI POIN 30 HARI
// ==========================================
async function loadDailyConfig() {
    const wrapper = document.getElementById('config-wrapper');
    wrapper.innerHTML = `<div style="text-align:center; grid-column: 1/-1; padding: 60px; color:#64748b;">
                            <i class="fa-solid fa-circle-notch fa-spin fa-2x" style="color:#1d4ed8; margin-bottom:15px;"></i>
                            <p style="font-weight:600;">Menyinkronkan data dari server...</p>
                         </div>`;
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'admin_get_reward_config', nia: window.currentUser.nia })
        });
        const data = await response.json();
        
        if (data.status) {
            renderConfigGrid(data.config);
        } else {
            wrapper.innerHTML = `<p style="color:#dc2626; text-align:center; grid-column: 1/-1; padding: 20px; font-weight:600;">Gagal memuat: ${data.message}</p>`;
        }
    } catch (e) {
        wrapper.innerHTML = `<p style="color:#dc2626; text-align:center; grid-column: 1/-1; padding: 20px; font-weight:600;">Koneksi terputus. Periksa jaringan Anda.</p>`;
    }
}

function renderConfigGrid(config) {
    const wrapper = document.getElementById('config-wrapper');
    let html = '';
    
    const weeks = [
        { label: "Minggu 1 (Fase Awal)", range: [1, 7], icon: "fa-seedling" },
        { label: "Minggu 2 (Fase Adaptasi)", range: [8, 14], icon: "fa-chart-line" },
        { label: "Minggu 3 (Fase Konsisten)", range: [15, 21], icon: "fa-fire" },
        { label: "Minggu 4 (Fase Puncak & Grand Prize)", range: [22, 30], icon: "fa-trophy" }
    ];

    weeks.forEach(wk => {
        html += `<div class="week-card">
                    <h3 class="week-title"><i class="fa-solid ${wk.icon}"></i> ${wk.label}</h3>`;
        
        for(let i = wk.range[0]; i <= wk.range[1]; i++) {
            const dayData = config.find(c => c.hari == i) || { poin: (i * 10), voucher: "" };
            html += `
                <div class="day-row">
                    <span class="day-label">HARI ${i}</span>
                    <input type="number" id="poin_hari_${i}" value="${dayData.poin}" placeholder="Set Poin">
                    <input type="text" id="voucher_hari_${i}" value="${dayData.voucher}" placeholder="Kode Voucher (Opsional)">
                </div>`;
        }
        html += `</div>`;
    });
    wrapper.innerHTML = html;
}

async function saveDailyConfig() {
    const btn = document.getElementById('btn-save-config');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    let configData = [];
    for(let i = 1; i <= 30; i++) {
        let poin = document.getElementById(`poin_hari_${i}`).value || 0;
        let voucher = document.getElementById(`voucher_hari_${i}`).value || '';
        configData.push({ hari: i, poin: poin, voucher: voucher });
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST', body: JSON.stringify({ 
                action: 'admin_save_reward_config', nia: window.currentUser.nia, config_data: configData 
            })
        });
        const result = await response.json();
        
        if(result.status) {
            showToast("Konfigurasi 30 hari berhasil diperbarui!", "success");
        } else {
            showToast(result.message || "Gagal menyimpan konfigurasi", "error");
        }
    } catch(e) { 
        showToast("Gagal terhubung ke server", "error"); 
    }
    
    btn.innerHTML = originalText;
    btn.disabled = false;
}

// ==========================================
// 3. KELOLA KATALOG HADIAH
// ==========================================

// --- HELPER IKON BERDASARKAN TIPE ---
function getIconForType(tipe) {
    const t = (tipe || "").toLowerCase();
    if (t.includes('voucher') || t.includes('diskon')) return 'fa-ticket';
    if (t.includes('saldo') || t.includes('wallet') || t.includes('kas')) return 'fa-wallet';
    if (t.includes('tiket') || t.includes('akses')) return 'fa-train-subway';
    return 'fa-gift'; // Default icon
}

async function loadCatalog() {
    const list = document.getElementById('catalog-list');
    list.innerHTML = `<div style="text-align:center; grid-column: 1/-1; padding: 60px; color:#64748b;">
                        <i class="fa-solid fa-circle-notch fa-spin fa-2x" style="color:#1d4ed8; margin-bottom:15px;"></i>
                        <p style="font-weight:600;">Memuat inventaris katalog...</p>
                      </div>`;
                      
    try {
        const response = await fetch(API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'admin_get_reward_catalog', nia: window.currentUser.nia })
        });
        const data = await response.json();
        
        if (data.status && data.katalog.length > 0) {
            let html = '';
            data.katalog.forEach(item => {
                let isOut = parseInt(item.stok) === 0;
                let cardClass = item.status === 'Nonaktif' ? 'item-card disabled' : 'item-card';
                let iconClass = getIconForType(item.tipe);

                html += `
                <div class="${cardClass}">
                    <div class="item-icon">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <span style="font-size: 0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">${item.tipe || 'Lainnya'}</span>
                    <h4 class="item-title" style="margin-bottom: 5px;">${item.nama}</h4>
                    <p style="font-size: 0.8rem; color: #64748b; margin-bottom: 15px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${item.deskripsi || "-"}</p>
                    
                    <div class="badge-container">
                        <span class="badge badge-price"><i class="fa-solid fa-coins"></i> ${item.harga} Pts</span>
                        <span class="badge ${isOut ? 'badge-out' : 'badge-stock'}"><i class="fa-solid fa-box"></i> ${isOut ? 'Habis' : item.stok}</span>
                    </div>
                    
                    <div class="card-actions">
                        <button class="btn btn-edit" onclick="editItem('${item.id}', '${item.nama}', ${item.harga}, ${item.stok}, '${item.status}', '${item.tipe || ''}', '${item.deskripsi || ''}')">
                            <i class="fa-solid fa-pen"></i> Edit
                        </button>
                        ${item.status === 'Aktif' ? 
                            `<button class="btn btn-toggle-off" onclick="toggleStatus('${item.id}', '${item.nama}', ${item.harga}, ${item.stok}, 'Nonaktif', '${item.tipe || ''}', '${item.deskripsi || ''}')"><i class="fa-solid fa-eye-slash"></i> Takedown</button>` : 
                            `<button class="btn btn-toggle-on" onclick="toggleStatus('${item.id}', '${item.nama}', ${item.harga}, ${item.stok}, 'Aktif', '${item.tipe || ''}', '${item.deskripsi || ''}')"><i class="fa-solid fa-eye"></i> Publish</button>`
                        }
                    </div>
                </div>`;
            });
            list.innerHTML = html;
        } else {
            list.innerHTML = `
                <div style="text-align: center; grid-column: 1 / -1; padding: 60px 20px; background: white; border-radius: 20px; border: 2px dashed #cbd5e1;">
                    <i class="fa-solid fa-box-open fa-3x" style="color: #94a3b8; margin-bottom: 20px;"></i>
                    <p style="font-weight: 700; color: #0f172a; font-size: 1.1rem; margin-bottom: 5px;">Katalog masih kosong</p>
                    <p style="font-size: 0.95rem; color: #64748b;">Tambahkan item baru untuk mulai memberikan reward ke anggota.</p>
                </div>`;
        }
    } catch (e) { 
        list.innerHTML = `<p style="text-align:center; color:#dc2626; grid-column: 1 / -1; font-weight:600; padding:20px;">Gagal memuat katalog.</p>`; 
    }
}

// ==========================================
// 4. KONTROL MODAL ITEM
// ==========================================

// --- FUNGSI TOGGLE INPUT "LAINNYA" ---
function toggleJenisLainnya() {
    const select = document.getElementById('item-jenis');
    const inputLain = document.getElementById('item-jenis-lain');
    if (select.value === 'Lainnya') {
        inputLain.style.display = 'block';
        inputLain.focus();
    } else {
        inputLain.style.display = 'none';
        inputLain.value = '';
    }
}

function openAddModal() {
    document.getElementById('modal-item-title').innerHTML = '<i class="fa-solid fa-plus-circle"></i> Tambah Hadiah';
    document.getElementById('item-id').value = "";
    document.getElementById('item-nama').value = "";
    document.getElementById('item-deskripsi').value = "";
    document.getElementById('item-harga').value = "";
    document.getElementById('item-stok').value = "";
    document.getElementById('item-status').value = "Aktif";
    document.getElementById('item-jenis').value = "Voucher";
    toggleJenisLainnya();
    
    document.getElementById('item-modal').classList.remove('hidden');
}

function editItem(id, nama, harga, stok, status, tipe, deskripsi) {
    document.getElementById('modal-item-title').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Hadiah';
    document.getElementById('item-id').value = id;
    document.getElementById('item-nama').value = nama;
    document.getElementById('item-deskripsi').value = deskripsi || "";
    document.getElementById('item-harga').value = harga;
    document.getElementById('item-stok').value = stok;
    document.getElementById('item-status').value = status;
    
    const selectJenis = document.getElementById('item-jenis');
    const options = Array.from(selectJenis.options).map(opt => opt.value);
    
    if (tipe && options.includes(tipe)) {
        selectJenis.value = tipe;
        document.getElementById('item-jenis-lain').value = "";
    } else if (tipe) {
        selectJenis.value = "Lainnya";
        document.getElementById('item-jenis-lain').value = tipe;
    } else {
        selectJenis.value = "Voucher";
        document.getElementById('item-jenis-lain').value = "";
    }
    toggleJenisLainnya();
    
    document.getElementById('item-modal').classList.remove('hidden');
}

function toggleStatus(id, nama, harga, stok, newStatus, tipe, deskripsi) {
    // Tampilkan notifikasi loading sementara
    showToast(`Memperbarui status ${nama}...`, "success");
    
    // Siapkan payload langsung untuk Takedown/Publish (tanpa harus buka modal)
    const payload = {
        action: 'admin_save_reward_item',
        nia: window.currentUser.nia,
        id: id,
        nama: nama,
        deskripsi: deskripsi || "",
        tipe: tipe || "Lainnya",
        harga: harga,
        stok: stok,
        status: newStatus
    };

    fetch(API_URL, { 
        method: 'POST', body: JSON.stringify(payload) 
    })
    .then(response => response.json())
    .then(result => {
        if(result.status) {
            loadCatalog(); 
            showToast(`${nama} berhasil di-${newStatus === 'Aktif' ? 'publish' : 'takedown'}.`, "success");
        } else { 
            showToast(result.message || "Gagal memperbarui status", "error"); 
        }
    })
    .catch(e => {
        showToast("Terjadi kesalahan sistem.", "error"); 
    });
}

function closeItemModal() { 
    document.getElementById('item-modal').classList.add('hidden'); 
}

async function saveCatalogItem() {
    const jenisSelect = document.getElementById('item-jenis').value;
    const finalTipe = (jenisSelect === 'Lainnya') ? document.getElementById('item-jenis-lain').value : jenisSelect;

    const payload = {
        action: 'admin_save_reward_item',
        nia: window.currentUser.nia,
        id: document.getElementById('item-id').value,
        nama: document.getElementById('item-nama').value,
        deskripsi: document.getElementById('item-deskripsi').value,
        tipe: finalTipe,
        harga: document.getElementById('item-harga').value,
        stok: document.getElementById('item-stok').value,
        status: document.getElementById('item-status').value
    };

    if(!payload.nama || !payload.harga || !payload.stok || !payload.tipe) {
        return showToast("Harap isi semua kolom formulir!", "error");
    }

    const btn = document.getElementById('btn-save-item');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
    btn.disabled = true;

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        
        if(result.status) {
            closeItemModal();
            loadCatalog(); 
            showToast("Item katalog berhasil disimpan!", "success");
        } else { 
            showToast(result.message || "Gagal menyimpan item", "error"); 
        }
    } catch(e) { 
        showToast("Terjadi kesalahan sistem.", "error"); 
    }
    
    btn.innerHTML = originalText;
    btn.disabled = false;
}