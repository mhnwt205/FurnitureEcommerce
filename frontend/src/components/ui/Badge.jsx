import React from 'react';

const variantClasses = {
  neutral: 'ui-badge',
  warning: 'ui-badge bg-[#fbf3db] text-[#956400]',
  success: 'ui-badge bg-[#edf3ec] text-[#346538]',
  danger: 'ui-badge bg-[#fdebec] text-[#9f2f2d]'
};

export default function Badge({ variant = 'neutral', className = '', children, ...props }) {
  return (
    <span className={`${variantClasses[variant] || variantClasses.neutral} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
}