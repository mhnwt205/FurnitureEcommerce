import crypto from 'crypto';
import querystring from 'qs';
import moment from 'moment';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const requiredConfigKeys = ['VNP_TMNCODE', 'VNP_HASHSECRET', 'VNP_URL', 'VNP_RETURNURL'];

const assertVNPayConfig = () => {
  const missing = requiredConfigKeys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    const error = new Error('VNPAY_CONFIG_MISSING');
    error.code = 'VNPAY_CONFIG_MISSING';
    error.missingKeys = missing;
    throw error;
  }
};

const normalizeIpAddress = (ipAddr) => {
  const value = String(ipAddr || '').trim();
  if (!value || value === '::1') return '127.0.0.1';
  if (value.startsWith('::ffff:')) return value.slice('::ffff:'.length);
  if (value.includes(',')) return normalizeIpAddress(value.split(',')[0]);
  return value;
};

export const createVNPayUrl = (ipAddr, orderId, amount, orderInfo) => {
  assertVNPayConfig();

  const tmnCode = process.env.VNP_TMNCODE;
  const secretKey = process.env.VNP_HASHSECRET;
  let vnpUrl = process.env.VNP_URL;
  const returnUrl = process.env.VNP_RETURNURL;
  const numericAmount = Number(amount);

  if (!orderId || !orderInfo || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    const error = new Error('VNPAY_INVALID_PAYMENT_INPUT');
    error.code = 'VNPAY_INVALID_PAYMENT_INPUT';
    throw error;
  }

  const date = new Date();
  const createDate = moment(date).format('YYYYMMDDHHmmss');
  
  // Format for expire date (typically +15 minutes)
  const expireDate = moment(date).add(15, 'minutes').format('YYYYMMDDHHmmss');

  let vnp_Params = {};
  vnp_Params['vnp_Version'] = '2.1.0';
  vnp_Params['vnp_Command'] = 'pay';
  vnp_Params['vnp_TmnCode'] = tmnCode;
  vnp_Params['vnp_Locale'] = 'vn';
  vnp_Params['vnp_CurrCode'] = 'VND';
  vnp_Params['vnp_TxnRef'] = orderId;
  vnp_Params['vnp_OrderInfo'] = orderInfo;
  vnp_Params['vnp_OrderType'] = 'other';
  vnp_Params['vnp_Amount'] = Math.round(numericAmount * 100); // VNPay requires amount * 100
  vnp_Params['vnp_ReturnUrl'] = returnUrl;
  vnp_Params['vnp_IpAddr'] = normalizeIpAddress(ipAddr);
  vnp_Params['vnp_CreateDate'] = createDate;
  vnp_Params['vnp_ExpireDate'] = expireDate;

  // Sort keys alphabetically
  vnp_Params = sortObject(vnp_Params);

  // Generate signature
  const signData = querystring.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  
  vnp_Params['vnp_SecureHash'] = signed;
  vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

  return vnpUrl;
};

export const verifyVNPaySignature = (vnp_Params) => {
  assertVNPayConfig();

  const secureHash = vnp_Params['vnp_SecureHash'];
  const secretKey = process.env.VNP_HASHSECRET;

  delete vnp_Params['vnp_SecureHash'];
  delete vnp_Params['vnp_SecureHashType'];

  vnp_Params = sortObject(vnp_Params);

  const signData = querystring.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return secureHash === signed;
};

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}
