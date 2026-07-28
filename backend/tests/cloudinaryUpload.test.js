import assert from 'node:assert/strict';
import test from 'node:test';
import { uploadImageBuffer } from '../utils/cloudinaryUpload.js';

test('uploadImageBuffer resolves the secure Cloudinary URL for a buffered image', async () => {
  const upload = uploadImageBuffer({
    cloudinary: {
      uploader: {
        upload_stream: (options, callback) => {
          assert.deepEqual(options, { folder: 'FurnitureEcommerce/products', resource_type: 'image' });
          return { end: (buffer) => callback(null, { secure_url: `https://cdn.example/${buffer.toString('utf8')}.webp` }) };
        }
      }
    },
    buffer: Buffer.from('chair'),
    folder: 'FurnitureEcommerce/products'
  });

  await assert.doesNotReject(upload);
  assert.equal(await upload, 'https://cdn.example/chair.webp');
});

test('uploadImageBuffer rejects missing secure and non-secure URLs', async () => {
  await assert.rejects(
    uploadImageBuffer({
      cloudinary: { uploader: { upload_stream: (_options, callback) => ({ end: () => callback(null, {}) }) } },
      buffer: Buffer.from('chair'),
      folder: 'FurnitureEcommerce/products'
    }),
    /Cloudinary response did not include an image URL/
  );
});

test('uploadImageBuffer propagates Cloudinary failures', async () => {
  await assert.rejects(
    uploadImageBuffer({
      cloudinary: { uploader: { upload_stream: (_options, callback) => ({ end: () => callback(new Error('Cloudinary unavailable')) }) } },
      buffer: Buffer.from('chair'),
      folder: 'FurnitureEcommerce/products'
    }),
    /Cloudinary unavailable/
  );
});
