import crypto from 'crypto';
import querystring from 'qs';
import moment from 'moment';

const requiredConfigKeys = ['VNP_TMNCODE', 'VNP_HASHSECRET', 'VNP_URL', 'VNP_RETURNURL'];

const PAYMENT_HOSTS = {
  sandbox: new Set(['sandbox.vnpayment.vn']),
  production: new Set(['pay.vnpay.vn', 'www.vnpayment.vn'])
};

export const resolveVNPayEnvironment = (environment = process.env) => (
  String(environment.VNP_ENV || (environment.NODE_ENV === 'production' ? 'production' : 'sandbox')).toLowerCase()
);

export const validateVNPayEnvironmentConfig = (environment = process.env) => {
  const selectedEnvironment = resolveVNPayEnvironment(environment);
  if (!PAYMENT_HOSTS[selectedEnvironment]) return { valid: false, issue: 'VNP_ENV must be sandbox or production' };

  try {
    const paymentUrl = new URL(environment.VNP_URL);
    const returnUrl = new URL(environment.VNP_RETURNURL);
    const frontendUrl = new URL(environment.FRONTEND_URL);
    if (paymentUrl.protocol !== 'https:' || !PAYMENT_HOSTS[selectedEnvironment].has(paymentUrl.hostname)) {
      return { valid: false, issue: `VNP_URL must use an approved ${selectedEnvironment} VNPay HTTPS host` };
    }
    if (returnUrl.protocol !== 'https:' || returnUrl.origin !== frontendUrl.origin || returnUrl.pathname !== '/payment-result') {
      return { valid: false, issue: 'VNP_RETURNURL must be the HTTPS FRONTEND_URL origin with /payment-result path' };
    }
  } catch {
    return { valid: false, issue: 'VNPay URLs must be absolute HTTPS URLs' };
  }
  return { valid: true, selectedEnvironment };
};

const assertVNPayConfig = () => {
  const missing = requiredConfigKeys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    const error = new Error('VNPAY_CONFIG_MISSING');
    error.code = 'VNPAY_CONFIG_MISSING';
    error.missingKeys = missing;
    throw error;
  }
  const environmentCheck = validateVNPayEnvironmentConfig();
  if (!environmentCheck.valid) {
    const error = new Error('VNPAY_ENVIRONMENT_CONFIG_INVALID');
    error.code = 'VNPAY_ENVIRONMENT_CONFIG_INVALID';
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
