import React, { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function CustomerProfileLayout() {
  const navigate = useNavigate();
  const { user, isChecking, isAuthenticated, isUnavailable, logout } = useAuth();

  useEffect(() => {
    if (!isChecking && !isUnavailable && !isAuthenticated) {
      navigate('/login');
    }
  }, [isChecking, isUnavailable, isAuthenticated, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (isChecking) return null;
  if (isUnavailable) return <main className="pt-8 pb-section-gap px-margin-desktop max-w-container-max mx-auto min-h-screen mt-8 text-center text-sm text-on-surface-variant">Khong the xac minh phien dang nhap. Vui long thu lai sau.</main>;
  if (!user) return null;

  return (
    <main className="pt-8 pb-section-gap px-margin-desktop max-w-container-max mx-auto min-h-screen mt-8">
      <div className="flex flex-col md:flex-row gap-gutter">
        <aside className="w-full md:w-1/4 space-y-stack-md shrink-0">
          <div className="bg-surface-beige p-8 rounded-lg shadow-[0_10px_30px_rgba(93,64,55,0.04)]">
            <nav className="flex flex-col gap-2">
              <NavLink 
                to="/profile" 
                end
                className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-md font-label-lg text-label-lg transition-all duration-300 ${isActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'}`}
              >
                <span className="material-symbols-outlined">person</span>
                Thông tin cá nhân
              </NavLink>
              <NavLink 
                to="/profile/orders" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-md font-label-lg text-label-lg transition-all duration-300 ${isActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'}`}
              >
                <span className="material-symbols-outlined">receipt_long</span>
                Lịch sử đơn hàng
              </NavLink>
              <NavLink 
                to="/profile/wishlist" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-md font-label-lg text-label-lg transition-all duration-300 ${isActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'}`}
              >
                <span className="material-symbols-outlined">favorite</span>
                Sản phẩm yêu thích
              </NavLink>
              <NavLink 
                to="/profile/addresses" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-md font-label-lg text-label-lg transition-all duration-300 ${isActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'}`}
              >
                <span className="material-symbols-outlined">location_on</span>
                Sổ địa chỉ
              </NavLink>
              
              {user.provider !== 'google' && (
                <NavLink 
                  to="/profile/password" 
                  className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-md font-label-lg text-label-lg transition-all duration-300 ${isActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'}`}
                >
                  <span className="material-symbols-outlined">lock</span>
                  Đổi mật khẩu
                </NavLink>
              )}

              <div className="h-[1px] bg-outline-variant my-2 opacity-30"></div>
              
              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-md text-accent-terracotta hover:bg-error-container/20 font-label-lg text-label-lg transition-all duration-200 text-left w-full"
              >
                <span className="material-symbols-outlined">logout</span>
                Đăng xuất
              </button>
            </nav>
          </div>

          <div className="relative overflow-hidden bg-primary-container p-8 rounded-lg text-on-primary-container">
            <div className="relative z-10">
              <p className="font-label-sm text-label-sm uppercase tracking-widest opacity-70 mb-1">Heritage Club</p>
              <h4 className="font-headline-md text-headline-md mb-4 text-on-primary-container">Thành viên Tiêu chuẩn</h4>
              <p className="font-body-sm text-body-sm mb-6 opacity-90">Mua sắm để tích điểm và nâng hạng thành viên.</p>
              <button className="px-6 py-2 bg-secondary-container text-on-secondary-container rounded-full font-label-lg text-label-lg hover:scale-105 transition-transform">Xem ưu đãi</button>
            </div>
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-accent-gold/20 rounded-full blur-3xl"></div>
          </div>
        </aside>

        <section className="flex-1 space-y-gutter min-w-0">
          <Outlet />
        </section>
      </div>
    </main>
  );
}
