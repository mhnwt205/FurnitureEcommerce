import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { notificationService } from '../services/api/notificationService';

const NOTIFICATION_POLL_INTERVAL_MS = 45000;

const formatNotificationTime = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString('vi-VN');
};

const getNotificationTarget = (notification) => {
  const moduleName = notification?.module?.toLowerCase();
  const entityType = notification?.entityType?.toLowerCase();

  if (moduleName === 'consultation' || entityType === 'consultation') {
    return '/admin/consultation-requests';
  }

  return null;
};

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const notificationRef = useRef(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [unreadLoading, setUnreadLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const fetchUnreadCount = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setUnreadCount(0);
      return;
    }

    try {
      setUnreadLoading(true);
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      setUnreadCount(0);
    } finally {
      setUnreadLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setNotifications([]);
      setNotificationsError('Vui lòng đăng nhập để xem thông báo.');
      return;
    }

    try {
      setNotificationsLoading(true);
      setNotificationsError('');
      const response = await notificationService.getNotifications({ page: 1, limit: 10 });
      setNotifications(response.data || []);
    } catch (error) {
      setNotificationsError(error.message || 'Không thể tải thông báo.');
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const intervalId = window.setInterval(fetchUnreadCount, NOTIFICATION_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [fetchUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleNotifications = async () => {
    const nextOpen = !isNotificationOpen;
    setIsNotificationOpen(nextOpen);

    if (nextOpen) {
      await fetchNotifications();
      await fetchUnreadCount();
    }
  };

  const handleRetryNotifications = async () => {
    await fetchNotifications();
    await fetchUnreadCount();
  };

  const handleNotificationClick = async (notification) => {
    if (!notification) return;

    try {
      if (!notification.readAt) {
        const response = await notificationService.markNotificationAsRead(notification.id);
        const updatedNotification = response.notification || { ...notification, readAt: new Date().toISOString() };
        setNotifications(prev => prev.map(item => item.id === notification.id ? updatedNotification : item));
        setUnreadCount(prev => Math.max(prev - 1, 0));
      }
    } catch (error) {
      setNotificationsError(error.message || 'Không thể cập nhật thông báo.');
      return;
    }

    const target = getNotificationTarget(notification);
    if (target) {
      setIsNotificationOpen(false);
      navigate(target);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (markingAllRead || unreadCount === 0) return;

    try {
      setMarkingAllRead(true);
      await notificationService.markAllNotificationsAsRead();
      const readAt = new Date().toISOString();
      setNotifications(prev => prev.map(item => item.readAt ? item : { ...item, readAt }));
      setUnreadCount(0);
    } catch (error) {
      setNotificationsError(error.message || 'Không thể đánh dấu tất cả đã đọc.');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const menuItems = [];
  if (user?.role === 'admin') {
    menuItems.push(
      { name: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
      { name: 'Quản lý Đơn hàng', path: '/admin/orders', icon: 'shopping_bag' },
      { name: 'Quản lý Sản phẩm', path: '/admin/products', icon: 'inventory_2' },
      { name: 'Quản lý đánh giá', path: '/admin/reviews', icon: 'rate_review' },
      { name: 'Quản lý Danh mục', path: '/admin/categories', icon: 'category' },
      { name: 'Quản lý yêu cầu tư vấn', path: '/admin/consultation-requests', icon: 'support_agent' },
      { name: 'Khách hàng', path: '/admin/customers', icon: 'group' },
      { name: 'Tài khoản quản trị', path: '/admin/accounts', icon: 'manage_accounts' }
    );
  } else if (user?.role === 'staff') {
    const perms = user?.userPermissions?.map(up => up.permission.key) || [];
    if (perms.includes('dashboard.view')) {
      menuItems.push({ name: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' });
    }
    if (perms.includes('order.view')) {
      menuItems.push({ name: 'Quản lý Đơn hàng', path: '/admin/orders', icon: 'shopping_bag' });
    }
    if (perms.includes('product.view')) {
      menuItems.push({ name: 'Quản lý Sản phẩm', path: '/admin/products', icon: 'inventory_2' });
    }
    if (perms.includes('review.view')) {
      menuItems.push({ name: 'Quản lý đánh giá', path: '/admin/reviews', icon: 'rate_review' });
    }
    if (perms.includes('consultation.view')) {
      menuItems.push({ name: 'Quản lý yêu cầu tư vấn', path: '/admin/consultation-requests', icon: 'support_agent' });
    }
    if (perms.includes('category.view')) {
      menuItems.push({ name: 'Quản lý Danh mục', path: '/admin/categories', icon: 'category' });
    }
    if (perms.includes('customer.view')) {
      menuItems.push({ name: 'Khách hàng', path: '/admin/customers', icon: 'group' });
    }
    if (perms.includes('admin_account.view')) {
      menuItems.push({ name: 'Tài khoản quản trị', path: '/admin/accounts', icon: 'manage_accounts' });
    }
  }

  return (
    <div className="min-h-screen bg-surface-beige/50 flex font-body-md text-on-surface">
      {/* Sidebar */}
      <aside className="w-64 bg-[#F8F3EB] text-[#6B4A3A] flex flex-col fixed inset-y-0 left-0 z-20 border-r border-[#E7DDD2] shadow-sm">
        <div className="h-20 border-b border-[#E7DDD2] flex items-center gap-3 px-8">
          <span className="material-symbols-outlined text-3xl text-[#54352B]">chair</span>
          <div>
            <span className="font-display-lg text-xl uppercase tracking-widest text-[#54352B] block leading-none">Admin</span>
            <span className="text-[10px] uppercase tracking-widest text-[#8A7970] font-bold">Workspace</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-8">
          <ul className="space-y-3 px-5">
            {menuItems.map(item => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <Link 
                    to={item.path} 
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-label-lg tracking-wide ${isActive ? 'bg-[#4B2E25] text-white shadow-md font-bold' : 'text-[#7A6257] hover:bg-[#EFE6DC] hover:text-[#4B2E25]'}`}
                  >
                    <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-5 border-t border-[#E7DDD2]">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-label-lg tracking-wide w-full justify-center border border-[#E7DDD2] text-[#7A6257] hover:bg-[#EFE6DC] hover:text-[#4B2E25]">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-surface-beige flex items-center justify-between px-10 sticky top-0 z-30 shadow-sm">
          <div className="relative w-[400px]">
            <input 
              type="text" 
              placeholder="Tìm kiếm nhanh..." 
              className="w-full bg-surface-beige/30 border border-outline-variant/30 rounded-full pl-12 pr-6 py-3 text-body-md outline-none focus:border-accent-gold focus:ring-1 focus:ring-accent-gold focus:bg-white transition-all shadow-sm"
            />
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant text-[22px]">search</span>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                onClick={handleToggleNotifications}
                className={`relative w-10 h-10 rounded-full flex items-center justify-center bg-surface-beige/50 text-on-surface-variant hover:text-primary hover:bg-surface-beige transition-colors ${isNotificationOpen ? 'text-primary bg-surface-beige' : ''}`}
                aria-label="Thông báo"
                aria-expanded={isNotificationOpen}
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-error text-white rounded-full shadow-[0_0_0_2px_#fff] text-[10px] font-bold leading-[18px] text-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 top-12 z-50 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-surface-beige bg-white shadow-2xl">
                  <div className="flex items-center justify-between gap-3 border-b border-surface-beige px-5 py-4">
                    <div>
                      <p className="font-label-lg text-primary text-[15px]">Thông báo</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {unreadLoading ? 'Đang cập nhật...' : `${unreadCount} chưa đọc`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      disabled={markingAllRead || unreadCount === 0}
                      className="text-xs font-label-md text-primary hover:text-accent-terracotta disabled:text-on-surface-variant disabled:opacity-50"
                    >
                      Đánh dấu tất cả đã đọc
                    </button>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto">
                    {notificationsLoading && (
                      <div className="flex items-center gap-3 px-5 py-6 text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                        Đang tải thông báo...
                      </div>
                    )}

                    {!notificationsLoading && notificationsError && (
                      <div className="px-5 py-6 text-sm text-on-surface-variant">
                        <p>{notificationsError}</p>
                        <button type="button" onClick={handleRetryNotifications} className="mt-3 text-primary font-label-md hover:text-accent-terracotta">
                          Thử lại
                        </button>
                      </div>
                    )}

                    {!notificationsLoading && !notificationsError && notifications.length === 0 && (
                      <div className="px-5 py-8 text-center text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-3xl text-outline-variant mb-2 block">notifications_off</span>
                        Chưa có thông báo nào.
                      </div>
                    )}

                    {!notificationsLoading && !notificationsError && notifications.map(notification => {
                      const isUnread = !notification.readAt;
                      const target = getNotificationTarget(notification);

                      return (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full text-left px-5 py-4 border-b border-surface-beige/80 last:border-b-0 transition-colors hover:bg-surface-beige/40 ${isUnread ? 'bg-surface-beige/30' : 'bg-white'}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${isUnread ? 'bg-error' : 'bg-outline-variant/50'}`}></span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <p className={`text-sm leading-snug ${isUnread ? 'font-semibold text-primary' : 'font-medium text-on-surface'}`}>{notification.title}</p>
                                <span className="shrink-0 text-[11px] text-on-surface-variant">{formatNotificationTime(notification.createdAt)}</span>
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-on-surface-variant line-clamp-2">{notification.message}</p>
                              <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-on-surface-variant">
                                <span>{notification.module || 'system'}</span>
                                {notification.type && <span>• {notification.type}</span>}
                                {target && <span className="text-primary normal-case tracking-normal">Mở liên kết</span>}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 pl-8 border-l border-surface-beige cursor-pointer group">
              <div className="hidden md:block text-right">
                <p className="font-label-lg text-primary text-[15px] group-hover:text-accent-terracotta transition-colors">{user?.fullName || user?.email || 'Admin'}</p>
                <p className="text-[11px] font-bold tracking-widest text-on-surface-variant uppercase mt-0.5">{user?.role || 'Admin'}</p>
              </div>
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent-terracotta text-white flex items-center justify-center font-display-sm text-xl shadow-md border-2 border-white">
                {user?.fullName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
