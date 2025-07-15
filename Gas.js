const SHEET_NAME = 'Sheet1';  // Ganti jika sheet kamu namanya berbeda
const MAX_PARTICIPANTS = 25;  // Limit maksimal peserta

// KONFIGURASI EMAIL
const EMAIL_CONFIG = {
  subject: 'Konfirmasi Kehadiran - Sosialisasi',
  senderName: 'Sosialisasi', // Ganti dengan nama pengirim yang diinginkan
  replyTo: 'sadulursepoor@gmail.com', // Ganti dengan email reply-to yang sesuai
  thankYouSubject: 'Terima Kasih - Kehadiran Dikonfirmasi', // Subject untuk email terima kasih
  emailUpdateSubject: 'Email Berhasil Diperbarui - Konfirmasi Kehadiran' // Subject untuk email update
};

function doGet(e) {
  try {
    console.log('doGet called with parameters:', e.parameter);
    
    const action = e.parameter ? e.parameter.action : null;

    if (action === 'getAllData') {
      const result = getAllData();
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'updateStatus') {
      return updateStatus(e);
    } else if (action === 'deleteData') {
      return deleteData(e);
    } else if (action === 'checkLimit') {
      return checkParticipantLimit();
    } else if (action === 'getAttendanceStatus') {
      return getAttendanceStatus();
    } else if (action === 'updateStatusByNIA') {
      // Endpoint baru untuk update status berdasarkan NIA dari scan barcode
      return updateStatusByNIA(e.parameter.nia, e.parameter.status || 'Setuju');
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "GET request received successfully"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in doGet:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Error in doGet: " + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    console.log('doPost called');
    console.log('e.parameter:', e.parameter);
    console.log('e.postData:', e.postData);
    
    // Handle updateEmail action
    if (e.parameter && e.parameter.action === 'updateEmail') {
      return updateEmail(e);
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    // Inisialisasi header jika sheet kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Nama', 'NIA', 'Email', 'Kegiatan', 'Status']);
      console.log('Header added to sheet');
    }
    
    // Handle data dari form POST
    let data = {};
    
    if (e.parameter) {
      data = {
        nama: e.parameter.nama || '',
        nia: e.parameter.nia || '',
        email: e.parameter.email || '',
        kegiatan: e.parameter.kegiatan || ''
      };
    } else if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseError) {
        console.error('Failed to parse POST data:', parseError);
        return createErrorResponse("Data format tidak valid");
      }
    } else {
      console.error('No data received in POST request');
      return createErrorResponse("Tidak ada data yang diterima");
    }

    console.log('Processed data:', data);

    // Validasi data
    if (!data.nama || !data.nia || !data.email || !data.kegiatan) {
      console.error('Incomplete data:', data);
      return createErrorResponse("Data tidak lengkap! Pastikan semua field terisi.");
    }

    // Validasi format email
    if (!isValidEmail(data.email)) {
      console.error('Invalid email format:', data.email);
      return createErrorResponse("Format email tidak valid!");
    }

    // Cek apakah sudah mencapai limit
    const currentCount = sheet.getLastRow() - 1; // -1 untuk header
    console.log('Current participant count:', currentCount);
    
    if (currentCount >= MAX_PARTICIPANTS) {
      console.log('Registration full');
      return createErrorResponse(
        `Maaf, pendaftaran sudah penuh! Maksimal ${MAX_PARTICIPANTS} peserta.`,
        currentCount
      );
    }

    // Cek apakah nama sudah terdaftar
    if (currentCount > 0) {
      const existingData = sheet.getRange(2, 1, currentCount, 1).getValues();
      const existingNames = existingData.map(row => row[0]);
      console.log('Existing names:', existingNames);
      
      if (existingNames.includes(data.nama)) {
        console.log('Name already registered:', data.nama);
        return createErrorResponse(
          `${data.nama} sudah terdaftar sebelumnya!`,
          currentCount
        );
      }
    }

    // Cek apakah email sudah terdaftar
    if (currentCount > 0) {
      const existingEmails = sheet.getRange(2, 3, currentCount, 1).getValues();
      const emailList = existingEmails.map(row => row[0]);
      
      if (emailList.includes(data.email)) {
        console.log('Email already registered:', data.email);
        return createErrorResponse(
          `Email ${data.email} sudah terdaftar sebelumnya!`,
          currentCount
        );
      }
    }

    // Simpan data ke sheet dengan status 'Menunggu'
    sheet.appendRow([data.nama, data.nia, data.email, data.kegiatan, 'Menunggu']);
    console.log('Data added successfully with status "Menunggu":', data.nama);
    
    const newCount = currentCount + 1;

    // KIRIM EMAIL KONFIRMASI
    try {
      sendConfirmationEmail(data);
      console.log('Confirmation email sent to:', data.email);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Email gagal dikirim, tapi data sudah tersimpan - tidak perlu menghapus data
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Data berhasil disimpan dan email konfirmasi telah dikirim!",
      currentCount: newCount,
      remaining: MAX_PARTICIPANTS - newCount
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error in doPost:', error);
    return createErrorResponse("Terjadi kesalahan sistem: " + error.toString());
  }
}

// FUNGSI BARU UNTUK UPDATE EMAIL
function updateEmail(e) {
  try {
    console.log('updateEmail called with:', e.parameter);
    
    // Validasi parameter yang diperlukan
    if (!e.parameter || !e.parameter.nama || !e.parameter.nia || !e.parameter.email) {
      return createErrorResponse("Parameter tidak lengkap untuk update email");
    }
    
    const nama = e.parameter.nama;
    const nia = e.parameter.nia;
    const newEmail = e.parameter.email;
    const kegiatan = e.parameter.kegiatan || '';
    
    // Validasi format email
    if (!isValidEmail(newEmail)) {
      return createErrorResponse("Format email tidak valid!");
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    if (sheet.getLastRow() <= 1) {
      return createErrorResponse("Tidak ada data untuk diupdate");
    }
    
    // Cari data berdasarkan nama dan NIA
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
    let foundRow = -1;
    let userData = null;
    
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === nama && data[i][1] === nia) { // Nama dan NIA harus cocok
        foundRow = i + 2; // +2 karena dimulai dari row 2 (setelah header)
        userData = {
          nama: data[i][0],
          nia: data[i][1],
          oldEmail: data[i][2],
          kegiatan: data[i][3],
          status: data[i][4]
        };
        break;
      }
    }
    
    if (foundRow === -1) {
      return createErrorResponse(`Data dengan nama ${nama} dan NIA ${nia} tidak ditemukan`);
    }
    
    // Cek apakah email baru sudah digunakan oleh peserta lain
    const existingEmails = sheet.getRange(2, 3, sheet.getLastRow() - 1, 3).getValues();
    for (let i = 0; i < existingEmails.length; i++) {
      const rowIndex = i + 2;
      if (rowIndex !== foundRow && existingEmails[i][0] === newEmail) {
        return createErrorResponse(`Email ${newEmail} sudah digunakan oleh peserta lain!`);
      }
    }
    
    // Update email di spreadsheet
    sheet.getRange(foundRow, 3).setValue(newEmail); // Kolom 3 adalah email
    console.log('Email updated for:', nama, 'from:', userData.oldEmail, 'to:', newEmail);
    
    // Siapkan data lengkap untuk email konfirmasi
    const updatedUserData = {
      nama: userData.nama,
      nia: userData.nia,
      email: newEmail,
      kegiatan: userData.kegiatan,
      status: userData.status
    };
    
    // Kirim email konfirmasi ke email baru
    try {
      sendEmailUpdateConfirmation(updatedUserData, userData.oldEmail);
      console.log('Email update confirmation sent to:', newEmail);
    } catch (emailError) {
      console.error('Error sending email update confirmation:', emailError);
      // Email gagal dikirim, tapi update sudah berhasil
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: `Email berhasil diperbarui dari ${userData.oldEmail} ke ${newEmail}`,
      oldEmail: userData.oldEmail,
      newEmail: newEmail
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in updateEmail:', error);
    return createErrorResponse("Error updating email: " + error.toString());
  }
}

// FUNGSI UNTUK MENGIRIM EMAIL KONFIRMASI UPDATE EMAIL
function sendEmailUpdateConfirmation(userData, oldEmail) {
  try {
    console.log('Sending email update confirmation to:', userData.email);
    
    // Generate QR Code dengan NIA saja untuk scanning yang lebih mudah
    const qrData = userData.nia; // Hanya NIA untuk simplifikasi scanning
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
    
    // Template HTML untuk email konfirmasi update
    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #2b7de9; margin: 0; font-size: 24px; }
        .content { margin-bottom: 30px; }
        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .data-table th { background-color: #f8f9fa; font-weight: bold; color: #333; }
        .qr-section { text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; }
        .qr-section img { border: 2px solid #2b7de9; border-radius: 8px; }
        .important-note { background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px; padding: 15px; margin: 20px 0; }
        .email-change-note { background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 5px; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 Email Berhasil Diperbarui</h1>
          <p>Email Anda untuk kegiatan sosialisasi telah diperbarui</p>
        </div>
        
        <div class="content">
          <p>Halo <strong>${userData.nama}</strong>,</p>
          <p>Email Anda telah berhasil diperbarui. Berikut adalah detail terbaru Anda:</p>
          
          <table class="data-table">
            <tr>
              <th>Nama Lengkap</th>
              <td>${userData.nama}</td>
            </tr>
            <tr>
              <th>NIA</th>
              <td>${userData.nia}</td>
            </tr>
            <tr>
              <th>Email Lama</th>
              <td style="color: #dc3545; text-decoration: line-through;">${oldEmail}</td>
            </tr>
            <tr>
              <th>Email Baru</th>
              <td style="color: #28a745; font-weight: bold;">${userData.email}</td>
            </tr>
            <tr>
              <th>Kegiatan</th>
              <td>${userData.kegiatan}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td><span style="color: ${userData.status === 'Setuju' ? '#28a745' : '#f57c00'}; font-weight: bold;">${userData.status}</span></td>
            </tr>
          </table>
        </div>
        
        <div class="email-change-note">
          <h4 style="margin-top: 0; color: #856404;">📧 Perubahan Email:</h4>
          <ul style="margin-bottom: 0;">
            <li>Email Anda telah berhasil diperbarui</li>
            <li>Email konfirmasi selanjutnya akan dikirim ke alamat email yang baru</li>
            <li>QR Code Anda tetap sama dan masih berlaku</li>
          </ul>
        </div>
        
        <div class="qr-section">
          <h3 style="color: #2b7de9; margin-top: 0;">QR Code Absensi Anda</h3>
          <img src="${qrCodeUrl}" alt="QR Code Absensi" width="200" height="200">
          <p><strong>QR Code Anda tetap sama!</strong></p>
          <p>Tunjukkan QR Code ini saat kegiatan untuk proses absensi yang cepat.</p>
        </div>
        
        <div class="important-note">
          <h4 style="margin-top: 0; color: #0c5460;">📝 Catatan Penting:</h4>
          <ul style="margin-bottom: 0;">
            <li>Perubahan email telah tersimpan dalam sistem kami</li>
            <li>Email konfirmasi dan notifikasi selanjutnya akan dikirim ke email baru Anda</li>
            <li>QR Code dan data lainnya tetap sama</li>
            <li>Harap datang tepat waktu sesuai jadwal kegiatan</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>Email ini dikirim secara otomatis sebagai konfirmasi perubahan email.</p>
          <p>Jika ada pertanyaan, silakan hubungi pengurus komunitas.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p>&copy; ${new Date().getFullYear()} Sadulur Sepoor Indonesia. Semua hak dilindungi.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Template text plain sebagai fallback
    const textBody = `
EMAIL BERHASIL DIPERBARUI

Halo ${userData.nama},

Email Anda untuk kegiatan sosialisasi telah berhasil diperbarui.

DETAIL TERBARU:
- Nama: ${userData.nama}
- NIA: ${userData.nia}
- Email Lama: ${oldEmail}
- Email Baru: ${userData.email}
- Kegiatan: ${userData.kegiatan}
- Status: ${userData.status}

QR CODE ABSENSI:
QR Code Anda tetap sama. Silakan buka link berikut untuk melihat QR Code:
${qrCodeUrl}

CATATAN PENTING:
- Perubahan email telah tersimpan dalam sistem kami
- Email konfirmasi dan notifikasi selanjutnya akan dikirim ke email baru Anda
- QR Code dan data lainnya tetap sama
- Harap datang tepat waktu sesuai jadwal kegiatan

Terima kasih!
Pengurus Sadulur Sepoor Indonesia
    `;

    // Kirim email ke alamat email yang baru
    MailApp.sendEmail({
      to: userData.email,
      subject: EMAIL_CONFIG.emailUpdateSubject,
      htmlBody: htmlBody,
      body: textBody,
      name: EMAIL_CONFIG.senderName,
      replyTo: EMAIL_CONFIG.replyTo
    });

    console.log('Email update confirmation sent successfully to:', userData.email);
    
  } catch (error) {
    console.error('Error in sendEmailUpdateConfirmation:', error);
    throw error; // Re-throw untuk ditangani di updateEmail
  }
}

// FUNGSI UNTUK MENGIRIM EMAIL KONFIRMASI
function sendConfirmationEmail(data) {
  try {
    console.log('Sending confirmation email to:', data.email);
    
    // Generate QR Code dengan NIA saja untuk scanning yang lebih mudah
    const qrData = data.nia; // Hanya NIA untuk simplifikasi scanning
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
    
    // Template HTML untuk email
    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #2b7de9; margin: 0; font-size: 24px; }
        .content { margin-bottom: 30px; }
        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .data-table th { background-color: #f8f9fa; font-weight: bold; color: #333; }
        .qr-section { text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; }
        .qr-section img { border: 2px solid #2b7de9; border-radius: 8px; }
        .important-note { background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 5px; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Konfirmasi Kehadiran </h1>
          <p>Terima kasih telah list untuk kegiatan sosialisasi</p>
        </div>
        
        <div class="content">
          <p>Halo <strong>${data.nama}</strong>,</p>
          <p>List Anda telah berhasil disimpan. Berikut adalah detail List Anda:</p>
          
          <table class="data-table">
            <tr>
              <th>Nama Lengkap</th>
              <td>${data.nama}</td>
            </tr>
            <tr>
              <th>NIA</th>
              <td>${data.nia}</td>
            </tr>
            <tr>
              <th>Email</th>
              <td>${data.email}</td>
            </tr>
            <tr>
              <th>Kegiatan</th>
              <td>${data.kegiatan}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td><span style="color: #f57c00; font-weight: bold;">Menunggu</span></td>
            </tr>
          </table>
        </div>
        
        <div class="qr-section">
          <h3 style="color: #2b7de9; margin-top: 0;">QR Code Absensi Anda</h3>
          <img src="${qrCodeUrl}" alt="QR Code Absensi" width="200" height="200">
          <p><strong>Simpan QR Code ini!</strong></p>
          <p>Tunjukkan QR Code ini saat kegiatan untuk proses absensi yang cepat.</p>
        </div>
        
        <div class="important-note">
          <h4 style="margin-top: 0; color: #856404;">📝 Catatan Penting:</h4>
          <ul style="margin-bottom: 0;">
            <li>Status Anda saat ini adalah <strong>"Menunggu"</strong></li>
            <li>Status akan berubah menjadi <strong>"Setuju"</strong> setelah QR Code di-scan oleh pengurus</li>
            <li>Harap datang tepat waktu sesuai jadwal kegiatan</li>
            <li>Bawa QR Code ini ke pengurus</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>Email ini dikirim secara otomatis, mohon jangan membalas email ini.</p>
          <p>Jika ada pertanyaan, silakan hubungi pengurus komunitas.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p>&copy; ${new Date().getFullYear()} Sadulur Sepoor Indonesia. Semua hak dilindungi.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Template text plain sebagai fallback
    const textBody = `
KONFIRMASI ABSENSI

Halo ${data.nama},

Pendaftaran Anda telah berhasil disimpan!

DETAIL PENDAFTARAN:
- Nama: ${data.nama}
- NIA: ${data.nia}
- Email: ${data.email}
- Kegiatan: ${data.kegiatan}
- Status: Menunggu

QR CODE ABSENSI:
Silakan buka link berikut untuk melihat QR Code Anda:
${qrCodeUrl}

CATATAN PENTING:
- Status Anda saat ini adalah "Menunggu"
- Status akan berubah menjadi "Setuju" setelah QR Code di-scan oleh pengurus
- Harap datang tepat waktu sesuai jadwal kegiatan
- Bawa QR Code ini ke pengurus

Terima kasih!
Pengurus Sadulur Sepoor Indonesia
    `;

    // Kirim email
    MailApp.sendEmail({
      to: data.email,
      subject: EMAIL_CONFIG.subject,
      htmlBody: htmlBody,
      body: textBody,
      name: EMAIL_CONFIG.senderName,
      replyTo: EMAIL_CONFIG.replyTo
    });

    console.log('Email sent successfully to:', data.email);
    
  } catch (error) {
    console.error('Error in sendConfirmationEmail:', error);
    throw error; // Re-throw untuk ditangani di doPost
  }
}

// FUNGSI UNTUK MENGIRIM EMAIL TERIMA KASIH
function sendThankYouEmail(userData) {
  try {
    console.log('Sending thank you email to:', userData.email);

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #2b7de9; margin: 0; font-size: 24px; }
        .content { margin-bottom: 30px; }
        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .data-table th { background-color: #f8f9fa; font-weight: bold; color: #333; }
        .important-note { background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Kehadiran Anda Dikonfirmasi</h1>
          <p>Terima kasih telah hadir dalam kegiatan sosialisasi</p>
        </div>
        
        <div class="content">
          <p>Halo <strong>${userData.nama}</strong>,</p>
          <p>Kehadiran Anda telah berhasil dikonfirmasi. Berikut adalah detail Anda:</p>
          
          <table class="data-table">
            <tr>
              <th>Nama Lengkap</th>
              <td>${userData.nama}</td>
            </tr>
            <tr>
              <th>NIA</th>
              <td>${userData.nia}</td>
            </tr>
            <tr>
              <th>Email</th>
              <td>${userData.email}</td>
            </tr>
            <tr>
              <th>Kegiatan</th>
              <td>${userData.kegiatan}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td><span style="color: #28a745; font-weight: bold;">✓ Hadir</span></td>
            </tr>
          </table>
        </div>

        <div class="important-note">
          <h4 style="margin-top: 0; color: #155724;">🙏 Terima Kasih:</h4>
          <ul style="margin-bottom: 0;">
            <li>Partisipasi Anda sangat berarti bagi kami</li>
            <li>Semoga kegiatan ini bermanfaat</li>
            <li>Sampai jumpa di event berikutnya!</li>
          </ul>
        </div>

        <div class="footer">
          <p>Email ini dikirim secara otomatis sebagai konfirmasi kehadiran.</p>
          <p>&copy; ${new Date().getFullYear()} Sadulur Sepoor Indonesia. Semua hak dilindungi.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const textBody = `
KONFIRMASI KEHADIRAN

Halo ${userData.nama},

Kehadiran Anda telah dikonfirmasi oleh pengurus.

DETAIL:
- Nama: ${userData.nama}
- NIA: ${userData.nia}
- Email: ${userData.email}
- Kegiatan: ${userData.kegiatan}
- Status: ✓ Hadir

Terima kasih atas partisipasi Anda.
Salam,
Pengurus Sadulur Sepoor Indonesia
    `;

    MailApp.sendEmail({
      to: userData.email,
      subject: EMAIL_CONFIG.thankYouSubject,
      htmlBody: htmlBody,
      body: textBody,
      name: EMAIL_CONFIG.senderName,
      replyTo: EMAIL_CONFIG.replyTo
    });

    console.log('Thank you email sent successfully to:', userData.email);
    return true;

  } catch (error) {
    console.error('Error in sendThankYouEmail:', error);
    return false;
  }
}

// FUNGSI VALIDASI EMAIL
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function createErrorResponse(message, count = null) {
  const response = {
    success: false,
    message: message
  };
  
  if (count !== null) {
    response.currentCount = count;
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkParticipantLimit() {
  try {
    console.log('checkParticipantLimit called');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    // Inisialisasi header jika sheet kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Nama', 'NIA', 'Email', 'Kegiatan', 'Status']);
      console.log('Header added to empty sheet');
    }
    
    const currentCount = Math.max(0, sheet.getLastRow() - 1); // -1 untuk header
    const remaining = Math.max(0, MAX_PARTICIPANTS - currentCount);
    
    console.log('Limit check - Current:', currentCount, 'Max:', MAX_PARTICIPANTS, 'Remaining:', remaining);
    
    const result = {
      currentCount: currentCount,
      maxParticipants: MAX_PARTICIPANTS,
      remaining: remaining,
      isFull: currentCount >= MAX_PARTICIPANTS
    };
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in checkParticipantLimit:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      currentCount: 0,
      maxParticipants: MAX_PARTICIPANTS,
      remaining: MAX_PARTICIPANTS,
      isFull: false
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getAttendanceStatus() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    // Inisialisasi header jika sheet kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Nama', 'NIA', 'Email', 'Kegiatan', 'Status']);
    }
    
    const currentCount = Math.max(0, sheet.getLastRow() - 1);
    const isFull = currentCount >= MAX_PARTICIPANTS;
    
    return ContentService.createTextOutput(JSON.stringify({
      isFull: isFull,
      currentCount: currentCount,
      maxParticipants: MAX_PARTICIPANTS
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in getAttendanceStatus:', error);
    return ContentService.createTextOutput(JSON.stringify({
      isFull: false,
      currentCount: 0,
      maxParticipants: MAX_PARTICIPANTS,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getAllData() {
  try {
    console.log('getAllData called');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    if (sheet.getLastRow() <= 1) {
      console.log('No data found in sheet');
      return [];
    }
    
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
    console.log('Data retrieved:', data.length, 'rows');
    return data;
    
  } catch (error) {
    console.error("Error in getAllData:", error);
    return [];
  }
}

function updateStatus(e) {
  try {
    console.log('updateStatus called with:', e.parameter);
    
    if (!e.parameter || !e.parameter.row || !e.parameter.status) {
      return createErrorResponse("Missing parameters for updateStatus");
    }
    
    const row = parseInt(e.parameter.row);
    const status = e.parameter.status;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    // Validasi bahwa row yang diminta ada
    if (row < 2 || row > sheet.getLastRow()) {
      return createErrorResponse("Invalid row number");
    }
    
    // Get user data sebelum update untuk email
    const userData = sheet.getRange(row, 1, 1, 5).getValues()[0];
    const userInfo = {
      nama: userData[0],
      nia: userData[1],
      email: userData[2],
      kegiatan: userData[3],
      oldStatus: userData[4]
    };
    
    // Update status
    sheet.getRange(row, 5).setValue(status); // Kolom 5 adalah status
    console.log('Status updated for row:', row, 'status:', status);
    
    // Kirim email terima kasih jika status diubah menjadi "Setuju"
    if (status === 'Setuju' && userInfo.oldStatus !== 'Setuju') {
      try {
        const emailSent = sendThankYouEmail(userInfo);
        console.log('Thank you email sent:', emailSent);
      } catch (emailError) {
        console.error('Error sending thank you email:', emailError);
        // Tidak menggagalkan update status meskipun email gagal
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Status updated successfully',
      emailSent: status === 'Setuju'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in updateStatus:', error);
    return createErrorResponse("Error updating status: " + error.toString());
  }
}

function deleteData(e) {
  try {
    console.log('deleteData called with:', e.parameter);
    
    if (!e.parameter || !e.parameter.row) {
      return createErrorResponse("Missing row parameter for deleteData");
    }
    
    const row = parseInt(e.parameter.row);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    // Validasi bahwa row yang diminta ada dan bukan header
    if (row < 2 || row > sheet.getLastRow()) {
      return createErrorResponse("Invalid row number");
    }
    
    sheet.deleteRow(row);
    console.log('Row deleted:', row);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Data deleted successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in deleteData:', error);
    return createErrorResponse("Error deleting data: " + error.toString());
  }
}

// Fungsi untuk mengubah status berdasarkan NIA (untuk scan barcode)
function updateStatusByNIA(nia, newStatus = 'Setuju') {
  try {
    console.log('updateStatusByNIA called for NIA:', nia, 'Status:', newStatus);
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    if (sheet.getLastRow() <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "No data found"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Cari row berdasarkan NIA (kolom 2)
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
    let foundRow = -1;
    let userData = null;
    
    for (let i = 0; i < data.length; i++) {
      if (data[i][1] === nia) { // Kolom 1 adalah NIA (index 1 karena dimulai dari 0)
        foundRow = i + 2; // +2 karena dimulai dari row 2 (setelah header)
        userData = {
          nama: data[i][0],
          nia: data[i][1],
          email: data[i][2],
          kegiatan: data[i][3],
          oldStatus: data[i][4]
        };
        break;
      }
    }
    
    if (foundRow === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: `NIA ${nia} tidak ditemukan`
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Update status
    sheet.getRange(foundRow, 5).setValue(newStatus);
    console.log('Status updated for NIA:', nia, 'to:', newStatus);
    
    // Kirim email terima kasih jika status diubah menjadi "Setuju"
    let emailSent = false;
    if (newStatus === 'Setuju' && userData.oldStatus !== 'Setuju') {
      try {
        emailSent = sendThankYouEmail(userData);
        console.log('Thank you email sent:', emailSent);
      } catch (emailError) {
        console.error('Error sending thank you email:', emailError);
        // Tidak menggagalkan update status meskipun email gagal
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: `Status untuk NIA ${nia} berhasil diubah menjadi ${newStatus}`,
      nama: userData.nama,
      nia: nia,
      status: newStatus,
      emailSent: emailSent
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in updateStatusByNIA:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Error updating status: " + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// FUNGSI TEST EMAIL - UNTUK DEBUGGING
function testThankYouEmail() {
  const testData = {
    nama: "Test User",
    nia: "SS-0001",
    email: "fatirahmad6032@gmail.com", // GANTI DENGAN EMAIL ANDA UNTUK TEST
    kegiatan: "JPL 30 Pasar Senen"
  };
  
  try {
    sendConfirmationEmail(testData);
    console.log("Test email sent successfully!");
    return "Test email sent successfully!";
  } catch (error) {
    console.error("Test email failed:", error);
    return "Test email failed: " + error.toString();
  }
}

// Fungsi untuk testing keseluruhan script
function testScript() {
  console.log("=== Testing script ===");
  
  try {
    // Test sheet access
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const rowCount = sheet.getLastRow();
    console.log("Sheet accessible, row count:", rowCount);
    console.log("Current participants:", Math.max(0, rowCount - 1));
    
    // Test checkParticipantLimit
    const limitCheck = checkParticipantLimit();
    console.log("Limit check result:", limitCheck.getContent());
    
    // Test getAttendanceStatus
    const attendanceStatus = getAttendanceStatus();
    console.log("Attendance status result:", attendanceStatus.getContent());
    
  } catch (error) {
    console.error("Test error:", error);
  }
  
  console.log("=== Test completed ===");
  return "Test completed - check logs for details";
}