const signatures = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], webp: true }
];

export const detectImageMimeType = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return null;
  for (const signature of signatures) {
    if (!signature.bytes.every((value, index) => buffer[index] === value)) continue;
    if (!signature.webp || buffer.subarray(8, 12).toString('ascii') === 'WEBP') return signature.mime;
  }
  return null;
};

export const assertImageSignature = (file) => {
  const detected = detectImageMimeType(file?.buffer);
  const normalizedMime = file?.mimetype === 'image/jpg' ? 'image/jpeg' : file?.mimetype;
  if (!detected || detected !== normalizedMime) throw new Error('INVALID_IMAGE_SIGNATURE');
};
