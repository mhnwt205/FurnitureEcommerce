import { Resend } from 'resend';

const isDevMode = () => {
  const apiKey = process.env.RESEND_API_KEY;

  return !apiKey || apiKey === 're_your_api_key_here';
};

const getResendClient = () => {
  if (isDevMode()) {
    return null;
  }

  return new Resend(process.env.RESEND_API_KEY);
};

const getEmailFrom = () => {
  return process.env.EMAIL_FROM
    || 'FurnitureEcommerce <onboarding@resend.dev>';
};

const sendEmailWithResend = async ({
  to,
  subject,
  html,
  text,
  context = 'transactional',
}) => {
  if (!to) {
    console.warn(
      `[EmailService] ${context} email skipped: missing recipient`,
    );

    return 'SKIPPED_NO_RECIPIENT';
  }

  if (isDevMode()) {
    console.log(`[EmailService] Running in DEV MODE for ${context}`);
    console.log(
      `[EmailService] Email prepared for ${to}: ${subject}`,
    );

    return 'DEV_MODE';
  }

  const resend = getResendClient();

  try {
    const { data, error } = await resend.emails.send({
      from: getEmailFrom(),
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error(
        `[EmailService] ${context} email delivery failed`,
        {
          name: error.name,
          message: error.message,
          statusCode: error.statusCode,
        },
      );

      throw new Error(
        `Resend API error: ${error.message || 'Unknown error'}`,
      );
    }

    console.log(`[EmailService] ${context} email sent`, {
      to,
      emailId: data?.id,
    });

    return 'RESEND_MODE';
  } catch (error) {
    console.error(
      `[EmailService] ${context} email delivery failed`,
      {
        name: error?.name,
        message: error?.message,
        statusCode: error?.statusCode,
        stack: error?.stack,
      },
    );

    throw new Error(
      `Lỗi gửi email ${context}: ${error?.message || 'Unknown error'}`,
    );
  }
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const displayValue = (value) => {
  if (
    value === undefined
    || value === null
    || value === ''
  ) {
    return '-';
  }

  return String(value);
};

const escapedValue = (value) => {
  return escapeHtml(displayValue(value));
};

const renderInfoRows = (rows) => rows
  .map(([label, value]) => `
    <tr>
      <td
        style="
          padding:8px 12px;
          border:1px solid #e5e7eb;
          font-weight:600;
          background:#f9fafb;
          vertical-align:top;
        "
      >
        ${escapeHtml(label)}
      </td>

      <td
        style="
          padding:8px 12px;
          border:1px solid #e5e7eb;
          vertical-align:top;
          white-space:pre-wrap;
        "
      >
        ${escapedValue(value)}
      </td>
    </tr>
  `)
  .join('');

const renderTextRows = (rows) => rows
  .map(([label, value]) => {
    return `${label}: ${displayValue(value)}`;
  })
  .join('\n');

const sendConsultationMail = async ({
  to,
  subject,
  html,
  text,
  context,
}) => {
  return sendEmailWithResend({
    to,
    subject,
    html,
    text,
    context: `Consultation ${context}`,
  });
};

export const sendVerificationEmail = async (
  toEmail,
  token,
) => {
  const frontendUrl =
    process.env.FRONTEND_URL
    || 'http://localhost:5173';

  const verifyUrl =
    `${frontendUrl.replace(/\/$/, '')}`
    + `/verify-email?token=${encodeURIComponent(token)}`;

  return sendEmailWithResend({
    to: toEmail,
    subject: 'Verify your email address',
    context: 'verification',
    html: `
      <div
        style="
          font-family:Arial,sans-serif;
          color:#111827;
          line-height:1.6;
        "
      >
        <h1>Welcome to FurnitureEcommerce!</h1>

        <p>
          Please verify your email by clicking the button below:
        </p>

        <p>
          <a
            href="${escapeHtml(verifyUrl)}"
            style="
              display:inline-block;
              padding:10px 20px;
              background:#A28267;
              color:#ffffff;
              text-decoration:none;
              border-radius:5px;
            "
          >
            Verify Email
          </a>
        </p>

        <p>
          This link will expire in 24 hours.
        </p>

        <p>
          If the button does not work, copy this link
          into your browser:
        </p>

        <p style="word-break:break-all;">
          ${escapeHtml(verifyUrl)}
        </p>
      </div>
    `,
    text: [
      'Welcome to FurnitureEcommerce!',
      '',
      'Please verify your email using the following link:',
      verifyUrl,
      '',
      'This link will expire in 24 hours.',
    ].join('\n'),
  });
};

export const sendPasswordResetEmail = async (
  toEmail,
  token,
) => {
  const frontendUrl =
    process.env.FRONTEND_URL
    || 'http://localhost:5173';

  const resetUrl =
    `${frontendUrl.replace(/\/$/, '')}`
    + `/reset-password?token=${encodeURIComponent(token)}`;

  return sendEmailWithResend({
    to: toEmail,
    subject: 'Đặt lại mật khẩu - Nội Thất Cao Cấp',
    context: 'password reset',
    html: `
      <div
        style="
          font-family:Arial,sans-serif;
          color:#111827;
          line-height:1.6;
        "
      >
        <h3>Chào bạn,</h3>

        <p>
          Chúng tôi nhận được yêu cầu đặt lại mật khẩu
          cho tài khoản của bạn.
        </p>

        <p>
          Vui lòng nhấn vào nút bên dưới để đặt lại mật khẩu:
        </p>

        <p>
          <a
            href="${escapeHtml(resetUrl)}"
            style="
              display:inline-block;
              padding:10px 20px;
              background:#A28267;
              color:white;
              text-decoration:none;
              border-radius:5px;
            "
          >
            Đặt lại mật khẩu
          </a>
        </p>

        <p>
          Liên kết này sẽ hết hạn sau 15 phút.
        </p>

        <p>
          Nếu bạn không yêu cầu đặt lại mật khẩu,
          hãy bỏ qua email này.
        </p>

        <p>
          Trân trọng,<br>
          Đội ngũ Nội Thất Cao Cấp
        </p>
      </div>
    `,
    text: [
      'Chào bạn,',
      '',
      'Chúng tôi nhận được yêu cầu đặt lại mật khẩu',
      'cho tài khoản của bạn.',
      '',
      `Đặt lại mật khẩu tại: ${resetUrl}`,
      '',
      'Liên kết này sẽ hết hạn sau 15 phút.',
      '',
      'Nếu bạn không yêu cầu đặt lại mật khẩu,',
      'hãy bỏ qua email này.',
    ].join('\n'),
  });
};

export const sendConsultationConfirmationEmail = async (
  toEmail,
  data,
) => {
  const rows = [
    ['Mã yêu cầu', data.requestCode],
    ['Họ tên', data.fullName],
    ['Số điện thoại', data.phone],
    ['Loại công trình', data.projectType],
    ['Phòng cần tư vấn', data.roomType],
    ['Ngân sách', data.budgetRange],
    ['Nội dung', data.message],
  ];

  const subject =
    `Xác nhận yêu cầu tư vấn ${data.requestCode}`
    + ' - FurnitureEcommerce';

  const html = `
    <div
      style="
        font-family:Arial,sans-serif;
        color:#111827;
        line-height:1.6;
      "
    >
      <h2 style="margin:0 0 12px;">
        Cảm ơn bạn đã gửi yêu cầu tư vấn
      </h2>

      <p>
        FurnitureEcommerce đã nhận được yêu cầu của bạn.
        Đội ngũ tư vấn sẽ liên hệ trong vòng 24 giờ.
      </p>

      <table
        style="
          border-collapse:collapse;
          width:100%;
          max-width:720px;
          margin:16px 0;
        "
      >
        <tbody>
          ${renderInfoRows(rows)}
        </tbody>
      </table>

      <p>
        Trân trọng,<br>
        FurnitureEcommerce
      </p>
    </div>
  `;

  const text = [
    'Cảm ơn bạn đã gửi yêu cầu tư vấn.',
    'FurnitureEcommerce đã nhận được yêu cầu của bạn',
    'và sẽ liên hệ trong vòng 24 giờ.',
    '',
    renderTextRows(rows),
  ].join('\n');

  return sendConsultationMail({
    to: toEmail,
    subject,
    html,
    text,
    context: 'confirmation',
  });
};

export const sendConsultationAdminNotificationEmail = async (
  toEmail,
  data,
) => {
  const frontendUrl = process.env.FRONTEND_URL;

  const adminLink = frontendUrl
    ? `${frontendUrl.replace(/\/$/, '')}`
    + '/admin/consultation-requests'
    : null;

  const rows = [
    ['Mã yêu cầu', data.requestCode],
    ['Họ tên', data.fullName],
    ['SĐT', data.phone],
    ['Email', data.email],
    ['Project type', data.projectType],
    ['Room type', data.roomType],
    ['Budget', data.budgetRange],
    ['Preferred contact', data.preferredContact],
    ['Message', data.message],
    ['Source', data.source],
  ];

  const subject =
    `Yêu cầu tư vấn mới ${data.requestCode}`;

  const html = `
    <div
      style="
        font-family:Arial,sans-serif;
        color:#111827;
        line-height:1.6;
      "
    >
      <h2 style="margin:0 0 12px;">
        Có yêu cầu tư vấn mới
      </h2>

      <table
        style="
          border-collapse:collapse;
          width:100%;
          max-width:720px;
          margin:16px 0;
        "
      >
        <tbody>
          ${renderInfoRows(rows)}
        </tbody>
      </table>

      ${adminLink
      ? `
            <p>
              <a
                href="${escapeHtml(adminLink)}"
                style="color:#7c3aed;"
              >
                Mở Consultation CRM
              </a>
            </p>
          `
      : ''
    }
    </div>
  `;

  const textParts = [
    'Có yêu cầu tư vấn mới.',
    '',
    renderTextRows(rows),
  ];

  if (adminLink) {
    textParts.push(
      '',
      `Admin CRM: ${adminLink}`,
    );
  }

  return sendConsultationMail({
    to: toEmail,
    subject,
    html,
    text: textParts.join('\n'),
    context: 'admin notification',
  });
};

export const sendTransactionalEmail = async ({
  to,
  subject,
  html,
  text,
}) => {
  return sendEmailWithResend({
    to,
    subject,
    html,
    text,
    context: 'transactional',
  });
};

export { escapeHtml };