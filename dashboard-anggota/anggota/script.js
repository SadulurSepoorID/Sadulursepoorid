// GANTI URL DENGAN HASIL DEPLOY TERBARU KAMU
const API_URL = "https://script.google.com/macros/s/AKfycbzaLFLCiTPEnVNIcwnuUi-d6YErJhJxkRe-ixbPQVQFfrpTO92dlaKT-ZmIl9fuWeas6g/exec";

// Cek Sesi Login
const session = localStorage.getItem('user_session');
if (!session) window.location.href = "../login/index.html";
const currentUser = JSON.parse(session);

document.addEventListener('DOMContentLoaded', () => {
    fetchMembers();
});

// --- FETCH DATA ANGGOTA ---
async function fetchMembers() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'get_all_members' })
        });
        const data = await response.json();

        if (data.status) {
            renderMembers(data.members);
        } else {
            document.getElementById('member-grid').innerHTML = `<p style="text-align:center">Gagal memuat data.</p>`;
        }
    } catch (e) {
        console.error(e);
        document.getElementById('member-grid').innerHTML = `<p style="text-align:center">Koneksi Error.</p>`;
    }
}

// --- RENDER CARD ANGGOTA ---
function renderMembers(members) {
    const grid = document.getElementById('member-grid');
    grid.innerHTML = ""; // Bersihkan loading

    let onlineCount = 0;

    members.forEach(m => {
        // Hitung Online
        if (m.status === 'Online') onlineCount++;

        // Foto Profil (Fallback)
        const foto = m.foto && m.foto.length > 5 ? m.foto : `https://ui-avatars.com/api/?name=${encodeURIComponent(m.nama)}&background=0056b3&color=fff`;

        // Format Waktu (Contoh: "10 menit yang lalu")
        let timeDisplay = "Sedang Online";
        let statusClass = "online";
        
        if (m.status !== 'Online') {
            statusClass = "offline";
            timeDisplay = m.last_seen ? timeAgo(m.last_seen) : "Offline";
        }

        // HTML Card
        const card = `
            <div class="member-card">
                <div class="card-avatar">
                    <img src="${foto}" alt="${m.nama}">
                    <div class="status-dot ${statusClass}" title="${m.status}"></div>
                </div>
                <div class="card-info">
                    <h3>${m.nama}</h3>
                    <span class="nia">${m.nia}</span>
                    <span class="role-badge">${m.jabatan}</span>
                </div>
                <small class="last-seen">
                    ${m.status === 'Online' ? '<span style="color:#2ecc71; font-weight:600">Sedang Online</span>' : 'Terakhir: ' + timeDisplay}
                </small>
            </div>
        `;
        grid.innerHTML += card;
    });

    // Update Counter
    document.getElementById('count-online').innerText = onlineCount;
    document.getElementById('count-total').innerText = members.length;
}

// --- FILTER SEARCH ---
function filterMembers() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.getElementsByClassName('member-card');

    Array.from(cards).forEach(card => {
        const nama = card.querySelector('h3').innerText.toLowerCase();
        const nia = card.querySelector('.nia').innerText.toLowerCase();
        
        if (nama.includes(input) || nia.includes(input)) {
            card.style.display = "";
        } else {
            card.style.display = "none";
        }
    });
}

// --- HELPER: WAKTU YANG LALU (Time Ago) ---
function timeAgo(dateString) {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " tahun lalu";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " bulan lalu";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " hari lalu";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " jam lalu";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " menit lalu";
    
    return "Baru saja";
}

// --- SIDEBAR & LOGOUT ---
function toggleSidebar() {
    document.getElementById('mySidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

async function logout() {
    if(confirm("Keluar dari aplikasi?")) {
        // Kirim sinyal Logout ke server agar status jadi Offline
        try {
            await fetch(API_URL, {
                method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: 'logout', nia: currentUser.nia })
            });
        } catch (e) { console.error("Logout log error"); }

        localStorage.removeItem('user_session');
        window.location.href = "../login/index.html";
    }
}