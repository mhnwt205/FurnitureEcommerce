import React, { useState, useEffect } from 'react';
import { orderService } from '../services/api/orderService';
import AdminLayout from '../layouts/AdminLayout';
import AdminTable from '../components/admin/AdminTable';
import { getStaticFileUrl } from '../utils/imageUtils';
import { formatPrice } from '../utils/formatters';
import { ADMIN_ORDER_STATUS_CLASSES as statusColors, ADMIN_ORDER_STATUS_LABELS as statusLabels, getAdminPaymentStatusBadge as getPaymentStatusBadge } from '../utils/statusMaps';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const searchParams = new URLSearchParams(window.location.search);
  const initialCustomerId = searchParams.get('customerId') || '';

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerId] = useState(initialCustomerId);

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
useEffect(() => {
    fetchOrders();
  }, [page, limit, search, statusFilter, customerId]);

  const fetchOrders = async () => {
    try {
      const data = await orderService.getAdminOrders({
        page,
        limit,
        search,
        status: statusFilter,
        customerId
      });
      if (data && data.pagination) {
        setOrders(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      } else {
        setOrders(Array.isArray(data) ? data : []);
        setTotalItems(Array.isArray(data) ? data.length : 0);
      }
    } catch (err) {
      setError(err.message || 'Lỗi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus, note = '', cancelReason = null) => {
    try {
      await orderService.updateOrderStatus(orderId, { status: newStatus, note, cancelReason });
      
      // Update list
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      // Update modal if open
      if (selectedOrder && selectedOrder.id === orderId) {
        // Fetch fresh detail to get new history
        const freshDetail = await orderService.getAdminOrderById(orderId);
        setSelectedOrder(freshDetail);
      }
    } catch (err) {
      alert(err.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const handleOpenDetail = async (order) => {
    try {
      setLoading(true);
      const detail = await orderService.getAdminOrderById(order.id);
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

  const stats = {
    total: totalItems,
    pending: orders.filter(o => o.status === 'pending').length,
    shipping: orders.filter(o => o.status === 'shipping').length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex-grow flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8 max-w-[1400px] mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-display-lg text-4xl text-primary tracking-tight mb-2">Quản lý Đơn hàng</h1>
            <p className="text-on-surface-variant font-body-sm">Theo dõi và cập nhật trạng thái đơn đặt hàng.</p>
          </div>
          <button onClick={fetchOrders} className="flex items-center gap-2 border border-outline-variant text-primary px-5 py-2.5 rounded shadow-sm hover:bg-surface-beige transition-colors font-label-md tracking-wider uppercase">
            <span className="material-symbols-outlined text-sm">refresh</span>
            Làm mới
          </button>
        </div>

      {/* Cards thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] hover:-translate-y-1 transition-transform duration-300 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-primary/5 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">receipt_long</span>
          </div>
          <div>
            <p className="text-on-surface-variant text-xs font-label-lg uppercase tracking-wider mb-1">Tổng đơn</p>
            <p className="font-headline-md text-3xl text-primary">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] hover:-translate-y-1 transition-transform duration-300 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">pending_actions</span>
          </div>
          <div>
            <p className="text-on-surface-variant text-xs font-label-lg uppercase tracking-wider mb-1">Chờ xác nhận</p>
            <p className="font-headline-md text-3xl text-yellow-700">{stats.pending}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] hover:-translate-y-1 transition-transform duration-300 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">local_shipping</span>
          </div>
          <div>
            <p className="text-on-surface-variant text-xs font-label-lg uppercase tracking-wider mb-1">Đang giao</p>
            <p className="font-headline-md text-3xl text-sky-700">{stats.shipping}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] hover:-translate-y-1 transition-transform duration-300 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">check_circle</span>
          </div>
          <div>
            <p className="text-on-surface-variant text-xs font-label-lg uppercase tracking-wider mb-1">Hoàn thành</p>
            <p className="font-headline-md text-3xl text-green-700">{stats.completed}</p>
          </div>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Tìm theo mã đơn, email, SĐT..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border border-outline-variant/50 rounded-lg px-4 py-2 w-full md:w-1/3 outline-none focus:border-primary font-body-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-outline-variant/50 rounded-lg px-4 py-2 outline-none focus:border-primary font-body-sm"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chờ xác nhận</option>
          <option value="confirmed">Đã xác nhận</option>
          <option value="preparing">Đang chuẩn bị</option>
          <option value="shipping">Đang giao</option>
          <option value="delivered">Đã giao</option>
          <option value="completed">Hoàn thành</option>
          <option value="cancelled">Đã hủy</option>
        </select>
        <select
          value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          className="border border-outline-variant/50 rounded-lg px-4 py-2 outline-none focus:border-primary font-body-sm"
        >
          <option value={10}>10 dòng / trang</option>
          <option value={20}>20 dòng / trang</option>
          <option value={50}>50 dòng / trang</option>
        </select>
      </div>

      {error ? (
        <div className="bg-error-container text-on-error-container p-6 rounded-2xl">{error}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl shadow-[0_4px_24px_rgba(93,64,55,0.05)] border-none">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">inbox</span>
          <p className="text-on-surface-variant font-label-lg">Chưa có đơn hàng nào.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] overflow-hidden flex flex-col">
          <AdminTable containerClassName="overflow-x-auto p-2" className="w-full text-left font-body-sm">
              <thead className="bg-surface-ivory border-b border-surface-beige text-xs font-label-lg uppercase tracking-wider">
                <tr>
                  <th className="p-5 font-semibold text-on-surface-variant">Mã đơn / Ngày</th>
                  <th className="p-5 font-semibold text-on-surface-variant">Khách hàng</th>
                  <th className="p-5 font-semibold text-on-surface-variant">Tổng tiền</th>
                  <th className="p-5 font-semibold text-on-surface-variant text-center">Payment Status</th>
                  <th className="p-5 font-semibold text-on-surface-variant text-center">Trạng thái</th>
                  <th className="p-5 font-semibold text-on-surface-variant text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-beige">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-surface-beige/30 transition-colors">
                    <td className="p-5 align-top">
                      <p className="font-label-lg text-primary text-[15px]">{order.orderCode || order.id}</p>
                      <p className="text-body-sm text-on-surface-variant mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        {new Date(order.createdAt).toLocaleDateString('vi-VN')} {new Date(order.createdAt).toLocaleTimeString('vi-VN')}
                      </p>
                    </td>
                    <td className="p-5 align-top max-w-[250px]">
                      <p className="font-label-md text-primary text-[15px]">{order.fullName}</p>
                      <p className="text-body-sm text-on-surface-variant truncate mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">call</span>
                        {order.phone}
                      </p>
                    </td>
                    <td className="p-5 align-top">
                      <p className="font-headline-sm text-[16px] text-accent-terracotta">{formatPrice(order.totalAmount)}</p>
                      <span className="inline-block mt-1 bg-surface-container/50 border border-outline-variant/30 text-on-surface-variant text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td className="p-5 align-top text-center">
                      <span className={`inline-block border text-[10px] px-2 py-1 rounded-sm font-bold uppercase tracking-wider ${getPaymentStatusBadge(order.paymentStatus).color}`}>
                        {getPaymentStatusBadge(order.paymentStatus).text}
                      </span>
                    </td>
                    <td className="p-5 align-top text-center">
                      <select 
                        value={order.status}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          if (newStatus === 'cancelled') {
                            const reason = prompt('Vui lòng nhập lý do hủy đơn hàng:');
                            if (reason) {
                              handleStatusChange(order.id, newStatus, '', reason);
                            }
                          } else {
                            const note = prompt('Nhập ghi chú nội bộ (không bắt buộc):') || '';
                            handleStatusChange(order.id, newStatus, note, null);
                          }
                        }}
                        disabled={order.status === 'completed' || order.status === 'cancelled'}
                        className={`text-[11px] font-bold tracking-wider uppercase rounded-full px-4 py-2 outline-none cursor-pointer border border-transparent hover:border-outline-variant/30 focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}
                      >
                        <option value="pending">Chờ xác nhận</option>
                        <option value="confirmed">Đã xác nhận</option>
                        <option value="preparing">Đang chuẩn bị</option>
                        <option value="shipping">Đang giao</option>
                        <option value="delivered">Đã giao</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="cancelled">Đã hủy</option>
                      </select>
                    </td>
                    <td className="p-5 align-top text-right">
                      <button 
                        onClick={() => handleOpenDetail(order)}
                        className="text-primary hover:text-accent-terracotta hover:bg-surface-beige font-label-md tracking-wider uppercase border border-outline-variant/50 px-4 py-2 rounded-lg transition-colors"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
          </AdminTable>
          {/* Phân trang */}
          <div className="p-4 border-t border-surface-beige flex flex-col md:flex-row justify-between items-center bg-surface-ivory gap-4">
            <div className="text-on-surface-variant font-body-sm">
              Hiển thị <span className="font-bold text-primary">{orders.length}</span> trên tổng số <span className="font-bold text-primary">{totalItems}</span> đơn hàng
            </div>
            <div className="flex gap-2 items-center">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page <= 1}
                className="px-3 py-1.5 border border-outline-variant/50 rounded hover:bg-surface-beige disabled:opacity-40 disabled:hover:bg-transparent text-primary font-label-md transition-colors"
              >
                Trước
              </button>
              <span className="font-label-md text-primary mx-2" aria-current="page">Trang {page} / {totalPages || 1}</span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page >= totalPages}
                className="px-3 py-1.5 border border-outline-variant/50 rounded hover:bg-surface-beige disabled:opacity-40 disabled:hover:bg-transparent text-primary font-label-md transition-colors"
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chi tiết đơn hàng */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1000px] overflow-hidden flex flex-col max-h-[90vh]" role="dialog" aria-modal="true" aria-label="Chi tiết đơn hàng">
            
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-surface-beige flex justify-between items-start md:items-center bg-white shrink-0">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <h2 className="font-display-sm text-2xl text-primary font-semibold">Đơn hàng #{selectedOrder.orderCode || selectedOrder.id}</h2>
                <div className="hidden md:block w-px h-6 bg-surface-beige"></div>
                <div className="flex items-center gap-3">
                  <span className="text-body-sm text-on-surface-variant flex items-center gap-1.5 font-medium bg-surface-bright px-3 py-1 rounded-lg border border-surface-beige">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                    {new Date(selectedOrder.createdAt).toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric'})}
                  </span>
                  <span className={`text-[11px] uppercase font-bold px-3 py-1.5 rounded-full tracking-wider ${statusColors[selectedOrder.status]?.split(' ').slice(0,2).join(' ')}`}>
                    {statusLabels[selectedOrder.status]}
                  </span>
                </div>
              </div>
              <button onClick={handleCloseDetail} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container transition-colors shrink-0" aria-label="Đóng chi tiết đơn hàng">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 md:p-8 overflow-y-auto bg-surface-bright flex-grow">
              <div className="flex flex-col gap-8">
                
                {/* SECTION 1: History & Status Update */}
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-start">
                  
                  {/* Left: Timeline */}
                  {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 ? (
                    <div className="bg-white p-6 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] h-full">
                      <h3 className="font-label-lg text-primary uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-surface-beige pb-4">
                        <span className="material-symbols-outlined text-xl">history</span> Lịch sử đơn hàng
                      </h3>
                      <div className="relative pl-6 border-l-2 border-outline-variant/40 space-y-6 ml-2">
                        {selectedOrder.statusHistory.map((history, idx) => {
                          const statusColorClass = statusColors[history.toStatus] || 'text-gray-600 bg-gray-100';
                          const dotColor = statusColorClass.split(' ').find(c => c.startsWith('text-'))?.replace('text-', 'bg-') || 'bg-primary';
                          const textColor = statusColorClass.split(' ').find(c => c.startsWith('text-'));
                          
                          return (
                            <div key={history.id} className="relative">
                              <div className={`absolute -left-[33px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm ${dotColor}`}></div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className={`text-xs font-bold uppercase tracking-wider ${textColor}`}>
                                    {statusLabels[history.toStatus]}
                                  </span>
                                  <span className="text-xs text-on-surface-variant font-medium">
                                    • {new Date(history.createdAt).toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric'})}
                                  </span>
                                </div>
                                <div className="text-xs text-on-surface-variant font-medium mb-2">
                                  Thực hiện bởi: <span className="text-primary">{history.changedByName || 'Hệ thống'}</span>
                                </div>
                                
                                {history.cancelReason && (
                                  <div className="bg-error-container/30 border border-error-container p-2.5 rounded text-xs text-error font-medium mb-2">
                                    <span className="font-bold">Lý do hủy:</span> {history.cancelReason}
                                  </div>
                                )}
                                
                                {history.note && (
                                  <div className="bg-surface-beige/50 border border-outline-variant/30 p-2.5 rounded text-xs text-primary font-medium italic">
                                    <span className="font-bold">Ghi chú nội bộ:</span> {history.note}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div></div>
                  )}

                  {/* Right: Status Update Form */}
                  <div className="bg-white p-6 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] bg-gradient-to-b from-surface-beige/20 to-white h-full">
                    <h3 className="font-label-lg text-primary uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-surface-beige pb-4">
                      <span className="material-symbols-outlined text-xl">update</span> Cập nhật trạng thái
                    </h3>
                    <div className="space-y-5">
                      <div>
                        <label htmlFor="admin-order-status" className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">Trạng thái hiện tại</label>
                        <select 
                          id="admin-order-status"
                          value={selectedOrder.status}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            if (newStatus === 'cancelled') {
                              const reason = prompt('Vui lòng nhập lý do hủy đơn hàng:');
                              if (reason) {
                                handleStatusChange(selectedOrder.id, newStatus, '', reason);
                              }
                            } else {
                              const note = prompt('Nhập ghi chú nội bộ (không bắt buộc):') || '';
                              handleStatusChange(selectedOrder.id, newStatus, note, null);
                            }
                          }}
                          disabled={selectedOrder.status === 'completed' || selectedOrder.status === 'cancelled'}
                          className={`w-full text-sm font-bold tracking-wider uppercase rounded-xl px-4 py-3 outline-none cursor-pointer border border-outline-variant/50 focus:border-accent-gold focus:ring-1 focus:ring-accent-gold disabled:opacity-70 disabled:cursor-not-allowed ${statusColors[selectedOrder.status]?.split(' ').slice(0,2).join(' ')}`}
                        >
                          <option value="pending">Chờ xác nhận</option>
                          <option value="confirmed">Đã xác nhận</option>
                          <option value="preparing">Đang chuẩn bị hàng</option>
                          <option value="shipping">Đang giao</option>
                          <option value="delivered">Đã giao hàng</option>
                          <option value="completed">Hoàn thành</option>
                          <option value="cancelled">Đã hủy</option>
                        </select>
                      </div>
                      {['completed', 'cancelled'].includes(selectedOrder.status) && (
                        <p className="text-xs text-error font-medium italic mt-2">Đơn hàng đã chốt, không thể thay đổi trạng thái.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Products List (Full Width) */}
                <div className="bg-white rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] overflow-hidden">
                  <div className="p-6 border-b border-surface-beige">
                    <h3 className="font-label-lg text-primary uppercase tracking-widest flex items-center gap-2">
                      <span className="material-symbols-outlined text-xl">inventory_2</span> Sản phẩm đã đặt
                    </h3>
                  </div>
                  <div className="p-0">
                    <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-surface-ivory border-b border-surface-beige text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                      <div className="col-span-6">Sản phẩm</div>
                      <div className="col-span-2 text-center">Đơn giá</div>
                      <div className="col-span-2 text-center">Số lượng</div>
                      <div className="col-span-2 text-right">Thành tiền</div>
                    </div>
                    <div className="divide-y divide-surface-beige">
                      {selectedOrder.orderItems?.map((item) => {
                        const imageUrl = getStaticFileUrl(item.product?.imageUrl) 
                                         || getStaticFileUrl(item.product?.images?.find(img => img.isPrimary)?.imageUrl)
                                         || getStaticFileUrl(item.product?.images?.[0]?.imageUrl)
                                         || 'https://placehold.co/80x80?text=SP';
                        return (
                          <div key={item.id} className="p-4 flex flex-col md:grid md:grid-cols-12 gap-4 items-center hover:bg-surface-bright transition-colors">
                            <div className="col-span-6 flex items-center gap-4 w-full">
                              <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-outline-variant/20 shadow-sm">
                                <img src={imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1">
                                <p className="font-label-lg text-[15px] text-primary line-clamp-2">{item.productName}</p>
                                <p className="text-xs text-on-surface-variant mt-1">SKU: SP-{item.productId}</p>
                              </div>
                            </div>
                            <div className="col-span-2 w-full md:w-auto flex justify-between md:block text-center">
                              <span className="md:hidden text-xs text-on-surface-variant uppercase tracking-wider font-bold">Đơn giá:</span>
                              <span className="font-medium text-primary">{formatPrice(item.finalPrice ?? item.price)}</span>
                            </div>
                            <div className="col-span-2 w-full md:w-auto flex justify-between md:block text-center">
                              <span className="md:hidden text-xs text-on-surface-variant uppercase tracking-wider font-bold">Số lượng:</span>
                              <span className="font-bold text-primary px-3 py-1 bg-surface-beige rounded-lg inline-block">{item.quantity}</span>
                            </div>
                            <div className="col-span-2 w-full md:w-auto flex justify-between md:block text-right">
                              <span className="md:hidden text-xs text-on-surface-variant uppercase tracking-wider font-bold">Thành tiền:</span>
                              <span className="font-bold text-[15px] text-accent-terracotta">{formatPrice(item.subtotal)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Shipping & Payment */}
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-start">
                  
                  {/* Left: Shipping Info */}
                  <div className="bg-white p-6 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] h-full">
                    <h3 className="font-label-lg text-primary uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-surface-beige pb-4">
                      <span className="material-symbols-outlined text-xl">local_shipping</span> Giao hàng
                    </h3>
                    <div className="space-y-5 font-body-sm">
                      <div>
                        <p className="text-on-surface-variant text-[11px] mb-1 uppercase font-bold tracking-wider">Người nhận</p>
                        <p className="font-label-lg text-[15px] text-primary">{selectedOrder.fullName}</p>
                      </div>
                      <div>
                        <p className="text-on-surface-variant text-[11px] mb-1 uppercase font-bold tracking-wider">Điện thoại</p>
                        <p className="text-primary font-medium">{selectedOrder.phone}</p>
                      </div>
                      <div>
                        <p className="text-on-surface-variant text-[11px] mb-1 uppercase font-bold tracking-wider">Địa chỉ</p>
                        <p className="text-primary leading-relaxed font-medium">{selectedOrder.address}</p>
                      </div>
                      {selectedOrder.note && (
                        <div>
                          <p className="text-on-surface-variant text-[11px] mb-2 uppercase font-bold tracking-wider">Ghi chú của khách</p>
                          <p className="italic bg-surface-ivory p-3 rounded-lg border border-surface-beige text-primary break-words">{selectedOrder.note}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Payment & Total */}
                  <div className="bg-white p-6 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] bg-gradient-to-b from-white to-surface-ivory h-full">
                    <h3 className="font-label-lg text-primary uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-surface-beige pb-4">
                      <span className="material-symbols-outlined text-xl">payments</span> Thanh toán
                    </h3>
                    <div className="space-y-4 font-body-sm mb-6 border-b border-outline-variant/30 pb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant font-medium">Phương thức:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary uppercase tracking-wider text-[10px] bg-surface-beige px-3 py-1.5 rounded-full">{selectedOrder.paymentMethod}</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-1 border rounded-sm tracking-wider ${getPaymentStatusBadge(selectedOrder.paymentStatus).color}`}>
                            {getPaymentStatusBadge(selectedOrder.paymentStatus).text}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant font-medium">Tạm tính:</span>
                        <span className="font-semibold text-primary">{formatPrice(selectedOrder.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant font-medium">Phí giao hàng:</span>
                        <span className="font-semibold text-primary">Miễn phí</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="font-label-lg text-primary uppercase tracking-wider">Tổng cộng</span>
                      <span className="font-headline-sm text-accent-terracotta text-2xl">{formatPrice(selectedOrder.totalAmount)}</span>
                    </div>
                  </div>

                </div>

              </div>
            </div>
            
            <div className="p-6 border-t border-surface-beige flex justify-end bg-white shrink-0">
              <button onClick={handleCloseDetail} className="px-8 py-3 border border-outline-variant rounded-lg text-primary hover:bg-surface-beige transition-colors font-label-md tracking-wider uppercase">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
