import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { formatPrice } from '../utils/formatters';


export default function OrderSuccess() {
  const location = useLocation();
  const order = location.state?.order;


  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center py-20 px-4">
        <div className="bg-surface-beige p-10 rounded-xl max-w-2xl w-full text-center shadow-sm">
          <span className="material-symbols-outlined text-6xl text-secondary mb-6">check_circle</span>
          <h1 className="font-display-lg text-display-sm text-primary mb-2">Đặt hàng thành công!</h1>
          <p className="text-on-surface-variant font-body-lg mb-8">
            Cảm ơn bạn đã mua sắm. Đơn hàng của bạn đang được xử lý.
          </p>

          {order && (
            <div className="bg-white p-6 rounded-lg mb-8 text-left border border-outline-variant">
              <h2 className="font-headline-sm text-primary mb-4 border-b border-outline-variant pb-2">Thông tin đơn hàng</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Mã đơn hàng:</span>
                  <span className="font-bold text-primary">{order.orderCode || order.id?.substring(0, 8).toUpperCase() || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Tổng tiền:</span>
                  <span className="font-bold text-accent-terracotta">{order.totalAmount ? formatPrice(order.totalAmount) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Trạng thái:</span>
                  <span className="font-bold text-secondary uppercase">{order.status || 'Chờ xác nhận'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Thanh toán:</span>
                  <span className="font-bold text-primary uppercase">{order.paymentMethod || 'COD'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/products" className="bg-primary text-white px-8 py-3 rounded font-label-lg hover:opacity-90 transition-opacity">
              TIẾP TỤC MUA SẮM
            </Link>
            <Link to="/" className="border border-primary text-primary px-8 py-3 rounded font-label-lg hover:bg-primary hover:text-white transition-all">
              VỀ TRANG CHỦ
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
