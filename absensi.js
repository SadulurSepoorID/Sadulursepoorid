// Menampilkan modal saat tombol "Saya Izin Tidak Hadir" diklik
document.getElementById('izinButton').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'flex';
});

// Menutup modal saat tombol "Batal" diklik
document.getElementById('cancelButton').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

// Fungsi tombol kembali ke halaman sebelumnya
document.getElementById('backButton').addEventListener('click', () => {
  history.back();
});