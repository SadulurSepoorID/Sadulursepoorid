/**
 * ENGINE DISPATCHER PROFESIONAL (V29 - DEVICE LOCK & RESPONSIVE)
 */

window.addEventListener('beforeunload', function (e) {
    e.preventDefault(); e.returnValue = 'Simulasi sedang berjalan!';
});

// ==========================================
// -1. SISTEM PENGUNCI LAYAR (DEVICE LOCK)
// ==========================================
let previousSpeedForLock = 1;

function checkDeviceLock() {
    let warning = document.getElementById('device-warning');
    if(!warning) return;
    
    // Syarat: Layar harus Horizontal (Landscape) DAN minimal lebarnya seperti Desktop/Tablet
    let isLandscape = window.innerWidth > window.innerHeight;
    let isDesktopWidth = window.innerWidth >= 768; 

    if (!isLandscape || !isDesktopWidth) {
        // Tampilkan peringatan & Kunci Game
        warning.style.display = 'flex';
        
        // Auto-Pause
        if (timeMultiplier > 0) {
            previousSpeedForLock = timeMultiplier;
            setSpeed(0); 
        }
    } else {
        // Layar aman, hilangkan peringatan
        warning.style.display = 'none';
        
        // Auto-Resume (Opsional, tapi biar mulus kita balikin ke speed sebelum terkunci)
        if (timeMultiplier === 0 && previousSpeedForLock > 0) {
            // Uncomment baris di bawah kalau mau auto-resume saat HP dibalik:
            // setSpeed(previousSpeedForLock); 
        }
    }
}

// Cek saat layar di-resize, rotasi HP berubah, dan saat pertama kali dimuat
window.addEventListener('resize', checkDeviceLock);
window.addEventListener('orientationchange', checkDeviceLock);
document.addEventListener('DOMContentLoaded', checkDeviceLock);

// ==========================================
// 0. SISTEM AUDIO & VOICE (SPLIT SFX & VOICE)
// ==========================================
let isSfxOn = true;
let isVoiceOn = true;
let audioCtx = null;
let sysVoices = [];

window.speechSynthesis.onvoiceschanged = () => { sysVoices = window.speechSynthesis.getVoices(); };

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (sysVoices.length === 0) sysVoices = window.speechSynthesis.getVoices();
}

document.addEventListener('click', initAudio, { once: true });

function toggleSfx(el) {
    isSfxOn = el.checked;
    initAudio();
}

function toggleVoice(el) {
    isVoiceOn = el.checked;
    initAudio();
    if (!isVoiceOn) window.speechSynthesis.cancel();
}

function playIncomingRing() {
    if (!isSfxOn || !audioCtx) return;
    for (let i = 0; i < 4; i++) {
        let osc = audioCtx.createOscillator(); let gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = 'sine'; osc.frequency.value = 1000;
        gain.gain.setValueAtTime(0, audioCtx.currentTime + (i * 0.4));
        gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + (i * 0.4) + 0.05);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + (i * 0.4) + 0.15);
        osc.start(audioCtx.currentTime + (i * 0.4)); osc.stop(audioCtx.currentTime + (i * 0.4) + 0.2);
    }
}

function playRadioClick() {
    if (!isSfxOn || !audioCtx) return;
    let osc = audioCtx.createOscillator(); let gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.1);
}

function playMasinisAlarm() {
    if (!isSfxOn || !audioCtx) return;
    for (let i = 0; i < 3; i++) {
        let osc = audioCtx.createOscillator(); let gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = 'sawtooth'; osc.frequency.value = 1200; // Suara melengking (Beda dari telepon)
        gain.gain.setValueAtTime(0, audioCtx.currentTime + (i * 0.25));
        gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + (i * 0.25) + 0.05);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + (i * 0.25) + 0.1);
        osc.start(audioCtx.currentTime + (i * 0.25)); osc.stop(audioCtx.currentTime + (i * 0.25) + 0.15);
    }
}

function speakVoice(text, delayMs = 0) {
    if (!isSfxOn && !isVoiceOn) return; // Jika keduanya mati, abaikan total
    
    setTimeout(() => {
        if (isSfxOn) playRadioClick(); 
        
        setTimeout(() => {
            if (isVoiceOn) {
                window.speechSynthesis.cancel(); 
                let msg = new SpeechSynthesisUtterance(text);
                msg.lang = 'id-ID'; 
                
                if (sysVoices.length === 0) sysVoices = window.speechSynthesis.getVoices();
                let idVoices = sysVoices.filter(v => v.lang.includes('id'));
                let maleVoice = idVoices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('andika'));

                if (maleVoice) { msg.voice = maleVoice; msg.pitch = 0.9; } 
                else if (idVoices.length > 0) { msg.voice = idVoices[0]; msg.pitch = 0.5; } 
                else { msg.pitch = 0.5; }

                msg.rate = 0.85; 
                msg.onend = () => { if (isSfxOn) playRadioClick(); };
                window.speechSynthesis.speak(msg);
            } else {
                // Jika voice mati tapi SFX hidup, mainkan bunyi HT penutup setelah delay simulasi ngomong
                if (isSfxOn) setTimeout(() => playRadioClick(), 2000);
            }
        }, 200); 
    }, delayMs);
}


// ==========================================
// 1. SISTEM TELEPON & MODAL UI
// ==========================================
let incomingCalls = []; 
let clearedDepartures = new Set(); 

function openModal(id) { 
    document.getElementById(id).classList.add('active'); 
    if (id === 'schedule-modal') populateScheduleModal();
    if (id === 'comm-modal') updateCommUI();
}
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function switchCommTab(tab) {
    if(tab === 'masuk') {
        document.getElementById('panel-masuk').style.display = 'block'; document.getElementById('panel-keluar').style.display = 'none';
        document.getElementById('tab-masuk').style.background = '#333'; document.getElementById('tab-masuk').style.color = '#fff';
        document.getElementById('tab-keluar').style.background = '#111'; document.getElementById('tab-keluar').style.color = '#aaa';
    } else {
        document.getElementById('panel-masuk').style.display = 'none'; document.getElementById('panel-keluar').style.display = 'block';
        document.getElementById('tab-masuk').style.background = '#111'; document.getElementById('tab-masuk').style.color = '#aaa';
        document.getElementById('tab-keluar').style.background = '#333'; document.getElementById('tab-keluar').style.color = '#fff';
        updateOutgoingTrainList();
    }
}

function updateCommUI() {
    let count = incomingCalls.length;
    document.getElementById('notif-badge').innerText = `(${count})`;
    document.getElementById('tab-notif-badge').innerText = `(${count})`;
    
    let btnTelepon = document.getElementById('btn-telepon');
    if (count > 0) btnTelepon.classList.add('blinking'); else btnTelepon.classList.remove('blinking');

    let listDiv = document.getElementById('incoming-list');
    if (count === 0) {
        listDiv.innerHTML = '<p style="color:#888; text-align:center; padding: 20px 0;">Tidak ada panggilan masuk saat ini.</p>';
    } else {
        listDiv.innerHTML = incomingCalls.map(c => `
            <div style="background:#222; border-left:4px solid #ff5555; padding:12px; margin-bottom:12px; border-radius:4px;">
                <div style="color:#ffcc00; font-weight:bold; margin-bottom:5px;">📞 DARI: STASIUN ${c.from}</div>
                <div style="color:#fff; font-size:13px; margin-bottom:10px;">"${c.messageLog}"</div>
                
                <label style="color:#aaa; font-size:11px;">Balasan Anda:</label>
                <select id="reply-${c.id}" style="width:100%; padding:6px; background:#000; color:#fff; border:1px solid #555; margin-bottom:10px;">
                    <option value="Copy, Stasiun Cakung siap menerima pelayanan. Ganti.">Copy. Cakung siap menerima pelayanan. Ganti.</option>
                    <option value="Copy, Cakung sedang ramai, mohon KA masuk dengan hati-hati. Ganti.">Copy. Cakung sedang ramai. Mohon KA masuk dengan hati-hati. Ganti.</option>
                </select>
                
                <button onclick="replyIncomingCall('${c.id}')" style="background:#00ccff; color:#000; font-weight:bold; border:none; padding:8px 12px; border-radius:3px; cursor:pointer; width:100%;">KIRIM BALASAN SUARA KE ${c.from}</button>
            </div>
        `).join('');
    }
}

function updateOutgoingTrainList() {
    let st = document.getElementById('out-station').value;
    let selectNoka = document.getElementById('out-noka');
    selectNoka.innerHTML = ''; 

    let availableTrains = trains.filter(t => {
        if (!t.isCommuter || clearedDepartures.has(t.noKA)) return false;
        
        let noAngka = parseInt(t.noKA.replace(/\D/g, ''));
        let isEven = (noAngka % 2 === 0);
        
        if (st === 'KRI' && isEven) return true;
        if (st === 'KLDB' && !isEven) return true;
        return false;
    });

    if (availableTrains.length === 0) {
        selectNoka.innerHTML = '<option value="">-- Tidak ada KA ke arah ini --</option>';
    } else {
        availableTrains.forEach(t => {
            selectNoka.innerHTML += `<option value="${t.noKA}">KA ${t.noKA} (Tujuan: ${t.destName}) - Posisi: ${t.currentNode}</option>`;
        });
    }
}

function replyIncomingCall(id) {
    let callIndex = incomingCalls.findIndex(c => c.id == id);
    if (callIndex > -1) {
        let call = incomingCalls[callIndex];
        let replyMsg = document.getElementById(`reply-${id}`).value;
        
        addLog(`<span style="color:#00ccff">[TELEPON] ANDA -> ${call.from}:</span> ${replyMsg}`);
        speakVoice(`Stasiun ${call.from}, ${replyMsg}`);
        
        let scheduledTrain = TIMETABLE.find(x => x.noKA === call.noKA);
        if (scheduledTrain) scheduledTrain.isClearedToEnter = true;
        
        incomingCalls.splice(callIndex, 1);
        updateCommUI();
    }
}

function sendOutgoingCall() {
    let st = document.getElementById('out-station').value;
    let ka = document.getElementById('out-noka').value;
    let msgType = document.getElementById('out-msg').value;

    if(!ka) { alert("Tidak ada KA yang dipilih untuk dihubungi!"); return; }

    let stName = st === 'KRI' ? 'KRANJI' : 'KLENDER BARU';
    
    let voiceMsg = msgType === 'siap' 
        ? `Stasiun ${stName}, KA ${ka}, siap diberangkatkan dari Cakung. Apakah stasiun aman? Ganti.`
        : `Stasiun ${stName}, KA ${ka}, belum bisa diberangkatkan dari Cakung. Mohon tunggu. Ganti.`;

    let statusDiv = document.getElementById('out-status');
    let btn = document.getElementById('btn-send-out');

    btn.disabled = true; btn.style.background = "#555";
    statusDiv.innerHTML = `<span style="color:#ffcc00;">Memanggil Stasiun ${stName}...</span>`;
    addLog(`<span style="color:#00ccff">[TELEPON] ANDA -> ${stName}:</span> ${voiceMsg}`);

    speakVoice(voiceMsg);

    setTimeout(() => {
        let replyVoice = "";
        if (msgType === 'siap') {
            replyVoice = `Aman, laksanakan. Silakan berangkatkan KA ${ka}, menuju stasiun kami. Ganti.`;
            clearedDepartures.add(ka); 
        } else {
            replyVoice = `Copy. Kami stand by menunggu KA ${ka}. Ganti.`;
        }
        
        statusDiv.innerHTML = `<span style="color:#00ff00;">Stasiun ${stName} Membalas: "${replyVoice}"</span>`;
        addLog(`<span style="color:#00ff00">[TELEPON] ${stName} -> ANDA:</span> ${replyVoice}`);
        speakVoice(`Stasiun Cakung. ${replyVoice}`);
        
        btn.disabled = false; btn.style.background = "#0066ff";
        updateOutgoingTrainList(); 
    }, 6000); 
}

let activeMasinisTrain = null;

function openMasinisModal(trainObj) {
    activeMasinisTrain = trainObj;
    document.getElementById('masinis-modal').classList.add('active');
    document.getElementById('masinis-title').innerText = `📻 RADIO MASINIS KA ${trainObj.noKA}`;

    let replySelect = document.getElementById('masinis-reply');
    let isEntering = ['SIG_E_IN_3', 'SIG_W_IN_2'].includes(trainObj.currentTrack.to); // Deteksi dia di sinyal masuk atau keluar

    if (isEntering) {
        replySelect.innerHTML = `
            <option value="izin">Copy, segera saya layani. Persiapan masuk Stasiun Cakung. Ganti.</option>
            <option value="tahan">Copy, Cakung masih ramai, tunggu sebentar. Ganti.</option>
        `;
    } else {
        replySelect.innerHTML = `
            <option value="izin">Copy, persiapan KA segera diberangkatkan. Perhatikan sinyal. Ganti.</option>
            <option value="tahan">Copy, KA belum bisa diberangkatkan, harap bersabar. Ganti.</option>
        `;
    }
}

function replyToMasinis() {
    if(!activeMasinisTrain) return;
    let val = document.getElementById('masinis-reply').value;
    let textMsg = document.getElementById('masinis-reply').options[document.getElementById('masinis-reply').selectedIndex].text;

    // Matikan alarm visual
    activeMasinisTrain.isAlarming = false;
    activeMasinisTrain.element.classList.remove('train-alarm');

    // Jika diizinkan, kita kasih waktu tenggang (timer minus) lebih lama biar dia gak bawel lagi. 
    // Kalau ditahan, kasih waktu sedikit biar nanti dia bunyi lagi.
    if (val === 'izin') {
        activeMasinisTrain.waitTimer = -120; // Kasih waktu 2 menit in-game sebelum Masinis komplain lagi
    } else {
        activeMasinisTrain.waitTimer = -20;  // Cuma diam sebentar, nanti nanya lagi
    }

    addLog(`<span style="color:#00ccff">[RADIO] ANDA -> Masinis KA ${activeMasinisTrain.noKA}:</span> ${textMsg}`);
    speakVoice(`Masinis KA ${activeMasinisTrain.noKA}. ${textMsg}`);

    closeModal('masinis-modal');
}

// ==========================================
// 2. SPEED CONTROL & RESET LOGIC
// ==========================================
let timeMultiplier = 1;  
function setSpeed(val) {
    val = Math.max(0, Math.min(100, parseFloat(val) || 0));
    timeMultiplier = val;
    document.getElementById('speed-slider').value = val;
    document.getElementById('speed-input').value = val;
}

function timeToSeconds(timeStr) {
    let p = timeStr.split(':'); 
    let h = parseInt(p[0]) || 0; let m = parseInt(p[1]) || 0; let s = parseInt(p[2]) || 0;
    return h * 3600 + m * 60 + s;
}

function resetGame() {
    let timeInput = document.getElementById('start-time-input').value;
    if(!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeInput)) { alert("Format jam tidak valid! Gunakan HH:MM"); return; }
    
    gameTime = timeToSeconds(timeInput + ":00");
    trains.forEach(t => { if(t.element) t.element.remove(); });
    trains = []; 
    incomingCalls = []; 
    clearedDepartures.clear(); 
    updateCommUI();
    
    document.getElementById('schedule-body').innerHTML = ''; 
    document.getElementById('log-content').innerHTML = '';
    
    TIMETABLE.forEach(t => { 
        t.spawnTime = timeToSeconds(t.time); 
        t.hasSpawned = (t.spawnTime < gameTime); 
        t.hasCalled = (t.spawnTime < gameTime); 
        t.isClearedToEnter = !t.isCommuter; 
    });
    
    for(let id in SIGNALS) SIGNALS[id] = 'RED';
    switches = { 'SW_E_3': true, 'SW_W_3': true, 'SW_W_2': true, 'SW_E_2': true };
    
    initMap(); 
    addLog(`SYS: SIMULASI DI-RESET! Dimulai dari jam ${timeInput}`); 
    closeModal('settings-modal');
}

// ==========================================
// 3. JADWAL & DATABASE KA
// ==========================================
const CONFIG_SIMULASI = {
    SPEED_NORMAL: 19.0, SPEED_CAUTION: 13.0, SPEED_SWITCH: 7.0, BOARDING_TIME: 60,      
    BLOCK_SPEEDS: { 't6': 25.0, 't5': 25.0, 't3_blk': 12.0, 't2_blk': 12.0, 'p_1': 10.0, 'p_2': 10.0, 'p_3': 10.0, 'p_4': 10.0 }
};

let TIMETABLE = []; 

function populateScheduleModal() {
    let tbody = document.getElementById('full-schedule-body'); tbody.innerHTML = '';
    
    let upcomingTrains = TIMETABLE.filter(t => t.spawnTime >= gameTime);
    let sortedTable = upcomingTrains.sort((a,b) => a.spawnTime - b.spawnTime);
    
    if (sortedTable.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#888;">Tidak ada jadwal kereta lanjutan untuk hari ini.</td></tr>`;
    } else {
        sortedTable.forEach(t => {
            let typeHtml = t.isCommuter ? `<span style="color:#00ccff; font-weight:bold;">Commuter</span>` : `<span style="color:#ff8800; font-weight:bold;">Antar Kota (KAJJ)</span>`;
            tbody.innerHTML += `<tr><td style="color:#ffcc00; font-weight:bold;">${t.time}</td><td style="color:#fff;">${t.noKA}</td><td>${t.namaKA}</td><td>${t.destName}</td><td>${typeHtml}</td></tr>`;
        });
    }
}

let gameTime = 5 * 3600; let timeAccumulator = 0; let trains = [];

// ==========================================
// 4. KONFIGURASI PETA 
// ==========================================
const NODES = {
    'E_IN_6': {x: 98, y: 15}, 'W_OUT_6': {x: 12, y: 15}, 'W_IN_5': {x: 12, y: 25}, 'E_OUT_5': {x: 98, y: 25},
    'E_IN_3': {x: 98, y: 50}, 'BLK_E_IN_3': {x: 88, y: 50}, 'SIG_E_IN_3': {x: 82, y: 50}, 'SW_E_3': {x: 75, y: 50, type: 'switch'}, 
    'P_3_E': {x: 65, y: 50}, 'P_3_W': {x: 45, y: 50, isPlatform: true}, 'P_4_E': {x: 65, y: 40}, 'P_4_W': {x: 45, y: 40, isPlatform: true}, 'SW_W_3': {x: 35, y: 50, type: 'switch'}, 'W_OUT_3': {x: 12, y: 50},
    'W_IN_2': {x: 12, y: 65}, 'BLK_W_IN_2': {x: 22, y: 65}, 'SIG_W_IN_2': {x: 28, y: 65}, 'SW_W_2': {x: 35, y: 65, type: 'switch'}, 
    'P_2_W': {x: 45, y: 65}, 'P_2_E': {x: 65, y: 65, isPlatform: true}, 'P_1_W': {x: 45, y: 75}, 'P_1_E': {x: 65, y: 75, isPlatform: true}, 'SW_E_2': {x: 75, y: 65, type: 'switch'}, 'E_OUT_2': {x: 98, y: 65},
};

let TRACKS = [
    {id: 't6', from: 'E_IN_6', to: 'W_OUT_6'}, {id: 't5', from: 'W_IN_5', to: 'E_OUT_5'},
    {id: 't3_app', from: 'E_IN_3', to: 'BLK_E_IN_3'}, {id: 't3_blk', from: 'BLK_E_IN_3', to: 'SIG_E_IN_3'}, 
    {id: 't3_in', from: 'SIG_E_IN_3', to: 'SW_E_3'}, {id: 't3_main', from: 'SW_E_3', to: 'P_3_E', type: 'straight'}, {id: 't4_div',  from: 'SW_E_3', to: 'P_4_E', type: 'diverge'},  
    {id: 'p_3', from: 'P_3_E', to: 'P_3_W'}, {id: 'p_4', from: 'P_4_E', to: 'P_4_W'},
    {id: 't3_out', from: 'P_3_W', to: 'SW_W_3', type: 'straight'}, {id: 't4_out', from: 'P_4_W', to: 'SW_W_3', type: 'diverge'}, {id: 't3_exit', from: 'SW_W_3', to: 'W_OUT_3'}, 
    {id: 't2_app', from: 'W_IN_2', to: 'BLK_W_IN_2'}, {id: 't2_blk', from: 'BLK_W_IN_2', to: 'SIG_W_IN_2'}, 
    {id: 't2_in', from: 'SIG_W_IN_2', to: 'SW_W_2'}, {id: 't2_main', from: 'SW_W_2', to: 'P_2_W', type: 'straight'}, {id: 't1_div',  from: 'SW_W_2', to: 'P_1_W', type: 'diverge'},  
    {id: 'p_2', from: 'P_2_W', to: 'P_2_E'}, {id: 'p_1', from: 'P_1_W', to: 'P_1_E'},
    {id: 't2_out', from: 'P_2_E', to: 'SW_E_2', type: 'straight'}, {id: 't1_out', from: 'P_1_E', to: 'SW_E_2', type: 'diverge'}, {id: 't2_exit', from: 'SW_E_2', to: 'E_OUT_2'} 
];

const SVG_LABELS = [
    {x: 1.5, y: 15, text: "J6 (KAJJ) ←"}, {x: 1.5, y: 25, text: "J5 (KAJJ) →"}, {x: 1.5, y: 40, text: "J4 (SIDING) ←"}, 
    {x: 1.5, y: 50, text: "J3 (MAIN) ←"}, {x: 1.5, y: 65, text: "J2 (MAIN) →"}, {x: 1.5, y: 75, text: "J1 (SIDING) →"},
];

let switches = { 'SW_E_3': true, 'SW_W_3': true, 'SW_W_2': true, 'SW_E_2': true };
let SIGNALS = { 'BLK_E_IN_3': 'RED', 'SIG_E_IN_3': 'RED', 'P_3_W': 'RED', 'P_4_W': 'RED', 'BLK_W_IN_2': 'RED', 'SIG_W_IN_2': 'RED', 'P_2_E': 'RED', 'P_1_E': 'RED' };
const svgObj = document.getElementById('track-layer'); const entitiesObj = document.getElementById('entities');

function initMap() {
    svgObj.innerHTML = ''; entitiesObj.innerHTML = ''; 
    let pTop = document.createElementNS("http://www.w3.org/2000/svg", "rect"); pTop.setAttribute("x", "45%"); pTop.setAttribute("y", "42%"); pTop.setAttribute("width", "20%"); pTop.setAttribute("height", "6%"); pTop.setAttribute("rx", "4"); pTop.setAttribute("fill", "#2a2b30"); pTop.setAttribute("stroke", "#444"); svgObj.appendChild(pTop);
    let pBot = document.createElementNS("http://www.w3.org/2000/svg", "rect"); pBot.setAttribute("x", "45%"); pBot.setAttribute("y", "67%"); pBot.setAttribute("width", "20%"); pBot.setAttribute("height", "6%"); pBot.setAttribute("rx", "4"); pBot.setAttribute("fill", "#2a2b30"); pBot.setAttribute("stroke", "#444"); svgObj.appendChild(pBot);

    SVG_LABELS.forEach(lbl => { let txt = document.createElementNS("http://www.w3.org/2000/svg", "text"); txt.setAttribute("x", lbl.x + "%"); txt.setAttribute("y", lbl.y + "%"); txt.setAttribute("class", "svg-label"); txt.textContent = lbl.text; svgObj.appendChild(txt); });

    let p1 = document.createElementNS("http://www.w3.org/2000/svg", "text"); p1.setAttribute("x", "55%"); p1.setAttribute("y", "45%"); p1.setAttribute("class", "svg-platform"); p1.textContent = "[ PERON 3 & 4 ]"; svgObj.appendChild(p1);
    let p2 = document.createElementNS("http://www.w3.org/2000/svg", "text"); p2.setAttribute("x", "55%"); p2.setAttribute("y", "70%"); p2.setAttribute("class", "svg-platform"); p2.textContent = "[ PERON 1 & 2 ]"; svgObj.appendChild(p2);

    TRACKS.forEach(tr => {
        let g = document.createElementNS("http://www.w3.org/2000/svg", "g"); g.appendChild(createLine(NODES[tr.from], NODES[tr.to], 'base', tr.id)); g.appendChild(createLine(NODES[tr.from], NODES[tr.to], 'route-layer', `r_${tr.id}`)); g.appendChild(createLine(NODES[tr.from], NODES[tr.to], 'occupied-layer', `o_${tr.id}`)); svgObj.appendChild(g);
    });

    for (let id in switches) { let btn = document.createElement('div'); btn.className = 'switch-point'; btn.style.left = NODES[id].x + '%'; btn.style.top = NODES[id].y + '%'; btn.onclick = () => toggleSwitch(id); entitiesObj.appendChild(btn); }

    for (let id in SIGNALS) {
        let n = NODES[id]; let housing = document.createElement('div'); housing.className = 'signal-housing'; housing.id = `sig_housing_${id}`;
        if (id.includes('BLK_')) { housing.style.transform = "translate(-50%, -50%) scale(0.85)"; housing.style.cursor = "default"; } else { housing.onclick = () => toggleSignal(id); housing.style.cursor = "pointer"; }
        
        let isBottom = id.includes('P_1') || id.includes('P_2') || id.includes('W_IN_2'); let yOffset = isBottom ? 7.5 : -7.5; 
        housing.style.left = n.x + '%'; housing.style.top = (n.y + yOffset) + '%';
        let lampOrder = isBottom ? ['r', 'y', 'g'] : ['g', 'y', 'r'];
        lampOrder.forEach(color => { let lamp = document.createElement('div'); lamp.className = `signal-lamp lamp-${color}`; lamp.id = `lamp_${id}_${color}`; housing.appendChild(lamp); });
        entitiesObj.appendChild(housing);

        let pole = document.createElement('div'); pole.className = 'signal-pole'; pole.style.left = n.x + '%'; 
        if (isBottom) { pole.style.top = n.y + '%'; pole.style.height = Math.abs(yOffset) + '%'; } else { pole.style.top = (n.y + yOffset) + '%'; pole.style.height = Math.abs(yOffset) + '%'; }
        entitiesObj.appendChild(pole); updateSignalVisual(id);
    }
    updateRoutesVisual(); document.getElementById('clock').innerText = formatTime(gameTime);
}

function createLine(n1, n2, cls, id) {
    let l = document.createElementNS("http://www.w3.org/2000/svg", "line"); l.setAttribute("x1", n1.x + "%"); l.setAttribute("y1", n1.y + "%"); l.setAttribute("x2", n2.x + "%"); l.setAttribute("y2", n2.y + "%"); l.setAttribute("class", cls); l.id = id; return l;
}

function updateSignalVisual(id) {
    let state = SIGNALS[id]; let rLamp = document.getElementById(`lamp_${id}_r`); let yLamp = document.getElementById(`lamp_${id}_y`); let gLamp = document.getElementById(`lamp_${id}_g`);
    if(rLamp) rLamp.classList.remove('on'); if(yLamp) yLamp.classList.remove('on'); if(gLamp) gLamp.classList.remove('on');
    if (state === 'RED' && rLamp) rLamp.classList.add('on'); else if (state === 'YELLOW' && yLamp) yLamp.classList.add('on'); else if (state === 'GREEN' && gLamp) gLamp.classList.add('on');
}
function isTrackOccupied(trackIdsArray) { return trains.some(t => t.currentTrack && trackIdsArray.includes(t.currentTrack.id)); }

function updateAutomaticSignals() {
    let isT3BlkOccupied = trains.some(t => t.currentTrack && t.currentTrack.id === 't3_blk'); let blk3Aspect = 'GREEN';
    if (isT3BlkOccupied) blk3Aspect = 'RED'; else if (SIGNALS['SIG_E_IN_3'] === 'RED') blk3Aspect = 'YELLOW'; 
    if (SIGNALS['BLK_E_IN_3'] !== blk3Aspect) { SIGNALS['BLK_E_IN_3'] = blk3Aspect; updateSignalVisual('BLK_E_IN_3'); updateRoutesVisual(); }

    let isT2BlkOccupied = trains.some(t => t.currentTrack && t.currentTrack.id === 't2_blk'); let blk2Aspect = 'GREEN';
    if (isT2BlkOccupied) blk2Aspect = 'RED'; else if (SIGNALS['SIG_W_IN_2'] === 'RED') blk2Aspect = 'YELLOW'; 
    if (SIGNALS['BLK_W_IN_2'] !== blk2Aspect) { SIGNALS['BLK_W_IN_2'] = blk2Aspect; updateSignalVisual('BLK_W_IN_2'); updateRoutesVisual(); }
}

function toggleSwitch(id) {
    if (id === 'SW_E_3') { if (SIGNALS['SIG_E_IN_3'] !== 'RED' || isTrackOccupied(['t3_in', 't3_main', 't4_div'])) { addLog("SYS MENOLAK: Wesel SW_E_3 terkunci!"); return; } }
    if (id === 'SW_W_2') { if (SIGNALS['SIG_W_IN_2'] !== 'RED' || isTrackOccupied(['t2_in', 't2_main', 't1_div'])) { addLog("SYS MENOLAK: Wesel SW_W_2 terkunci!"); return; } }
    if (id === 'SW_W_3') { if (SIGNALS['P_3_W'] !== 'RED' || SIGNALS['P_4_W'] !== 'RED' || isTrackOccupied(['t3_out', 't4_out'])) { addLog("SYS MENOLAK: Wesel SW_W_3 terkunci!"); return; } }
    if (id === 'SW_E_2') { if (SIGNALS['P_2_E'] !== 'RED' || SIGNALS['P_1_E'] !== 'RED' || isTrackOccupied(['t2_out', 't1_out'])) { addLog("SYS MENOLAK: Wesel SW_E_2 terkunci!"); return; } }
    switches[id] = !switches[id]; let mode = switches[id] ? 'LURUS (Utama)' : 'BELOK (Siding)'; updateRoutesVisual();
}

function toggleSignal(id) {
    if (SIGNALS[id] !== 'RED') { SIGNALS[id] = 'RED'; updateSignalVisual(id); updateRoutesVisual(); return; }
    
    // BLOKIR SINYAL KELUAR JIKA BELUM TELEPON TUJUAN
    if (['P_1_E', 'P_2_E', 'P_3_W', 'P_4_W'].includes(id)) {
        let trainAtSignal = trains.find(tr => tr.currentTrack && tr.currentTrack.to === id && tr.percent >= 98);
        if (trainAtSignal && !clearedDepartures.has(trainAtSignal.noKA)) {
            addLog(`<span style="color:#ff3333;">SYS MENOLAK: Anda belum meminta izin berangkat ke stasiun tujuan untuk KA ${trainAtSignal.noKA}!</span>`);
            return; 
        }
    }
    
    let aspect = 'GREEN'; 
    if (id === 'SIG_E_IN_3') { if (switches['SW_E_3'] === true && isTrackOccupied(['t3_main', 'p_3'])) { addLog("SYS MENOLAK: Jalur 3 diduduki KA lain!"); return; } if (switches['SW_E_3'] === false && isTrackOccupied(['t4_div', 'p_4'])) { addLog("SYS MENOLAK: Jalur 4 diduduki KA lain!"); return; } aspect = 'YELLOW'; }
    else if (id === 'SIG_W_IN_2') { if (switches['SW_W_2'] === true && isTrackOccupied(['t2_main', 'p_2'])) { addLog("SYS MENOLAK: Jalur 2 diduduki KA lain!"); return; } if (switches['SW_W_2'] === false && isTrackOccupied(['t1_div', 'p_1'])) { addLog("SYS MENOLAK: Jalur 1 diduduki KA lain!"); return; } aspect = 'YELLOW'; }
    else if (id === 'P_3_W') { if (switches['SW_W_3'] === false) { addLog("SYS MENOLAK: Wesel melanggar rute!"); return; } aspect = 'GREEN'; }
    else if (id === 'P_4_W') { if (switches['SW_W_3'] === true) { addLog("SYS MENOLAK: Wesel melanggar rute!"); return; } aspect = 'GREEN'; }
    else if (id === 'P_2_E') { if (switches['SW_E_2'] === false) { addLog("SYS MENOLAK: Wesel melanggar rute!"); return; } aspect = 'GREEN'; }
    else if (id === 'P_1_E') { if (switches['SW_E_2'] === true) { addLog("SYS MENOLAK: Wesel melanggar rute!"); return; } aspect = 'GREEN'; }
    SIGNALS[id] = aspect; updateSignalVisual(id); updateRoutesVisual();
}

function updateRoutesVisual() {
    document.querySelectorAll('.route-layer').forEach(e => e.classList.remove('active'));
    let wMasukE3 = switches['SW_E_3'] ? 't3_main' : 't4_div'; let el1 = document.getElementById(`r_${wMasukE3}`); if(el1) el1.classList.add('active');
    let wMasukW2 = switches['SW_W_2'] ? 't2_main' : 't1_div'; let el2 = document.getElementById(`r_${wMasukW2}`); if(el2) el2.classList.add('active');
    let wKeluarW3 = switches['SW_W_3'] ? 't3_out' : 't4_out'; let el3 = document.getElementById(`r_${wKeluarW3}`); if(el3) el3.classList.add('active');
    let wKeluarE2 = switches['SW_E_2'] ? 't2_out' : 't1_out'; let el4 = document.getElementById(`r_${wKeluarE2}`); if(el4) el4.classList.add('active');
    if (SIGNALS['BLK_E_IN_3'] !== 'RED') { let t = document.getElementById('r_t3_blk'); if(t) t.classList.add('active'); }
    if (SIGNALS['BLK_W_IN_2'] !== 'RED') { let t = document.getElementById('r_t2_blk'); if(t) t.classList.add('active'); }
    if (SIGNALS['SIG_E_IN_3'] !== 'RED') { let t = document.getElementById('r_t3_in'); if(t) t.classList.add('active'); }
    if (SIGNALS['SIG_W_IN_2'] !== 'RED') { let t = document.getElementById('r_t2_in'); if(t) t.classList.add('active'); }
}

// === CLASS KERETA ===
// === CLASS KERETA ===
class Train {
    constructor(noKA, namaKA, startNode, destName, isCommuter = true) {
        this.noKA = noKA; this.namaKA = namaKA; this.currentNode = startNode; this.destName = destName;
        this.isCommuter = isCommuter; this.percent = 0; this.baseSpeed = 0; this.currentTrack = null;
        this.state = 'RUNNING'; this.hasDocked = false; this.lastAspect = 'GREEN'; this.dockTimer = 0; 
        
        // --- VARIABEL BARU UNTUK ALARM MASINIS ---
        this.waitTimer = 0; 
        this.isAlarming = false;

        this.element = document.createElement('div'); 
        this.element.className = 'train-entity'; 
        this.element.innerText = noKA; 

        // --- KLIK KERETA UNTUK BUKA RADIO MASINIS ---
        this.element.onclick = () => openMasinisModal(this);

        let entLayer = document.getElementById('entities'); if(entLayer) entLayer.appendChild(this.element);
        this.findNextTrack(); this.updateTable();
    }

    findNextTrack() {
        let candidates = TRACKS.filter(t => t.from === this.currentNode);
        if (candidates.length === 0) { this.despawn(); return; }
        let chosenTrack = candidates[0];
        if (switches.hasOwnProperty(this.currentNode)) {
            let targetType = switches[this.currentNode] ? 'straight' : 'diverge'; let isMergeSwitch = (this.currentNode === 'SW_W_3' || this.currentNode === 'SW_E_2');
            if (isMergeSwitch) chosenTrack = candidates[0]; else chosenTrack = candidates.find(t => t.type === targetType) || candidates[0];
        }
        if (chosenTrack) { this.currentTrack = chosenTrack; this.percent = 0; this.hasDocked = false; let oLine = document.getElementById(`o_${this.currentTrack.id}`); if(oLine) oLine.classList.add('active'); } else { this.baseSpeed = 0; this.updateTable("TERTAHAN (SYSTEM HALT)"); }
    }

    update(dt) {
        if (!this.currentTrack) return;

        let n1_ini = NODES[this.currentTrack.from], n2_ini = NODES[this.currentTrack.to];
        this.element.style.left = (n1_ini.x + (n2_ini.x - n1_ini.x) * (this.percent / 100)) + '%';
        this.element.style.top = (n1_ini.y + (n2_ini.y - n1_ini.y) * (this.percent / 100)) + '%';

        let scheduleObj = TIMETABLE.find(x => x.noKA === this.noKA);
        if (scheduleObj && scheduleObj.isClearedToEnter === false) {
            this.baseSpeed = 0;
            this.updateTable("MENUNGGU BALASAN TELEPON"); 
            return; 
        }

        if (this.state === 'DOCKED') { 
            this.dockTimer -= dt; 
            if (this.dockTimer <= 0) { 
                this.state = 'RUNNING'; 
                this.element.classList.remove('train-docked'); 
                this.updateTable("MENUNGGU SINYAL KELUAR"); 
            } 
            return; 
        }

        if (this.state === 'RUNNING') {
            let blockLimit = CONFIG_SIMULASI.BLOCK_SPEEDS[this.currentTrack.id];
            if (this.currentTrack.type === 'diverge' || this.currentTrack.type === 'crossover') { this.baseSpeed = CONFIG_SIMULASI.SPEED_SWITCH; this.updateTable("WESEL BELOK (S6)"); }
            else if (this.lastAspect === 'YELLOW') { this.baseSpeed = CONFIG_SIMULASI.SPEED_CAUTION; if (blockLimit !== undefined && blockLimit < this.baseSpeed) this.baseSpeed = blockLimit; this.updateTable("HATI-HATI (S6)"); } 
            else { if (blockLimit !== undefined) { this.baseSpeed = blockLimit; this.updateTable(`BERJALAN (BLOK: ${this.baseSpeed})`); } else { this.baseSpeed = CONFIG_SIMULASI.SPEED_NORMAL; this.updateTable("BERJALAN (S5)"); } }
        }

        let nextPercent = this.percent + (this.baseSpeed * dt);
        let nextSignal = SIGNALS[this.currentTrack.to]; let isRedSignal = (nextSignal && nextSignal === 'RED');
        let weselConflict = false;
        if (switches.hasOwnProperty(this.currentTrack.to)) { let isNormal = switches[this.currentTrack.to]; if (this.currentTrack.type === 'straight' && !isNormal) weselConflict = true; if (this.currentTrack.type === 'diverge' && isNormal) weselConflict = true; }

        if (this.isCommuter && NODES[this.currentTrack.to].isPlatform && nextPercent >= 98 && this.state === 'RUNNING' && !this.hasDocked) {
            this.state = 'DOCKED'; this.hasDocked = true; this.percent = 98; this.dockTimer = CONFIG_SIMULASI.BOARDING_TIME; 
            this.element.classList.add('train-docked'); this.updateTable("BOARDING PENUMPANG");
            let n1 = NODES[this.currentTrack.from], n2 = NODES[this.currentTrack.to]; this.element.style.left = (n1.x + (n2.x - n1.x) * (this.percent / 100)) + '%'; this.element.style.top = (n1.y + (n2.y - n1.y) * (this.percent / 100)) + '%'; return;
        }

        if (nextPercent >= 98 && (isRedSignal || weselConflict)) {
            this.percent = 98; 
            if (isRedSignal) this.updateTable("BERHENTI (S7)"); else if (weselConflict) this.updateTable("TERTAHAN WESEL KELUAR");
            
            // --- LOGIKA ALARM MASINIS KETIKA KERETA TERTUNGGU DI SINYAL MERAH ---
            this.waitTimer += dt;
            // Jika tertahan lebih dari 40 detik in-game dan belum menyala alarmnya
            if (this.waitTimer > 40 && !this.isAlarming) { 
                this.isAlarming = true;
                this.element.classList.add('train-alarm'); 
                
                // Pastikan fungsi ini sudah ada di script lu sebelumnya
                if(typeof playMasinisAlarm === "function") playMasinisAlarm(); 
                
                addLog(`<span style="color:#ff8800; font-weight:bold;">[RADIO MASINIS] KA ${this.noKA} memanggil PPKA. Meminta izin jalan!</span>`);
                if(typeof speakVoice === "function") speakVoice(`PPKA Cakung. Dari Masinis KA ${this.noKA}. Mohon izin pelayanan jalan. Ganti.`, 500);
            }

            let n1 = NODES[this.currentTrack.from], n2 = NODES[this.currentTrack.to]; this.element.style.left = (n1.x + (n2.x - n1.x) * (this.percent / 100)) + '%'; this.element.style.top = (n1.y + (n2.y - n1.y) * (this.percent / 100)) + '%'; return; 
        }

        // --- MATIKAN ALARM OTOMATIS JIKA KERETA SUDAH BERJALAN (DAPAT SINYAL HIJAU) ---
        if (this.isAlarming && !isRedSignal && !weselConflict) {
            this.isAlarming = false;
            this.waitTimer = 0;
            this.element.classList.remove('train-alarm');
        } else if (!this.isAlarming) {
            // Reset timer kecil jika tidak sedang status alarm
            if (this.waitTimer > 0) this.waitTimer = 0;
        }

        this.percent = nextPercent; let n1 = NODES[this.currentTrack.from], n2 = NODES[this.currentTrack.to];
        this.element.style.left = (n1.x + (n2.x - n1.x) * (this.percent / 100)) + '%'; this.element.style.top = (n1.y + (n2.y - n1.y) * (this.percent / 100)) + '%';

        if (this.percent >= 100) {
            let oldLine = document.getElementById(`o_${this.currentTrack.id}`); if(oldLine) oldLine.classList.remove('active');
            let passedNode = this.currentTrack.to; if (SIGNALS[passedNode]) this.lastAspect = SIGNALS[passedNode];
            if (SIGNALS[passedNode] && !passedNode.includes('BLK_') && SIGNALS[passedNode] !== 'RED') { SIGNALS[passedNode] = 'RED'; updateSignalVisual(passedNode); updateRoutesVisual(); }
            this.currentNode = passedNode; this.findNextTrack();
        }
    }

    despawn() {
        if(this.element) this.element.remove(); trains = trains.filter(t => t !== this);
        let row = document.getElementById(`row-${this.noKA}`); if(row) row.remove();
        
        if(document.getElementById('panel-keluar').style.display === 'block') {
            if(typeof updateOutgoingTrainList === "function") updateOutgoingTrainList();
        }
    }

    updateTable(statusStr = "BERJALAN (S5)") {
        let tbody = document.getElementById('schedule-body'); if(!tbody) return;
        let row = document.getElementById(`row-${this.noKA}`);
        if (!row) {
            row = document.createElement('tr'); row.id = `row-${this.noKA}`; row.innerHTML = `<td>${this.noKA}</td><td style="color:#888;">${this.namaKA}</td><td>${this.destName}</td><td class="b-cell">BLOK ${this.currentNode}</td><td class="s-cell">${statusStr}</td>`; tbody.appendChild(row);
        } else {
            let bCell = row.querySelector('.b-cell'); let sCell = row.querySelector('.s-cell');
            if(bCell) bCell.innerText = `BLOK ${this.currentNode}`; 
            if(sCell) { 
                sCell.innerText = statusStr; 
                if(statusStr.includes("S7") || statusStr.includes("TERTAHAN") || statusStr.includes("GAGAL") || statusStr.includes("MENUNGGU BALASAN")) sCell.style.color = "#ff3333"; 
                else if(statusStr.includes("S6") || statusStr.includes("WESEL") || statusStr.includes("HATI-HATI")) sCell.style.color = "#ffff00"; 
                else if(statusStr.includes("BOARDING")) sCell.style.color = "#00ffff"; 
                else sCell.style.color = "#00ff00"; 
            }
        }
    }
}

function formatTime(totalSecs) { let h = Math.floor(totalSecs / 3600); let m = Math.floor((totalSecs % 3600) / 60); let s = Math.floor(totalSecs % 60); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function addLog(msg) { let logBox = document.getElementById('log-content'); if(!logBox) return; let div = document.createElement('div'); div.innerHTML = `<span class="log-time">[${formatTime(gameTime)}]</span> ${msg}`; logBox.prepend(div); }

function checkTimetable() {
    TIMETABLE.forEach(t => {
        if (t.isCommuter && gameTime >= t.spawnTime - 30 && !t.hasCalled) {
            t.hasCalled = true; 
            t.isClearedToEnter = false; 
            
            let noAngka = parseInt(t.noKA.replace(/\D/g, ''));
            let isEven = (noAngka % 2 === 0);
            let fromStation = isEven ? "Klender Baru" : "Kranji";
            
            let voiceMsg = `Stasiun Cakung. KA ${t.noKA}, diberangkatkan menuju stasiun Anda. Mohon dipersiapkan. Ganti.`;
            let logMsg = `KA ${t.noKA} diberangkatkan menuju stasiun Anda. Mohon dipersiapkan.`;
            
            incomingCalls.push({ id: Date.now() + Math.random(), from: fromStation, noKA: t.noKA, messageLog: logMsg });
            updateCommUI();
            
            addLog(`<span style="color:#ff5555; font-weight:bold;">[TELEPON] Panggilan masuk dari ${fromStation} untuk KA ${t.noKA}!</span>`);
            playIncomingRing();
            speakVoice(`Panggilan masuk dari Stasiun ${fromStation}. ${voiceMsg}`, 1500); 
        }

        if (gameTime >= t.spawnTime && !t.hasSpawned) {
            t.hasSpawned = true; 
            let noAngka = parseInt(t.noKA.replace(/\D/g, ''));
            let isEven = (noAngka % 2 === 0);
            let autoStartNode = t.isCommuter ? (isEven ? "W_IN_2" : "E_IN_3") : (isEven ? "W_IN_5" : "E_IN_6");
            trains.push(new Train(t.noKA, t.namaKA, autoStartNode, t.destName, t.isCommuter));
            
            if (!t.isCommuter) {
                let jalur = isEven ? "5" : "6";
                addLog(`<span style="color:#ff8800; font-weight:bold;">[INFO PK] KA ${t.noKA} (${t.namaKA}) melintas langsung di Jalur ${jalur}.</span>`);
            }
        }
    });
}

function loadJadwalAndInit() {
    // Membaca link GAS_URL dari API_CONFIG (file api.js)
    const urlDatabase = typeof API_CONFIG !== 'undefined' && API_CONFIG.GAS_URL ? API_CONFIG.GAS_URL : 'jadwal.json';
    
    fetch(urlDatabase)
        .then(response => {
            if(!response.ok) throw new Error("File jadwal tidak ditemukan!");
            return response.json();
        })
        .then(data => {
            TIMETABLE = data;
            TIMETABLE.forEach(t => { 
                t.spawnTime = timeToSeconds(t.time); 
                t.hasSpawned = false; 
                t.hasCalled = false; 
                t.isClearedToEnter = !t.isCommuter; // KAJJ otomatis True
            });
            initMap();
            
            const workerBlob = new Blob([` let lastTime = Date.now(); setInterval(() => { let now = Date.now(); let dt = now - lastTime; lastTime = now; self.postMessage(dt); }, 40); `], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(workerBlob));
            
            worker.onmessage = function(e) {
                let realDeltaMs = e.data;
                if (timeMultiplier > 0) {
                    let inGameDeltaMs = realDeltaMs * timeMultiplier; timeAccumulator += inGameDeltaMs;
                    while (timeAccumulator >= 1000) { gameTime++; timeAccumulator -= 1000; let clk = document.getElementById('clock'); if(clk) clk.innerText = formatTime(gameTime); updateAutomaticSignals(); checkTimetable(); }
                    let dtSeconds = inGameDeltaMs / 1000; trains.forEach(t => t.update(dtSeconds));
                }
            };
        })
        .catch(err => {
            console.error(err);
            alert("GAGAL MEMUAT JADWAL: Pastikan data bisa diakses.");
        });
}

loadJadwalAndInit();