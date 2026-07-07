import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { orderService } from '../services/api/orderService';
import { paymentService } from '../services/api/paymentService';
import { getStaticFileUrl } from '../utils/imageUtils';

const statusStyles = {
  pending: 'bg-[#fbf3db] text-[#956400] border-[#f1dfb5]', confirmed: 'bg-[#e1f3fe] text-[#1f6c9f] border-[#c8e6f6]', preparing: 'bg-[#f3eef8] text-[#6e4b86] border-[#e6d9ee]', shipping: 'bg-[#e9f4f8] text-[#2f6477] border-[#d4e7ee]', delivered: 'bg-[#edf3ec] text-[#346538] border-[#dbe8d8]', completed: 'bg-[#edf3ec] text-[#346538] border-[#dbe8d8]', cancelled: 'bg-[#fdebec] text-[#9f2f2d] border-[#f5d2d3]'
};
const paymentStyles = { paid: 'bg-[#edf3ec] text-[#346538] border-[#dbe8d8]', unpaid: 'bg-[#fbf3db] text-[#956400] border-[#f1dfb5]', failed: 'bg-[#fdebec] text-[#9f2f2d] border-[#f5d2d3]', refunded: 'bg-[#f3eef8] text-[#6e4b86] border-[#e6d9ee]' };

function formatPrice(price) { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0); }
function getPaymentStatusBadge(status) { switch (status) { case 'paid': return { text: 'Đã thanh toán', color: paymentStyles.paid }; case 'unpaid': return { text: 'Chưa thanh toán', color: paymentStyles.unpaid }; case 'failed': return { text: 'Thanh toán lỗi', color: paymentStyles.failed }; case 'refunded': return { text: 'Đã hoàn tiền', color: paymentStyles.refunded }; default: return { text: status, color: 'bg-[#f3f3f3] text-[#555555] border-[#e5e5e5]' }; } }
function getStatusLabel(status) { switch (status) { case 'pending': return { text: 'Chờ xác nhận', color: statusStyles.pending }; case 'confirmed': return { text: 'Đã xác nhận', color: statusStyles.confirmed }; case 'preparing': return { text: 'Đang chuẩn bị hàng', color: statusStyles.preparing }; case 'shipping': return { text: 'Đang giao hàng', color: statusStyles.shipping }; case 'delivered': return { text: 'Đã giao hàng', color: statusStyles.delivered }; case 'completed': return { text: 'Hoàn thành', color: statusStyles.completed }; case 'cancelled': return { text: 'Đã hủy', color: statusStyles.cancelled }; default: return { text: status, color: 'bg-[#f3f3f3] text-[#555555] border-[#e5e5e5]' }; } }
function ItemImage({ src, alt }) { if (!src) return <div className="flex h-full w-full items-center justify-center bg-[#f3f3f1] text-[#999999]"><span className="material-symbols-outlined text-2xl">inventory_2</span></div>; return <img src={src} alt={alt} className="h-full w-full object-cover" />; }

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(null);

  const handlePayAgain = async (orderId) => {
    try {
      setPaymentLoading(orderId);
      const result = await paymentService.createVnpayUrl({ orderId });
      if (result && result.success && result.paymentUrl) window.location.href = result.paymentUrl;
      else window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Không thể tạo URL thanh toán. Vui lòng thử lại sau.', type: 'error' } }));
    } catch (err) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: err.message || 'Lỗi kết nối đến cổng thanh toán.', type: 'error' } }));
    } finally { setPaymentLoading(null); }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userStr || !token) { navigate('/login'); return; }
    fetchMyOrders();
  }, [navigate]);

  const fetchMyOrders = async () => {
    try { setLoading(true); const data = await orderService.getMyOrders(); setOrders(data); }
    catch (err) { setError(err.message || 'Lỗi tải danh sách đơn hàng'); }
    finally { setLoading(false); }
  };

  const handleOpenDetail = async (order) => {
    try { setLoading(true); const detail = await orderService.getMyOrderById(order.id); setSelectedOrder(detail); setIsModalOpen(true); }
    catch (err) { window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: err.message || 'Lỗi tải chi tiết đơn hàng', type: 'error' } })); }
    finally { setLoading(false); }
  };
  const handleCloseDetail = () => { setSelectedOrder(null); setIsModalOpen(false); };

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f5]"><Header />
      <main className="mx-auto w-full max-w-[1200px] flex-grow px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-7 border-b border-[#e5e5e5] pb-6"><p className="text-[13px] text-[#777777]">Tài khoản</p><h1 className="mt-2 text-2xl font-bold text-[#333333] md:text-[30px]">Đơn hàng của tôi</h1><p className="mt-2 text-sm leading-6 text-[#777777]">Theo dõi trạng thái các đơn hàng bạn đã đặt.</p></div>
        {loading ? <div className="space-y-4">{[0, 1, 2].map(item => <div key={item} className="ui-skeleton h-28 rounded-[12px]" />)}</div> : error ? <div className="rounded-[12px] border border-[#f5d2d3] bg-[#fdebec] p-4 text-center text-sm text-[#9f2f2d]">{error}</div> : orders.length === 0 ? <div className="ui-empty-state"><span className="material-symbols-outlined mb-3 block text-5xl text-[#999999]">shopping_bag</span><h2 className="text-lg font-bold text-[#333333]">Bạn chưa có đơn hàng nào</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777777]">Hãy khám phá các bộ sưu tập nội thất hiện có.</p><Link to="/products" className="ui-button-primary mt-5 inline-flex px-5 py-2.5 text-sm">Tiếp tục mua hàng</Link></div> : <div className="space-y-3">{orders.map(order => { const status = getStatusLabel(order.status); const payment = getPaymentStatusBadge(order.paymentStatus); return <article key={order.id} className="rounded-[12px] border border-[#e5e5e5] bg-white p-4 transition-colors hover:border-[#bfa37c]"><div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_150px_160px_150px] md:items-center"><div><p className="font-bold text-[#333333]">{order.orderCode || `#${order.id}`}</p><p className="mt-1 text-sm text-[#777777]">{new Date(order.createdAt).toLocaleDateString('vi-VN')} lúc {new Date(order.createdAt).toLocaleTimeString('vi-VN')}</p></div><p className="font-bold text-[#b94732]">{formatPrice(order.totalAmount)}</p><div className="flex flex-wrap gap-2"><span className="rounded-[6px] border border-[#e5e5e5] px-2 py-1 text-[11px] font-bold uppercase text-[#555555]">{order.paymentMethod}</span><span className={`rounded-[6px] border px-2 py-1 text-[11px] font-bold ${payment.color}`}>{payment.text}</span><span className={`rounded-[6px] border px-2 py-1 text-[11px] font-bold ${status.color}`}>{status.text}</span></div><div className="flex gap-2 md:justify-end">{order.paymentMethod === 'VNPAY' && order.paymentStatus === 'unpaid' && <button onClick={() => handlePayAgain(order.id)} disabled={paymentLoading === order.id} className="ui-button-primary px-3 py-2 text-xs disabled:opacity-70">{paymentLoading === order.id ? 'Đang tải...' : 'Thanh toán'}</button>}<button onClick={() => handleOpenDetail(order)} className="ui-button-secondary px-3 py-2 text-xs">Xem chi tiết</button></div></div></article>; })}</div>}
      </main><Footer />
      {isModalOpen && selectedOrder && <div className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"><div className="ui-modal-panel flex max-h-[90vh] w-full max-w-[960px] flex-col overflow-hidden" role="dialog" aria-modal="true" aria-label="Chi tiết đơn hàng"><div className="ui-modal-header flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-[#333333]">Chi tiết đơn hàng #{selectedOrder.orderCode || selectedOrder.id}</h2><p className="mt-1 text-sm text-[#777777]">{new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}</p></div><button onClick={handleCloseDetail} className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#777777] hover:bg-[#fdebec] hover:text-[#9f2f2d]" aria-label="Đóng chi tiết đơn hàng"><span className="material-symbols-outlined">close</span></button></div><div className="overflow-y-auto bg-[#fafaf8] p-5"><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><div className="space-y-3">{selectedOrder.orderItems?.map(item => { const rawImage = item?.product?.images?.find(img => img.isPrimary)?.imageUrl || item?.product?.images?.[0]?.imageUrl || item?.product?.imageUrl; const imageUrl = rawImage ? getStaticFileUrl(rawImage) : ''; return <div key={item.id} className="flex gap-4 rounded-[10px] border border-[#e5e5e5] bg-white p-3"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-[8px] border border-[#eeeeee]"><ItemImage src={imageUrl} alt={item.productName} /></div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold text-[#333333]">{item.productName}</p><p className="mt-1 text-xs text-[#777777]">Số lượng: {item.quantity} x {formatPrice(item.finalPrice ?? item.price)}</p></div><p className="shrink-0 text-sm font-bold text-[#b94732]">{formatPrice(item.subtotal)}</p></div>; })}</div><aside className="space-y-4"><div className="rounded-[10px] border border-[#e5e5e5] bg-white p-4"><h3 className="mb-3 text-sm font-bold text-[#333333]">Giao hàng</h3><p className="text-sm font-semibold text-[#333333]">{selectedOrder.fullName}</p><p className="mt-1 text-sm text-[#555555]">{selectedOrder.phone}</p><p className="mt-2 text-sm leading-6 text-[#555555]">{selectedOrder.address}</p>{selectedOrder.note && <p className="mt-2 rounded-[8px] bg-[#fafaf8] p-2 text-sm text-[#555555]">{selectedOrder.note}</p>}</div><div className="rounded-[10px] border border-[#e5e5e5] bg-white p-4"><h3 className="mb-3 text-sm font-bold text-[#333333]">Tóm tắt</h3><div className="space-y-2 border-b border-[#eeeeee] pb-3 text-sm"><div className="flex justify-between"><span className="text-[#777777]">Phương thức</span><span className="font-bold uppercase text-[#333333]">{selectedOrder.paymentMethod}</span></div><div className="flex justify-between"><span className="text-[#777777]">Tạm tính</span><span className="font-semibold text-[#333333]">{formatPrice(selectedOrder.totalAmount)}</span></div></div><div className="mt-3 flex justify-between"><span className="font-bold text-[#333333]">Tổng cộng</span><span className="text-xl font-bold text-[#b94732]">{formatPrice(selectedOrder.totalAmount)}</span></div>{selectedOrder.paymentMethod === 'VNPAY' && selectedOrder.paymentStatus === 'unpaid' && <button onClick={() => handlePayAgain(selectedOrder.id)} disabled={paymentLoading === selectedOrder.id} className="ui-button-primary mt-4 w-full py-2.5 text-sm disabled:opacity-70">{paymentLoading === selectedOrder.id ? 'Đang xử lý...' : 'Tiếp tục thanh toán'}</button>}</div></aside></div></div><div className="ui-modal-footer flex justify-end"><button onClick={handleCloseDetail} className="ui-button-secondary px-5 py-2.5 text-sm">Đóng</button></div></div></div>}
    </div>
  );
}