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
import { useAuth } from '../context/AuthContext';
import { reviewService } from '../services/api/reviewService';
import PriceDisplay from '../components/common/PriceDisplay';
import { canPurchaseQuantity, getAvailableStock, isOutOfStock } from '../utils/stockUtils';

const hasSpecValue = (value) => value !== null && value !== undefined && String(value).trim() !== '';

const formatCm = (value) => {
  if (!hasSpecValue(value)) return '';
  const number = Number(value);
  const displayValue = Number.isFinite(number) ? number.toLocaleString('vi-VN') : String(value).trim();
  return `${displayValue} cm`;
};

const collectProductImages = (product) => {
  const sources = [];
  if (Array.isArray(product?.images)) {
    product.images.forEach((image) => sources.push(image?.imageUrl || image));
  }
  sources.push(product?.imageUrl);

  return sources
    .map((image) => getStaticFileUrl(image))
    .filter(Boolean)
    .filter((image, index, list) => list.indexOf(image) === index);
};

function ProductImagePlaceholder({ productName }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#f7f7f7] px-4 text-center text-[#777777]">
      <span className="material-symbols-outlined text-[34px]">image_not_supported</span>
      <span className="mt-2 line-clamp-2 text-sm font-medium">{productName}</span>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-8 md:px-10 lg:px-0">
      <div className="grid gap-[30px] lg:grid-cols-[58.333%_41.667%]">
        <div className="flex gap-5">
          <div className="hidden w-[9%] space-y-[10px] lg:block">
            {[0, 1, 2, 3, 4].map((item) => <div key={item} className="aspect-square animate-pulse bg-[#f1f1f1]" />)}
          </div>
          <div className="flex-1">
            <div className="aspect-square animate-pulse bg-[#f1f1f1]" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-7 w-3/4 animate-pulse bg-[#f1f1f1]" />
          <div className="h-4 w-1/2 animate-pulse bg-[#f1f1f1]" />
          <div className="h-12 w-full animate-pulse bg-[#f1f1f1]" />
          <div className="h-24 w-full animate-pulse bg-[#f1f1f1]" />
        </div>
      </div>
    </div>
  );
}

function RelatedSoldOutBadge({ className = '' }) {
  return (
    <span className={`pointer-events-none inline-flex items-center rounded-[6px] bg-red-600 px-2.5 py-1 text-[11px] font-semibold leading-none text-white ${className}`}>
      Hết hàng
    </span>
  );
}

function RelatedProductCard({ product, isWishlisted }) {
  const productImages = collectProductImages(product);
  const primaryImage = productImages[0];
  const hoverImage = productImages[1];
  const soldCount = Number(product.soldCount ?? product.sold ?? product.totalSold ?? 0);
  const discountPercent = Number(product.discountPercent || 0);
  const hasPromotion = Boolean(product.hasPromotion && discountPercent > 0);
  const outOfStock = isOutOfStock(product);

  return (
    <article className="group h-full bg-white text-[#252a2b]">
      <div className="relative overflow-hidden bg-[#fafafa]">
        <Link to={`/products/${product.id}`} className="relative block aspect-square overflow-hidden">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className={`h-full w-full object-cover transition-all duration-500 ease-commerce group-hover:scale-[1.035] ${outOfStock ? 'opacity-70 saturate-[0.85]' : ''} ${hoverImage ? 'group-hover:opacity-0' : ''}`}
            />
          ) : (
            <ProductImagePlaceholder productName={product.name} />
          )}
          {hoverImage && (
            <img
              src={hoverImage}
              alt=""
              loading="lazy"
              decoding="async"
              aria-hidden="true"
              className={`absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-500 ease-commerce group-hover:scale-[1.035] group-hover:opacity-100 ${outOfStock ? 'saturate-[0.85]' : ''}`}
            />
          )}
        </Link>
        {outOfStock && <RelatedSoldOutBadge className="absolute left-[10px] top-[10px] z-20" />}
        {hasPromotion && (
          <span className={`absolute left-[10px] ${outOfStock ? 'top-[42px]' : 'top-[10px]'} z-10 bg-[#f41919] px-[9px] py-[5px] text-[12px] font-semibold leading-none text-white`}>-{discountPercent}%</span>
        )}
        <WishlistButton
          productId={product.id}
          initialIsActive={isWishlisted}
          className="absolute right-[10px] top-[10px] z-10 h-8 w-8 border border-[#e5e5e5] bg-white/95 text-[#434343] opacity-95 shadow-none transition-all duration-300 ease-commerce hover:border-[#bfa37c] hover:text-[#bfa37c] md:opacity-0 md:group-hover:opacity-100"
          iconClassName="text-[18px]"
        />
      </div>
      <div className="pt-[10px]">
        {product.category?.name && <p className="mb-[3px] line-clamp-1 text-[12px] leading-5 text-[#777777]">{product.category.name}</p>}
        <Link to={`/products/${product.id}`}>
          <h3 className="line-clamp-2 min-h-[42px] text-[14px] font-semibold leading-[1.5] text-[#333333] transition-colors duration-300 ease-commerce group-hover:text-[#bfa37c]">{product.name}</h3>
        </Link>
        <div className="mt-[6px]">
          <PriceDisplay {...product} size="normal" variant="compact" showBadge={false} showSavings={false} showPromotionName={false} />
        </div>
        {(outOfStock || soldCount > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {soldCount > 0 && <p className="text-xs leading-5 text-[#777777]">Đã bán {soldCount}</p>}
          </div>
        )}
      </div>
    </article>
  );
}

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
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ averageRating: 0, reviewCount: 0, distribution: {} });
  const [activeTab, setActiveTab] = useState('description');
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchWishlistIds = async () => {
      if (!isAuthenticated) {
        setWishlistIds([]);
        return;
      }

      try {
        const res = await wishlistService.getWishlistIds();
        if (res && res.ids) setWishlistIds(res.ids);
      } catch (error) {
        console.error('Failed to fetch wishlist ids', error);
      }
    };
    fetchWishlistIds();
  }, [isAuthenticated]);

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
    const fetchReviews = async () => {
      try {
        const data = await reviewService.getProductReviews(id);
        setReviews(data.reviews || []);
        setReviewSummary(data.summary || { averageRating: 0, reviewCount: 0, distribution: {} });
      } catch (err) {
        console.error('Lỗi tải đánh giá:', err);
      }
    };

    if (id) {
      fetchReviews();
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

        if (related.length < 4) {
          const backupRes = await productService.getProducts({ limit: 8 });
          const backupArray = Array.isArray(backupRes) ? backupRes : Array.isArray(backupRes?.data) ? backupRes.data : [];
          const newItems = backupArray.filter(p => p.id !== product?.id && p.isActive && !related.find(r => r.id === p.id));
          related = [...related, ...newItems];
        }

        setRelatedProducts(related.slice(0, 4));
      } catch (err) {
        console.error('Lỗi tải sản phẩm liên quan:', err);
      }
    };

    if (product) {
      fetchRelated();
    }
  }, [product]);

  const renderStars = (rating, className = 'text-[#f6b800]') => {
    const rounded = Math.round(Number(rating) || 0);
    return Array.from({ length: 5 }, (_, index) => (
      <span key={index} className={`material-symbols-outlined text-[17px] ${className}`}>
        {index < rounded ? 'star' : 'star_outline'}
      </span>
    ));
  };

  const getProductSpecs = (item) => {
    if (!item) return [];

    return [
      { label: 'Màu sắc', value: item.color },
      { label: 'Chất liệu', value: item.material },
      { label: 'Kích thước', value: item.dimensions },
      { label: 'Chiều rộng', value: formatCm(item.widthCm) },
      { label: 'Chiều cao', value: formatCm(item.heightCm) },
      { label: 'Chiều sâu', value: formatCm(item.depthCm) },
      { label: 'Phòng phù hợp', value: item.roomType },
      { label: 'Phong cách', value: item.style }
    ].filter((spec) => hasSpecValue(spec.value));
  };

  const notifyPurchaseIssue = (message) => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message } }));
  };

  const getPurchaseValidationMessage = () => {
    if (!product || product.isActive === false) return 'Sản phẩm hiện không còn khả dụng.';
    if (isOutOfStock(product)) return 'Sản phẩm đã hết hàng.';
    if (!canPurchaseQuantity(product, quantity)) return 'Số lượng yêu cầu vượt quá tồn kho hiện có.';
    return '';
  };

  const handleAddToCart = () => {
    const validationMessage = getPurchaseValidationMessage();
    if (validationMessage) {
      notifyPurchaseIssue(validationMessage);
      return;
    }

    addToCart(product, quantity);
  };

  const handleBuyNow = () => {
    const validationMessage = getPurchaseValidationMessage();
    if (validationMessage) {
      notifyPurchaseIssue(validationMessage);
      return;
    }

    const result = addToCart(product, quantity);
    if (!result?.success) return;

    navigate('/checkout');
  };

  const adjustQty = (delta) => {
    if (!product || product.isActive === false || isOutOfStock(product)) return;

    const maxStock = getAvailableStock(product);
    setQuantity(prev => {
      const current = Number(prev);
      const safeCurrent = Number.isInteger(current) && current > 0 ? current : 1;
      const next = safeCurrent + delta;
      return Math.min(maxStock, Math.max(1, next));
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-grow">
          <ProductDetailSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    const message = error === 'Product not found' ? 'Sản phẩm không tồn tại hoặc đã ngừng bán.' : (error || 'Sản phẩm không tồn tại hoặc đã ngừng bán.');
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex flex-grow items-center justify-center px-5 py-20">
          <div className="max-w-md border border-[#e7e7e7] bg-white px-6 py-12 text-center">
            <span className="material-symbols-outlined text-[46px] text-[#999999]">production_quantity_limits</span>
            <div className="mt-4 text-base font-semibold text-[#252a2b]">{message}</div>
            <Link to="/products" className="mt-6 inline-flex h-[40px] items-center justify-center bg-[#333333] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4A3A31]">
              Quay lại danh sách sản phẩm
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const productImages = collectProductImages(product);
  const mainImageSrc = getStaticFileUrl(mainImage) || productImages[0];
  const productSpecs = getProductSpecs(product);
  const ratingValue = Number(reviewSummary.averageRating || product.averageRating || 0);
  const reviewCount = Number(reviewSummary.reviewCount || product.reviewCount || 0);
  const soldCount = Number(product.soldCount ?? product.sold ?? product.totalSold ?? 0);
  const availableStock = getAvailableStock(product);
  const productUnavailable = product.isActive === false;
  const inStock = !productUnavailable && !isOutOfStock(product);
  const canPurchase = inStock && canPurchaseQuantity(product, quantity);
  const canDecreaseQuantity = inStock && quantity > 1;
  const canIncreaseQuantity = inStock && quantity < availableStock;
  const stockStatusText = inStock
    ? availableStock <= 3
      ? `Chỉ còn ${availableStock} sản phẩm`
      : `Còn hàng (${availableStock})`
    : '';
  const sku = product.sku || product.slug || (product.id ? String(product.id).slice(0, 8).toUpperCase() : '');

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#252a2b]">
      <Header />
      <main className="w-full max-w-full flex-grow overflow-x-hidden bg-white">
        <nav className="border-b border-[#ededed] bg-white" aria-label="Breadcrumb">
          <div className="mx-auto w-full max-w-[1200px] px-5 py-[10px] text-xs text-[#777a7b] md:px-10 xl:px-0">
            <ol className="flex flex-wrap items-center gap-1">
              <li><Link to="/" className="transition-colors hover:text-[#bfa37c]">Trang chủ</Link></li>
              <li className="text-[#b9b9b9]">/</li>
              <li><Link to="/products" className="transition-colors hover:text-[#bfa37c]">Sản phẩm</Link></li>
              <li className="text-[#b9b9b9]">/</li>
              <li className="line-clamp-1 text-[#252a2b]">{product.name}</li>
            </ol>
          </div>
        </nav>

        <section className="mx-auto w-full max-w-[1200px] px-5 py-6 md:px-10 md:py-[30px] xl:px-0">
          <div className="grid gap-[30px] lg:grid-cols-[58.333%_41.667%] lg:gap-0">
            <ScrollReveal className="lg:pr-[15px]">
              <div className="flex flex-wrap lg:flex-nowrap">
                {productImages.length > 1 && (
                  <div className="order-2 mt-[15px] w-full lg:order-1 lg:mt-0 lg:w-[9%] lg:pr-[10px]">
                    <div className="flex gap-[10px] overflow-x-auto lg:block lg:space-y-[10px]">
                      {productImages.map((image, index) => (
                        <button
                          key={image}
                          type="button"
                          onClick={() => setMainImage(image)}
                          className={`relative aspect-square w-[68px] shrink-0 border bg-[#f7f7f8] transition-colors lg:w-full ${mainImageSrc === image ? 'border-[#808284]' : 'border-[#f7f7f8] hover:border-[#a3a5a7]'}`}
                          aria-label={`Xem ảnh sản phẩm ${index + 1}`}
                        >
                          <img src={image} alt="" className="h-full w-full object-cover opacity-90" loading="lazy" decoding="async" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`${productImages.length > 1 ? 'lg:w-[91%] lg:pl-[10px]' : 'lg:w-full'} order-1 w-full border-b border-[#ededed] pb-[10px] lg:order-2 lg:border-b-0 lg:pb-0`}>
                  <div className="group relative block w-full overflow-hidden bg-white">
                    <span className="relative block aspect-square bg-white">
                      {mainImageSrc ? (
                        <img
                          src={mainImageSrc}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-500 ease-commerce group-hover:scale-[1.025]"
                          loading="eager"
                        />
                      ) : (
                        <ProductImagePlaceholder productName={product.name} />
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100} className="lg:pl-[15px]">
              <section className="lg:sticky lg:top-24">
                <div className="border-b border-dotted border-[#dfe0e1] pb-[12px]">
                  {product.category?.name && <p className="mb-2 text-xs text-[#777a7b]">{product.category.name}</p>}
                  <h1 className="m-0 text-[22px] font-bold leading-snug text-[#252a2b] md:text-[24px]">{product.name}</h1>
                  {(reviewCount > 0 || soldCount > 0) && (
                    <div className="mt-[8px] flex flex-wrap items-center gap-3 text-xs text-[#777a7b]">
                      {reviewCount > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="flex items-center">{renderStars(ratingValue)}</div>
                          <span>({reviewCount} đánh giá)</span>
                        </div>
                      )}
                      {soldCount > 0 && <span>Đã bán: {soldCount}</span>}
                    </div>
                  )}
                  {sku && (
                    <div className="mt-[10px] text-xs text-[#a3a5a7]"><strong className="text-[#777a7b]">SKU:</strong> {sku}</div>
                  )}
                </div>

                <div className="border-b border-dotted border-[#dfe0e1] py-[12px]">
                  <PriceDisplay {...product} size="large" showBadge showSavings showPromotionName showCountdown />
                </div>

                <div className="border-b border-dotted border-[#dfe0e1] py-[14px] text-sm leading-6 text-[#434343]">
                  {product.description ? (
                    <p className="line-clamp-4 whitespace-pre-line">{product.description}</p>
                  ) : (
                    <p className="text-[#777777]">Thông tin sản phẩm đang được cập nhật.</p>
                  )}
                </div>

                <div className="border-b border-dotted border-[#dfe0e1] py-[12px] text-[13px] leading-6 text-[#434343]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">Tình trạng:</span>
                    {inStock && (
                      <span className="text-[#2f7d32]">{stockStatusText}</span>
                    )}
                    {!inStock && (
                      <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-white">
                        Hết hàng
                      </span>
                    )}
                  </div>
                  {product.category?.name && <p><span className="font-semibold">Danh mục:</span> {product.category.name}</p>}
                </div>

                <div className="mt-[15px]">
                  <div className="mb-[15px] flex">
                    <button
                      className="grid size-8 place-items-center border border-[#f5f5f5] bg-[#f5f5f5] text-base font-semibold transition-colors hover:bg-[#ededed] disabled:cursor-not-allowed disabled:text-[#b8b8b8] disabled:hover:bg-[#f5f5f5]"
                      type="button"
                      onClick={() => adjustQty(-1)}
                      disabled={!canDecreaseQuantity}
                      aria-label="Giảm số lượng"
                    >
                      <span className="material-symbols-outlined text-[17px]">remove</span>
                    </button>
                    <span className="grid h-8 w-[70px] place-items-center border-y border-[#f5f5f5] bg-white text-sm font-semibold">{quantity}</span>
                    <button
                      className="grid size-8 place-items-center border border-[#f5f5f5] bg-[#f5f5f5] text-base font-semibold transition-colors hover:bg-[#ededed] disabled:cursor-not-allowed disabled:text-[#b8b8b8] disabled:hover:bg-[#f5f5f5]"
                      type="button"
                      onClick={() => adjustQty(1)}
                      disabled={!canIncreaseQuantity}
                      aria-label="Tăng số lượng"
                    >
                      <span className="material-symbols-outlined text-[17px]">add</span>
                    </button>
                  </div>

                  <div className="grid gap-[8px] sm:grid-cols-[1fr_1fr_auto]">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={!canPurchase}
                      title={!inStock ? 'Sản phẩm đã hết hàng.' : !canPurchase ? 'Số lượng yêu cầu vượt quá tồn kho hiện có.' : undefined}
                      className="flex min-h-[50px] items-center justify-center bg-[#333333] px-4 py-[14px] text-center text-xs font-bold uppercase leading-[22px] text-white transition-colors hover:bg-[#4A3A31] disabled:cursor-not-allowed disabled:bg-[#333333] disabled:text-white disabled:opacity-70 disabled:hover:bg-[#333333]"
                    >
                      {inStock ? 'Thêm vào giỏ' : 'Hết hàng'}
                    </button>
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={!canPurchase}
                      title={!inStock ? 'Sản phẩm đã hết hàng.' : !canPurchase ? 'Số lượng yêu cầu vượt quá tồn kho hiện có.' : undefined}
                      className="flex min-h-[50px] items-center justify-center border border-[#333333] bg-white px-4 py-[14px] text-center text-xs font-bold uppercase leading-[22px] text-[#333333] transition-colors hover:border-[#4A3A31] hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:border-[#d7d7d7] disabled:text-[#999999] disabled:hover:bg-white"
                    >
                      Mua ngay
                    </button>
                    <WishlistButton
                      productId={product.id}
                      initialIsActive={wishlistIds.includes(product.id)}
                      className="flex min-h-[50px] min-w-[54px] items-center justify-center border border-[#e5e5e5] bg-white text-[#434343] shadow-none transition-colors hover:border-[#bfa37c] hover:text-[#bfa37c]"
                      iconClassName="text-[22px]"
                    />
                  </div>
                </div>
              </section>
            </ScrollReveal>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-5 md:px-10 xl:px-0">
          <div className="border border-[#dfe0e1]">
            <div className="flex overflow-x-auto border-b border-[#dfe0e1] text-sm">
              {[
                ['description', 'Mô tả'],
                ['specs', 'Thông số'],
                ['reviews', 'Đánh giá']
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`min-h-[44px] shrink-0 px-5 text-left transition-colors ${activeTab === key ? 'border-b-2 border-[#252a2b] font-semibold text-[#252a2b]' : 'text-[#777a7b] hover:text-[#252a2b]'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mx-auto max-w-[920px] px-4 py-6 text-[15px] leading-7 text-[#434343] md:px-6">
              {activeTab === 'description' && (
                <div>
                  <h2 className="text-center text-[22px] font-normal text-[#252a2b]">{product.name}</h2>
                  {product.description ? (
                    <p className="mt-4 whitespace-pre-line">{product.description}</p>
                  ) : (
                    <p className="mt-4 text-center text-[#777777]">Thông tin sản phẩm đang được cập nhật.</p>
                  )}
                </div>
              )}

              {activeTab === 'specs' && (
                productSpecs.length > 0 ? (
                  <dl className="border-t border-[#e5e5e5] text-sm">
                    {productSpecs.map((spec) => (
                      <div className="grid grid-cols-1 border-b border-[#e5e5e5] sm:grid-cols-[180px_1fr]" key={spec.label}>
                        <dt className="bg-[#f7f7f7] p-3 font-semibold text-[#252a2b]">{spec.label}</dt>
                        <dd className="p-3 text-[#555555]">{spec.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-center text-[#777777]">Thông số sản phẩm đang được cập nhật.</p>
                )
              )}

              {activeTab === 'reviews' && (
                <div>
                  <div className="mb-5 flex flex-wrap items-center justify-center gap-3 text-center">
                    <div className="flex items-center">{renderStars(ratingValue)}</div>
                    <span className="font-semibold text-[#252a2b]">{ratingValue.toFixed(1)} / 5</span>
                    <span className="text-[#777777]">{reviewCount} đánh giá</span>
                  </div>
                  {reviews.length === 0 ? (
                    <div className="border border-[#e5e5e5] bg-[#fafafa] px-5 py-10 text-center text-[#777777]">Chưa có đánh giá nào cho sản phẩm này.</div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <article key={review.id} className="border border-[#e5e5e5] bg-white p-5">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="font-semibold text-[#252a2b]">{review.user?.fullName || 'Khách hàng'}</p>
                              <div className="mt-1 flex items-center">{renderStars(review.rating)}</div>
                            </div>
                            {review.createdAt && <span className="text-sm text-[#777777]">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>}
                          </div>
                          {review.comment && <p className="mt-4 whitespace-pre-line leading-7 text-[#555555]">{review.comment}</p>}
                          {review.images?.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-3">
                              {review.images.map((imageUrl, index) => (
                                <a key={index} href={getStaticFileUrl(imageUrl)} target="_blank" rel="noreferrer" className="h-20 w-20 overflow-hidden border border-[#e5e5e5] bg-[#f7f7f7]">
                                  <img src={getStaticFileUrl(imageUrl)} alt={`Đánh giá ${index + 1}`} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                                </a>
                              ))}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-10 md:py-14 xl:px-0">
            <h2 className="mb-[30px] text-center text-[24px] font-bold uppercase text-[#252a2b] md:text-[28px]">Sản phẩm liên quan</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-[30px] md:grid-cols-4 lg:gap-x-6">
              {relatedProducts.map((rp, index) => (
                <ScrollReveal key={rp.id} delay={index * 80}>
                  <RelatedProductCard product={rp} isWishlisted={wishlistIds.includes(rp.id)} />
                </ScrollReveal>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}