import React from 'react';

const variantClasses = {
  primary: 'ui-button-primary',
  secondary: 'ui-button-secondary',
  danger: 'border border-[#f5d2d3] bg-[#fdebec] text-[#9f2f2d] hover:border-[#9f2f2d]',
  ghost: 'text-[#333333] transition-colors hover:text-[#bfa37c]'
};

const sizeClasses = {
  sm: 'px-3 py-2 text-xs',
  md: ''
};

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  const isDisabled = disabled || loading;
  const disabledClass = isDisabled ? ' disabled:cursor-not-allowed disabled:opacity-60' : '';

  return (
    <Component
      className={`${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || ''}${disabledClass} ${className}`.trim()}
      disabled={Component === 'button' ? isDisabled : undefined}
      aria-disabled={Component !== 'button' ? isDisabled || undefined : undefined}
      {...props}
    >
      {loading ? props.loadingText || children : children}
    </Component>
  );
}