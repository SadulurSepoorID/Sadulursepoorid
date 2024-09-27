<?php
// Inisialisasi koneksi ke API QRIS Anda
$api_url = "https://api.qrisprovider.com/generate"; // Ganti dengan URL API QRIS Anda
$api_key = "YOUR_API_KEY"; // Ganti dengan API Key Anda

// Data pembayaran
$data = [
    'amount' => '100000', // Jumlah pembayaran
    'description' => 'Pembelian Produk 1',
    'merchant' => 'YOUR_MERCHANT_ID', // ID merchant Anda
];

// Mengubah data menjadi JSON
$json_data = json_encode($data);

// Inisialisasi cURL
$ch = curl_init($api_url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
curl_setopt($ch, CURLOPT_POSTFIELDS, $json_data);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $api_key,
]);

// Eksekusi cURL dan simpan hasilnya
$response = curl_exec($ch);
curl_close($ch);

// Decode response
$response_data = json_decode($response, true);

// Ambil URL QR Code
$qr_code_url = $response_data['qr_code_url']; // Ganti dengan field yang sesuai dari response API

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QRIS Payment</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            text-align: center;
            padding: 50px;
        }
        img {
            max-width: 300px;
        }
    </style>
</head>
<body>

<h1>Pembayaran QRIS</h1>
<p>Silakan pindai QR Code di bawah untuk menyelesaikan pembayaran.</p>
<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://i.imgur.com/FYf0h9a.jpeg" alt="QR Code">
<p>Jumlah: Rp 100.000</p>

</body>
</html>