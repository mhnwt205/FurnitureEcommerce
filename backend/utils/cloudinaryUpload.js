const uploadMetadata = ({ requestId, fileName, fileSize, mimetype }) => ({ requestId, fileName, fileSize, mimetype });

const errorMetadata = (error) => ({
  name: error?.name,
  message: error?.message,
  stack: error?.stack,
  http_code: error?.http_code,
  response: error?.response,
  error
});

export const uploadImageAsset = ({ cloudinary, buffer, folder, requestId, fileName, fileSize, mimetype }) => new Promise((resolve, reject) => {
  const metadata = uploadMetadata({ requestId, fileName, fileSize, mimetype });
  const uploadStream = cloudinary.uploader.upload_stream(
    { folder, resource_type: 'image' },
    (error, result) => {
      if (error) {
        if (requestId) console.error('Cloudinary upload failed:', { ...metadata, folder, ...errorMetadata(error) }, error);
        return reject(error);
      }
      const imageUrl = result?.secure_url || result?.url;
      if (!imageUrl) {
        const missingUrlError = new Error('Cloudinary response did not include an image URL');
        if (requestId) console.error('Cloudinary upload failed:', { ...metadata, folder, result, ...errorMetadata(missingUrlError) }, missingUrlError);
        return reject(missingUrlError);
      }
      if (requestId) console.info('Cloudinary success:', { ...metadata, folder, public_id: result.public_id, secure_url: result.secure_url });
      return resolve({ imageUrl, publicId: result.public_id });
    }
  );

  uploadStream.end(buffer);
});

export const uploadImageBuffer = async (options) => (await uploadImageAsset(options)).imageUrl;

export const cleanupCloudinaryAssets = async ({ cloudinary, assets }) => {
  await Promise.allSettled(assets.filter((asset) => asset?.publicId).map((asset) => cloudinary.uploader.destroy(asset.publicId, { resource_type: 'image' })));
};
