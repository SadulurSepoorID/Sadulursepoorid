// --- ISI INFORMASI INI ---
const GITHUB_USERNAME = 'SadulurSepoorID';
const GITHUB_REPO_NAME = 'Sadulursepoorid';
const GITHUB_ACCESS_TOKEN = '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';
// -------------------------

const fileInput = document.getElementById('file-input');
const newFileNameInput = document.getElementById('new-file-name');
const uploadIndicator = document.getElementById('loading-indicator');
const resultContainer = document.getElementById('result-container');
const resultUrl = document.getElementById('result-url');
const actionContainer = document.getElementById('action-container');
const actionDropdown = document.getElementById('action-dropdown');
const renameContainer = document.getElementById('rename-container');
const uploadText = document.getElementById('upload-text');
const startUploadButton = document.getElementById('start-upload-button');

let uploadedFile = null;

// Tampilkan dropdown setelah file dipilih
fileInput.addEventListener('change', (event) => {
    uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    uploadText.textContent = `File dipilih: ${uploadedFile.name}`;
    actionContainer.style.display = 'block';
    
    // Reset dropdown dan input
    actionDropdown.value = '';
    renameContainer.style.display = 'none';
    startUploadButton.style.display = 'none';
});

// Listener untuk dropdown
actionDropdown.addEventListener('change', (event) => {
    const action = event.target.value;
    if (action === 'custom') {
        renameContainer.style.display = 'block';
    } else if (action === 'continue') {
        // Langsung mulai upload dengan nama asli
        startUpload(uploadedFile);
    }
});

// Listener untuk input teks, tampilkan tombol "Lanjutkan"
newFileNameInput.addEventListener('input', () => {
    if (newFileNameInput.value.trim() !== '') {
        startUploadButton.style.display = 'block';
    } else {
        startUploadButton.style.display = 'none';
    }
});

// Listener untuk tombol "Lanjutkan" setelah custom nama
startUploadButton.addEventListener('click', () => {
    startUpload(uploadedFile);
});


// Fungsi untuk memulai proses upload
async function startUpload(file) {
    if (!file) return;

    // Ambil nama file baru, jika ada
    let fileName = newFileNameInput.value.trim();
    const originalFileName = file.name;
    const fileExtension = originalFileName.split('.').pop();
    
    // Jika tidak ada nama baru, gunakan nama asli
    if (!fileName) {
        fileName = originalFileName;
    } else {
        // Jika ada nama baru, tambahkan ekstensi file
        fileName = `${fileName}.${fileExtension}`;
    }

    // Tampilkan indikator loading
    uploadIndicator.style.display = 'block';
    resultContainer.style.display = 'none';
    actionContainer.style.display = 'none'; // Sembunyikan dropdown saat mengunggah

    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64Content = reader.result.split(',')[1];
        
        const apiUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO_NAME}/contents/IMG/public/${fileName}`;
        const data = {
            message: `Upload ${fileName}`,
            content: base64Content
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            uploadIndicator.style.display = 'none'; // Sembunyikan loading

            if (response.ok) {
                const githubPagesUrl = `https://sadulursepoor.web.id/IMG/public/${fileName}`;
                
                resultUrl.textContent = githubPagesUrl;
                resultContainer.style.display = 'block';
                console.log('Gambar berhasil diunggah. URL:', githubPagesUrl);

            } else {
                const errorData = await response.json();
                resultUrl.textContent = `Gagal mengunggah. Error: ${errorData.message || 'Unknown error'}`;
                resultContainer.style.display = 'block';
                console.error('Gagal mengunggah gambar:', errorData);
            }
        } catch (error) {
            uploadIndicator.style.display = 'none';
            resultUrl.textContent = 'Terjadi kesalahan. Cek konsol browser.';
            resultContainer.style.display = 'block';
            console.error('Error saat koneksi ke API:', error);
        }
    };
    reader.readAsDataURL(file);
}

function copyUrl() {
    const urlText = document.getElementById('result-url').textContent;
    navigator.clipboard.writeText(urlText).then(() => {
        alert('URL berhasil disalin!');
    }).catch(err => {
        alert('Gagal menyalin URL. Silakan salin manual.');
        console.error('Copy failed:', err);
    });
}