import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api/authService';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import PersonalInfo from './PersonalInfo';
import OrderHistory from './OrderHistory';
import OrderDetail from './OrderDetail';
import Wishlist from './Wishlist';
import AddressBook from './AddressBook';
import ChangePassword from './ChangePassword';

const navItems = [
  { tab: 'info', icon: 'person', label: 'Thông tin cá nhân' },
  { tab: 'orders', icon: 'receipt_long', label: 'Lịch sử đơn hàng' },
  { tab: 'wishlist', icon: 'favorite', label: 'Sản phẩm yêu thích' },
  { tab: 'addresses', icon: 'location_on', label: 'Sổ địa chỉ' },
  { tab: 'password', icon: 'lock', label: 'Đổi mật khẩu', hideForGoogle: true }
];

export default function CustomerProfile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  if (!user) return null;

  const currentTab = searchParams.get('tab') || 'info';
  const orderId = searchParams.get('id');

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'info': return <PersonalInfo />;
      case 'orders': return <OrderHistory />;
      case 'order-detail': return <OrderDetail orderId={orderId} />;
      case 'wishlist': return <Wishlist />;
      case 'addresses': return <AddressBook />;
      case 'password': return <ChangePassword />;
      default: return <PersonalInfo />;
    }
  };

  const navItemClass = (tabName) => {
    const isActive = currentTab === tabName || (tabName === 'orders' && currentTab === 'order-detail');
    return `flex w-full items-center gap-3 rounded-[10px] px-4 py-3 text-left text-[14px] font-semibold transition-all duration-200 ${isActive ? 'bg-[#333333] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-[#555555] hover:bg-[#fafaf8] hover:text-[#333333]'}`;
  };

  const visibleNavItems = navItems.filter(item => !(item.hideForGoogle && user.provider === 'google'));

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f5]">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-grow px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-6 flex flex-col gap-2 border-b border-[#e5e5e5] pb-6">
          <p className="text-[13px] text-[#777777]">Tài khoản</p>
          <h1 className="text-2xl font-bold leading-tight text-[#333333] md:text-[30px]">Không gian cá nhân</h1>
        </div>
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="ui-card p-4 md:p-5">
              <div className="mb-4 flex items-center gap-3 border-b border-[#eeeeee] pb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#333333] text-sm font-bold uppercase text-white">
                  {(user.fullName || user.email || 'U').charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#333333]">{user.fullName || user.email}</p>
                  {user.email && <p className="truncate text-xs text-[#777777]">{user.email}</p>}
                </div>
              </div>
              <nav className="flex flex-col gap-1.5">
                {visibleNavItems.map(item => (
                  <button key={item.tab} type="button" onClick={() => setTab(item.tab)} className={navItemClass(item.tab)}>
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
                <div className="my-2 h-px bg-[#eeeeee]" />
                <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-[10px] px-4 py-3 text-left text-[14px] font-semibold text-[#9f2f2d] transition-colors duration-200 hover:bg-[#fdebec]">
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  Đăng xuất
                </button>
              </nav>
            </div>
            <div className="hidden ui-card p-5 md:block">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#777777]">Heritage Club</p>
              <h4 className="mt-2 text-base font-bold text-[#333333]">Thành viên tiêu chuẩn</h4>
              <p className="mt-2 text-sm leading-6 text-[#777777]">Mua sắm để tích điểm và nhận ưu đãi phù hợp với tài khoản của bạn.</p>
              <button type="button" className="ui-button-secondary mt-4 px-4 py-2 text-[13px]">Xem ưu đãi</button>
            </div>
          </aside>
          <section className="min-w-0 ui-card p-5 md:p-7 lg:p-8">
            {renderContent()}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}