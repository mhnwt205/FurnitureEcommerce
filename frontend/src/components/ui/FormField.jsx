import React from 'react';

export default function FormField({
  label,
  htmlFor,
  required = false,
  helperText,
  error,
  children,
  className = '',
  labelClassName = 'mb-2 block text-sm font-semibold text-[#434343]',
  helperClassName = 'mt-1.5 block text-xs text-[#888888]',
  errorClassName = 'mt-1.5 block text-xs text-[#b94732]'
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className={labelClassName}>
          {label}{required ? ' *' : ''}
        </label>
      )}
      {children}
      {helperText && <span className={helperClassName}>{helperText}</span>}
      {error && <span className={errorClassName}>{error}</span>}
    </div>
  );
}