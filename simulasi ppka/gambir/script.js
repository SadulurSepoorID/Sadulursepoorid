/**
 * ENGINE DISPATCHER PROFESIONAL - STASIUN GAMBIR
 * (V63 - ADVANCED INTERLOCKING & PLATFORM VALIDATION + STAMFORMASI)
 */

// ==========================================
// DATA JALUR WAJIB KA (DARI MANIFEST)
// ==========================================
// Data Jalur Wajib KA (Gambir) - Diperbarui untuk mendukung Nomor KA tanpa Sub Huruf
const jalurWajib = {
    // --- KA BERANGKAT ---
    "7002A": "III", "7002": "III", "7010B": "IV", "7010": "IV",
    "26": "I", "6": "IV", "130B": "I", "130": "I", "50F": "III", "50": "III",
    "7038": "I", "20A": "IV", "20": "IV", "132B": "I", "132": "I",
    "46": "IV", "2B": "II", "2": "II", "128B": "I", "128": "I",
    "16": "III", "118B": "IV", "118": "IV", "138B": "I", "138": "I",
    "7006": "IV", "136B": "I", "136": "I", "40": "IV",
    "62B": "I", "62": "I", "122B": "IV", "122": "IV", "24": "I",
    "58F": "IV", "58": "IV", "142B": "I", "142": "I", "44": "IV",
    "7004": "IV", "38": "IV", "7008B": "IV", "7008": "IV",
    "18": "IV", "8": "I", "134B": "I", "134": "I", "36": "III",
    "124B": "IV", "124": "IV", "42": "IV", "28": "I", "32": "IV",
    "4B": "I", "4": "I", "14": "III", "54": "IV", "48": "I",
    "120B": "IV", "120": "IV", "22": "IV", "64B": "II", "64": "II",
    "140B": "I", "140": "I", "30F": "I", "30": "I", "126F": "IV", "126": "IV",

    // --- KA DATANG ---
    "25": "II", "127B": "II", "127": "II", "7037": "I",
    "57F": "II", "57": "II", "35": "II", "45": "I",
    "15": "II", "19": "II", "37": "II", "31": "II",
    "41": "III", "3B": "II", "3": "II", "7": "III",
    "63B": "IV", "63": "IV", "7005": "II", "131B": "I", "131": "I",
    "7001A": "III", "7001": "III", "117B": "IV", "117": "IV",
    "135B": "I", "135": "I", "121B": "IV", "121": "IV",
    "23": "I", "17": "II", "53F": "IV", "53": "IV", "141B": "I", "141": "I",
    "7007B": "II", "7007": "II", "43": "IV", "133B": "II", "133": "II",
    "7003A": "I", "7003": "I", "13": "II", "137B": "I", "137": "I",
    "39": "II", "1B": "III", "1": "III", "61B": "II", "61": "II",
    "129B": "I", "129": "I", "123B": "IV", "123": "IV", "27": "I",
    "5": "III", "49": "IV", "47": "I", "29F": "III", "29": "III",
    "119B": "IV", "119": "IV", "21A": "IV", "21": "IV",
    "139B": "I", "139": "I", "7009B": "III", "7009": "III",
    "125F": "IV", "125": "IV"
};

function cekJalurValid(noKA, jalurTujuan) {
    if (jalurWajib[noKA]) { return jalurWajib[noKA] === jalurTujuan; }
    return true; 
}

// ==========================================
// DATA STAMFORMASI (PUTAR BALIK KA)
// ==========================================
const TRAIN_TURNAROUND_MAP = {
    "131": "128", "117": "118", "135": "136", "121": "122",
    "23": "24", "53F": "58F", "141B": "142B", "43": "44",
    "129": "134", "123": "124", "27": "28", "49": "54",
    "47": "48", "119": "120", "21": "22", "139": "140", "125F": "126F"
};
const TURNAROUND_TARGETS = Object.values(TRAIN_TURNAROUND_MAP);

// ==========================================
// FUNGSI KELUAR SIMULASI (SINKRONISASI IFRAME)
// ==========================================
window.keluarSimulasi = function() {
    closeModal('settings-modal'); // Tutup menu setting dulu
    openModal('exit-modal');      // Buka modal konfirmasi kustom kita (tidak membatalkan fullscreen)
};

// Fungsi ini dipanggil jika user klik "YA, KELUAR" di modal
window.prosesKeluar = function() {
    // Deteksi ketat apakah berjalan di dalam iframe menu utama
    if (window.parent !== window && typeof window.parent.exitGame === 'function') {
        window.parent.exitGame();
    } else {
        // Paksa kembali ke root jika dibuka langsung tanpa menu utama
        window.top.location.replace('../index.html');
    }
};
// ==========================================
// FUNGSI FULLSCREEN & ORIENTATION LOCK
// ==========================================
window.enterFullscreen = function() {
    let elem = document.documentElement;
    if (elem.requestFullscreen) { elem.requestFullscreen(); }
    else if (elem.webkitRequestFullscreen) { elem.webkitRequestFullscreen(); } 
    else if (elem.msRequestFullscreen) { elem.msRequestFullscreen(); } 
    
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(function(error) { 
            console.log('Pengunci layar otomatis tidak didukung di browser ini.'); 
        });
    }
};

window.setGameTime = function() {
    let hVal = document.getElementById('time-hours').value;
    let mVal = document.getElementById('time-minutes').value;
    
    if (hVal !== "" && mVal !== "") {
        let h = parseInt(hVal);
        let m = parseInt(mVal);
        
        if (h < 0) h = 0; if (h > 23) h = 23;
        if (m < 0) m = 0; if (m > 59) m = 59;
        
        gameTime = (h * 3600) + (m * 60);
        
        [...trains].forEach(tr => tr.despawn());
        trains = [];
        
        document.querySelectorAll('.occupied-layer').forEach(e => e.classList.remove('active'));
        
        for (let id in SIGNALS) {
            if (id === 'SIG_N_IN' || id === 'SIG_S_IN' || id.includes('_OUT')) {
                SIGNALS[id] = 'RED';
            }
            updateSignalVisual(id);
        }
        
        incomingCalls = [];
        clearedDepartures.clear();
        let tbody = document.getElementById('schedule-body');
        if (tbody) tbody.innerHTML = '';
        
        TIMETABLE.forEach(t => {
            if (TURNAROUND_TARGETS.includes(t.noKA)) {
                t.hasSpawned = true; 
                t.hasCalled = true;
            } else if (t.spawnTime < gameTime) { 
                t.hasSpawned = true; 
                t.hasCalled = true; 
            } else { 
                t.hasSpawned = false; 
                t.hasCalled = false; 
            }
        });
        
        updateRoutesVisual();
        updateSinyalMuka();
        
        let clk = document.getElementById('clock');
        if (clk) clk.innerText = formatTime(gameTime);
        
        let timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        addLog(`<span style="color:#00ffcc">[SYSTEM] Permainan direset bersih. Waktu disetel ke ${timeStr} WIB.</span>`);
        closeModal('settings-modal'); 
        
        if (document.getElementById('manifest-jadwal').style.display === 'block') {
            populateBottomSchedule();
        }
    }
};

window.setSpeed = function(val) {
    let speedSlider = document.getElementById('speed-slider');
    let speedInput = document.getElementById('speed-input');
    if(speedSlider) speedSlider.value = val;
    if(speedInput) speedInput.value = val;
};

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

let ytPlayer;
let isYtReady = false;

let ytScript = document.createElement('script');
ytScript.src = "https://www.youtube.com/iframe_api";
let firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(ytScript, firstScriptTag);

window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('youtube-audio-player', {
        height: '0', width: '0', videoId: '4q_IwLDMpy0',
        playerVars: { 'autoplay': 0, 'controls': 0, 'disablekb': 1, 'fs': 0, 'rel': 0 },
        events: {
            'onReady': () => { isYtReady = true; },
            'onStateChange': (event) => {
                if (event.data === 0) {
                    const btn = document.getElementById('btn-bel');
                    btn.innerText = "🔔 BEL: OFF";
                    btn.style.background = "#a37500";
                }
            }
        }
    });
};

window.playArrivalBell = function() {
    if (!isYtReady || !ytPlayer) { console.warn("YouTube Player belum siap."); return; }
    const btn = document.getElementById('btn-bel');
    const playerState = ytPlayer.getPlayerState();

    if (playerState === 1) {
        ytPlayer.pauseVideo();
        btn.innerText = "🔔 BEL: OFF"; btn.style.background = "#a37500"; 
    } else {
        initAudio(); ytPlayer.seekTo(0); ytPlayer.playVideo();
        btn.innerText = "🔕 MATIKAN BEL"; btn.style.background = "#ff3333"; 
    }
};

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
    osc.type = 'square'; osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.1);
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
            } else { if (isSfxOn) setTimeout(() => playRadioClick(), 2000); }
        }, 200); 
    }, delayMs);
}

function playCustomAlarmAndSpeak(text) {
    if (!isSfxOn && !isVoiceOn) return;
    
    if (!isSfxOn) {
        speakVoice(text, 0);
        return;
    }

    let alarm = new Audio('AUD-20230226-WA0054.mp3');
    let playCount = 0;
    
    alarm.onended = () => {
        playCount++;
        if (playCount < 2) {
            alarm.play(); 
        } else {
            speakVoice(text, 200); 
        }
    };
    
    alarm.play().catch(e => {
        console.warn("Browser memblokir Autoplay audio, fallback ke suara langsung.", e);
        speakVoice(text, 500); 
    });
}

let currentMapW = window.innerWidth < 900 ? 800 : 1400; 
let currentMapH = window.innerWidth < 900 ? 300 : 500;
function setMapZoom(factor) {
    let area = document.getElementById('map-area');
    currentMapW *= factor; currentMapH *= factor;
    if (currentMapW < 900) currentMapW = 900;
    if (currentMapH < 350) currentMapH = 350;
    if (currentMapW > 3500) currentMapW = 3500;
    if (currentMapH > 1200) currentMapH = 1200;
    area.style.width = currentMapW + 'px'; area.style.height = currentMapH + 'px';
}

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
    
    let upcomingTrains = TIMETABLE.filter(t => t.arrivesTime >= gameTime - 120 || t.spawnTime >= gameTime - 120); 
    let sortedTable = upcomingTrains.sort((a,b) => a.arrivesTime - b.arrivesTime);
    
    if (sortedTable.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#888;">Tidak ada jadwal.</td></tr>`; 
    } else {
        sortedTable.forEach(t => {
            let delayStr = ""; 
            if (t.offset > 0) delayStr = `<span style="color:#ff5555; font-size:11px; margin-left:5px;">(+${Math.floor(t.offset/60)}m)</span>`;
            else if (t.offset < 0) delayStr = `<span style="color:#00ff00; font-size:11px; margin-left:5px;">(${Math.floor(t.offset/60)}m)</span>`;
            
            let jenisBadge = t.isCommuter ? `<span class="badge badge-commuter">COMMUTER</span>` : `<span class="badge badge-kajj">KAJJ</span>`;
            let jalurStr = jalurWajib[t.noKA] || "-";
            
            tbody.innerHTML += `
            <tr>
                <td style="color:#fff; font-family: monospace;">${t.noKA}</td>
                <td><span style="color:#fff;">${t.namaKA}</span> <span style="color:#aaa;">- ${t.destName}</span></td>
                <td style="color:#00ff00; font-weight:bold;">${t.strArr} ${delayStr}</td>
                <td style="color:#ffcc00; font-weight:bold;">${t.strDep}</td>
                <td style="color:#00ffcc; font-weight:bold; text-align:center;">${jalurStr}</td>
                <td>${jenisBadge}</td>
            </tr>`;
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
    let bD = document.getElementById('notif-badge'); if(bD) bD.innerText = `(${count})`; 
    let tB = document.getElementById('tab-notif-badge'); if(tB) tB.innerText = `(${count})`;
    let bT = document.getElementById('btn-telepon'); 
    if (count > 0) { if(bT) bT.classList.add('blinking'); } else { if(bT) bT.classList.remove('blinking'); }
    
    let listDiv = document.getElementById('incoming-list');
    if (count === 0) { listDiv.innerHTML = '<p style="color:#888; text-align:center; padding: 20px 0;">Tidak ada panggilan KA masuk.</p>'; } 
    else {
        listDiv.innerHTML = incomingCalls.map(c => `
            <div style="background:#222; border-left:4px solid #ffcc00; padding:12px; margin-bottom:12px;">
                <div style="color:#ffcc00; font-weight:bold; margin-bottom:5px;">📞 DARI: STASIUN ${c.from}</div>
                <div style="color:#fff; font-size:13px; margin-bottom:10px;">"${c.messageLog}"</div>
                <button onclick="replyIncomingCall('${c.id}')" style="background:#00ccff; color:#000; font-weight:bold; border:none; padding:8px; cursor:pointer; width:100%;">TERIMA KA DARI ${c.from}</button>
            </div>`).join('');
    }
}

function updateOutgoingTrainList() {
    let st = document.getElementById('out-station').value; 
    let selectNoka = document.getElementById('out-noka'); selectNoka.innerHTML = ''; 
    let availableTrains = trains.filter(t => {
        if (t.isCommuter || clearedDepartures.has(t.noKA)) return false; 
        if (st === 'MRI' && t.isEven) return true; 
        if (st === 'JAKK' && !t.isEven) return true; 
        return false;
    });
    if (availableTrains.length === 0) { selectNoka.innerHTML = '<option value="">-- Tidak ada KAJJ siap --</option>'; } 
    else { availableTrains.forEach(t => { selectNoka.innerHTML += `<option value="${t.noKA}">KAJJ ${t.noKA} (${t.namaKA})</option>`; }); }
}

function replyIncomingCall(id) {
    let callIndex = incomingCalls.findIndex(c => c.id == id);
    if (callIndex > -1) {
        let call = incomingCalls[callIndex]; 
        addLog(`<span style="color:#00ccff">[TELEPON] ANDA -> ${call.from}:</span> Copy. Gambir siap melayani KAJJ ${call.noKA}.`); 
        speakVoice(`Stasiun ${call.from}, Gambir siap menerima pelayanan. Ganti.`);
        let scheduledTrain = TIMETABLE.find(x => x.noKA === call.noKA); if (scheduledTrain) scheduledTrain.isClearedToEnter = true;
        incomingCalls.splice(callIndex, 1); updateCommUI();
    }
}

function sendOutgoingCall() {
    let st = document.getElementById('out-station').value; let ka = document.getElementById('out-noka').value;
    if(!ka) return;
    let stName = st === 'JAKK' ? 'JAKARTA KOTA' : 'MANGGARAI';
    let voiceMsg = `Stasiun ${stName}, KAJJ ${ka} siap diberangkatkan dari Gambir. Aman? Ganti.`;
    let statusDiv = document.getElementById('out-status'); let btn = document.getElementById('btn-send-out');
    btn.disabled = true; btn.style.background = "#555"; statusDiv.innerHTML = `<span style="color:#ffcc00;">Memanggil Stasiun ${stName}...</span>`;
    addLog(`<span style="color:#00ccff">[TELEPON] ANDA -> ${stName}:</span> ${voiceMsg}`); speakVoice(voiceMsg);

    setTimeout(() => {
        let replyVoice = `Aman, laksanakan. Silakan berangkatkan KAJJ ${ka}. Ganti.`; clearedDepartures.add(ka); 
        statusDiv.innerHTML = `<span style="color:#00ff00;">${stName}: "${replyVoice}"</span>`;
        addLog(`<span style="color:#00ff00">[TELEPON] ${stName} -> ANDA:</span> ${replyVoice}`);
        speakVoice(`Stasiun Gambir. ${replyVoice}`); btn.disabled = false; btn.style.background = "#0066ff"; updateOutgoingTrainList(); 
    }, 6000); 
}

const NODES = {
    'N_IN_SPAWN': {x: 0, y: 25}, 'SIG_N_MUKA': {x: 12, y: 25}, 
    'N_IN_TOP_BEND': {x: 20, y: 25}, 'N_IN_TOP_END': {x: 22, y: 30}, 
    'N_OUT_TOP_START': {x: 22, y: 20}, 'N_OUT_TOP_BEND': {x: 20, y: 15}, 
    'SIG_N_OUT_EXT': {x: 12, y: 15}, 'N_OUT_DESPAWN': {x: 0, y: 15},
    'S_IN_SPAWN': {x: 100, y: 15}, 'SIG_S_MUKA': {x: 88, y: 15}, 
    'S_IN_TOP_BEND': {x: 80, y: 15}, 'S_IN_TOP_END': {x: 78, y: 20},
    'S_OUT_TOP_START': {x: 78, y: 30}, 'S_OUT_TOP_BEND': {x: 80, y: 25},
    'SIG_S_OUT_EXT': {x: 88, y: 25}, 'S_OUT_DESPAWN': {x: 100, y: 25},
    'N_OUT_END': {x: 0, y: 45}, 'N_OUT_END_BEND': {x: 4, y: 50},
    'N_IN_START': {x: 0, y: 59}, 'N_IN_START_BEND': {x: 4, y: 64},
    'SIG_N_IN': {x: 8, y: 64},
    'SW_N_C1_TOP': {x: 17, y: 50}, 'SW_N_C1_BOT': {x: 13, y: 64}, 
    'SW_N_C2_TOP': {x: 21, y: 50}, 'SW_N_C2_BOT': {x: 25, y: 64}, 
    'SW_N_P12': {x: 30, y: 50}, 'SW_N_P34': {x: 30, y: 64},
    'S_1_N_OUT': {x: 35, y: 34}, 'P_1_W': {x: 38, y: 34}, 'P_1_E': {x: 62, y: 34}, 'S_1_S_OUT': {x: 65, y: 34},
    'S_2_N_OUT': {x: 35, y: 50}, 'P_2_W': {x: 38, y: 50}, 'P_2_E': {x: 62, y: 50}, 'S_2_S_OUT': {x: 65, y: 50},
    'S_3_N_OUT': {x: 35, y: 64}, 'P_3_W': {x: 38, y: 64}, 'P_3_E': {x: 62, y: 64}, 'S_3_S_OUT': {x: 65, y: 64},
    'S_4_N_OUT': {x: 35, y: 80}, 'P_4_W': {x: 38, y: 80}, 'P_4_E': {x: 62, y: 80}, 'S_4_S_OUT': {x: 65, y: 80},
    'SW_S_P12': {x: 70, y: 50}, 'SW_S_P34': {x: 70, y: 64},
    'SW_S_X_L_TOP': {x: 75, y: 50}, 'SW_S_X_L_BOT': {x: 75, y: 64},
    'SW_S_X_R_TOP': {x: 83, y: 50}, 'SW_S_X_R_BOT': {x: 83, y: 64},
    'SIG_S_IN': {x: 92, y: 50}, 
    'S_IN_START_BEND': {x: 96, y: 50}, 'S_IN_START': {x: 100, y: 45},
    'S_OUT_END_BEND': {x: 96, y: 64}, 'S_OUT_END': {x: 100, y: 59}
};

let TRACKS = [
    {id: 'e_n_jump', from: 'N_IN_TOP_END', to: 'N_IN_START', dir: 'east', type: 'jump'},
    {id: 'w_n_jump', from: 'N_OUT_END', to: 'N_OUT_TOP_START', dir: 'west', type: 'jump'},
    {id: 'w_s_jump', from: 'S_IN_TOP_END', to: 'S_IN_START', dir: 'west', type: 'jump'},
    {id: 'e_s_jump', from: 'S_OUT_END', to: 'S_OUT_TOP_START', dir: 'east', type: 'jump'},
    {id: 'e_n_ext_1', from: 'N_IN_SPAWN', to: 'SIG_N_MUKA', dir: 'east'},
    {id: 'e_n_ext_2', from: 'SIG_N_MUKA', to: 'N_IN_TOP_BEND', dir: 'east'},
    {id: 'e_n_ext_3', from: 'N_IN_TOP_BEND', to: 'N_IN_TOP_END', dir: 'east'}, 
    {id: 'w_n_ext_1', from: 'N_OUT_TOP_START', to: 'N_OUT_TOP_BEND', dir: 'west'}, 
    {id: 'w_n_ext_2', from: 'N_OUT_TOP_BEND', to: 'SIG_N_OUT_EXT', dir: 'west'},
    {id: 'w_n_ext_3', from: 'SIG_N_OUT_EXT', to: 'N_OUT_DESPAWN', dir: 'west'},
    {id: 'w_s_ext_1', from: 'S_IN_SPAWN', to: 'SIG_S_MUKA', dir: 'west'},
    {id: 'w_s_ext_2', from: 'SIG_S_MUKA', to: 'S_IN_TOP_BEND', dir: 'west'},
    {id: 'w_s_ext_3', from: 'S_IN_TOP_BEND', to: 'S_IN_TOP_END', dir: 'west'}, 
    {id: 'e_s_ext_1', from: 'S_OUT_TOP_START', to: 'S_OUT_TOP_BEND', dir: 'east'}, 
    {id: 'e_s_ext_2', from: 'S_OUT_TOP_BEND', to: 'SIG_S_OUT_EXT', dir: 'east'},
    {id: 'e_s_ext_3', from: 'SIG_S_OUT_EXT', to: 'S_OUT_DESPAWN', dir: 'east'},
    {id: 'e_in_sig_1', from: 'N_IN_START', to: 'N_IN_START_BEND', dir: 'east'}, 
    {id: 'e_in_sig_2', from: 'N_IN_START_BEND', to: 'SIG_N_IN', dir: 'east'}, 
    {id: 'e_n_in', from: 'SIG_N_IN', to: 'SW_N_C1_BOT', dir: 'east'},
    {id: 'e_c1_bot_str', from: 'SW_N_C1_BOT', to: 'SW_N_C2_BOT', type: 'straight', dir: 'east'}, 
    {id: 'e_c1_bot_div', from: 'SW_N_C1_BOT', to: 'SW_N_C1_TOP', type: 'diverge', dir: 'east'},
    {id: 'e_c1_top_str', from: 'SW_N_C1_TOP', to: 'SW_N_C2_TOP', dir: 'east'},
    {id: 'e_c2_top_str', from: 'SW_N_C2_TOP', to: 'SW_N_P12', type: 'straight', dir: 'east'}, 
    {id: 'e_c2_top_div', from: 'SW_N_C2_TOP', to: 'SW_N_C2_BOT', type: 'diverge', dir: 'east'},
    {id: 'e_c2_bot_str', from: 'SW_N_C2_BOT', to: 'SW_N_P34', dir: 'east'},
    {id: 'e_p1_in', from: 'SW_N_P12', to: 'S_1_N_OUT', type: 'diverge', dir: 'east'}, 
    {id: 'e_p2_in', from: 'SW_N_P12', to: 'S_2_N_OUT', type: 'straight', dir: 'east'},
    {id: 'e_p3_in', from: 'SW_N_P34', to: 'S_3_N_OUT', type: 'straight', dir: 'east'}, 
    {id: 'e_p4_in', from: 'SW_N_P34', to: 'S_4_N_OUT', type: 'diverge', dir: 'east'},
    {id: 'e_p1_w', from: 'S_1_N_OUT', to: 'P_1_W', dir: 'east'}, {id: 'e_p1_mid', from: 'P_1_W', to: 'P_1_E', dir: 'east'}, {id: 'e_p1_e', from: 'P_1_E', to: 'S_1_S_OUT', dir: 'east'},
    {id: 'e_p2_w', from: 'S_2_N_OUT', to: 'P_2_W', dir: 'east'}, {id: 'e_p2_mid', from: 'P_2_W', to: 'P_2_E', dir: 'east'}, {id: 'e_p2_e', from: 'P_2_E', to: 'S_2_S_OUT', dir: 'east'},
    {id: 'e_p3_w', from: 'S_3_N_OUT', to: 'P_3_W', dir: 'east'}, {id: 'e_p3_mid', from: 'P_3_W', to: 'P_3_E', dir: 'east'}, {id: 'e_p3_e', from: 'P_3_E', to: 'S_3_S_OUT', dir: 'east'},
    {id: 'e_p4_w', from: 'S_4_N_OUT', to: 'P_4_W', dir: 'east'}, {id: 'e_p4_mid', from: 'P_4_W', to: 'P_4_E', dir: 'east'}, {id: 'e_p4_e', from: 'P_4_E', to: 'S_4_S_OUT', dir: 'east'},
    {id: 'e_p1_out', from: 'S_1_S_OUT', to: 'SW_S_P12', dir: 'east'}, 
    {id: 'e_p2_out', from: 'S_2_S_OUT', to: 'SW_S_P12', dir: 'east'},
    {id: 'e_p3_out', from: 'S_3_S_OUT', to: 'SW_S_P34', dir: 'east'}, 
    {id: 'e_p4_out', from: 'S_4_S_OUT', to: 'SW_S_P34', dir: 'east'},
    {id: 'e_s_ltop_in', from: 'SW_S_P12', to: 'SW_S_X_L_TOP', dir: 'east'}, 
    {id: 'e_s_lbot_in', from: 'SW_S_P34', to: 'SW_S_X_L_BOT', dir: 'east'},
    {id: 'e_x_ltop_str', from: 'SW_S_X_L_TOP', to: 'SW_S_X_R_TOP', type: 'straight', dir: 'east'}, 
    {id: 'e_x_ltop_div', from: 'SW_S_X_L_TOP', to: 'SW_S_X_R_BOT', type: 'diverge', dir: 'east'},
    {id: 'e_x_lbot_str', from: 'SW_S_X_L_BOT', to: 'SW_S_X_R_BOT', type: 'straight', dir: 'east'}, 
    {id: 'e_x_lbot_div', from: 'SW_S_X_L_BOT', to: 'SW_S_X_R_TOP', type: 'diverge', dir: 'east'},
    {id: 'e_x_rtop_str', from: 'SW_S_X_R_TOP', to: 'SIG_S_IN', dir: 'east'}, 
    {id: 'e_x_rbot_str', from: 'SW_S_X_R_BOT', to: 'S_OUT_END_BEND', dir: 'east'}, 
    {id: 'e_s_rtop_out_1', from: 'SIG_S_IN', to: 'S_IN_START_BEND', dir: 'east'}, 
    {id: 'e_s_rtop_out_2', from: 'S_IN_START_BEND', to: 'S_IN_START', dir: 'east'}, 
    {id: 'e_s_rbot_out_2', from: 'S_OUT_END_BEND', to: 'S_OUT_END', dir: 'east'}, 
    {id: 'w_in_sig_1', from: 'S_IN_START', to: 'S_IN_START_BEND', dir: 'west'}, 
    {id: 'w_in_sig_2', from: 'S_IN_START_BEND', to: 'SIG_S_IN', dir: 'west'}, 
    {id: 'w_s_in', from: 'SIG_S_IN', to: 'SW_S_X_R_TOP', dir: 'west'},
    {id: 'w_s_in_bot_1', from: 'S_OUT_END', to: 'S_OUT_END_BEND', dir: 'west'}, 
    {id: 'w_s_in_bot_2', from: 'S_OUT_END_BEND', to: 'SW_S_X_R_BOT', dir: 'west'}, 
    {id: 'w_x_rtop_str', from: 'SW_S_X_R_TOP', to: 'SW_S_X_L_TOP', type: 'straight', dir: 'west'}, 
    {id: 'w_x_rtop_div', from: 'SW_S_X_R_TOP', to: 'SW_S_X_L_BOT', type: 'diverge', dir: 'west'},
    {id: 'w_x_rbot_str', from: 'SW_S_X_R_BOT', to: 'SW_S_X_L_BOT', type: 'straight', dir: 'west'}, 
    {id: 'w_x_rbot_div', from: 'SW_S_X_R_BOT', to: 'SW_S_X_L_TOP', type: 'diverge', dir: 'west'},
    {id: 'w_x_ltop_str', from: 'SW_S_X_L_TOP', to: 'SW_S_P12', dir: 'west'},
    {id: 'w_x_lbot_str', from: 'SW_S_X_L_BOT', to: 'SW_S_P34', dir: 'west'},
    {id: 'w_p1_in', from: 'SW_S_P12', to: 'S_1_S_OUT', type: 'diverge', dir: 'west'}, 
    {id: 'w_p2_in', from: 'SW_S_P12', to: 'S_2_S_OUT', type: 'straight', dir: 'west'},
    {id: 'w_p3_in', from: 'SW_S_P34', to: 'S_3_S_OUT', type: 'straight', dir: 'west'}, 
    {id: 'w_p4_in', from: 'SW_S_P34', to: 'S_4_S_OUT', type: 'diverge', dir: 'west'},
    {id: 'w_p1_e', from: 'S_1_S_OUT', to: 'P_1_E', dir: 'west'}, {id: 'w_p1_mid', from: 'P_1_E', to: 'P_1_W', dir: 'west'}, {id: 'w_p1_w', from: 'P_1_W', to: 'S_1_N_OUT', dir: 'west'},
    {id: 'w_p2_e', from: 'S_2_S_OUT', to: 'P_2_E', dir: 'west'}, {id: 'w_p2_mid', from: 'P_2_E', to: 'P_2_W', dir: 'west'}, {id: 'w_p2_w', from: 'P_2_W', to: 'S_2_N_OUT', dir: 'west'},
    {id: 'w_p3_e', from: 'S_3_S_OUT', to: 'P_3_E', dir: 'west'}, {id: 'w_p3_mid', from: 'P_3_E', to: 'P_3_W', dir: 'west'}, {id: 'w_p3_w', from: 'P_3_W', to: 'S_3_N_OUT', dir: 'west'},
    {id: 'w_p4_e', from: 'S_4_S_OUT', to: 'P_4_E', dir: 'west'}, {id: 'w_p4_mid', from: 'P_4_E', to: 'P_4_W', dir: 'west'}, {id: 'w_p4_w', from: 'P_4_W', to: 'S_4_N_OUT', dir: 'west'},
    {id: 'w_p1_out', from: 'S_1_N_OUT', to: 'SW_N_P12', dir: 'west'}, 
    {id: 'w_p2_out', from: 'S_2_N_OUT', to: 'SW_N_P12', dir: 'west'},
    {id: 'w_p3_out', from: 'S_3_N_OUT', to: 'SW_N_P34', dir: 'west'}, 
    {id: 'w_p4_out', from: 'S_4_N_OUT', to: 'SW_N_P34', dir: 'west'},
    {id: 'w_n_c2_top_in', from: 'SW_N_P12', to: 'SW_N_C2_TOP', dir: 'west'}, 
    {id: 'w_n_c2_bot_in', from: 'SW_N_P34', to: 'SW_N_C2_BOT', dir: 'west'},
    {id: 'w_c2_bot_str', from: 'SW_N_C2_BOT', to: 'SW_N_C1_BOT', type: 'straight', dir: 'west'},
    {id: 'w_c2_bot_div', from: 'SW_N_C2_BOT', to: 'SW_N_C2_TOP', type: 'diverge', dir: 'west'},
    {id: 'w_c2_top_str', from: 'SW_N_C2_TOP', to: 'SW_N_C1_TOP', dir: 'west'},
    {id: 'w_c1_top_str', from: 'SW_N_C1_TOP', to: 'N_OUT_END_BEND', type: 'straight', dir: 'west'}, 
    {id: 'w_c1_top_div', from: 'SW_N_C1_TOP', to: 'SW_N_C1_BOT', type: 'diverge', dir: 'west'},
    {id: 'w_c1_bot_str', from: 'SW_N_C1_BOT', to: 'SIG_N_IN', dir: 'west'},
    {id: 'w_out_end_2', from: 'N_OUT_END_BEND', to: 'N_OUT_END', dir: 'west'}, 
    {id: 'w_out_bot_1', from: 'SIG_N_IN', to: 'N_IN_START_BEND', dir: 'west'}, 
    {id: 'w_out_bot_2', from: 'N_IN_START_BEND', to: 'N_IN_START', dir: 'west'} 
];

let switches = { 
    'SW_N_C1_BOT': true, 'SW_N_C1_TOP': true, 
    'SW_N_C2_TOP': true, 'SW_N_C2_BOT': true,
    'SW_N_P12': true, 'SW_N_P34': true, 
    'SW_S_P12': true, 'SW_S_P34': true, 
    'SW_S_X_L_TOP': true, 'SW_S_X_L_BOT': true, 
    'SW_S_X_R_TOP': true, 'SW_S_X_R_BOT': true
};

let SIGNALS = { 
    'SIG_N_MUKA': 'GREEN', 'SIG_S_MUKA': 'GREEN',
    'SIG_N_OUT_EXT': 'GREEN', 'SIG_S_OUT_EXT': 'GREEN',
    'SIG_N_IN': 'RED', 'SIG_S_IN': 'RED', 
    'S_1_N_OUT': 'RED', 'S_2_N_OUT': 'RED', 'S_3_N_OUT': 'RED', 'S_4_N_OUT': 'RED',
    'S_1_S_OUT': 'RED', 'S_2_S_OUT': 'RED', 'S_3_S_OUT': 'RED', 'S_4_S_OUT': 'RED'
};

const svgObj = document.getElementById('track-layer'); const entitiesObj = document.getElementById('entities');

function initMap() {
    svgObj.innerHTML = ''; entitiesObj.innerHTML = ''; 
    
    let pTop = document.createElementNS("http://www.w3.org/2000/svg", "rect"); 
    pTop.setAttribute("x", "38%"); pTop.setAttribute("y", "40%"); pTop.setAttribute("width", "24%"); pTop.setAttribute("height", "4%"); 
    pTop.setAttribute("rx", "4"); pTop.setAttribute("fill", "#2a2b30"); pTop.setAttribute("stroke", "#444"); svgObj.appendChild(pTop);
    
    let pBot = document.createElementNS("http://www.w3.org/2000/svg", "rect"); 
    pBot.setAttribute("x", "38%"); pBot.setAttribute("y", "70%"); pBot.setAttribute("width", "24%"); pBot.setAttribute("height", "4%"); 
    pBot.setAttribute("rx", "4"); pBot.setAttribute("fill", "#2a2b30"); pBot.setAttribute("stroke", "#444"); svgObj.appendChild(pBot);

    [34, 50, 64, 80].forEach((yPos, i) => {
        let t = document.createElementNS("http://www.w3.org/2000/svg", "text"); 
        t.setAttribute("x", "50%"); t.setAttribute("y", (yPos - 1.5) + "%"); 
        t.setAttribute("class", "svg-platform"); t.setAttribute("fill", "#00ccff"); 
        t.textContent = "JALUR " + (i + 1).toString(); svgObj.appendChild(t);
    });

    let lblN_Ext_Out = document.createElementNS("http://www.w3.org/2000/svg", "text"); 
    lblN_Ext_Out.setAttribute("x", "2%"); lblN_Ext_Out.setAttribute("y", "12.5%"); lblN_Ext_Out.setAttribute("class", "svg-label"); lblN_Ext_Out.textContent = "← J2 (KE JAKK)"; svgObj.appendChild(lblN_Ext_Out);
    let lblN_Ext_In = document.createElementNS("http://www.w3.org/2000/svg", "text"); 
    lblN_Ext_In.setAttribute("x", "2%"); lblN_Ext_In.setAttribute("y", "22.5%"); lblN_Ext_In.setAttribute("class", "svg-label"); lblN_Ext_In.textContent = "J1 (DARI JAKK) →"; svgObj.appendChild(lblN_Ext_In);
    let lblS_Ext_In = document.createElementNS("http://www.w3.org/2000/svg", "text"); 
    lblS_Ext_In.setAttribute("x", "98%"); lblS_Ext_In.setAttribute("y", "12.5%"); lblS_Ext_In.setAttribute("class", "svg-label"); lblS_Ext_In.setAttribute("text-anchor", "end"); lblS_Ext_In.textContent = "← J2 (DARI MRI)"; svgObj.appendChild(lblS_Ext_In);
    let lblS_Ext_Out = document.createElementNS("http://www.w3.org/2000/svg", "text"); 
    lblS_Ext_Out.setAttribute("x", "98%"); lblS_Ext_Out.setAttribute("y", "22.5%"); lblS_Ext_Out.setAttribute("class", "svg-label"); lblS_Ext_Out.setAttribute("text-anchor", "end"); lblS_Ext_Out.textContent = "J1 (KE MRI) →"; svgObj.appendChild(lblS_Ext_Out);
    let lblN1 = document.createElementNS("http://www.w3.org/2000/svg", "text"); lblN1.setAttribute("x", "2%"); lblN1.setAttribute("y", "42.5%"); lblN1.setAttribute("class", "svg-label"); lblN1.textContent = "← J2 KE BLOK ATAS"; svgObj.appendChild(lblN1);
    let lblN2 = document.createElementNS("http://www.w3.org/2000/svg", "text"); lblN2.setAttribute("x", "2%"); lblN2.setAttribute("y", "56.5%"); lblN2.setAttribute("class", "svg-label"); lblN2.textContent = "J1 DARI BLOK ATAS →"; svgObj.appendChild(lblN2);
    let lblS1 = document.createElementNS("http://www.w3.org/2000/svg", "text"); lblS1.setAttribute("x", "98%"); lblS1.setAttribute("y", "42.5%"); lblS1.setAttribute("class", "svg-label"); lblS1.setAttribute("text-anchor", "end"); lblS1.textContent = "← J2 DARI BLOK ATAS"; svgObj.appendChild(lblS1);
    let lblS2 = document.createElementNS("http://www.w3.org/2000/svg", "text"); lblS2.setAttribute("x", "98%"); lblS2.setAttribute("y", "56.5%"); lblS2.setAttribute("class", "svg-label"); lblS2.setAttribute("text-anchor", "end"); lblS2.textContent = "J1 KE BLOK ATAS →"; svgObj.appendChild(lblS2);

    TRACKS.forEach(tr => {
        if(tr.type !== 'jump') {
            let g = document.createElementNS("http://www.w3.org/2000/svg", "g"); 
            let l1 = document.createElementNS("http://www.w3.org/2000/svg", "line"); l1.setAttribute("x1", NODES[tr.from].x + "%"); l1.setAttribute("y1", NODES[tr.from].y + "%"); l1.setAttribute("x2", NODES[tr.to].x + "%"); l1.setAttribute("y2", NODES[tr.to].y + "%"); l1.setAttribute("class", "base"); l1.id = `base_${tr.id}`; g.appendChild(l1);
            let l2 = document.createElementNS("http://www.w3.org/2000/svg", "line"); l2.setAttribute("x1", NODES[tr.from].x + "%"); l2.setAttribute("y1", NODES[tr.from].y + "%"); l2.setAttribute("x2", NODES[tr.to].x + "%"); l2.setAttribute("y2", NODES[tr.to].y + "%"); l2.setAttribute("class", "route-layer"); l2.id = `r_${tr.id}`; g.appendChild(l2);
            let l3 = document.createElementNS("http://www.w3.org/2000/svg", "line"); l3.setAttribute("x1", NODES[tr.from].x + "%"); l3.setAttribute("y1", NODES[tr.from].y + "%"); l3.setAttribute("x2", NODES[tr.to].x + "%"); l3.setAttribute("y2", NODES[tr.to].y + "%"); l3.setAttribute("class", "occupied-layer"); l3.id = `o_${tr.id}`; g.appendChild(l3);
            svgObj.appendChild(g);
        }
    });

    for (let id in switches) { 
        let btn = document.createElement('div'); btn.className = 'switch-point'; 
        btn.style.left = NODES[id].x + '%'; btn.style.top = NODES[id].y + '%'; 
        btn.onclick = () => toggleSwitch(id); entitiesObj.appendChild(btn); 
    }

    for (let id in SIGNALS) {
        let n = NODES[id]; let housing = document.createElement('div'); housing.className = 'signal-housing'; housing.id = `sig_housing_${id}`;
        housing.onclick = () => toggleSignal(id); housing.style.cursor = "pointer";
        let yOffset;
        if (n.y === 34 || n.y === 50) { yOffset = -4.5; } else if (n.y === 64 || n.y === 80) { yOffset = 4.5; } else { let isBottom = n.y >= 50; yOffset = isBottom ? 4.5 : -4.5; if (n.y <= 25) yOffset = 4.5; }
        housing.style.left = n.x + '%'; housing.style.top = (n.y + yOffset) + '%';
        ['r', 'y', 'g'].forEach(color => { let lamp = document.createElement('div'); lamp.className = `signal-lamp lamp-${color}`; lamp.id = `lamp_${id}_${color}`; housing.appendChild(lamp); });
        entitiesObj.appendChild(housing); updateSignalVisual(id);
    }
    
    let outSel = document.getElementById('out-station');
    if(outSel) outSel.innerHTML = '<option value="MRI">Manggarai (Arah Selatan)</option><option value="JAKK">Jakarta Kota (Arah Utara)</option>';

    updateRoutesVisual(); 
    updateSinyalMuka();
}

function updateSignalVisual(id) {
    let state = SIGNALS[id]; let rLamp = document.getElementById(`lamp_${id}_r`); let yLamp = document.getElementById(`lamp_${id}_y`); let gLamp = document.getElementById(`lamp_${id}_g`);
    if(rLamp) rLamp.classList.remove('on'); if(yLamp) yLamp.classList.remove('on'); if(gLamp) gLamp.classList.remove('on');
    if (state === 'RED' && rLamp) rLamp.classList.add('on'); else if (state === 'YELLOW' && yLamp) yLamp.classList.add('on'); else if (state === 'GREEN' && gLamp) gLamp.classList.add('on');
}

function updateSinyalMuka() {
    let trainAtN_IN = trains.some(t => t.currentNode === 'SIG_N_IN' || (t.currentTrack && t.currentTrack.to === 'SIG_N_IN' && t.percent >= 98));
    if (trainAtN_IN) SIGNALS['SIG_N_MUKA'] = 'RED';
    else if (SIGNALS['SIG_N_IN'] === 'RED') SIGNALS['SIG_N_MUKA'] = 'YELLOW';
    else SIGNALS['SIG_N_MUKA'] = 'GREEN';
    updateSignalVisual('SIG_N_MUKA');

    let trainAtS_IN = trains.some(t => t.currentNode === 'SIG_S_IN' || (t.currentTrack && t.currentTrack.to === 'SIG_S_IN' && t.percent >= 98));
    if (trainAtS_IN) SIGNALS['SIG_S_MUKA'] = 'RED';
    else if (SIGNALS['SIG_S_IN'] === 'RED') SIGNALS['SIG_S_MUKA'] = 'YELLOW';
    else SIGNALS['SIG_S_MUKA'] = 'GREEN';
    updateSignalVisual('SIG_S_MUKA');

    let trainAtN_OUT = trains.some(t => t.currentNode === 'SIG_N_OUT_EXT' || (t.currentTrack && t.currentTrack.to === 'N_OUT_DESPAWN'));
    SIGNALS['SIG_N_OUT_EXT'] = trainAtN_OUT ? 'RED' : 'GREEN';
    updateSignalVisual('SIG_N_OUT_EXT');

    let trainAtS_OUT = trains.some(t => t.currentNode === 'SIG_S_OUT_EXT' || (t.currentTrack && t.currentTrack.to === 'S_OUT_DESPAWN'));
    SIGNALS['SIG_S_OUT_EXT'] = trainAtS_OUT ? 'RED' : 'GREEN';
    updateSignalVisual('SIG_S_OUT_EXT');
}

function isNorthThroatOccupied() {
    return trains.some(t => {
        if (!t.currentTrack) return false;
        let n1 = NODES[t.currentTrack.from]; let n2 = NODES[t.currentTrack.to];
        let currentX = n1.x + (n2.x - n1.x) * (t.percent / 100);
        return currentX >= 8 && currentX <= 35; 
    });
}

function isSouthThroatOccupied() {
    return trains.some(t => {
        if (!t.currentTrack) return false;
        let n1 = NODES[t.currentTrack.from]; let n2 = NODES[t.currentTrack.to];
        let currentX = n1.x + (n2.x - n1.x) * (t.percent / 100);
        return currentX >= 65 && currentX <= 92; 
    });
}

function toggleSwitch(id) {
    let nSigActive = (SIGNALS['SIG_N_IN'] !== 'RED' || SIGNALS['S_1_N_OUT'] !== 'RED' || SIGNALS['S_2_N_OUT'] !== 'RED' || SIGNALS['S_3_N_OUT'] !== 'RED' || SIGNALS['S_4_N_OUT'] !== 'RED');
    let sSigActive = (SIGNALS['SIG_S_IN'] !== 'RED' || SIGNALS['S_1_S_OUT'] !== 'RED' || SIGNALS['S_2_S_OUT'] !== 'RED' || SIGNALS['S_3_S_OUT'] !== 'RED' || SIGNALS['S_4_S_OUT'] !== 'RED');

    if (id.startsWith('SW_N')) {
        if (nSigActive) { addLog(`<span style="color:#ff3333;">SYS MENOLAK: Sinyal Utara sedang aktif!</span>`); return; }
        if (isNorthThroatOccupied()) { addLog(`<span style="color:#ff3333;">SYS MENOLAK: Wesel Terkunci! Ada KA di petak wesel Utara.</span>`); return; }
    }
    if (id.startsWith('SW_S')) {
        if (sSigActive) { addLog(`<span style="color:#ff3333;">SYS MENOLAK: Sinyal Selatan sedang aktif!</span>`); return; }
        if (isSouthThroatOccupied()) { addLog(`<span style="color:#ff3333;">SYS MENOLAK: Wesel Terkunci! Ada KA di petak wesel Selatan.</span>`); return; }
    }

    switches[id] = !switches[id]; 
    if (id === 'SW_N_C1_BOT') switches['SW_N_C1_TOP'] = switches[id]; if (id === 'SW_N_C1_TOP') switches['SW_N_C1_BOT'] = switches[id];
    if (id === 'SW_N_C2_TOP') switches['SW_N_C2_BOT'] = switches[id]; if (id === 'SW_N_C2_BOT') switches['SW_N_C2_TOP'] = switches[id];
    if (id === 'SW_S_X_L_TOP') switches['SW_S_X_R_BOT'] = switches[id]; if (id === 'SW_S_X_R_BOT') switches['SW_S_X_L_TOP'] = switches[id];
    if (id === 'SW_S_X_L_BOT') switches['SW_S_X_R_TOP'] = switches[id]; if (id === 'SW_S_X_R_TOP') switches['SW_S_X_L_BOT'] = switches[id];
    updateRoutesVisual();
}

function getNextTrack(node, dir) {
    let candidates = TRACKS.filter(t => t.from === node && t.dir === dir);
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0]; 
    if (switches.hasOwnProperty(node)) { let targetType = switches[node] ? 'straight' : 'diverge'; return candidates.find(t => t.type === targetType) || null; }
    return candidates[0];
}

function traceRoute(startNode, dir) {
    let currNode = startNode; let hasDiverge = false;
    for (let i = 0; i < 20; i++) { 
        let nextT = getNextTrack(currNode, dir); if (!nextT) break;
        if (nextT.type === 'diverge') hasDiverge = true; currNode = nextT.to;
        if (SIGNALS.hasOwnProperty(currNode) || currNode.includes('_END') || currNode.includes('_START') || currNode.includes('DESPAWN')) break;
    }
    return { endNode: currNode, hasDiverge };
}

function toggleSignal(id) {
    if (id === 'SIG_N_MUKA' || id === 'SIG_S_MUKA' || id === 'SIG_N_OUT_EXT' || id === 'SIG_S_OUT_EXT') { 
        addLog(`<span style="color:#ffcc00;">SYS INFO: Sinyal otomatis beroperasi mendeteksi blok di depannya.</span>`); 
        return; 
    }
    
    if (SIGNALS[id] !== 'RED') { 
        SIGNALS[id] = 'RED'; 
        addLog(`<span style="color:#ffcc00;">[SYSTEM] Sinyal ${id} dikembalikan ke MERAH (S7).</span>`);
        updateSignalVisual(id); updateRoutesVisual(); return; 
    }
    
    if (id.startsWith('S_') && id.includes('_OUT')) {
        let trainAtSignal = trains.find(tr => tr.currentTrack && tr.currentTrack.to === id && tr.percent >= 90);
        if (trainAtSignal && !trainAtSignal.isCommuter && !clearedDepartures.has(trainAtSignal.noKA)) { 
            addLog(`<span style="color:#ff3333;">SYS MENOLAK: Anda belum meminta izin berangkat via Telepon!</span>`); return; 
        }
    }

    let dir = (id === 'SIG_N_IN' || id.includes('_S_OUT')) ? 'east' : 'west';
    let trace = traceRoute(id, dir);

    if (id.includes('_N_OUT')) { 
        if (!trace.endNode.includes('N_OUT_END')) { addLog(`<span style="color:#ff3333;">SYS MENOLAK: Wesel salah arah! KA arah JAKK harus lewat J2.</span>`); return; }
    } else if (id.includes('_S_OUT')) { 
        if (!trace.endNode.includes('S_OUT_END')) { addLog(`<span style="color:#ff3333;">SYS MENOLAK: Wesel salah arah! KA arah MRI harus lewat J1.</span>`); return; }
    }

    let aspect = trace.hasDiverge ? 'YELLOW' : 'GREEN'; 

    if (id === 'SIG_N_IN' || id === 'SIG_S_IN') {
        let targetPlatform = trace.endNode.split('_')[1]; 
        let isOccupied = trains.some(t => 
            t.currentNode.includes(`P_${targetPlatform}_`) || 
            (t.currentTrack && t.currentTrack.to.includes(`P_${targetPlatform}_`))
        );
        if (isOccupied) { addLog(`<span style="color:#ff3333;">SYS MENOLAK: Jalur ${targetPlatform} sedang terisi KA!</span>`); return; }

        // ====== VALIDASI JALUR (BARU) ======
        let approachingTrain = trains.find(t => 
            t.currentNode === id || 
            (t.currentTrack && t.currentTrack.to === id && t.percent >= 90)
        );
        
        if (approachingTrain && !approachingTrain.isCommuter) {
            let romanMap = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV' };
            let targetJalur = romanMap[targetPlatform];
            
            if (!cekJalurValid(approachingTrain.noKA, targetJalur)) {
                addLog(`<span style="color:#ff3333;">SYS MENOLAK: KA ${approachingTrain.noKA} salah rute! Wajib masuk Jalur ${jalurWajib[approachingTrain.noKA]}.</span>`);
                alert(`⚠️ SINYAL TERKUNCI!\n\nKA ${approachingTrain.noKA} salah rute.\nSeharusnya diarahkan masuk ke Jalur ${jalurWajib[approachingTrain.noKA]},\ntetapi wesel Anda mengarah ke Jalur ${targetJalur}.`);
                return; // Batalkan penarikan sinyal
            }
        }
        // ===================================

        let starterSignal = trace.endNode; 
        aspect = SIGNALS[starterSignal] === 'RED' ? 'YELLOW' : 'GREEN';
    }

    SIGNALS[id] = aspect; 
    let aspectName = aspect === 'GREEN' ? 'HIJAU (S5)' : 'KUNING (S6)';
    addLog(`<span style="color:#00ff00;">[SYSTEM] Sinyal ${id} ditarik menjadi ${aspectName}.</span>`);
    updateSignalVisual(id); updateRoutesVisual();
}

function updateRoutesVisual() {
    document.querySelectorAll('.route-layer').forEach(e => e.classList.remove('active'));
    const on = (id) => { let el = document.getElementById(`r_${id}`); if(el) el.classList.add('active'); };

    if (switches['SW_N_C1_BOT']) on('e_c1_bot_str'); else on('e_c1_bot_div');
    if (switches['SW_N_C1_TOP']) on('w_c1_top_str'); else on('w_c1_top_div');
    if (switches['SW_N_C2_TOP']) on('e_c2_top_str'); else on('e_c2_top_div');
    if (switches['SW_N_C2_BOT']) on('w_c2_bot_str'); else on('w_c2_bot_div');

    if (switches['SW_N_P12']) { on('e_p2_in'); on('w_p2_out'); } else { on('e_p1_in'); on('w_p1_out'); }
    if (switches['SW_N_P34']) { on('e_p3_in'); on('w_p3_out'); } else { on('e_p4_in'); on('w_p4_out'); }
    if (switches['SW_S_P12']) { on('e_p2_out'); on('w_p2_in'); } else { on('e_p1_out'); on('w_p1_in'); }
    if (switches['SW_S_P34']) { on('e_p3_out'); on('w_p3_in'); } else { on('e_p4_out'); on('w_p4_in'); }

    if (switches['SW_S_X_L_TOP']) on('e_x_ltop_str'); else on('e_x_ltop_div');
    if (switches['SW_S_X_L_BOT']) on('e_x_lbot_str'); else on('e_x_lbot_div');
    if (switches['SW_S_X_R_TOP']) on('w_x_rtop_str'); else on('w_x_rtop_div');
    if (switches['SW_S_X_R_BOT']) on('w_x_rbot_str'); else on('w_x_rbot_div');

    let staticTracks = [
        'e_in_sig_1', 'e_in_sig_2', 'e_n_in', 'e_c1_top_str', 'e_c2_bot_str', 'e_s_ltop_in', 'e_s_lbot_in', 'e_x_rtop_str', 'e_x_rbot_str',
        'e_s_rtop_out_1', 'e_s_rtop_out_2', 'e_s_rbot_out_2', 'w_in_sig_1', 'w_in_sig_2', 'w_s_in', 'w_s_in_bot_1', 'w_s_in_bot_2',
        'w_x_ltop_str', 'w_x_lbot_str', 'w_n_c2_top_in', 'w_n_c2_bot_in', 'w_c2_top_str', 'w_c1_bot_str', 'w_out_end_2', 'w_out_bot_1', 'w_out_bot_2',
        'e_n_ext_1', 'e_n_ext_2', 'e_n_ext_3', 'w_n_ext_1', 'w_n_ext_2', 'w_n_ext_3', 'w_s_ext_1', 'w_s_ext_2', 'w_s_ext_3', 'e_s_ext_1', 'e_s_ext_2', 'e_s_ext_3'
    ];
    staticTracks.forEach(on);

    let pActive = { 1: false, 2: false, 3: false, 4: false };
    if (SIGNALS['S_1_N_OUT'] !== 'RED' || SIGNALS['S_1_S_OUT'] !== 'RED') pActive[1] = true;
    if (SIGNALS['S_2_N_OUT'] !== 'RED' || SIGNALS['S_2_S_OUT'] !== 'RED') pActive[2] = true;
    if (SIGNALS['S_3_N_OUT'] !== 'RED' || SIGNALS['S_3_S_OUT'] !== 'RED') pActive[3] = true;
    if (SIGNALS['S_4_N_OUT'] !== 'RED' || SIGNALS['S_4_S_OUT'] !== 'RED') pActive[4] = true;

    if (SIGNALS['SIG_N_IN'] !== 'RED') { let tr = traceRoute('SIG_N_IN', 'east'); if (tr.endNode === 'S_1_N_OUT') pActive[1] = true; if (tr.endNode === 'S_2_N_OUT') pActive[2] = true; if (tr.endNode === 'S_3_N_OUT') pActive[3] = true; if (tr.endNode === 'S_4_N_OUT') pActive[4] = true; }
    if (SIGNALS['SIG_S_IN'] !== 'RED') { let tr = traceRoute('SIG_S_IN', 'west'); if (tr.endNode === 'S_1_S_OUT') pActive[1] = true; if (tr.endNode === 'S_2_S_OUT') pActive[2] = true; if (tr.endNode === 'S_3_S_OUT') pActive[3] = true; if (tr.endNode === 'S_4_S_OUT') pActive[4] = true; }

    if (pActive[1]) { on('e_p1_w'); on('e_p1_mid'); on('e_p1_e'); on('w_p1_e'); on('w_p1_mid'); on('w_p1_w'); }
    if (pActive[2]) { on('e_p2_w'); on('e_p2_mid'); on('e_p2_e'); on('w_p2_e'); on('w_p2_mid'); on('w_p2_w'); }
    if (pActive[3]) { on('e_p3_w'); on('e_p3_mid'); on('e_p3_e'); on('w_p3_e'); on('w_p3_mid'); on('w_p3_w'); }
    if (pActive[4]) { on('e_p4_w'); on('e_p4_mid'); on('e_p4_e'); on('w_p4_e'); on('w_p4_mid'); on('w_p4_w'); }
}

// === CLASS KERETA ===
class Train {
    constructor(noKA, namaKA, startNode, destName, isCommuter = true) {
        this.noKA = noKA; this.namaKA = namaKA; this.currentNode = startNode; this.destName = destName;
        this.isCommuter = isCommuter; this.percent = 0; this.baseSpeed = 0; this.currentTrack = null;
        this.state = 'RUNNING'; this.hasDocked = false; this.lastAspect = 'GREEN';
        
        let noAngka = parseInt(this.noKA.replace(/\D/g, ''));
        this.isEven = (noAngka % 2 === 0);
        this.departTime = 0; 

        this.turnaroundTimer = null;
        this.turnaroundTarget = null;

        this.element = document.createElement('div'); 
        this.element.className = 'train-entity' + (this.isCommuter ? ' commuter' : ''); 
        this.element.innerText = noKA; 
        
        let entLayer = document.getElementById('entities'); 
        if(entLayer) entLayer.appendChild(this.element);
        
        this.findNextTrack(); 
        
        if (this.currentTrack) {
            let startNodeData = NODES[this.currentTrack.from];
            this.element.style.left = startNodeData.x + '%';
            this.element.style.top = startNodeData.y + '%';
        }
        this.updateTable("MEMASUKI SISTEM"); 
    }

    findNextTrack() {
        let myDir = this.isEven ? 'east' : 'west'; 
        let chosenTrack = getNextTrack(this.currentNode, myDir);
        if (chosenTrack) { 
            this.currentTrack = chosenTrack; this.percent = 0; this.hasDocked = false; 
            if (this.state === 'ERROR') this.state = 'RUNNING'; 
            let oLine = document.getElementById(`o_${this.currentTrack.id}`); if(oLine) oLine.classList.add('active'); 
        } else { 
            if (this.currentNode.includes('DESPAWN')) { this.despawn(); } else { this.baseSpeed = 0; this.state = 'ERROR'; this.updateTable("WESEL SALAH ARAH"); }
        }
    }

    update(dt) {
        if (!this.currentTrack) return;
        let n1_ini = NODES[this.currentTrack.from], n2_ini = NODES[this.currentTrack.to];
        
        const refreshPosition = () => {
            this.element.style.left = (n1_ini.x + (n2_ini.x - n1_ini.x) * (this.percent / 100)) + '%';
            this.element.style.top = (n1_ini.y + (n2_ini.y - n1_ini.y) * (this.percent / 100)) + '%';
        };

        if (this.state === 'DOCKED') { 
            this.element.style.visibility = 'visible';

            if (this.turnaroundTarget) {
                if (gameTime >= this.turnaroundTimer) {
                    let oldNo = this.noKA;
                    let newNo = this.turnaroundTarget;
                    let sched = TIMETABLE.find(x => x.noKA === newNo);

                    let oldRow = document.getElementById(`row-${oldNo}`);
                    if (oldRow) oldRow.remove();

                    this.noKA = newNo;
                    this.namaKA = sched ? sched.namaKA : this.namaKA;
                    this.destName = sched ? sched.destName : "Manggarai";
                    this.isEven = true; 
                    
                    let platNum = this.currentTrack.to.split('_')[1]; 
                    let newTrackStr = `e_p${platNum}_e`; 
                    let targetTrack = TRACKS.find(t => t.id === newTrackStr);
                    
                    if (targetTrack) {
                        this.currentTrack = targetTrack;
                        this.percent = 98; 
                        this.currentNode = targetTrack.to; 
                    }

                    this.element.innerText = newNo;
                    this.departTime = sched ? sched.departsTime : gameTime + 180;
                    this.turnaroundTarget = null; 
                    
                    this.updateTable(`BERUBAH DARI KA ${oldNo}`);
                    addLog(`<span style="color:#00ffcc;">[SYSTEM] KA ${oldNo} telah berganti nomor menjadi KA ${newNo} di Jalur ${platNum} sisi Selatan.</span>`);

                    clearedDepartures.delete(newNo);
                    if(document.getElementById('panel-keluar').style.display === 'block') updateOutgoingTrainList();
                } else {
                    let sisa = this.turnaroundTimer - gameTime;
                    this.updateTable(`STAMFORMASI (${Math.ceil(sisa/60)}m)`);
                }
                refreshPosition(); return; 
            }

            if (gameTime >= this.departTime) {
                this.state = 'RUNNING'; 
                this.element.classList.remove('train-docked'); 
                this.element.classList.remove('departure-warning'); 
                this.updateTable("MENUNGGU SINYAL KELUAR");
            } else { 
                let sisa = this.departTime - gameTime; 
                this.updateTable(`BOARDING (${Math.ceil(sisa/60)}m)`); 
                
                if (!this.isCommuter && sisa <= 60 && sisa > 0) {
                    this.element.classList.add('departure-warning');
                }
            }
            refreshPosition(); return;
        }

        if (this.currentTrack.type === 'jump') {
            this.baseSpeed = 10000; 
            this.element.style.visibility = 'hidden'; 
        } else if (this.state === 'RUNNING') {
            this.element.style.visibility = 'visible'; 
            let speedCfgNormal = 19.0; let speedCfgSwitch = 10.0;
            let trackLength = Math.sqrt(Math.pow(n2_ini.x - n1_ini.x, 2) + Math.pow(n2_ini.y - n1_ini.y, 2));
            let visualMultiplier = 18 / (trackLength || 18); 
            let targetSpeed = speedCfgNormal; let statusStr = "BERJALAN (S5)";
            if (this.currentTrack.type === 'diverge') { targetSpeed = speedCfgSwitch; statusStr = "WESEL BELOK (S6)"; } 
            else if (this.lastAspect === 'YELLOW') { targetSpeed = speedCfgSwitch; statusStr = "HATI-HATI (S6)"; }
            this.baseSpeed = targetSpeed * visualMultiplier;
            if(this.isCommuter && statusStr === "BERJALAN (S5)") statusStr = "MELINTAS LANGSUNG (LS)";
            this.updateTable(statusStr);
        }

        let nextPercent = this.percent + (this.baseSpeed * dt);
        let nextNode = this.currentTrack.to;
        
        let isRedSignal = false;
        let isMySignalOut = false;
        
        if (SIGNALS[nextNode] && SIGNALS[nextNode] === 'RED') {
            if (this.isEven && (nextNode === 'SIG_N_IN' || nextNode.includes('_S_OUT') || nextNode === 'SIG_S_OUT_EXT' || nextNode === 'SIG_N_MUKA')) {
                isRedSignal = true;
            } 
            else if (!this.isEven && (nextNode === 'SIG_S_IN' || nextNode.includes('_N_OUT') || nextNode === 'SIG_N_OUT_EXT' || nextNode === 'SIG_S_MUKA')) {
                isRedSignal = true;
            }
        }

        if (this.isEven && nextNode.includes('_S_OUT')) isMySignalOut = true;
        if (!this.isEven && nextNode.includes('_N_OUT')) isMySignalOut = true;

        if (!this.isCommuter && isMySignalOut && nextPercent >= 98 && this.state === 'RUNNING' && !this.hasDocked) {
            this.state = 'DOCKED'; this.hasDocked = true; this.percent = 98; 
            this.element.classList.add('train-docked');
            
            if (TRAIN_TURNAROUND_MAP[this.noKA]) {
                let nextKa = TRAIN_TURNAROUND_MAP[this.noKA];
                this.turnaroundTimer = gameTime + 120; 
                this.turnaroundTarget = nextKa;
                this.updateTable(`STAMFORMASI -> KA ${nextKa}`);
            } else {
                let sched = TIMETABLE.find(x => x.noKA === this.noKA); 
                this.departTime = sched ? sched.departsTime : gameTime + 180; 
            }
            refreshPosition(); return;
        }

        if (nextPercent >= 98 && isRedSignal) { 
            this.percent = 98; this.updateTable("BERHENTI (S7)"); refreshPosition(); return; 
        }

        this.percent = nextPercent; refreshPosition();

        if (this.percent >= 100) {
            let oldLine = document.getElementById(`o_${this.currentTrack.id}`); if(oldLine) oldLine.classList.remove('active');
            let passedNode = this.currentTrack.to; 
            
            if (SIGNALS[passedNode] !== undefined) {
                let isMyDirSignal = false;
                if (this.isEven && (passedNode === 'SIG_N_IN' || passedNode.includes('_S_OUT') || passedNode === 'SIG_S_OUT_EXT' || passedNode === 'SIG_N_MUKA')) isMyDirSignal = true;
                if (!this.isEven && (passedNode === 'SIG_S_IN' || passedNode.includes('_N_OUT') || passedNode === 'SIG_N_OUT_EXT' || passedNode === 'SIG_S_MUKA')) isMyDirSignal = true;
                
                if (isMyDirSignal) {
                    this.lastAspect = SIGNALS[passedNode];
                    if (SIGNALS[passedNode] !== 'RED') { 
                        SIGNALS[passedNode] = 'RED'; updateSignalVisual(passedNode); updateRoutesVisual(); 
                    }
                }
            }
            this.currentNode = passedNode; this.findNextTrack();
        }
    }

    despawn() {
        if(this.element) this.element.remove(); trains = trains.filter(t => t !== this);
        let row = document.getElementById(`row-${this.noKA}`); if(row) row.remove();
        if(document.getElementById('panel-keluar').style.display === 'block') { updateOutgoingTrainList(); }
    }

    updateTable(statusStr = "MEMASUKI SISTEM") { 
        if (!statusStr) statusStr = "MEMASUKI SISTEM"; 
        let safeStr = statusStr.toString(); 
        let tbody = document.getElementById('schedule-body'); if(!tbody) return;
        let row = document.getElementById(`row-${this.noKA}`);
        let badgeClass = "badge-green";
        
        if(safeStr.includes("S7") || safeStr.includes("SALAH")) badgeClass = "badge-red"; 
        else if(safeStr.includes("S6") || safeStr.includes("WESEL") || safeStr.includes("HATI-HATI") || safeStr.includes("STAMFORMASI")) badgeClass = "badge-yellow"; 
        else if(safeStr.includes("BOARDING") || safeStr.includes("BERUBAH")) badgeClass = "badge-cyan"; 
        else if(safeStr.includes("MELINTAS") || safeStr.includes("MEMASUKI")) badgeClass = "badge-commuter"; 
        
        let statusHtml = `<span class="badge ${badgeClass}">${safeStr}</span>`;
        let jalurKA = jalurWajib[this.noKA] || (this.isCommuter ? "-" : "M"); // Menampilkan M untuk manual
        
        if (!row) {
            row = document.createElement('tr'); row.id = `row-${this.noKA}`; 
            row.innerHTML = `<td style="color:#fff; font-family: monospace; font-size: 14px;">${this.noKA}</td><td style="color:#ccc;">${this.namaKA}</td><td style="color:#aaa;">${this.destName}</td><td style="color:#00ffcc; font-weight:bold; text-align:center;">${jalurKA}</td><td class="b-cell" style="color:#ffcc00; font-weight:bold;">BLOK ${this.currentNode}</td><td class="s-cell">${statusHtml}</td>`; 
            tbody.appendChild(row);
        } else {
            let bCell = row.querySelector('.b-cell'); let sCell = row.querySelector('.s-cell');
            if(bCell) bCell.innerText = `BLOK ${this.currentNode}`; if(sCell) sCell.innerHTML = statusHtml;
        }
    }
}

function formatTime(totalSecs) { let h = Math.floor(totalSecs / 3600); let m = Math.floor((totalSecs % 3600) / 60); let s = Math.floor(totalSecs % 60); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function addLog(msg) { let logBox = document.getElementById('log-content'); if(!logBox) return; let div = document.createElement('div'); div.innerHTML = `<span class="log-time">[${formatTime(gameTime)}]</span> ${msg}`; logBox.prepend(div); }

let gameTime = 5 * 3600; let timeAccumulator = 0; let trains = []; let TIMETABLE = [];

function checkTimetable() {
    TIMETABLE.forEach(t => { 
        if (t.hasSpawned) return; 

        if (!t.isCommuter) {
            if (TURNAROUND_TARGETS.includes(t.noKA)) {
                t.hasSpawned = true; 
                t.hasCalled = true;
                return;
            }

            if (!t.hasCalled && gameTime >= t.spawnTime - 120) {
                t.hasCalled = true;
                let stasiunAsal = t.isEven ? "JAKARTA KOTA" : "MANGGARAI";
                let msg = `Stasiun Gambir, KA ${t.noKA} persiapan masuk. Aman? Ganti.`;
                
                incomingCalls.push({
                    id: t.noKA + '_' + gameTime,
                    noKA: t.noKA,
                    from: stasiunAsal,
                    messageLog: msg
                });
                updateCommUI();
                addLog(`<span style="color:#ffcc00">[TELEPON] PANGGILAN DARI ${stasiunAsal}:</span> Persiapan melayani KA ${t.noKA}`);
                
                playCustomAlarmAndSpeak(msg); 
            }

            if (t.isClearedToEnter && gameTime >= t.spawnTime) {
                t.hasSpawned = true;
                let spawnNode = t.isEven ? 'N_IN_SPAWN' : 'S_IN_SPAWN';
                trains.push(new Train(t.noKA, t.namaKA, spawnNode, t.destName, false));
            }
        } 
        else {
            if (gameTime >= t.spawnTime) {
                t.hasSpawned = true;
                let spawnNode = t.isEven ? 'N_IN_SPAWN' : 'S_IN_SPAWN';
                trains.push(new Train(t.noKA, t.namaKA, spawnNode, t.destName, true));
            }
        }
    });
}

function loadJadwalAndInit() {
    const urlDatabase = typeof API_CONFIG !== 'undefined' && API_CONFIG.GAS_URL ? API_CONFIG.GAS_URL : 'jadwal.json';
    const fetchUrl = urlDatabase.includes('http') ? urlDatabase : urlDatabase + '?v=' + new Date().getTime();

    fetch(fetchUrl)
        .then(response => { 
            if(!response.ok) throw new Error("File jadwal.json tidak ditemukan!"); 
            return response.json(); 
        })
        .then(data => {
            TIMETABLE = data;
            
            TIMETABLE.forEach(t => { 
                try {
                    let noAngka = parseInt(String(t.noKA).replace(/\D/g, '')); 
                    t.isEven = (noAngka % 2 === 0);

                    if (t.arrives) {
                        let a = t.arrives.split(':');
                        t.arrivesTime = parseInt(a[0]) * 3600 + parseInt(a[1]) * 60;
                    } else { t.arrivesTime = null; }

                    if (t.departs) {
                        let d = t.departs.split(':');
                        t.departsTime = parseInt(d[0]) * 3600 + parseInt(d[1]) * 60;
                    } else { t.departsTime = null; }

                    if (!t.isCommuter) {
                        if (t.arrivesTime === null && t.departsTime !== null) {
                            t.arrivesTime = t.departsTime - (10 * 60); 
                        }
                        if (t.arrivesTime !== null && t.departsTime === null) {
                            t.departsTime = t.arrivesTime + (5 * 60); 
                        }
                    } else {
                        if (t.arrivesTime === null) t.arrivesTime = t.departsTime - 60;
                        if (t.departsTime === null) t.departsTime = t.arrivesTime + 60;
                    }

                    if (t.isCommuter) {
                        t.offset = Math.floor(Math.random() * 601) - 300; 
                    } else {
                        t.offset = Math.floor(Math.random() * 301); 
                    }
                    
                    t.spawnTime = t.arrivesTime + t.offset; 
                    t.isClearedToEnter = t.isCommuter; 
                    
                    if (t.spawnTime < gameTime) { 
                        t.hasSpawned = true; 
                        t.hasCalled = true; 
                    } else { 
                        t.hasSpawned = false; 
                        t.hasCalled = false; 
                    }

                    t.strArr = formatTime(t.arrivesTime).substring(0,5);
                    t.strDep = formatTime(t.departsTime).substring(0,5);

                } catch (e) {
                    console.warn("Ada jadwal yang error: ", t.noKA);
                }
            });

            initMap();
            
            const workerBlob = new Blob([` let lastTime = Date.now(); setInterval(() => { let now = Date.now(); let dt = now - lastTime; lastTime = now; self.postMessage(dt); }, 40); `], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(workerBlob));
            worker.onmessage = function(e) {
                let speedSlider = document.getElementById('speed-slider'); let timeMult = speedSlider ? parseFloat(speedSlider.value) : 1;
                if (timeMult > 0) {
                    let inGameDeltaMs = e.data * timeMult; timeAccumulator += inGameDeltaMs;
                    while (timeAccumulator >= 1000) { 
                        gameTime++; timeAccumulator -= 1000; 
                        let clk = document.getElementById('clock'); if(clk) clk.innerText = formatTime(gameTime); 
                        
                        checkTimetable(); 
                        
                        if (gameTime % 10 === 0 && document.getElementById('manifest-jadwal') && document.getElementById('manifest-jadwal').style.display === 'block') { 
                            populateBottomSchedule(); 
                        }
                    }
                    let dtSeconds = inGameDeltaMs / 1000; 
                    trains.forEach(t => t.update(dtSeconds));
                    updateSinyalMuka(); 
                }
            };
        })
        .catch(err => { console.error(err); alert("Peringatan: " + err.message); initMap(); });
}

// ==========================================
// LOGIKA PANNING (SWIPE) & ZOOM CONTROLS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const zoomControls = document.getElementById('zoom-controls');
    const gameContainer = document.getElementById('game-container');
    
    if (!zoomControls || !gameContainer) return;

    let zoomHideTimer;
    
    // Fungsi membangunkan tombol zoom saat ada interaksi
    function wakeUpZoomControls() {
        zoomControls.classList.add('show');
        clearTimeout(zoomHideTimer);
        zoomHideTimer = setTimeout(() => {
            // Pengaman: Jangan hilangkan tombol jika kursor sedang berada di atasnya
            if (!zoomControls.matches(':hover')) {
                zoomControls.classList.remove('show');
            }
        }, 2500); 
    }

    // --- CUSTOM DRAG TO SCROLL (UNTUK MOUSE PC & LAPTOP) ---
    let isDragging = false;
    let startX, startY, scrollLeft, scrollTop;

    gameContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        gameContainer.style.cursor = 'grabbing';
        startX = e.pageX - gameContainer.offsetLeft;
        startY = e.pageY - gameContainer.offsetTop;
        scrollLeft = gameContainer.scrollLeft;
        scrollTop = gameContainer.scrollTop;
        wakeUpZoomControls();
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        gameContainer.style.cursor = 'grab';
    });
    
    window.addEventListener('mouseleave', () => {
        isDragging = false;
        gameContainer.style.cursor = 'grab';
    });

    gameContainer.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - gameContainer.offsetLeft;
        const y = e.pageY - gameContainer.offsetTop;
        const walkX = (x - startX) * 1.5; // Angka 1.5 adalah kecepatan geser
        const walkY = (y - startY) * 1.5;
        gameContainer.scrollLeft = scrollLeft - walkX;
        gameContainer.scrollTop = scrollTop - walkY;
        wakeUpZoomControls();
    });

    // --- SCROLL SENTUH (UNTUK SMARTPHONE) ---
    // Scroll bawaan HP sudah sangat smooth, kita hanya perlu deteksi interaksinya
    gameContainer.addEventListener('scroll', wakeUpZoomControls, { passive: true });
    gameContainer.addEventListener('touchstart', wakeUpZoomControls, { passive: true });
});

// --- OVERRIDE FUNGSI ZOOM (AGAR SCROLL TERPUSAT SAAT DI-ZOOM) ---
window.setMapZoom = function(factor) {
    let area = document.getElementById('map-area');
    let container = document.getElementById('game-container');
    
    // Asumsi: currentMapW dan currentMapH adalah variabel global
    currentMapW *= factor; 
    currentMapH *= factor;
    
    // Sesuaikan batas minimal untuk layar HP (misal: 400x150)
    if (currentMapW < 400) currentMapW = 400;
    if (currentMapH < 150) currentMapH = 150;
    if (currentMapW > 4000) currentMapW = 4000;
    if (currentMapH > 1500) currentMapH = 1500;
    
    area.style.width = currentMapW + 'px'; 
    area.style.height = currentMapH + 'px';

    // Sesuaikan posisi scroll agar tidak melompat jauh ke ujung
    if(factor > 1) {
        container.scrollLeft += (container.clientWidth * 0.1);
        container.scrollTop += (container.clientHeight * 0.1);
    } else {
        container.scrollLeft -= (container.clientWidth * 0.1);
        container.scrollTop -= (container.clientHeight * 0.1);
    }
};

loadJadwalAndInit();