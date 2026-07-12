import prisma from '../prismaClient.js';
import { sendTransactionalEmail, escapeHtml } from '../utils/emailService.js';
import { generateUniqueGuestOrderManagementToken } from './guestOrderToken.service.js';
import { hashToken } from '../utils/tokenService.js';

export const CONFIRMATION_EMAIL_STATUS = Object.freeze({
  PENDING: 'pending',
  SENDING: 'sending',
  SENT: 'sent',
  FAILED: 'failed'
});

const STALE_CLAIM_TIMEOUT_MS = 5 * 60 * 1000;
const SMTP_SEND_FAILED = 'SMTP_SEND_FAILED';

const getFrontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const isGuestOrder = (order) => order.userId === null || order.userId === undefined;
const isVNPay = (order) => String(order.paymentMethod || '').toUpperCase() === 'VNPAY';
const isCOD = (order) => String(order.paymentMethod || '').toUpperCase() === 'COD';

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};

const getPaymentStatusLabel = (order) => {
  if (isCOD(order)) return 'Thanh toán khi nhận hàng';
  if (isVNPay(order) && order.paymentStatus === 'paid') return 'Đã thanh toán';
  return order.paymentStatus || '-';
};

const isOrderEligibleForConfirmationEmail = (order) => {
  if (!order || order.confirmationEmailSentAt) return false;
  if (isCOD(order)) return true;
  if (isVNPay(order)) return order.paymentStatus === 'paid';
  return false;
};

const toTextLine = (label, value) => `${label}: ${value ?? '-'}`;

const renderItemsHtml = (items) => items.map((item) => `
  <tr>
    <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.productName)}</td>
    <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;">${escapeHtml(item.quantity)}</td>
    <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${escapeHtml(formatMoney(item.finalPrice ?? item.price))}</td>
    <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${escapeHtml(formatMoney(item.subtotal))}</td>
  </tr>
`).join('');

const renderItemsText = (items) => items.map((item) => (
  `- ${item.productName} | SL: ${item.quantity} | Đơn giá: ${formatMoney(item.finalPrice ?? item.price)} | Thành tiền: ${formatMoney(item.subtotal)}`
)).join('\n');

const buildOrderConfirmationEmail = ({ order, rawManagementToken }) => {
  const frontendUrl = getFrontendUrl();
  const isGuest = isGuestOrder(order);
  const managementUrl = isGuest && rawManagementToken
    ? `${frontendUrl}/orders/manage?token=${encodeURIComponent(rawManagementToken)}`
    : null;
  const accountOrdersUrl = `${frontendUrl}/profile/orders`;
  const subject = `Xác nhận đơn hàng ${order.orderCode}`;
  const paymentStatusLabel = getPaymentStatusLabel(order);

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;">
      <h2 style="margin:0 0 12px;">Cảm ơn bạn đã đặt hàng tại FurnitureEcommerce</h2>
      <p>Xin chào ${escapeHtml(order.fullName)}, đơn hàng của bạn đã được ghi nhận.</p>
      <table style="border-collapse:collapse;width:100%;max-width:720px;margin:16px 0;">
        <tbody>
          <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Mã đơn hàng</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(order.orderCode)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Ngày đặt</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(formatDate(order.createdAt))}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Phương thức thanh toán</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(order.paymentMethod)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Trạng thái thanh toán</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(paymentStatusLabel)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Trạng thái đơn hàng</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(order.status)}</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;vertical-align:top;">Địa chỉ giao hàng</td><td style="padding:8px 12px;border:1px solid #e5e7eb;white-space:pre-wrap;">${escapeHtml(order.address)}</td></tr>
        </tbody>
      </table>
      <h3 style="margin:18px 0 8px;">Sản phẩm</h3>
      <table style="border-collapse:collapse;width:100%;max-width:720px;margin:0 0 16px;">
        <thead>
          <tr>
            <th style="padding:10px;border-bottom:2px solid #d1d5db;text-align:left;">Sản phẩm</th>
            <th style="padding:10px;border-bottom:2px solid #d1d5db;text-align:center;">SL</th>
            <th style="padding:10px;border-bottom:2px solid #d1d5db;text-align:right;">Đơn giá</th>
            <th style="padding:10px;border-bottom:2px solid #d1d5db;text-align:right;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>${renderItemsHtml(order.orderItems || [])}</tbody>
      </table>
      <p style="font-size:18px;font-weight:700;">Tổng tiền: ${escapeHtml(formatMoney(order.totalAmount))}</p>
      ${managementUrl ? `<p><a href="${escapeHtml(managementUrl)}" style="display:inline-block;padding:10px 16px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;">Quản lý đơn hàng</a></p>` : `<p><a href="${escapeHtml(accountOrdersUrl)}" style="color:#111827;">Xem lịch sử đơn hàng</a></p>`}
      <p>Trân trọng,<br>FurnitureEcommerce</p>
    </div>
  `;

  const textParts = [
    'Cảm ơn bạn đã đặt hàng tại FurnitureEcommerce.',
    toTextLine('Họ tên', order.fullName),
    toTextLine('Mã đơn hàng', order.orderCode),
    toTextLine('Ngày đặt', formatDate(order.createdAt)),
    toTextLine('Phương thức thanh toán', order.paymentMethod),
    toTextLine('Trạng thái thanh toán', paymentStatusLabel),
    toTextLine('Trạng thái đơn hàng', order.status),
    toTextLine('Địa chỉ giao hàng', order.address),
    '',
    'Sản phẩm:',
    renderItemsText(order.orderItems || []),
    '',
    toTextLine('Tổng tiền', formatMoney(order.totalAmount))
  ];
  if (managementUrl) textParts.push('', `Quản lý đơn hàng: ${managementUrl}`);
  else textParts.push('', `Lịch sử đơn hàng: ${accountOrdersUrl}`);

  return { to: order.customerEmail, subject, html, text: textParts.join('\n') };
};

const getClaimWhere = (orderId, staleCutoff) => ({
  id: orderId,
  confirmationEmailSentAt: null,
  OR: [
    { confirmationEmailStatus: CONFIRMATION_EMAIL_STATUS.PENDING },
    { confirmationEmailStatus: CONFIRMATION_EMAIL_STATUS.FAILED },
    {
      confirmationEmailStatus: CONFIRMATION_EMAIL_STATUS.SENDING,
      confirmationEmailClaimedAt: { lt: staleCutoff }
    }
  ]
});

const getOrderForEmail = (client, orderId) => client.order.findUnique({
  where: { id: orderId },
  include: { orderItems: true }
});

export const claimOrderConfirmationEmail = async (orderId, { rawManagementToken } = {}) => {
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - STALE_CLAIM_TIMEOUT_MS);

  return prisma.$transaction(async (tx) => {
    const order = await getOrderForEmail(tx, orderId);
    if (!order) return { claimed: false, reason: 'not_found' };
    if (order.confirmationEmailSentAt || order.confirmationEmailStatus === CONFIRMATION_EMAIL_STATUS.SENT) {
      return { claimed: false, reason: 'already_sent' };
    }
    if (order.confirmationEmailStatus === null) {
      return { claimed: false, reason: 'not_initialized' };
    }
    if (!isOrderEligibleForConfirmationEmail(order)) {
      return { claimed: false, reason: 'not_eligible' };
    }

    const isGuest = isGuestOrder(order);
    let tokenForEmail = null;
    let tokenUpdate = {};

    if (isGuest) {
      const rawMatchesStoredHash = rawManagementToken && order.managementTokenHash && hashToken(rawManagementToken) === order.managementTokenHash;
      if (rawMatchesStoredHash) {
        tokenForEmail = rawManagementToken;
      } else {
        const replacementToken = await generateUniqueGuestOrderManagementToken(tx, now);
        tokenForEmail = replacementToken.rawToken;
        tokenUpdate = {
          managementTokenHash: replacementToken.tokenHash,
          managementTokenExpiresAt: replacementToken.expiresAt,
          managementTokenRevokedAt: null
        };
      }
    }

    const claim = await tx.order.updateMany({
      where: getClaimWhere(orderId, staleCutoff),
      data: {
        confirmationEmailStatus: CONFIRMATION_EMAIL_STATUS.SENDING,
        confirmationEmailClaimedAt: now,
        confirmationEmailAttemptCount: { increment: 1 },
        confirmationEmailLastErrorAt: null,
        confirmationEmailLastErrorCode: null,
        ...tokenUpdate
      }
    });

    if (claim.count !== 1) return { claimed: false, reason: 'claim_lost' };

    const claimedOrder = await getOrderForEmail(tx, orderId);
    return {
      claimed: true,
      order: claimedOrder,
      rawManagementToken: tokenForEmail,
      claimedAt: now,
      attemptCount: claimedOrder.confirmationEmailAttemptCount
    };
  });
};

export const markOrderConfirmationEmailSent = async ({ orderId, attemptCount }) => {
  const sentAt = new Date();
  const result = await prisma.order.updateMany({
    where: {
      id: orderId,
      confirmationEmailStatus: CONFIRMATION_EMAIL_STATUS.SENDING,
      confirmationEmailAttemptCount: attemptCount,
      confirmationEmailSentAt: null
    },
    data: {
      confirmationEmailStatus: CONFIRMATION_EMAIL_STATUS.SENT,
      confirmationEmailSentAt: sentAt
    }
  });

  return { marked: result.count === 1, sentAt };
};

export const markOrderConfirmationEmailFailed = async ({ orderId, attemptCount, errorCode = SMTP_SEND_FAILED }) => {
  const result = await prisma.order.updateMany({
    where: {
      id: orderId,
      confirmationEmailStatus: CONFIRMATION_EMAIL_STATUS.SENDING,
      confirmationEmailAttemptCount: attemptCount,
      confirmationEmailSentAt: null
    },
    data: {
      confirmationEmailStatus: CONFIRMATION_EMAIL_STATUS.FAILED,
      confirmationEmailLastErrorAt: new Date(),
      confirmationEmailLastErrorCode: errorCode
    }
  });

  return { marked: result.count === 1 };
};

export const deliverOrderConfirmationEmail = async (orderId, options = {}) => {
  const { rawManagementToken, sendEmail = sendTransactionalEmail } = options;
  const claim = await claimOrderConfirmationEmail(orderId, { rawManagementToken });
  if (!claim.claimed) return { status: 'skipped', reason: claim.reason };

  const email = buildOrderConfirmationEmail({
    order: claim.order,
    rawManagementToken: claim.rawManagementToken
  });

  try {
    await sendEmail(email);
    const mark = await markOrderConfirmationEmailSent({ orderId, attemptCount: claim.attemptCount });
    return { status: mark.marked ? 'sent' : 'sent_mark_lost' };
  } catch {
    await markOrderConfirmationEmailFailed({ orderId, attemptCount: claim.attemptCount });
    return { status: 'failed', errorCode: SMTP_SEND_FAILED };
  }
};

export const prepareOrderConfirmationEmailPreview = buildOrderConfirmationEmail;
