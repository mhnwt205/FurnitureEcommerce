import assert from 'node:assert/strict';
import test from 'node:test';
import { validateVNPayEnvironmentConfig } from '../config/vnpay.js';

const baseEnvironment = {
  NODE_ENV: 'production',
  VNP_ENV: 'production',
  VNP_URL: 'https://pay.vnpay.vn/vpcpay.html',
  FRONTEND_URL: 'https://shop.example.com',
  VNP_RETURNURL: 'https://shop.example.com/payment-result'
};

test('VNPay production configuration accepts an approved payment host and frontend return route', () => {
  assert.deepEqual(validateVNPayEnvironmentConfig(baseEnvironment), { valid: true, selectedEnvironment: 'production' });
});

test('VNPay environment validation rejects sandbox/production endpoint mixing', () => {
  const result = validateVNPayEnvironmentConfig({ ...baseEnvironment, VNP_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html' });
  assert.equal(result.valid, false);
  assert.match(result.issue, /approved production/);
});

test('VNPay environment validation rejects a return URL outside the configured frontend route', () => {
  const result = validateVNPayEnvironmentConfig({ ...baseEnvironment, VNP_RETURNURL: 'https://attacker.example.com/payment-result' });
  assert.equal(result.valid, false);
  assert.match(result.issue, /FRONTEND_URL/);
});
