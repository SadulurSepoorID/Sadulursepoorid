// A. VARIABEL GLOBAL DAN KONFIGURASI
// ===================================

let originalMembers = [];
let filteredMembers = [];
let activeSectorFilter = null;
let activeSort = null;
let lastScrollTop = 0; // Untuk fungsionalitas header

// Kode verifikasi untuk akses WhatsApp
const adminCode = "Sadulursepoor12";
const userCodes = [
    "A1B2C", "SSJKT1", "X9Y8Z", "K3L4M", "G7H8I", "P5Q6R",
    "U1V2W", "N3O4P", "Z5Y6X", "D7E8F", "M9N0O",
    "J1K2L", "T3U4V", "W5X6Y", "B7C8D", "H9I0J"
];

let currentWhatsAppUrl = "";

// B. FUNGSI UTAMA (MEMUAT DAN MENAMPILKAN DATA)
// ============================================

// Memuat data anggota dari file JSON saat halaman pertama kali dibuka
fetch('anggota2.json')
    .then(response => response.json())
    .then(data => {
        originalMembers = data;
        filteredMembers = [...data];
        displayMembers(data);
    })
    .catch(error => console.error('Gagal memuat data anggota:', error));

// Menampilkan kartu-kartu anggota di halaman
function displayMembers(members) {
    const membersContainer = document.getElementById('membersContainer');
    membersContainer.innerHTML = '';

    members.forEach(member => {
        const memberCard = document.createElement('div');
        memberCard.className = 'card';
        memberCard.dataset.name = member.name;
        memberCard.dataset.kta = member.kta;
        memberCard.dataset.sektor = member.sektor;

        const hasPhoto = member.photoUrl && member.photoUrl.trim() !== "";
        const photoContent = hasPhoto
            ? `<img src="${member.photoUrl}" alt="Foto ${member.name}">`
            : '<span class="empty-photo-text">Tambahkan Foto</span>';

        let socialLinks = '';
        if (member.whatsapp) {
            socialLinks += `
                <a href="javascript:void(0);" onclick="openCodePopup('${member.whatsapp}', '${member.name}')">
                    <img src="https://img.icons8.com/ios-filled/30/25D366/whatsapp.png" alt="WhatsApp"/>
                </a>`;
        }
        if (member.instagram) {
            socialLinks += `
                <a href="${member.instagram}" target="_blank">
                    <img src="https://img.icons8.com/color/30/instagram-new--v1.png" alt="Instagram"/>
                </a>`;
        }

        memberCard.innerHTML = `
            <div class="card-text">
                <h2>${member.name}</h2>
                <div class="nia">${member.kta}</div>
                <div class="info">
                    <p><strong>Domisili:</strong> ${member.domisili || 'N/A'}</p>
                    <p><strong>Sektor:</strong> ${member.sektor || 'N/A'}</p>
                    <p><strong>Tanggal Lahir:</strong> ${member.tanggalLahir || 'N/A'}</p>
                </div>
                <div class="socials">
                    ${socialLinks}
                </div>
            </div>
            <div class="card-photo" ${hasPhoto ? '' : `onclick="requestPhoto('${member.name}', '${member.kta}')"`}>
                ${photoContent}
            </div>
        `;
        membersContainer.appendChild(memberCard);
    });
}

// C. FUNGSI PENCARIAN, FILTER, DAN PENGURUTAN
// ==========================================

// Mencari anggota berdasarkan nama atau KTA
function searchMembers() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const members = document.querySelectorAll('.card');

    members.forEach(member => {
        const name = member.dataset.name.toLowerCase();
        const kta = member.dataset.kta.toLowerCase();
        member.style.display = (name.includes(searchInput) || kta.includes(searchInput)) ? '' : 'none';
    });
}

// Membuka atau menutup menu filter (responsif)
function toggleSortOptions() {
    const filterDropdown = document.querySelector('.filter-dropdown');
    const overlay = document.querySelector('.filter-overlay');
    
    // Toggle class 'show' pada dropdown dan overlay
    filterDropdown.classList.toggle('show');
    overlay.classList.toggle('show');
}

// Menutup menu filter
function closeFilterDropdown() {
    document.querySelector('.filter-dropdown').classList.remove('show');
    document.querySelector('.filter-overlay').classList.remove('show');
}

// Menyaring anggota berdasarkan sektor
function filterBySector(button, sector) {
    document.querySelectorAll('.sector-filter').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    activeSectorFilter = sector;
    filteredMembers = originalMembers.filter(member => member.sektor === sector);

    applySortAndDisplay();
    closeFilterDropdown();
}

// Mengurutkan anggota
function sortMembers(criteria) {
    activeSort = criteria;
    applySortAndDisplay();
    closeFilterDropdown();
}

// Menerapkan pengurutan yang aktif dan menampilkan hasilnya
function applySortAndDisplay() {
    let membersToDisplay = [...filteredMembers];
    if (activeSort) {
        switch (activeSort) {
            case 'name-asc':
                membersToDisplay.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                membersToDisplay.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'id-asc':
                membersToDisplay.sort((a, b) => a.kta.localeCompare(b.kta));
                break;
        }
    }
    displayMembers(membersToDisplay);
}

// D. FUNGSI MODAL & NOTIFIKASI
// ============================

function requestPhoto(name, kta) {
    const isConfirmed = confirm(`Anda akan diarahkan ke WhatsApp untuk mengirim foto bagi anggota:\n\nNama: ${name}\nKTA: ${kta}\n\nLanjutkan?`);
    
    if (isConfirmed) {
        const nomorAdmin = "6282112964343"; // Nomor admin dari footer
        const pesan = `Halo Admin, saya ingin mengajukan penambahan foto untuk anggota atas nama *${name}* dengan nomor KTA *${kta}*. Berikut saya lampirkan fotonya.`;
        
        // Membuat URL WhatsApp yang aman
        const whatsappUrl = `https://wa.me/${nomorAdmin}?text=${encodeURIComponent(pesan)}`;
        
        // Membuka WhatsApp di tab baru
        window.open(whatsappUrl, '_blank');
    }
}

// Membuka popup verifikasi kode untuk WhatsApp
function openCodePopup(waUrl, name) {
    currentWhatsAppUrl = waUrl;
    const popup = document.getElementById('codeVerificationPopup');
    const infoText = document.getElementById('verificationInfo');
    
    infoText.innerHTML = `Anda akan menghubungi <strong>${name}</strong>. Lanjutkan?`;
    popup.classList.add('show');
}

// Menutup popup verifikasi kode
function closeCodePopup() {
    const popup = document.getElementById('codeVerificationPopup');
    popup.classList.remove('show');
}

// Memverifikasi kode yang dimasukkan pengguna
function verifyCode() {
    const inputCode = document.getElementById('verificationCodeInput').value.trim();
    if (inputCode === adminCode || userCodes.includes(inputCode)) {
        closeCodePopup();
        alert("Verifikasi Berhasil! Mengarahkan ke WhatsApp...");
        window.location.href = currentWhatsAppUrl;
    } else {
        alert("Kode tidak valid!");
    }
}

// E. EVENT LISTENERS (UNTUK INTERAKSI PENGGUNA)
// ===========================================

document.addEventListener('DOMContentLoaded', () => {
    const filterBtn = document.querySelector('.filter-btn');
    const filterSection = document.querySelector('.filter-section');
    const filterDropdown = document.querySelector('.filter-dropdown');
    const overlay = document.querySelector('.filter-overlay');

    document.querySelectorAll('.sector-filter').forEach(button => {
        button.addEventListener('click', function() {
            filterBySector(this, this.getAttribute('data-sector'));
        });
    });

    document.querySelectorAll('[data-sort]').forEach(button => {
        button.addEventListener('click', function() {
            sortMembers(this.getAttribute('data-sort'));
        });
    });

    filterDropdown.addEventListener('click', (event) => event.stopPropagation());

    filterBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleSortOptions();
    });

    overlay.addEventListener('click', closeFilterDropdown);

    document.addEventListener('click', (event) => {
        if (filterDropdown.style.display === 'block' && !filterSection.contains(event.target)) {
            closeFilterDropdown();
        }
    });
});

window.addEventListener('scroll', function() {
    const header = document.querySelector('.modern-header');
    if (!header) return;
    
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > header.offsetHeight) {
        if (scrollTop > lastScrollTop) {
            header.style.top = `-${header.offsetHeight}px`;
        } else {
            header.style.top = '0';
        }
    } else {
        header.style.top = '0';
    }
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
});