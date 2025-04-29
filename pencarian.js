function search() {
    const input = document.getElementById("searchInput").value.toLowerCase().trim();

    // Daftar kata negatif dan toxic
    const negatifWords = ["item", "negro", "kurus", "gendut", "islam", "kristen", "katholik", "budha", "hindu", "konghucu", "jawa", "jawir"];
    const toxicWords = ["anjing", "babi", "bangsat", "monyet", "tai", "kontol", "tolol", "tod", "tot", "bego", "bodoh", "kentot", "kntl", "memek", "mmk", "jembut", "jmbt", "ngentod", "ngentot", "ngntd","ngntt", "kentot", "itil", "pantat", "bool", "nete", "tt", "tete"];

    // Fungsi untuk memeriksa apakah input mengandung kata dari daftar
    function containsWord(input, words) {
        return words.some(word => input.includes(word));
    }

    // Pengecekan jika input kosong
    if (input === "") {
        alert("Silakan masukkan teks");
        return;
    }

    // Pengecekan kata negatif
    if (containsWord(input, negatifWords)) {
        alert("Kata tersebut mengandung hal negatif!!!");
        return;
    }

    // Pengecekan kata toxic
    if (containsWord(input, toxicWords)) {
        alert("MULUT DAN TANGAN ANDA KOTOR, KAYA GA PERNAH DI SEKOLAHIN!!!");
        return;
    }

    // Pengecekan khusus untuk input "sensus" atau "gapeka"
    if (input === "sensus") {
        window.location.href = "sensus2.html";
        return;
    }
    if (input === "gapeka") {
        window.location.href = "gapeka.html";
        return;
    }

    const sections = document.querySelectorAll(".section");
    let found = false;

    sections.forEach(section => {
        const content = section.innerText.toLowerCase();
        const keywords = section.getAttribute("data-keywords").toLowerCase();

        if (keywords.split(" ").includes(input) || content.includes(input)) {
            section.scrollIntoView({ behavior: "smooth", block: "center" });
            section.style.borderLeftColor = "#0056b3";
            setTimeout(() => {
                section.style.borderLeftColor = "#007BFF";
            }, 1000);
            found = true;
        }
    });

    if (!found) {
        window.location.href = "notfound.html";
    }
}

// Event listener untuk deteksi tombol Enter di input pencarian
document.getElementById("searchInput").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        search();
    }
});

// Event listener untuk setiap section untuk membuka halaman baru
document.querySelectorAll(".section").forEach(section => {
    section.addEventListener("click", () => {
        const url = section.getAttribute("data-url");
        if (url) {
            window.location.href = url;
        }
    });
});