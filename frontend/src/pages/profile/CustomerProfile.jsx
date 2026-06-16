import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api/authService';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';

// Import Tabs
import PersonalInfo from './PersonalInfo';
import OrderHistory from './OrderHistory';
import OrderDetail from './OrderDetail';
import Wishlist from './Wishlist';
import AddressBook from './AddressBook';
import ChangePassword from './ChangePassword';

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
  const orderId = searchParams.get('id'); // Used if tab=order-detail

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'info':
        return <PersonalInfo />;
      case 'orders':
        return <OrderHistory />;
      case 'order-detail':
        return <OrderDetail orderId={orderId} />;
      case 'wishlist':
        return <Wishlist />;
      case 'addresses':
        return <AddressBook />;
      case 'password':
        return <ChangePassword />;
      default:
        return <PersonalInfo />;
    }
  };

  const navItemClass = (tabName) => {
    const isActive = currentTab === tabName || (tabName === 'orders' && currentTab === 'order-detail');
    return `flex items-center gap-3 px-4 py-3 rounded-md font-label-lg text-label-lg transition-all duration-300 w-full text-left ${isActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-ivory">
      <Header />
      <main className="flex-grow pt-8 pb-section-gap px-margin-desktop max-w-container-max mx-auto w-full mt-4 md:mt-8">
        <div className="flex flex-col md:flex-row gap-gutter">
          
          <aside className="w-full md:w-1/4 space-y-stack-md shrink-0">
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-outline-variant/30">
              <nav className="flex flex-col gap-2">
                <button 
                  onClick={() => setTab('info')}
                  className={navItemClass('info')}
                >
                  <span className="material-symbols-outlined">person</span>
                  Thông tin cá nhân
                </button>
                <button 
                  onClick={() => setTab('orders')}
                  className={navItemClass('orders')}
                >
                  <span className="material-symbols-outlined">receipt_long</span>
                  Lịch sử đơn hàng
                </button>
                <button 
                  onClick={() => setTab('wishlist')}
                  className={navItemClass('wishlist')}
                >
                  <span className="material-symbols-outlined">favorite</span>
                  Sản phẩm yêu thích
                </button>
                <button 
                  onClick={() => setTab('addresses')}
                  className={navItemClass('addresses')}
                >
                  <span className="material-symbols-outlined">location_on</span>
                  Sổ địa chỉ
                </button>
                
                {user.provider !== 'google' && (
                  <button 
                    onClick={() => setTab('password')}
                    className={navItemClass('password')}
                  >
                    <span className="material-symbols-outlined">lock</span>
                    Đổi mật khẩu
                  </button>
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

            <div className="relative overflow-hidden bg-primary-container p-6 md:p-8 rounded-xl shadow-sm border border-outline-variant/30 text-on-primary-container hidden md:block">
              <div className="relative z-10">
                <p className="font-label-sm text-label-sm uppercase tracking-widest opacity-70 mb-1">Heritage Club</p>
                <h4 className="font-headline-md text-headline-md mb-4 text-on-primary-container">Thành viên Tiêu chuẩn</h4>
                <p className="font-body-sm text-body-sm mb-6 opacity-90">Mua sắm để tích điểm và nâng hạng thành viên.</p>
                <button className="px-6 py-2 bg-secondary-container text-on-secondary-container rounded-full font-label-lg text-label-lg hover:scale-105 transition-transform">Xem ưu đãi</button>
              </div>
              <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-accent-gold/20 rounded-full blur-3xl"></div>
            </div>
          </aside>

          <section className="flex-1 min-w-0 bg-white p-6 md:p-8 rounded-xl shadow-sm border border-outline-variant/30">
            {renderContent()}
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
