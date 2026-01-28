document.addEventListener('DOMContentLoaded', () => {
    initDateTime();
    checkLogin();
    loadDashboardData();
});

// --- Auth Check ---
function checkLogin() {
    // const session = localStorage.getItem('user_session');
    // if (!session) window.location.replace("../login/index.html"); 
}

function logout() {
    localStorage.removeItem('user_session');
    window.location.href = '../login/index.html';
}

function toggleSidebar() {
    document.getElementById('mySidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

// --- Logic Dashboard & API ---

async function loadDashboardData() {
    document.getElementById('stat-saldo').innerText = "Memuat...";
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_finance_dashboard' })
        });
        const result = await response.json();

        if (result.status) {
            // 1. Update Kartu Statistik
            document.getElementById('stat-saldo').innerText = formatRupiah(result.saldo);
            document.getElementById('stat-in').innerText = formatRupiah(result.minggu_masuk);
            document.getElementById('stat-out').innerText = formatRupiah(result.minggu_keluar);

            // 2. Render Grafik
            initChart(result.chart);

            // 3. Render Tabel Riwayat
            renderHistoryTable(result.riwayat || []); 

        } else {
            console.error("Gagal load data:", result.message);
            document.getElementById('stat-saldo').innerText = "Error";
            document.getElementById('history-table-body').innerHTML = 
                `<tr><td colspan="4" style="text-align:center; color:red; padding:20px;">Gagal memuat data.</td></tr>`;
        }
    } catch (error) {
        console.error("Error connection:", error);
        document.getElementById('stat-saldo').innerText = "Offline";
        document.getElementById('history-table-body').innerHTML = 
            `<tr><td colspan="4" style="text-align:center; padding:20px;">Koneksi terputus.</td></tr>`;
    }
}

// --- Fungsi Render Tabel (PERBAIKAN DI SINI) ---
function renderHistoryTable(data) {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = ''; 

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">Belum ada data transaksi.</td></tr>`;
        return;
    }

    data.forEach(item => {
        let badgeClass = 'badge-general';
        let nominalClass = '';
        
        // PENTING: Menggunakan item.category (bukan item.kategori)
        let labelKategori = item.category || 'Umum'; 

        if (item.tipe === 'Masuk') {
            badgeClass = 'badge-success';
            nominalClass = 'text-success';
        } else {
            badgeClass = 'badge-danger';
            nominalClass = 'text-danger';
        }

        const row = `
            <tr>
                <td>${item.tanggal}</td>
                <td>
                    <span class="${badgeClass}">${labelKategori}</span>
                    ${item.note && item.note !== '-' ? `<br><small style="color:#888; font-size:0.8em;">${item.note}</small>` : ''}
                </td>
                <td>${item.pic || '-'}</td>
                <td class="${nominalClass}">
                    ${formatRupiah(item.nominal)}
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// --- Chart.js Configuration ---
let financeChartInstance = null;

function initChart(chartData) {
    const ctx = document.getElementById('financeChart').getContext('2d');
    
    if (financeChartInstance) {
        financeChartInstance.destroy();
    }

    const labels = chartData ? chartData.labels : [];
    const dMasuk = chartData ? chartData.masuk : [];
    const dKeluar = chartData ? chartData.keluar : [];

    financeChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Pemasukan',
                    data: dMasuk,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Pengeluaran',
                    data: dKeluar,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'Rp ' + value.toLocaleString('id-ID');
                        }
                    }
                }
            }
        }
    });
}

// --- Utilities ---
function initDateTime() {
    const dateDisplay = document.getElementById('date-display');
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    if(dateDisplay) dateDisplay.innerText = now.toLocaleDateString('id-ID', options);
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}

function downloadPDF() {
    const element = document.getElementById('laporan-area');
    const opt = {
        margin: 0.5,
        filename: 'Laporan_Keuangan_Sadulur_Sepoor.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}