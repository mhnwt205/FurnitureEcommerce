import React from 'react';
import { Link } from 'react-router-dom';
import PriceDisplay from './PriceDisplay';
import WishlistButton from './WishlistButton';
import { getProductImages } from '../../utils/imageUtils';

export const customerHomeTokens = {
  container: 'mx-auto w-full max-w-container-max',
  colors: {
    page: '#FFFFFF',
    soft: '#FAFAF8',
    primary: '#3F2B21',
    secondary: '#7A5230',
    text: '#2D2925',
    muted: '#756D66',
    border: '#E8E0D5',
    surface: '#FFFFFF',
    surfaceMuted: '#F7F3EC',
    sale: '#B94732',
    saleSoft: '#F8EAE4'
  },
  classNames: {
    page: 'bg-commerce-surface text-commerce-text',
    softSurface: 'bg-[#FAFAF8]',
    surface: 'bg-commerce-surface',
    mutedSurface: 'bg-commerce-surface-muted',
    border: 'border-commerce-border',
    text: 'text-commerce-text',
    mutedText: 'text-commerce-muted',
    primaryText: 'text-commerce-primary',
    accentText: 'text-commerce-secondary',
    saleText: 'text-commerce-sale',
    controlRadius: 'rounded-commerce-control',
    cardRadius: 'rounded-commerce-card',
    transition: 'transition-all duration-300 ease-commerce'
  }
};

const token = customerHomeTokens.classNames;

const productCardTokens = {
  article: `group h-full ${token.surface} ${token.text} ${token.transition}`,
  articleFrame: `rounded-commerce-card border border-commerce-border/80 shadow-commerce-card hover:-translate-y-0.5 hover:border-commerce-secondary/30 hover:shadow-commerce-card-hover`,
  imageFrame: `relative overflow-hidden rounded-commerce-card bg-commerce-surface-muted`,
  image: 'h-full w-full object-cover transition-all duration-500 ease-commerce group-hover:scale-[1.025]',
  hoverImage: 'absolute inset-0 h-full w-full scale-[1.015] object-cover opacity-0 transition-all duration-500 ease-commerce group-hover:scale-[1.035] group-hover:opacity-100',
  badge: 'inline-flex items-center rounded-commerce-control border border-commerce-sale/10 bg-commerce-sale-soft px-2 py-1 text-[11px] font-semibold leading-none text-commerce-sale',
  wishlist: 'absolute right-2 top-2 h-8 w-8 rounded-commerce-control border border-commerce-border/90 bg-white/95 text-commerce-text opacity-95 shadow-none transition-all duration-300 ease-commerce hover:border-commerce-secondary hover:text-commerce-secondary md:opacity-0 md:group-hover:opacity-100',
  compactWishlist: 'absolute right-1.5 top-1.5 h-7 w-7 rounded-commerce-control border border-commerce-border/90 bg-white/95 text-commerce-text shadow-none transition-all duration-300 ease-commerce hover:border-commerce-secondary hover:text-commerce-secondary',
  cta: 'absolute inset-x-2 bottom-2 hidden translate-y-2 items-center justify-center rounded-commerce-control bg-commerce-primary/95 px-3 py-2 text-[12px] font-semibold text-white opacity-0 transition-all duration-300 ease-commerce group-hover:translate-y-0 group-hover:opacity-100 sm:flex',
  body: 'px-3 pt-3 pb-1',
  category: 'mb-1.5 text-[12px] font-medium leading-5 text-commerce-muted',
  title: 'line-clamp-2 min-h-[2.55rem] text-[14px] font-medium leading-[1.45] text-commerce-text transition-colors duration-300 ease-commerce group-hover:text-commerce-secondary',
  meta: 'mt-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3',
  sold: 'shrink-0 text-[12px] leading-5 text-commerce-muted sm:pt-1 sm:text-right',
  rating: 'mt-2 flex items-center gap-1 text-[12px] leading-none text-commerce-muted',
  compactArticle: `group grid h-full grid-cols-[96px_1fr] gap-3 rounded-commerce-card border border-commerce-border/80 bg-commerce-surface p-2.5 text-left shadow-commerce-card transition-all duration-300 ease-commerce hover:-translate-y-0.5 hover:border-commerce-secondary/30 hover:shadow-commerce-card-hover sm:grid-cols-[112px_1fr]`,
  compactTitle: 'line-clamp-2 text-[14px] font-medium leading-[1.4] text-commerce-text transition-colors duration-300 ease-commerce group-hover:text-commerce-secondary'
};

export function SectionContainer({ children, className = '', surface = 'default' }) {
  const surfaceClass = surface === 'soft' ? 'bg-[#FAFAF8]' : 'bg-white';
  return (
    <section className={`${surfaceClass} px-5 py-14 md:px-10 md:py-20 lg:px-16 lg:py-24 ${className}`}>
      <div className={customerHomeTokens.container}>{children}</div>
    </section>
  );
}

export function SectionTitle({ eyebrow, title, description, action }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="mb-4 text-xs font-semibold tracking-[0.12em] text-commerce-secondary">{eyebrow}</p>
        )}
        <h2 className="text-3xl font-semibold leading-tight tracking-[-0.02em] text-commerce-text md:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="mt-3 max-w-2xl text-base leading-7 text-commerce-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SectionActionLink({ to, children, className = '' }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center text-sm font-semibold text-commerce-secondary transition-colors hover:text-commerce-text ${className}`}
    >
      {children}
    </Link>
  );
}

export function PrimaryButton({ to, children, className = '' }) {
  return (
    <Link
      to={to}
      className={`inline-flex min-h-12 items-center justify-center rounded-commerce-control border border-commerce-primary bg-commerce-primary px-6 py-3 text-sm font-semibold text-white transition-all duration-300 ease-commerce hover:border-commerce-secondary hover:bg-commerce-secondary active:scale-[0.98] ${className}`}
    >
      {children}
      <span className="material-symbols-outlined ml-3 text-[18px]">arrow_forward</span>
    </Link>
  );
}

export function SecondaryButton({ to, children, className = '' }) {
  return (
    <Link
      to={to}
      className={`inline-flex min-h-12 items-center justify-center rounded-commerce-control border border-commerce-border bg-white px-6 py-3 text-sm font-semibold text-commerce-text transition-all duration-300 ease-commerce hover:border-commerce-primary hover:bg-commerce-surface-muted active:scale-[0.98] ${className}`}
    >
      {children}
    </Link>
  );
}

export function SoftBadge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-commerce-control border border-commerce-border bg-white px-3 py-1 text-xs font-semibold text-commerce-secondary ${className}`}>
      {children}
    </span>
  );
}

function ProductImagePlaceholder({ productName }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-commerce-surface-muted px-3 text-center text-commerce-muted">
      <span className="material-symbols-outlined text-[28px]">image_not_supported</span>
      <span className="mt-2 line-clamp-2 text-[12px] font-medium">{productName}</span>
    </div>
  );
}

function ProductMedia({ product, primaryImage, hoverImage, compact = false }) {
  return (
    <div className={productCardTokens.imageFrame}>
      <Link to={`/products/${product.id}`} className="relative block aspect-square overflow-hidden">
        {primaryImage ? (
          <img
            className={`${productCardTokens.image} ${hoverImage ? 'group-hover:opacity-0' : ''}`}
            src={primaryImage}
            alt={product.name}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <ProductImagePlaceholder productName={product.name} />
        )}
        {hoverImage && (
          <img
            className={productCardTokens.hoverImage}
            src={hoverImage}
            alt=""
            loading="lazy"
            decoding="async"
            aria-hidden="true"
          />
        )}
      </Link>
      <ProductPromotionBadge product={product} />
      <WishlistButton
        productId={product.id}
        initialIsActive={product.isWishlisted}
        className={compact ? productCardTokens.compactWishlist : productCardTokens.wishlist}
        iconClassName={compact ? 'text-[16px]' : 'text-[18px]'}
      />
      {!compact && (
        <Link to={`/products/${product.id}`} className={productCardTokens.cta}>
          Xem sản phẩm
          <span className="material-symbols-outlined ml-1.5 text-[15px]">arrow_forward</span>
        </Link>
      )}
    </div>
  );
}

function ProductPromotionBadge({ product }) {
  const discountPercent = Number(product?.discountPercent || 0);
  const hasPromotion = Boolean(product?.hasPromotion && discountPercent > 0);

  if (!hasPromotion) return null;

  return (
    <div className="absolute left-2 top-2 z-10">
      <span className={productCardTokens.badge}>-{discountPercent}%</span>
    </div>
  );
}

function ProductRating({ product }) {
  const rating = Number(product?.averageRating ?? product?.rating ?? 0);
  const reviewCount = Number(product?.reviewCount ?? product?.reviewsCount ?? 0);

  if (!rating || !reviewCount) return null;

  return (
    <div className={productCardTokens.rating}>
      <span className="material-symbols-outlined text-[15px] text-accent-gold">star</span>
      <span>{rating.toFixed(1)}</span>
      <span>({reviewCount})</span>
    </div>
  );
}

export function CustomerProductCard({ product, isWishlisted = false, className = '', variant = 'default' }) {
  if (!product) return null;

  const productImages = getProductImages(product);
  const primaryImage = productImages[0];
  const hoverImage = productImages[1];
  const soldCount = Number(product.soldCount ?? product.sold ?? product.totalSold ?? 0);
  const productWithWishlist = { ...product, isWishlisted };

  if (variant === 'compact') {
    return (
      <article className={`${productCardTokens.compactArticle} ${className}`}>
        <ProductMedia product={productWithWishlist} primaryImage={primaryImage} hoverImage={hoverImage} compact />
        <div className="flex min-w-0 flex-col justify-center py-1 pr-2">
          {product.category?.name && (
            <p className={productCardTokens.category}>{product.category.name}</p>
          )}
          <Link to={`/products/${product.id}`} className="block min-w-0">
            <h3 className={productCardTokens.compactTitle}>{product.name}</h3>
          </Link>
          <div className="mt-2">
            <PriceDisplay
              {...product}
              size="normal"
              variant="compact"
              showBadge={false}
              showSavings={false}
              showPromotionName={false}
            />
          </div>
          {soldCount > 0 && <span className="mt-1 text-[12px] text-commerce-muted">Đã bán {soldCount}</span>}
        </div>
      </article>
    );
  }

  return (
    <article className={`${productCardTokens.article} ${productCardTokens.articleFrame} ${className}`}>
      <ProductMedia product={productWithWishlist} primaryImage={primaryImage} hoverImage={hoverImage} />
      <div className={productCardTokens.body}>
        {product.category?.name && (
          <p className={productCardTokens.category}>{product.category.name}</p>
        )}
        <Link to={`/products/${product.id}`} className="block">
          <h3 className={productCardTokens.title}>{product.name}</h3>
        </Link>
        <ProductRating product={product} />
        <div className={productCardTokens.meta}>
          <PriceDisplay
            {...product}
            size="normal"
            variant="compact"
            showBadge={false}
            showSavings={false}
            showPromotionName={false}
            className="min-w-0 flex-1"
          />
          {soldCount > 0 && (
            <span className={productCardTokens.sold}>Đã bán {soldCount}</span>
          )}
        </div>
      </div>
    </article>
  );
}

export function LoadingProductGrid() {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <div key={item}>
          <div className="ui-skeleton aspect-square rounded-commerce-card" />
          <div className="ui-skeleton mt-4 h-3.5 w-3/4 rounded" />
          <div className="ui-skeleton mt-3 h-3.5 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}
