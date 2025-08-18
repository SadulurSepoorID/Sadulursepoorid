function showChart() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>Statistik Kehadiran 2025</h2>
    <canvas id="myChart" width="400" height="200"></canvas>
  `;

  const labels = [];
  const data = [];
  let maxKehadiran = 0; // Variabel untuk menghitung kehadiran terbanyak

  dataKegiatan.forEach(kegiatan => {
    const tanggal = new Date(kegiatan.tanggal);
    const formattedDate = tanggal.getDate().toString().padStart(2, '0') + ' ' + 
                          tanggal.toLocaleString('default', { month: 'short' }); // Format: "20 Apr"
    labels.push(formattedDate); // Hanya tanggal dan bulan yang ditampilkan
    const kehadiran = kegiatan.absensi.filter(a => a.status === "Hadir").length;
    data.push(kehadiran);
    maxKehadiran = Math.max(maxKehadiran, kehadiran); // Update kehadiran terbanyak
  });

  // Menghitung kelipatan 10 berikutnya yang lebih tinggi dari maxKehadiran
  const stepSize = Math.ceil(maxKehadiran / 10) * 10; // Kelipatan 10 berikutnya
  const maxScale = Math.max(stepSize, Math.ceil(maxKehadiran / 10) * 10); // Agar selalu lebih besar atau sama dengan maxKehadiran

  const ctx = document.getElementById('myChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Jumlah Kehadiran',
        data: data,
        backgroundColor: 'rgba(0, 123, 255, 0.5)',
        borderColor: 'rgba(0, 123, 255, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true, // Membuat chart responsif
      scales: {
        x: {
          ticks: {
            autoSkip: true,   // Menghindari label yang terlalu padat
            maxRotation: 45,  // Rotasi label supaya tidak tumpuk
            minRotation: 0,   // Tidak rotasi jika memungkinkan
          },
          title: {
            display: true,
            text: 'Tanggal (Bulan)'
          }
        },
        y: {
          beginAtZero: true,
          max: maxScale, // Menentukan nilai maksimal untuk sumbu Y
          ticks: {
            stepSize: 10,  // Menampilkan kelipatan 10
            precision: 0,  // Tidak ada desimal
            callback: function(value, index, values) {
              if (value % 10 === 0) {
                return value;
              }
            }
          }
        }
      }
    }
  });
}