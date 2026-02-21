// Registrasi Service Worker untuk PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { 
        navigator.serviceWorker.register('./sw.js').catch(err => {
            console.warn('Service Worker registration failed: ', err);
        });
    });
}

// Ambil elemen-elemen dari DOM
const btnFullscreen = document.getElementById('btn-fullscreen');
const stationBtns = document.querySelectorAll('.station-btn');
const menuWrapper = document.getElementById('menu-wrapper');
const gameFrameContainer = document.getElementById('game-frame-container');
const gameFrame = document.getElementById('game-frame');
const startOverlay = document.getElementById('start-overlay');

// === LOGIKA START OVERLAY (PANCINGAN FULLSCREEN) ===
startOverlay.addEventListener('click', () => {
    // 1. Paksa minta fullscreen
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn(`Fullscreen ditolak browser: ${err.message}`);
        });
    }
    // 2. Transisi ngilangin overlay
    startOverlay.style.opacity = '0';
    setTimeout(() => {
        startOverlay.style.display = 'none';
    }, 400); // Sesuai dengan durasi transisi di CSS
});

// Fungsi Toggle Fullscreen Manual (buat jaga-jaga)
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn(`Fullscreen gagal: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Fungsi Memulai Simulasi (Memuat Iframe)
function launchGame(url) {
    // Sembunyikan menu utama, tampilkan kontainer iframe
    menuWrapper.style.display = 'none';
    gameFrameContainer.style.display = 'block';
    
    // Muat URL folder stasiun ke dalam iframe
    gameFrame.src = url;
}

// FUNGSI PENTING: Menerima perintah keluar dari DALAM iframe (Cakung/Gambir)
window.exitGame = function() {
    // 1. Kosongkan game agar memori bersih
    gameFrame.src = '';
    
    // 2. Sembunyikan iframe, panggil Menu Utama lagi
    gameFrameContainer.style.display = 'none';
    menuWrapper.style.display = 'flex'; // Pakai flex agar letaknya kembali ke tengah
};

// === EVENT LISTENERS ===
if (btnFullscreen) {
    btnFullscreen.addEventListener('click', toggleFullscreen);
}

stationBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const url = this.getAttribute('data-url');
        launchGame(url);
    });
});