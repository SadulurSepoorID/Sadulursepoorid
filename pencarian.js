function search() {
    const input = document.getElementById("searchInput").value.toLowerCase().trim();

    // Pengecekan jika input kosong
    if (input === "") {
        alert("Silakan masukkan teks");
        return; // Menghentikan fungsi agar tidak melanjutkan proses pencarian
    }

    // Pengecekan khusus untuk input yang hanya "sensus"
    if (input === "sensus") {
        window.location.href = "sensus3.html";
        return;
    }
    if (input === "gapeka") {
        window.location.href = "gapeka.html";
        return;
    }
    const sections = document.querySelectorAll(".section");
    let found = false;

    sections.forEach(section => {
        // Ambil teks dan kata kunci dari setiap section
        const content = section.innerText.toLowerCase();
        const keywords = section.getAttribute("data-keywords").toLowerCase();

        // Pastikan input cocok persis dengan teks section atau dengan kata kunci
        if (keywords.split(" ").includes(input) || content.includes(input)) {
            section.scrollIntoView({ behavior: "smooth", block: "center" });
            section.style.borderLeftColor = "#0056b3";
            setTimeout(() => {
                section.style.borderLeftColor = "#007BFF";
            }, 1000);
            found = true;
        }
    });

    // Jika tidak ada section yang cocok, alihkan ke halaman not found
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