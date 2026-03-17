// --- MOBILE MENU TOGGLE ---
function toggleMenu() {
    const menu = document.getElementById('menu');
    menu.classList.toggle('active');
}

// --- FUNGSI BUKA/TUTUP IFRAME MAP KEGIATAN ---
function toggleMap(index) {
    const mapContainer = document.getElementById(`map-container-${index}`);
    mapContainer.classList.toggle('active');
}

// --- JALANKAN SAAT HALAMAN SELESAI DIMUAT ---
document.addEventListener('DOMContentLoaded', function() {
    
    // 1. FETCH DATA KEGIATAN DARI GOOGLE APPS SCRIPT
    async function loadUpcomingEvents() {
        const wrapper = document.getElementById('events-wrapper');
        
        // --- SMART DETECTOR: Cari Variabel URL dari config.js ---
        let targetUrl = "";
        if (typeof GAS_URL !== 'undefined') targetUrl = GAS_URL;
        else if (typeof BASE_URL !== 'undefined') targetUrl = BASE_URL;
        else if (typeof API_URL !== 'undefined') targetUrl = API_URL;
        else {
            console.error("Variabel API tidak ditemukan! Pastikan config.js terbaca dengan benar.");
            wrapper.innerHTML = `<p style="width:100%; text-align:center; padding: 20px; color: #e74c3c;">Konfigurasi server tidak ditemukan. Coba muat ulang halaman.</p>`;
            return; // Hentikan proses jika URL tidak ada
        }
        
        try {
            // Gunakan URL yang berhasil dideteksi
            const response = await fetch(targetUrl, {
                method: 'POST',
                body: JSON.stringify({ action: 'get_activities' })
            });
            
            const resData = await response.json();
            
            if (resData.status && resData.data.length > 0) {
                // Filter hanya kegiatan yang tanggalnya hari ini atau ke depan
                const today = new Date();
                today.setHours(0,0,0,0);
                
                const upcomingEvents = resData.data.filter(event => {
                    return new Date(event.tanggal_raw) >= today;
                });

                if (upcomingEvents.length > 0) {
                    let html = '';
                    upcomingEvents.forEach((ev, index) => {
                        const hasMap = ev.map_html && ev.map_html.includes('<iframe');
                        
                        html += `
                            <div class="event-card">
                                <div class="event-date"><i class="fas fa-clock"></i> ${ev.tanggal_display}</div>
                                <h3>${ev.nama}</h3>
                                <p><i class="fas fa-map-marker-alt"></i> ${ev.lokasi}</p>
                                <p><i class="fas fa-hourglass-start"></i> Jam: ${ev.jam} WIB</p>
                                <p><i class="fas fa-users"></i> Peserta: ${ev.jumlah_peserta} ${ev.batas_anggota > 0 ? '/ ' + ev.batas_anggota : ''}</p>
                                
                                ${hasMap ? `
                                    <button class="button map-btn" onclick="toggleMap(${index})">
                                        <i class="fas fa-map-marked-alt"></i> Lihat Lokasi Peta
                                    </button>
                                    <div id="map-container-${index}" class="map-container">
                                        ${ev.map_html}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    });
                    wrapper.innerHTML = html;
                } else {
                    wrapper.innerHTML = `<p style="width:100%; text-align:center; padding: 20px;">Belum ada jadwal kegiatan dalam waktu dekat. Pantau terus ya!</p>`;
                }
            } else {
                wrapper.innerHTML = `<p style="width:100%; text-align:center; padding: 20px;">Belum ada data kegiatan.</p>`;
            }
        } catch (error) {
            console.error("Gagal memuat kegiatan:", error);
            wrapper.innerHTML = `<p style="width:100%; text-align:center; padding: 20px; color: #e74c3c;">Gagal terhubung ke server. Silakan muat ulang halaman.</p>`;
        }
    }

    loadUpcomingEvents();

    // 2. INTERSECTION OBSERVER (Animasi Fade In Scroll)
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });

    // 3. CONTACT FORM SUBMISSION
    function showToast(message, color = "#222") {
        const toast = document.getElementById("toast");
        toast.textContent = message;
        toast.style.backgroundColor = color;
        toast.classList.add("show");
        setTimeout(() => { toast.classList.remove("show"); }, 4000);
    }

    document.getElementById("contact-form").addEventListener("submit", function (e) {
        e.preventDefault();
        const email = document.getElementById("email").value.trim().toLowerCase();
        const message = document.getElementById("message").value.toLowerCase();
        const button = document.querySelector(".submit-btn");
        const blockedEmails = ["kepo321@gmail.com", "isengbanget@yahoo.com", "spamtester@mail.com"];
        
        if (blockedEmails.includes(email)) {
            showToast("Email ini telah diblokir. Gunakan email lain.", "#e74c3c");
            return;
        }
        
        const blockedWords = ["anjing", "ajg", "anjg", "bego", "bodoh", "bdh", "bloon", "oon", "pea", "bangsat", "tolol", "tai", "kontol", "kntl", "kntol", "kontl", "memek", "mmk", "memk", "mmek", "idiot", "anjir", "anjay", "goblok", "bajingan", "gblk"];
        if (blockedWords.some(word => message.includes(word))) {
            showToast("Pesan mengandung kata tidak sopan. Harap gunakan bahasa yang baik.", "#e74c3c");
            return;
        }
        
        button.disabled = true;
        button.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Mengecek...";
        
        fetch(`https://emailvalidation.abstractapi.com/v1/?api_key=91420962874f4900b45fd85b6ae29d5a&email=${email}`)
            .then(res => res.json())
            .then(data => {
                if (data.deliverability !== "DELIVERABLE" || data.is_disposable_email.value || !data.is_valid_format.value) {
                    showToast("Email ini tidak valid atau tidak aktif. Silakan gunakan email asli.", "#e74c3c");
                    button.disabled = false;
                    button.innerHTML = "<i class='fas fa-paper-plane'></i> Kirim Pesan";
                } else {
                    document.getElementById("contact-form").submit();
                }
            })
            .catch(error => {
                showToast("Gagal mengecek email. Coba lagi nanti.", "#c0392b");
                button.disabled = false;
                button.innerHTML = "<i class='fas fa-paper-plane'></i> Kirim Pesan";
                console.error(error);
            });
    });

    // 4. FAQ WIDGET TOGGLE
    const toggleBtn = document.getElementById('faq-toggle-btn');
    const closeBtn = document.getElementById('faq-close-btn');
    const chatbotContainer = document.getElementById('faq-chatbot-container');

    if(toggleBtn && closeBtn && chatbotContainer) {
        toggleBtn.addEventListener('click', () => { chatbotContainer.classList.toggle('open'); });
        closeBtn.addEventListener('click', () => { chatbotContainer.classList.remove('open'); });
    }

    // 5. BIRTHDAY POPUP LOGIC
    const navigationEntries = performance.getEntriesByType("navigation");
    const navType = navigationEntries.length > 0 ? navigationEntries[0].type : 'navigate';
    const hasVisited = sessionStorage.getItem('hasVisitedIndex');

    if (navType === 'reload' || !hasVisited) {
        sessionStorage.setItem('hasVisitedIndex', 'true');
        checkBirthday();
    }

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    function parseDate(dateString) {
        if (!dateString || typeof dateString !== 'string') return null;
        const parts = dateString.trim().split(' ');
        if (parts.length < 2) return null;
        const day = parseInt(parts[0], 10);
        const monthIndex = monthNames.findIndex(m => m.toLowerCase() === parts[1].toLowerCase());
        if (isNaN(day) || monthIndex === -1) return null;
        return { day, month: monthIndex };
    }
    
    async function checkBirthday() {
        try {
            const response = await fetch('anggota2.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const members = await response.json();
            
            const today = new Date();
            const currentDay = today.getDate();
            const currentMonth = today.getMonth();

            const birthdayMembers = members.filter(member => {
                const birthDate = parseDate(member.tanggalLahir);
                return birthDate && birthDate.day === currentDay && birthDate.month === currentMonth;
            });
            
            if (birthdayMembers.length > 0) {
                showBirthdayPopup(birthdayMembers);
            }
        } catch (error) {
            console.error("Gagal memuat atau memproses data anggota:", error);
        }
    }

    let currentBirthdayMember = null;
    let currentSlideIndex = 0;
    let totalSlides = 0;

    function showBirthdayPopup(members) {
        currentBirthdayMember = members[0];
        totalSlides = members.length;
        currentSlideIndex = 0;

        const overlay = document.getElementById('birthday-popup-overlay');
        const slider = document.getElementById('birthday-slider');
        const prevBtn = document.getElementById('prev-slide-btn');
        const nextBtn = document.getElementById('next-slide-btn');
        const counter = document.getElementById('slide-counter');

        let slidesHTML = '';
        members.forEach(member => {
            const photoHTML = (member.photoUrl && member.photoUrl.trim() !== '') 
                ? `<div class="birthday-photo-container"><img src="${member.photoUrl}" class="birthday-photo" alt="Foto ${member.name}" onerror="this.parentElement.style.display='none'"></div>` 
                : '';

            slidesHTML += `
                <div class="birthday-slide">
                    ${photoHTML}
                    <h3 class="birthday-name">${member.name}</h3>
                    <p class="birthday-kta">KTA: ${member.kta}</p>
                    <p class="birthday-date">${member.tanggalLahir}</p>
                </div>`;
        });
        slider.innerHTML = slidesHTML;

        function goToSlide(index) {
            slider.style.transform = `translateX(-${index * 100}%)`;
            currentSlideIndex = index;
            currentBirthdayMember = members[index];

            counter.textContent = `${index + 1} / ${totalSlides}`;
            prevBtn.disabled = index === 0;
            nextBtn.disabled = index === totalSlides - 1;
        }

        if (totalSlides > 1) {
            prevBtn.style.display = 'block';
            nextBtn.style.display = 'block';
            counter.style.display = 'block';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
            counter.style.display = 'none';
        }
        
        prevBtn.addEventListener('click', () => goToSlide(currentSlideIndex - 1));
        nextBtn.addEventListener('click', () => goToSlide(currentSlideIndex + 1));
        
        setupPopupInteraction(members);
        goToSlide(0);

        overlay.classList.add('visible');
    }
    
    function setupPopupInteraction() {
        const overlay = document.getElementById('birthday-popup-overlay');
        const closeBtn = document.getElementById('birthday-close-btn');
        const whatsappTriggerBtn = document.getElementById('whatsapp-btn-trigger');
        const pinInputContainer = document.getElementById('pin-input-container');
        const whatsappPinInput = document.getElementById('whatsapp-pin');
        const whatsappSendBtn = document.getElementById('whatsapp-send-btn');
        const pinError = document.getElementById('pin-error');
        
        pinInputContainer.style.display = 'none';
        whatsappPinInput.value = '';

        const closePopup = () => overlay.classList.remove('visible');
        const clickOutsideHandler = (e) => { if (e.target === overlay) closePopup(); };

        const togglePinInput = () => {
            if (pinInputContainer.style.display === 'none') {
                pinInputContainer.style.display = 'block';
                whatsappPinInput.focus();
                pinError.classList.remove('visible');
            } else {
                pinInputContainer.style.display = 'none';
                whatsappPinInput.value = '';
                pinError.classList.remove('visible');
            }
        };
        
        const sendWhatsappMessage = () => {
            if (whatsappPinInput.value === 'SSJKT1') {
                pinError.classList.remove('visible');
                
                if (currentBirthdayMember && currentBirthdayMember.whatsapp) {
                    const phoneNumber = currentBirthdayMember.whatsapp.replace(/[^0-9]/g, '');
                    const message = encodeURIComponent(`Selamat Ulang Tahun untuk ${currentBirthdayMember.name}! Semoga panjang umur, sehat selalu, dan semua cita-citanya tercapai. Aamiin.`);
                    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
                    closePopup();
                } else {
                    alert('Nomor WhatsApp anggota ini tidak tersedia.');
                }
            } else {
                pinError.classList.add('visible');
            }
        };

        closeBtn.onclick = closePopup;
        overlay.onclick = clickOutsideHandler;
        whatsappTriggerBtn.onclick = togglePinInput;
        whatsappSendBtn.onclick = sendWhatsappMessage;
    }

});