document.addEventListener('DOMContentLoaded', () => {
    setDefaultDateTime();
    loadDashboardData();
});

function switchTab(tabId, element) {
    document.querySelectorAll('.view-section').forEach(sec => sec.style.display = 'none');
    document.getElementById('view-' + tabId).style.display = 'block';
    
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    element.classList.add('active');
    loadDashboardData();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

function setDefaultDateTime() {
    const now = new Date();
    document.getElementById('tglTrx').value = now.toISOString().split('T')[0];
    document.getElementById('jamTrx').value = now.toTimeString().slice(0, 5);
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
}

function formatInputRupiah(input) {
    let value = input.value.replace(/[^,\d]/g, '').toString();
    if (value) input.value = new Intl.NumberFormat('id-ID').format(value);
    else input.value = '';
}

// --- Fetch & Render Data ---
async function loadDashboardData() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'get_finance_dashboard' })
        });
        const result = await response.json();

        // Pastikan response sukses
        if (result.status) {
            document.getElementById('stat-saldo').innerText = formatRupiah(result.saldo);
            document.getElementById('stat-in').innerText = formatRupiah(result.bulan_masuk);
            document.getElementById('stat-out').innerText = formatRupiah(result.bulan_keluar);
            
            initCharts(result);
            renderTop10(result.top_10_kas || []);
            renderHistoryTable(result.riwayat || []); 
        } else {
            Swal.fire('Gagal', result.message, 'error');
        }
    } catch (error) {
        console.error("Detail Error:", error);
        Swal.fire('Offline / Error Sistem', 'Gagal memuat visualisasi data. Pastikan Google Apps Script sudah di-Deploy versi terbaru!', 'error');
    }
}

// --- INISIASI CHART LENGKAP ---
let pieSaldo, pieIncome, pieExpense, barTahunan;
const chartColors = ['#0A58CA', '#10B981', '#F59E0B', '#E11D48', '#8B5CF6', '#14B8A6', '#F97316', '#3B82F6'];

function initCharts(data) {
    if(pieSaldo) pieSaldo.destroy();
    if(pieIncome) pieIncome.destroy();
    if(pieExpense) pieExpense.destroy();
    if(barTahunan) barTahunan.destroy();

    const getPieOptions = () => ({
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, font: {size: 11} } },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let total = context.dataset.data.reduce((a, b) => a + b, 0);
                        let val = context.raw;
                        let persen = total > 0 ? ((val / total) * 100).toFixed(1) + '%' : '0%';
                        return ` ${context.label}: ${formatRupiah(val)} (${persen})`;
                    }
                }
            }
        }
    });

    const checkData = (obj) => {
        if(!obj || !obj.labels || obj.labels.length === 0) return { labels: ['Belum Ada'], data: [1], bg: ['#E2E8F0'] };
        return { labels: obj.labels, data: obj.data, bg: chartColors };
    };

    let pSaldo = checkData(data.sumber_saldo);
    pieSaldo = new Chart(document.getElementById('pieSaldo'), {
        type: 'doughnut', data: { labels: pSaldo.labels, datasets: [{ data: pSaldo.data, backgroundColor: pSaldo.bg }] }, options: getPieOptions()
    });

    let pIn = checkData(data.sumber_income);
    pieIncome = new Chart(document.getElementById('pieIncome'), {
        type: 'doughnut', data: { labels: pIn.labels, datasets: [{ data: pIn.data, backgroundColor: pIn.bg }] }, options: getPieOptions()
    });

    let pOut = checkData(data.sumber_pengeluaran);
    pieExpense = new Chart(document.getElementById('pieExpense'), {
        type: 'doughnut', data: { labels: pOut.labels, datasets: [{ data: pOut.data, backgroundColor: pOut.bg }] }, options: getPieOptions()
    });

    // BAR CHART TAHUNAN (Dilengkapi Safeguard)
    let grafMasuk = data.grafik_tahunan ? data.grafik_tahunan.masuk : [0,0,0,0,0,0,0,0,0,0,0,0];
    let grafKeluar = data.grafik_tahunan ? data.grafik_tahunan.keluar : [0,0,0,0,0,0,0,0,0,0,0,0];

    barTahunan = new Chart(document.getElementById('barTahunan'), {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
            datasets: [
                { label: 'Pemasukan', data: grafMasuk, backgroundColor: '#10B981', borderRadius: 4 },
                { label: 'Pengeluaran', data: grafKeluar, backgroundColor: '#E11D48', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + formatRupiah(c.raw) } } },
            scales: { y: { ticks: { callback: v => 'Rp ' + (v/1000) + 'K' } } }
        }
    });
}

function renderTop10(data) {
    const box = document.getElementById('top10List');
    if(!data || data.length === 0) {
        box.innerHTML = '<p class="text-center">Belum ada penyumbang kas.</p>';
        return;
    }
    
    let html = '';
    data.forEach((item, i) => {
        let rankHtml = i + 1;
        if(i === 0) rankHtml = '<i class="fa-solid fa-trophy" style="color:#F59E0B; font-size:1.1rem;"></i>';
        else if(i === 1) rankHtml = '<i class="fa-solid fa-medal" style="color:#94A3B8; font-size:1.1rem;"></i>';
        else if(i === 2) rankHtml = '<i class="fa-solid fa-medal" style="color:#B45309; font-size:1.1rem;"></i>';
        
        html += `
            <div class="leaderboard-item">
                <div class="leaderboard-info">
                    <span class="leaderboard-rank">${rankHtml}</span>
                    <span class="leaderboard-name">${item.nama}</span>
                </div>
                <div class="leaderboard-total">${formatRupiah(item.total)}</div>
            </div>`;
    });
    box.innerHTML = html;
}

function renderHistoryTable(data) {
    const tbody = document.getElementById('history-table-body');
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding:20px;">Belum ada data transaksi.</td></tr>`;
        return;
    }

    let rowsHtml = ''; 
    data.forEach(item => {
        let badgeClass = item.tipe === 'Masuk' ? 'badge-success' : 'badge-danger';
        let nominalClass = item.tipe === 'Masuk' ? 'text-green' : 'text-red';
        let prefix = item.tipe === 'Masuk' ? '+' : '-';

        rowsHtml += `
            <tr>
                <td><strong>${item.tanggal}</strong></td>
                <td>
                    <span class="badge ${badgeClass}">${item.category || 'Umum'}</span>
                    ${item.note && item.note !== '-' ? `<div style="font-size:0.85rem; color:#64748B; margin-top:5px;">${item.note}</div>` : ''}
                </td>
                <td>${item.pic || '-'}</td>
                <td class="${nominalClass}" style="font-weight:600;">${prefix} ${formatRupiah(item.nominal)}</td>
            </tr>`;
    });
    tbody.innerHTML = rowsHtml;
}

// --- Submit Transaksi Baru ---
async function handleFormSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmit');
    const oriText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
    btn.disabled = true;

    const rawNominal = document.getElementById('nomTrx').value.replace(/\./g, '');

    const payload = {
        action: 'input_general', date: document.getElementById('tglTrx').value,
        time: document.getElementById('jamTrx').value, type: document.getElementById('jenisTrx').value,
        category: document.getElementById('katTrx').value, nominal: rawNominal,
        pic: document.getElementById('picTrx').value, note: document.getElementById('ketTrx').value
    };

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();

        if (result.status) {
            Swal.fire({ title: 'Tersimpan!', text: 'Transaksi berhasil dicatat.', icon: 'success', timer: 2000, showConfirmButton: false });
            document.getElementById('formTransaksi').reset();
            setDefaultDateTime();
            loadDashboardData(); 
        } else {
            Swal.fire('Gagal Menyimpan', result.message, 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'Gagal terhubung ke server.', 'error');
    } finally {
        btn.innerHTML = oriText;
        btn.disabled = false;
    }
}

function logout() {
    Swal.fire('Logout', 'Anda telah keluar dari halaman bendahara.', 'info');
}