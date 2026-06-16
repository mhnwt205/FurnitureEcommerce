import nodemailer from 'nodemailer';

const isDevMode = () => {
  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER;
  const isPlaceholder = process.env.SMTP_PASS === 'APP_PASSWORD_DO_USER_TỰ_NHẬP' || process.env.SMTP_PASS === 'APP_PASSWORD_DO_USER_TU_NHAP';
  return !hasSmtpConfig || isPlaceholder;
};

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT == 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendVerificationEmail = async (toEmail, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

  if (!isDevMode()) {
    console.log('[EmailService] Running in SMTP MODE');
    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"FurnitureEcommerce" <noreply@furniture.com>',
        to: toEmail,
        subject: 'Verify your email address',
        html: `
          <h1>Welcome to FurnitureEcommerce!</h1>
          <p>Please verify your email by clicking the link below:</p>
          <a href="${verifyUrl}">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
        `,
      });
      console.log(`Verification email sent to ${toEmail}`);
      return 'SMTP_MODE';
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error(`Lỗi gửi email xác thực: ${error.message}`);
    }
  } else {
    console.log(`[EmailService] Running in DEV MODE`);
    console.log(`[EmailService] Verification Link for ${toEmail}: ${verifyUrl}`);
    return 'DEV_MODE';
  }
};

export const sendPasswordResetEmail = async (toEmail, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  if (!isDevMode()) {
    console.log('[EmailService] Running in SMTP MODE for Password Reset');
    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Nội Thất Cao Cấp" <noreply@furniture.com>',
        to: toEmail,
        subject: 'Đặt lại mật khẩu - Nội Thất Cao Cấp',
        html: `
          <h3>Chào bạn,</h3>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
          <p>Vui lòng click vào link bên dưới để đặt lại mật khẩu:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #A28267; color: white; text-decoration: none; border-radius: 5px;">Đặt lại mật khẩu</a>
          <p>Link này sẽ hết hạn sau 15 phút.</p>
          <p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
          <p>Trân trọng,<br>Đội ngũ Nội Thất Cao Cấp</p>
        `,
      });
      console.log(`Password reset email sent to ${toEmail}`);
      return 'SMTP_MODE';
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error(`Lỗi gửi email đặt lại mật khẩu: ${error.message}`);
    }
  } else {
    console.log(`[EmailService] Running in DEV MODE for Password Reset`);
    console.log(`\n\n=== PASSWORD RESET LINK ===\nPassword reset link for ${toEmail}: ${resetUrl}\n===========================\n\n`);
    return 'DEV_MODE';
  }
};
