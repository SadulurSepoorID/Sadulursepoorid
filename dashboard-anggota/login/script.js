document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Cek Sesi (Auto Redirect jika sudah login)
    if(localStorage.getItem('user_session')) {
        window.location.replace("../dashboard/index.html");
    }

    // 2. Definisi Elemen (Menggunakan ID agar lebih spesifik dan akurat)
    const btnLogin = document.getElementById('btn-login'); 
    const inputNia = document.getElementById('nia');       
    const inputPass = document.getElementById('pass');     
    const toggleIcon = document.querySelector('.toggle-pass'); 

    // 3. Fitur Toggle Password (Lihat/Sembunyikan)
    if(toggleIcon && inputPass) {
        toggleIcon.addEventListener('click', () => {
            // Cek tipe saat ini (password atau text)
            const type = inputPass.getAttribute('type') === 'password' ? 'text' : 'password';
            inputPass.setAttribute('type', type);

            // Ubah Ikon Mata (Buka vs Coret)
            // Kita toggle class fa-eye dan fa-eye-slash
            toggleIcon.classList.toggle('fa-eye');
            toggleIcon.classList.toggle('fa-eye-slash');
        });
    }

    // 4. Handle Tombol Login
    if(btnLogin) {
        btnLogin.addEventListener('click', async (e) => {
            e.preventDefault(); // Mencegah form reload halaman
            
            const nia = inputNia.value;
            const password = inputPass.value;

            // Validasi Input Kosong
            if(!nia || !password) {
                alert("Harap isi NIA dan Password!");
                return;
            }

            // Ubah tombol jadi loading
            btnLogin.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memuat...';
            btnLogin.disabled = true;

            try {
                // Pastikan config.js sudah dimuat di HTML agar API_URL terbaca
                const res = await fetch(API_URL, {
                    method: 'POST',
                    redirect: 'follow',
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify({ action: 'login', nia: nia, password: password })
                });

                const data = await res.json();

                if (data.status) {
                    // A. Simpan Sesi
                    localStorage.setItem('user_session', JSON.stringify({ 
                        nama: data.nama, 
                        nia: data.nia, 
                        jabatan: data.jabatan 
                    }));
                    
                    // B. Logika Redirect Pintar (Deep Linking)
                    // Cek apakah user sebelumnya mau ke halaman khusus (misal: presensi)
                    const linkTitipan = localStorage.getItem('redirect_after_login');

                    if (linkTitipan) {
                        localStorage.removeItem('redirect_after_login'); // Hapus jejak
                        window.location.replace(linkTitipan); // Antar ke tujuan awal
                    } else {
                        // Login normal, masuk ke dashboard utama
                        window.location.replace("../dashboard/index.html");
                    }

                } else {
                    // Login Gagal (Password/NIA salah)
                    alert(data.message || "Login Gagal, periksa NIA dan Password Anda.");
                    resetButton();
                }

            } catch (error) {
                console.error("Error Login:", error);
                alert("Terjadi kesalahan koneksi atau server. Silakan coba lagi.");
                resetButton();
            }
        });
    }

    // Fungsi helper untuk mengembalikan tombol ke semula
    function resetButton() {
        btnLogin.innerHTML = 'Masuk Sekarang <i class="fa-solid fa-arrow-right-to-bracket"></i>';
        btnLogin.disabled = false;
    }
});