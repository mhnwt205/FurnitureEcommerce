import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import OrderDetail from './OrderDetail';

export default function CustomerOrderPage() {
  const { id } = useParams();

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f5]">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-grow px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-[#777777]"><Link to="/" className="hover:text-[#333333]">Trang chủ</Link><span className="material-symbols-outlined text-[14px]">chevron_right</span><Link to="/profile" className="hover:text-[#333333]">Hồ sơ</Link><span className="material-symbols-outlined text-[14px]">chevron_right</span><Link to="/profile?tab=orders" className="hover:text-[#333333]">Đơn hàng</Link><span className="material-symbols-outlined text-[14px]">chevron_right</span><span className="font-medium text-[#333333]">Chi tiết #{id}</span></div>
        <div className="ui-card p-5 md:p-7 lg:p-8"><OrderDetail /></div>
      </main>
      <Footer />
    </div>
  );
}