let countdown;

function togglePassword(id, icon) {
    const input = document.getElementById(id);
    input.type = input.type === "password" ? "text" : "password";
    icon.classList.toggle("fa-eye");
    icon.classList.toggle("fa-eye-slash");
}

async function requestKode(isResend = false) {
    const nia = document.getElementById('r-nia').value.trim();
    const email = document.getElementById('r-email').value.trim();
    const btn = isResend ? document.getElementById('btn-resend') : document.getElementById('btn-step-1');
    
    if(!isResend) { btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>...'; btn.disabled = true; }

    try {
        const req = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'request_reset', nia: nia, email: email })
        });
        const res = await req.json();

        if (res.status) {
            document.getElementById('step-1').style.display = 'none';
            document.getElementById('step-2').style.display = 'block';
            startTimer();
            if(isResend) alert("OTP Baru Terkirim!");
        } else {
            alert(res.message);
            btn.disabled = false;
            btn.innerHTML = 'Kirim Kode OTP <i class="fa-solid fa-paper-plane"></i>';
        }
    } catch (e) { alert("Server Error."); btn.disabled = false; }
}

function startTimer() {
    let timeLeft = 60;
    const timerText = document.getElementById('timer-text');
    const resendBtn = document.getElementById('btn-resend');
    resendBtn.style.display = 'none';
    timerText.style.display = 'inline';
    
    if(countdown) clearInterval(countdown);
    countdown = setInterval(() => {
        timerText.innerText = `Tunggu ${timeLeft}s`;
        if(timeLeft <= 0) {
            clearInterval(countdown);
            timerText.style.display = 'none';
            resendBtn.style.display = 'inline';
        }
        timeLeft--;
    }, 1000);
}

async function verifyOnly() {
    const nia = document.getElementById('r-nia').value;
    const code = document.getElementById('r-code').value.trim();
    const btn = document.getElementById('btn-step-2');

    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    try {
        const req = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'verify_reset', nia: nia, code: code })
        });
        const res = await req.json();
        if (res.status) {
            document.getElementById('step-2').style.display = 'none';
            document.getElementById('step-3').style.display = 'block';
        } else { alert(res.message); btn.innerHTML = 'Verifikasi Kode'; }
    } catch (e) { alert("Error."); }
}

async function updatePassword() {
    const nia = document.getElementById('r-nia').value;
    const code = document.getElementById('r-code').value.trim();
    const newPass = document.getElementById('r-newpass').value;
    const btn = document.getElementById('btn-step-3');

    if(newPass.length < 6) return alert("Min. 6 karakter!");
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

    try {
        const req = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'verify_reset', nia: nia, code: code, newPass: newPass })
        });
        const res = await req.json();
        if (res.status) { alert("Sukses!"); window.location.replace("../login/index.html"); }
    } catch (e) { alert("Gagal menyimpan."); }
}