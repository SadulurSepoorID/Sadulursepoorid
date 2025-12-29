let currentUser = null;
let currentEventRef = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cek Sesi
    const session = localStorage.getItem('user_session');
    if (!session) { window.location.replace("../login/index.html"); return; }
    currentUser = JSON.parse(session);

    // 2. Setup Sidebar Mobile
    window.toggleSidebar = function() {
        document.getElementById('mySidebar').classList.toggle('active');
        document.getElementById('sidebar-overlay').classList.toggle('active');
    };
    window.logoutLocal = function() {
        localStorage.removeItem('user_session');
        window.location.replace("../login/index.html");
    };

    // 3. Routing Tampilan Berdasarkan Jabatan
    const jabatan = (currentUser.jabatan || "").toLowerCase();
    
    // Inisialisasi Tampilan Anggota
    initMemberView();

    // Jika Pengurus, tampilkan menu admin
    if (jabatan !== 'anggota') {
        document.getElementById('admin-view').classList.remove('hidden');
        initAdminView();
    }
});

// ==========================
// LOGIKA ANGGOTA
// ==========================

async function initMemberView() {
    try {
        const res = await fetch(API_URL, {
            method: 'POST', 
            body: JSON.stringify({ action: 'get_kas_history', nia: currentUser.nia })
        });
        const data = await res.json();
        
        if (data.status) {
            // 1. Render History
            const listEl = document.getElementById('my-history');
            listEl.innerHTML = "";
            if (data.history.length === 0) listEl.innerHTML = "<li>Belum ada data pembayaran.</li>";
            
            data.history.forEach(h => {
                const judulTampilan = formatDisplayText(h.kegiatan || h.tanggal);
                listEl.innerHTML += `
                    <li onclick='showStruk(${JSON.stringify(h)})' style="cursor:pointer">
                        <div>
                            <strong>${judulTampilan}</strong><br>
                            <span style="font-size:0.8rem; color:#888">${h.tanggal} • ${h.metode}</span>
                        </div>
                        <span class="amount">Rp ${parseInt(h.nominal).toLocaleString('id-ID')}</span>
                    </li>`;
            });

            // 2. Logic Alert & Metode Pembayaran
            const alertEl = document.getElementById('event-alert');
            const cashOpt = document.getElementById('cash-opt'); // Element Label Tunai
            const qrisRadio = document.querySelector('input[value="QRIS"]');
            const cashRadio = document.querySelector('input[value="Cash"]');
            
            // Dapatkan tanggal hari ini (Format YYYY-MM-DD) untuk validasi Tunai
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayString = `${year}-${month}-${day}`;

            if (data.next_event) {
                // === KONDISI: ADA KEGIATAN MINGGU INI (Data dari Backend) ===
                currentEventRef = data.next_event.nama; 
                const lokasi = data.next_event.lokasi || "";
                
                // Tampilan Alert: Nama Kegiatan
                alertEl.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class="fa-solid fa-calendar-check"></i> 
                        <span>Kas untuk Kegiatan: <b>${data.next_event.nama}</b> ${lokasi ? `<br><small>(${lokasi})</small>` : ''}</span>
                    </div>`;
                alertEl.className = "alert-box active-event"; 

                // LOGIKA TUNAI: Hanya muncul jika tanggal kegiatan == HARI INI
                if (data.next_event.tanggal === todayString) {
                    cashOpt.style.display = 'block'; // Tampilkan Tunai
                    // Opsional: Auto select tunai jika hari H
                    // cashRadio.checked = true; 
                } else {
                    cashOpt.style.display = 'none'; // Sembunyikan Tunai
                    qrisRadio.checked = true;       // Paksa pilih QRIS
                }
                
            } else {
                // === KONDISI: TIDAK ADA KEGIATAN MINGGU INI ===
                currentEventRef = new Date().toISOString().slice(0,10); 
                
                // Hitung Minggu ke berapa
                const weekNum = Math.ceil(today.getDate() / 7);
                const monthName = today.toLocaleDateString('id-ID', { month: 'long' });
                
                // Tampilan Alert: Minggu ke-X
                alertEl.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class="fa-solid fa-calendar"></i> 
                        <span>Kas untuk Minggu ke-${weekNum} (${monthName})</span>
                    </div>`;
                alertEl.className = "alert-box"; 

                // Tidak ada kegiatan = Wajib QRIS (Tunai Hilang)
                cashOpt.style.display = 'none';
                qrisRadio.checked = true;
            }

            // Panggil fungsi toggle agar gambar QRIS muncul/hilang sesuai radio yang terpilih
            toggleQRIS(); 
        }
    } catch (e) { console.error(e); }
}

// Formatter Teks (Digunakan di History & Dropdown Admin)
function formatDisplayText(text) {
    if (!text) return "-";
    
    // Cek apakah text format tanggal ISO/YYYY-MM-DD
    const datePattern = /^\d{4}-\d{2}-\d{2}/;
    
    if (datePattern.test(text)) {
        const d = new Date(text);
        if (isNaN(d.getTime())) return text;

        const bulan = d.toLocaleDateString('id-ID', { month: 'long' });
        const mingguKe = Math.ceil(d.getDate() / 7);
        return `Pembayaran Minggu ke-${mingguKe} ${bulan}`;
    } else {
        return `Pembayaran: ${text}`;
    }
}

function toggleQRIS() {
    const method = document.querySelector('input[name="metode"]:checked').value;
    const container = document.getElementById('qris-container');
    if (method === 'QRIS') {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

async function handlePayment(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-pay');
    const nominal = document.getElementById('pay-nominal').value;
    const metode = document.querySelector('input[name="metode"]:checked').value;

    if(confirm(`Konfirmasi pembayaran Rp ${nominal} via ${metode}?`)) {
        btn.disabled = true; btn.innerText = "Memproses...";
        
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'pay_kas',
                    nia: currentUser.nia,
                    nama: currentUser.nama,
                    nominal: nominal,
                    metode: metode,
                    ref_kegiatan: currentEventRef
                })
            });
            const result = await res.json();
            
            if (result.status) {
                // Tampilkan Struk
                showStruk({
                    id: result.id_transaksi,
                    tanggal: result.tanggal,
                    nama: currentUser.nama, 
                    nominal: nominal,
                    metode: metode,
                    kegiatan: currentEventRef 
                });
                
                initMemberView(); // Refresh halaman
                document.getElementById('payment-form').reset();
                document.getElementById('qris-container').classList.add('hidden');
                
                // Reset ke default logic (akan dihandle initMemberView lagi, tapi aman direset ke qris dulu)
                document.querySelector('input[name="metode"][value="QRIS"]').checked = true;
            } else {
                alert("Gagal: " + result.message);
            }
        } catch (err) { alert("Terjadi kesalahan koneksi."); }
        btn.disabled = false; btn.innerText = "Bayar Sekarang";
    }
}

function showStruk(data) {
    const displayName = data.nama || currentUser.nama;
    const displayRef = formatDisplayText(data.kegiatan || data.ref || "-");

    document.getElementById('s-id').innerText = data.id;
    document.getElementById('s-date').innerText = data.tanggal;
    document.getElementById('s-name').innerText = displayName;
    document.getElementById('s-ref').innerText = displayRef; 
    document.getElementById('s-nominal').innerText = "Rp " + parseInt(data.nominal).toLocaleString('id-ID');
    document.getElementById('s-method').innerText = data.metode;
    
    document.getElementById('struk-modal').classList.remove('hidden');
}

// ==========================
// LOGIKA PENGURUS (ADMIN)
// ==========================

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById('tab-' + tabName).classList.add('active');
    const btns = document.querySelectorAll('.tab-btn');
    if(tabName === 'paid') btns[0].classList.add('active');
    else btns[1].classList.add('active');
}

async function initAdminView() {
    // Load semua referensi untuk dropdown filter
    const res = await fetch(API_URL, { body: JSON.stringify({ action: 'get_all_refs' }), method: 'POST' });
    const data = await res.json();
    if (data.status) {
        const select = document.getElementById('filter-kegiatan');
        select.innerHTML = '<option value="">-- Semua Riwayat --</option>';
        
        data.refs.forEach(ref => {
            const opt = document.createElement('option');
            opt.value = ref; 
            opt.innerText = formatDisplayText(ref); // Gunakan formatter agar rapi
            select.appendChild(opt);
        });
    }
    loadAdminData();
}

async function loadAdminData() {
    const filter = document.getElementById('filter-kegiatan').value;
    const tbodyPaid = document.getElementById('table-paid-body');
    const tbodyUnpaid = document.getElementById('table-unpaid-body');
    
    tbodyPaid.innerHTML = '<tr><td colspan="5">Memuat...</td></tr>';
    tbodyUnpaid.innerHTML = '<tr><td colspan="3">Memuat...</td></tr>';

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_kas_admin', filter_kegiatan: filter })
        });
        const result = await res.json();

        if (result.status) {
            document.getElementById('adm-total').innerText = "Rp " + result.total.toLocaleString('id-ID');
            document.getElementById('adm-unpaid-count').innerText = result.unpaid.length + " Orang";

            // Render Tabel Sudah Bayar
            tbodyPaid.innerHTML = "";
            result.data.forEach(d => {
                tbodyPaid.innerHTML += `
                    <tr>
                        <td><b>${d.nama}</b><br><small>${d.nia}</small></td>
                        <td>${d.tanggal}</td>
                        <td><span class="badge-pay ${d.metode}">${d.metode}</span></td>
                        <td>Rp ${parseInt(d.nominal).toLocaleString('id-ID')}</td>
                        <td><button onclick='showStruk(${JSON.stringify(d)})' class="btn-upload"><i class="fa-solid fa-receipt"></i></button></td>
                    </tr>
                `;
            });

            // Render Tabel Belum Bayar (Tagihan)
            tbodyUnpaid.innerHTML = "";
            result.unpaid.forEach(u => {
                tbodyUnpaid.innerHTML += `
                    <tr>
                        <td>${u.nia}</td>
                        <td>${u.nama}</td>
                        <td>
                            <button onclick="sendBill('${u.nia}', '${filter || 'Mingguan'}')" class="btn-logout" style="padding: 5px 10px; font-size: 0.8rem; width: auto;">
                                <i class="fa-solid fa-envelope"></i> Tagih
                            </button>
                        </td>
                    </tr>
                `;
            });
            if(result.unpaid.length === 0) tbodyUnpaid.innerHTML = '<tr><td colspan="3" class="text-center">Semua lunas!</td></tr>';
        }
    } catch (e) { console.error(e); }
}

window.sendBill = async function(nia, kegiatan) {
    if(!confirm("Kirim email tagihan ke anggota ini?")) return;
    
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'send_bill', target_nia: nia, kegiatan: kegiatan })
        });
        const result = await res.json();
        alert(result.message);
    } catch(e) { alert("Gagal mengirim perintah."); }
};