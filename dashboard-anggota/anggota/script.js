// GANTI URL INI DENGAN URL DEPLOY TERBARU KAMU
const API_URL = "https://script.google.com/macros/s/AKfycbzaLFLCiTPEnVNIcwnuUi-d6YErJhJxkRe-ixbPQVQFfrpTO92dlaKT-ZmIl9fuWeas6g/exec";

// Cek Sesi Login
const session = localStorage.getItem('user_session');
if (!session) window.location.href = "../login/index.html";
const currentUser = JSON.parse(session);

let idleTimer; // Variabel untuk timer

document.addEventListener('DOMContentLoaded', () => {
    fetchMembers();
    
    // --- AKTIFKAN FITUR KEAMANAN ---
    setupAutoLogout();
    setupBackButtonBlocker();
});

// --- FUNGSI FETCH DATA ---
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

// --- RENDER CARD ---
function renderMembers(members) {
    const grid = document.getElementById('member-grid');
    grid.innerHTML = ""; 

    let onlineCount = 0;

    members.forEach(m => {
        if (m.status === 'Online') onlineCount++;

        const foto = m.foto && m.foto.length > 5 ? m.foto : `https://ui-avatars.com/api/?name=${encodeURIComponent(m.nama)}&background=0056b3&color=fff`;
        
        let statusClass = "offline";
        let statusText = "Offline";
        
        if (m.status === 'Online') {
            statusClass = "online";
            statusText = `<span style="color:#2ecc71; font-weight:600">Sedang Online</span>`;
        } else {
            statusText = m.last_seen ? timeAgo(m.last_seen) : "Offline";
        }

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
                <small class="last-seen">${statusText}</small>
            </div>
        `;
        grid.innerHTML += card;
    });

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
        card.style.display = (nama.includes(input) || nia.includes(input)) ? "" : "none";
    });
}

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

function toggleSidebar() {
    document.getElementById('mySidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

// --- FITUR 1: AUTO LOGOUT (2 MENIT) ---
function setupAutoLogout() {
    function resetTimer() {
        clearTimeout(idleTimer);
        // 2 menit = 120.000 ms
        idleTimer = setTimeout(() => {
            alert("Sesi habis (2 menit tidak aktif). Logout otomatis.");
            performLogout(); // Logout langsung tanpa konfirmasi
        }, 120000); 
    }

    window.onload = resetTimer;
    document.onmousemove = resetTimer;
    document.onkeypress = resetTimer;
    document.onclick = resetTimer;
    document.onscroll = resetTimer;
    document.ontouchstart = resetTimer;
}

// --- FITUR 2: ANTI BACK BUTTON ---
function setupBackButtonBlocker() {
    history.pushState(null, null, location.href);
    window.onpopstate = function () {
        if (confirm("Anda menekan tombol kembali. Ingin Keluar?")) {
            performLogout();
        } else {
            history.pushState(null, null, location.href);
        }
    };
}

// --- LOGOUT MANUAL (TOMBOL) ---
function logout() {
    if(confirm("Keluar dari aplikasi?")) {
        performLogout();
    }
}

// --- EKSEKUSI LOGOUT KE SERVER ---
async function performLogout() {
    try {
        await fetch(API_URL, {
            method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'logout', nia: currentUser.nia })
        });
    } catch(e) {}

    localStorage.removeItem('user_session');
    window.location.href = "../login/index.html";
}
