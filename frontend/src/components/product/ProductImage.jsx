import React from 'react';
import { getProductImages, getStaticFileUrl } from '../../utils/imageUtils';

export default function ProductImage({
  product,
  src,
  alt,
  className = '',
  placeholder = null,
  loading = 'lazy',
  decoding = 'async',
  ...props
}) {
  const productImages = product ? getProductImages(product) : [];
  const imageSrc = getStaticFileUrl(src || productImages[0]);

  if (!imageSrc) return placeholder;

  return (
    <img
      src={imageSrc}
      alt={alt ?? product?.name ?? ''}
      loading={loading}
      decoding={decoding}
      className={className}
      {...props}
    />
  );
}
