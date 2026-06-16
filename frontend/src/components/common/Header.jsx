import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api/authService';
import { useCart } from '../../hooks/useCart';

export default function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const { cartCount } = useCart();

  const checkAuth = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
    window.addEventListener('auth-change', checkAuth);
    return () => window.removeEventListener('auth-change', checkAuth);
  }, []);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.category-dropdown')) {
        setIsDropdownOpen(false);
      }
      if (!e.target.closest('.account-dropdown')) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);


  const handleLogout = () => {
    authService.logout();
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-[100] w-full bg-white border-b border-outline-variant shadow-sm">
      <nav className="flex justify-between items-center w-full px-4 md:px-8 xl:px-margin-desktop max-w-container-max mx-auto h-[80px]">
        <Link to="/" className="font-display-lg text-headline-md tracking-tighter text-primary whitespace-nowrap mr-6">Nội Thất Cao Cấp</Link>
        <div className="hidden lg:flex items-center space-x-4 xl:space-x-8 flex-1 justify-center">
          <div
            className="relative group category-dropdown"
            onMouseEnter={() => setIsDropdownOpen(true)}
            onMouseLeave={() => setIsDropdownOpen(false)}
          >
            <button 
              className="font-label-lg text-label-lg text-on-surface-variant hover:text-accent-terracotta transition-colors duration-300 flex items-center gap-1 py-2 whitespace-nowrap"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              Danh mục
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </button>
            <div 
              className={`absolute top-full left-0 pt-2 w-48 z-[200] transition-all duration-300 ${
                isDropdownOpen 
                  ? 'opacity-100 visible translate-y-0 pointer-events-auto' 
                  : 'opacity-0 invisible translate-y-2 pointer-events-none'
              } group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:pointer-events-auto`}
            >
              <div className="bg-white border border-outline-variant shadow-lg rounded-xl py-2 overflow-hidden w-full">
                <Link to="/products?category=sofa" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 hover:bg-surface-beige text-primary text-body-sm transition-colors">Sofa</Link>
                <Link to="/products?category=ban" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 hover:bg-surface-beige text-primary text-body-sm transition-colors">Bàn</Link>
                <Link to="/products?category=ghe" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 hover:bg-surface-beige text-primary text-body-sm transition-colors">Ghế</Link>
                <Link to="/products?category=giuong" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 hover:bg-surface-beige text-primary text-body-sm transition-colors">Giường</Link>
                <Link to="/products?category=tu" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 hover:bg-surface-beige text-primary text-body-sm transition-colors">Tủ</Link>
                <Link to="/products?category=den" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 hover:bg-surface-beige text-primary text-body-sm transition-colors">Đèn</Link>
              </div>
            </div>
          </div>
          <Link to="/design-service" className="font-label-lg text-label-lg text-on-surface-variant hover:text-accent-terracotta transition-colors duration-300 whitespace-nowrap">Dịch vụ thiết kế</Link>
          <Link to="/featured-projects" className="font-label-lg text-label-lg text-on-surface-variant hover:text-accent-terracotta transition-colors duration-300 whitespace-nowrap">Dự án tiêu biểu</Link>
          <Link to="/about" className="font-label-lg text-label-lg text-on-surface-variant hover:text-accent-terracotta transition-colors duration-300 whitespace-nowrap">Về chúng tôi</Link>
        </div>
        <div className="flex items-center space-x-4 xl:space-x-6 flex-shrink-0 justify-end">

          <div className="relative group cursor-pointer mr-2">
            <Link to="/checkout" className="material-symbols-outlined text-primary hover:text-accent-terracotta transition-colors">shopping_cart</Link>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-accent-terracotta text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">{cartCount}</span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="relative account-dropdown">
                <button 
                  className="font-label-sm text-primary hover:text-accent-terracotta transition-colors flex items-center gap-1"
                  onClick={() => setIsAccountOpen(!isAccountOpen)}
                >
                  Tài khoản
                  <span className="material-symbols-outlined text-[16px]">expand_more</span>
                </button>
                <div 
                  className={`absolute top-full right-0 mt-2 w-56 z-[200] transition-all duration-300 ${
                    isAccountOpen 
                      ? 'opacity-100 visible translate-y-0 pointer-events-auto' 
                      : 'opacity-0 invisible translate-y-2 pointer-events-none'
                  }`}
                >
                  <div className="bg-white border border-outline-variant shadow-lg rounded-xl py-2 overflow-hidden w-full">
                    {user.role === 'admin' || user.role === 'staff' ? (
                      <Link to="/admin/dashboard" onClick={() => setIsAccountOpen(false)} className="block px-4 py-2 hover:bg-surface-beige text-primary text-body-sm transition-colors border-b border-outline-variant">Quản trị viên</Link>
                    ) : null}
                    <Link to="/profile?tab=info" onClick={() => setIsAccountOpen(false)} className="block px-4 py-2 hover:bg-surface-beige text-primary text-body-sm transition-colors">Hồ sơ của tôi</Link>
                    <div className="h-[1px] bg-outline-variant my-1"></div>
                    <button onClick={() => { setIsAccountOpen(false); handleLogout(); }} className="w-full text-left block px-4 py-2 hover:bg-error-container/20 text-accent-terracotta text-body-sm transition-colors">Đăng xuất</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="font-label-sm text-primary hover:text-accent-terracotta transition-colors">Đăng nhập</Link>
                <span className="text-outline-variant">/</span>
                <Link to="/register" className="font-label-sm text-primary hover:text-accent-terracotta transition-colors">Đăng ký</Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}