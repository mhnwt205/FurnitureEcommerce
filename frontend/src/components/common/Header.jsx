import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../context/AuthContext';

const copy = {
  designService: 'D\u1ecbch v\u1ee5 thi\u1ebft k\u1ebf',
  featuredProjects: 'D\u1ef1 \u00e1n ti\u00eau bi\u1ec3u',
  about: 'V\u1ec1 ch\u00fang t\u00f4i',
  table: 'B\u00e0n',
  chair: 'Gh\u1ebf',
  bed: 'Gi\u01b0\u1eddng',
  cabinet: 'T\u1ee7',
  lamp: '\u0110\u00e8n',
  brand: 'N\u1ed9i Th\u1ea5t Cao C\u1ea5p',
  searchProducts: 'T\u00ecm ki\u1ebfm s\u1ea3n ph\u1ea9m...',
  search: 'T\u00ecm ki\u1ebfm',
  myAccount: 'T\u00e0i kho\u1ea3n c\u1ee7a t\u00f4i',

  orderLookup: 'Tra c\u1ee9u \u0111\u01a1n h\u00e0ng',
  account: 'T\u00e0i kho\u1ea3n',
  loginRegister: '\u0110\u0103ng nh\u1eadp / \u0110\u0103ng k\u00fd',
  login: '\u0110\u0103ng nh\u1eadp',
  register: '\u0110\u0103ng k\u00fd',
  cart: 'Gi\u1ecf h\u00e0ng',
  category: 'Danh m\u1ee5c',
  admin: 'Qu\u1ea3n tr\u1ecb vi\u00ean',
  profile: 'H\u1ed3 s\u01a1 c\u1ee7a t\u00f4i',
  logout: '\u0110\u0103ng xu\u1ea5t',
  openMenu: 'M\u1edf menu',
  closeMenu: '\u0110\u00f3ng menu',
  cannotVerify: 'Kh\u00f4ng th\u1ec3 x\u00e1c minh phi\u00ean',
  verifyingLogin: '\u0110ang x\u00e1c minh phi\u00ean \u0111\u0103ng nh\u1eadp',
  verifying: '\u0110ang x\u00e1c minh phi\u00ean...'
};

const navItems = [
  { label: copy.designService, to: '/design-service' },
  { label: copy.featuredProjects, to: '/featured-projects' },
  { label: copy.about, to: '/about' },
  { label: copy.orderLookup, to: '/orders/lookup' }
];

const categoryItems = [
  { label: 'Sofa', to: '/products?category=sofa' },
  { label: copy.table, to: '/products?category=ban' },
  { label: copy.chair, to: '/products?category=ghe' },
  { label: copy.bed, to: '/products?category=giuong' },
  { label: copy.cabinet, to: '/products?category=tu' },
  { label: copy.lamp, to: '/products?category=den' }
];

const iconButtonClass = 'inline-flex h-11 w-11 items-center justify-center text-[#333333] transition-colors duration-300 hover:text-[#bfa37c]';
const navLinkClass = 'text-[15px] font-semibold text-[#434343] transition-colors duration-300 hover:text-[#bfa37c]';

export default function Header() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isChecking, isUnavailable, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { cartCount } = useCart();
  const isAccountReady = isAuthenticated && Boolean(user);
  const isAuthPending = isChecking || isUnavailable;

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

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isAccountReady) {
      setIsAccountOpen(false);
    }
  }, [isAccountReady]);

  const handleLogout = async () => {
    await logout();
    setIsAccountOpen(false);
    setIsMobileMenuOpen(false);
    navigate('/login');
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const keyword = searchTerm.trim();
    navigate(keyword ? `/products?search=${encodeURIComponent(keyword)}` : '/products');
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-[#eeeeee] bg-white">
      <div className="hidden lg:block">
        <div className="mx-auto flex min-h-[96px] w-full max-w-[1200px] items-center gap-8 px-6 py-5">
          <Link to="/" className="shrink-0 text-[30px] font-semibold leading-none tracking-[-0.03em] text-[#333333] xl:text-[34px]">
            {copy.brand}
          </Link>

          <form onSubmit={handleSearch} className="mx-auto flex h-[52px] w-full max-w-[520px] overflow-hidden border border-[#e5e1dc] bg-white">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-full min-w-0 flex-1 border-none bg-white px-6 text-[15px] text-[#434343] outline-none placeholder:text-[#888888] focus:ring-0"
              placeholder={copy.searchProducts}
              type="search"
            />
            <button type="submit" className="flex h-full w-16 items-center justify-center bg-[#3f3f3f] text-white transition-colors duration-300 hover:bg-[#bfa37c]" aria-label={copy.search}>
              <span className="material-symbols-outlined text-[24px]">search</span>
            </button>
          </form>

          <div className="flex shrink-0 items-center gap-6">
            <div className="relative account-dropdown">
              {isAccountReady ? (
                <button
                  className="flex items-center gap-3 text-left text-[#434343] transition-colors duration-300 hover:text-[#bfa37c]"
                  onClick={() => setIsAccountOpen(!isAccountOpen)}
                >
                  <span className="material-symbols-outlined text-[32px] leading-none">person</span>
                  <span className="text-sm font-medium leading-5">{copy.myAccount}</span>
                  <span className="material-symbols-outlined text-[18px]">expand_more</span>
                </button>
              ) : isAuthPending ? (
                <button
                  type="button"
                  className="flex min-w-[176px] cursor-default items-center gap-3 text-left text-[#999999]"
                  aria-busy={isChecking}
                  aria-label={isUnavailable ? copy.cannotVerify : copy.verifyingLogin}
                  disabled
                >
                  <span className="material-symbols-outlined text-[32px] leading-none">person</span>
                  <span className="h-4 w-28 rounded bg-[#eeeeee]" aria-hidden="true" />
                </button>
              ) : (
                <button
                  className="flex items-center gap-3 text-left text-[#434343] transition-colors duration-300 hover:text-[#bfa37c]"
                  onClick={() => setIsAccountOpen(!isAccountOpen)}
                >
                  <span className="material-symbols-outlined text-[32px] leading-none">person</span>
                  <span className="text-sm font-medium leading-5">{copy.loginRegister}</span>
                  <span className="material-symbols-outlined text-[18px]">expand_more</span>
                </button>
              )}
              <div className={`absolute right-0 top-full mt-4 w-60 border border-[#eeeeee] bg-white py-2 shadow-[0_16px_40px_rgba(0,0,0,0.08)] transition-all duration-300 ${isAccountOpen ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-2 opacity-0 pointer-events-none'}`}>
                {isAccountReady ? (
                  <>
                    {user.role === 'admin' || user.role === 'staff' ? (
                      <Link to="/admin/dashboard" onClick={() => setIsAccountOpen(false)} className="block px-5 py-3 text-sm text-[#434343] transition-colors hover:bg-[#f8f8f8] hover:text-[#bfa37c]">{copy.admin}</Link>
                    ) : null}
                    <Link to="/profile?tab=info" onClick={() => setIsAccountOpen(false)} className="block px-5 py-3 text-sm text-[#434343] transition-colors hover:bg-[#f8f8f8] hover:text-[#bfa37c]">{copy.profile}</Link>

                    <button onClick={handleLogout} className="block w-full px-5 py-3 text-left text-sm text-[#7A5C49] transition-colors hover:bg-[#f8f8f8]">{copy.logout}</button>
                  </>
                ) : isAuthPending ? (
                  <div className="px-5 py-3 text-sm text-[#777777]">{isUnavailable ? copy.cannotVerify : copy.verifying}</div>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsAccountOpen(false)} className="block px-5 py-3 text-sm text-[#434343] transition-colors hover:bg-[#f8f8f8] hover:text-[#bfa37c]">{copy.login}</Link>
                    <Link to="/register" onClick={() => setIsAccountOpen(false)} className="block px-5 py-3 text-sm text-[#434343] transition-colors hover:bg-[#f8f8f8] hover:text-[#bfa37c]">{copy.register}</Link>
                  </>
                )}
              </div>
            </div>

            <Link to="/checkout" className="relative flex items-center gap-2 text-[#434343] transition-colors duration-300 hover:text-[#bfa37c]">
              <span className="material-symbols-outlined text-[30px]">shopping_cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 left-5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f15a3b] px-1 text-[11px] font-bold text-white">{cartCount}</span>
              )}
              <span className="text-sm font-medium">{copy.cart}</span>
            </Link>
          </div>
        </div>

        <nav className="border-t border-[#eeeeee] bg-white">
          <div className="mx-auto flex min-h-[56px] w-full max-w-[1200px] items-center justify-center gap-10 px-6">
            <div
              className="relative category-dropdown"
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <button
                className={`${navLinkClass} flex items-center gap-1 py-4`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {copy.category}
                <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </button>
              <div className={`absolute left-1/2 top-full z-[200] w-52 -translate-x-1/2 pt-2 transition-all duration-300 ${isDropdownOpen ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-2 opacity-0 pointer-events-none'}`}>
                <div className="border border-[#eeeeee] bg-white py-2 shadow-[0_14px_34px_rgba(0,0,0,0.08)]">
                  {categoryItems.map((item) => (
                    <Link key={item.to} to={item.to} onClick={() => setIsDropdownOpen(false)} className="block px-5 py-2.5 text-sm text-[#434343] transition-colors hover:bg-[#f8f8f8] hover:text-[#bfa37c]">
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} className={navLinkClass}>{item.label}</Link>
            ))}
          </div>
        </nav>
      </div>

      <div className="lg:hidden">
        <div className="grid h-[60px] grid-cols-[48px_1fr_96px] items-center border-b border-[#eeeeee] px-4">
          <button className={iconButtonClass} onClick={() => setIsMobileMenuOpen(true)} aria-label={copy.openMenu}>
            <span className="material-symbols-outlined text-[30px]">menu</span>
          </button>
          <Link to="/" className="justify-self-center text-center text-[25px] font-semibold leading-none tracking-[-0.03em] text-[#333333]">
            Heritage Home
          </Link>
          <div className="flex justify-end">
            {isAuthPending ? (
              <button type="button" className={`${iconButtonClass} cursor-default text-[#999999] hover:text-[#999999]`} aria-label={isUnavailable ? copy.cannotVerify : copy.verifyingLogin} aria-busy={isChecking} disabled>
                <span className="material-symbols-outlined text-[28px]">person</span>
              </button>
            ) : (
              <Link to={isAccountReady ? '/profile?tab=info' : '/login'} className={iconButtonClass} aria-label={copy.account}>
                <span className="material-symbols-outlined text-[28px]">person</span>
              </Link>
            )}
            <Link to="/checkout" className={`${iconButtonClass} relative`} aria-label={copy.cart}>
              <span className="material-symbols-outlined text-[28px]">shopping_cart</span>
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f15a3b] px-1 text-[11px] font-bold text-white">{cartCount}</span>
              )}
            </Link>
          </div>
        </div>
        <form onSubmit={handleSearch} className="flex h-[50px] items-center border-b border-[#eeeeee] bg-white px-4">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-10 min-w-0 flex-1 border border-[#e5e1dc] bg-[#f8f8f8] px-4 text-sm text-[#434343] outline-none placeholder:text-[#888888] focus:border-[#bfa37c] focus:ring-0"
            placeholder={copy.searchProducts}
            type="search"
          />
          <button type="submit" className="ml-2 flex h-10 w-11 items-center justify-center bg-[#3f3f3f] text-white transition-colors hover:bg-[#bfa37c]" aria-label={copy.search}>
            <span className="material-symbols-outlined text-[22px]">search</span>
          </button>
        </form>
      </div>

      <div className={`fixed inset-0 z-[210] bg-black/30 transition-opacity duration-300 lg:hidden ${isMobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={closeMobileMenu} />
      <aside className={`fixed left-0 top-0 z-[220] h-dvh w-[86vw] max-w-[360px] bg-white p-6 transition-transform duration-300 lg:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-[#eeeeee] pb-5">
          <Link to="/" onClick={closeMobileMenu} className="text-xl font-semibold text-[#333333]">Heritage Home</Link>
          <button onClick={closeMobileMenu} className={iconButtonClass} aria-label={copy.closeMenu}>
            <span className="material-symbols-outlined text-[28px]">close</span>
          </button>
        </div>

        <nav className="py-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#999999]">{copy.category}</p>
          <div className="grid grid-cols-2 gap-2">
            {categoryItems.map((item) => (
              <Link key={item.to} to={item.to} onClick={closeMobileMenu} className="border border-[#eeeeee] px-4 py-3 text-sm font-medium text-[#434343] transition-colors hover:border-[#bfa37c] hover:text-[#bfa37c]">
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-6 space-y-1 border-t border-[#eeeeee] pt-5">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} onClick={closeMobileMenu} className="block py-3 text-base font-semibold text-[#333333] transition-colors hover:text-[#bfa37c]">
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="mt-auto border-t border-[#eeeeee] pt-5">
          {isAccountReady ? (
            <>
              <Link to="/profile?tab=info" onClick={closeMobileMenu} className="block py-2 text-sm font-medium text-[#434343]">{copy.profile}</Link>

              {user.role === 'admin' || user.role === 'staff' ? (
                <Link to="/admin/dashboard" onClick={closeMobileMenu} className="block py-2 text-sm font-medium text-[#434343]">{copy.admin}</Link>
              ) : null}
              <button onClick={handleLogout} className="py-2 text-sm font-semibold text-[#7A5C49]">{copy.logout}</button>
            </>
          ) : isAuthPending ? (
            <div className="flex items-center gap-3 text-sm font-semibold text-[#777777]" aria-busy={isChecking}>
              <span className="material-symbols-outlined text-[20px]">person</span>
              <span>{isUnavailable ? copy.cannotVerify : copy.verifying}</span>
            </div>
          ) : (
            <div className="flex gap-4">
              <Link to="/login" onClick={closeMobileMenu} className="text-sm font-semibold text-[#333333] hover:text-[#bfa37c]">{copy.login}</Link>
              <Link to="/register" onClick={closeMobileMenu} className="text-sm font-semibold text-[#333333] hover:text-[#bfa37c]">{copy.register}</Link>
            </div>
          )}
        </div>
      </aside>
    </header>
  );
}