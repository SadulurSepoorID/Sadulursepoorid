// Toggle Password Visibility
function togglePassword(id, icon) {
    const input = document.getElementById(id);
    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}

// STEP 1: Request OTP
async function requestKode() {
    const nia = document.getElementById('r-nia').value.trim();
    const email = document.getElementById('r-email').value.trim();
    const btn = document.getElementById('btn-step-1');
    const originalText = btn.innerHTML;

    if (!nia || !email) {
        alert("Harap isi NIA dan Email!");
        return;
    }

    // Loading State
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Mengirim...';
    btn.disabled = true;

    try {
        const req = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'request_reset', nia: nia, email: email })
        });
        const res = await req.json();

        if (res.status) {
            // Pindah ke Step 2
            document.getElementById('step-1').style.display = 'none';
            document.getElementById('step-2').style.display = 'block';
            // Fokus ke input OTP otomatis
            setTimeout(() => document.getElementById('r-code').focus(), 500);
        } else {
            alert(res.message || "NIA atau Email tidak ditemukan!");
            // Reset button jika gagal
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert("Gagal terhubung ke server.");
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// STEP 2: Verify & Change Password
async function verifyKode() {
    const nia = document.getElementById('r-nia').value; // Ambil dari input step 1
    const code = document.getElementById('r-code').value.trim();
    const newPass = document.getElementById('r-newpass').value;
    const btn = document.getElementById('btn-step-2');
    const originalText = btn.innerHTML;

    if (!code || !newPass) {
        alert("Harap lengkapi Kode OTP dan Password Baru!");
        return;
    }

    // Loading State
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    try {
        const req = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ 
                action: 'verify_reset', 
                nia: nia, 
                code: code, 
                newPass: newPass 
            })
        });
        const res = await req.json();

        if (res.status) {
            alert("Password berhasil direset! Silakan login.");
            window.location.replace("../login/index.html");
        } else {
            alert(res.message || "Kode OTP salah atau kadaluarsa.");
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert("Terjadi kesalahan koneksi.");
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}