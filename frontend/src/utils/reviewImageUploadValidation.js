export const REVIEW_IMAGE_MAX_FILES = 5;
export const REVIEW_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
]);

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

const getFileExtension = (fileName = '') => {
  const extension = fileName.split('.').pop();
  return extension?.toLowerCase() || '';
};

export const validateReviewImageFiles = (files) => {
  const selectedFiles = Array.from(files || []);

  if (selectedFiles.length > REVIEW_IMAGE_MAX_FILES) {
    return { error: `Bạn chỉ có thể chọn tối đa ${REVIEW_IMAGE_MAX_FILES} ảnh.` };
  }

  for (const file of selectedFiles) {
    if (!ALLOWED_MIME_TYPES.has(file.type) || !ALLOWED_EXTENSIONS.has(getFileExtension(file.name))) {
      return { error: 'Chỉ hỗ trợ ảnh JPG, JPEG, PNG hoặc WebP.' };
    }

    if (file.size > REVIEW_IMAGE_MAX_SIZE_BYTES) {
      return { error: 'Mỗi ảnh có dung lượng tối đa 5 MB.' };
    }
  }

  return { files: selectedFiles, error: '' };
};
