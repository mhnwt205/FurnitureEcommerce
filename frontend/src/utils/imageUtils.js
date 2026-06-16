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

export const getProductMainImage = (product) => {
  if (!product) return 'https://placehold.co/800x1000?text=No+Image';
  if (product.images && product.images.length > 0) {
    const primary = product.images.find(img => img.isPrimary);
    if (primary) return getStaticFileUrl(primary.imageUrl);
    return getStaticFileUrl(product.images[0].imageUrl);
  }
  if (product.imageUrl) {
    return getStaticFileUrl(product.imageUrl);
  }
  return 'https://placehold.co/800x1000?text=No+Image';
};
