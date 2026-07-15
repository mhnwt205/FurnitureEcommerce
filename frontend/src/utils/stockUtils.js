export function normalizeStock(stock) {
  const value = Number(stock);
  return Number.isFinite(value) ? value : 0;
}

export function isOutOfStock(product) {
  return normalizeStock(product?.stock) <= 0;
}


export function getAvailableStock(product) {
  return Math.max(0, normalizeStock(product?.stock));
}

export function canPurchaseQuantity(product, quantity) {
  const stock = getAvailableStock(product);
  const requested = Number(quantity);

  return (
    stock > 0 &&
    Number.isInteger(requested) &&
    requested > 0 &&
    requested <= stock
  );
}
