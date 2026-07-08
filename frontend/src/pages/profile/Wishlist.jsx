import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { wishlistService } from '../../services/api/wishlistService';
import ProductImage from '../../components/product/ProductImage';
import ProductPriceBlock from '../../components/product/ProductPriceBlock';

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchWishlist(); }, []);

  const fetchWishlist = async () => {
    try {
      const data = await wishlistService.getWishlist();
      setWishlist(data || []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
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

  if (loading) {
    return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(item => <div key={item}><div className="ui-skeleton aspect-square rounded-[12px]" /><div className="ui-skeleton mt-4 h-4 w-3/4 rounded" /><div className="ui-skeleton mt-3 h-4 w-1/2 rounded" /></div>)}</div>;
  }

  return (
    <>
      <div className="border-b border-[#eeeeee] pb-6">
        <h2 className="text-2xl font-bold text-[#333333]">Sản phẩm yêu thích</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#777777]">Những thiết kế bạn đã lưu lại để tham khảo hoặc mua sắm sau.</p>
      </div>
      <div className="pt-6">
        {wishlist.length === 0 ? (
          <div className="ui-empty-state"><span className="material-symbols-outlined mb-3 block text-4xl text-[#999999]">favorite</span><h4 className="text-base font-bold text-[#333333]">Bạn chưa có sản phẩm yêu thích nào</h4><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777777]">Khám phá bộ sưu tập hiện có để lưu lại những món đồ bạn ưng ý.</p><Link to="/products" className="ui-button-primary mt-5 inline-flex px-5 py-2.5 text-sm">Khám phá sản phẩm</Link></div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {wishlist.map((item) => {
              const product = item.product;
              if (!product) return null;
              const productId = product.id;
              const name = product.name;
              const imageUrl = product.images && product.images.length > 0 ? product.images.find(img => img.isPrimary)?.imageUrl || product.images[0].imageUrl : product.imageUrl;
              return (
                <article key={item.wishlistId} className="group min-w-0">
                  <div className="relative aspect-square overflow-hidden rounded-[12px] bg-[#f6f6f4]" onClick={() => navigate(`/products/${productId}`)}>
                    <ProductImage src={imageUrl} alt={name} className="h-full w-full object-cover transition-transform duration-700 ease-commerce group-hover:scale-105" placeholder={<div className="flex h-full w-full items-center justify-center bg-[#f3f3f1] text-[#999999]"><span className="material-symbols-outlined text-3xl">chair</span></div>} />
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleRemove(productId); }} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#e5e5e5] bg-white/95 text-[#b94732] transition-colors hover:border-[#b94732]" aria-label="Xóa khỏi yêu thích"><span className="material-symbols-outlined text-[19px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span></button>
                  </div>
                  <div className="px-3 pt-4 pb-1">
                    {product.category && <p className="mb-1 text-xs text-[#777777]">{product.category.name}</p>}
                    <Link to={`/products/${productId}`} className="line-clamp-2 text-[14px] font-semibold leading-5 text-[#333333] transition-colors group-hover:text-[#bfa37c]">{name}</Link>
                    <div className="mt-2"><ProductPriceBlock product={product} size="small" showBadge /></div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}