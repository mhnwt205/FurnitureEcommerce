import { describe, expect, it } from 'vitest';
import {
  REVIEW_IMAGE_MAX_FILES,
  REVIEW_IMAGE_MAX_SIZE_BYTES,
  validateReviewImageFiles
} from './reviewImageUploadValidation.js';

const createFile = (overrides = {}) => ({
  name: 'review.jpg',
  type: 'image/jpeg',
  size: 1024,
  ...overrides
});

describe('review image upload validation', () => {
  it('accepts a backend-compatible file at the size boundary', () => {
    const result = validateReviewImageFiles([createFile({ size: REVIEW_IMAGE_MAX_SIZE_BYTES })]);

    expect(result.error).toBe('');
    expect(result.files).toHaveLength(1);
  });

  it('accepts existing and newly selected files at the maximum count', () => {
    const existingFiles = Array.from({ length: REVIEW_IMAGE_MAX_FILES - 2 }, (_, index) => (
      createFile({ name: `existing-${index}.jpg` })
    ));
    const newlySelectedFiles = Array.from({ length: 2 }, (_, index) => (
      createFile({ name: `new-${index}.png`, type: 'image/png' })
    ));

    const result = validateReviewImageFiles([...existingFiles, ...newlySelectedFiles]);

    expect(result.error).toBe('');
    expect(result.files).toHaveLength(REVIEW_IMAGE_MAX_FILES);
  });

  it('rejects an unsupported MIME type', () => {
    expect(validateReviewImageFiles([createFile({ type: 'image/gif' })]).error).not.toBe('');
  });

  it('rejects an unsupported extension even with an allowed MIME type', () => {
    expect(validateReviewImageFiles([createFile({ name: 'review.gif' })]).error).not.toBe('');
  });

  it('rejects a file larger than the backend limit', () => {
    expect(validateReviewImageFiles([createFile({ size: REVIEW_IMAGE_MAX_SIZE_BYTES + 1 })]).error).not.toBe('');
  });

  it('rejects more files than the backend accepts', () => {
    const files = Array.from({ length: REVIEW_IMAGE_MAX_FILES + 1 }, (_, index) => createFile({ name: `review-${index}.webp`, type: 'image/webp' }));

    expect(validateReviewImageFiles(files).error).not.toBe('');
  });
});
