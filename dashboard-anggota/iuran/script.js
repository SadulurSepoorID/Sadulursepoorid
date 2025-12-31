let currentUser = null;
let currentEventRef = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil Sesi
    try {
        currentUser = JSON.parse(localStorage.getItem('user_session'));
        if (!currentUser) throw new Error("No Session");
    } catch(e) {
        window.location.replace("../login/index.html");
        return;
    }

    // 2. Setup Tombol Sidebar & Logout
    window.toggleSidebar = function() {
        document.getElementById('mySidebar').classList.toggle('active');
        document.getElementById('sidebar-overlay').classList.toggle('active');
    };
    window.logoutLocal = function() {
        localStorage.removeItem('user_session');
        window.location.replace("../login/index.html");
    };

    // 3. Init View
    const jabatan = (currentUser.jabatan || "").toLowerCase();
    initMemberView(); // Load view anggota
    
    if (jabatan !== 'anggota') {
        document.getElementById('admin-view').classList.remove('hidden');
        initAdminView();
    }
});

// ==========================
// 1. LOGIKA UTAMA ANGGOTA (DIPERBARUI)
// ==========================

async function initMemberView() {
    try {
        const res = await fetch(API_URL, {
            method: 'POST', 
            body: JSON.stringify({ action: 'get_kas_history', nia: currentUser.nia })
        });
        const data = await res.json();
        
        if (data.status) {
            // A. RENDER RIWAYAT PEMBAYARAN
            const listEl = document.getElementById('my-history');
            listEl.innerHTML = "";
            if (!data.history || data.history.length === 0) {
                listEl.innerHTML = "<li>Belum ada data pembayaran.</li>";
            } else {
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
            }

            // B. LOGIKA TAGIHAN & ALERT (LOGIKA BARU)
            const alertEl = document.getElementById('event-alert');
            const inputNominal = document.getElementById('pay-nominal');
            const cashOpt = document.getElementById('cash-opt');
            const qrisRadio = document.querySelector('input[value="QRIS"]');
            
            const bill = data.bill_status; 
            const unpaidList = data.unpaid_list || []; // Data rinci hutang

            // Reset state
            alertEl.className = "alert-box"; 
            inputNominal.disabled = false;

            // --- CEK APAKAH ADA TUNGGAKAN? ---
            if (bill && bill.count > 0) {
                // KONDISI: MENUNGGAK
                const totalHutang = bill.total_must_pay;
                
                // 1. Kunci Nominal
                inputNominal.value = totalHutang;
                inputNominal.min = totalHutang;
                currentEventRef = bill.label; 

                // 2. Format Tampilan Rapi (Grouping per Bulan)
                const tampilanRinci = formatBillGrouped(unpaidList);

                // 3. Tampilkan Alert MERAH
                alertEl.className = "alert-box alert-danger";
                alertEl.innerHTML = `
                    <div style="width:100%">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; border-bottom:1px solid rgba(183, 28, 28, 0.2); padding-bottom:8px;">
                            <i class="fa-solid fa-triangle-exclamation" style="font-size:1.2rem;"></i> 
                            <span style="font-size:1rem; font-weight:bold;">TUNGGAKAN (${bill.count} Periode)</span>
                        </div>
                        
                        <div style="font-size:0.9rem; margin-bottom:10px;">
                            Nominal disesuaikan menjadi <strong>Rp ${totalHutang.toLocaleString('id-ID')}</strong>.
                        </div>

                        ${tampilanRinci}

                        <div style="margin-top:10px; font-size:0.75rem; color:#b71c1c; font-style:italic;">
                            *Mohon segera dilunasi agar data tercatat rapi.
                        </div>
                    </div>`;

                cashOpt.style.display = 'none'; 
                qrisRadio.checked = true;

            } else {
                // KONDISI: LUNAS (NORMAL)
                inputNominal.value = 5000;
                inputNominal.min = 5000;

                if (data.next_event) {
                    // Ada Event Kegiatan
                    currentEventRef = data.next_event.nama; 
                    const lokasi = data.next_event.lokasi || "";
                    alertEl.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-calendar-check"></i> <span>Kas untuk Kegiatan: <b>${data.next_event.nama}</b> ${lokasi ? `<br><small>(${lokasi})</small>` : ''}</span></div>`;
                    alertEl.classList.add("active-event");
                    
                    const todayStr = new Date().toISOString().slice(0,10);
                    if (data.next_event.tanggal === todayStr) cashOpt.style.display = 'block'; 
                    else { cashOpt.style.display = 'none'; qrisRadio.checked = true; }

                } else {
                    // Kas Mingguan Biasa
                    const today = new Date();
                    const weekNum = Math.ceil(today.getDate() / 7);
                    const monthName = today.toLocaleDateString('id-ID', { month: 'long' });
                    currentEventRef = `Minggu ke-${weekNum} (${monthName})`; 
                    
                    alertEl.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-circle-check"></i> <span>Terima Kasih! Iuran Anda lunas hingga saat ini.</span></div>`;
                    alertEl.style.backgroundColor = "#e8f5e9";
                    alertEl.style.color = "#2e7d32";
                    
                    cashOpt.style.display = 'none';
                    qrisRadio.checked = true;
                }
            }
            toggleQRIS(); 
        }
    } catch (e) { 
        console.error("Error load member:", e);
        document.getElementById('event-alert').innerHTML = "Gagal memuat data.";
    }
}

// ==========================
// 2. FUNGSI FORMAT TAMPILAN (GROUPING)
// ==========================
function formatBillGrouped(list) {
    if (!list || list.length === 0) return "";

    const months = {};
    const events = [];

    // 1. Pisahkan Data (Mingguan vs Kegiatan)
    list.forEach(item => {
        // Regex: Mencari pola "Minggu ke-X (Bulan)"
        const match = item.display.match(/Minggu ke-(\d+)\s*\((.+)\)/i);
        
        if (match) {
            const week = match[1];      // Angka minggu
            const month = match[2];     // Nama bulan
            if (!months[month]) months[month] = [];
            months[month].push(week);
        } else {
            // Jika tidak cocok pola mingguan, berarti KEGIATAN
            // Hapus prefix "Kegiatan: " agar bersih
            const cleanName = item.display.replace(/^Kegiatan:\s*/i, "");
            events.push(cleanName);
        }
    });

    let html = `<div style="background:rgba(255,255,255,0.6); padding:10px; border-radius:8px; font-size:0.85rem; color:#333;">`;

    // 2. Render Bagian BULAN
    for (const [month, weeks] of Object.entries(months)) {
        // Format minggu: "1, 2, dan 3"
        let weekStr = "";
        if (weeks.length === 1) {
            weekStr = weeks[0];
        } else {
            const last = weeks.pop();
            weekStr = weeks.join(", ") + " dan " + last;
        }

        html += `<div style="margin-bottom:6px;">
                    <strong>${month}:</strong><br>
                    Minggu ke ${weekStr}
                 </div>`;
    }

    // 3. Render Bagian KEGIATAN (Jika ada)
    if (events.length > 0) {
        // Beri garis pemisah jika ada data bulan sebelumnya
        if (Object.keys(months).length > 0) {
            html += `<hr style="border:0; border-top:1px dashed #aaa; margin:8px 0;">`;
        }
        
        html += `<div style="margin-bottom:4px;"><strong>Kegiatan:</strong></div>`;
        events.forEach(ev => {
            html += `<div style="padding-left:0px;">- ${ev}</div>`;
        });
    }

    html += `</div>`;
    return html;
}

// ==========================
// 3. HELPER LAINNYA
// ==========================

function formatDisplayText(text) {
    if (!text) return "-";
    if (text.includes(',')) return text; // Jika teks panjang, biarkan
    
    const datePattern = /^\d{4}-\d{2}-\d{2}/;
    if (datePattern.test(text)) {
        const d = new Date(text);
        if (isNaN(d.getTime())) return text;
        const bulan = d.toLocaleDateString('id-ID', { month: 'long' });
        const mingguKe = Math.ceil(d.getDate() / 7);
        return `Minggu ke-${mingguKe} ${bulan}`; 
    } else {
        return `Kegiatan: ${text}`;
    }
}

function toggleQRIS() {
    const methodEl = document.querySelector('input[name="metode"]:checked');
    if(!methodEl) return;
    const method = methodEl.value;
    const container = document.getElementById('qris-container');
    
    if (method === 'QRIS') container.classList.remove('hidden');
    else {
        container.classList.add('hidden');
        resetUpload(); 
    }
}

function previewFile() {
    const fileInput = document.getElementById('proof-file');
    const previewBox = document.getElementById('preview-box');
    const imgPreview = document.getElementById('img-preview');
    const nameDisplay = document.getElementById('file-name-display');
    const label = document.querySelector('.upload-label');

    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        if (file.size > 5 * 1024 * 1024) {
            alert("Ukuran file terlalu besar! Maksimal 5MB.");
            resetUpload();
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            imgPreview.src = e.target.result;
            nameDisplay.innerText = file.name;
            previewBox.style.display = 'block';
            label.style.display = 'none';
        }
        reader.readAsDataURL(file);
    }
}

function resetUpload() {
    const fileInput = document.getElementById('proof-file');
    const previewBox = document.getElementById('preview-box');
    const label = document.querySelector('.upload-label');
    fileInput.value = ""; 
    previewBox.style.display = 'none';
    if(label) label.style.display = 'flex'; 
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
});

async function handlePayment(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-pay');
    const nominal = parseInt(document.getElementById('pay-nominal').value);
    const minNominal = parseInt(document.getElementById('pay-nominal').min);
    const metode = document.querySelector('input[name="metode"]:checked').value;
    const fileInput = document.getElementById('proof-file');

    if (nominal < minNominal) {
        alert(`Nominal tidak boleh kurang dari tagihan minimal (Rp ${minNominal.toLocaleString('id-ID')})`);
        return;
    }

    let base64File = "";
    let mimeType = "";
    
    if (metode === 'QRIS') {
        if (fileInput.files.length === 0) {
            alert("Mohon upload bukti pembayaran QRIS!");
            return;
        }
        try {
            const file = fileInput.files[0];
            mimeType = file.type;
            base64File = await toBase64(file);
        } catch (err) {
            alert("Gagal memproses gambar.");
            return;
        }
    }

    if(confirm(`Konfirmasi pembayaran Rp ${nominal.toLocaleString('id-ID')} via ${metode}?`)) {
        btn.disabled = true; btn.innerText = "Memproses...";
        try {
            const payload = {
                action: 'pay_kas',
                nia: currentUser.nia,
                nama: currentUser.nama,
                nominal: nominal,
                metode: metode,
                ref_kegiatan: currentEventRef,
                bukti_base64: base64File,
                bukti_mime: mimeType
            };

            const res = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            
            if (result.status) {
                showStruk({ id: result.id_transaksi, tanggal: result.tanggal, nama: currentUser.nama, nominal: nominal, metode: metode, kegiatan: currentEventRef });
                initMemberView(); 
                document.getElementById('payment-form').reset();
                resetUpload();
                document.getElementById('qris-container').classList.add('hidden');
            } else { alert("Gagal: " + result.message); }
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

// LOGIKA ADMIN
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    const btns = document.querySelectorAll('.tab-btn');
    if(tabName === 'paid') btns[0].classList.add('active'); else btns[1].classList.add('active');
}

async function initAdminView() {
    const res = await fetch(API_URL, { body: JSON.stringify({ action: 'get_all_refs' }), method: 'POST' });
    const data = await res.json();
    if (data.status) {
        const select = document.getElementById('filter-kegiatan');
        select.innerHTML = '<option value="">-- Semua Riwayat --</option>';
        data.refs.forEach(ref => {
            const opt = document.createElement('option');
            opt.value = ref; 
            opt.innerText = formatDisplayText(ref);
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
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'get_kas_admin', filter_kegiatan: filter }) });
        const result = await res.json();
        if (result.status) {
            document.getElementById('adm-total').innerText = "Rp " + result.total.toLocaleString('id-ID');
            document.getElementById('adm-unpaid-count').innerText = result.unpaid.length + " Orang";
            
            result.data.sort((a, b) => a.nama.localeCompare(b.nama));
            result.unpaid.sort((a, b) => a.nama.localeCompare(b.nama));

            tbodyPaid.innerHTML = "";
            result.data.forEach(d => {
                let actionButtons = `<button onclick='showStruk(${JSON.stringify(d)})' class="btn-upload"><i class="fa-solid fa-receipt"></i></button>`;
                if (currentUser.nia === 'SS-0098') {
                    actionButtons += `
                        <button onclick="editPayment('${d.id}')" class="btn-logout" style="margin-left:5px; background:orange; color:white;"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="deletePayment('${d.id}')" class="btn-logout" style="margin-left:5px; background:red; color:white;"><i class="fa-solid fa-trash"></i></button>
                    `;
                }
                tbodyPaid.innerHTML += `
                    <tr>
                        <td><b>${d.nama}</b><br><small>${d.nia}</small></td>
                        <td>${d.tanggal}</td>
                        <td>
                            <span class="badge-pay ${d.metode}">${d.metode}</span>
                            ${d.bukti ? `<br><a href="${d.bukti}" target="_blank" style="font-size:0.7rem; color:blue; text-decoration:underline;">Lihat Bukti</a>` : ''}
                        </td>
                        <td>Rp ${parseInt(d.nominal).toLocaleString('id-ID')}</td>
                        <td>${actionButtons}</td>
                    </tr>`;
            });

            tbodyUnpaid.innerHTML = "";
            result.unpaid.forEach(u => {
                tbodyUnpaid.innerHTML += `
                    <tr>
                        <td>${u.nia}</td>
                        <td>${u.nama}</td>
                        <td>
                            <button onclick="sendBill(this, '${u.nia}', '${filter || 'Mingguan'}')" class="btn-logout" style="padding: 5px 10px; font-size: 0.8rem; width: auto;">
                                <i class="fa-solid fa-envelope"></i> Tagih
                            </button>
                        </td>
                    </tr>`;
            });

            const btnBillAll = document.getElementById('btn-bill-all');
            const countSpan = document.getElementById('bill-count');
            
            if(result.unpaid.length === 0) {
                tbodyUnpaid.innerHTML = '<tr><td colspan="3" class="text-center">Semua lunas!</td></tr>';
                if(btnBillAll) btnBillAll.style.display = 'none';
            } else {
                if(btnBillAll) {
                    btnBillAll.style.display = 'inline-block'; 
                    countSpan.innerText = result.unpaid.length;
                }
            }
        }
    } catch (e) { console.error(e); }
}

window.sendBill = async function(btn, nia, kegiatan) {
    if(!confirm("Kirim email tagihan ke anggota ini?")) return;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'send_bill', target_nia: nia, kegiatan: kegiatan }) });
        const result = await res.json();
        alert(result.message); 
        btn.disabled = false;
        btn.innerHTML = originalContent;
        if(result.status) { btn.style.backgroundColor = '#ffc107'; btn.style.color = '#000'; }
    } catch(e) { alert("Gagal: " + e); btn.disabled = false; btn.innerHTML = originalContent; }
};

window.sendBillAll = async function() {
    const buttons = document.querySelectorAll('#table-unpaid-body button');
    const count = buttons.length;
    const filter = document.getElementById('filter-kegiatan').value || 'Mingguan';
    if (count === 0) return;
    if (!confirm(`PERINGATAN: Kirim email tagihan ke ${count} anggota sekaligus?`)) return;

    const mainBtn = document.getElementById('btn-bill-all');
    const originalText = mainBtn.innerHTML;
    mainBtn.disabled = true;
    let success = 0; let failed = 0;

    for (let i = 0; i < count; i++) {
        const btn = buttons[i];
        const row = btn.closest('tr');
        const nia = row.cells[0].innerText;
        mainBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mengirim ${i+1}/${count}...`;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; btn.disabled = true;
        try {
            const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'send_bill', target_nia: nia, kegiatan: filter }) });
            const result = await res.json();
            if (result.status) { success++; btn.parentElement.innerHTML = '<span style="color:green; font-size:0.8rem;"><i class="fa-solid fa-check"></i> Terkirim</span>'; } 
            else { failed++; btn.innerHTML = 'Gagal'; btn.style.color = 'red'; }
        } catch (e) { failed++; console.error(e); btn.innerHTML = 'Error'; }
        await new Promise(r => setTimeout(r, 500));
    }
    mainBtn.innerHTML = originalText; mainBtn.disabled = false;
    alert(`Selesai!\nBerhasil: ${success}\nGagal: ${failed}`);
    loadAdminData();
};

window.deletePayment = async function(id) {
    if (!confirm("Hapus data pembayaran ini?")) return;
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'delete_payment', id: id, editor_nia: currentUser.nia }) });
        const result = await res.json();
        alert(result.message);
        if(result.status) loadAdminData();
    } catch(e) { alert("Error: " + e); }
};

window.editPayment = async function(id) {
    const newNominal = prompt("Masukkan Nominal Baru:");
    if (!newNominal) return;
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'edit_payment', id: id, new_nominal: newNominal, editor_nia: currentUser.nia }) });
        const result = await res.json();
        alert(result.message);
        if(result.status) loadAdminData();
    } catch(e) { alert("Error: " + e); }
};