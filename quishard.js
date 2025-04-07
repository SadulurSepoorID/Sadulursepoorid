const questions = [
    {
        question: "Apa nama sistem persinyalan modern yang digunakan pada jalur kereta cepat?",
        options: [
            "Block Signaling",
            "ETCS (European Train Control System)",
            "Interlocking",
            "Mechanical Signaling"
        ],
        correct: 1 // Indeks jawaban benar (B)
    },
    {
        question: "Apa nama kereta api yang melayani rute Jakarta–Yogyakarta dengan kelas eksekutif?",
        options: [
            "Taksaka",
            "Bima",
            "Argo Dwipangga",
            "Argo Parahyangan"
        ],
        correct: 0 // Indeks jawaban benar (A)
    },
    {
        question: "Jenis rem yang umum digunakan pada kereta api di Indonesia adalah?",
        options: [
            "Rem Tromol",
            "Rem Hidrolik",
            "Rem Cakram",
            "Rem Udara (Air Brake)"
        ],
        correct: 3 // Indeks jawaban benar (D)
    },
    {
        question: "Apa tujuan utama dari sistem persinyalan kereta api?",
        options: [
            "Meningkatkan kecepatan",
            "Mengatur jadwal kereta",
            "Mencegah kecelakaan antar kereta",
            "Mengurangi konsumsi bahan bakar"
        ],
        correct: 2 // Indeks jawaban benar (C)
    },
    {
        question: "Pada jalur tunggal, bagaimana cara menentukan giliran kereta yang akan lewat?",
        options: [
            "Dengan kecepatan kereta",
            "Berdasarkan rambu darat",
            "Menggunakan sistem silang di stasiun tertentu",
            "Dengan mematikan sinyal kereta yang lebih lambat"
        ],
        correct: 2 // Indeks jawaban benar (C)
    },
    {
        question: "Berapa jumlah gandar pada lokomotif seri CC 206?",
        options: [
            "4",
            "6",
            "8",
            "12"
        ],
        correct: 1 // Indeks jawaban benar (B)
    },
    {
        question: "Berapa kapasitas maksimum penumpang pada kereta eksekutif 2023?",
        options: [
            "36 penumpang",
            "50 penumpang",
            "52 penumpang",
            "80 penumpang"
        ],
        correct: 2 // Indeks jawaban benar (C)
    },
    {
        question: "Stasiun mana yang berada di perbatasan Indonesia-Malaysia?",
        options: [
            "Stasiun Tanjung",
            "Stasiun Balai",
            "Stasiun Entikong",
            "Stasiun Lubuk Pakam"
        ],
        correct: 2 // Indeks jawaban benar (C)
    },
    {
        question: "Kereta barang di Indonesia biasa menggunakan lokomotif seri apa?",
        options: [
            "CC 203",
            "CC 204",
            "CC 205",
            "CC 206"
        ],
        correct: 3 // Indeks jawaban benar (D)
    },
    {
        question: "Apa fungsi dari balast pada rel kereta api?",
        options: [
            "Membantu mengurangi suara",
            "Menstabilkan rel dan bantalan",
            "Sebagai dekorasi jalur rel",
            "Sebagai penghalang air hujan"
        ],
        correct: 1 // Indeks jawaban benar (B)
    }
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