import React from 'react';

const sizeClasses = {
  small: {
    final: 'text-sm font-bold',
    original: 'text-xs',
    badge: 'text-[10px] px-1.5 py-0.5',
    meta: 'text-xs'
  },
  normal: {
    final: 'text-base font-bold',
    original: 'text-sm',
    badge: 'text-xs px-2 py-0.5',
    meta: 'text-xs'
  },
  large: {
    final: 'font-display-lg text-display-lg',
    original: 'text-base',
    badge: 'text-sm px-2.5 py-1',
    meta: 'text-sm'
  }
};

const formatPrice = (price) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND'
}).format(Number(price || 0));

const getRemainingText = (endAt) => {
  if (!endAt) return '';
  const remainingMs = new Date(endAt).getTime() - Date.now();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return '';

  const totalHours = Math.ceil(remainingMs / (1000 * 60 * 60));
  if (totalHours < 24) return `Con ${totalHours} gio`;
  return `Con ${Math.ceil(totalHours / 24)} ngay`;
};

export default function PriceDisplay({
  price,
  originalPrice,
  finalPrice,
  displayPrice,
  discountAmount,
  discountPercent,
  hasPromotion,
  promotion,
  size = 'normal',
  showBadge = true,
  showSavings = false,
  showPromotionName = false,
  showCountdown = false,
  className = ''
}) {
  const classes = sizeClasses[size] || sizeClasses.normal;
  const basePrice = Number(originalPrice ?? price ?? 0);
  const effectivePrice = Number(finalPrice ?? displayPrice ?? price ?? 0);
  const savings = Number(discountAmount ?? Math.max(basePrice - effectivePrice, 0));
  const percent = Number(discountPercent ?? (basePrice > 0 ? Math.round(savings / basePrice * 100) : 0));
  const promoted = Boolean(hasPromotion && savings > 0 && effectivePrice < basePrice);
  const remainingText = showCountdown ? getRemainingText(promotion?.endAt) : '';

  if (!promoted) {
    return (
      <div className={className}>
        <span className={`${classes.final} text-accent-terracotta`}>{formatPrice(effectivePrice)}</span>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${classes.original} text-on-surface-variant line-through`}>{formatPrice(basePrice)}</span>
        {showBadge && percent > 0 && (
          <span className={`${classes.badge} rounded bg-accent-terracotta text-white font-bold leading-none`}>-{percent}%</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${classes.final} text-accent-terracotta`}>{formatPrice(effectivePrice)}</span>
      </div>
      {(showSavings || showPromotionName || remainingText) && (
        <div className={`${classes.meta} text-on-surface-variant space-y-0.5`}>
          {showSavings && savings > 0 && <div>Tiet kiem {formatPrice(savings)}</div>}
          {showPromotionName && promotion?.name && <div className="text-primary font-medium">{promotion.name}</div>}
          {remainingText && <div>{remainingText}</div>}
        </div>
      )}
    </div>
  );
}