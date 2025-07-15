// Variabel Global
let originalMembers = [];
let filteredMembers = [];
let activeSectorFilter = null;
let activeSort = null;

// Kode khusus admin dan kode acak untuk pengguna
const adminCode = "Sadulursepoor12";
const userCodes = [
    "A1B2C", "SSJKT", "X9Y8Z", "K3L4M", "G7H8I", "P5Q6R",
    "U1V2W", "N3O4P", "Z5Y6X", "D7E8F", "M9N0O",
    "J1K2L", "T3U4V", "W5X6Y", "B7C8D", "H9I0J"
];

let currentWhatsAppUrl = "";

// Muat Data Anggota dari JSON
fetch('anggota.json')
    .then(response => response.json())
    .then(data => {
        originalMembers = data;
        filteredMembers = [...data];
        displayMembers(data);
    })
    .catch(error => console.error('Gagal memuat data anggota:', error));

// Menampilkan Kartu Anggota dengan Notifikasi Nama yang Tepat
function displayMembers(members) {
    const membersContainer = document.getElementById('membersContainer');
    membersContainer.innerHTML = '';

    members.forEach(member => {
        const memberCard = document.createElement('div');
        memberCard.className = 'member-card';
        memberCard.dataset.name = member.name;
        memberCard.dataset.kta = member.kta;
        memberCard.dataset.sektor = member.sektor;

        let hasPhoto = member.photoUrl && member.photoUrl.trim() !== "";
        let photoContent = hasPhoto
            ? `<img src="${member.photoUrl}" alt="Foto Anggota">`
            : '<span class="empty-photo">Tambahkan Foto</span>';

        memberCard.innerHTML = `
            <div class="card-header">${member.name}</div>
            <div class="card-body">
                <div class="card-text">
                    <p><strong>NIA:</strong> ${member.kta}</p>
                    <p><strong>Jenis Kelamin:</strong> ${member.jenisKelamin}</p>
                    <p><strong>Domisili:</strong> ${member.domisili}</p>
                    <p><strong>Sektor:</strong> ${member.sektor}</p>
                    <p><strong>Tanggal Lahir:</strong> ${member.tanggalLahir}</p>
                    
                    <div class="social-icons">
                        ${member.whatsapp ? 
                            `<a href="javascript:void(0);" onclick="openCodePopup('${member.whatsapp}', '${member.name}')" class="whatsapp-icon">
                                <i class="fab fa-whatsapp"></i>
                            </a>` 
                        : ''}
                        ${member.instagram ? `<a href="${member.instagram}" target="_blank" class="instagram-icon"><i class="fab fa-instagram"></i></a>` : ''}
                    </div>
                </div>
                
                <div class="photo-frame" ${hasPhoto ? '' : `onclick="requestPhoto('${member.name}', '${member.kta}')"`}>
                    ${photoContent}
                </div>
            </div>
        `;
        membersContainer.appendChild(memberCard);
    });
}

// Fungsi Pencarian Anggota
function searchMembers() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const members = document.querySelectorAll('.member-card');

    members.forEach(member => {
        const name = member.dataset.name.toLowerCase();
        const kta = member.dataset.kta.toLowerCase();
        member.style.display = (name.includes(searchInput) || kta.includes(searchInput)) ? '' : 'none';
    });
}

// Tampilkan atau Sembunyikan Opsi Filter - DIPERBAIKI
function toggleFilterOptions() {
    const filterDropdown = document.querySelector('.filter-dropdown');
    const isVisible = filterDropdown.style.display === 'block';
    
    if (isVisible) {
        filterDropdown.style.display = 'none';
    } else {
        filterDropdown.style.display = 'block';
    }
}

// Fungsi untuk menutup filter dropdown
function closeFilterDropdown() {
    const filterDropdown = document.querySelector('.filter-dropdown');
    filterDropdown.style.display = 'none';
}

// Fungsi untuk Filter Sektor
function filterBySector(button, sector) {
    if (activeSectorFilter === sector) {
        button.classList.remove('active');
        activeSectorFilter = null;
        filteredMembers = [...originalMembers];
    } else {
        document.querySelectorAll('.sector-filter').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        activeSectorFilter = sector;
        filteredMembers = originalMembers.filter(member => member.sektor === sector);
    }

    if (activeSort) {
        sortMembers(activeSort);
    } else {
        displayMembers(filteredMembers);
    }
    
    // Tutup dropdown setelah memilih filter
    closeFilterDropdown();
}

// Fungsi untuk Sortir Anggota
function sortMembers(criteria) {
    activeSort = criteria;

    let sortedMembers = [...filteredMembers];

    switch (criteria) {
        case 'name-asc':
            sortedMembers.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            sortedMembers.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'id-asc':
            sortedMembers.sort((a, b) => a.kta.localeCompare(b.kta));
            break;
    }

    displayMembers(sortedMembers);
    
    // Tutup dropdown setelah memilih sort
    closeFilterDropdown();
}

// Fungsi Menampilkan Notifikasi Tambah Foto
function requestPhoto(name, kta) {
    const confirmationBox = document.createElement('div');
    confirmationBox.className = 'photo-confirmation';
    confirmationBox.innerHTML = `
        <div class="confirmation-content">
            <div class="confirmation-header">
                <i class="fas fa-camera-retro"></i>
                <h2>Tambahkan Foto</h2>
            </div>
            <p>Anda ingin menambahkan foto untuk <strong>${name} (${kta})</strong>?</p>
            <p class="photo-guideline">Pakaian dan gaya menyesuaikan diri asalkan rapi dan sopan.</p>
            <div class="confirmation-buttons">
                <button class="cancel-button" onclick="closeConfirmation()">Batal</button>
                <button class="confirm-button" onclick="redirectToWhatsApp('${name}', '${kta}')">Lanjut</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmationBox);
}

function redirectToWhatsApp(name, kta) {
    const message = `Halo Admin, saya ingin mengganti atau menambahkan foto untuk:\n\nNama: ${name}\nKTA: ${kta}\n\nMohon panduannya, terima kasih.`;
    const phoneNumber = "6282112964343"; // Ganti dengan nomor admin utama jika perlu
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    closeConfirmation();
}

// Fungsi Menutup Notifikasi
function closeConfirmation() {
    document.querySelector('.photo-confirmation').remove();
}

// Fungsi Membuka Popup Kode Verifikasi dengan Nama Identitas
function openCodePopup(waUrl, name) {
    currentWhatsAppUrl = waUrl;
    currentName = name;

    const popup = document.getElementById('codeVerificationPopup');
    const infoText = document.getElementById('verificationInfo');

    // Memastikan nama tidak "undefined" dan ditampilkan dengan benar
    if (name) {
        infoText.innerHTML = `Apakah Anda ingin menghubungi <strong>${name}</strong>? 
        Admin tidak mengetahui siapa yang Anda chat atau terenkripsi secara end-to-end.`;
    } else {
        infoText.innerHTML = `Apakah Anda yakin ingin melanjutkan? 
        Admin tidak mengetahui siapa yang Anda chat atau terenkripsi secara end-to-end.`;
    }
    
    popup.style.display = 'block';
}

// Fungsi Menutup Popup Kode
function closeCodePopup() {
    document.getElementById('codeVerificationPopup').style.display = 'none';
    document.getElementById('verificationCodeInput').value = "";
}

// Fungsi Menampilkan Notifikasi Sukses
function showSuccessNotification() {
    const notification = document.getElementById('successNotification');
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
        window.location.href = currentWhatsAppUrl;
    }, 2000);
}

// Fungsi Menampilkan Notifikasi Kode Tidak Valid
function showErrorNotification() {
    const notification = document.getElementById('errorNotification');
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 2000);
}

// Fungsi Verifikasi Kode
function verifyCode() {
    const inputCode = document.getElementById('verificationCodeInput').value.trim();
    if (inputCode === adminCode || userCodes.includes(inputCode)) {
        closeCodePopup();
        showSuccessNotification();
    } else {
        showErrorNotification();
    }
}

// Link WhatsApp untuk dua admin
const adminLinks = [
    "https://wa.me/6282112964343?text=Saya+ingin+meminta+kode+verifikasi.",
    "https://wa.me/6285695595471?text=Saya+ingin+meminta+kode+verifikasi."
];

// Fungsi Mengarahkan ke WhatsApp Admin secara Acak
function requestVerificationCode() {
    // Pilih salah satu admin secara acak
    const randomAdminLink = adminLinks[Math.floor(Math.random() * adminLinks.length)];
    window.location.href = randomAdminLink;
}

// Event listener untuk menutup filter dropdown ketika klik di luar area
document.addEventListener('click', function(event) {
    const filterSection = document.querySelector('.filter-section');
    const filterDropdown = document.querySelector('.filter-dropdown');
    
    // Cek apakah klik terjadi di luar filter section
    if (filterSection && !filterSection.contains(event.target)) {
        if (filterDropdown) {
            filterDropdown.style.display = 'none';
        }
    }
});

// Tambahkan event listener untuk tombol filter dan sortir
document.addEventListener('DOMContentLoaded', () => {
    // Event listener untuk tombol filter
    const filterBtn = document.querySelector('.filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', function(event) {
            event.stopPropagation(); // Mencegah event bubbling
            toggleFilterOptions();
        });
    }

    // Event listener untuk filter dropdown agar tidak menutup ketika diklik
    const filterDropdown = document.querySelector('.filter-dropdown');
    if (filterDropdown) {
        filterDropdown.addEventListener('click', function(event) {
            event.stopPropagation(); // Mencegah event bubbling
        });
    }

    // Event listener untuk sector filter buttons
    document.querySelectorAll('.sector-filter').forEach(button => {
        button.addEventListener('click', function() {
            filterBySector(this, this.getAttribute('data-sector'));
        });
    });

    // Event listener untuk sort options buttons
    document.querySelectorAll('[data-sort]').forEach(button => {
        button.addEventListener('click', function() {
            sortMembers(this.getAttribute('data-sort'));
        });
    });
});