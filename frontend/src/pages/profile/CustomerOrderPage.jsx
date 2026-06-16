import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import OrderDetail from './OrderDetail';

export default function CustomerOrderPage() {
  const { id } = useParams();

  return (
    <div className="min-h-screen flex flex-col bg-surface-ivory">
      <Header />
      <main className="flex-grow pt-8 pb-section-gap px-margin-desktop max-w-container-max mx-auto w-full mt-4 md:mt-8">
         <div className="text-body-sm text-on-surface-variant mb-6 flex items-center gap-2">
            <Link to="/" className="hover:text-primary">Trang chủ</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <Link to="/profile" className="hover:text-primary">Hồ sơ</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <Link to="/profile?tab=orders" className="hover:text-primary">Đơn hàng</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-medium">Chi tiết #{id}</span>
         </div>
         <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-outline-variant/30 min-h-[500px]">
            <OrderDetail />
         </div>
      </main>
      <Footer />
    </div>
  );
}
