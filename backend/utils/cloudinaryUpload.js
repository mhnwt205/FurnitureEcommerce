export const uploadImageBuffer = ({ cloudinary, buffer, folder }) => new Promise((resolve, reject) => {
  const uploadStream = cloudinary.uploader.upload_stream(
    { folder, resource_type: 'image' },
    (error, result) => {
      if (error) return reject(error);
      const imageUrl = result?.secure_url || result?.url;
      if (!imageUrl) return reject(new Error('Cloudinary response did not include an image URL'));
      return resolve(imageUrl);
    }
  );

  uploadStream.end(buffer);
});
