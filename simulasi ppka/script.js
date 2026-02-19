/**
 * ENGINE DISPATCHER PROFESIONAL (V50 - FINAL RESPONSIVE & SECURE ROUTE)
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
    
    // Cek orientasi layar portrait
    let isPortrait = window.innerHeight > window.innerWidth;
    
    if (isPortrait) {
        warning.style.display = 'flex';
        // Pause simulasi
        if (typeof timeMultiplier !== 'undefined' && timeMultiplier > 0) { 
            previousSpeedForLock = timeMultiplier; 
            if (typeof setSpeed === 'function') setSpeed(0); 
        }
    } else {
        warning.style.display = 'none';
    }
}
window.addEventListener('resize', checkDeviceLock);
window.addEventListener('orientationchange', checkDeviceLock);
document.addEventListener('DOMContentLoaded', checkDeviceLock);

// ==========================================
// 0. SISTEM AUDIO & VOICE
// ==========================================
let isSfxOn = true; let isVoiceOn = true; let audioCtx = null; let sysVoices = [];
window.speechSynthesis.onvoiceschanged = () => { sysVoices = window.speechSynthesis.getVoices(); };

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (sysVoices.length === 0) sysVoices = window.speechSynthesis.getVoices();
}
document.addEventListener('click', initAudio, { once: true });

function toggleSfx(el) { isSfxOn = el.checked; initAudio(); }
function toggleVoice(el) { isVoiceOn = el.checked; initAudio(); if (!isVoiceOn) window.speechSynthesis.cancel(); }

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
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.1);
}

function playMasinisAlarm() {
    if (!isSfxOn || !audioCtx) return;
    for (let i = 0; i < 3; i++) {
        let osc = audioCtx.createOscillator(); let gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = 'sawtooth'; osc.frequency.value = 1200; 
        gain.gain.setValueAtTime(0, audioCtx.currentTime + (i * 0.25));
        gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + (i * 0.25) + 0.05);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + (i * 0.25) + 0.1);
        osc.start(audioCtx.currentTime + (i * 0.25)); osc.stop(audioCtx.currentTime + (i * 0.25) + 0.15);
    }
}

function speakVoice(text, delayMs = 0) {
    if (!isSfxOn && !isVoiceOn) return; 
    setTimeout(() => {
        if (isSfxOn) playRadioClick(); 
        setTimeout(() => {
            if (isVoiceOn) {
                window.speechSynthesis.cancel(); 
                let msg = new SpeechSynthesisUtterance(text); msg.lang = 'id-ID'; 
                if (sysVoices.length === 0) sysVoices = window.speechSynthesis.getVoices();
                let idVoices = sysVoices.filter(v => v.lang.includes('id'));
                let maleVoice = idVoices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('andika'));
                if (maleVoice) { msg.voice = maleVoice; msg.pitch = 0.9; } else if (idVoices.length > 0) { msg.voice = idVoices[0]; msg.pitch = 0.5; } else { msg.pitch = 0.5; }
                msg.rate = 0.85; msg.onend = () => { if (isSfxOn) playRadioClick(); };
                window.speechSynthesis.speak(msg);
            } else {
                if (isSfxOn) setTimeout(() => playRadioClick(), 2000);
            }
        }, 200); 
    }, delayMs);
}

// ==========================================
// 1. SISTEM TELEPON & MODAL UI
// ==========================================
let incomingCalls = []; let clearedDepartures = new Set(); 
function openModal(id) { document.getElementById(id).classList.add('active'); if (id === 'comm-modal') updateCommUI(); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function switchManifestTab(tabName) {
    let btnLive = document.getElementById('tab-btn-live'); let btnJadwal = document.getElementById('tab-btn-jadwal');
    if (tabName === 'live') {
        document.getElementById('manifest-live').style.display = 'block'; document.getElementById('manifest-jadwal').style.display = 'none';
        btnLive.className = "tab-btn active-tab"; btnJadwal.className = "tab-btn inactive-tab";
    } else {
        document.getElementById('manifest-live').style.display = 'none'; document.getElementById('manifest-jadwal').style.display = 'block';
        btnLive.className = "tab-btn inactive-tab"; btnJadwal.className = "tab-btn active-tab";
        populateBottomSchedule(); 
    }
}

function populateBottomSchedule() {
    let tbody = document.getElementById('bottom-schedule-body'); if(!tbody) return; tbody.innerHTML = '';
    let upcomingTrains = TIMETABLE.filter(t => t.spawnTime >= gameTime - 60); 
    let sortedTable = upcomingTrains.sort((a,b) => a.spawnTime - b.spawnTime);
    if (sortedTable.length === 0) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#888;">Tidak ada jadwal kereta lanjutan untuk hari ini.</td></tr>`; } 
    else {
        sortedTable.forEach(t => {
            let delayStr = ""; let realtimeStr = formatTime(t.spawnTime);
            if (t.offsetOffset > 60) { let mins = Math.floor(t.offsetOffset/60); delayStr = `<span style="color:#ff5555; font-size:11px; font-weight:bold; margin-left:5px;">(+${mins}')</span>`; } 
            else if (t.offsetOffset < -60) { let mins = Math.floor(Math.abs(t.offsetOffset)/60); delayStr = `<span style="color:#00ff00; font-size:11px; font-weight:bold; margin-left:5px;">(-${mins}')</span>`; } 
            else { delayStr = `<span style="color:#888; font-size:11px; margin-left:5px;">(OK)</span>`; }
            let jenisBadge = t.isCommuter ? `<span class="badge badge-commuter">COMMUTER</span>` : `<span class="badge badge-kajj">ANTAR KOTA</span>`;
            tbody.innerHTML += `<tr><td style="color:#888; font-weight:bold;">${t.time}</td><td style="color:#ffcc00; font-weight:bold;">${realtimeStr} ${delayStr}</td><td style="color:#fff; font-family: monospace; font-size: 13px;">${t.noKA}</td><td><span style="color:#fff;">${t.namaKA}</span> <span style="color:#aaa;">- ${t.destName}</span></td><td>${jenisBadge}</td></tr>`;
        });
    }
}

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
    document.getElementById('notif-badge').innerText = `(${count})`; document.getElementById('tab-notif-badge').innerText = `(${count})`;
    let btnTelepon = document.getElementById('btn-telepon'); if (count > 0) btnTelepon.classList.add('blinking'); else btnTelepon.classList.remove('blinking');
    let listDiv = document.getElementById('incoming-list');
    if (count === 0) { listDiv.innerHTML = '<p style="color:#888; text-align:center; padding: 20px 0;">Tidak ada panggilan masuk saat ini.</p>'; } 
    else {
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
            </div>`).join('');
    }
}

function updateOutgoingTrainList() {
    let st = document.getElementById('out-station').value; let selectNoka = document.getElementById('out-noka'); selectNoka.innerHTML = ''; 
    let availableTrains = trains.filter(t => {
        if (!t.isCommuter || clearedDepartures.has(t.noKA)) return false;
        if (st === 'KRI' && t.isEven) return true; 
        if (st === 'KLDB' && !t.isEven) return true; 
        return false;
    });
    if (availableTrains.length === 0) { selectNoka.innerHTML = '<option value="">-- Tidak ada KA ke arah ini --</option>'; } 
    else { availableTrains.forEach(t => { selectNoka.innerHTML += `<option value="${t.noKA}">KA ${t.noKA} (Tujuan: ${t.destName}) - Posisi: ${t.currentNode}</option>`; }); }
}

function replyIncomingCall(id) {
    let callIndex = incomingCalls.findIndex(c => c.id == id);
    if (callIndex > -1) {
        let call = incomingCalls[callIndex]; let replyMsg = document.getElementById(`reply-${id}`).value;
        addLog(`<span style="color:#00ccff">[TELEPON] ANDA -> ${call.from}:</span> ${replyMsg}`); speakVoice(`Stasiun ${call.from}, ${replyMsg}`);
        let scheduledTrain = TIMETABLE.find(x => x.noKA === call.noKA); if (scheduledTrain) scheduledTrain.isClearedToEnter = true;
        incomingCalls.splice(callIndex, 1); updateCommUI();
    }
}

function sendOutgoingCall() {
    let st = document.getElementById('out-station').value; let ka = document.getElementById('out-noka').value; let msgType = document.getElementById('out-msg').value;
    if(!ka) { alert("Tidak ada KA yang dipilih untuk dihubungi!"); return; }
    let stName = st === 'KRI' ? 'KRANJI' : 'KLENDER BARU';
    let voiceMsg = msgType === 'siap' ? `Stasiun ${stName}, KA ${ka}, siap diberangkatkan dari Cakung. Apakah stasiun aman? Ganti.` : `Stasiun ${stName}, KA ${ka}, belum bisa diberangkatkan dari Cakung. Mohon tunggu. Ganti.`;
    let statusDiv = document.getElementById('out-status'); let btn = document.getElementById('btn-send-out');
    btn.disabled = true; btn.style.background = "#555"; statusDiv.innerHTML = `<span style="color:#ffcc00;">Memanggil Stasiun ${stName}...</span>`;
    addLog(`<span style="color:#00ccff">[TELEPON] ANDA -> ${stName}:</span> ${voiceMsg}`); speakVoice(voiceMsg);

    setTimeout(() => {
        let replyVoice = "";
        if (msgType === 'siap') { replyVoice = `Aman, laksanakan. Silakan berangkatkan KA ${ka}, menuju stasiun kami. Ganti.`; clearedDepartures.add(ka); } 
        else { replyVoice = `Copy. Kami stand by menunggu KA ${ka}. Ganti.`; }
        statusDiv.innerHTML = `<span style="color:#00ff00;">Stasiun ${stName} Membalas: "${replyVoice}"</span>`;
        addLog(`<span style="color:#00ff00">[TELEPON] ${stName} -> ANDA:</span> ${replyVoice}`);
        speakVoice(`Stasiun Cakung. ${replyVoice}`); btn.disabled = false; btn.style.background = "#0066ff"; updateOutgoingTrainList(); 
    }, 6000); 
}

// ==========================================
// RADIO MASINIS & IZIN CONTRAFLOW
// ==========================================
let activeMasinisTrain = null;

function openMasinisModal(trainObj) {
    activeMasinisTrain = trainObj;
    document.getElementById('masinis-modal').classList.add('active');
    document.getElementById('masinis-title').innerText = `📻 RADIO MASINIS KA ${trainObj.noKA}`;

    let replySelect = document.getElementById('masinis-reply');
    let isEntering = ['SIG_E_IN_3', 'SIG_W_IN_2'].includes(trainObj.currentTrack.to); 
    
    let isWrongWay = (!trainObj.isEven && (trainObj.currentTrack.to === 'P_2_W' || trainObj.currentTrack.to === 'P_1_W')) || 
                     (trainObj.isEven && (trainObj.currentTrack.to === 'P_3_E' || trainObj.currentTrack.to === 'P_4_E'));

    if (isEntering) {
        replySelect.innerHTML = `
            <option value="izin">Copy, segera saya layani di jalur normal. Ganti.</option>
            <option value="darurat_masuk">KA akan dilayani di sepur salah, perlambat kecepatannya. Ganti.</option>
            <option value="tahan">Copy, Cakung masih ramai, tunggu sebentar. Ganti.</option>
        `;
    } else if (isWrongWay) {
        replySelect.innerHTML = `
            <option value="darurat_izin">Semboyan 6 diizinkan berangkat kecepatan terbatas. Ganti.</option>
            <option value="tahan">Tunggu sebentar, jalur keluar belum aman. Ganti.</option>
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

    activeMasinisTrain.isAlarming = false;
    activeMasinisTrain.element.classList.remove('train-alarm');

    if (val === 'izin') {
        activeMasinisTrain.waitTimer = -120; 
    } else if (val === 'darurat_masuk') {
        activeMasinisTrain.contraflowEntryCleared = true; 
        activeMasinisTrain.waitTimer = 0;
    } else if (val === 'darurat_izin') {
        activeMasinisTrain.emergencyCleared = true; 
        activeMasinisTrain.waitTimer = 0;
        activeMasinisTrain.baseSpeed = CONFIG_SIMULASI.SPEED_SWITCH; 
    } else {
        activeMasinisTrain.waitTimer = -20;  
    }

    addLog(`<span style="color:#00ccff">[RADIO] ANDA -> Masinis KA ${activeMasinisTrain.noKA}:</span> ${textMsg}`);
    speakVoice(`Masinis KA ${activeMasinisTrain.noKA}. ${textMsg}`);
    closeModal('masinis-modal');
}

// ==========================================
// 2. PENGATURAN WAKTU & DELAY RANDOM
// ==========================================
let timeMultiplier = 1;  
let lastEOutBlkTime = -9999; 
let lastWOutBlkTime = -9999; 

function setSpeed(val) { val = Math.max(0, Math.min(100, parseFloat(val) || 0)); timeMultiplier = val; document.getElementById('speed-slider').value = val; document.getElementById('speed-input').value = val; }
function timeToSeconds(timeStr) { let p = timeStr.split(':'); return parseInt(p[0]) * 3600 + parseInt(p[1]) * 60 + parseInt(p[2]); }
function getRandomDelay() { return Math.floor(Math.random() * 601) - 300; }

function resetGame() {
    let timeInput = document.getElementById('start-time-input').value;
    if(!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeInput)) { alert("Format jam tidak valid! Gunakan HH:MM"); return; }
    
    gameTime = timeToSeconds(timeInput + ":00");
    trains.forEach(t => { if(t.element) t.element.remove(); });
    trains = []; incomingCalls = []; clearedDepartures.clear(); updateCommUI();
    document.getElementById('schedule-body').innerHTML = ''; document.getElementById('log-content').innerHTML = '';
    
    lastEOutBlkTime = -9999;
    lastWOutBlkTime = -9999;

    TIMETABLE.forEach(t => { 
        let baseTime = timeToSeconds(t.time);
        t.offsetOffset = getRandomDelay(); t.spawnTime = baseTime + t.offsetOffset; 
        t.hasSpawned = (t.spawnTime < gameTime); t.hasCalled = (t.spawnTime < gameTime); 
        t.isClearedToEnter = !t.isCommuter; 
    });
    
    for(let id in SIGNALS) SIGNALS[id] = 'RED';
    switches = { 'SW_E_3': true, 'SW_W_3': true, 'SW_W_2': true, 'SW_E_2': true, 'SW_W_2_CROSS': true, 'SW_E_3_CROSS': true };
    
    initMap(); addLog(`SYS: SIMULASI DI-RESET! Dimulai dari jam ${timeInput}`); 
    closeModal('settings-modal'); populateBottomSchedule(); 
}

// ==========================================
// 3. JADWAL & DATABASE KA
// ==========================================
const CONFIG_SIMULASI = { SPEED_NORMAL: 19.0, SPEED_CAUTION: 13.0, SPEED_SWITCH: 7.0, BOARDING_TIME: 60 };
let TIMETABLE = []; let gameTime = 5 * 3600; let timeAccumulator = 0; let trains = [];

// ==========================================
// 4. KONFIGURASI PETA 
// ==========================================
const NODES = {
    'W_OUT_BLK_END': {x: 5, y: 10},     
    'W_OUT_BLK_SIG': {x: 20, y: 10},    
    'W_OUT_BLK_APP': {x: 35, y: 10},    
    'W_OUT_BLK_START': {x: 38, y: 14},  

    'W_FAR_IN': {x: 5, y: 16},         
    'BLK_W_IN_2': {x: 20, y: 16},      
    'W_FAR_END': {x: 35, y: 16},       
    'W_FAR_DROP': {x: 38, y: 20},      

    'E_FAR_IN': {x: 95, y: 10},        
    'BLK_E_IN_3': {x: 80, y: 10},      
    'E_FAR_END': {x: 65, y: 10},       
    'E_FAR_DROP': {x: 62, y: 14},      

    'E_OUT_BLK_END': {x: 95, y: 16},    
    'E_OUT_BLK_SIG': {x: 80, y: 16},    
    'E_OUT_BLK_APP': {x: 65, y: 16},    
    'E_OUT_BLK_START': {x: 62, y: 20},  

    'W_STATION_END': {x: 4, y: 46},    
    'W_STATION_OUT_J3': {x: 8, y: 50}, 
    'SW_W_3_CROSS': {x: 16, y: 50}, 
    'SW_W_3': {x: 30, y: 50, type: 'switch'}, 

    'W_STATION_START': {x: 4, y: 60},  
    'W_STATION_IN_J2': {x: 8, y: 64},  
    'SIG_W_IN_2': {x: 12, y: 64}, 
    'SW_W_2_CROSS': {x: 22, y: 64}, 
    'SW_W_2': {x: 30, y: 64, type: 'switch'}, 

    'P_4_W': {x: 36, y: 34, isPlatform: true}, 'P_4_E': {x: 64, y: 34}, 
    'P_3_W': {x: 36, y: 50, isPlatform: true}, 'P_3_E': {x: 64, y: 50}, 
    'P_2_W': {x: 36, y: 64}, 'P_2_E': {x: 64, y: 64, isPlatform: true}, 
    'P_1_W': {x: 36, y: 80}, 'P_1_E': {x: 64, y: 80, isPlatform: true}, 

    'E_STATION_START': {x: 96, y: 46}, 
    'E_STATION_IN_J3': {x: 92, y: 50}, 
    'SIG_E_IN_3': {x: 88, y: 50}, 
    'SW_E_3_CROSS': {x: 84, y: 50, type: 'switch'}, 
    'SW_E_3': {x: 70, y: 50, type: 'switch'}, 

    'E_STATION_END': {x: 96, y: 60},   
    'E_STATION_OUT_J2': {x: 92, y: 64}, 
    'SW_E_2_CROSS': {x: 78, y: 64}, 
    'SW_E_2': {x: 70, y: 64, type: 'switch'}
};

let TRACKS = [
    {id: 't2_app', from: 'W_FAR_IN', to: 'BLK_W_IN_2', dir: 'east'},
    {id: 't2_blk', from: 'BLK_W_IN_2', to: 'W_FAR_END', dir: 'east'},
    {id: 't2_drop', from: 'W_FAR_END', to: 'W_FAR_DROP', dir: 'east'},
    {id: 't2_teleport', from: 'W_FAR_DROP', to: 'W_STATION_START', dir: 'east', isTeleport: true},

    {id: 't3_out_teleport', from: 'W_STATION_END', to: 'W_OUT_BLK_START', dir: 'west', isTeleport: true},
    {id: 't3_out_blk_drop', from: 'W_OUT_BLK_START', to: 'W_OUT_BLK_APP', dir: 'west'},
    {id: 't3_out_blk_app', from: 'W_OUT_BLK_APP', to: 'W_OUT_BLK_SIG', dir: 'west'},
    {id: 't3_out_blk_sig', from: 'W_OUT_BLK_SIG', to: 'W_OUT_BLK_END', dir: 'west'},

    {id: 't3_app', from: 'E_FAR_IN', to: 'BLK_E_IN_3', dir: 'west'},
    {id: 't3_blk', from: 'BLK_E_IN_3', to: 'E_FAR_END', dir: 'west'},
    {id: 't3_drop', from: 'E_FAR_END', to: 'E_FAR_DROP', dir: 'west'},
    {id: 't3_teleport', from: 'E_FAR_DROP', to: 'E_STATION_START', dir: 'west', isTeleport: true},

    {id: 't2_out_teleport', from: 'E_STATION_END', to: 'E_OUT_BLK_START', dir: 'east', isTeleport: true},
    {id: 't2_out_blk_drop', from: 'E_OUT_BLK_START', to: 'E_OUT_BLK_APP', dir: 'east'},
    {id: 't2_out_blk_app', from: 'E_OUT_BLK_APP', to: 'E_OUT_BLK_SIG', dir: 'east'},
    {id: 't2_out_blk_sig', from: 'E_OUT_BLK_SIG', to: 'E_OUT_BLK_END', dir: 'east'},

    {id: 't3_in_app', from: 'E_STATION_START', to: 'E_STATION_IN_J3', dir: 'west'},
    {id: 't3_in_sig', from: 'E_STATION_IN_J3', to: 'SIG_E_IN_3', dir: 'west'},
    {id: 't3_in_1', from: 'SIG_E_IN_3', to: 'SW_E_3_CROSS', dir: 'west'},
    {id: 't3_in_2', from: 'SW_E_3_CROSS', to: 'SW_E_3', type: 'straight', dir: 'west'},
    {id: 't3_main', from: 'SW_E_3', to: 'P_3_E', type: 'straight', dir: 'west'},
    {id: 'p_3', from: 'P_3_E', to: 'P_3_W', dir: 'west'},
    {id: 't3_out_1', from: 'P_3_W', to: 'SW_W_3', type: 'straight', dir: 'west'},
    {id: 't3_out_2', from: 'SW_W_3', to: 'SW_W_3_CROSS', type: 'straight', dir: 'west'}, 
    {id: 't3_out_end', from: 'SW_W_3_CROSS', to: 'W_STATION_OUT_J3', dir: 'west'}, 
    {id: 't3_exit', from: 'W_STATION_OUT_J3', to: 'W_STATION_END', dir: 'west'}, 

    {id: 't2_in_app', from: 'W_STATION_START', to: 'W_STATION_IN_J2', dir: 'east'},
    {id: 't2_in_sig', from: 'W_STATION_IN_J2', to: 'SIG_W_IN_2', dir: 'east'},
    {id: 't2_in_1', from: 'SIG_W_IN_2', to: 'SW_W_2_CROSS', dir: 'east'},
    {id: 't2_in_2', from: 'SW_W_2_CROSS', to: 'SW_W_2', type: 'straight', dir: 'east'},
    {id: 't2_main', from: 'SW_W_2', to: 'P_2_W', type: 'straight', dir: 'east'},
    {id: 'p_2', from: 'P_2_W', to: 'P_2_E', dir: 'east'},
    {id: 't2_out_1', from: 'P_2_E', to: 'SW_E_2', type: 'straight', dir: 'east'},
    {id: 't2_out_2', from: 'SW_E_2', to: 'SW_E_2_CROSS', type: 'straight', dir: 'east'}, 
    {id: 't2_out_end', from: 'SW_E_2_CROSS', to: 'E_STATION_OUT_J2', dir: 'east'}, 
    {id: 't2_exit', from: 'E_STATION_OUT_J2', to: 'E_STATION_END', dir: 'east'}, 

    {id: 't4_div',  from: 'SW_E_3', to: 'P_4_E', type: 'diverge', dir: 'west'},
    {id: 'p_4', from: 'P_4_E', to: 'P_4_W', dir: 'west'},
    {id: 't4_out', from: 'P_4_W', to: 'SW_W_3', type: 'diverge', dir: 'west'},

    {id: 't1_div',  from: 'SW_W_2', to: 'P_1_W', type: 'diverge', dir: 'east'},
    {id: 'p_1', from: 'P_1_W', to: 'P_1_E', dir: 'east'},
    {id: 't1_out', from: 'P_1_E', to: 'SW_E_2', type: 'diverge', dir: 'east'},

    // WESEL SILANG
    {id: 'x_e_32', from: 'SW_E_3_CROSS', to: 'SW_E_2_CROSS', type: 'diverge', dir: 'west'}, 
    {id: 'x_w_23', from: 'SW_W_2_CROSS', to: 'SW_W_3_CROSS', type: 'diverge', dir: 'west'}, 

    // CONTRAFLOW
    {id: 'cw_t2_in', from: 'SW_E_2_CROSS', to: 'SW_E_2', dir: 'west'}, 
    {id: 'cw_t2_main', from: 'SW_E_2', to: 'P_2_E', type: 'straight', dir: 'west'},
    {id: 'cw_t1_div', from: 'SW_E_2', to: 'P_1_E', type: 'diverge', dir: 'west'},
    {id: 'cw_p_2', from: 'P_2_E', to: 'P_2_W', dir: 'west'},
    {id: 'cw_p_1', from: 'P_1_E', to: 'P_1_W', dir: 'west'},
    {id: 'cw_t2_out', from: 'P_2_W', to: 'SW_W_2', type: 'straight', dir: 'west'},
    {id: 'cw_t1_out', from: 'P_1_W', to: 'SW_W_2', type: 'diverge', dir: 'west'},
    {id: 'cw_t2_mid', from: 'SW_W_2', to: 'SW_W_2_CROSS', dir: 'west'} 
];

const SVG_LABELS = [
    {x: 5, y: 7, text: "← J3 (KE KLENDER)"},
    {x: 5, y: 13, text: "J2 (DARI KLENDER) →"},
    
    {x: 95, y: 7, text: "← J3 (DARI KRANJI)", anchor: "end"},
    {x: 95, y: 13, text: "J2 (KE KRANJI) →", anchor: "end"},

    {x: 4, y: 42, text: "J3 OUT ↰"},
    {x: 4, y: 68, text: "J2 IN ↴"},
    {x: 96, y: 42, text: "↱ J3 IN", anchor: "end"},
    {x: 96, y: 68, text: "↳ J2 OUT", anchor: "end"},

    {x: 27, y: 34, text: "J4 (SIDING) ←"}, 
    {x: 27, y: 80, text: "J1 (SIDING) →"}, 
];

let switches = { 
    'SW_E_3': true, 'SW_W_3': true, 'SW_W_2': true, 'SW_E_2': true,
    'SW_W_2_CROSS': true, 'SW_E_3_CROSS': true 
};
let SIGNALS = { 'BLK_E_IN_3': 'GREEN', 'SIG_E_IN_3': 'RED', 'P_3_W': 'RED', 'P_4_W': 'RED', 'BLK_W_IN_2': 'GREEN', 'SIG_W_IN_2': 'RED', 'P_2_E': 'RED', 'P_1_E': 'RED', 'E_OUT_BLK_SIG': 'GREEN', 'W_OUT_BLK_SIG': 'GREEN' };
const svgObj = document.getElementById('track-layer'); const entitiesObj = document.getElementById('entities');

function initMap() {
    svgObj.innerHTML = ''; entitiesObj.innerHTML = ''; 
    let pTop = document.createElementNS("http://www.w3.org/2000/svg", "rect"); 
    pTop.setAttribute("x", "38%"); pTop.setAttribute("y", "40.5%"); 
    pTop.setAttribute("width", "24%"); pTop.setAttribute("height", "3.5%"); 
    pTop.setAttribute("rx", "4"); pTop.setAttribute("fill", "#2a2b30"); pTop.setAttribute("stroke", "#444"); 
    svgObj.appendChild(pTop);
    
    let pBot = document.createElementNS("http://www.w3.org/2000/svg", "rect"); 
    pBot.setAttribute("x", "38%"); pBot.setAttribute("y", "70%"); 
    pBot.setAttribute("width", "24%"); pBot.setAttribute("height", "3.5%"); 
    pBot.setAttribute("rx", "4"); pBot.setAttribute("fill", "#2a2b30"); pBot.setAttribute("stroke", "#444"); 
    svgObj.appendChild(pBot);

    SVG_LABELS.forEach(lbl => { 
        let txt = document.createElementNS("http://www.w3.org/2000/svg", "text"); 
        txt.setAttribute("x", lbl.x + "%"); txt.setAttribute("y", lbl.y + "%"); 
        txt.setAttribute("class", "svg-label"); 
        if(lbl.anchor) txt.setAttribute("text-anchor", lbl.anchor);
        txt.textContent = lbl.text; 
        svgObj.appendChild(txt); 
    });

    let p1 = document.createElementNS("http://www.w3.org/2000/svg", "text"); 
    p1.setAttribute("x", "50%"); p1.setAttribute("y", "42.5%"); 
    p1.setAttribute("class", "svg-platform"); p1.textContent = "[ PERON 3 & 4 ]"; svgObj.appendChild(p1);
    
    let p2 = document.createElementNS("http://www.w3.org/2000/svg", "text"); 
    p2.setAttribute("x", "50%"); p2.setAttribute("y", "72%"); 
    p2.setAttribute("class", "svg-platform"); p2.textContent = "[ PERON 1 & 2 ]"; svgObj.appendChild(p2);

    TRACKS.forEach(tr => {
        if (!tr.id.startsWith('c') && !tr.isTeleport) {
            let g = document.createElementNS("http://www.w3.org/2000/svg", "g"); 
            let baseLine = createLine(NODES[tr.from], NODES[tr.to], 'base', `base_${tr.id}`);
            
            if (tr.id === 'x_e_32') { baseLine.style.transition = "opacity 0.2s"; baseLine.style.opacity = switches['SW_E_3_CROSS'] ? '0.15' : '1'; }
            if (tr.id === 'x_w_23') { baseLine.style.transition = "opacity 0.2s"; baseLine.style.opacity = switches['SW_W_2_CROSS'] ? '0.15' : '1'; }
            
            g.appendChild(baseLine); 
            g.appendChild(createLine(NODES[tr.from], NODES[tr.to], 'route-layer', `r_${tr.id}`)); 
            g.appendChild(createLine(NODES[tr.from], NODES[tr.to], 'occupied-layer', `o_${tr.id}`)); 
            svgObj.appendChild(g);
        }
    });

    for (let id in switches) { let btn = document.createElement('div'); btn.className = 'switch-point'; btn.style.left = NODES[id].x + '%'; btn.style.top = NODES[id].y + '%'; btn.onclick = () => toggleSwitch(id); entitiesObj.appendChild(btn); }

    for (let id in SIGNALS) {
        let n = NODES[id]; let housing = document.createElement('div'); housing.className = 'signal-housing'; housing.id = `sig_housing_${id}`;
        if (id.includes('BLK_')) { housing.style.transform = "translate(-50%, -50%) scale(0.85)"; housing.style.cursor = "default"; } else { housing.onclick = () => toggleSignal(id); housing.style.cursor = "pointer"; }
        
        let isBottom = n.y >= 50; 
        let yOffset = isBottom ? 4.5 : -4.5; 
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
    let l = document.createElementNS("http://www.w3.org/2000/svg", "line"); 
    l.setAttribute("x1", n1.x + "%"); l.setAttribute("y1", n1.y + "%"); 
    l.setAttribute("x2", n2.x + "%"); l.setAttribute("y2", n2.y + "%"); 
    l.setAttribute("class", cls); l.id = id; return l;
}

function updateSignalVisual(id) {
    let state = SIGNALS[id]; let rLamp = document.getElementById(`lamp_${id}_r`); let yLamp = document.getElementById(`lamp_${id}_y`); let gLamp = document.getElementById(`lamp_${id}_g`);
    if(rLamp) rLamp.classList.remove('on'); if(yLamp) yLamp.classList.remove('on'); if(gLamp) gLamp.classList.remove('on');
    if (state === 'RED' && rLamp) rLamp.classList.add('on'); else if (state === 'YELLOW' && yLamp) yLamp.classList.add('on'); else if (state === 'GREEN' && gLamp) gLamp.classList.add('on');
}
function isTrackOccupied(trackIdsArray) { return trains.some(t => t.currentTrack && trackIdsArray.includes(t.currentTrack.id)); }

function updateAutomaticSignals() {
    let isT3BlkOccupied = trains.some(t => t.currentTrack && ['t3_blk', 't3_drop', 't3_teleport', 't3_in_app', 't3_in_sig'].includes(t.currentTrack.id)); 
    let blk3Aspect = 'GREEN';
    if (isT3BlkOccupied) blk3Aspect = 'RED'; else if (SIGNALS['SIG_E_IN_3'] === 'RED') blk3Aspect = 'YELLOW'; 
    if (SIGNALS['BLK_E_IN_3'] !== blk3Aspect) { SIGNALS['BLK_E_IN_3'] = blk3Aspect; updateSignalVisual('BLK_E_IN_3'); }

    let isT2BlkOccupied = trains.some(t => t.currentTrack && ['t2_blk', 't2_drop', 't2_teleport', 't2_in_app', 't2_in_sig'].includes(t.currentTrack.id)); 
    let blk2Aspect = 'GREEN';
    if (isT2BlkOccupied) blk2Aspect = 'RED'; else if (SIGNALS['SIG_W_IN_2'] === 'RED') blk2Aspect = 'YELLOW'; 
    if (SIGNALS['BLK_W_IN_2'] !== blk2Aspect) { SIGNALS['BLK_W_IN_2'] = blk2Aspect; updateSignalVisual('BLK_W_IN_2'); }

    let isEOutBlkOccupied = trains.some(t => t.currentTrack && t.currentTrack.id === 't2_out_blk_sig');
    if (isEOutBlkOccupied) {
        lastEOutBlkTime = gameTime;
        if (SIGNALS['E_OUT_BLK_SIG'] !== 'RED') { SIGNALS['E_OUT_BLK_SIG'] = 'RED'; updateSignalVisual('E_OUT_BLK_SIG'); }
    } else {
        let elapsedE = gameTime - lastEOutBlkTime;
        let newEAspect = 'GREEN';
        if (elapsedE < 60) newEAspect = 'RED';
        else if (elapsedE < 120) newEAspect = 'YELLOW';
        if (SIGNALS['E_OUT_BLK_SIG'] !== newEAspect) { SIGNALS['E_OUT_BLK_SIG'] = newEAspect; updateSignalVisual('E_OUT_BLK_SIG'); }
    }

    let isWOutBlkOccupied = trains.some(t => t.currentTrack && t.currentTrack.id === 't3_out_blk_sig');
    if (isWOutBlkOccupied) {
        lastWOutBlkTime = gameTime;
        if (SIGNALS['W_OUT_BLK_SIG'] !== 'RED') { SIGNALS['W_OUT_BLK_SIG'] = 'RED'; updateSignalVisual('W_OUT_BLK_SIG'); }
    } else {
        let elapsedW = gameTime - lastWOutBlkTime;
        let newWAspect = 'GREEN';
        if (elapsedW < 60) newWAspect = 'RED';
        else if (elapsedW < 120) newWAspect = 'YELLOW';
        if (SIGNALS['W_OUT_BLK_SIG'] !== newWAspect) { SIGNALS['W_OUT_BLK_SIG'] = newWAspect; updateSignalVisual('W_OUT_BLK_SIG'); }
    }

    updateRoutesVisual();
}

function toggleSwitch(id) {
    if (id === 'SW_E_3') { if (SIGNALS['SIG_E_IN_3'] !== 'RED' || isTrackOccupied(['t3_in_2', 't3_main', 't4_div'])) { addLog("SYS MENOLAK: Sinyal sudah aman!"); return; } }
    if (id === 'SW_W_2') { if (SIGNALS['SIG_W_IN_2'] !== 'RED' || isTrackOccupied(['t2_in_2', 't2_main', 't1_div'])) { addLog("SYS MENOLAK: Sinyal sudah aman!"); return; } }
    
    if (id === 'SW_E_3_CROSS') {
        if (SIGNALS['SIG_E_IN_3'] !== 'RED' || SIGNALS['P_2_E'] !== 'RED' || SIGNALS['P_1_E'] !== 'RED') { addLog("SYS MENOLAK: Sinyal terkait sedang terbuka!"); return; }
        if (isTrackOccupied(['t3_in_1', 't3_in_2', 'x_e_32', 't2_out_2', 't2_out_end', 't2_exit'])) return;
    }
    if (id === 'SW_W_2_CROSS') {
        if (SIGNALS['SIG_W_IN_2'] !== 'RED' || SIGNALS['P_3_W'] !== 'RED' || SIGNALS['P_4_W'] !== 'RED') { addLog("SYS MENOLAK: Sinyal terkait sedang terbuka!"); return; }
        if (isTrackOccupied(['t2_in_1', 't2_in_2', 'x_w_23', 't3_out_2', 't3_out_end', 't3_exit'])) return;
    }

    switches[id] = !switches[id]; updateRoutesVisual();
}

function toggleSignal(id) {
    if (SIGNALS[id] !== 'RED') { SIGNALS[id] = 'RED'; updateSignalVisual(id); updateRoutesVisual(); return; }
    
    if (['P_1_E', 'P_2_E', 'P_3_W', 'P_4_W'].includes(id)) {
        let trainAtSignal = trains.find(tr => tr.currentTrack && tr.currentTrack.to === id && tr.percent >= 98);
        if (trainAtSignal && !clearedDepartures.has(trainAtSignal.noKA)) {
            addLog(`<span style="color:#ff3333;">SYS MENOLAK: Anda belum meminta izin berangkat ke stasiun tujuan untuk KA ${trainAtSignal.noKA}!</span>`);
            return; 
        }
    }
    
    let aspect = 'GREEN'; 
    if (id === 'SIG_E_IN_3') { 
        if (!switches['SW_E_3_CROSS']) { addLog("SYS MENOLAK: Wesel silang Timur memotong rute lurus!"); return; } 
        if (switches['SW_E_3'] === true && isTrackOccupied(['t3_main', 'p_3'])) { addLog("SYS MENOLAK: Jalur 3 diduduki!"); return; } 
        if (switches['SW_E_3'] === false && isTrackOccupied(['t4_div', 'p_4'])) { addLog("SYS MENOLAK: Jalur 4 diduduki!"); return; } 
        aspect = 'YELLOW'; 
    }
    else if (id === 'SIG_W_IN_2') { 
        if (!switches['SW_W_2_CROSS']) { addLog("SYS MENOLAK: Wesel silang Barat memotong rute lurus!"); return; } 
        if (switches['SW_W_2'] === true && isTrackOccupied(['t2_main', 'p_2'])) { addLog("SYS MENOLAK: Jalur 2 diduduki!"); return; } 
        if (switches['SW_W_2'] === false && isTrackOccupied(['t1_div', 'p_1'])) { addLog("SYS MENOLAK: Jalur 1 diduduki!"); return; } 
        aspect = 'YELLOW'; 
    }
    else if (id === 'P_3_W' || id === 'P_4_W') { 
        if (id === 'P_3_W' && !switches['SW_W_3']) { addLog("SYS MENOLAK: Wesel J3-J4 salah arah!"); return; } 
        if (id === 'P_4_W' && switches['SW_W_3']) { addLog("SYS MENOLAK: Wesel J3-J4 salah arah!"); return; } 
        if (!switches['SW_W_2_CROSS']) { addLog("SYS MENOLAK: Wesel silang memotong rute keluar!"); return; } 
        if (isTrackOccupied(['t3_out_1', 't4_out', 't3_out_2', 't3_out_end', 't3_exit', 't3_out_teleport', 't3_out_blk_drop', 't3_out_blk_app'])) {
            addLog("SYS MENOLAK: Petak jalan ke Klender Baru masih diduduki (KA belum melewati Sinyal Muka/Blok)!"); return;
        }
        aspect = (SIGNALS['W_OUT_BLK_SIG'] === 'RED') ? 'YELLOW' : 'GREEN'; 
    }
    else if (id === 'P_2_E' || id === 'P_1_E') { 
        if (id === 'P_2_E' && !switches['SW_E_2']) { addLog("SYS MENOLAK: Wesel J2-J1 salah arah!"); return; } 
        if (id === 'P_1_E' && switches['SW_E_2']) { addLog("SYS MENOLAK: Wesel J2-J1 salah arah!"); return; } 
        if (!switches['SW_E_3_CROSS']) { addLog("SYS MENOLAK: Wesel silang memotong rute keluar!"); return; } 
        if (isTrackOccupied(['t2_out_1', 't1_out', 't2_out_2', 't2_out_end', 't2_exit', 't2_out_teleport', 't2_out_blk_drop', 't2_out_blk_app'])) {
            addLog("SYS MENOLAK: Petak jalan ke Kranji masih diduduki (KA belum melewati Sinyal Muka/Blok)!"); return;
        }
        aspect = (SIGNALS['E_OUT_BLK_SIG'] === 'RED') ? 'YELLOW' : 'GREEN'; 
    }
    
    SIGNALS[id] = aspect; updateSignalVisual(id); updateRoutesVisual();
}

function updateRoutesVisual() {
    document.querySelectorAll('.route-layer').forEach(e => e.classList.remove('active'));
    
    let wMasukE3 = switches['SW_E_3'] ? 't3_main' : 't4_div'; let el1 = document.getElementById(`r_${wMasukE3}`); if(el1) el1.classList.add('active');
    let wMasukW2 = switches['SW_W_2'] ? 't2_main' : 't1_div'; let el2 = document.getElementById(`r_${wMasukW2}`); if(el2) el2.classList.add('active');
    let wKeluarW3 = switches['SW_W_3'] ? 't3_out_1' : 't4_out'; let el3 = document.getElementById(`r_${wKeluarW3}`); if(el3) el3.classList.add('active');
    let wKeluarE2 = switches['SW_E_2'] ? 't2_out_1' : 't1_out'; let el4 = document.getElementById(`r_${wKeluarE2}`); if(el4) el4.classList.add('active');

    if(switches['SW_E_3_CROSS']) { document.getElementById('r_t3_in_2').classList.add('active'); }
    if(switches['SW_W_2_CROSS']) { document.getElementById('r_t2_in_2').classList.add('active'); }

    let cEBase = document.getElementById('base_x_e_32'); if(cEBase) cEBase.style.opacity = switches['SW_E_3_CROSS'] ? '0.15' : '1';
    let cWBase = document.getElementById('base_x_w_23'); if(cWBase) cWBase.style.opacity = switches['SW_W_2_CROSS'] ? '0.15' : '1';

    if (!switches['SW_W_2_CROSS']) { document.getElementById('r_x_w_23').classList.add('active'); } 
    if (!switches['SW_E_3_CROSS']) { document.getElementById('r_x_e_32').classList.add('active'); } 

    if (SIGNALS['BLK_E_IN_3'] !== 'RED') { 
        let e = document.getElementById('r_t3_blk'); if(e) e.classList.add('active'); 
        let d = document.getElementById('r_t3_drop'); if(d) d.classList.add('active');
    }
    if (SIGNALS['BLK_W_IN_2'] !== 'RED') { 
        let e = document.getElementById('r_t2_blk'); if(e) e.classList.add('active'); 
        let d = document.getElementById('r_t2_drop'); if(d) d.classList.add('active');
    }
    
    if (SIGNALS['E_OUT_BLK_SIG'] !== 'RED') { let el = document.getElementById('r_t2_out_blk_sig'); if(el) el.classList.add('active'); }
    if (SIGNALS['W_OUT_BLK_SIG'] !== 'RED') { let el = document.getElementById('r_t3_out_blk_sig'); if(el) el.classList.add('active'); }
    
    let isEastClear = (SIGNALS['P_2_E'] !== 'RED' || SIGNALS['P_1_E'] !== 'RED');
    if (isEastClear) { 
        let e1 = document.getElementById('r_t2_out_2'); if(e1) e1.classList.add('active');
        let e2 = document.getElementById('r_t2_out_end'); if(e2) e2.classList.add('active');
        let e3 = document.getElementById('r_t2_exit'); if(e3) e3.classList.add('active');
        
        let el = document.getElementById('r_t2_out_blk_app'); if(el) el.classList.add('active'); 
        let d = document.getElementById('r_t2_out_blk_drop'); if(d) d.classList.add('active');
    }
    
    let isWestClear = (SIGNALS['P_3_W'] !== 'RED' || SIGNALS['P_4_W'] !== 'RED');
    if (isWestClear) { 
        let w1 = document.getElementById('r_t3_out_2'); if(w1) w1.classList.add('active');
        let w2 = document.getElementById('r_t3_out_end'); if(w2) w2.classList.add('active');
        let w3 = document.getElementById('r_t3_exit'); if(w3) w3.classList.add('active');
        
        let el = document.getElementById('r_t3_out_blk_app'); if(el) el.classList.add('active'); 
        let d = document.getElementById('r_t3_out_blk_drop'); if(d) d.classList.add('active');
    }

    if (SIGNALS['SIG_E_IN_3'] !== 'RED') { 
        document.getElementById('r_t3_in_app').classList.add('active'); 
        document.getElementById('r_t3_in_sig').classList.add('active'); 
        document.getElementById('r_t3_in_1').classList.add('active'); 
    }
    if (SIGNALS['SIG_W_IN_2'] !== 'RED') { 
        document.getElementById('r_t2_in_app').classList.add('active'); 
        document.getElementById('r_t2_in_sig').classList.add('active'); 
        document.getElementById('r_t2_in_1').classList.add('active'); 
    }
}

// === CLASS KERETA ===
class Train {
    constructor(noKA, namaKA, startNode, destName, isCommuter = true) {
        this.noKA = noKA; this.namaKA = namaKA; this.currentNode = startNode; this.destName = destName;
        this.isCommuter = isCommuter; this.percent = 0; this.baseSpeed = 0; this.currentTrack = null;
        this.state = 'RUNNING'; this.hasDocked = false; this.lastAspect = 'GREEN'; this.dockTimer = 0; 
        
        let noAngka = parseInt(this.noKA.replace(/\D/g, ''));
        this.isEven = (noAngka % 2 === 0);

        this.waitTimer = 0; 
        this.isAlarming = false;
        
        this.contraflowEntryCleared = false; 
        this.emergencyCleared = false;       

        this.element = document.createElement('div'); 
        this.element.className = 'train-entity'; 
        this.element.innerText = noKA; 
        this.element.onclick = () => openMasinisModal(this);

        let entLayer = document.getElementById('entities'); if(entLayer) entLayer.appendChild(this.element);
        this.findNextTrack(); this.updateTable();
    }

    findNextTrack() {
        let myDir = this.isEven ? 'east' : 'west'; 
        let candidates = TRACKS.filter(t => t.from === this.currentNode && t.dir === myDir);
        
        if (candidates.length === 0) { this.despawn(); return; }
        
        let chosenTrack = null;
        
        // Jika di wesel keluar (trailing point) hanya ada 1 jalur terusan, langsung masuk.
        if (candidates.length === 1) {
            chosenTrack = candidates[0];
        } 
        // Jika di wesel masuk (facing point) ada cabang, barulah ikuti arah wesel.
        else if (switches.hasOwnProperty(this.currentNode)) {
            let targetType = switches[this.currentNode] ? 'straight' : 'diverge'; 
            chosenTrack = candidates.find(t => t.type === targetType);
        } else {
            chosenTrack = candidates[0];
        }
        
        if (chosenTrack) { 
            this.currentTrack = chosenTrack; 
            this.percent = 0; 
            this.hasDocked = false; 
            
            // Pemulihan otomatis jika sebelumnya sempat tertahan wesel salah arah
            if (this.state === 'ERROR') this.state = 'RUNNING'; 
            
            if (!this.currentTrack.isTeleport) {
                let visualId = this.currentTrack.id.replace('cw_', '').replace('ce_', '');
                let oLine = document.getElementById(`o_${visualId}`); if(oLine) oLine.classList.add('active'); 
            }
        } 
        else { 
            // SAFETY FIX: Bekukan kereta jika wesel masuk salah arah (persen tidak akan tembus > 100%)
            this.baseSpeed = 0; 
            this.state = 'ERROR'; 
            this.updateTable("TERTAHAN (WESEL SALAH ARAH)"); 
        }
    }

    update(dt) {
        if (!this.currentTrack) return;

        let n1_ini = NODES[this.currentTrack.from], n2_ini = NODES[this.currentTrack.to];
        this.element.style.left = (n1_ini.x + (n2_ini.x - n1_ini.x) * (this.percent / 100)) + '%';
        this.element.style.top = (n1_ini.y + (n2_ini.y - n1_ini.y) * (this.percent / 100)) + '%';

        let scheduleObj = TIMETABLE.find(x => x.noKA === this.noKA);
        if (scheduleObj && scheduleObj.isClearedToEnter === false) {
            this.baseSpeed = 0; this.updateTable("MENUNGGU BALASAN TELEPON"); return; 
        }

        if (this.state === 'DOCKED') { 
            this.dockTimer -= dt; 
            if (this.dockTimer <= 0) { this.state = 'RUNNING'; this.element.classList.remove('train-docked'); this.updateTable("MENUNGGU SINYAL KELUAR"); } 
            return; 
        }

        // --- LOGIKA KECEPATAN (KAJJ & COMMUTER, COMPENSATOR, PENGEREMAN) ---
        if (this.state === 'RUNNING') {
            
            // 1. Tentukan Kecepatan Dasar Berdasarkan Jenis Kereta
            let speedCfgNormal = this.isCommuter ? CONFIG_SIMULASI.SPEED_NORMAL : (CONFIG_SIMULASI.SPEED_NORMAL * 1.5);
            let speedCfgCaution = this.isCommuter ? CONFIG_SIMULASI.SPEED_CAUTION : (CONFIG_SIMULASI.SPEED_CAUTION * 1.4);
            let speedCfgSwitch = this.isCommuter ? CONFIG_SIMULASI.SPEED_SWITCH : (CONFIG_SIMULASI.SPEED_SWITCH * 1.7); 

            // 2. Kompensator Jarak Visual
            let trackLength = Math.sqrt(Math.pow(n2_ini.x - n1_ini.x, 2) + Math.pow(n2_ini.y - n1_ini.y, 2));
            let visualMultiplier = 18 / (trackLength || 18); 
            
            let targetSpeed = speedCfgNormal;
            let statusStr = "BERJALAN (S5)";

            // 3. Cek Kondisi Wesel & Sinyal
            if (this.currentTrack.type === 'diverge' || this.currentTrack.type === 'crossover') { 
                targetSpeed = speedCfgSwitch; 
                statusStr = "WESEL BELOK (S6)";
            } else if (this.lastAspect === 'YELLOW') { 
                targetSpeed = speedCfgCaution; 
                statusStr = "HATI-HATI (S6)";
            }

            // --- FIX: Status S6 Sepur Salah & Kecepatan ---
            // Cek apakah kereta sudah kembali ke jalur utama ke arah luar (Outbound)
            let isOutboundTrack = ['t3_out_end', 't3_exit', 't3_out_teleport', 't3_out_blk_drop', 't3_out_blk_app', 't3_out_blk_sig', 
                                   't2_out_end', 't2_exit', 't2_out_teleport', 't2_out_blk_drop', 't2_out_blk_app', 't2_out_blk_sig'].includes(this.currentTrack.id);
            
            // Jika masuk jalur salah dan belum mencapai rute keluar normal, tetapkan status Sepur Salah
            if (this.contraflowEntryCleared && !isOutboundTrack) {
                targetSpeed = speedCfgSwitch; 
                statusStr = "SEPUR SALAH (S6)";
            }

            // Eksekusi kecepatan
            this.baseSpeed = targetSpeed * visualMultiplier;
            this.updateTable(statusStr);

            // 4. Pengereman Dinamis (Hanya pengereman fisik, teks indikator UI dihapus agar sesuai status di atas)
            const exitNodes = ['P_1_E', 'P_2_E', 'P_3_W', 'P_4_W'];
            if (exitNodes.includes(this.currentTrack.to)) {
                let nextSignal = SIGNALS[this.currentTrack.to];
                if (this.isCommuter || nextSignal === 'RED') {
                    if (this.percent > 40) {
                        let brakeRatio = 1 - ((this.percent - 40) / 60); 
                        let minSpeed = 3.5 * visualMultiplier; 
                        this.baseSpeed = minSpeed + ((this.baseSpeed - minSpeed) * brakeRatio);
                    }
                }
            }
        }

        let nextPercent = this.percent + (this.baseSpeed * dt);
        let nextSignal = SIGNALS[this.currentTrack.to]; 
        let isRedSignal = (nextSignal && nextSignal === 'RED');

        // Abaikan sinyal yang menghadap ke arah berlawanan saat contraflow!
        if (!this.isEven && (this.currentTrack.to === 'P_1_E' || this.currentTrack.to === 'P_2_E')) isRedSignal = false;
        if (this.isEven && (this.currentTrack.to === 'P_3_W' || this.currentTrack.to === 'P_4_W')) isRedSignal = false;

        let weselConflict = false;
        let contraflowConflict = false;
        
        // Pengecekan Wesel Normal (Trailing Point)
        const trailingTracks = ['t3_out_1', 't4_out', 't2_out_1', 't1_out', 'cw_t2_out', 'cw_t1_out'];
        
        if (trailingTracks.includes(this.currentTrack.id) && switches.hasOwnProperty(this.currentTrack.to)) { 
            let isNormal = switches[this.currentTrack.to]; 
            if (this.currentTrack.type === 'straight' && !isNormal) weselConflict = true; 
            if (this.currentTrack.type === 'diverge' && isNormal) weselConflict = true; 
        }

        // Proteksi Ekstra Jalur Contraflow (Sepur Salah)
        // Memastikan rute aman HANYA SAAT kereta sudah berada di peron dan mau berangkat
        let isDepartingContraflowW = ['P_1_W', 'P_2_W', 'SW_W_2', 'SW_W_2_CROSS'].includes(this.currentTrack.to);
        if (!this.isEven && isDepartingContraflowW && this.currentTrack.id.startsWith('cw_')) {
            let w2Conflict = false;
            if (this.currentTrack.to === 'P_1_W' || this.currentTrack.id === 'cw_t1_out') {
                if (switches['SW_W_2'] === true) w2Conflict = true; 
            } else if (this.currentTrack.to === 'P_2_W' || this.currentTrack.id === 'cw_t2_out') {
                if (switches['SW_W_2'] === false) w2Conflict = true; 
            }
            let wCrossConflict = (switches['SW_W_2_CROSS'] === true); 
            if (w2Conflict || wCrossConflict) contraflowConflict = true;
        }

        let isDepartingContraflowE = ['P_3_E', 'P_4_E', 'SW_E_3', 'SW_E_3_CROSS'].includes(this.currentTrack.to);
        if (this.isEven && isDepartingContraflowE && this.currentTrack.id.startsWith('ce_')) {
            let e3Conflict = false;
            if (this.currentTrack.to === 'P_4_E' || this.currentTrack.id === 'ce_t4_out') {
                if (switches['SW_E_3'] === true) e3Conflict = true; 
            } else if (this.currentTrack.to === 'P_3_E' || this.currentTrack.id === 'ce_t3_out') {
                if (switches['SW_E_3'] === false) e3Conflict = true; 
            }
            let eCrossConflict = (switches['SW_E_3_CROSS'] === true); 
            if (e3Conflict || eCrossConflict) contraflowConflict = true;
        }

        if (contraflowConflict) weselConflict = true;

        // Menentukan ujung peron tempat lokomotif harus berhenti secara dinamis berdasarkan arah
        let isPlatformEnd = false;
        if (this.isEven) {
            isPlatformEnd = ['P_1_E', 'P_2_E', 'P_3_E', 'P_4_E'].includes(this.currentTrack.to);
        } else {
            isPlatformEnd = ['P_1_W', 'P_2_W', 'P_3_W', 'P_4_W'].includes(this.currentTrack.to);
        }

        if (this.isCommuter && isPlatformEnd && nextPercent >= 98 && this.state === 'RUNNING' && !this.hasDocked) {
            this.state = 'DOCKED'; this.hasDocked = true; this.percent = 98; this.dockTimer = CONFIG_SIMULASI.BOARDING_TIME; 
            this.element.classList.add('train-docked'); this.updateTable("BOARDING PENUMPANG");
            let n1 = NODES[this.currentTrack.from], n2 = NODES[this.currentTrack.to]; this.element.style.left = (n1.x + (n2.x - n1.x) * (this.percent / 100)) + '%'; this.element.style.top = (n1.y + (n2.y - n1.y) * (this.percent / 100)) + '%'; return;
        }

        let isAtEntrySignal = (this.currentTrack.to === 'SIG_E_IN_3' || this.currentTrack.to === 'SIG_W_IN_2');
        let wantsContraflow = false;
        if (this.currentTrack.to === 'SIG_E_IN_3' && !switches['SW_E_3_CROSS']) wantsContraflow = true;
        if (this.currentTrack.to === 'SIG_W_IN_2' && !switches['SW_W_2_CROSS']) wantsContraflow = true;

        let isWrongWayDeparture = false;
        if (!this.isEven && (this.currentTrack.to === 'P_2_W' || this.currentTrack.to === 'P_1_W')) isWrongWayDeparture = true;
        if (this.isEven && (this.currentTrack.to === 'P_3_E' || this.currentTrack.to === 'P_4_E')) isWrongWayDeparture = true;

        if (nextPercent >= 98 && isWrongWayDeparture && !this.emergencyCleared) {
            this.percent = 98; this.updateTable("TUNGGU IZIN (S6)");
            this.waitTimer += dt;
            if (this.waitTimer > 5 && !this.isAlarming) { 
                this.isAlarming = true; this.element.classList.add('train-alarm'); playMasinisAlarm(); 
                addLog(`<span style="color:#ff8800; font-weight:bold;">[RADIO MASINIS] KA ${this.noKA} meminta Izin Darurat Langgar Sinyal Keluar!</span>`);
                speakVoice(`PPKA Cakung. Dari Masinis KA ${this.noKA}. Meminta izin berangkat darurat jalur kiri. Ganti.`, 500);
            }
            let n1 = NODES[this.currentTrack.from], n2 = NODES[this.currentTrack.to]; this.element.style.left = (n1.x + (n2.x - n1.x) * (this.percent / 100)) + '%'; this.element.style.top = (n1.y + (n2.y - n1.y) * (this.percent / 100)) + '%'; return; 
        }

        if (nextPercent >= 98 && (isRedSignal || weselConflict)) {
            if (isAtEntrySignal && wantsContraflow && this.contraflowEntryCleared) {
                this.baseSpeed = CONFIG_SIMULASI.SPEED_SWITCH; 
                this.updateTable("MASUK SEPUR SALAH (BLB)");
            } else {
                this.percent = 98; 
                if (isAtEntrySignal && this.contraflowEntryCleared && !wantsContraflow) {
                    this.updateTable("TUNGGU WESEL SILANG");
                } else if (isRedSignal) {
                    this.updateTable("BERHENTI (S7)"); 
                } else if (contraflowConflict) {
                    this.updateTable("TERTAHAN (RUTE SALAH)");
                } else if (weselConflict) {
                    this.updateTable("TERTAHAN WESEL KELUAR");
                }
                
                this.waitTimer += dt;
                if (this.waitTimer > 40 && !this.isAlarming) { 
                    this.isAlarming = true; this.element.classList.add('train-alarm'); playMasinisAlarm(); 
                    addLog(`<span style="color:#ff8800; font-weight:bold;">[RADIO MASINIS] KA ${this.noKA} memanggil PPKA. Meminta kepastian jalan!</span>`);
                    speakVoice(`PPKA Cakung. Dari Masinis KA ${this.noKA}. Mohon izin pelayanan jalan. Ganti.`, 500);
                }
                let n1 = NODES[this.currentTrack.from], n2 = NODES[this.currentTrack.to]; this.element.style.left = (n1.x + (n2.x - n1.x) * (this.percent / 100)) + '%'; this.element.style.top = (n1.y + (n2.y - n1.y) * (this.percent / 100)) + '%'; return; 
            }
        }

        if (this.isAlarming && !isRedSignal && !weselConflict && !isWrongWayDeparture) {
            this.isAlarming = false; this.waitTimer = 0; this.element.classList.remove('train-alarm');
        } else if (!this.isAlarming) { if (this.waitTimer > 0) this.waitTimer = 0; }

        if (this.currentTrack.isTeleport) {
            this.percent = 100;
        } else {
            this.percent = nextPercent; 
            let n1 = NODES[this.currentTrack.from], n2 = NODES[this.currentTrack.to];
            this.element.style.left = (n1.x + (n2.x - n1.x) * (this.percent / 100)) + '%';
            this.element.style.top = (n1.y + (n2.y - n1.y) * (this.percent / 100)) + '%';
        }

        if (this.percent >= 100) {
            if (!this.currentTrack.isTeleport) {
                let visualId = this.currentTrack.id.replace('cw_', '').replace('ce_', '');
                let oldLine = document.getElementById(`o_${visualId}`); if(oldLine) oldLine.classList.remove('active');
            }
            
            let passedNode = this.currentTrack.to; 
            if (SIGNALS[passedNode]) this.lastAspect = SIGNALS[passedNode];
            if (isAtEntrySignal && wantsContraflow && this.contraflowEntryCleared) this.lastAspect = 'YELLOW'; 

            if (SIGNALS[passedNode] && !passedNode.includes('BLK_') && SIGNALS[passedNode] !== 'RED') { SIGNALS[passedNode] = 'RED'; updateSignalVisual(passedNode); updateRoutesVisual(); }
            this.currentNode = passedNode; this.findNextTrack();
        }
    }

    despawn() {
        if(this.element) this.element.remove(); trains = trains.filter(t => t !== this);
        let row = document.getElementById(`row-${this.noKA}`); if(row) row.remove();
        if(document.getElementById('panel-keluar').style.display === 'block') { updateOutgoingTrainList(); }
    }

    updateTable(statusStr = "BERJALAN (S5)") {
        let tbody = document.getElementById('schedule-body'); if(!tbody) return;
        let row = document.getElementById(`row-${this.noKA}`);
        
        let badgeClass = "badge-green";
        if(statusStr.includes("S7") || statusStr.includes("TERTAHAN") || statusStr.includes("GAGAL") || statusStr.includes("MENUNGGU") || statusStr.includes("RUTE SALAH")) badgeClass = "badge-red"; 
        else if(statusStr.includes("S6") || statusStr.includes("WESEL") || statusStr.includes("HATI-HATI") || statusStr.includes("SALAH")) badgeClass = "badge-yellow"; 
        else if(statusStr.includes("BOARDING") || statusStr.includes("BLB")) badgeClass = "badge-cyan"; 
        
        let statusHtml = `<span class="badge ${badgeClass}">${statusStr}</span>`;
        
        if (!row) {
            row = document.createElement('tr'); row.id = `row-${this.noKA}`; 
            row.innerHTML = `
                <td style="color:#fff; font-family: monospace; font-size: 14px;">${this.noKA}</td>
                <td style="color:#ccc;">${this.namaKA}</td>
                <td style="color:#aaa;">${this.destName}</td>
                <td class="b-cell" style="color:#ffcc00; font-weight:bold;">BLOK ${this.currentNode}</td>
                <td class="s-cell">${statusHtml}</td>`; 
            tbody.appendChild(row);
        } else {
            let bCell = row.querySelector('.b-cell'); let sCell = row.querySelector('.s-cell');
            if(bCell) bCell.innerText = `BLOK ${this.currentNode}`; 
            if(sCell) sCell.innerHTML = statusHtml;
        }
    }
}

function formatTime(totalSecs) { let h = Math.floor(totalSecs / 3600); let m = Math.floor((totalSecs % 3600) / 60); let s = Math.floor(totalSecs % 60); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function addLog(msg) { let logBox = document.getElementById('log-content'); if(!logBox) return; let div = document.createElement('div'); div.innerHTML = `<span class="log-time">[${formatTime(gameTime)}]</span> ${msg}`; logBox.prepend(div); }

function checkTimetable() {
    TIMETABLE.forEach(t => {
        // 1. PERINGATAN DINI KRL (Telepon masuk 30 detik sebelum tiba)
        if (t.isCommuter && gameTime >= t.spawnTime - 30 && !t.hasCalled) {
            t.hasCalled = true; t.isClearedToEnter = false; 
            let noAngka = parseInt(t.noKA.replace(/\D/g, '')); let isEven = (noAngka % 2 === 0);
            let fromStation = isEven ? "Klender Baru" : "Kranji";
            let voiceMsg = `Stasiun Cakung. KA ${t.noKA}, diberangkatkan menuju stasiun Anda. Mohon dipersiapkan. Ganti.`;
            let logMsg = `KA ${t.noKA} diberangkatkan menuju stasiun Anda. Mohon dipersiapkan.`;
            incomingCalls.push({ id: Date.now() + Math.random(), from: fromStation, noKA: t.noKA, messageLog: logMsg });
            updateCommUI();
            addLog(`<span style="color:#ff5555; font-weight:bold;">[TELEPON] Panggilan masuk dari ${fromStation} untuk KA ${t.noKA}!</span>`);
            playIncomingRing(); speakVoice(`Panggilan masuk dari Stasiun ${fromStation}. ${voiceMsg}`, 1500); 
        }

        // 2. PERINGATAN DINI KAJJ/KLB (Info Radio PK 60 detik sebelum muncul di layar)
        if (!t.isCommuter && gameTime >= t.spawnTime - 60 && !t.hasCalled) {
            t.hasCalled = true; 
            let noAngka = parseInt(t.noKA.replace(/\D/g, '')); let isEven = (noAngka % 2 === 0);
            let fromDirection = isEven ? "Barat (Klender Baru)" : "Timur (Kranji)";
            let expectedJalur = isEven ? "Jalur 2" : "Jalur 3";
            
            addLog(`<span style="color:#ffcc00; font-weight:bold; background: #331a00; padding: 2px 4px; border-radius: 3px;">[INFO PK] PERHATIAN: KA ${t.noKA} (${t.namaKA}) dari arah ${fromDirection} akan melintas langsung di ${expectedJalur} dalam 1 Menit!</span>`);
            
            playRadioClick(); 
            speakVoice(`Info PK. Perhatian Stasiun Cakung. Kereta Api ${t.noKA}, ${t.namaKA}, akan segera melintas langsung dari arah ${fromDirection}. Mohon amankan ${expectedJalur}. Ganti.`, 500);
        }

        // 3. PROSES KEMUNCULAN KERETA (SPAWN)
        if (gameTime >= t.spawnTime && !t.hasSpawned) {
            t.hasSpawned = true; 
            let noAngka = parseInt(t.noKA.replace(/\D/g, '')); let isEven = (noAngka % 2 === 0);
            let autoStartNode = isEven ? "W_FAR_IN" : "E_FAR_IN"; 
            trains.push(new Train(t.noKA, t.namaKA, autoStartNode, t.destName, t.isCommuter));
            
            if (!t.isCommuter) {
                let jalur = isEven ? "2" : "3";
                addLog(`<span style="color:#ff8800; font-weight:bold;">[INFO PK] KA ${t.noKA} (${t.namaKA}) Mendekati Blok Pendekatan Jalur ${jalur}.</span>`);
            }
        }
    });
}

function loadJadwalAndInit() {
    const urlDatabase = typeof API_CONFIG !== 'undefined' && API_CONFIG.GAS_URL ? API_CONFIG.GAS_URL : 'jadwal.json';
    
    fetch(urlDatabase)
        .then(response => { if(!response.ok) throw new Error("File jadwal tidak ditemukan!"); return response.json(); })
        .then(data => {
            TIMETABLE = data;
            TIMETABLE.forEach(t => { 
                let baseTime = timeToSeconds(t.time);
                t.offsetOffset = getRandomDelay(); t.spawnTime = baseTime + t.offsetOffset; 
                t.hasSpawned = false; t.hasCalled = false; t.isClearedToEnter = !t.isCommuter; 
            });
            initMap();
            
            const workerBlob = new Blob([` let lastTime = Date.now(); setInterval(() => { let now = Date.now(); let dt = now - lastTime; lastTime = now; self.postMessage(dt); }, 40); `], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(workerBlob));
            
            worker.onmessage = function(e) {
                let realDeltaMs = e.data;
                if (timeMultiplier > 0) {
                    let inGameDeltaMs = realDeltaMs * timeMultiplier; timeAccumulator += inGameDeltaMs;
                    while (timeAccumulator >= 1000) { 
                        gameTime++; timeAccumulator -= 1000; 
                        let clk = document.getElementById('clock'); if(clk) clk.innerText = formatTime(gameTime); 
                        updateAutomaticSignals(); checkTimetable(); 
                        if (gameTime % 10 === 0 && document.getElementById('manifest-jadwal') && document.getElementById('manifest-jadwal').style.display === 'block') { populateBottomSchedule(); }
                    }
                    let dtSeconds = inGameDeltaMs / 1000; trains.forEach(t => t.update(dtSeconds));
                }
            };
        })
        .catch(err => { console.error(err); alert("GAGAL MEMUAT JADWAL: Pastikan data bisa diakses."); });
}

loadJadwalAndInit();