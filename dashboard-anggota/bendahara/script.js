document.addEventListener('DOMContentLoaded', () => {
    // 1. Inisialisasi Tanggal & Jam
    initDateTime();
    
    // 2. Cek Login (Opsional tapi disarankan)
    checkLogin();

    // 3. Load Data Dashboard dari Google Sheets
    loadDashboardData();
});

// --- Auth Check ---
function checkLogin() {
    const session = localStorage.getItem('user_session');
    // Jika perlu redirect:
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
    // Tampilkan state loading sementara (opsional)
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

            // 2. Render Chart dengan Data Real
            initChart(result.chart);
        } else {
            console.error("Gagal load data:", result.message);
            document.getElementById('stat-saldo').innerText = "Error";
        }
    } catch (error) {
        console.error("Error connection:", error);
        document.getElementById('stat-saldo').innerText = "Offline";
    }
}

// --- Handle Submit Form Transaksi ---
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const btn = document.querySelector('.btn-save');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    // Ambil Data dari Form
    const type = document.querySelector('input[name="trxType"]:checked').value;
    let category = document.getElementById('trxCategory').value;
    if (category === 'Lainnya') {
        category = document.getElementById('trxCategoryOther').value;
    }
    const nominal = document.getElementById('trxNominal').value;
    const date = document.getElementById('trxDate').value;
    const time = document.getElementById('trxTime').value;
    const pic = document.getElementById('trxPic').value || "-";

    const payload = {
        action: 'input_general',
        type: type,
        category: category,
        nominal: nominal,
        date: date,
        time: time,
        pic: pic
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.status) {
            alert("✅ Transaksi Berhasil Disimpan!");
            event.target.reset();
            initDateTime(); // Reset tanggal ke hari ini
            document.getElementById('trxCategoryOther').classList.add('hidden');
            
            // Refresh Dashboard setelah simpan
            loadDashboardData(); 
        } else {
            alert("❌ Gagal: " + result.message);
        }
    } catch (error) {
        console.error(error);
        alert("❌ Terjadi kesalahan koneksi.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// --- Chart.js Real Data ---
let financeChartInstance = null;

function initChart(chartData) {
    const ctx = document.getElementById('financeChart').getContext('2d');
    
    // Hapus chart lama jika ada (agar tidak menumpuk saat refresh)
    if (financeChartInstance) {
        financeChartInstance.destroy();
    }

    // Default data kosong agar tidak error jika data belum ada
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
                            if (label) {
                                label += ': ';
                            }
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
    const dateInput = document.getElementById('trxDate');
    const timeInput = document.getElementById('trxTime');
    const dateDisplay = document.getElementById('date-display');
    const now = new Date();
    
    if(dateInput) dateInput.value = now.toISOString().split('T')[0];
    if(timeInput) timeInput.value = now.toTimeString().slice(0,5);

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    if(dateDisplay) dateDisplay.innerText = now.toLocaleDateString('id-ID', options);
}

function checkOtherOption(selectElement) {
    const otherInput = document.getElementById('trxCategoryOther');
    if (selectElement.value === 'Lainnya') {
        otherInput.classList.remove('hidden');
        otherInput.required = true;
        otherInput.focus();
    } else {
        otherInput.classList.add('hidden');
        otherInput.required = false;
        otherInput.value = '';
    }
}

function toggleCategoryColor() {
    // Bisa tambahkan logika visual ganti warna border form saat radio button berubah
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