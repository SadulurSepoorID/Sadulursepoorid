let currentUser = null;
let currentEventRef = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil Sesi (Login check sudah dilakukan di HTML)
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
    initMemberView();
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

            const alertEl = document.getElementById('event-alert');
            const cashOpt = document.getElementById('cash-opt');
            const qrisRadio = document.querySelector('input[value="QRIS"]');
            
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayString = `${year}-${month}-${day}`;

            if (data.next_event) {
                currentEventRef = data.next_event.nama; 
                const lokasi = data.next_event.lokasi || "";
                alertEl.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-calendar-check"></i> <span>Kas untuk Kegiatan: <b>${data.next_event.nama}</b> ${lokasi ? `<br><small>(${lokasi})</small>` : ''}</span></div>`;
                alertEl.className = "alert-box active-event"; 

                if (data.next_event.tanggal === todayString) {
                    cashOpt.style.display = 'block'; 
                } else {
                    cashOpt.style.display = 'none'; 
                    qrisRadio.checked = true;
                }
            } else {
                currentEventRef = new Date().toISOString().slice(0,10); 
                const weekNum = Math.ceil(today.getDate() / 7);
                const monthName = today.toLocaleDateString('id-ID', { month: 'long' });
                alertEl.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><i class="fa-solid fa-calendar"></i> <span>Kas untuk Minggu ke-${weekNum} (${monthName})</span></div>`;
                alertEl.className = "alert-box"; 
                
                cashOpt.style.display = 'none';
                qrisRadio.checked = true;
            }
            toggleQRIS(); 
        }
    } catch (e) { console.error(e); }
}

function formatDisplayText(text) {
    if (!text) return "-";
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
    const method = document.querySelector('input[name="metode"]:checked').value;
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
    const nominal = document.getElementById('pay-nominal').value;
    const metode = document.querySelector('input[name="metode"]:checked').value;
    const fileInput = document.getElementById('proof-file');

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
            alert("Gagal memproses gambar. Coba lagi.");
            return;
        }
    }

    if(confirm(`Konfirmasi pembayaran Rp ${nominal} via ${metode}?`)) {
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
                
                if (document.getElementById('cash-opt').style.display !== 'none') {
                     document.querySelector('input[name="metode"][value="Cash"]').checked = true;
                } else {
                     document.querySelector('input[name="metode"][value="QRIS"]').checked = true;
                     document.getElementById('qris-container').classList.remove('hidden');
                }
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
            
            // SORTING
            result.data.sort((a, b) => a.nama.localeCompare(b.nama));
            result.unpaid.sort((a, b) => a.nama.localeCompare(b.nama));

            // Populate Paid
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

            // Populate Unpaid
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

            // LOGIKA TOMBOL TAGIH SEMUA
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

// KIRIM SATUAN
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

        if(result.status) {
            btn.style.backgroundColor = '#ffc107'; 
            btn.style.color = '#000'; 
            btn.style.borderColor = '#e0a800';
        }
    } catch(e) { 
        alert("Gagal mengirim perintah: " + e); 
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
};

// KIRIM MASSAL (TAGIH SEMUA)
window.sendBillAll = async function() {
    const buttons = document.querySelectorAll('#table-unpaid-body button');
    const count = buttons.length;
    const filter = document.getElementById('filter-kegiatan').value || 'Mingguan';

    if (count === 0) return;
    if (!confirm(`PERINGATAN: Anda akan mengirim email tagihan ke ${count} anggota sekaligus.\n\nLanjutkan proses?`)) return;

    const mainBtn = document.getElementById('btn-bill-all');
    const originalText = mainBtn.innerHTML;
    mainBtn.disabled = true;

    let success = 0;
    let failed = 0;

    for (let i = 0; i < count; i++) {
        const btn = buttons[i];
        const row = btn.closest('tr');
        const nia = row.cells[0].innerText;
        
        mainBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mengirim ${i+1}/${count}...`;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        btn.disabled = true;

        try {
            const res = await fetch(API_URL, { 
                method: 'POST', 
                body: JSON.stringify({ action: 'send_bill', target_nia: nia, kegiatan: filter }) 
            });
            const result = await res.json();

            if (result.status) {
                success++;
                btn.parentElement.innerHTML = '<span style="color:green; font-size:0.8rem;"><i class="fa-solid fa-check"></i> Terkirim</span>';
            } else {
                failed++;
                btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Gagal';
                btn.style.color = 'red';
            }
        } catch (e) {
            failed++;
            console.error(e);
            btn.innerHTML = 'Error';
        }
        await new Promise(r => setTimeout(r, 500));
    }

    mainBtn.innerHTML = originalText;
    mainBtn.disabled = false;
    alert(`Proses Selesai!\n\nBerhasil: ${success}\nGagal: ${failed}`);
    loadAdminData();
};

window.deletePayment = async function(id) {
    if (!confirm("Yakin ingin menghapus data pembayaran ini?")) return;
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete_payment', id: id, editor_nia: currentUser.nia })
        });
        const result = await res.json();
        alert(result.message);
        if(result.status) loadAdminData();
    } catch(e) { alert("Error: " + e); }
};

window.editPayment = async function(id) {
    const newNominal = prompt("Masukkan Nominal Baru (Angka saja):");
    if (!newNominal) return;
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'edit_payment', id: id, new_nominal: newNominal, editor_nia: currentUser.nia })
        });
        const result = await res.json();
        alert(result.message);
        if(result.status) loadAdminData();
    } catch(e) { alert("Error: " + e); }
};