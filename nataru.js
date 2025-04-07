const trainData = [
    {
        nama: "Argo Cheribon",
        nomor: "29F",
        relasi: "Cirebon - Gambir",
        trainset: "6k1-4k3ng(72td)-1m1-1p",
        keberangkatan: "Cirebon",
        kedatangan: "Gambir",
        jamKeberangkatan: "20:00",
        jamKedatangan: "22:57"
    },
    {
        nama: "Argo Cheribon",
        nomor: "30F",
        relasi: "Gambir - Cirebon",
        trainset: "6k1-4k3ng(72td)-1m1-1p",
        keberangkatan: "Gambir",
        kedatangan: "Cirebon",
        jamKeberangkatan: "23:30",
        jamKedatangan: "02:30"
    },
    {
        nama: "Argo Parahyangan",
        nomor: "47",
        relasi: "Bandung - Gambir",
        trainset: "4k1ss-4k3ss-1m1-1p",
        keberangkatan: "Bandung",
        kedatangan: "Gambir",
        jamKeberangkatan: "08:45",
        jamKedatangan: "11:52"
    },
    {
        nama: "Argo Parahyangan",
        nomor: "48",
        relasi: "Gambir - Bandung",
        trainset: "4k1ss-4k3ss-1m1-1p",
        keberangkatan: "Gambir",
        kedatangan: "Bandung",
        jamKeberangkatan: "12:30",
        jamKedatangan: "15:25"
    },
    {
        nama: "Argo Parahyangan",
        nomor: "7045B",
        relasi: "Bandung - Gambir",
        trainset: "ts Argo Wilis (Pano LD)",
        keberangkatan: "Bandung",
        kedatangan: "Gambir",
        jamKeberangkatan: "19:05",
        jamKedatangan: "21:49"
    },
    {
        nama: "Argo Parahyangan",
        nomor: "7046A",
        relasi: "Gambir - Bandung",
        trainset: "ts Argo Wilis (Pano LD)",
        keberangkatan: "Gambir",
        kedatangan: "Bandung",
        jamKeberangkatan: "22:15",
        jamKedatangan: "01:00"
    },
    {
        nama: "Manahan",
        nomor: "79F",
        relasi: "Solo - Gambir",
        trainset: "10k1ss-1m1-1p",
        keberangkatan: "Solo Balapan",
        kedatangan: "Pasar Senen",
        jamKeberangkatan: "09:45",
        jamKedatangan: "18:03"
    },
    {
        nama: "Manahan",
        nomor: "80F",
        relasi: "Solo - Gambir",
        trainset: "10k1ss-1m1-1p",
        keberangkatan: "Solo Balapan",
        kedatangan: "Gambir",
        jamKeberangkatan: "10:30",
        jamKedatangan: "18:30"
    },
    {
        nama: "Manahan",
        nomor: "81F",
        relasi: "Solo - Gambir",
        trainset: "10k1ss-1m1-1p",
        keberangkatan: "Solo Balapan",
        kedatangan: "Pasar Senen",
        jamKeberangkatan: "22:35",
        jamKedatangan: "06:36"
    },
    {
        nama: "Manahan",
        nomor: "82F",
        relasi: "Gambir - Solo",
        trainset: "10k1ss-1m1-1p",
        keberangkatan: "Gambir",
        kedatangan: "Solo Balapan",
        jamKeberangkatan: "22:50",
        jamKedatangan: "06:55"
    },
    {
        nama: "Arjuno",
        nomor: "83F",
        relasi: "Surabaya Gubeng - Malang",
        trainset: "ts Brawijaya",
        keberangkatan: "Surabaya Gubeng",
        kedatangan: "Malang",
        jamKeberangkatan: "09:35",
        jamKedatangan: "11:37"
    },
    {
        nama: "Arjuno",
        nomor: "84F",
        relasi: "Malang - Surabaya Gubeng",
        trainset: "ts Brawijaya",
        keberangkatan: "Malang",
        kedatangan: "Surabaya Gubeng",
        jamKeberangkatan: "09:25",
        jamKedatangan: "07:27"
    },
    {
        nama: "Sancaka Fak",
        nomor: "101F",
        relasi: "Surabaya Gubeng - Yogyakarta",
        trainset: "ts reguler datangan 100",
        keberangkatan: "Surabaya Gubeng",
        kedatangan: "Yogyakarta",
        jamKeberangkatan: "22:00",
        jamKedatangan: "02:00"
    },
    {
        nama: "Sancaka Fak",
        nomor: "102F",
        relasi: "Yogyakarta - Surabaya Gubeng",
        trainset: "ts reguler datangan 97A",
        keberangkatan: "Yogyakarta",
        kedatangan: "Surabaya Gubeng",
        jamKeberangkatan: "22:15",
        jamKedatangan: "02:15"
    },
    {
        nama: "Malioboro",
        nomor: "153F",
        relasi: "Malang - Purwokerto",
        trainset: "4k1-4k3ni-1m1-1p",
        keberangkatan: "Malang",
        kedatangan: "Purwokerto",
        jamKeberangkatan: "21:10",
        jamKedatangan: "06:00"
    },
    {
        nama: "Malioboro",
        nomor: "154F",
        relasi: "Purwokerto - Malang",
        trainset: "4k1-4k3ni-1m1-1p",
        keberangkatan: "Purwokerto",
        kedatangan: "Malang",
        jamKeberangkatan: "07:00",
        jamKedatangan: "16:14 "
    },
    {
        nama: "Kaligung",
        nomor: "199F",
        relasi: "Semarang - Tegal",
        trainset: "ts reguler datangan 198",
        keberangkatan: "Semarang",
        kedatangan: "Tegal",
        jamKeberangkatan: "19:40",
        jamKedatangan: "21;45"
    },
    {
        nama: "Kaligung",
        nomor: "200F",
        relasi: "Tegal - Semarang",
        trainset: "ts reguler datangan 197",
        keberangkatan: "Tegal",
        kedatangan: "Semarang",
        jamKeberangkatan: "20:30",
        jamKedatangan: "22:40"
    },
    {
        nama: "Yogya Nataru Ekse",
        nomor: "7001B",
        relasi: "Yogyakarta - Gambir",
        trainset: "10k1-1m1-1p",
        keberangkatan: "Yogyakarta",
        kedatangan: "Gambir",
        jamKeberangkatan: "",
        jamKedatangan: ""
    },
    {
        nama: "Yogya Nataru Ekse",
        nomor: "7002B",
        relasi: "Gambir - Yogyakarta",
        trainset: "10k1-1m1-1p",
        keberangkatan: "Gambir",
        kedatangan: "Yogyakarta",
        jamKeberangkatan: "",
        jamKedatangan: ""
    },
    {
        nama: "Yogya Nataru Ekse",
        nomor: "7003B",
        relasi: "Yogyakarta - Gambir",
        trainset: "10k1ss-1m1-1p",
        keberangkatan: "Yogyakarta",
        kedatangan: "Gambir",
        jamKeberangkatan: "",
        jamKedatangan: ""
    },
    {
        nama: "Yogya Nataru Ekse",
        nomor: "7004B",
        relasi: "Gambir - Yogyakarta",
        trainset: "10k1ss-1m1-1p",
        keberangkatan: "Gambir",
        kedatangan: "Yogyakarta",
        jamKeberangkatan: "",
        jamKedatangan: ""
    },
    {
        nama: "Gajayana Nataru",
        nomor: "7005",
        relasi: "Malang - Gambir",
        trainset: "8k1-1m1-1p",
        keberangkatan: "Malang",
        kedatangan: "Gambir",
        jamKeberangkatan: "18:10",
        jamKedatangan: "07:56"
    },
    {
        nama: "Gajayana Nataru",
        nomor: "7006B",
        relasi: "Gambir - Malang",
        trainset: "8k1-1m1-1p",
        keberangkatan: "Gambir",
        kedatangan: "Malang",
        jamKeberangkatan: "22:40",
        jamKedatangan: "12:35"
    },
    {
        nama: "Sembrani Nataru",
        nomor: "7007A",
        relasi: "Surabaya Pasarturi - Gambir",
        trainset: "8k1-1m1-1p",
        keberangkatan: "Surabaya Pasarturi",
        kedatangan: "Gambir",
        jamKeberangkatan: "05:45",
        jamKedatangan: "15:45"
    },
    {
        nama: "Sembrani Nataru",
        nomor: "7008A",
        relasi: "Gambir - Surabaya Pasarturi",
        trainset: "8k1-1m1-1p",
        keberangkatan: "Gambir",
        kedatangan: "Surabaya Pasarturi",
        jamKeberangkatan: "14:30",
        jamKedatangan: "00:37"
    },
    {
        nama: "Sembrani Nataru",
        nomor: "7009A",
        relasi: "Surabaya Pasarturi - Gambir",
        trainset: "8k1ss-1m1-1p",
        keberangkatan: "Surabaya Pasarturi",
        kedatangan: "Gambir",
        jamKeberangkatan: "12:40",
        jamKedatangan: "21:22"
    },
    {
        nama: "Sembrani Nataru",
        nomor: "7010A",
        relasi: "Gambir - Surabaya Pasarturi",
        trainset: "8k1ss-1m1-1p",
        keberangkatan: "Gambir",
        kedatangan: "Surabaya Pasarturi",
        jamKeberangkatan: "00:05",
        jamKedatangan: "08:43"
    },
    {
        nama: "Solo Nataru Gambir",
        nomor: "7015B",
        relasi: "Solo - Gambir",
        trainset: "9k1-1m1-1p",
        keberangkatan: "Solo Balapan",
        kedatangan: "Gambir",
        jamKeberangkatan: "21:50",
        jamKedatangan: "06:48"
    },
    {
        nama: "Solo Nataru Gambir",
        nomor: "7016B",
        relasi: "Gambir - Solo",
        trainset: "9k1-1m1-1p",
        keberangkatan: "Gambir",
        kedatangan: "Solo Balapan",
        jamKeberangkatan: "11:55",
        jamKedatangan: "20:17"
    },
    {
        nama: "Solo Nataru Bandung",
        nomor: "7021C",
        relasi: "Solo - Bandung",
        trainset: "4k1ss-4k3ss-1m1-1p",
        keberangkatan: "Solo Balapan",
        kedatangan: "Bandung",
        jamKeberangkatan: "09:10",
        jamKedatangan: "19:03"
    },
    {
        nama: "Solo Nataru Bandung",
        nomor: "7024C",
        relasi: "Bandung - Solo",
        trainset: "4k1ss-4k3ss-1m1-1p",
        keberangkatan: "Bandung",
        kedatangan: "Solo Balapan",
        jamKeberangkatan: "10:25",
        jamKedatangan: "19:24"
    },
    {
        nama: "Solo Nataru Bandung",
        nomor: "7023C",
        relasi: "Solo - Bandung",
        trainset: "4k1ss-4k3ss-1m1-1p",
        keberangkatan: "Solo Balapan",
        kedatangan: "Bandung",
        jamKeberangkatan: "20:40",
        jamKedatangan: "05:05"
    },
    {
        nama: "Solo Nataru Bandung",
        nomor: "7022C",
        relasi: "Bandung - Solo",
        trainset: "4k1ss-4k3ss-1m1-1p",
        keberangkatan: "Bandung",
        kedatangan: "Solo Balapan",
        jamKeberangkatan: "22:22",
        jamKedatangan: "07:50"
    },
    {
        nama: "Argo Merbabu Nataru",
        nomor: "7026A",
        relasi: "Semarang Tawang - Gambir",
        trainset: "10k1ni-1m1-1p",
        keberangkatan: "Semarang Tawang",
        kedatangan: "Gambir",
        jamKeberangkatan: "22:00",
        jamKedatangan: "06:00"
    }, //
    {
        nama: "Argo Merbabu Nataru",
        nomor: "7025A",
        relasi: "Gambir - Semarang Tawang",
        trainset: "10k1ni-1m1-1p",
        keberangkatan: "Gambir",
        kedatangan: "Semarang Tawang",
        jamKeberangkatan: "23:00",
        jamKedatangan: "07:30"
    },//x
    {
        nama: "Brantas Nataru",
        nomor: "7031A",
        relasi: "Blitar - Pasar Senen",
        trainset: "4k2-4k3split-1kmp3",
        keberangkatan: "Blitar",
        kedatangan: "Pasar Senen",
        jamKeberangkatan: "08:15",
        jamKedatangan: "21:25"
    },
    {
        nama: "Brantas Nataru",
        nomor: "7032A",
        relasi: "Pasar Senen - Blitar",
        trainset: "4k2-4k3split-1kmp3",
        keberangkatan: "Pasar Senen",
        kedatangan: "Blitar",
        jamKeberangkatan: "12:10",
        jamKedatangan: "02:15"
    },
    {
        nama: "Kertajaya Nataru",
        nomor: "7033A",
        relasi: "Surabaya Pasarturi - Pasar Senen",
        trainset: "4k2-4k3split-1kmp3",
        keberangkatan: "Surabaya Pasarturi",
        kedatangan: "Pasar Senen",
        jamKeberangkatan: "20:40",
        jamKedatangan: "08:06"
    },
    {
        nama: "Kertajaya Nataru",
        nomor: "7034",
        relasi: "Pasar Senen - Surabaya Pasarturi",
        trainset: "4k2-4k3split-1kmp3",
        keberangkatan: "Pasar Senen",
        kedatangan: "Surabaya Pasarturi",
        jamKeberangkatan: "05:15",
        jamKedatangan: "16:45"
    },
    {
        nama: "Ekonomi Kiaracondong Gubeng Nataru",
        nomor: "7035C",
        relasi: "Kiaracondong - Surabaya Gubeng",
        trainset: "7k3split-1kmp3",
        keberangkatan: "Kiaracondong",
        kedatangan: "Surabaya Gubeng",
        jamKeberangkatan: "07:35",
        jamKedatangan: "23:10"
    },
    {
        nama: "Ekonomi Kiaracondong Gubeng Nataru",
        nomor: "7036C",
        relasi: "Surabaya Gubeng - Kiaracondong",
        trainset: "7k3split-1kmp3",
        keberangkatan: "Surabaya Gubeng",
        kedatangan: "Kiaracondong",
        jamKeberangkatan: "09:10",
        jamKedatangan: "22:55"
    },
    {
        nama: "Kutojaya Utara Nataru",
        nomor: "7037A",
        relasi: "Kutoarjo - Pasar Senen",
        trainset: "8k3(80td)-1mp2",
        keberangkatan: "Kutoarjo",
        kedatangan: "Pasar Senen",
        jamKeberangkatan: "21:50",
        jamKedatangan: "06:18"
    },
    {
        nama: "Kutojaya Utara Nataru",
        nomor: "7038A",
        relasi: "Pasar Senen - Kutoarjo",
        trainset: "8k3(80td)-1mp2",
        keberangkatan: "Pasar Senen",
        kedatangan: "Kutoarjo",
        jamKeberangkatan: "11:10",
        jamKedatangan: "19:20"
    },
    {
        nama: "Kutojaya Selatan Nataru",
        nomor: "7039A",
        relasi: "Kutoarjo - Kiaracondong",
        trainset: "7k3split-1kmp2",
        keberangkatan: "Kutoarjo",
        kedatangan: "Kiaracondong",
        jamKeberangkatan: "08:30",
        jamKedatangan: "16:43"
    },
    {
        nama: "Kutojaya Selatan Nataru",
        nomor: "7040",
        relasi: "Kiaracondong - Kutoarjo",
        trainset: "7k3split-1kmp2",
        keberangkatan: "Kiaracondong",
        kedatangan: "Kutoarjo",
        jamKeberangkatan: "20:50",
        jamKedatangan: "03:55"
    },
    {
        nama: "Purwojaya Nataru",
        nomor: "7044",
        relasi: "Cilacap - Gambir",
        trainset: "9k1-1m1-1p",
        keberangkatan: "Cilacap",
        kedatangan: "Gambir",
        jamKeberangkatan: "15:25",
        jamKedatangan: "22:13"
    },
    {
        nama: "Purwojaya Nataru",
        nomor: "7041B",
        relasi: "Gambir - Cilacap",
        trainset: "9k1-1m1-1p",
        keberangkatan: "Gambir",
        kedatangan: "Cilacap",
        jamKeberangkatan: "07:30",
        jamKedatangan: "14:25"
    },
    {
        nama: "Yogya EKSTRA Nataru Java Priority",
        nomor: "KP/10554",
        relasi: "Gambir - Yogyakarta",
        trainset: "5priority-1retro-2imperial-1p",
        keberangkatan: "Gambir",
        kedatangan: "Yogyakarta",
        jamKeberangkatan: "12:45",
        jamKedatangan: "20:25"
    },
    {
        nama: "Yogya EKSTRA Nataru Java Priority",
        nomor: "KP/10555",
        relasi: "Yogyakarta - Gambir",
        trainset: "5priority-1retro-2imperial-1p",
        keberangkatan: "Yogyakarta",
        kedatangan: "Gambir",
        jamKeberangkatan: "23:40",
        jamKedatangan: "07:10"
    },
    {
        nama: "Motis Nataru",
        nomor: "KP/10856",
        relasi: "Kampung Bandan - Lempuyangan",
        trainset: "5k3split-1kmp3-4b",
        keberangkatan: "Kampung Bandan",
        kedatangan: "Lempuyangan",
        jamKeberangkatan: "04:35",
        jamKedatangan: "12:25"
    },
    {
        nama: "Motis Nataru",
        nomor: "KP/10855",
        relasi: "Lempuyangan - Kampung Bandan",
        trainset: "5k3split-1kmp3-4b",
        keberangkatan: "Lempuyangan",
        kedatangan: "Kampung Bandan",
        jamKeberangkatan: "15:20",
        jamKedatangan: "23:15"
    }
];

const trainList = document.getElementById("train-list");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");

function calculateDuration(start, end) {
    const startTime = new Date(`1970-01-01T${start}`);
    const endTime = new Date(`1970-01-01T${end}`);
    const duration = new Date(endTime - startTime);
    const hours = duration.getUTCHours();
    const minutes = duration.getUTCMinutes();
    return `${hours} jam ${minutes} menit`;
}

function renderTrains(data) {
    trainList.innerHTML = '';
    data.forEach(train => {
        const duration = calculateDuration(train.jamKeberangkatan, train.jamKedatangan);
        const trainDiv = document.createElement("div");
        trainDiv.className = "train";

        const trainDetails = `
            <h2>${train.nama} - ${train.nomor}</h2>
            <ul>
                <li><span>Relasi:</span> ${train.relasi}</li>
                <li><span>Trainset:</span> ${train.trainset || "N/A"}</li>
                <li><span>Jam Keberangkatan (${train.keberangkatan}):</span> ${train.jamKeberangkatan || "N/A"}</li>
                <li><span>Jam Kedatangan (${train.kedatangan}):</span> ${train.jamKedatangan || "N/A"}</li>
                <li><span>Waktu Tempuh:</span> ${duration}</li>
            </ul>
        `;

        trainDiv.innerHTML = trainDetails;
        trainList.appendChild(trainDiv);
    });
}

function searchTrains() {
    const query = searchInput.value.toLowerCase();
    const filteredData = trainData.filter(train => {
        return train.nama.toLowerCase().includes(query) ||
               train.nomor.toLowerCase().includes(query) ||
               train.relasi.toLowerCase().includes(query);
    });
    renderTrains(filteredData);
}

function sortTrains() {
    const criteria = sortSelect.value;
    let sortedData = [...trainData];

    if (criteria === 'nama-asc') {
        sortedData.sort((a, b) => a.nama.localeCompare(b.nama));
    } else if (criteria === 'nama-desc') {
        sortedData.sort((a, b) => b.nama.localeCompare(a.nama));
    } else if (criteria === 'nomor-asc') {
        sortedData.sort((a, b) => a.nomor.localeCompare(b.nomor));
    } else if (criteria === 'tercepat') {
        sortedData.sort((a, b) => {
            const durA = new Date(`1970-01-01T${a.jamKedatangan}`) - new Date(`1970-01-01T${a.jamKeberangkatan}`);
            const durB = new Date(`1970-01-01T${b.jamKedatangan}`) - new Date(`1970-01-01T${b.jamKeberangkatan}`);
            return durA - durB;
        });
    } else if (criteria === 'terlama') {
        sortedData.sort((a, b) => {
            const durA = new Date(`1970-01-01T${a.jamKedatangan}`) - new Date(`1970-01-01T${a.jamKeberangkatan}`);
            const durB = new Date(`1970-01-01T${b.jamKedatangan}`) - new Date(`1970-01-01T${b.jamKeberangkatan}`);
            return durB - durA;
        });
    } else if (criteria === 'keberangkatan-terawal') {
        sortedData.sort((a, b) => new Date(`1970-01-01T${a.jamKeberangkatan}`) - new Date(`1970-01-01T${b.jamKeberangkatan}`));
    } else if (criteria === 'keberangkatan-terakhir') {
        sortedData.sort((a, b) => new Date(`1970-01-01T${b.jamKeberangkatan}`) - new Date(`1970-01-01T${a.jamKeberangkatan}`));
    } else if (criteria === 'kedatangan-terawal') {
        sortedData.sort((a, b) => new Date(`1970-01-01T${a.jamKedatangan}`) - new Date(`1970-01-01T${b.jamKedatangan}`));
    } else if (criteria === 'kedatangan-terakhir') {
        sortedData.sort((a, b) => new Date(`1970-01-01T${b.jamKedatangan}`) - new Date(`1970-01-01T${a.jamKedatangan}`));
    }

    renderTrains(sortedData);
}

searchInput.addEventListener('input', searchTrains);
sortSelect.addEventListener('change', sortTrains);

// Initial render
renderTrains(trainData);