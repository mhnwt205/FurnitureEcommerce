import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { paymentService } from '../services/api/paymentService';
import { useCart } from '../hooks/useCart';

export default function PaymentResult() {
  const location = useLocation();
  const { clearCart } = useCart();
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
        console.error('Verify payment error:', error);
        setResultData({ success: false, status: 'error', message: 'Đã có lỗi xảy ra khi xác minh giao dịch.' });
      } finally {
        setLoading(false);
      }
    };
    verifyPayment();
  }, [location.search]);

  let statusIcon = 'error';
  let iconColor = 'text-error';
  let title = 'Có lỗi xảy ra';
  let message = 'Vui lòng thử lại sau.';
  let showSuccessActions = false;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center py-20 px-4">
          <div className="bg-surface-beige p-10 rounded-xl max-w-2xl w-full text-center shadow-sm">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto mb-6"></div>
            <h1 className="font-display-lg text-display-sm text-primary mb-2">Đang xác minh giao dịch...</h1>
            <p className="text-on-surface-variant font-body-lg">Vui lòng không đóng trình duyệt.</p>
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
        message = resultData.message || 'Cảm ơn bạn đã mua sắm. Đơn hàng của bạn đã được thanh toán và đang được xử lý.';
        showSuccessActions = true;
        break;
      case 'failed':
        statusIcon = 'error';
        iconColor = 'text-error';
        title = 'Thanh toán thất bại';
        message = resultData.message || 'Giao dịch không thành công. Vui lòng thử lại hoặc chọn phương thức thanh toán khác.';
        break;
      case 'pending':
        statusIcon = 'pending';
        iconColor = 'text-yellow-500';
        title = 'Giao dịch đang được xác minh';
        message = resultData.message || 'Hệ thống đang xử lý giao dịch của bạn. Vui lòng kiểm tra lại sau ít phút.';
        showSuccessActions = true;
        break;
      case 'invalid_signature':
        statusIcon = 'warning';
        iconColor = 'text-error';
        title = 'Chữ ký giao dịch không hợp lệ';
        message = 'Phát hiện nghi vấn thay đổi dữ liệu. Giao dịch bị từ chối.';
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center py-20 px-4">
        <div className="bg-surface-beige p-10 rounded-xl max-w-2xl w-full text-center shadow-sm">
          <span className={`material-symbols-outlined text-6xl ${iconColor} mb-6`}>{statusIcon}</span>
          
          <h1 className="font-display-lg text-display-sm text-primary mb-2">{title}</h1>
          <p className="text-on-surface-variant font-body-lg mb-8">{message}</p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {showSuccessActions ? (
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
