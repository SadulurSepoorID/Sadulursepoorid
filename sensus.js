let dataKereta = [];
let selectedItem = null;

// Load data dari JSON
fetch('sensus.json')
  .then(response => response.json())
  .then(data => {
    dataKereta = data;
  })
  .catch(err => console.error('Gagal load data:', err));

// Update tanggal & waktu
function updateDateTime() {
  const now = new Date();
  const date = now.toLocaleDateString('id-ID');
  const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  document.getElementById('date').textContent = date;
  document.getElementById('time').textContent = time;
}
setInterval(updateDateTime, 1000);
updateDateTime();

const searchInput = document.getElementById('searchInput');
const suggestionsContainer = document.getElementById('suggestions');
const resultsContainer = document.getElementById('results');

// Saat user ketik
searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();
  suggestionsContainer.innerHTML = '';
  selectedItem = null;

  if (!query) return;

  const suggestions = dataKereta.filter(item =>
    item.namaKa.toLowerCase().includes(query) ||
    item.nomorKa.toLowerCase().includes(query) ||
    item.lokomotif.toLowerCase().includes(query)
  ).slice(0, 5);

  suggestions.forEach(item => {
    const div = document.createElement('div');
    div.classList.add('suggestion-item');
    const lokomotifText = (item.lokomotif === 'n/a' || item.lokomotif === 'CC 20') ? '' : ` - ${item.lokomotif}`;
    div.textContent = `${item.nomorKa} - ${item.namaKa}${lokomotifText}`;
    div.addEventListener('click', () => {
      searchInput.value = `${item.nomorKa} - ${item.namaKa}`;
      selectedItem = item;
      suggestionsContainer.innerHTML = '';
      showResult(item);
    });
    suggestionsContainer.appendChild(div);
  });
});

// Enter keyboard
searchInput.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    handleSearch();
    suggestionsContainer.innerHTML = '';
  }
});

// Clear pencarian
function clearSearch() {
  searchInput.value = '';
  resultsContainer.innerHTML = '';
  suggestionsContainer.innerHTML = '';
  selectedItem = null;
}

// Handle search manual
function handleSearch() {
  const query = searchInput.value.trim().toLowerCase();
  resultsContainer.innerHTML = '';

  if (!query) return;

  // Jangan tampilkan hasil jika input adalah "n/a" atau "cc 20"
  if (query === 'n/a' || query === 'cc 20') {
    resultsContainer.innerHTML = '<p>Tidak ada hasil ditemukan.</p>';
    return;
  }

  if (selectedItem) {
    showResult(selectedItem);
    return;
  }

  const match = dataKereta.find(item =>
    item.namaKa.toLowerCase() === query ||
    item.nomorKa.toLowerCase() === query
  );

  if (match) {
    showResult(match);
  } else {
    resultsContainer.innerHTML = '<p>Tidak ada hasil ditemukan.</p>';
  }
}

// Tampilkan hasil detail
function showResult(item) {
  const now = new Date();
  const status = getStatus(item.berangkat, item.datang, now);
  const [kotaA, kotaB] = item.relasi.split('-');

  const lokomotif = (item.lokomotif === 'n/a' || item.lokomotif === 'CC 20') 
    ? 'belum diketahui' 
    : item.lokomotif;

  resultsContainer.innerHTML = `
    <div class="result-item">
      <p><strong>Lokomotif:</strong> ${lokomotif}</p>
      <p><strong>Nomor Ka:</strong> ${item.nomorKa}</p>
      <p><strong>Nama Ka:</strong> ${item.namaKa}</p>
      <p><strong>Relasi:</strong> ${item.relasi}</p>
      <p><strong>Berangkat ${kotaA}:</strong> ${item.berangkat}</p>
      <p><strong>Datang ${kotaB}:</strong> ${item.datang}</p>
      <p><strong>Status:</strong> <span class="status ${status}">${status}</span></p>
    </div>
  `;
}

// Hitung status
function getStatus(jamBerangkat, jamDatang, now) {
  const [bJam, bMenit] = jamBerangkat.split(':').map(Number);
  const [dJam, dMenit] = jamDatang.split(':').map(Number);
  const berangkat = new Date(now);
  const datang = new Date(now);
  berangkat.setHours(bJam, bMenit, 0);
  datang.setHours(dJam, dMenit, 0);

  const selisih = (berangkat - now) / (1000 * 60);

  if (now > datang) return 'Finished';
  if (now >= berangkat) return 'Running';
  if (selisih <= 60) return 'Publish';
  return 'Program';
}