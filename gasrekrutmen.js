// ==================================================================
// PENGATURAN GLOBAL
// ==================================================================
const SPREADSHEET_ID = "1_Z2_j1iQgug8D4w7RbdzJGS3jaWMQ9Bh1OCIksvdwoM"; 
const FOLDER_ID = '1M4S6hwEm-vPD26hb8-u33mIaAkDgtmwE';

// ==================================================================
// FUNGSI UTAMA UNTUK MENERIMA PERMINTAAN DARI WEBSITE
// ==================================================================

/**
 * Fungsi ini sekarang bisa menangani beberapa jenis permintaan GET:
 * 1. Tanpa parameter: Mengambil semua nama dari Sheet1.
 * 2. Dengan parameter 'checkEmail': Mengecek apakah email sudah ada.
 * 3. Dengan parameter 'checkPhone': Mengecek apakah nomor telepon sudah ada.
 */
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Sheet1");

    // --- Pengecekan Email ---
    if (e.parameter.checkEmail) {
      const emailToCheck = e.parameter.checkEmail;
      const emailColumn = 3; // Kolom C untuk email
      const emailValues = sheet.getRange(2, emailColumn, sheet.getLastRow(), 1).getValues().flat();
      const exists = emailValues.includes(emailToCheck);
      return ContentService.createTextOutput(JSON.stringify({ exists: exists })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- Pengecekan Nomor Telepon ---
    if (e.parameter.checkPhone) {
      const phoneToCheck = e.parameter.checkPhone;
      const phoneColumn = 4; // Kolom D untuk nomor telepon
      const phoneValues = sheet.getRange(2, phoneColumn, sheet.getLastRow(), 1).getValues().flat();
      const exists = phoneValues.includes(phoneToCheck);
      return ContentService.createTextOutput(JSON.stringify({ exists: exists })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- Default: Mengambil daftar nama lengkap (untuk form jadwal) ---
    const nameColumn = 5; // Kolom E untuk nama lengkap
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return ContentService.createTextOutput(JSON.stringify({ result: 'success', data: [] })).setMimeType(ContentService.MimeType.JSON);
    }
    const namesRange = sheet.getRange(2, nameColumn, lastRow - 1, 1);
    const names = namesRange.getValues().flat().filter(name => name !== "" && name != null);
    return ContentService.createTextOutput(JSON.stringify({ result: 'success', data: names })).setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log("Error di doGet: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Fungsi doPost dan fungsi lainnya tetap sama, tidak perlu diubah.
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    let result;
    if (data.sheetName === 'Sheet2') {
      result = handleInterviewSchedule(data);
    } else {
      result = handleRecruitmentData(data);
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log("Error di doPost: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleInterviewSchedule(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Sheet2');
  const lastRow = sheet.getLastRow();
  const newId = lastRow;
  const newRow = [newId, new Date(), data.userName || '', data.interviewDate || '', data.interviewer || ''];
  sheet.appendRow(newRow);
  return { result: 'success', row: newRow };
}

function handleRecruitmentData(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Sheet1');
  let photoUrl = "Tidak ada file diunggah";
  if (data.photoData && data.photoData.startsWith('data:')) {
      photoUrl = uploadFileToDrive(data.photoData, data.photoName);
  }
  const lastRow = sheet.getLastRow();
  let nextNumericId = 1; 
  if (lastRow > 1) {
    const lastIdString = sheet.getRange(lastRow, 1).getValue().toString();
    const match = lastIdString.match(/\d+$/);
    if (match) {
      nextNumericId = parseInt(match[0], 10) + 1;
    } else {
      nextNumericId = lastRow;
    }
  }
  const newIdString = "Camsas " + nextNumericId;
  const newRow = [
    newIdString, new Date(), data.email || '', data.phone || '',
    data.fullName || '', data.nickname || '', data.birthPlace || '',
    data.birthDate || '', data.gender || '', data.address || '',
    data.village || '', data.district || '', data.city || '',
    data.province || '', data.profession || '', data.daop || '',
    data.otherCommunity || '', data.reason || '', data.tiktok || '',
    data.instagram || '', data.facebook || '', data.twitter || '', photoUrl
  ];
  sheet.appendRow(newRow);
  sendWelcomeEmail(data, newIdString);
  return { result: 'success', row: newRow };
}

function uploadFileToDrive(base64Data, fileName) {
  try {
    const splitData = base64Data.split(',');
    const contentType = splitData[0].split(';')[0].replace('data:', '');
    const bytes = Utilities.base64Decode(splitData[1]);
    const blob = Utilities.newBlob(bytes, contentType, fileName);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (error) {
    Logger.log("Error saat upload file ke Drive: " + error.toString());
    return "Error Uploading File to Drive";
  }
}

function sendWelcomeEmail(data, newIdString) {
  const recipientEmail = data.email;
  const recipientName = data.fullName;
  const subject = "Pendaftaran Sadulur Sepoor Indonesia: Undangan Seleksi Wawancara";
  const senderName = "Tim Rekrutmen Sadulur Sepoor Indonesia";
  const htmlTemplate = HtmlService.createTemplateFromFile('email-template');
  htmlTemplate.recipientName = recipientName;
  htmlTemplate.newIdString = newIdString;
  htmlTemplate.lokasi = "Stasiun Gambir, Pintu Utara";
  htmlTemplate.opsiJadwal1 = "Sabtu, 23 Agustus 2025, pukul 10:00 WIB";
  htmlTemplate.opsiJadwal2 = "Minggu, 24 Agustus 2025, pukul 14:00 WIB";
  htmlTemplate.namaPIC1 = "Fathir";
  htmlTemplate.waPIC1 = "0821-1296-4343";
  htmlTemplate.namaPIC2 = "Agil";
  htmlTemplate.waPIC2 = "0821-9654-1141";
  const htmlBody = htmlTemplate.evaluate().getContent();
  MailApp.sendEmail({ to: recipientEmail, subject: subject, htmlBody: htmlBody, name: senderName });
}