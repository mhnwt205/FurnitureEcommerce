import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const fallbackByPermission = [
  ['dashboard.view', '/admin/dashboard'],
  ['order.view', '/admin/orders'],
  ['product.view', '/admin/products'],
  ['category.view', '/admin/categories'],
  ['customer.view', '/admin/customers'],
  ['consultation.view', '/admin/consultation-requests'],
  ['promotion.view', '/admin/promotions'],
  ['admin_account.view', '/admin/accounts']
];

const copy = {
  verifyingSession: '\u0110ang x\u00e1c minh phi\u00ean \u0111\u0103ng nh\u1eadp...',
  accessDeniedTitle: 'Truy c\u1eadp b\u1ecb t\u1eeb ch\u1ed1i',
  accessDeniedBody: 'B\u1ea1n ch\u01b0a \u0111\u01b0\u1ee3c c\u1ea5p quy\u1ec1n truy c\u1eadp h\u1ec7 th\u1ed1ng.',
  logout: '\u0110\u0103ng xu\u1ea5t',
  cannotVerifySession: 'Kh\u00f4ng th\u1ec3 x\u00e1c minh phi\u00ean \u0111\u0103ng nh\u1eadp.',
  retryHint: 'Vui l\u00f2ng ki\u1ec3m tra k\u1ebft n\u1ed1i ho\u1eb7c th\u1eed l\u1ea1i sau.',
  retry: 'Th\u1eed l\u1ea1i'
};

function AdminRouteLoading() {
  return (
    <div className="min-h-screen bg-surface-beige flex items-center justify-center" role="status" aria-live="polite">
      <div className="rounded-xl bg-white px-6 py-5 text-center shadow-sm">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm font-semibold text-primary">{copy.verifyingSession}</p>
      </div>
    </div>
  );
}

function AccessDenied({ logout }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-beige text-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <span className="material-symbols-outlined text-5xl text-error mb-4">block</span>
        <h1 className="text-2xl font-display-sm text-primary mb-2">{copy.accessDeniedTitle}</h1>
        <p className="text-on-surface-variant font-body-sm">{copy.accessDeniedBody}</p>
        <button
          onClick={logout}
          className="mt-6 w-full py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors font-label-md"
        >
          {copy.logout}
        </button>
      </div>
    </div>
  );
}

function AuthUnavailable({ retry }) {
  return (
    <div className="min-h-screen bg-surface-beige flex items-center justify-center p-4 text-center">
      <div className="rounded-xl bg-white px-6 py-5 shadow-sm max-w-md">
        <p className="text-sm font-semibold text-primary">{copy.cannotVerifySession}</p>
        <p className="mt-2 text-sm text-on-surface-variant">{copy.retryHint}</p>
        <button type="button" onClick={retry} className="mt-4 rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
          {copy.retry}
        </button>
      </div>
    </div>
  );
}

export default function AdminRoute({ children, allowedRoles = ['admin'], requiredPermission }) {
  const { user, isChecking, isUnavailable, isAuthenticated, logout, refreshSession } = useAuth();
  const location = useLocation();

  if (isChecking) {
    return <AdminRouteLoading />;
  }

  if (isUnavailable) {
    return <AuthUnavailable retry={refreshSession} />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.role === 'staff' && requiredPermission) {
    const userPerms = user.userPermissions?.map(up => up.permission.key) || [];
    if (!userPerms.includes(requiredPermission)) {
      const fallback = fallbackByPermission.find(([permission]) => userPerms.includes(permission));
      if (fallback) return <Navigate to={fallback[1]} replace />;
      return <AccessDenied logout={logout} />;
    }
  }

  return children;
}
