import React from 'react';
import { formatPrice } from '../../utils/formatters';

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
    final: 'text-[22px] font-bold leading-7 md:text-[24px]',
    original: 'text-sm md:text-base',
    badge: 'text-sm px-3 py-1.5',
    meta: 'text-sm'
  }
};

const getRemainingText = (endAt) => {
  if (!endAt) return '';
  const remainingMs = new Date(endAt).getTime() - Date.now();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return '';

  const totalHours = Math.ceil(remainingMs / (1000 * 60 * 60));
  if (totalHours < 24) return `Còn ${totalHours} giờ`;
  return `Còn ${Math.ceil(totalHours / 24)} ngày`;
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
  variant = 'default',
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

  if (variant === 'compact') {
    if (!promoted) {
      return (
        <div className={className}>
          <span className="text-[14px] font-bold leading-6 text-[#252a2b]">{formatPrice(effectivePrice)}</span>
        </div>
      );
    }

    return (
      <div className={className}>
        <div className="flex flex-wrap items-baseline gap-2 leading-6">
          <span className="text-[14px] font-bold text-[#f41919]">{formatPrice(effectivePrice)}</span>
          <span className="text-[13px] font-medium text-[#999999] line-through">{formatPrice(basePrice)}</span>
        </div>
        {(showSavings || showPromotionName || remainingText) && (
          <div className="mt-1 space-y-0.5 text-xs text-[#777777]">
            {showSavings && savings > 0 && <div>Tiết kiệm {formatPrice(savings)}</div>}
            {showPromotionName && promotion?.name && <div className="font-medium text-[#7A5230]">{promotion.name}</div>}
            {remainingText && <div>{remainingText}</div>}
          </div>
        )}
      </div>
    );
  }

  if (!promoted) {
    return (
      <div className={className}>
        <span className={`${classes.final} text-[#252a2b]`}>{formatPrice(effectivePrice)}</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        {showBadge && percent > 0 && (
          <span className={`${classes.badge} bg-[#ededed] font-bold leading-none text-[#f41919]`}>-{percent}%</span>
        )}
        <span className={`${classes.final} text-[#f41919]`}>{formatPrice(effectivePrice)}</span>
        <span className={`${classes.original} font-medium text-[#777777] line-through`}>{formatPrice(basePrice)}</span>
      </div>
      {(showSavings || showPromotionName || remainingText) && (
        <div className={`${classes.meta} space-y-0.5 text-[#777777]`}>
          {showSavings && savings > 0 && <div>Tiết kiệm {formatPrice(savings)}</div>}
          {showPromotionName && promotion?.name && <div className="font-medium text-[#7A5230]">{promotion.name}</div>}
          {remainingText && <div>{remainingText}</div>}
        </div>
      )}
    </div>
  );
}