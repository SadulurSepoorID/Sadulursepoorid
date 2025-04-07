// Pastikan untuk mengimpor accounts.js di file HTML (di bawah <script>)

document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault(); // Mencegah form reload otomatis

    const kta = document.getElementById('kta').value.trim();
    const password = document.getElementById('password').value.trim();

    // Cari akun yang cocok berdasarkan KTA dan Password
    const account = validAccounts.find(acc => acc.kta === kta && acc.password === password);

    if (account) {
        // Simpan data ke sessionStorage
        sessionStorage.setItem('username', account.username);
        sessionStorage.setItem('kta', account.kta);

        // Arahkan ke halaman weblogin.html
        window.location.href = 'https://sadulursepoorid.github.io/ssmail/';
    } else {
        // Jika login gagal
        alert("Hanya bisa di akses pengurus! Silahkan kembali atau coba lagi jika anda pengurus (Password Salah)");
        document.getElementById('loginForm').reset(); // Reset form
    }
});

// Fungsi kembali ke halaman login
document.getElementById('backButton').addEventListener('click', function () {
    window.location.href = 'index.html'; // Kembali ke halaman login
});

// Fungsi untuk toggle password visibility
document.getElementById('togglePassword').addEventListener('click', function () {
    const passwordField = document.getElementById('password');
    const passwordFieldType = passwordField.getAttribute('type');

    if (passwordFieldType === 'password') {
        passwordField.setAttribute('type', 'text');
        this.textContent = '🙈';  // Ubah ikon menjadi mata tertutup
    } else {
        passwordField.setAttribute('type', 'password');
        this.textContent = '👁️';  // Kembalikan ikon mata terbuka
    }
});