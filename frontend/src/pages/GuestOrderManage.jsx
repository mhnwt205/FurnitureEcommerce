import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { orderService } from '../services/api/orderService';
import { formatPrice } from '../utils/formatters';
import OrderCancelModal from '../components/orders/OrderCancelModal';
import { CANCELLATION_REASON_LABELS } from '../utils/cancellationReasons';

const orderStatusLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao hàng',
  delivered: 'Đã giao hàng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy'
};

const paymentStatusLabels = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thanh toán thất bại',
  refunded: 'Đã hoàn tiền'
};

const getRefundStatusMessage = (order) => {
  const requestSuffix = order?.refundRequestId ? `: ${order.refundRequestId}` : '';
  const messages = {
    pending: 'Yêu cầu hủy đơn và hoàn tiền đang chờ quản trị viên xử lý',
    processing: 'Yêu cầu hoàn tiền đang được xử lý trên VNPay Merchant',
    unknown: 'Kết quả hoàn tiền đang được xác minh',
    succeeded: 'Đơn hàng đã được hủy và hoàn tiền đã được xác nhận',
    failed: 'Hoàn tiền chưa thành công. Bạn có thể gửi lại yêu cầu nếu đơn vẫn đủ điều kiện'
  };
  return `${messages[order?.refundStatus] || messages.pending}${requestSuffix}.`;
};

const formatDate = (value) => value ? new Date(value).toLocaleString('vi-VN') : '-';

const getErrorMessage = (error) => {
  if (error?.status === 404) return 'Liên kết quản lý đơn hàng không hợp lệ hoặc đã hết hạn.';
  if (error?.status === 422) return 'Đơn hàng đã thanh toán qua VNPay. Việc hủy cần xử lý hoàn tiền.';
  if (error?.code === 'REFUND_PENDING') return 'Yêu cầu hủy và hoàn tiền đã được ghi nhận.';
  if (error?.status === 409) return 'Đơn hàng đã được xử lý và hiện không thể hủy.';
  if (error?.status === 429) return 'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.';
  if (error?.status === 400) return 'Thông tin hủy đơn không hợp lệ.';
  return 'Không thể thực hiện yêu cầu lúc này. Vui lòng thử lại sau.';
};

export default function GuestOrderManage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryToken = params.get('token') || '';
    if (queryToken) {
      setToken(queryToken);
      navigate('/orders/manage', { replace: true });
      return;
    }
    setLoading(false);
    setError('Liên kết quản lý đơn hàng không hợp lệ hoặc đã hết hạn.');
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const loadOrder = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await orderService.getGuestManagedOrder({ token });
        if (active) setOrder(response.order);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    };
    loadOrder();
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    const previous = document.referrer;
    document.querySelector('meta[name="referrer"]')?.setAttribute('content', 'no-referrer');
    if (!document.querySelector('meta[name="referrer"]')) {
      const meta = document.createElement('meta');
      meta.name = 'referrer';
      meta.content = 'no-referrer';
      document.head.appendChild(meta);
    }
    return () => {
      const meta = document.querySelector('meta[name="referrer"]');
      if (meta && !previous) meta.remove();
    };
  }, []);


  const submitCancel = async ({ reasonCode, reasonText }) => {
    setCancelLoading(true);
    setCancelError('');
    try {
      const response = await orderService.cancelGuestManagedOrder({ token, reasonCode, reasonText });
      setOrder(response.order);
      setCancelOpen(false);
    } catch (err) {
      setCancelError(getErrorMessage(err));
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf8]">
      <Header />
      <main className="flex-grow px-4 py-10 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#bfa37c]">Quản lý đơn hàng</p>
            <h1 className="mt-2 text-3xl font-bold text-[#333333] md:text-4xl">Theo dõi đơn hàng của bạn</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#666666]">Trang này chỉ hoạt động với liên kết quản lý đơn hàng đã được gửi riêng cho bạn.</p>
          </div>

          {loading && <div className="border border-[#e5e1dc] bg-white p-8 text-center text-sm font-semibold text-[#555555]">Đang tải thông tin đơn hàng...</div>}

          {!loading && error && (
            <div className="border border-[#f5d2d3] bg-[#fdebec] p-8 text-center">
              <span className="material-symbols-outlined text-5xl text-[#9f2f2d]">link_off</span>
              <h2 className="mt-4 text-xl font-bold text-[#9f2f2d]">Liên kết không hợp lệ</h2>
              <p className="mt-2 text-sm text-[#9f2f2d]">{error}</p>
              <Link to="/orders/lookup" className="mt-5 inline-flex rounded-commerce-control border border-[#333333] px-5 py-2.5 text-sm font-bold uppercase text-[#333333] hover:bg-[#333333] hover:text-white">Tra cứu đơn hàng</Link>
            </div>
          )}

          {!loading && order && (
            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-5">
                <div className="border border-[#e5e1dc] bg-white p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm text-[#777777]">Mã đơn hàng</p>
                      <h2 className="mt-1 text-2xl font-bold text-[#333333]">{order.orderCode}</h2>
                      <p className="mt-2 text-sm text-[#777777]">Ngày đặt: {formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="border border-[#e5e5e5] px-3 py-1 text-xs font-bold uppercase text-[#555555]">{orderStatusLabels[order.status] || order.status}</span>
                      <span className="border border-[#e5e5e5] px-3 py-1 text-xs font-bold uppercase text-[#555555]">{paymentStatusLabels[order.paymentStatus] || order.paymentStatus}</span>
                    </div>
                  </div>
                  {order.refundPending && (
                    <div className="mt-4 border border-[#f1dfb5] bg-[#fbf3db] p-3 text-sm font-semibold text-[#956400]">{getRefundStatusMessage(order)}</div>
                  )}
                  {order.requiresRefund && !order.refundPending && (
                    <div className="mt-4 border border-[#f1dfb5] bg-[#fbf3db] p-3 text-sm font-semibold text-[#956400]">Đơn hàng đã thanh toán qua VNPay. Bạn có thể gửi yêu cầu hủy và hoàn tiền.</div>
                  )}
                </div>

                <div className="border border-[#e5e1dc] bg-white p-5">
                  <h3 className="mb-4 text-lg font-bold text-[#333333]">Sản phẩm</h3>
                  <div className="space-y-3">
                    {order.items?.map((item, index) => (
                      <div key={`${item.productName}-${index}`} className="grid gap-2 border-b border-[#eeeeee] pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_110px_130px] sm:items-center">
                        <div><p className="font-semibold text-[#333333]">{item.productName}</p><p className="mt-1 text-sm text-[#777777]">Số lượng: {item.quantity}</p></div>
                        <p className="text-sm text-[#555555] sm:text-right">{formatPrice(item.finalPrice)}</p>
                        <p className="font-bold text-[#b94732] sm:text-right">{formatPrice(item.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex justify-between border-t border-[#eeeeee] pt-4 text-lg font-bold"><span>Tổng tiền</span><span className="text-[#b94732]">{formatPrice(order.totalAmount)}</span></div>
                </div>

                <div className="border border-[#e5e1dc] bg-white p-5">
                  <h3 className="mb-4 text-lg font-bold text-[#333333]">Tiến trình đơn hàng</h3>
                  <ol className="space-y-3">
                    {order.statusHistory?.length ? order.statusHistory.map((entry, index) => (
                      <li key={`${entry.status}-${entry.createdAt}-${index}`} className="flex gap-3"><span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#bfa37c]" /><div><p className="text-sm font-bold text-[#333333]">{orderStatusLabels[entry.status] || entry.status}</p><p className="text-xs text-[#777777]">{formatDate(entry.createdAt)}</p></div></li>
                    )) : <li className="text-sm text-[#777777]">Chưa có lịch sử trạng thái.</li>}
                  </ol>
                </div>
              </div>

              <aside className="space-y-5">
                <div className="border border-[#e5e1dc] bg-white p-5">
                  <h3 className="mb-4 text-lg font-bold text-[#333333]">Thông tin nhận hàng</h3>
                  <dl className="space-y-3 text-sm">
                    <div><dt className="text-[#777777]">Khách hàng</dt><dd className="font-semibold text-[#333333]">{order.fullName}</dd></div>
                    <div><dt className="text-[#777777]">Điện thoại</dt><dd className="font-semibold text-[#333333]">{order.phone}</dd></div>
                    <div><dt className="text-[#777777]">Email</dt><dd className="font-semibold text-[#333333] break-all">{order.customerEmail}</dd></div>
                    <div><dt className="text-[#777777]">Địa chỉ</dt><dd className="font-semibold text-[#333333]">{order.address}</dd></div>
                    {order.note && <div><dt className="text-[#777777]">Ghi chú</dt><dd className="font-semibold text-[#333333]">{order.note}</dd></div>}
                  </dl>
                </div>

                {order.cancellation && (
                  <div className="border border-[#f5d2d3] bg-[#fdebec] p-5">
                    <h3 className="mb-3 text-lg font-bold text-[#9f2f2d]">Đơn hàng đã hủy</h3>
                    <p className="text-sm text-[#9f2f2d]">Thời gian: {formatDate(order.cancellation.cancelledAt)}</p>
                    {order.cancellation.reasonCode && <p className="mt-2 text-sm text-[#9f2f2d]">Lý do: {CANCELLATION_REASON_LABELS[order.cancellation.reasonCode] || order.cancellation.reasonCode}</p>}
                    {order.cancellation.reasonText && <p className="mt-2 text-sm text-[#9f2f2d]">Ghi chú: {order.cancellation.reasonText}</p>}
                  </div>
                )}

                {(order.canCancel || order.requiresRefund) && !order.refundPending && (
                  <button type="button" onClick={() => setCancelOpen(true)} className="w-full rounded-commerce-control bg-[#9f2f2d] px-5 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#7f2423]">{order.requiresRefund ? 'Hủy đơn và hoàn tiền' : 'Hủy đơn hàng'}</button>
                )}
                <Link to="/products" className="block rounded-commerce-control border border-[#333333] px-5 py-3 text-center text-sm font-bold uppercase tracking-wider text-[#333333] hover:bg-[#333333] hover:text-white">Tiếp tục mua sắm</Link>
              </aside>
            </section>
          )}
        </div>
      </main>
      <Footer />

      <OrderCancelModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={submitCancel}
        loading={cancelLoading}
        error={cancelError}
        refundMode={Boolean(order?.requiresRefund)}
      />
    </div>
  );
}
