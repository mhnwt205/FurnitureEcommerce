import React from 'react';
import { Navigate } from 'react-router-dom';

export default function AdminRoute({ children, allowedRoles = ['admin'], requiredPermission }) {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    // Check if role is allowed
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }

    // Check permission for staff
    if (user.role === 'staff' && requiredPermission) {
      const userPerms = user.userPermissions?.map(up => up.permission.key) || [];
      if (!userPerms.includes(requiredPermission)) {
        // Find first available module
        if (userPerms.includes('dashboard.view')) return <Navigate to="/admin/dashboard" replace />;
        if (userPerms.includes('order.view')) return <Navigate to="/admin/orders" replace />;
        if (userPerms.includes('product.view')) return <Navigate to="/admin/products" replace />;
        if (userPerms.includes('category.view')) return <Navigate to="/admin/categories" replace />;
        if (userPerms.includes('customer.view')) return <Navigate to="/admin/customers" replace />;
        if (userPerms.includes('consultation.view')) return <Navigate to="/admin/consultation-requests" replace />;
        if (userPerms.includes('promotion.view')) return <Navigate to="/admin/promotions" replace />;
        if (userPerms.includes('admin_account.view')) return <Navigate to="/admin/accounts" replace />;
        
        // No permissions
        return (
          <div className="min-h-screen flex items-center justify-center bg-surface-beige text-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
              <span className="material-symbols-outlined text-5xl text-error mb-4">block</span>
              <h1 className="text-2xl font-display-sm text-primary mb-2">Truy cập bị từ chối</h1>
              <p className="text-on-surface-variant font-body-sm">Bạn chưa được cấp quyền truy cập hệ thống.</p>
              <button 
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  window.location.href = '/login';
                }}
                className="mt-6 w-full py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors font-label-md"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        );
      }
    }
  } catch (e) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
