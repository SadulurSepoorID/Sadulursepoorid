// Fungsi menampilkan notifikasi custom
function showCustomAlert() {
  const alertBox = document.getElementById('customAlert');
  alertBox.classList.remove('hidden');
  alertBox.classList.add('show');

  setTimeout(() => {
    alertBox.classList.remove('show');
    setTimeout(() => alertBox.classList.add('hidden'), 400);
  }, 3000);

  document.getElementById('loginForm').reset();
}

// Event submit form login
document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const kta = document.getElementById('kta').value.trim();
  const password = document.getElementById('password').value.trim();

  const account = validAccounts.find(acc => acc.kta === kta && acc.password === password);

  if (account) {
    sessionStorage.setItem('username', account.username);
    sessionStorage.setItem('kta', account.kta);
    window.location.href = 'https://sadulursepoorid.github.io/ssmail';
  } else {
    showCustomAlert();
  }
});

// Tombol kembali ke index.html
document.getElementById('backButton').addEventListener('click', function () {
  window.location.href = 'index.html';
});

// Toggle tampilan password
document.getElementById('togglePassword').addEventListener('click', function () {
  const passwordField = document.getElementById('password');
  const type = passwordField.getAttribute('type');
  if (type === 'password') {
    passwordField.setAttribute('type', 'text');
    this.textContent = '🙈';
  } else {
    passwordField.setAttribute('type', 'password');
    this.textContent = '👁️';
  }
});

// === FITUR LUPA SANDI DENGAN VERIFIKASI ===

// Tampilkan modal verifikasi KTA
function showForgotPassword() {
  const modal = document.getElementById('forgotPasswordModal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

// Tutup modal verifikasi
function closeForgotPassword() {
  const modal = document.getElementById('forgotPasswordModal');
  modal.classList.add('hidden');
  modal.style.display = 'none';
  document.getElementById('forgotKTA').value = '';
}

// Kirim pesan ke WhatsApp admin jika KTA valid
function sendToWA() {
  const kta = document.getElementById('forgotKTA').value.trim();
  const foundAccount = validAccounts.find(acc => acc.kta === kta);

  if (!foundAccount) {
    alert("Nomor KTA tidak ditemukan. Pastikan nomor sudah benar dan terdaftar.");
    return;
  }

  const adminNumber = "6282112964343";
  const message = `Halo Admin, saya lupa password akun website SS. Berikut nomor KTA saya: ${kta}`;
  const waURL = `https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`;

  window.location.href = waURL;
}