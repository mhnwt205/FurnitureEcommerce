import { useState, useEffect } from 'react';
import { getProductMainImage } from '../utils/imageUtils';
import { productService } from '../services/api/productService';
import { canPurchaseQuantity, getAvailableStock } from '../utils/stockUtils';

const CART_MESSAGES = {
  PRODUCT_UNAVAILABLE: 'Sản phẩm hiện không còn khả dụng.',
  OUT_OF_STOCK: 'Sản phẩm đã hết hàng.',
  INVALID_QUANTITY: 'Số lượng sản phẩm không hợp lệ.',
  INSUFFICIENT_STOCK: 'Số lượng yêu cầu vượt quá tồn kho hiện có.'
};

const successResult = () => ({ success: true });
const failureResult = (code) => ({ success: false, code, message: CART_MESSAGES[code] });

const notifyCart = (message) => {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message } }));
};

const parseCartItems = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('cartItems') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

const getItemQuantity = (item) => {
  const quantity = Number(item?.quantity);
  return Number.isInteger(quantity) && quantity > 0 ? quantity : 0;
};

const getRequestedQuantity = (quantity) => {
  const requested = Number(quantity);
  return Number.isInteger(requested) && requested > 0 ? requested : null;
};

const getProductId = (product) => product?.id ?? product?.productId;

const validateProductForCart = (product, quantity) => {
  const productId = getProductId(product);
  if (!product || productId === null || productId === undefined || product.isActive === false) {
    return failureResult('PRODUCT_UNAVAILABLE');
  }

  const requestedQuantity = getRequestedQuantity(quantity);
  if (!requestedQuantity) {
    return failureResult('INVALID_QUANTITY');
  }

  const availableStock = getAvailableStock(product);
  if (availableStock <= 0) {
    return failureResult('OUT_OF_STOCK');
  }

  if (!canPurchaseQuantity(product, requestedQuantity)) {
    return failureResult('INSUFFICIENT_STOCK');
  }

  return { success: true, productId, requestedQuantity, availableStock };
};

export function useCart() {
  const [cartItems, setCartItems] = useState([]);

  const getCartItemUnitPrice = (item) => Number(item.finalPrice ?? item.displayPrice ?? item.price ?? 0);

  // Load cart from localStorage on mount and when 'cart-change' event occurs
  useEffect(() => {
    const loadCart = () => {
      setCartItems(parseCartItems());
    };

    loadCart();

    window.addEventListener('cart-change', loadCart);
    return () => window.removeEventListener('cart-change', loadCart);
  }, []);

  const saveCart = (items) => {
    localStorage.setItem('cartItems', JSON.stringify(items));
    setCartItems(items);
    window.dispatchEvent(new Event('cart-change'));
  };

  const getStoredCartItems = () => parseCartItems();

  const refreshCartPricing = async () => {
    const sourceItems = cartItems.length > 0 ? cartItems : getStoredCartItems();
    if (!sourceItems.length) return [];

    const refreshedItems = await Promise.all(sourceItems.map(async (item) => {
      try {
        const latestProduct = await productService.getProductById(item.id);
        const imageUrl = getProductMainImage(latestProduct);
        return { ...item, ...latestProduct, imageUrl, quantity: item.quantity };
      } catch (error) {
        return item;
      }
    }));

    saveCart(refreshedItems);
    return refreshedItems;
  };

  const addToCart = (product, quantity = 1) => {
    const validation = validateProductForCart(product, quantity);
    if (!validation.success) {
      notifyCart(validation.message);
      return validation;
    }

    const { productId, requestedQuantity, availableStock } = validation;
    const existing = cartItems.find(item => item.id === productId);
    const existingQuantity = getItemQuantity(existing);

    if (existingQuantity + requestedQuantity > availableStock) {
      const result = failureResult('INSUFFICIENT_STOCK');
      notifyCart(result.message);
      return result;
    }

    let newItems;
    if (existing) {
      newItems = cartItems.map(item =>
        item.id === productId
          ? { ...item, ...product, imageUrl: getProductMainImage(product), quantity: existingQuantity + requestedQuantity }
          : item
      );
      notifyCart('Đã cập nhật số lượng ' + product.name + ' trong giỏ hàng');
    } else {
      const imageUrl = getProductMainImage(product);
      newItems = [...cartItems, { ...product, id: productId, imageUrl, quantity: requestedQuantity }];
      notifyCart('Đã thêm ' + product.name + ' vào giỏ hàng');
    }

    saveCart(newItems);
    return successResult();
  };

  const updateQuantity = (productId, delta) => {
    const requestedDelta = Number(delta);
    if (!Number.isInteger(requestedDelta)) {
      const result = failureResult('INVALID_QUANTITY');
      notifyCart(result.message);
      return result;
    }

    const existing = cartItems.find(item => item.id === productId);
    if (!existing) return failureResult('PRODUCT_UNAVAILABLE');

    const currentQuantity = getItemQuantity(existing);
    const nextQuantity = currentQuantity + requestedDelta;

    if (nextQuantity <= 0) {
      const newItems = cartItems.map(item => (
        item.id === productId ? { ...item, quantity: 1 } : item
      ));
      saveCart(newItems);
      return successResult();
    }

    const availableStock = getAvailableStock(existing);
    if (existing.isActive === false && requestedDelta > 0) {
      const result = failureResult('PRODUCT_UNAVAILABLE');
      notifyCart(result.message);
      return result;
    }

    if (availableStock <= 0 && requestedDelta > 0) {
      const result = failureResult('OUT_OF_STOCK');
      notifyCart(result.message);
      return result;
    }

    if (requestedDelta > 0 && availableStock > 0 && nextQuantity > availableStock) {
      const result = failureResult('INSUFFICIENT_STOCK');
      notifyCart(result.message);
      return result;
    }

    const newItems = cartItems.map(item => (
      item.id === productId ? { ...item, quantity: nextQuantity } : item
    ));
    saveCart(newItems);
    return successResult();
  };

  const removeFromCart = (productId) => {
    const newItems = cartItems.filter(item => item.id !== productId);
    saveCart(newItems);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + getItemQuantity(item), 0);
  const cartTotal = cartItems.reduce((acc, item) => (acc + (getCartItemUnitPrice(item) * getItemQuantity(item))), 0);

  return {
    cartItems,
    cartCount,
    cartTotal,
    getCartItemUnitPrice,
    refreshCartPricing,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart
  };
}
