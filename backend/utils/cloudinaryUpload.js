export const uploadImageAsset = ({ cloudinary, buffer, folder }) => new Promise((resolve, reject) => {
  const uploadStream = cloudinary.uploader.upload_stream(
    { folder, resource_type: 'image' },
    (error, result) => {
      if (error) return reject(error);
      const imageUrl = result?.secure_url || result?.url;
      if (!imageUrl) return reject(new Error('Cloudinary response did not include an image URL'));
      return resolve({ imageUrl, publicId: result.public_id });
    }
  );

  uploadStream.end(buffer);
});

export const uploadImageBuffer = async (options) => (await uploadImageAsset(options)).imageUrl;

export const cleanupCloudinaryAssets = async ({ cloudinary, assets }) => {
  await Promise.allSettled(assets.filter((asset) => asset?.publicId).map((asset) => cloudinary.uploader.destroy(asset.publicId, { resource_type: 'image' })));
};
