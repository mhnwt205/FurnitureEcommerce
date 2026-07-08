import React from 'react';
import PriceDisplay from '../common/PriceDisplay';

export default function ProductPriceBlock({ product, ...props }) {
  return <PriceDisplay {...product} {...props} />;
}
