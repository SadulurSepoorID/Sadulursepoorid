// Soal kuis
const questions = [
    { question: "Apa nama kereta dengan relasi Pasar Senen - Purwokerto yang hanya membawa kelas K3 (Ekonomi)?", options: ["Serayu", "Pandalungan", "Logawa", "Bengawan"], correct: 0 },
    { question: "KA Taksaka adalah Kereta api unggulan yang menghiasi lintas Gambir - Yogyakarta PP. Nama Taksaka diambil dari hewan apakah itu?", options: ["Harimau", "Banteng", "Naga", "Kucing"], correct: 2 },
    { question: "KA Bangunkarta mempunyai relasi Jombang - Pasar Senen PP. Membawa kelas apa saja KA Bangunkarta tersebut?", options: ["Full Ekonomi 106 TD", "Eksekutif - Ekonomi 80 TD", "Eksekutif - Bisnis", "Full Ekonomi 80 TD"], correct: 1 },
    { question: "Yang menjadi tempat pemberhentian KA Bengawan di Daop 3 adalah?", options: ["Cirebon Prujakan", "Cirebon Kejaksan", "Kroya", "Kutoarjo"], correct: 0 },
    { question: "Lokomotif CC206 adalah lokomotif diesel elektrik produksi General Electric Transportation, Amerika Serikat untuk Indonesia yang dimiliki dan dioperasikan oleh PT Kereta Api Indonesia. Julukan apa yang sering kamu dengar untuk lokomotif CC 206 tersebut?", options: ["Hidung miring", "Hidung Kotak", "Puongss", "Gajah Sumatera"], correct: 2 },
    { question: "Siapa nama Direkur Utama PT KAI (PERSERO) yang menjabat pada tahun 2020 - sekaerang?", options: ["Soekarno", "Didiek Hartantyo", "Ignasius Jonan", "Prabowo Subianto"], correct: 1 },
    { question: "Stasiun apa yang di jadikan Stasiun Sentral di Daop 1?", options: ["Jatinegara", "Manggarai", "Tanah Abang", "Pasar Senen"], correct: 1 },
    { question: "Apa nama kereta cepat pertama di Indonesia?", options: ["Argo Parahyangan", "Argo Bromo Anggrek", "KCIC Whosh", "Taksaka"], correct: 2 },
    { question: "Apa arti singkatan dari PT KAI?", options: ["Kereta Api Indonesia", "Kereta Api Internasional", "Kereta Api Institusi", "Koneksi Antar Indonesia"], correct: 0 },
    { question: "Berapa kecepatan maksimal KA Argo Bromo Anggrek?", options: ["90 km/jam", "100 km/jam", "120 km/jam", "150 km/jam"], correct: 2 }
];

// Variabel global
let shuffledQuestions = [];
let userAnswers = {};

// Acak soal dan pilihan jawaban
function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

// Generate kuis
function generateQuiz() {
    const quizDiv = document.getElementById("quiz");
    quizDiv.innerHTML = ""; // Bersihkan elemen kuis

    shuffledQuestions = shuffle([...questions]); // Acak soal

    shuffledQuestions.forEach((q, index) => {
        const questionBlock = document.createElement("div");
        questionBlock.classList.add("question-block");

        const questionText = document.createElement("p");
        questionText.classList.add("question");
        questionText.innerText = `${index + 1}. ${q.question}`;
        questionBlock.appendChild(questionText);

        const optionsList = document.createElement("ul");
        optionsList.classList.add("options");

        const shuffledOptions = shuffle([...q.options]); // Acak pilihan jawaban
        shuffledOptions.forEach((option, optionIndex) => {
            const optionItem = document.createElement("li");
            const radioInput = document.createElement("input");
            radioInput.type = "radio";
            radioInput.name = `q${index}`;
            radioInput.value = q.options.indexOf(option);

            const label = document.createElement("label");
            label.innerText = option;

            optionItem.appendChild(radioInput);
            optionItem.appendChild(label);
            optionsList.appendChild(optionItem);
        });

        questionBlock.appendChild(optionsList);
        quizDiv.appendChild(questionBlock);
    });

    // Tambahkan tombol kirim
    const submitButton = document.createElement("button");
    submitButton.innerText = "Kirim Jawaban";
    submitButton.onclick = submitQuiz;
    quizDiv.appendChild(submitButton);
}

function submitQuiz() {
    const quizDiv = document.getElementById("quiz");
    const inputs = quizDiv.querySelectorAll("input[type=radio]:checked");

    // Simpan jawaban pengguna
    inputs.forEach(input => {
        const qIndex = parseInt(input.name.replace("q", ""));
        userAnswers[qIndex] = parseInt(input.value);
    });

    // Hitung skor dan tampilkan hasil
    let score = 0;
    let resultHTML = "";
    shuffledQuestions.forEach((q, index) => {
        const isCorrect = userAnswers[index] === q.correct;
        if (isCorrect) score += 10;
        resultHTML += `<p>${index + 1}. ${q.question} - <span class="${isCorrect ? "correct" : "incorrect"}">${isCorrect ? "Benar" : "Salah"}</span></p>`;
    });

    // Sembunyikan kuis dan tampilkan hasil
    quizDiv.style.display = "none";
    const resultDiv = document.querySelector(".result");
    resultDiv.style.display = "block";
    document.getElementById("score").innerHTML = `Skor Anda: ${score} poin`;
    document.getElementById("resultDetails").innerHTML = resultHTML;

    // Nonaktifkan input dan tombol
    document.querySelectorAll("input[type=radio]").forEach(input => (input.disabled = true));
    document.querySelector("button[onclick='submitQuiz()']").disabled = true;
}

// Fungsi untuk kembali ke halaman weblogin.html
function goToLoginPage() {
    window.location.href = "levelquis.html";
}

// Deteksi jika pengguna meninggalkan halaman
window.addEventListener("blur", () => {
    sessionStorage.setItem("quizEnded", "true");
});

window.addEventListener("focus", () => {
    if (sessionStorage.getItem("quizEnded") === "true") {
        alert("Anda meninggalkan halaman kuis. Kuis akan dimulai ulang.");
        sessionStorage.clear();
        location.reload();
    }
});

// Pastikan halaman direset jika pengguna meninggalkan kuis
window.onload = function () {
    if (sessionStorage.getItem("quizEnded") === "true") {
        sessionStorage.clear();
        alert("Kuis telah dimulai ulang karena Anda meninggalkan halaman.");
    }
    generateQuiz();
};