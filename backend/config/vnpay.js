import crypto from 'crypto';
import querystring from 'qs';
import moment from 'moment';

const requiredConfigKeys = [
  'VNP_TMNCODE',
  'VNP_HASHSECRET',
  'VNP_URL',
  'VNP_RETURNURL',
];

const PAYMENT_HOSTS = {
  sandbox: new Set([
    'sandbox.vnpayment.vn',
  ]),
  production: new Set([
    'pay.vnpay.vn',
    'www.vnpayment.vn',
  ]),
};

export const resolveVNPayEnvironment = (
  environment = process.env,
) => (
  String(
    environment.VNP_ENV
    || (
      environment.NODE_ENV === 'production'
        ? 'production'
        : 'sandbox'
    ),
  )
    .trim()
    .toLowerCase()
);

export const validateVNPayEnvironmentConfig = (
  environment = process.env,
) => {
  const selectedEnvironment =
    resolveVNPayEnvironment(environment);

  if (!PAYMENT_HOSTS[selectedEnvironment]) {
    return {
      valid: false,
      issue: 'VNP_ENV must be sandbox or production',
    };
  }

  try {
    const paymentUrl = new URL(
      String(environment.VNP_URL || '').trim(),
    );

    const returnUrl = new URL(
      String(environment.VNP_RETURNURL || '').trim(),
    );

    const frontendUrl = new URL(
      String(environment.FRONTEND_URL || '').trim(),
    );

    if (
      paymentUrl.protocol !== 'https:'
      || !PAYMENT_HOSTS[selectedEnvironment].has(
        paymentUrl.hostname,
      )
    ) {
      return {
        valid: false,
        issue:
          `VNP_URL must use an approved ${selectedEnvironment} VNPay HTTPS host`,
      };
    }

    if (
      returnUrl.protocol !== 'https:'
      || returnUrl.origin !== frontendUrl.origin
      || returnUrl.pathname !== '/payment-result'
      || returnUrl.search
      || returnUrl.hash
    ) {
      return {
        valid: false,
        issue:
          'VNP_RETURNURL must be the HTTPS FRONTEND_URL origin with /payment-result path',
      };
    }
  } catch {
    return {
      valid: false,
      issue: 'VNPay URLs must be absolute HTTPS URLs',
    };
  }

  return {
    valid: true,
    selectedEnvironment,
  };
};

const assertVNPayConfig = () => {
  const missing = requiredConfigKeys.filter((key) => {
    return !String(process.env[key] || '').trim();
  });

  if (missing.length > 0) {
    const error = new Error(
      'VNPAY_CONFIG_MISSING',
    );

    error.code = 'VNPAY_CONFIG_MISSING';
    error.missingKeys = missing;

    throw error;
  }

  const environmentCheck =
    validateVNPayEnvironmentConfig();

  if (!environmentCheck.valid) {
    const error = new Error(
      'VNPAY_ENVIRONMENT_CONFIG_INVALID',
    );

    error.code =
      'VNPAY_ENVIRONMENT_CONFIG_INVALID';

    error.issue = environmentCheck.issue;

    throw error;
  }
};

const normalizeIpAddress = (ipAddr) => {
  const value = String(ipAddr || '').trim();

  if (!value || value === '::1') {
    return '127.0.0.1';
  }

  if (value.startsWith('::ffff:')) {
    return value.slice(
      '::ffff:'.length,
    );
  }

  if (value.includes(',')) {
    return normalizeIpAddress(
      value.split(',')[0],
    );
  }

  return value;
};

const sortObject = (input) => {
  return Object.keys(input)
    .sort()
    .reduce((result, key) => {
      const value = input[key];

      if (
        value !== undefined
        && value !== null
      ) {
        result[encodeURIComponent(key)] =
          encodeURIComponent(
            String(value),
          ).replace(/%20/g, '+');
      }

      return result;
    }, {});
};

const createVNPaySecureHash = ({
  params,
  secretKey,
}) => {
  const sortedParams =
    sortObject(params);

  const signData =
    querystring.stringify(
      sortedParams,
      {
        encode: false,
      },
    );

  const secureHash = crypto
    .createHmac(
      'sha512',
      secretKey,
    )
    .update(
      Buffer.from(
        signData,
        'utf-8',
      ),
    )
    .digest('hex')
    .toLowerCase();

  return {
    sortedParams,
    signData,
    secureHash,
  };
};

export const createVNPayUrl = (
  ipAddr,
  orderId,
  amount,
  orderInfo,
) => {
  assertVNPayConfig();

  const tmnCode = String(
    process.env.VNP_TMNCODE || '',
  ).trim();

  const secretKey = String(
    process.env.VNP_HASHSECRET || '',
  ).trim();

  let vnpUrl = String(
    process.env.VNP_URL || '',
  ).trim();

  const returnUrl = String(
    process.env.VNP_RETURNURL || '',
  ).trim();

  const numericAmount =
    Number(amount);

  if (
    !orderId
    || !orderInfo
    || !Number.isFinite(numericAmount)
    || numericAmount <= 0
  ) {
    const error = new Error(
      'VNPAY_INVALID_PAYMENT_INPUT',
    );

    error.code =
      'VNPAY_INVALID_PAYMENT_INPUT';

    throw error;
  }

  const date = new Date();

  const createDate = moment(date)
    .format('YYYYMMDDHHmmss');

  const expireDate = moment(date)
    .add(15, 'minutes')
    .format('YYYYMMDDHHmmss');

  console.log(
    '[VNPay payment time debug]',
    {
      serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      processTimezone: process.env.TZ,
      nodeEnv: process.env.NODE_ENV,
      vnpEnv: process.env.VNP_ENV,
      serverLocalTime: date.toString(),
      serverIsoTime: date.toISOString(),
      timestampMilliseconds: date.getTime(),
      createDate,
      expireDate,
      createToExpireMinutes: moment(expireDate, 'YYYYMMDDHHmmss')
        .diff(moment(createDate, 'YYYYMMDDHHmmss'), 'minutes'),
    },
  );

  const rawParams = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: String(orderId),
    vnp_OrderInfo: String(orderInfo),
    vnp_OrderType: 'other',
    vnp_Amount: Math.round(
      numericAmount * 100,
    ),
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr:
      normalizeIpAddress(ipAddr),
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  console.log(
    '[VNPay payment raw params]',
    rawParams,
  );

  const {
    sortedParams,
    signData,
    secureHash,
  } = createVNPaySecureHash({
    params: rawParams,
    secretKey,
  });

  console.log(
    '[VNPay payment signed params]',
    {
      sortedParams,
      signData,
      secureHash,
    },
  );

  console.log(
    '[VNPay payment URL debug]',
    {
      environment:
        resolveVNPayEnvironment(),

      paymentHost:
        new URL(vnpUrl).hostname,

      tmnCode,

      tmnCodeLength:
        tmnCode.length,

      secretLength:
        secretKey.length,

      secretPrefix:
        secretKey.slice(0, 2),

      secretSuffix:
        secretKey.slice(-2),

      returnUrl,

      parameterKeys:
        Object.keys(sortedParams),

      signData,

      secureHashPrefix:
        secureHash.slice(0, 12),
    },
  );

  const paymentParams = {
    ...sortedParams,
    vnp_SecureHash:
      secureHash,
  };

  const paymentQuery =
    querystring.stringify(
      paymentParams,
      {
        encode: false,
      },
    );

  vnpUrl += `?${paymentQuery}`;

  console.log(
    '[VNPay payment URL generated]',
    {
      environment:
        resolveVNPayEnvironment(),

      paymentHost:
        new URL(vnpUrl).hostname,

      tmnCode,

      txnRef:
        String(orderId),

      amount:
        Math.round(
          numericAmount * 100,
        ),

      createDate,

      expireDate,

      returnUrl,

      paymentUrlLength:
        vnpUrl.length,

      paymentUrl:
        vnpUrl,
    },
  );

  return vnpUrl;
};

export const verifyVNPaySignature = (
  inputParams,
) => {
  assertVNPayConfig();

  const vnpParams = {
    ...inputParams,
  };

  const receivedHash = String(
    vnpParams.vnp_SecureHash || '',
  )
    .trim()
    .toLowerCase();

  const secretKey = String(
    process.env.VNP_HASHSECRET || '',
  ).trim();

  const tmnCode = String(
    process.env.VNP_TMNCODE || '',
  ).trim();

  delete vnpParams.vnp_SecureHash;
  delete vnpParams.vnp_SecureHashType;

  const {
    sortedParams,
    signData,
    secureHash:
    calculatedHash,
  } = createVNPaySecureHash({
    params: vnpParams,
    secretKey,
  });

  console.log(
    '[VNPay signature verification values]',
    {
      receivedHash,
      calculatedHash,
      signData,
      sortedParams,
    },
  );

  const isComparable =
    receivedHash.length > 0
    && receivedHash.length
    === calculatedHash.length;

  const isValid = isComparable
    ? crypto.timingSafeEqual(
      Buffer.from(
        receivedHash,
        'utf8',
      ),
      Buffer.from(
        calculatedHash,
        'utf8',
      ),
    )
    : false;

  console.log(
    '[VNPay signature verification]',
    {
      environment:
        resolveVNPayEnvironment(),

      tmnCode,

      tmnCodeLength:
        tmnCode.length,

      receivedTmnCode:
        String(
          vnpParams.vnp_TmnCode
          || '',
        ),

      secretLength:
        secretKey.length,

      secretPrefix:
        secretKey.slice(0, 2),

      secretSuffix:
        secretKey.slice(-2),

      parameterKeys:
        Object.keys(sortedParams),

      signData,

      receivedHashPrefix:
        receivedHash.slice(0, 12),

      calculatedHashPrefix:
        calculatedHash.slice(0, 12),

      receivedHashLength:
        receivedHash.length,

      calculatedHashLength:
        calculatedHash.length,

      matched:
        isValid,
    },
  );

  return isValid;
};
