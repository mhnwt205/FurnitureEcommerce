import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { formatPrice } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export default function OrderSuccess() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);
  const order = location.state?.order || null;
  const customerType = location.state?.customerType || (isAuthenticated ? 'authenticated' : 'guest');
  const orderCode = order?.orderCode || '';

  const copyOrderCode = async () => {
    if (!orderCode || !navigator?.clipboard) return;
    await navigator.clipboard.writeText(orderCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-grow flex-col items-center justify-center px-4 py-20">
        <div className="w-full max-w-2xl rounded-xl bg-surface-beige p-10 text-center shadow-sm">
          <span className="material-symbols-outlined mb-6 text-6xl text-secondary">check_circle</span>
          <h1 className="font-display-lg text-display-sm mb-2 text-primary">Đặt hàng thành công!</h1>
          <p className="font-body-lg mb-8 text-on-surface-variant">
            Cảm ơn bạn đã mua sắm. Đơn hàng của bạn đang được xử lý.
          </p>

          {order ? (
            <div className="mb-8 rounded-lg border border-outline-variant bg-white p-6 text-left">
              <h2 className="font-headline-sm mb-4 border-b border-outline-variant pb-2 text-primary">Thông tin đơn hàng</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-on-surface-variant">Mã đơn hàng:</span>
                  <span className="flex items-center gap-2 text-right font-bold text-primary">
                    {orderCode || 'N/A'}
                    {orderCode && (
                      <button type="button" onClick={copyOrderCode} className="inline-flex h-8 w-8 items-center justify-center rounded-commerce-control border border-outline-variant text-primary hover:bg-surface-beige" aria-label="Copy mã đơn hàng">
                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                      </button>
                    )}
                  </span>
                </div>
                {copied && <p className="text-right text-sm font-semibold text-secondary">Đã copy mã đơn hàng</p>}
                <div className="flex justify-between gap-4">
                  <span className="text-on-surface-variant">Tổng tiền:</span>
                  <span className="font-bold text-accent-terracotta">{order.totalAmount ? formatPrice(order.totalAmount) : 'N/A'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-on-surface-variant">Trạng thái:</span>
                  <span className="font-bold uppercase text-secondary">{order.status || 'pending'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-on-surface-variant">Thanh toán:</span>
                  <span className="font-bold uppercase text-primary">{order.paymentMethod || 'COD'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-8 rounded-lg border border-outline-variant bg-white p-6 text-left">
              <h2 className="font-headline-sm mb-2 text-primary">Không tìm thấy thông tin đơn trong phiên này</h2>
              <p className="font-body-md text-on-surface-variant">
                Vui lòng dùng mã đơn hàng đã được cung cấp để tra cứu đơn hàng.
              </p>
            </div>
          )}

          {customerType !== 'authenticated' && (
            <p className="mb-6 rounded-lg border border-[#e5e1dc] bg-white px-4 py-3 text-sm font-semibold text-on-surface-variant">
              Liên kết quản lý và hủy đơn đã được gửi trong email xác nhận để bảo vệ thông tin đơn hàng.
            </p>
          )}

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            {customerType === 'authenticated' ? (
              <Link to="/profile/orders" className="inline-flex items-center justify-center rounded-commerce-control bg-primary px-8 py-3 font-label-lg text-white transition-opacity hover:opacity-90">
                Xem đơn hàng của tôi
              </Link>
            ) : (
              <Link to="/orders/lookup" state={{ orderCode }} className="inline-flex items-center justify-center rounded-commerce-control bg-primary px-8 py-3 font-label-lg text-white transition-opacity hover:opacity-90">
                Tra cứu đơn hàng
              </Link>
            )}
            <Link to="/products" className="inline-flex items-center justify-center rounded-commerce-control border border-primary px-8 py-3 font-label-lg text-primary transition-all hover:bg-primary hover:text-white">
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}