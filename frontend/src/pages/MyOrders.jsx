import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { orderService } from '../services/api/orderService';
import { paymentService } from '../services/api/paymentService';

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(null);

  const handlePayAgain = async (orderId) => {
    try {
      setPaymentLoading(orderId);
      const result = await paymentService.createVnpayUrl({ orderId });
      if (result && result.success && result.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Không thể tạo URL thanh toán. Vui lòng thử lại sau.' } }));
      }
    } catch (err) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: err.message || 'Lỗi kết nối đến cổng thanh toán.' } }));
    } finally {
      setPaymentLoading(null);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!userStr || !token) {
      navigate('/login');
      return;
    }
    fetchMyOrders();
  }, [navigate]);

  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getMyOrders();
      setOrders(data);
    } catch (err) {
      setError(err.message || 'Lỗi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (order) => {
    try {
      setLoading(true);
      const detail = await orderService.getMyOrderById(order.id);
      setSelectedOrder(detail);
      setIsModalOpen(true);
    } catch (err) {
      alert(err.message || 'Lỗi tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedOrder(null);
    setIsModalOpen(false);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'paid': return { text: 'Đã thanh toán', color: 'bg-green-100 text-green-800 border-green-200' };
      case 'unpaid': return { text: 'Chưa thanh toán', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      case 'failed': return { text: 'Thanh toán lỗi', color: 'bg-red-100 text-red-800 border-red-200' };
      case 'refunded': return { text: 'Đã hoàn tiền', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      default: return { text: status, color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return { text: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800 border-yellow-200 text-yellow-600' };
      case 'confirmed': return { text: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800 border-blue-200 text-blue-600' };
      case 'preparing': return { text: 'Đang chuẩn bị hàng', color: 'bg-purple-100 text-purple-800 border-purple-200 text-purple-600' };
      case 'shipping': return { text: 'Đang giao hàng', color: 'bg-sky-100 text-sky-800 border-sky-200 text-sky-600' };
      case 'delivered': return { text: 'Đã giao hàng', color: 'bg-emerald-100 text-emerald-800 border-emerald-200 text-emerald-600' };
      case 'completed': return { text: 'Hoàn thành', color: 'bg-green-100 text-green-800 border-green-200 text-green-600' };
      case 'cancelled': return { text: 'Đã hủy', color: 'bg-red-100 text-red-800 border-red-200 text-red-600' };
      default: return { text: status, color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-bright">
      <Header />
      <main className="flex-grow max-w-container-max mx-auto w-full px-margin-desktop py-12">
        <div className="mb-12">
          <h1 className="font-display-lg text-headline-lg text-primary tracking-tighter mb-4">Đơn Hàng Của Tôi</h1>
          <p className="font-body-lg text-on-surface-variant">Theo dõi trạng thái các đơn hàng bạn đã đặt.</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[40vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="bg-error-container text-on-error-container p-4 rounded-lg font-body-md text-center">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-surface-container-lowest p-16 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm border border-outline-variant/30">
            <span className="material-symbols-outlined text-[64px] text-outline mb-4">shopping_bag</span>
            <h2 className="font-headline-md text-primary mb-2">Bạn chưa có đơn hàng nào</h2>
            <p className="font-body-md text-on-surface-variant mb-8">Hãy khám phá các bộ sưu tập nội thất cao cấp của chúng tôi.</p>
            <Link to="/products" className="bg-primary text-white font-label-lg px-8 py-3 tracking-[0.1em] hover:bg-primary/90 transition-colors shadow-md">
              TIẾP TỤC MUA HÀNG
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-lowest border-b border-outline-variant">
                  <tr>
                    <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">Mã đơn / Ngày</th>
                    <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">Tổng tiền</th>
                    <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">Thanh toán</th>
                    <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">Trạng thái</th>
                    <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {orders.map((order) => {
                    const status = getStatusLabel(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-surface-beige/30 transition-colors">
                        <td className="p-4 align-middle">
                          <p className="font-label-lg text-primary">{order.orderCode || `#${order.id}`}</p>
                          <p className="text-body-sm text-on-surface-variant mt-1">
                            {new Date(order.createdAt).toLocaleDateString('vi-VN')} lúc {new Date(order.createdAt).toLocaleTimeString('vi-VN')}
                          </p>
                        </td>
                        <td className="p-4 align-middle">
                          <p className="font-label-md text-accent-terracotta">{formatPrice(order.totalAmount)}</p>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex flex-col items-start gap-1">
                            <span className="uppercase text-xs font-medium text-on-surface-variant bg-surface-container px-2 py-1 rounded">
                              {order.paymentMethod}
                            </span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-1 border rounded-sm tracking-wider ${getPaymentStatusBadge(order.paymentStatus).color}`}>
                              {getPaymentStatusBadge(order.paymentStatus).text}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <span className={`text-[10px] uppercase font-bold px-2 py-1 border rounded-sm tracking-wider ${status.color}`}>
                            {status.text}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-right flex items-center justify-end gap-2">
                          {order.paymentMethod === 'VNPAY' && order.paymentStatus === 'unpaid' && (
                            <button
                              onClick={() => handlePayAgain(order.id)}
                              disabled={paymentLoading === order.id}
                              className="text-white bg-primary hover:opacity-90 font-label-sm border border-primary px-4 py-2 rounded transition-opacity disabled:opacity-70"
                            >
                              {paymentLoading === order.id ? 'Đang tải...' : 'Thanh toán'}
                            </button>
                          )}
                          <button 
                            onClick={() => handleOpenDetail(order)}
                            className="text-primary hover:text-accent-terracotta font-label-sm border border-outline-variant px-4 py-2 rounded hover:bg-surface-beige transition-colors"
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      <Footer />

      {/* Modal Chi tiết đơn hàng */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[960px] overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest shrink-0">
              <div>
                <h2 className="font-display-sm text-xl text-primary font-semibold">Chi tiết Đơn hàng #{selectedOrder.orderCode || selectedOrder.id}</h2>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-body-sm text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                    {new Date(selectedOrder.createdAt).toLocaleDateString('vi-VN')} {new Date(selectedOrder.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm tracking-wider ${getStatusLabel(selectedOrder.status).color.split(' ').slice(0,2).join(' ')}`}>
                    {getStatusLabel(selectedOrder.status).text}
                  </span>
                </div>
              </div>
              <button onClick={handleCloseDetail} className="text-on-surface-variant hover:text-error transition-colors p-2 hover:bg-error-container rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 overflow-y-auto bg-surface-bright flex-grow">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Timeline + Products */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Vertical Timeline Stepper */}
                  {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm">
                      <h3 className="font-label-md text-primary uppercase tracking-wider mb-5 flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl">history</span> Lịch sử đơn hàng
                      </h3>
                      <div className="relative pl-6 border-l-2 border-outline-variant/40 space-y-6 ml-2">
                        {selectedOrder.statusHistory.map((history, idx) => {
                          const statusConfig = getStatusLabel(history.toStatus);
                          const dotColor = statusConfig.color.split(' ').find(c => c.startsWith('text-'))?.replace('text-', 'bg-') || 'bg-primary';
                          
                          return (
                            <div key={history.id} className="relative">
                              <div className={`absolute -left-[33px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm ${dotColor}`}></div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className={`text-xs font-bold uppercase tracking-wider ${statusConfig.color.split(' ').find(c => c.startsWith('text-'))}`}>
                                    {statusConfig.text}
                                  </span>
                                  <span className="text-xs text-on-surface-variant font-medium">
                                    • {new Date(history.createdAt).toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric'})}
                                  </span>
                                </div>
                                {history.cancelReason && (
                                  <div className="mt-2 bg-error-container/30 border border-error-container p-2.5 rounded text-xs text-error font-medium">
                                    <span className="font-bold">Lý do hủy:</span> {history.cancelReason}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Products List */}
                  <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm">
                    <h3 className="font-label-md text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-xl">inventory_2</span> Sản phẩm đã đặt
                    </h3>
                    <div className="space-y-3">
                      {selectedOrder.orderItems?.map((item) => (
                        <div key={item.id} className="flex justify-between items-center bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30 hover:border-primary/20 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-surface-beige rounded overflow-hidden flex-shrink-0 border border-outline-variant/20">
                              <img src="https://placehold.co/100x100?text=SP" alt={item.productName} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="font-body-md text-primary font-medium">{item.productName}</p>
                              <p className="font-body-sm text-on-surface-variant mt-0.5">Số lượng: {item.quantity} x {formatPrice(item.price)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-label-md text-primary">{formatPrice(item.subtotal)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Right Column: Shipping Info & Total */}
                <div className="space-y-6">
                  
                  {/* Shipping Info */}
                  <div className="bg-white p-5 rounded-xl border border-outline-variant shadow-sm">
                    <h3 className="font-label-md text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-xl">local_shipping</span> Giao hàng
                    </h3>
                    <div className="space-y-4 font-body-sm">
                      <div>
                        <p className="text-on-surface-variant text-xs mb-1 uppercase font-semibold">Người nhận</p>
                        <p className="font-medium text-primary">{selectedOrder.fullName}</p>
                      </div>
                      <div>
                        <p className="text-on-surface-variant text-xs mb-1 uppercase font-semibold">Điện thoại</p>
                        <p className="text-primary font-medium">{selectedOrder.phone}</p>
                      </div>
                      <div>
                        <p className="text-on-surface-variant text-xs mb-1 uppercase font-semibold">Địa chỉ</p>
                        <p className="text-primary leading-relaxed">{selectedOrder.address}</p>
                      </div>
                      {selectedOrder.note && (
                        <div>
                          <p className="text-on-surface-variant text-xs mb-1 uppercase font-semibold">Ghi chú</p>
                          <p className="italic bg-surface-beige/50 p-2.5 rounded border border-outline-variant/20 text-primary">{selectedOrder.note}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment & Total */}
                  <div className="bg-white p-5 rounded-xl border border-primary/20 shadow-sm bg-gradient-to-b from-white to-surface-beige/20">
                    <h3 className="font-label-md text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-xl">payments</span> Thanh toán
                    </h3>
                    <div className="space-y-3 font-body-sm mb-4 border-b border-outline-variant/50 pb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">Phương thức:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-primary uppercase text-[10px] bg-surface-container px-2 py-1 rounded">{selectedOrder.paymentMethod}</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-1 border rounded-sm tracking-wider ${getPaymentStatusBadge(selectedOrder.paymentStatus).color}`}>
                            {getPaymentStatusBadge(selectedOrder.paymentStatus).text}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">Tạm tính:</span>
                        <span className="font-medium text-primary">{formatPrice(selectedOrder.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">Phí giao hàng:</span>
                        <span className="font-medium text-primary">Miễn phí</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="font-label-md text-primary uppercase tracking-wider">Tổng cộng</span>
                      <span className="font-headline-sm text-accent-terracotta text-xl font-bold">{formatPrice(selectedOrder.totalAmount)}</span>
                    </div>
                    {selectedOrder.paymentMethod === 'VNPAY' && selectedOrder.paymentStatus === 'unpaid' && (
                      <button
                        onClick={() => handlePayAgain(selectedOrder.id)}
                        disabled={paymentLoading === selectedOrder.id}
                        className="w-full mt-4 bg-primary text-white py-3 rounded font-label-md tracking-wider uppercase hover:opacity-90 transition-opacity shadow-sm disabled:opacity-70"
                      >
                        {paymentLoading === selectedOrder.id ? 'Đang xử lý...' : 'Tiếp tục thanh toán'}
                      </button>
                    )}
                  </div>

                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-outline-variant flex justify-end bg-surface-container-lowest shrink-0">
              <button onClick={handleCloseDetail} className="px-6 py-2 bg-outline-variant/20 text-primary hover:bg-outline-variant/40 rounded transition-colors font-label-md tracking-wider">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
