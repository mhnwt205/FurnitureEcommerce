import React from 'react';
import AdminTable from '../AdminTable';
import Skeleton from '../../ui/Skeleton';
import { formatPrice } from '../../../utils/formatters';
import { ADMIN_ORDER_STATUS_LABELS, getAdminOrderStatusColorClass } from '../../../utils/statusMaps';

const formatPaidAt = (value) => {
  if (!value) return '—';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
};

const TableHead = () => (
  <thead className="border-b border-surface-beige bg-surface-ivory text-xs font-label-lg uppercase tracking-wider">
    <tr>
      <th scope="col" className="px-4 py-3 font-semibold text-on-surface-variant">Mã đơn</th>
      <th scope="col" className="px-4 py-3 font-semibold text-on-surface-variant">Khách hàng</th>
      <th scope="col" className="px-4 py-3 text-center font-semibold text-on-surface-variant">Trạng thái</th>
      <th scope="col" className="px-4 py-3 text-center font-semibold text-on-surface-variant">Phương thức thanh toán</th>
      <th scope="col" className="px-4 py-3 text-right font-semibold text-on-surface-variant">Doanh thu</th>
      <th scope="col" className="px-4 py-3 font-semibold text-on-surface-variant">Ngày thanh toán</th>
    </tr>
  </thead>
);

export default function RevenueOrdersTable({
  orders = [],
  pagination = {},
  loading = false,
  error = null,
  onRetry,
  onPageChange,
  onLimitChange
}) {
  const rows = Array.isArray(orders) ? orders : [];
  const page = Number(pagination.page) || 1;
  const limit = Number(pagination.limit) || 10;
  const total = Number(pagination.total) || 0;
  const totalPages = Number(pagination.totalPages) || 0;
  const skeletonRows = Math.min(Math.max(limit, 1), 10);

  const renderTable = (body) => (
    <AdminTable containerClassName="overflow-x-auto" className="w-full min-w-[900px] table-fixed text-left font-body-sm">
      <colgroup>
        <col className="w-[15%]" />
        <col className="w-[21%]" />
        <col className="w-[15%]" />
        <col className="w-[17%]" />
        <col className="w-[16%]" />
        <col className="w-[16%]" />
      </colgroup>
      <TableHead />
      {body}
    </AdminTable>
  );

  return (
    <section className="mt-8" aria-labelledby="revenue-orders-heading">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="revenue-orders-heading" className="font-display-sm text-xl font-semibold text-primary">Đơn hàng đã ghi nhận doanh thu</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Chỉ hiển thị các đơn đã thanh toán trong khoảng thời gian được chọn.</p>
        </div>
        {!loading && !error && rows.length > 0 && (
          <span className="font-body-sm text-on-surface-variant">Tổng số: <strong className="text-primary">{total}</strong> đơn hàng</span>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
        {loading && renderTable(
          <tbody className="divide-y divide-surface-beige" aria-busy="true" aria-label="Đang tải danh sách đơn hàng doanh thu">
            {Array.from({ length: skeletonRows }, (_, index) => (
              <tr key={index}>
                {Array.from({ length: 6 }, (_, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-4"><Skeleton className="h-5 w-full rounded" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        )}

        {!loading && error && (
          <div className="p-6" role="alert">
            <p className="font-label-lg text-on-error-container">Không thể tải danh sách đơn hàng doanh thu.</p>
            {onRetry && (
              <button type="button" onClick={onRetry} className="mt-4 rounded border border-outline-variant/50 px-3 py-1.5 font-label-md text-primary transition-colors hover:bg-surface-beige">
                Thử lại
              </button>
            )}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="py-16 text-center" role="status">
            <span className="material-symbols-outlined mb-3 text-4xl text-outline-variant">inbox</span>
            <p className="font-label-lg text-on-surface-variant">Không có đơn hàng phù hợp với bộ lọc hiện tại.</p>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <>
            {renderTable(
              <tbody className="divide-y divide-surface-beige">
                {rows.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-surface-beige/30">
                    <td className="px-4 py-3 align-middle font-label-lg text-[15px] text-primary">{order.orderCode || order.id || '—'}</td>
                    <td className="px-4 py-3 align-middle text-on-surface-variant">{order.customerName || '—'}</td>
                    <td className="px-4 py-3 text-center align-middle">
                      <span className={`inline-block rounded-sm px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${getAdminOrderStatusColorClass(order.status)}`}>
                        {ADMIN_ORDER_STATUS_LABELS[order.status] || order.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center align-middle text-on-surface-variant">{order.paymentMethod || '—'}</td>
                    <td className="px-4 py-3 text-right align-middle font-headline-sm text-[16px] text-accent-terracotta">{formatPrice(order.totalAmount)}</td>
                    <td className="px-4 py-3 align-middle whitespace-nowrap text-on-surface-variant">{formatPaidAt(order.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            )}
            <div className="flex flex-col items-center justify-between gap-4 border-t border-surface-beige bg-surface-ivory p-4 md:flex-row">
              <label className="flex items-center gap-2 font-body-sm text-on-surface-variant">
                Số dòng mỗi trang
                <select
                  value={limit}
                  onChange={(event) => onLimitChange?.(Number(event.target.value))}
                  disabled={!onLimitChange}
                  className="h-9 rounded-commerce-control border border-outline-variant/50 bg-white px-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onPageChange?.(page - 1)}
                  disabled={!onPageChange || page <= 1}
                  className="rounded border border-outline-variant/50 px-3 py-1.5 font-label-md text-primary transition-colors hover:bg-surface-beige disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Trước
                </button>
                <span className="mx-2 font-label-md text-primary" aria-current="page">Trang {page} / {totalPages || 1}</span>
                <button
                  type="button"
                  onClick={() => onPageChange?.(page + 1)}
                  disabled={!onPageChange || totalPages === 0 || page >= totalPages}
                  className="rounded border border-outline-variant/50 px-3 py-1.5 font-label-md text-primary transition-colors hover:bg-surface-beige disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
