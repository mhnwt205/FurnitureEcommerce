export const PRODUCT_IMAGE_PLACEHOLDER = 'https://placehold.co/800x1000?text=No+Image';
export const PRODUCT_THUMB_PLACEHOLDER = 'https://placehold.co/100x100?text=No+Image';

export const getStaticFileUrl = (path) => {
  if (!path) return null;
  if (typeof path !== 'string') return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const staticBase = apiBase.replace(/\/api\/?$/, '');
  
  return `${staticBase}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Alias for backwards compatibility, though new code should use getStaticFileUrl
export const getFullImageUrl = getStaticFileUrl;

export const getProductImages = (product) => {
  const sources = [];
  if (product?.imageUrl) sources.push(product.imageUrl);
  if (Array.isArray(product?.images)) {
    product.images.forEach((image) => sources.push(image?.imageUrl || image));
  }

  return [...new Set(sources.map((image) => getStaticFileUrl(image)).filter(Boolean))];
};

export const getProductImage = (product, fallback = PRODUCT_IMAGE_PLACEHOLDER) => {
  if (!product) return fallback;
  if (Array.isArray(product.images) && product.images.length > 0) {
    const primary = product.images.find(img => img?.isPrimary);
    if (primary) return getStaticFileUrl(primary.imageUrl) || fallback;
    return getStaticFileUrl(product.images[0]?.imageUrl || product.images[0]) || fallback;
  }
  if (product.imageUrl) {
    return getStaticFileUrl(product.imageUrl) || fallback;
  }
  return fallback;
};

export const getProductMainImage = (product) => getProductImage(product, PRODUCT_IMAGE_PLACEHOLDER);
