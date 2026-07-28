import assert from 'node:assert/strict';
import test from 'node:test';
import { assertImageSignature, detectImageMimeType } from '../utils/imageSignature.js';

test('image signature validation accepts matching JPEG, PNG, and WebP bytes', () => {
  assert.equal(detectImageMimeType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(detectImageMimeType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(detectImageMimeType(Buffer.from('RIFFxxxxWEBP', 'ascii')), 'image/webp');
});

test('image signature validation rejects MIME spoofing and unknown binary', () => {
  assert.throws(() => assertImageSignature({ mimetype: 'image/png', buffer: Buffer.from([0xff, 0xd8, 0xff]) }), /INVALID_IMAGE_SIGNATURE/);
  assert.throws(() => assertImageSignature({ mimetype: 'image/jpeg', buffer: Buffer.from('not-an-image') }), /INVALID_IMAGE_SIGNATURE/);
});
