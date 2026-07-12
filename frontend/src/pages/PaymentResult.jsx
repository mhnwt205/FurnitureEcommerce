import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { paymentService } from '../services/api/paymentService';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/formatters';

export default function PaymentResult() {
  const location = useLocation();
  const { clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!location.search) {
        setResultData({ success: false, status: 'error', message: 'Không tìm thấy thông tin giao dịch.' });
        setLoading(false);
        return;
      }
      try {
        const response = await paymentService.verifyPaymentResult(location.search);
        if (response.success && response.status === 'paid') {
          clearCart();
        }
        setResultData(response);
      } catch (error) {
        setResultData({ success: false, status: 'error', message: 'Đã có lỗi xảy ra khi xác minh giao dịch.' });
      } finally {
        setLoading(false);
      }
    };
    verifyPayment();
  }, [location.search, clearCart]);

  let statusIcon = 'error';
  let iconColor = 'text-error';
  let title = 'Có lỗi xảy ra';
  let message = 'Vui lòng thử lại sau.';
  let showSuccessActions = false;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-grow flex-col items-center justify-center px-4 py-20">
          <div className="w-full max-w-2xl rounded-xl bg-surface-beige p-10 text-center shadow-sm">
            <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
            <h1 className="font-display-lg text-display-sm mb-2 text-primary">Đang xác minh giao dịch...</h1>
            <p className="font-body-lg text-on-surface-variant">Vui lòng không đóng trình duyệt.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (resultData) {
    switch (resultData.status) {
      case 'paid':
        statusIcon = 'check_circle';
        iconColor = 'text-secondary';
        title = 'Thanh toán thành công!';
        message = resultData.message || 'Đơn hàng đã được thanh toán và đang được xử lý.';
        showSuccessActions = true;
        break;
      case 'failed':
        statusIcon = 'error';
        iconColor = 'text-error';
        title = 'Thanh toán thất bại';
        message = resultData.message || 'Giao dịch không thành công. Vui lòng thử lại hoặc chọn phương thức khác.';
        break;
      case 'pending':
        statusIcon = 'pending';
        iconColor = 'text-yellow-500';
        title = 'Giao dịch đang được xác minh';
        message = resultData.message || 'Hệ thống đang xử lý giao dịch của bạn. Vui lòng kiểm tra lại sau.';
        showSuccessActions = true;
        break;
      case 'invalid_signature':
        statusIcon = 'warning';
        iconColor = 'text-error';
        title = 'Chữ ký giao dịch không hợp lệ';
        message = 'Giao dịch bị từ chối vì dữ liệu không hợp lệ.';
        break;
      case 'invalid_amount':
        statusIcon = 'warning';
        iconColor = 'text-error';
        title = 'Dữ liệu thanh toán không hợp lệ';
        message = 'Số tiền thanh toán không khớp với đơn hàng.';
        break;
      case 'order_not_found':
        statusIcon = 'search_off';
        iconColor = 'text-error';
        title = 'Không tìm thấy đơn hàng';
        message = 'Thông tin giao dịch không tương ứng với đơn hàng nào trong hệ thống.';
        break;
      default:
        statusIcon = 'error';
        iconColor = 'text-error';
        title = 'Có lỗi xảy ra';
        message = resultData.message || 'Không thể xác minh giao dịch lúc này.';
    }
  }

  const order = resultData?.order || null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-grow flex-col items-center justify-center px-4 py-20">
        <div className="w-full max-w-2xl rounded-xl bg-surface-beige p-10 text-center shadow-sm">
          <span className={`material-symbols-outlined mb-6 text-6xl ${iconColor}`}>{statusIcon}</span>

          <h1 className="font-display-lg text-display-sm mb-2 text-primary">{title}</h1>
          <p className="font-body-lg mb-3 text-on-surface-variant">{message}</p>
          {showSuccessActions && !isAuthenticated && (
            <p className="mb-6 text-sm font-semibold text-secondary">Liên kết quản lý đơn hàng đã được gửi đến email của bạn.</p>
          )}
          {(!showSuccessActions || isAuthenticated) && <div className="mb-6" />}

          {order && (
            <div className="mb-8 rounded-lg border border-outline-variant bg-white p-5 text-left">
              <div className="flex justify-between gap-4">
                <span className="text-on-surface-variant">Mã đơn hàng:</span>
                <span className="font-bold text-primary">{order.orderCode || 'N/A'}</span>
              </div>
              <div className="mt-3 flex justify-between gap-4">
                <span className="text-on-surface-variant">Trạng thái thanh toán:</span>
                <span className="font-bold uppercase text-primary">{order.paymentStatus || resultData.status}</span>
              </div>
              <div className="mt-3 flex justify-between gap-4">
                <span className="text-on-surface-variant">Tổng tiền:</span>
                <span className="font-bold text-accent-terracotta">{order.totalAmount ? formatPrice(order.totalAmount) : 'N/A'}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            {showSuccessActions ? (
              <>
                {isAuthenticated && (
                  <Link to="/profile/orders" className="rounded-commerce-control bg-primary px-8 py-3 font-label-lg uppercase tracking-wider text-white transition-opacity hover:opacity-90">
                    Xem đơn hàng
                  </Link>
                )}
                {!isAuthenticated && (
                  <Link to="/orders/lookup" state={{ orderCode: order?.orderCode || '' }} className="rounded-commerce-control bg-primary px-8 py-3 font-label-lg uppercase tracking-wider text-white transition-opacity hover:opacity-90">
                    Tra cứu đơn hàng
                  </Link>
                )}
                <Link to="/products" className="rounded-commerce-control border border-primary px-8 py-3 font-label-lg uppercase tracking-wider text-primary transition-all hover:bg-primary hover:text-white">
                  Tiếp tục mua sắm
                </Link>
              </>
            ) : (
              <>
                <Link to="/checkout" className="rounded-commerce-control bg-primary px-8 py-3 font-label-lg uppercase tracking-wider text-white transition-opacity hover:opacity-90">
                  Quay lại thanh toán
                </Link>
                <Link to="/products" className="rounded-commerce-control border border-primary px-8 py-3 font-label-lg uppercase tracking-wider text-primary transition-all hover:bg-primary hover:text-white">
                  Tiếp tục mua sắm
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