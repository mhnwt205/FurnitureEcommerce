import React from 'react';

export default function AdminTable({
  children,
  className = '',
  containerClassName = 'overflow-x-auto',
  ...props
}) {
  return (
    <div className={containerClassName}>
      <table className={className} {...props}>
        {children}
      </table>
    </div>
  );
}
