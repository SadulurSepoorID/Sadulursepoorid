let allTransactions = [];

document.addEventListener('DOMContentLoaded', () => {
    initDateTime();
    checkLogin();
    setupRupiahInput();
    loadHistory();
});

// --- UI & HELPER ---
function checkLogin() {
    // const session = localStorage.getItem('user_session');
    // if (!session) window.location.href = '../../login/index.html';
}

function logout() {
    if(confirm('Keluar dari aplikasi?')) {
        localStorage.removeItem('user_session');
        window.location.href = '../../login/index.html';
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('show');
    document.getElementById('overlay').classList.toggle('active');
}

function initDateTime() {
    const d = document.getElementById('trxDate');
    const t = document.getElementById('trxTime');
    const now = new Date();
    // Format YYYY-MM-DD local
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    if(!d.value) d.value = `${year}-${month}-${day}`;
    if(!t.value) t.value = now.toTimeString().slice(0,5);
}

function checkOtherOption(sel) {
    const other = document.getElementById('trxCategoryOther');
    if(sel.value === 'Lainnya') {
        other.style.display = 'block';
        other.required = true;
        other.focus();
    } else {
        other.style.display = 'none';
        other.required = false;
    }
}

function toggleColor(col) {
    const btn = document.getElementById('btnSave');
    if(col === 'red') {
        btn.style.backgroundColor = '#dc2626';
        btn.innerText = 'Simpan Pengeluaran';
    } else {
        btn.style.backgroundColor = '#0056b3';
        btn.innerText = 'Simpan Pemasukan';
    }
}

// --- RUPIAH ---
function setupRupiahInput() {
    const el = document.getElementById('trxNominal');
    el.addEventListener('keyup', function() {
        this.value = formatRupiah(this.value, 'Rp ');
    });
    if(!el.value) el.value = "Rp 0";
    el.addEventListener('click', function(){ this.select(); });
}

function formatRupiah(angka, prefix){
    var number_string = angka.replace(/[^,\d]/g, '').toString(),
        split = number_string.split(','),
        sisa = split[0].length % 3,
        rupiah = split[0].substr(0, sisa),
        ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
        separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }
    rupiah = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
    return prefix == undefined ? rupiah : (rupiah ? 'Rp ' + rupiah : '');
}

function cleanRupiah(str) {
    return parseInt(str.replace(/[^0-9]/g, '')) || 0;
}

// --- API (BAGIAN PERBAIKAN) ---
async function loadHistory() {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Memuat data...</td></tr>';
    
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_finance_dashboard' })
        });
        const json = await res.json();
        
        // PERBAIKAN 1: Menggunakan json.riwayat (bukan json.history)
        if(json.status && json.riwayat) {
            allTransactions = json.riwayat;
            renderTable(json.riwayat);
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Gagal ambil data.</td></tr>';
        }
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Offline / Error.</td></tr>';
    }
}

function renderTable(data) {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';
    
    if(data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#888;">Belum ada data.</td></tr>';
        return;
    }

    data.forEach((item, idx) => {
        const isIn = item.tipe === 'Masuk';
        const badge = isIn ? 'bg-green' : 'bg-red';
        const color = isIn ? 'txt-green' : 'txt-red';
        const icon = isIn ? 'fa-arrow-down' : 'fa-arrow-up';
        
        const note = (item.note && item.note.length > 1 && item.note !== '-') ? `<br><small style="color:#64748b;">${item.note}</small>` : '';

        // PERBAIKAN 2: Menggunakan item.category (bukan item.kategori)
        const row = `
            <tr>
                <td style="font-weight:500;">${item.tanggal}</td>
                <td>${item.pic}</td>
                <td>
                    <span class="badge ${badge}"><i class="fa-solid ${icon}"></i> ${item.tipe}</span>
                    <div style="font-size:0.85rem; margin-top:4px;">${item.category}</div> 
                    ${note}
                </td>
                <td class="txt-money ${color}" style="text-align:right;">
                    ${formatRupiah(item.nominal.toString(), 'Rp ')}
                </td>
                <td style="text-align:center;">
                    <button class="btn-action" style="background:#e0f2fe; color:#0369a1;" onclick="startEdit(${idx})">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-action" style="background:#fee2e2; color:#b91c1c;" onclick="deleteTransaction('${item.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// --- CRUD ---
async function handleFormSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSave');
    const oldTxt = btn.innerText;
    btn.disabled = true; btn.innerText = "Memproses...";
    
    const id = document.getElementById('trxId').value;
    const catSelect = document.getElementById('trxCategory').value;
    const catOther = document.getElementById('trxCategoryOther').value;
    
    const payload = {
        action: id ? 'edit_general' : 'input_general',
        id: id,
        type: document.querySelector('input[name="trxType"]:checked').value,
        category: (catSelect === 'Lainnya') ? catOther : catSelect,
        nominal: cleanRupiah(document.getElementById('trxNominal').value),
        date: document.getElementById('trxDate').value,
        time: document.getElementById('trxTime').value,
        pic: document.getElementById('trxPic').value,
        note: document.getElementById('trxNote').value
    };

    if(payload.nominal === 0) { alert("Nominal 0?"); btn.disabled=false; btn.innerText=oldTxt; return; }

    try {
        const res = await fetch(API_URL, { method:'POST', body:JSON.stringify(payload) });
        const json = await res.json();
        if(json.status) {
            alert("Berhasil!");
            cancelEditMode();
            loadHistory();
        } else {
            alert("Gagal: " + json.message);
        }
    } catch(err) {
        alert("Error koneksi");
    } finally {
        btn.disabled = false; btn.innerText = oldTxt;
    }
}

function startEdit(idx) {
    const d = allTransactions[idx];
    if(!d || !d.id) return;

    window.scrollTo({top:0, behavior:'smooth'});
    
    document.getElementById('trxId').value = d.id;
    document.getElementById('formHeader').innerHTML = '<span><i class="fa-solid fa-pen"></i> Edit Transaksi</span>';
    document.getElementById('btnCancel').style.display = 'block';
    
    // Type
    const radios = document.getElementsByName('trxType');
    for(let r of radios) {
        if(r.value === d.tipe) {
            r.checked = true;
            toggleColor(d.tipe === 'Keluar' ? 'red' : 'green');
        }
    }
    
    // Category (Perbaikan: Menggunakan d.category)
    const sel = document.getElementById('trxCategory');
    const currentCategory = d.category; // Gunakan .category
    
    let exist = false;
    for(let opt of sel.options) {
        if(opt.value === currentCategory) { sel.value = currentCategory; exist = true; break; }
    }
    if(!exist) {
        sel.value = 'Lainnya';
        document.getElementById('trxCategoryOther').style.display = 'block';
        document.getElementById('trxCategoryOther').value = currentCategory;
    } else {
        document.getElementById('trxCategoryOther').style.display = 'none';
    }

    // Others
    document.getElementById('trxNominal').value = formatRupiah(d.nominal.toString(), 'Rp ');
    document.getElementById('trxPic').value = d.pic;
    document.getElementById('trxNote').value = d.note || "";
    
    // Date
    let dateStr = d.tanggal; 
    // Handle format DD/MM/YYYY jika diperlukan
    if(dateStr.includes('/')) {
        const p = dateStr.split('/');
        dateStr = `${p[2]}-${p[1]}-${p[0]}`;
    }
    document.getElementById('trxDate').value = dateStr;
    document.getElementById('trxTime').value = d.jam || "00:00";
}

function cancelEditMode() {
    document.querySelector('form').reset();
    document.getElementById('trxId').value = "";
    document.getElementById('formHeader').innerHTML = '<span><i class="fa-regular fa-pen-to-square"></i> Input Baru</span>';
    document.getElementById('btnCancel').style.display = 'none';
    document.getElementById('trxCategoryOther').style.display = 'none';
    
    initDateTime();
    document.getElementById('trxNominal').value = "Rp 0";
    toggleColor('green');
}

async function deleteTransaction(id) {
    if(!confirm("Hapus data ini?")) return;
    try {
        await fetch(API_URL, { method:'POST', body:JSON.stringify({action:'delete_general', id:id}) });
        loadHistory();
    } catch(e){ alert("Gagal koneksi"); }
}