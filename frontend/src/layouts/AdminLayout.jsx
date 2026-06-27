import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

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
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-surface-beige flex items-center justify-between px-10 sticky top-0 z-10 shadow-sm">
          <div className="relative w-[400px]">
            <input 
              type="text" 
              placeholder="Tìm kiếm nhanh..." 
              className="w-full bg-surface-beige/30 border border-outline-variant/30 rounded-full pl-12 pr-6 py-3 text-body-md outline-none focus:border-accent-gold focus:ring-1 focus:ring-accent-gold focus:bg-white transition-all shadow-sm"
            />
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant text-[22px]">search</span>
          </div>
          
          <div className="flex items-center gap-8">
            <button className="relative w-10 h-10 rounded-full flex items-center justify-center bg-surface-beige/50 text-on-surface-variant hover:text-primary hover:bg-surface-beige transition-colors">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full shadow-[0_0_0_2px_#fff]"></span>
            </button>
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
