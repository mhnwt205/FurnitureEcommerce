import React from 'react';

export default function Skeleton({ className = '', ...props }) {
  return <div className={`ui-skeleton ${className}`.trim()} {...props} />;
}