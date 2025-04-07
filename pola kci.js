const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const clearButton = document.getElementById("clearButton");
const resultContainer = document.getElementById("resultContainer");
const backButton = document.getElementById("backButton");
const descriptionContainer = document.getElementById("descriptionContainer");

function searchKA() {
  const query = searchInput.value.trim().toUpperCase(); // Ubah input jadi huruf besar semua
  resultContainer.innerHTML = "";

  if (query === "") return;

  // Sembunyikan deskripsi
  descriptionContainer.style.display = "none";

  const results = data.filter((item) => 
    item.nomorKA.toUpperCase().split("-").some(nomor => nomor.startsWith(query))
  );

  if (results.length > 0) {
    results.forEach((result) => {
      const patternArray = result.nomorKA.toUpperCase().split("-");
      const matchedNumbers = patternArray.filter(nomor => nomor.startsWith(query));

      matchedNumbers.forEach((matchedQuery) => {
        const highlightedKA = `<span class="highlight">${matchedQuery}</span>`;
        const relasiKA = result.relasi[matchedQuery] ? result.relasi[matchedQuery] : "Relasi tidak tersedia";

        const detailColumn = `
          <div class="result-column">
            <h2>Detail Nomor KA</h2>
            <p><strong>Nomor KA:</strong> ${highlightedKA}</p>
            <p><strong>Relasi:</strong> ${relasiKA}</p>
            <p><strong>Depo:</strong> ${result.depo}</p>
            <p><strong>Stabling:</strong> ${result.stabling}</p>
            <p><strong>Rangkaian:</strong> ${result.rangkaian}</p>
          </div>
        `;

        let polaDinasContent = "<h2>Pola Dinas</h2>";
        patternArray.forEach((nomorKA) => {
          const relasi = result.relasi[nomorKA] ? result.relasi[nomorKA] : "Relasi tidak tersedia";
          polaDinasContent += `<p>${nomorKA}: ${relasi}</p>`;
        });

        const polaDinasColumn = `
          <div class="result-column">
            ${polaDinasContent}
          </div>
        `;

        resultContainer.innerHTML += detailColumn + polaDinasColumn;
      });
    });
  } else {
    resultContainer.innerHTML = `<p>Tidak ditemukan nomor KA yang sesuai.</p>`;
  }
}

function resetView() {
  if (searchInput.value.trim() === "") {
    descriptionContainer.style.display = "block";
    resultContainer.innerHTML = "";
  }
}

searchButton.addEventListener("click", searchKA);
searchInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    searchKA();
  }
});
searchInput.addEventListener("input", resetView);
clearButton.addEventListener("click", () => {
  searchInput.value = "";
  resultContainer.innerHTML = "";
  descriptionContainer.style.display = "block";
});
backButton.addEventListener("click", () => {
  window.location.href = "pencarian.html";
});
