import nodemailer from 'nodemailer';

const isDevMode = () => {
  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER;
  const isPlaceholder = process.env.SMTP_PASS === 'APP_PASSWORD_DO_USER_T\u1EF0_NH\u1EACP' || process.env.SMTP_PASS === 'APP_PASSWORD_DO_USER_TU_NHAP';
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

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const displayValue = (value) => {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
};

const escapedValue = (value) => escapeHtml(displayValue(value));

const renderInfoRows = (rows) => rows.map(([label, value]) => `
  <tr>
    <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:8px 12px;border:1px solid #e5e7eb;vertical-align:top;white-space:pre-wrap;">${escapedValue(value)}</td>
  </tr>
`).join('');

const renderTextRows = (rows) => rows
  .map(([label, value]) => `${label}: ${displayValue(value)}`)
  .join('\n');

const sendConsultationMail = async ({ to, subject, html, text, context }) => {
  if (!to) {
    console.warn(`[EmailService] Consultation ${context} email skipped: missing recipient`);
    return 'SKIPPED_NO_RECIPIENT';
  }

  if (isDevMode()) {
    console.log(`[EmailService] Running in DEV MODE for Consultation ${context}`);
    console.log(`[EmailService] Consultation ${context} email prepared for ${to}: ${subject}`);
    return 'DEV_MODE';
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"FurnitureEcommerce" <noreply@furniture.com>',
    to,
    subject,
    html,
    text,
  });

  console.log(`[EmailService] Consultation ${context} email sent to ${to}`);
  return 'SMTP_MODE';
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
      console.error('Verification email delivery failed.');
      throw new Error(`L\u1ED7i g\u1EEDi email x\u00E1c th\u1EF1c: ${error.message}`);
    }
  } else {
    console.log(`[EmailService] Running in DEV MODE`);
    console.log('[EmailService] Verification email generated in DEV MODE.');
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
        from: process.env.SMTP_FROM || '"N\u1ED9i Th\u1EA5t Cao C\u1EA5p" <noreply@furniture.com>',
        to: toEmail,
        subject: '\u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u - N\u1ED9i Th\u1EA5t Cao C\u1EA5p',
        html: `
          <h3>Ch\u00E0o b\u1EA1n,</h3>
          <p>Ch\u00FAng t\u00F4i nh\u1EADn \u0111\u01B0\u1EE3c y\u00EAu c\u1EA7u \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u cho t\u00E0i kho\u1EA3n c\u1EE7a b\u1EA1n.</p>
          <p>Vui l\u00F2ng click v\u00E0o link b\u00EAn d\u01B0\u1EDBi \u0111\u1EC3 \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #A28267; color: white; text-decoration: none; border-radius: 5px;">\u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u</a>
          <p>Link n\u00E0y s\u1EBD h\u1EBFt h\u1EA1n sau 15 ph\u00FAt.</p>
          <p>N\u1EBFu b\u1EA1n kh\u00F4ng y\u00EAu c\u1EA7u \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u, h\u00E3y b\u1ECF qua email n\u00E0y.</p>
          <p>Tr\u00E2n tr\u1ECDng,<br>\u0110\u1ED9i ng\u0169 N\u1ED9i Th\u1EA5t Cao C\u1EA5p</p>
        `,
      });
      console.log(`Password reset email sent to ${toEmail}`);
      return 'SMTP_MODE';
    } catch (error) {
      console.error('Password reset email delivery failed.');
      throw new Error(`L\u1ED7i g\u1EEDi email \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u: ${error.message}`);
    }
  } else {
    console.log(`[EmailService] Running in DEV MODE for Password Reset`);
    console.log('[EmailService] Password reset email generated in DEV MODE.');
    return 'DEV_MODE';
  }
};

export const sendConsultationConfirmationEmail = async (toEmail, data) => {
  const rows = [
    ['M\u00E3 y\u00EAu c\u1EA7u', data.requestCode],
    ['H\u1ECD t\u00EAn', data.fullName],
    ['S\u1ED1 \u0111i\u1EC7n tho\u1EA1i', data.phone],
    ['Lo\u1EA1i c\u00F4ng tr\u00ECnh', data.projectType],
    ['Ph\u00F2ng c\u1EA7n t\u01B0 v\u1EA5n', data.roomType],
    ['Ng\u00E2n s\u00E1ch', data.budgetRange],
    ['N\u1ED9i dung', data.message],
  ];
  const subject = `X\u00E1c nh\u1EADn y\u00EAu c\u1EA7u t\u01B0 v\u1EA5n ${data.requestCode} - FurnitureEcommerce`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;">
      <h2 style="margin:0 0 12px;">C\u1EA3m \u01A1n b\u1EA1n \u0111\u00E3 g\u1EEDi y\u00EAu c\u1EA7u t\u01B0 v\u1EA5n</h2>
      <p>FurnitureEcommerce \u0111\u00E3 nh\u1EADn \u0111\u01B0\u1EE3c y\u00EAu c\u1EA7u c\u1EE7a b\u1EA1n. \u0110\u1ED9i ng\u0169 t\u01B0 v\u1EA5n s\u1EBD li\u00EAn h\u1EC7 trong v\u00F2ng 24 gi\u1EDD.</p>
      <table style="border-collapse:collapse;width:100%;max-width:720px;margin:16px 0;">
        <tbody>${renderInfoRows(rows)}</tbody>
      </table>
      <p>Tr\u00E2n tr\u1ECDng,<br>FurnitureEcommerce</p>
    </div>
  `;
  const text = [
    'C\u1EA3m \u01A1n b\u1EA1n \u0111\u00E3 g\u1EEDi y\u00EAu c\u1EA7u t\u01B0 v\u1EA5n.',
    'FurnitureEcommerce \u0111\u00E3 nh\u1EADn \u0111\u01B0\u1EE3c y\u00EAu c\u1EA7u c\u1EE7a b\u1EA1n v\u00E0 s\u1EBD li\u00EAn h\u1EC7 trong v\u00F2ng 24 gi\u1EDD.',
    '',
    renderTextRows(rows),
  ].join('\n');

  return sendConsultationMail({ to: toEmail, subject, html, text, context: 'confirmation' });
};

export const sendConsultationAdminNotificationEmail = async (toEmail, data) => {
  const frontendUrl = process.env.FRONTEND_URL;
  const adminLink = frontendUrl ? `${frontendUrl.replace(/\/$/, '')}/admin/consultation-requests` : null;
  const rows = [
    ['M\u00E3 y\u00EAu c\u1EA7u', data.requestCode],
    ['H\u1ECD t\u00EAn', data.fullName],
    ['S\u0110T', data.phone],
    ['Email', data.email],
    ['Project type', data.projectType],
    ['Room type', data.roomType],
    ['Budget', data.budgetRange],
    ['Preferred contact', data.preferredContact],
    ['Message', data.message],
    ['Source', data.source],
  ];
  const subject = `Y\u00EAu c\u1EA7u t\u01B0 v\u1EA5n m\u1EDBi ${data.requestCode}`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;">
      <h2 style="margin:0 0 12px;">C\u00F3 y\u00EAu c\u1EA7u t\u01B0 v\u1EA5n m\u1EDBi</h2>
      <table style="border-collapse:collapse;width:100%;max-width:720px;margin:16px 0;">
        <tbody>${renderInfoRows(rows)}</tbody>
      </table>
      ${adminLink ? `<p><a href="${escapeHtml(adminLink)}" style="color:#7c3aed;">M\u1EDF Consultation CRM</a></p>` : ''}
    </div>
  `;
  const textParts = [
    'C\u00F3 y\u00EAu c\u1EA7u t\u01B0 v\u1EA5n m\u1EDBi.',
    '',
    renderTextRows(rows),
  ];
  if (adminLink) textParts.push('', `Admin CRM: ${adminLink}`);

  return sendConsultationMail({
    to: toEmail,
    subject,
    html,
    text: textParts.join('\n'),
    context: 'admin notification',
  });
};