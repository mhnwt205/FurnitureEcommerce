import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import PersonalInfo from './PersonalInfo';
import OrderHistory from './OrderHistory';
import Wishlist from './Wishlist';
import AddressBook from './AddressBook';
import ChangePassword from './ChangePassword';
import MyVouchers from './MyVouchers';
import RewardPoints from './RewardPoints';
import Tier from './Tier';
import TierBenefits from './TierBenefits';
import PublicVouchers from './PublicVouchers';
import { useAuth } from '../../context/AuthContext';
import { loyaltyService } from '../../services/api/loyaltyService';
import useFinancialRefresh from '../../hooks/useFinancialRefresh';

const navItems = [
  { tab: 'info', icon: 'person', label: 'Thông tin cá nhân' },
  { tab: 'orders', icon: 'receipt_long', label: 'Lịch sử đơn hàng' },
  { tab: 'wishlist', icon: 'favorite', label: 'Sản phẩm yêu thích' },
  { tab: 'addresses', icon: 'location_on', label: 'Sổ địa chỉ' },
  { tab: 'password', icon: 'lock', label: 'Đổi mật khẩu', hideForGoogle: true },
  { tab: 'vouchers', icon: 'card_giftcard', label: 'Voucher của tôi', customerOnly: true },
  { tab: 'rewards', icon: 'stars', label: 'Điểm thưởng', customerOnly: true },
  { tab: 'tier', icon: 'workspace_premium', label: 'Hạng thành viên', customerOnly: true },
  { tab: 'tier-benefits', icon: 'card_giftcard', label: 'Ưu đãi hạng thành viên', customerOnly: true },
  { tab: 'public-vouchers', icon: 'local_offer', label: 'Ưu đãi công khai', customerOnly: true }
];

const TIER_LABELS = { BRONZE: 'Hạng Đồng', SILVER: 'Hạng Bạc', GOLD: 'Hạng Vàng', DIAMOND: 'Hạng Kim Cương' };
const TIER_ACCENTS = { BRONZE: '#9b7653', SILVER: '#87919a', GOLD: '#a97d23', DIAMOND: '#567c91' };
const formatCurrency = (value) => `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))} ₫`;

function HeritageClubCard() {
  const [tier, setTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const loadTier = useCallback(async () => {
    setLoading(true);
    try { const response = await loyaltyService.getTier(); if (mountedRef.current) setTier(response?.data || null); }
    catch { if (mountedRef.current) setTier(null); }
    finally { if (mountedRef.current) setLoading(false); }
  }, []);
  useEffect(() => { mountedRef.current = true; loadTier(); return () => { mountedRef.current = false; }; }, [loadTier]);
  useFinancialRefresh(loadTier);

  if (loading && !tier) return <div className="ui-card space-y-3 p-5" aria-busy="true" aria-label="Đang tải thông tin Heritage Club"><div className="ui-skeleton h-3 w-28 rounded" /><div className="ui-skeleton h-6 w-36 rounded" /><div className="ui-skeleton h-3 w-full rounded" /></div>;
  if (!tier?.currentTier) return <div className="ui-card p-5"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#777777]">Heritage Club</p><p className="mt-2 text-sm leading-6 text-[#777777]">Thông tin hạng thành viên hiện chưa khả dụng.</p></div>;

  const spend = Number(tier.eligibleCompletedMerchandiseAmountVnd || 0);
  const threshold = Number(tier.nextTierThresholdVnd || 0);
  const progress = tier.nextTier ? Math.min(100, Math.round((spend / threshold) * 100)) : 100;
  return <div className="ui-card min-w-0 overflow-hidden"><div className="h-1" style={{ backgroundColor: TIER_ACCENTS[tier.currentTier] || '#333333' }} /><div className="p-5"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#777777]">Heritage Club</p><h4 className="mt-2 text-base font-bold text-[#333333]">{TIER_LABELS[tier.currentTier] || tier.currentTier}</h4><p className="mt-1 text-sm text-[#777777]">Chi tiêu đủ điều kiện: {formatCurrency(spend)}</p>{tier.nextTier ? <div className="mt-4"><div className="flex items-center justify-between gap-3 text-xs text-[#777777]"><span>Tiến độ đến {TIER_LABELS[tier.nextTier] || tier.nextTier}</span><span className="shrink-0">{progress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eeeeea]" aria-label={`Tiến độ ${progress}%`}><div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: TIER_ACCENTS[tier.currentTier] || '#333333' }} /></div><p className="mt-2 text-xs leading-5 text-[#777777]">Còn {formatCurrency(tier.remainingAmountVnd)} để đạt {TIER_LABELS[tier.nextTier] || tier.nextTier}.</p></div> : <p className="mt-3 text-xs leading-5 text-[#777777]">Bạn đang ở hạng cao nhất.</p>}</div></div>;
}

export default function CustomerProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isChecking, isAuthenticated, isUnavailable, logout } = useAuth();
  useEffect(() => { if (!isChecking && !isUnavailable && !isAuthenticated) navigate('/login'); }, [isChecking, isUnavailable, isAuthenticated, navigate]);
  const handleLogout = async () => { await logout(); navigate('/login'); };
  if (isChecking) return null;
  if (isUnavailable) return <div className="min-h-screen bg-[#f7f7f5] p-8 text-center text-sm text-[#666666]">Không thể xác minh phiên đăng nhập. Vui lòng thử lại sau.</div>;
  if (!user) return null;

  const pathTabs = { '/profile/orders': 'orders', '/profile/vouchers': 'vouchers', '/profile/rewards': 'rewards', '/profile/tier': 'tier', '/profile/tier-benefits': 'tier-benefits', '/profile/public-vouchers': 'public-vouchers' };
  const currentTab = pathTabs[location.pathname] || searchParams.get('tab') || 'info';
  const setTab = (tab) => {
    if (tab === 'orders') return navigate('/profile/orders');
    if (tab === 'vouchers') return navigate('/profile/vouchers');
    if (tab === 'rewards') return navigate('/profile/rewards');
    if (tab === 'tier') return navigate('/profile/tier');
    if (tab === 'tier-benefits') return navigate('/profile/tier-benefits');
    if (tab === 'public-vouchers') return navigate('/profile/public-vouchers');
    navigate(`/profile?tab=${tab}`);
  };
  const content = { info: <PersonalInfo />, orders: <OrderHistory />, wishlist: <Wishlist />, addresses: <AddressBook />, password: <ChangePassword />, vouchers: <MyVouchers />, rewards: <RewardPoints />, tier: <Tier />, 'tier-benefits': <TierBenefits />, 'public-vouchers': <PublicVouchers /> };
  const visibleNavItems = navItems.filter((item) => !(item.hideForGoogle && user.provider === 'google') && !(item.customerOnly && user.role !== 'customer'));
  const navItemClass = (tab) => `flex w-full items-center gap-3 rounded-[10px] px-4 py-3 text-left text-[14px] font-semibold transition-all duration-200 ${currentTab === tab ? 'bg-[#333333] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-[#555555] hover:bg-[#fafaf8] hover:text-[#333333]'}`;

  return <div className="flex min-h-screen flex-col bg-[#f7f7f5]"><Header /><main className="mx-auto w-full max-w-[1200px] flex-grow px-4 py-8 sm:px-6 lg:px-8 lg:py-12"><div className="mb-6 flex flex-col gap-2 border-b border-[#e5e5e5] pb-6"><p className="text-[13px] text-[#777777]">Tài khoản</p><h1 className="text-2xl font-bold leading-tight text-[#333333] md:text-[30px]">Không gian cá nhân</h1></div><div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"><aside className="space-y-4"><div className="ui-card p-4 md:p-5"><div className="mb-4 flex items-center gap-3 border-b border-[#eeeeee] pb-4"><div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#333333] text-sm font-bold uppercase text-white">{(user.fullName || user.email || 'U').charAt(0)}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-[#333333]">{user.fullName || user.email}</p>{user.email && <p className="truncate text-xs text-[#777777]">{user.email}</p>}</div></div><nav className="flex flex-col gap-1.5">{visibleNavItems.map((item) => <button key={item.tab} type="button" onClick={() => setTab(item.tab)} className={navItemClass(item.tab)}><span className="material-symbols-outlined text-[20px]">{item.icon}</span>{item.label}</button>)}<div className="my-2 h-px bg-[#eeeeee]" /><button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-[10px] px-4 py-3 text-left text-[14px] font-semibold text-[#9f2f2d] transition-colors duration-200 hover:bg-[#fdebec]"><span className="material-symbols-outlined text-[20px]">logout</span>Đăng xuất</button></nav></div>{user.role === 'customer' ? <HeritageClubCard /> : null}</aside><section className="min-w-0 ui-card p-5 md:p-7 lg:p-8">{content[currentTab] || content.info}</section></div></main><Footer /></div>;
}
