import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanupCloudinaryAssets, uploadImageAsset, uploadImageBuffer } from '../utils/cloudinaryUpload.js';

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

test('uploadImageAsset retains Cloudinary public IDs and cleanup destroys only uploaded assets', async () => {
  const destroyed = [];
  const cloudinary = {
    uploader: {
      upload_stream: (_options, callback) => ({ end: () => callback(null, { secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/FurnitureEcommerce/products/chair.webp', public_id: 'FurnitureEcommerce/products/chair' }) }),
      destroy: async (publicId, options) => destroyed.push({ publicId, options })
    }
  };
  const asset = await uploadImageAsset({ cloudinary, buffer: Buffer.from('chair'), folder: 'FurnitureEcommerce/products' });
  assert.deepEqual(asset, { imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/FurnitureEcommerce/products/chair.webp', publicId: 'FurnitureEcommerce/products/chair' });
  await cleanupCloudinaryAssets({ cloudinary, assets: [asset, { imageUrl: 'no-public-id' }] });
  assert.deepEqual(destroyed, [{ publicId: 'FurnitureEcommerce/products/chair', options: { resource_type: 'image' } }]);
});
