<?php
// Include PHPMailer library
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = htmlspecialchars($_POST['name']);
    $email = htmlspecialchars($_POST['email']);
    $message = htmlspecialchars($_POST['message']);

    $mail = new PHPMailer(true);

    try {
        // Konfigurasi email server Anda
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com'; // Gunakan SMTP provider, contoh: Gmail
        $mail->SMTPAuth   = true;
        $mail->Username   = 'sadulursepoor@gmail.com'; // Ganti dengan email Anda
        $mail->Password   = 'sadulursepoor_daop1'; // Ganti dengan password email Anda
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // Pengaturan penerima dan konten email
        $mail->setFrom($email, $name);
        $mail->addAddress('sadulursepoor@gmail.com'); // Ganti dengan email tujuan

        $mail->isHTML(true);
        $mail->Subject = 'New Contact Form Submission';
        $mail->Body    = "Name: $name <br>Email: $email <br>Message: $message";

        // Kirim email
        $mail->send();
        echo 'Message has been sent successfully';
    } catch (Exception $e) {
        echo "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
    }
}
?>