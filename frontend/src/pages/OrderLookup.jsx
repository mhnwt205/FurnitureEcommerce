import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { orderService } from '../services/api/orderService';
import { formatPrice } from '../utils/formatters';

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

const statusClasses = {
  pending: 'border-[#f1dfb5] bg-[#fbf3db] text-[#956400]',
  confirmed: 'border-[#c8e6f6] bg-[#e1f3fe] text-[#1f6c9f]',
  preparing: 'border-[#e6d9ee] bg-[#f3eef8] text-[#6e4b86]',
  shipping: 'border-[#d4e7ee] bg-[#e9f4f8] text-[#2f6477]',
  delivered: 'border-[#dbe8d8] bg-[#edf3ec] text-[#346538]',
  completed: 'border-[#dbe8d8] bg-[#edf3ec] text-[#346538]',
  cancelled: 'border-[#f5d2d3] bg-[#fdebec] text-[#9f2f2d]'
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
};

const getMessage = (error) => {
  if (error?.status === 404) return 'Không tìm thấy đơn hàng phù hợp.';
  if (error?.status === 429) return 'Bạn đã tra cứu quá nhiều lần. Vui lòng thử lại sau.';
  if (error?.status === 400) return 'Vui lòng kiểm tra lại mã đơn hàng và số điện thoại.';
  return 'Không thể tra cứu đơn hàng lúc này. Vui lòng thử lại sau.';
};

export default function OrderLookup() {
  const location = useLocation();
  const initialOrderCode = location.state?.orderCode || '';
  const [form, setForm] = useState({ orderCode: initialOrderCode, phone: '' });
  const [fieldError, setFieldError] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);

  const normalizedOrderCode = useMemo(() => form.orderCode.trim(), [form.orderCode]);
  const normalizedPhone = useMemo(() => form.phone.trim(), [form.phone]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldError('');
    setLookupError('');
  };

  const validate = () => {
    if (!normalizedOrderCode || !normalizedPhone) return 'Vui lòng nhập mã đơn hàng và số điện thoại.';
    if (normalizedOrderCode.length < 3 || normalizedOrderCode.length > 50) return 'Mã đơn hàng không hợp lệ.';
    if (!/^[A-Za-z0-9._:-]+$/.test(normalizedOrderCode)) return 'Mã đơn hàng không hợp lệ.';
    if (normalizedPhone.length < 8 || normalizedPhone.length > 30) return 'Số điện thoại không hợp lệ.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationMessage = validate();
    if (validationMessage) {
      setFieldError(validationMessage);
      return;
    }

    setLoading(true);
    setLookupError('');
    setOrder(null);
    try {
      const response = await orderService.lookupOrder({ orderCode: normalizedOrderCode, phone: normalizedPhone });
      setOrder(response.order);
    } catch (error) {
      setLookupError(getMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf8]">
      <Header />
      <main className="flex-grow px-4 py-10 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#bfa37c]">Tra cứu đơn hàng</p>
            <h1 className="mt-2 text-3xl font-bold text-[#333333] md:text-4xl">Kiểm tra trạng thái đơn hàng</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#666666]">
              Nhập mã đơn hàng và số điện thoại đã dùng khi đặt hàng. Thông tin hiển thị được rút gọn để bảo vệ dữ liệu cá nhân.
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#777777]">Trang tra cứu chỉ dùng để xem trạng thái. Nếu cần quản lý hoặc hủy đơn khách vãng lai, vui lòng dùng liên kết quản lý đã được gửi qua email.</p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 rounded-commerce-card border border-[#e5e1dc] bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
            <div>
              <label htmlFor="orderCode" className="mb-2 block text-sm font-bold text-[#333333]">Mã đơn hàng</label>
              <input
                id="orderCode"
                name="orderCode"
                value={form.orderCode}
                onChange={handleChange}
                autoComplete="off"
                className="h-12 w-full rounded-commerce-control border border-[#d8d2cb] px-4 text-sm text-[#333333] outline-none focus:border-[#bfa37c]"
                placeholder="ORD-..."
              />
            </div>
            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-bold text-[#333333]">Số điện thoại đặt hàng</label>
              <input
                id="phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                inputMode="tel"
                autoComplete="tel"
                className="h-12 w-full rounded-commerce-control border border-[#d8d2cb] px-4 text-sm text-[#333333] outline-none focus:border-[#bfa37c]"
                placeholder="Ví dụ: 090..."
              />
            </div>
            <button type="submit" disabled={loading} className="h-12 rounded-commerce-control bg-[#333333] px-6 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#bfa37c] disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'Đang tra cứu...' : 'Tra cứu'}
            </button>
          </form>

          {(fieldError || lookupError) && (
            <div className="mt-4 border border-[#f5d2d3] bg-[#fdebec] px-4 py-3 text-sm font-semibold text-[#9f2f2d]" role="alert">
              {fieldError || lookupError}
            </div>
          )}

          {order && (
            <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-5">
                <div className="border border-[#e5e1dc] bg-white p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm text-[#777777]">Mã đơn hàng</p>
                      <h2 className="mt-1 text-2xl font-bold text-[#333333]">{order.orderCode}</h2>
                      <p className="mt-2 text-sm text-[#777777]">Ngày đặt: {formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`border px-3 py-1 text-xs font-bold uppercase ${statusClasses[order.status] || 'border-[#e5e5e5] bg-[#f3f3f3] text-[#555555]'}`}>{orderStatusLabels[order.status] || order.status}</span>
                      <span className="border border-[#e5e5e5] bg-white px-3 py-1 text-xs font-bold uppercase text-[#555555]">{paymentStatusLabels[order.paymentStatus] || order.paymentStatus}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-[#e5e1dc] bg-white p-5">
                  <h3 className="mb-4 text-lg font-bold text-[#333333]">Sản phẩm</h3>
                  <div className="space-y-3">
                    {order.items?.map((item, index) => (
                      <div key={`${item.productName}-${index}`} className="grid gap-2 border-b border-[#eeeeee] pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_100px_120px] sm:items-center">
                        <div>
                          <p className="font-semibold text-[#333333]">{item.productName}</p>
                          <p className="mt-1 text-sm text-[#777777]">Số lượng: {item.quantity}</p>
                        </div>
                        <p className="text-sm text-[#555555] sm:text-right">{formatPrice(item.finalPrice)}</p>
                        <p className="font-bold text-[#b94732] sm:text-right">{formatPrice(item.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex justify-between border-t border-[#eeeeee] pt-4 text-lg font-bold">
                    <span>Tổng tiền</span>
                    <span className="text-[#b94732]">{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>

                <div className="border border-[#e5e1dc] bg-white p-5">
                  <h3 className="mb-4 text-lg font-bold text-[#333333]">Tiến trình đơn hàng</h3>
                  <ol className="space-y-3">
                    {order.statusHistory?.length ? order.statusHistory.map((entry, index) => (
                      <li key={`${entry.status}-${entry.createdAt}-${index}`} className="flex gap-3">
                        <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#bfa37c]" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-bold text-[#333333]">{orderStatusLabels[entry.status] || entry.status}</p>
                          <p className="text-xs text-[#777777]">{formatDate(entry.createdAt)}</p>
                        </div>
                      </li>
                    )) : <li className="text-sm text-[#777777]">Chưa có lịch sử trạng thái cong khai.</li>}
                  </ol>
                </div>
              </div>

              <aside className="space-y-5">
                <div className="border border-[#e5e1dc] bg-white p-5">
                  <h3 className="mb-4 text-lg font-bold text-[#333333]">Thông tin nhận hàng</h3>
                  <dl className="space-y-3 text-sm">
                    <div><dt className="text-[#777777]">Khách hàng</dt><dd className="font-semibold text-[#333333]">{order.customer?.fullNameMasked || '-'}</dd></div>
                    <div><dt className="text-[#777777]">Điện thoại</dt><dd className="font-semibold text-[#333333]">{order.customer?.phoneMasked || '-'}</dd></div>
                    <div><dt className="text-[#777777]">Email</dt><dd className="font-semibold text-[#333333]">{order.customer?.emailMasked || '-'}</dd></div>
                    <div><dt className="text-[#777777]">Địa chỉ</dt><dd className="font-semibold text-[#333333]">{order.customer?.addressMasked || '-'}</dd></div>
                  </dl>
                </div>

                <div className="border border-[#e5e1dc] bg-white p-5">
                  <h3 className="mb-4 text-lg font-bold text-[#333333]">Thanh toán</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between gap-4"><dt className="text-[#777777]">Phương thức</dt><dd className="font-bold uppercase text-[#333333]">{order.paymentMethod}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-[#777777]">Trạng thái</dt><dd className="font-bold text-[#333333]">{paymentStatusLabels[order.paymentStatus] || order.paymentStatus}</dd></div>
                  </dl>
                </div>

                {order.cancellation && (
                  <div className="border border-[#f5d2d3] bg-[#fdebec] p-5">
                    <h3 className="mb-3 text-lg font-bold text-[#9f2f2d]">Thông tin hủy đơn</h3>
                    <p className="text-sm text-[#9f2f2d]">Thời gian: {formatDate(order.cancellation.cancelledAt)}</p>
                    {order.cancellation.reasonCode && <p className="mt-2 text-sm text-[#9f2f2d]">Lý do: {order.cancellation.reasonCode}</p>}
                    {order.cancellation.reasonText && <p className="mt-2 text-sm text-[#9f2f2d]">Ghi chú: {order.cancellation.reasonText}</p>}
                  </div>
                )}

                <Link to="/products" className="block rounded-commerce-control border border-[#333333] px-5 py-3 text-center text-sm font-bold uppercase tracking-wider text-[#333333] transition-colors hover:bg-[#333333] hover:text-white">
                  Tiếp tục mua sắm
                </Link>
              </aside>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
