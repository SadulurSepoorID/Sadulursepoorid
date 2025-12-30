document.addEventListener('DOMContentLoaded', () => {
    
    // Cek jika user iseng buka halaman login padahal sudah login
    if(localStorage.getItem('user_session')) {
        window.location.replace("../dashboard/index.html");
    }

    const btnLogin = document.querySelector('button'); // Atau gunakan ID tombol login Anda
    const inputNia = document.querySelector('input[type="text"]'); // Atau ID input NIA
    const inputPass = document.querySelector('input[type="password"]'); // Atau ID input Pass
    
    // Toggle Password Visibility
    const toggleIcon = document.querySelector('.toggle-password');
    if(toggleIcon) {
        toggleIcon.addEventListener('click', () => {
            const type = inputPass.getAttribute('type') === 'password' ? 'text' : 'password';
            inputPass.setAttribute('type', type);
            toggleIcon.classList.toggle('fa-eye-slash');
        });
    }

    // Handle Login Button Click
    if(btnLogin) {
        btnLogin.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const nia = inputNia.value;
            const password = inputPass.value;

            if(!nia || !password) {
                alert("Harap isi NIA dan Password!");
                return;
            }

            btnLogin.innerText = "Memuat...";
            btnLogin.disabled = true;

            try {
                // Pastikan config.js sudah dimuat di HTML login agar API_URL terbaca
                const res = await fetch(API_URL, {
                    method: 'POST',
                    redirect: 'follow',
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify({ action: 'login', nia: nia, password: password })
                });

                const data = await res.json();

                if (data.status) {
                    // 1. Simpan Sesi
                    localStorage.setItem('user_session', JSON.stringify({ 
                        nama: data.nama, 
                        nia: data.nia, 
                        jabatan: data.jabatan 
                    }));
                    
                    // 2. LOGIKA REDIRECT PINTAR (DEEP LINKING)
                    const linkTitipan = localStorage.getItem('redirect_after_login');

                    if (linkTitipan) {
                        // Bersihkan jejak
                        localStorage.removeItem('redirect_after_login');
                        // Antar ke tujuan awal (misal: presensi)
                        window.location.replace(linkTitipan);
                    } else {
                        // Login normal, masuk ke dashboard
                        window.location.replace("../dashboard/index.html");
                    }

                } else {
                    alert(data.message || "Login Gagal");
                    btnLogin.innerText = "Masuk";
                    btnLogin.disabled = false;
                }

            } catch (error) {
                console.error(error);
                alert("Terjadi kesalahan koneksi. Coba lagi.");
                btnLogin.innerText = "Masuk";
                btnLogin.disabled = false;
            }
        });
    }
});