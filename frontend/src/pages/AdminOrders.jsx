import React, { useEffect, useMemo, useState } from 'react';
import { orderService } from '../services/api/orderService';
import AdminLayout from '../layouts/AdminLayout';
import AdminTable from '../components/admin/AdminTable';
import RefundStatusWorkflow from '../components/admin/RefundStatusWorkflow';
import OrderStatusWorkflow from '../components/admin/OrderStatusWorkflow';
import { getStaticFileUrl } from '../utils/imageUtils';
import { formatPrice } from '../utils/formatters';
import {
  ADMIN_ORDER_STATUS_LABELS as statusLabels,
  getAdminPaymentStatusBadge as getPaymentStatusBadge
} from '../utils/statusMaps';
import { CANCELLATION_ACTOR_LABELS, CANCELLATION_REASON_LABELS } from '../utils/cancellationReasons';


const REFUND_STATUS_LABELS = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  succeeded: 'Thành công',
  failed: 'Thất bại',
  unknown: 'Chưa xác định'
};

const REFUND_STATUS_CLASSES = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  processing: 'border-sky-200 bg-sky-50 text-sky-800',
  succeeded: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  failed: 'border-red-200 bg-red-50 text-red-800',
  unknown: 'border-gray-200 bg-gray-50 text-gray-800'
};

const terminalStatuses = new Set(['completed', 'cancelled']);
const getCustomerTypeLabel = (order) => (order?.customerType === 'guest' || !order?.userId ? 'Guest' : 'Tài khoản');
const getStatusLabel = (status) => statusLabels[status] || status || '-';

function CustomerBlock({ order }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <p className="min-w-0 truncate font-label-md text-[15px] text-primary">{order.fullName || '-'}</p>
      <span className="shrink-0 rounded-full border border-outline-variant/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
        {getCustomerTypeLabel(order)}
      </span>
    </div>
  );
}

function RefundRequiredNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
      Đơn hàng VNPay đã thanh toán. Nếu khách muốn hủy, cần xử lý hoàn tiền thủ công.
    </div>
  );
}

function CancellationPanel({ cancellation }) {
  if (!cancellation) return null;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p className="font-bold uppercase tracking-wider">Thông tin hủy đơn</p>
      <p className="mt-2">Thời gian: {cancellation.cancelledAt ? new Date(cancellation.cancelledAt).toLocaleString('vi-VN') : '-'}</p>
      <p>Người hủy: {CANCELLATION_ACTOR_LABELS[cancellation.cancelledBy] || cancellation.cancelledBy || '-'}</p>
      <p>Lý do: {CANCELLATION_REASON_LABELS[cancellation.reasonCode] || cancellation.reasonCode || '-'}</p>
      {cancellation.reasonText && <p>Ghi chú: {cancellation.reasonText}</p>}
      <p>Hoàn tồn kho: {cancellation.inventoryRestored ? 'Đã hoàn' : 'Chưa ghi nhận'}</p>
    </div>
  );
}

export default function AdminOrders() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialCustomerId = searchParams.get('customerId') || '';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerId] = useState(initialCustomerId);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [refunds, setRefunds] = useState([]);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState(null);
  const [refundActionId, setRefundActionId] = useState(null);

  const fetchRefunds = async () => {
    try {
      setRefundLoading(true);
      const data = await orderService.getAdminRefunds({ status: 'all' });
      setRefunds(Array.isArray(data?.data) ? data.data : []);
      setRefundError(null);
    } catch (err) {
      setRefundError(err.message || 'Lỗi tải danh sách hoàn tiền');
    } finally {
      setRefundLoading(false);
    }
  };

  const refreshAdminData = async () => {
    await Promise.all([fetchOrders(), fetchRefunds()]);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getAdminOrders({ page, limit, search, status: statusFilter, customerId });
      if (data?.pagination) {
        setOrders(Array.isArray(data.data) ? data.data : []);
        setTotalPages(data.pagination.totalPages || 1);
        setTotalItems(data.pagination.total || 0);
      } else {
        const list = Array.isArray(data) ? data : [];
        setOrders(list);
        setTotalItems(list.length);
        setTotalPages(1);
      }
      setError(null);
    } catch (err) {
      setError(err.message || 'Lỗi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, limit, search, statusFilter, customerId]);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const stats = useMemo(() => ({
    total: totalItems,
    pending: orders.filter((order) => order.status === 'pending').length,
    shipping: orders.filter((order) => order.status === 'shipping').length,
    completed: orders.filter((order) => order.status === 'completed').length
  }), [orders, totalItems]);

  const handleStatusChange = async (orderId, newStatus, note = '') => {
    try {
      setStatusUpdatingId(orderId);
      await orderService.updateOrderStatus(orderId, { status: newStatus, note });
      await fetchOrders();
      if (selectedOrder?.id === orderId) {
        const freshDetail = await orderService.getAdminOrderById(orderId);
        setSelectedOrder(freshDetail);
      }
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: 'Đã cập nhật trạng thái đơn hàng.', type: 'success' }
      }));
    } catch (err) {
      window.alert(err.message || 'Lỗi khi cập nhật trạng thái');
      await fetchOrders();
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const refreshSelectedOrder = async (orderId) => {
    if (selectedOrder?.id === orderId) {
      const freshDetail = await orderService.getAdminOrderById(orderId);
      setSelectedOrder(freshDetail);
    }
  };

  const handleRefundStatusUpdate = async (refund, nextStatus, form) => {
    try {
      setRefundActionId(refund.requestId);
      if (nextStatus === 'processing') {
        await orderService.startAdminRefundProcessing(refund.requestId, { adminNote: form.adminNote });
      } else {
        await orderService.resolveAdminRefund(refund.requestId, {
          result: nextStatus,
          providerTransactionId: form.providerTransactionId,
          providerResponseCode: form.providerResponseCode,
          adminNote: form.adminNote
        });
      }
      await refreshAdminData();
      if (refund.order?.id) await refreshSelectedOrder(refund.order.id);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: 'Đã cập nhật trạng thái hoàn tiền.', type: 'success' }
      }));
    } catch (err) {
      setRefundError(err.message || 'Lỗi khi cập nhật trạng thái hoàn tiền');
      await fetchRefunds();
      if (refund.order?.id) await refreshSelectedOrder(refund.order.id);
    } finally {
      setRefundActionId(null);
    }
  };

  const handleOpenDetail = async (order) => {
    try {
      setDetailLoading(true);
      const detail = await orderService.getAdminOrderById(order.id);
      setSelectedOrder(detail);
      setIsModalOpen(true);
    } catch (err) {
      window.alert(err.message || 'Lỗi tải chi tiết đơn hàng');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedOrder(null);
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[60vh] flex-grow items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-[1400px] space-y-8 p-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display-lg mb-2 text-4xl tracking-tight text-primary">Quản lý đơn hàng</h1>
            <p className="font-body-sm text-on-surface-variant">Theo dõi và cập nhật trạng thái đơn đặt hàng.</p>
          </div>
          <button onClick={refreshAdminData} className="flex items-center gap-2 rounded border border-outline-variant px-5 py-2.5 font-label-md uppercase tracking-wider text-primary transition-colors hover:bg-surface-beige">
            <span className="material-symbols-outlined text-sm">refresh</span>
            Làm mới
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Tổng đơn', value: stats.total, icon: 'receipt_long', color: 'text-primary bg-primary/5' },
            { label: 'Chờ xác nhận', value: stats.pending, icon: 'pending_actions', color: 'text-yellow-600 bg-yellow-50' },
            { label: 'Đang giao hàng', value: stats.shipping, icon: 'local_shipping', color: 'text-sky-600 bg-sky-50' },
            { label: 'Hoàn thành', value: stats.completed, icon: 'check_circle', color: 'text-green-600 bg-green-50' }
          ].map((card) => (
            <div key={card.label} className="flex items-center gap-5 rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${card.color}`}>
                <span className="material-symbols-outlined text-2xl">{card.icon}</span>
              </div>
              <div>
                <p className="mb-1 text-xs font-label-lg uppercase tracking-wider text-on-surface-variant">{card.label}</p>
                <p className="font-headline-md text-3xl text-primary">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-label-lg uppercase tracking-widest text-primary">Yêu cầu hoàn tiền VNPay</h2>
              <p className="mt-1 text-sm text-on-surface-variant">Admin thực hiện hoàn tiền thủ công trên VNPay Merchant, sau đó ghi nhận kết quả tại đây.</p>
            </div>
            <button onClick={fetchRefunds} disabled={refundLoading} className="inline-flex h-10 items-center justify-center rounded-commerce-control border border-outline-variant px-3.5 text-xs font-bold text-primary transition-colors hover:bg-surface-beige disabled:opacity-60">Làm mới hoàn tiền</button>
          </div>

          {refundError ? (
            <div className="rounded-xl bg-error-container p-4 text-sm text-on-error-container">{refundError}</div>
          ) : refundLoading ? (
            <div className="py-8 text-center text-sm font-semibold text-on-surface-variant">Đang tải yêu cầu hoàn tiền...</div>
          ) : refunds.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant/50 p-6 text-center text-sm text-on-surface-variant">Chưa có yêu cầu hoàn tiền VNPay.</div>
          ) : (
            <div className="grid gap-3">
              {refunds.map((refund) => (
                <article key={refund.requestId} className="rounded-xl border border-surface-beige/90 bg-white px-4 py-3 shadow-[0_3px_14px_rgba(93,64,55,0.035)] transition-colors hover:bg-surface-beige/15">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(230px,0.85fr)] lg:items-start">
                    <div className="min-w-0 space-y-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Request</p>
                        <p title={refund.requestId} className="mt-1 truncate font-mono text-[12px] font-bold leading-5 text-primary">{refund.requestId}</p>
                        <p className="mt-1 text-xs text-on-surface-variant">{new Date(refund.requestedAt).toLocaleString('vi-VN')}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{'\u0110\u01a1n h\u00e0ng'}</p>
                        <p title={refund.order?.orderCode || '-'} className="mt-1 truncate font-mono text-[12px] font-semibold leading-5 text-primary">{refund.order?.orderCode || '-'}</p>
                        <p className="text-xs text-on-surface-variant">{refund.order?.status || '-'} / {refund.order?.paymentStatus || '-'}</p>
                      </div>
                    </div>

                    <div className="min-w-0 space-y-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{'Kh\u00e1ch h\u00e0ng'}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-outline-variant/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{refund.order?.customerType === 'guest' ? 'Guest' : 'T\u00e0i kho\u1ea3n'}</span>
                        </div>
                        <p title={refund.order?.customerEmail || '-'} className="mt-1 truncate text-xs text-on-surface-variant">{refund.order?.customerEmail || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{'S\u1ed1 ti\u1ec1n'}</p>
                        <p className="mt-1 whitespace-nowrap text-base font-bold text-accent-terracotta">{formatPrice(refund.amount)}</p>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{'L\u00fd do'}</p>
                      <p title={CANCELLATION_REASON_LABELS[refund.reasonCode] || refund.reasonCode} className="mt-1 line-clamp-2 font-semibold text-primary">{CANCELLATION_REASON_LABELS[refund.reasonCode] || refund.reasonCode}</p>
                      {refund.reasonText && <p title={refund.reasonText} className="mt-1 line-clamp-3 text-xs leading-5 text-on-surface-variant">{refund.reasonText}</p>}
                      {refund.providerTransactionId && <p title={refund.providerTransactionId} className="mt-2 truncate text-xs text-on-surface-variant">Ref: {refund.providerTransactionId}</p>}
                    </div>

                    <div className="min-w-0 space-y-2 lg:border-l lg:border-surface-beige/70 lg:pl-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex whitespace-nowrap rounded-commerce-control border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${REFUND_STATUS_CLASSES[refund.status] || REFUND_STATUS_CLASSES.unknown}`}>
                          {REFUND_STATUS_LABELS[refund.status] || refund.status}
                        </span>
                        <span className="text-[11px] font-medium text-on-surface-variant">{'X\u1eed l\u00fd th\u1ee7 c\u00f4ng tr\u00ean VNPay Merchant'}</span>
                      </div>
                      <RefundStatusWorkflow
                        refund={refund}
                        loading={refundActionId === refund.requestId}
                        onUpdate={handleRefundStatusUpdate}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-3 rounded-xl border border-surface-beige bg-white p-3 shadow-[0_3px_14px_rgba(93,64,55,0.035)] md:flex-row md:items-center">
          <input
            type="text"
            placeholder="Tìm theo mã đơn, email, SĐT..."
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            className="h-10 w-full flex-1 rounded-commerce-control border border-outline-variant/50 px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10 md:min-w-[260px]"
          />
          <select
            value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
            className="h-10 rounded-commerce-control border border-outline-variant/50 bg-white px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="preparing">Đang chuẩn bị</option>
            <option value="shipping">Đang giao hàng</option>
            <option value="delivered">Đã giao hàng</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <select
            value={limit}
            onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}
            className="h-10 rounded-commerce-control border border-outline-variant/50 bg-white px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            <option value={10}>10 dòng / trang</option>
            <option value={20}>20 dòng / trang</option>
            <option value={50}>50 dòng / trang</option>
          </select>
        </div>

        {error ? (
          <div className="rounded-2xl bg-error-container p-6 text-on-error-container">{error}</div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl bg-white py-24 text-center shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
            <span className="material-symbols-outlined mb-4 text-5xl text-outline-variant">inbox</span>
            <p className="font-label-lg text-on-surface-variant">Chưa có đơn hàng nào.</p>
          </div>
        ) : (
          <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
            <AdminTable containerClassName="overflow-x-auto" className="w-full min-w-[1080px] table-fixed text-left font-body-sm">
              <colgroup>
                <col className="w-[17%]" />
                <col className="w-[21%]" />
                <col className="w-[13%]" />
                <col className="w-[12%]" />
                <col className="w-[28%]" />
                <col className="w-[9%]" />
              </colgroup>
              <thead className="border-b border-surface-beige bg-surface-ivory text-xs font-label-lg uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-semibold text-on-surface-variant">Mã đơn / Ngày</th>
                  <th className="px-4 py-3 font-semibold text-on-surface-variant">Khách hàng</th>
                  <th className="px-4 py-3 font-semibold text-on-surface-variant">Tổng tiền</th>
                  <th className="px-4 py-3 text-center font-semibold text-on-surface-variant">Thanh toán</th>
                  <th className="px-4 py-3 text-center font-semibold text-on-surface-variant">Trạng thái</th>
                  <th className="px-4 py-3 text-center font-semibold text-on-surface-variant">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-beige">
                {orders.map((order) => {
                  const payment = getPaymentStatusBadge(order.paymentStatus);
                  return (
                    <tr key={order.id} className="transition-colors hover:bg-surface-beige/30">
                      <td className="px-4 py-3 align-middle">
                        <p className="text-[15px] font-label-lg text-primary">{order.orderCode || order.id}</p>
                        <p className="mt-1.5 flex items-center gap-1 text-body-sm text-on-surface-variant">
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                          {new Date(order.createdAt).toLocaleString('vi-VN')}
                        </p>
                      </td>
                      <td className="max-w-[260px] px-4 py-3 align-middle"><CustomerBlock order={order} /></td>
                      <td className="px-4 py-3 align-middle">
                        <p className="font-headline-sm text-[16px] text-accent-terracotta">{formatPrice(order.totalAmount)}</p>
                        <span className="mt-1 inline-block rounded-sm border border-outline-variant/30 bg-surface-container/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                          {order.paymentMethod}
                        </span>
                        {order.refundPending && <p className="mt-1 truncate text-xs font-semibold text-amber-700">Đang xử lý hoàn tiền{order.refundRequestId ? `: ${order.refundRequestId}` : ''}</p>}
                        {order.requiresRefund && !order.refundPending && <p className="mt-1 truncate text-xs font-semibold text-amber-700">Cần hoàn tiền</p>}
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <span className={`inline-block rounded-sm border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${payment.color}`}>{payment.text}</span>
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <OrderStatusWorkflow
                          className="mx-auto"
                          order={order}
                          loading={statusUpdatingId === order.id}
                          onUpdate={(nextStatus, note) => handleStatusChange(order.id, nextStatus, note)}
                        />
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <button onClick={() => handleOpenDetail(order)} disabled={detailLoading} className="inline-flex h-9 w-[76px] items-center justify-center whitespace-nowrap rounded-commerce-control border border-outline-variant/50 px-3 text-xs font-bold text-primary transition-colors hover:bg-surface-beige hover:text-accent-terracotta disabled:opacity-60">
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </AdminTable>
            <div className="flex flex-col items-center justify-between gap-4 border-t border-surface-beige bg-surface-ivory p-4 md:flex-row">
              <div className="font-body-sm text-on-surface-variant">Hiển thị <span className="font-bold text-primary">{orders.length}</span> trên tổng số <span className="font-bold text-primary">{totalItems}</span> đơn hàng</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded border border-outline-variant/50 px-3 py-1.5 font-label-md text-primary transition-colors hover:bg-surface-beige disabled:opacity-40">Trước</button>
                <span className="mx-2 font-label-md text-primary" aria-current="page">Trang {page} / {totalPages || 1}</span>
                <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="rounded border border-outline-variant/50 px-3 py-1.5 font-label-md text-primary transition-colors hover:bg-surface-beige disabled:opacity-40">Sau</button>
              </div>
            </div>
          </div>
        )}

        {isModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-[1000px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Chi tiết đơn hàng">
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-surface-beige bg-white p-6 md:p-8">
                <div>
                  <h2 className="font-display-sm text-2xl font-semibold text-primary">Đơn hàng #{selectedOrder.orderCode || selectedOrder.id}</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">{new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}</p>
                </div>
                <button onClick={handleCloseDetail} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-error-container hover:text-error" aria-label="Đóng chi tiết đơn hàng">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex-grow overflow-y-auto bg-surface-bright p-6 md:p-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
                  <section className="rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
                    <h3 className="mb-6 flex items-center gap-2 border-b border-surface-beige pb-4 font-label-lg uppercase tracking-widest text-primary">
                      <span className="material-symbols-outlined text-xl">history</span> Lịch sử đơn hàng
                    </h3>
                    {selectedOrder.statusHistory?.length ? (
                      <div className="relative ml-2 space-y-6 border-l-2 border-outline-variant/40 pl-6">
                        {selectedOrder.statusHistory.map((history) => (
                          <div key={history.id || `${history.toStatus}-${history.createdAt}`} className="relative">
                            <div className="absolute -left-[33px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-primary shadow-sm" />
                            <p className="text-xs font-bold uppercase tracking-wider text-primary">{getStatusLabel(history.toStatus)}</p>
                            <p className="mt-1 text-xs text-on-surface-variant">{new Date(history.createdAt).toLocaleString('vi-VN')}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-on-surface-variant">Chưa có lịch sử trạng thái.</p>
                    )}
                  </section>

                  <aside className="space-y-5">
                    <section className="rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
                      <h3 className="mb-5 flex items-center gap-2 border-b border-surface-beige pb-4 font-label-lg uppercase tracking-widest text-primary">
                        <span className="material-symbols-outlined text-xl">update</span> Cập nhật trạng thái
                      </h3>
                      <label htmlFor="admin-order-status-detail" className="mb-2 block text-xs font-bold uppercase tracking-wider text-primary">Trạng thái hiện tại</label>
                      <OrderStatusWorkflow
                        order={selectedOrder}
                        loading={statusUpdatingId === selectedOrder.id}
                        onUpdate={(nextStatus, note) => handleStatusChange(selectedOrder.id, nextStatus, note)}
                      />
                      {terminalStatuses.has(selectedOrder.status) && <p className="mt-3 text-xs font-medium italic text-error">Đơn hàng đã ở trạng thái kết thúc, không thể chuyển tiếp.</p>}
                      {selectedOrder.refundPending && <p className="mt-3 text-xs font-medium italic text-amber-700">Đang có yêu cầu hoàn tiền, tạm dừng chuyển trạng thái.</p>}
                    </section>

                    {selectedOrder.refundPending && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Yêu cầu hoàn tiền đang chờ xử lý{selectedOrder.refundRequestId ? `: ${selectedOrder.refundRequestId}` : ''}.</div>}
                    {selectedOrder.requiresRefund && !selectedOrder.refundPending && <RefundRequiredNotice />}
                    <CancellationPanel cancellation={selectedOrder.cancellation} />
                  </aside>
                </div>

                <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
                  <div className="border-b border-surface-beige p-6">
                    <h3 className="flex items-center gap-2 font-label-lg uppercase tracking-widest text-primary">
                      <span className="material-symbols-outlined text-xl">inventory_2</span> Sản phẩm đã đặt
                    </h3>
                  </div>
                  <div className="divide-y divide-surface-beige">
                    {selectedOrder.orderItems?.map((item) => {
                      const imageUrl = getStaticFileUrl(item.product?.imageUrl) || getStaticFileUrl(item.product?.images?.find((img) => img.isPrimary)?.imageUrl) || getStaticFileUrl(item.product?.images?.[0]?.imageUrl) || 'https://placehold.co/80x80?text=SP';
                      return (
                        <div key={item.id} className="flex flex-col gap-4 p-4 transition-colors hover:bg-surface-bright md:grid md:grid-cols-12 md:items-center">
                          <div className="col-span-6 flex w-full items-center gap-4">
                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-outline-variant/20 bg-white shadow-sm">
                              <img src={imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-[15px] font-label-lg text-primary">{item.productName}</p>
                              <p className="mt-1 text-xs text-on-surface-variant">SKU: SP-{item.productId}</p>
                            </div>
                          </div>
                          <div className="col-span-2 text-center font-medium text-primary">{formatPrice(item.finalPrice ?? item.price)}</div>
                          <div className="col-span-2 text-center"><span className="inline-block rounded-lg bg-surface-beige px-3 py-1 font-bold text-primary">{item.quantity}</span></div>
                          <div className="col-span-2 text-right text-[15px] font-bold text-accent-terracotta">{formatPrice(item.subtotal)}</div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
                  <div className="rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
                    <h3 className="mb-6 flex items-center gap-2 border-b border-surface-beige pb-4 font-label-lg uppercase tracking-widest text-primary">
                      <span className="material-symbols-outlined text-xl">local_shipping</span> Giao hàng
                    </h3>
                    <div className="space-y-5 font-body-sm">
                      <CustomerBlock order={selectedOrder} />
                      <div>
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Địa chỉ</p>
                        <p className="font-medium leading-relaxed text-primary">{selectedOrder.address}</p>
                      </div>
                      {selectedOrder.note && (
                        <div>
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Ghi chú của khách</p>
                          <p className="break-words rounded-lg border border-surface-beige bg-surface-ivory p-3 font-medium italic text-primary">{selectedOrder.note}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
                    <h3 className="mb-6 flex items-center gap-2 border-b border-surface-beige pb-4 font-label-lg uppercase tracking-widest text-primary">
                      <span className="material-symbols-outlined text-xl">payments</span> Thanh toán
                    </h3>
                    <div className="mb-6 space-y-4 border-b border-outline-variant/30 pb-6 font-body-sm">
                      <div className="flex justify-between gap-4">
                        <span className="font-medium text-on-surface-variant">Phương thức:</span>
                        <span className="rounded-full bg-surface-beige px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">{selectedOrder.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-medium text-on-surface-variant">Trạng thái:</span>
                        <span className={`rounded-sm border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${getPaymentStatusBadge(selectedOrder.paymentStatus).color}`}>{getPaymentStatusBadge(selectedOrder.paymentStatus).text}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-medium text-on-surface-variant">Tạm tính:</span>
                        <span className="font-semibold text-primary">{formatPrice(selectedOrder.totalAmount)}</span>
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-4">
                      <span className="font-label-lg uppercase tracking-wider text-primary">Tổng cộng</span>
                      <span className="font-headline-sm text-2xl text-accent-terracotta">{formatPrice(selectedOrder.totalAmount)}</span>
                    </div>
                  </div>
                </section>
              </div>

              <div className="flex shrink-0 justify-end border-t border-surface-beige bg-white p-6">
                <button onClick={handleCloseDetail} className="rounded-lg border border-outline-variant px-8 py-3 font-label-md uppercase tracking-wider text-primary transition-colors hover:bg-surface-beige">Đóng</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
