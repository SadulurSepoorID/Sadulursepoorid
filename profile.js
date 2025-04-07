// Menampilkan tanggal dan waktu saat ini di header
function updateDateTime() {
    const dateTimeElement = document.getElementById("dateTime");
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    const now = new Date();
    const dayName = days[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    dateTimeElement.innerHTML = `${dayName}, ${day} ${month} ${year} <span class="time"><br>${hours}:${minutes}:${seconds}</span>`;
}

setInterval(updateDateTime, 1000);
updateDateTime(); // Memanggil fungsi untuk pertama kali

// Slider untuk section berita
let currentIndex = 0;
const slides = document.querySelectorAll('.berita-slide');
const totalSlides = slides.length;

function showSlide(index) {
    if (index >= totalSlides) currentIndex = 0;
    else if (index < 0) currentIndex = totalSlides - 1;
    else currentIndex = index;
    
    const offset = -currentIndex * 100;
    document.querySelector('.berita-container').style.transform = `translateX(${offset}%)`;
}

function nextSlide() {
    showSlide(currentIndex + 1);
}

function prevSlide() {
    showSlide(currentIndex - 1);
}

// Tombol navigasi
document.querySelector('.next').addEventListener('click', nextSlide);
document.querySelector('.prev').addEventListener('click', prevSlide);

// Slide otomatis setiap 3 detik
let autoSlideInterval = setInterval(nextSlide, 3000);

// Hentikan otomatis saat mouse hover pada slider
document.querySelector('.berita-slider').addEventListener('mouseenter', () => {
    clearInterval(autoSlideInterval);
});

// Lanjutkan otomatis saat mouse keluar dari slider
document.querySelector('.berita-slider').addEventListener('mouseleave', () => {
    autoSlideInterval = setInterval(nextSlide, 3000);
});

// Swipe untuk perangkat mobile
let startX = 0;
document.querySelector('.berita-slider').addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
});

document.querySelector('.berita-slider').addEventListener('touchend', e => {
    const endX = e.changedTouches[0].clientX;
    if (startX > endX + 50) nextSlide(); // Geser kiri
    else if (startX < endX - 50) prevSlide(); // Geser kanan
});