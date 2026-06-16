import { useState, useEffect } from 'react';
import { getProductMainImage } from '../utils/imageUtils';

export function useCart() {
  const [cartItems, setCartItems] = useState([]);

  // Load cart from localStorage on mount and when 'cart-change' event occurs
  useEffect(() => {
    const loadCart = () => {
      const stored = localStorage.getItem('cartItems');
      if (stored) {
        try {
          setCartItems(JSON.parse(stored));
        } catch (e) {
          setCartItems([]);
        }
      } else {
        setCartItems([]);
      }
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

  const addToCart = (product, quantity = 1) => {
    const existing = cartItems.find(item => item.id === product.id);
    let newItems;
    if (existing) {
      newItems = cartItems.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Đã cập nhật số lượng ${product.name} trong giỏ hàng` } }));
    } else {
      const imageUrl = getProductMainImage(product);
      newItems = [...cartItems, { ...product, imageUrl, quantity }];
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Đã thêm ${product.name} vào giỏ hàng` } }));
    }
    saveCart(newItems);
  };

  const updateQuantity = (productId, delta) => {
    const newItems = cartItems.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    saveCart(newItems);
  };

  const removeFromCart = (productId) => {
    const newItems = cartItems.filter(item => item.id !== productId);
    saveCart(newItems);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return {
    cartItems,
    cartCount,
    cartTotal,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart
  };
}
