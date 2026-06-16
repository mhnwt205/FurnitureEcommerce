import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { wishlistService } from '../../services/api/wishlistService';
import { getStaticFileUrl } from '../../utils/imageUtils';

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const data = await wishlistService.getWishlist();
      setWishlist(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await wishlistService.removeWishlist(productId);
      setWishlist(wishlist.filter(item => item.productId !== productId));
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Đã xóa khỏi sản phẩm yêu thích', type: 'success' }}));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Có lỗi xảy ra', type: 'error' }}));
    }
  };

  if (loading) return <div>Đang tải...</div>;

  return (
    <>
      <div className="border-b border-surface-beige pb-6">
        <h1 className="font-display-md text-2xl text-primary mb-2">Sản phẩm yêu thích</h1>
        <p className="font-body-sm text-on-surface-variant">Những thiết kế bạn đã lưu lại để tham khảo hoặc mua sắm sau.</p>
      </div>

      <div className="pt-6">
        {wishlist.length === 0 ? (
          <div className="bg-surface-ivory border border-dashed border-surface-beige rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">favorite</span>
            <h4 className="font-label-lg text-primary mb-2">Bạn chưa có sản phẩm yêu thích nào.</h4>
            <p className="font-body-sm text-on-surface-variant mb-6">Khám phá bộ sưu tập mới nhất để lưu lại những món đồ bạn ưng ý.</p>
            <Link to="/products" className="px-6 py-2.5 bg-primary text-white rounded-full font-label-md uppercase tracking-wider hover:bg-primary/90 transition-colors shadow-sm">Khám phá sản phẩm</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlist.map((item) => {
              const product = item.product;
              if (!product) return null;
              
              const productId = product.id;
              const name = product.name;
              const price = Number(product.price || 0);
              const imageUrl = product.images && product.images.length > 0 
                ? product.images.find(img => img.isPrimary)?.imageUrl || product.images[0].imageUrl
                : product.imageUrl;

              return (
                <div key={item.wishlistId} className="group flex flex-col bg-white rounded-xl overflow-hidden border border-surface-beige shadow-sm hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(93,64,55,0.08)] transition-all duration-300">
                  <div className="relative aspect-[4/5] overflow-hidden bg-surface-ivory cursor-pointer" onClick={() => navigate(`/products/${productId}`)}>
                    <img src={getStaticFileUrl(imageUrl) || 'https://placehold.co/400x500?text=No+Image'} alt={name} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-700 ease-out" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemove(productId); }}
                      className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-accent-terracotta hover:bg-white shadow-sm transition-colors z-20 hover:scale-110"
                    >
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                    </button>
                  </div>
                  <div className="p-5 flex flex-col flex-grow">
                    {product.category && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">{product.category.name}</span>
                    )}
                    <Link to={`/products/${productId}`} className="font-label-lg text-primary group-hover:text-accent-terracotta transition-colors line-clamp-2 mb-3">
                      {name}
                    </Link>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="font-body-md font-bold text-accent-terracotta">{price > 0 ? `${price.toLocaleString('vi-VN')} VNĐ` : 'Đang cập nhật'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
