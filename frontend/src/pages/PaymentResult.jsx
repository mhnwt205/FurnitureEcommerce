import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';

export default function PaymentResult() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const responseCode = searchParams.get('vnp_ResponseCode');

  let status = 'failed';
  let title = 'Thanh toán thất bại';
  let message = 'Giao dịch không thành công. Vui lòng thử lại hoặc chọn phương thức thanh toán khác.';

  if (responseCode === '00') {
    status = 'success';
    title = 'Thanh toán thành công!';
    message = 'Cảm ơn bạn đã mua sắm. Đơn hàng của bạn đã được thanh toán và đang được xử lý.';
  } else if (responseCode === '24') {
    status = 'cancelled';
    title = 'Đã hủy giao dịch';
    message = 'Bạn đã hủy thanh toán giao dịch này.';
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center py-20 px-4">
        <div className="bg-surface-beige p-10 rounded-xl max-w-2xl w-full text-center shadow-sm">
          {status === 'success' && (
            <span className="material-symbols-outlined text-6xl text-secondary mb-6">check_circle</span>
          )}
          {status === 'failed' && (
            <span className="material-symbols-outlined text-6xl text-error mb-6">error</span>
          )}
          {status === 'cancelled' && (
            <span className="material-symbols-outlined text-6xl text-yellow-500 mb-6">cancel</span>
          )}

          <h1 className="font-display-lg text-display-sm text-primary mb-2">{title}</h1>
          <p className="text-on-surface-variant font-body-lg mb-8">{message}</p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {status === 'success' ? (
              <>
                <Link to="/profile" className="bg-primary text-white px-8 py-3 rounded font-label-lg hover:opacity-90 transition-opacity uppercase tracking-wider">
                  Xem đơn hàng
                </Link>
                <Link to="/" className="border border-primary text-primary px-8 py-3 rounded font-label-lg hover:bg-primary hover:text-white transition-all uppercase tracking-wider">
                  Về trang chủ
                </Link>
              </>
            ) : (
              <>
                <Link to="/checkout" className="bg-primary text-white px-8 py-3 rounded font-label-lg hover:opacity-90 transition-opacity uppercase tracking-wider">
                  Quay lại giỏ hàng
                </Link>
                <Link to="/" className="border border-primary text-primary px-8 py-3 rounded font-label-lg hover:bg-primary hover:text-white transition-all uppercase tracking-wider">
                  Về trang chủ
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
