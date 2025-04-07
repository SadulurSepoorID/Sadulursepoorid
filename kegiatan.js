// Data kegiatan untuk perhitungan hari
const kegiatan = [
    { tanggal: "2024-12-14", id: "selisih-hari-1" }
];

// Fungsi untuk menghitung selisih hari
function hitungSelisihHari(tanggalKegiatan, elemenId) {
    const hariIni = new Date();
    const tanggal = new Date(tanggalKegiatan);
    const selisihHari = Math.ceil((tanggal - hariIni) / (1000 * 60 * 60 * 24));
    const elemen = document.getElementById(elemenId);
    if (elemen) {
        elemen.textContent = selisihHari > 0 ? `${selisihHari} hari lagi` : "Hari ini";
    }
}

// Jalankan perhitungan untuk semua kegiatan
kegiatan.forEach(item => {
    hitungSelisihHari(item.tanggal, item.id);
});