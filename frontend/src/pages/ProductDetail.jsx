import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { productService } from '../services/api/productService';
import { useCart } from '../hooks/useCart';
import { getStaticFileUrl } from '../utils/imageUtils';
import ScrollReveal from '../components/common/ScrollReveal';
import WishlistButton from '../components/common/WishlistButton';
import { wishlistService } from '../services/api/wishlistService';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainImage, setMainImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);

  useEffect(() => {
    const fetchWishlistIds = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await wishlistService.getWishlistIds();
          if (res && res.ids) setWishlistIds(res.ids);
        } catch (error) {
          console.error("Failed to fetch wishlist ids", error);
        }
      }
    };
    fetchWishlistIds();
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await productService.getProductById(id);

        if (data.images && data.images.length > 0) {
          data.images.sort((a, b) => {
            if ((b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0) !== 0) return (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0);
            if (a.sortOrder - b.sortOrder !== 0) return a.sortOrder - b.sortOrder;
            return a.id - b.id;
          });
        }

        setProduct(data);
        if (data.images && data.images.length > 0) {
          setMainImage(data.images[0].imageUrl);
        } else if (data.imageUrl) {
          setMainImage(data.imageUrl);
        } else {
          setMainImage('');
        }
        setQuantity(1);
        window.scrollTo(0, 0);
      } catch (err) {
        setError(err.message || 'Lỗi khi tải chi tiết sản phẩm');
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        let params = { limit: 8 };
        if (product?.category?.slug) {
          params.category = product.category.slug;
        }
        const res = await productService.getProducts(params);
        const productsArray = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        let related = productsArray.filter(p => p.id !== product?.id && p.isActive);

        // If not enough related products from the same category, maybe fetch more without category
        if (related.length < 4) {
          const backupRes = await productService.getProducts({ limit: 8 });
          const backupArray = Array.isArray(backupRes) ? backupRes : Array.isArray(backupRes?.data) ? backupRes.data : [];
          const newItems = backupArray.filter(p => p.id !== product?.id && p.isActive && !related.find(r => r.id === p.id));
          related = [...related, ...newItems];
        }

        setRelatedProducts(related.slice(0, 4));
      } catch (err) {
        console.error("Lỗi tải sản phẩm liên quan:", err);
      }
    };

    if (product) {
      fetchRelated();
    }
  }, [product]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const adjustQty = (delta) => {
    setQuantity(prev => {
      const next = prev + delta;
      if (next < 1) return 1;
      const maxStock = product?.stockQuantity != null ? product.stockQuantity : Infinity;
      if (maxStock > 0 && next > maxStock) return maxStock;
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex justify-center items-center py-20">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">production_quantity_limits</span>
            <div className="text-error font-body-lg">{error === 'Product not found' ? 'Sản phẩm không tồn tại hoặc đã ngừng bán.' : (error || 'Sản phẩm không tồn tại hoặc đã ngừng bán.')}</div>
            <Link to="/products" className="inline-block mt-6 px-6 py-2 bg-primary text-white rounded hover:opacity-90">Quay lại danh sách sản phẩm</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">

        {/**/}

        <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
          {/**/}
          <nav className="flex gap-2 text-label-sm text-on-surface-variant mb-stack-lg items-center">
            <Link className="hover:text-primary transition-colors" to="/">Trang chủ</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <Link className="hover:text-primary transition-colors" to="/products">Sản phẩm</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-bold">{product.name}</span>
          </nav>
          {/**/}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            {/**/}
            <ScrollReveal className="lg:col-span-7 space-y-4">
              <div className="aspect-[4/5] bg-surface-beige overflow-hidden">
                <img alt={product.name} className="w-full h-full object-cover product-image-transition" id="mainImage" src={getStaticFileUrl(mainImage) || 'https://placehold.co/800x1000?text=No+Image'} />
              </div>
              {(product.images && product.images.length > 0 ? product.images : (product.imageUrl ? [{ imageUrl: product.imageUrl }] : [])).length > 1 && (
                <div className="grid grid-cols-4 gap-4">
                  {(product.images && product.images.length > 0 ? product.images : (product.imageUrl ? [{ imageUrl: product.imageUrl }] : [])).map((img, idx) => (
                    <button key={idx} className={`aspect-square bg-surface-beige overflow-hidden ${mainImage === img.imageUrl ? 'ring-2 ring-accent-gold' : 'ring-1 ring-outline-variant opacity-70 hover:opacity-100'} transition-all`} onClick={() => setMainImage(img.imageUrl)}>
                      <img className="w-full h-full object-cover" alt={`${product.name} ${idx + 1}`} src={getStaticFileUrl(img.imageUrl)} />
                    </button>
                  ))}
                </div>
              )}
            </ScrollReveal>
            {/**/}
            <ScrollReveal delay={100} className="lg:col-span-5 flex flex-col gap-6 sticky top-24">
              <div>
                <span className="text-label-sm uppercase tracking-widest text-accent-gold mb-2 block">{product.category?.name || 'SẢN PHẨM'}</span>
                <h1 className="font-display-lg text-display-lg text-primary leading-tight">{product.name}</h1>
                <div className="flex items-baseline gap-4 mt-4">
                  <span className="font-display-lg text-display-lg text-accent-terracotta">{formatPrice(product.price)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-2 py-4 border-y border-outline-variant">
                <div className="text-label-sm text-on-surface-variant">Mã SP: <span className="text-on-surface font-semibold uppercase">{product.slug || product.id.substring(0, 8)}</span></div>
                <div className="text-label-sm text-on-surface-variant">Danh mục: <span className="text-on-surface font-semibold underline">{product.category?.name || 'Chung'}</span></div>
              </div>
              {/**/}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-outline-variant rounded-lg p-1">
                    <button className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors" onClick={() => adjustQty(-1)}>
                      <span className="material-symbols-outlined">remove</span>
                    </button>
                    <input className="w-12 text-center border-none bg-transparent font-semibold focus:ring-0 p-0" id="quantity" min="1" type="number" value={quantity} readOnly />
                    <button className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors" onClick={() => adjustQty(1)}>
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                  <button onClick={() => addToCart(product, quantity)} className="flex-1 bg-accent-terracotta text-white py-4 rounded-lg font-label-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">shopping_bag</span>
                    THÊM VÀO GIỎ HÀNG
                  </button>
                  <WishlistButton 
                    productId={product.id} 
                    initialIsActive={wishlistIds.includes(product.id)}
                    className="w-14 h-[56px] border border-outline-variant rounded-lg flex items-center justify-center text-outline hover:text-accent-terracotta hover:border-accent-terracotta transition-colors shrink-0"
                    iconClassName="text-[28px]"
                  />
                </div>
                <button onClick={() => { addToCart(product, quantity); navigate('/checkout'); }} className="w-full border border-primary text-primary py-4 rounded-lg font-label-lg hover:bg-primary hover:text-white transition-all">
                  MUA NGAY
                </button>
              </div>
              {/**/}
              <div className="border-t border-outline-variant pt-4 mt-4 space-y-2">
                <details className="group" open>
                  <summary className="flex justify-between items-center py-3 cursor-pointer list-none">
                    <span className="font-label-lg text-primary">Mô tả sản phẩm</span>
                    <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                  </summary>
                  <div className="pb-4 text-body-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
                    {product.description || 'Thông tin sản phẩm đang được cập nhật.'}
                  </div>
                </details>
              </div>
            </ScrollReveal>
          </div>

          {/**/}
          <ScrollReveal className="bg-[#F8F4EC] border border-outline-variant p-6 md:p-8 rounded-2xl shadow-sm mt-12">
            <div className="border-b border-neutral-200 pb-4 mb-2">
              <div className="flex items-center gap-3 text-primary">
                <span className="material-symbols-outlined text-[24px]">store</span>
                <h3 className="font-display-lg text-headline-sm">Sẵn có tại Showroom</h3>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 py-5 border-b border-neutral-200">
                <div>
                  <p className="font-semibold text-primary mb-2">Showroom Quận 1</p>
                  <div className="text-neutral-600 leading-relaxed text-body-md">
                    <p>123 Lê Lợi</p>
                    <p>Phường Bến Thành</p>
                    <p>Quận 1, TP.HCM</p>
                  </div>
                </div>
                <button className="text-accent-gold flex items-center gap-1 text-label-sm font-bold hover:bg-accent-gold hover:text-white whitespace-nowrap bg-white px-4 py-2 rounded-full border border-accent-gold transition-colors shrink-0">
                  <span className="material-symbols-outlined text-[18px]">directions</span>
                  Chỉ đường
                </button>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 py-5 border-b border-neutral-200">
                <div>
                  <p className="font-semibold text-primary mb-2">Showroom Hoàn Kiếm</p>
                  <div className="text-neutral-600 leading-relaxed text-body-md">
                    <p>45 Lý Thường Kiệt</p>
                    <p>Hoàn Kiếm</p>
                    <p>Hà Nội</p>
                  </div>
                </div>
                <button className="text-accent-gold flex items-center gap-1 text-label-sm font-bold hover:bg-accent-gold hover:text-white whitespace-nowrap bg-white px-4 py-2 rounded-full border border-accent-gold transition-colors shrink-0">
                  <span className="material-symbols-outlined text-[18px]">directions</span>
                  Chỉ đường
                </button>
              </div>
            </div>
          </ScrollReveal>
          {/**/}
          {relatedProducts.length > 0 && (
            <section className="py-section-gap mt-16 border-t border-outline-variant">
              <div className="flex justify-between items-end mb-stack-lg">
                <div>
                  <h2 className="font-display-lg text-headline-lg text-primary">Sản phẩm tương tự</h2>
                  <p className="text-on-surface-variant text-body-md mt-2">Hoàn thiện không gian sống của bạn</p>
                </div>
                <div className="flex gap-2">
                  <button className="w-10 h-10 rounded-full border border-outline flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <button className="w-10 h-10 rounded-full border border-outline flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter overflow-x-auto no-scrollbar lg:overflow-visible">
                {relatedProducts.map((rp, index) => {
                  const rpImage = rp.images && rp.images.length > 0 ? rp.images[0].imageUrl : (rp.imageUrl || 'https://placehold.co/800x1000?text=No+Image');
                  return (
                    <ScrollReveal key={rp.id} delay={index * 100}>
                      <Link to={`/products/${rp.id}`} className="min-w-[280px] lg:min-w-0 group cursor-pointer block">
                        <div className="aspect-[4/5] bg-surface-beige overflow-hidden relative mb-4">
                          <img alt={rp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={getStaticFileUrl(rpImage)} />
                          <WishlistButton 
                            productId={rp.id} 
                            initialIsActive={wishlistIds.includes(rp.id)}
                            className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 hover:text-accent-terracotta"
                            iconClassName="text-[20px]"
                          />
                        </div>
                        <h3 className="font-label-lg text-primary group-hover:text-accent-terracotta transition-colors line-clamp-1">{rp.name}</h3>
                        <p className="text-accent-terracotta font-body-md font-bold mt-1">{formatPrice(rp.price)}</p>
                      </Link>
                    </ScrollReveal>
                  );
                })}
              </div>
            </section>
          )}
        </main>
        {/**/}

        {/**/}











      </main>
      <Footer />
    </div>
  );
}