import React from 'react';

export default function ProductBadge({
  product,
  discountPercent: discountPercentProp,
  className = '',
}) {
  const discountPercent = Number(discountPercentProp ?? product?.discountPercent ?? 0);
  const hasPromotion = Boolean(product?.hasPromotion && discountPercent > 0);

  if (!hasPromotion) return null;

  return <span className={className}>-{discountPercent}%</span>;
}
