import React, { useState, useEffect } from 'react';
import { wishlistService } from '../../services/api/wishlistService';

export default function WishlistButton({ productId, initialIsActive = false, className, iconClassName }) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsActive(initialIsActive);
  }, [initialIsActive]);

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const token = localStorage.getItem('token');
    if (!token) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Vui lòng đăng nhập để thêm sản phẩm yêu thích.', type: 'error' } }));
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      if (isActive) {
        await wishlistService.removeWishlist(productId);
        setIsActive(false);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Đã xóa khỏi yêu thích', type: 'success' } }));
      } else {
        await wishlistService.addWishlist(productId);
        setIsActive(true);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Đã thêm vào yêu thích', type: 'success' } }));
      }
    } catch (error) {
      console.error(error);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Có lỗi xảy ra', type: 'error' } }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleToggle} 
      className={`flex items-center justify-center transition-all duration-300 ${className || ''} ${isActive ? '!text-accent-terracotta !bg-white !opacity-100' : ''}`}
      disabled={loading}
    >
      <span 
        className={`material-symbols-outlined ${iconClassName || ''}`} 
        style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
      >
        favorite
      </span>
    </button>
  );
}
