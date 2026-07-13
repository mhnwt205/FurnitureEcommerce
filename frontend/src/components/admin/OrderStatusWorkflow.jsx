import React, { useEffect, useState } from 'react';

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'completed', 'cancelled'];

const ORDER_STATUS_LABELS = {
  pending: 'Ch\u1edd x\u00e1c nh\u1eadn',
  confirmed: '\u0110\u00e3 x\u00e1c nh\u1eadn',
  preparing: '\u0110ang chu\u1ea9n b\u1ecb',
  shipping: '\u0110ang giao h\u00e0ng',
  delivered: '\u0110\u00e3 giao h\u00e0ng',
  completed: 'Ho\u00e0n th\u00e0nh',
  cancelled: '\u0110\u00e3 h\u1ee7y'
};

const ORDER_STATUS_CLASSES = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  preparing: 'bg-purple-100 text-purple-800 border-purple-200',
  shipping: 'bg-sky-100 text-sky-800 border-sky-200',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200'
};

const ADMIN_ALLOWED_TRANSITIONS = {
  pending: ['confirmed'],
  confirmed: ['preparing'],
  preparing: ['shipping'],
  shipping: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: []
};

const getOrderStatusLabel = (status) => ORDER_STATUS_LABELS[status] || status || '-';
const isValidOrderTarget = (currentStatus, targetStatus) => ADMIN_ALLOWED_TRANSITIONS[currentStatus]?.includes(targetStatus) || false;

function OrderStatusConfirmDialog({ order, nextStatus, note, loading, onNoteChange, onCancel, onConfirm }) {
  const fromLabel = getOrderStatusLabel(order.status);
  const toLabel = getOrderStatusLabel(nextStatus);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[480px] overflow-hidden rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="order-status-confirm-title">
        <div className="border-b border-surface-beige px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Order workflow</p>
              <h3 id="order-status-confirm-title" className="mt-1.5 text-lg font-bold text-primary">{'X\u00e1c nh\u1eadn c\u1eadp nh\u1eadt tr\u1ea1ng th\u00e1i?'}</h3>
            </div>
            <button type="button" onClick={onCancel} disabled={loading} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-beige hover:text-primary disabled:opacity-60" aria-label="Dong xac nhan cap nhat trang thai">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            {'Chuy\u1ec3n \u0111\u01a1n h\u00e0ng t\u1eeb '}
            <span className="font-bold text-primary">{fromLabel}</span>
            {' sang '}
            <span className="font-bold text-primary">{toLabel}</span>
            {'?'}
          </p>
          {nextStatus === 'delivered' && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
              {'Thao t\u00e1c n\u00e0y c\u00f3 th\u1ec3 \u0111\u1ed3ng th\u1eddi c\u1eadp nh\u1eadt tr\u1ea1ng th\u00e1i thanh to\u00e1n COD theo nghi\u1ec7p v\u1ee5 hi\u1ec7n t\u1ea1i.'}
            </p>
          )}
        </div>

        <div className="p-5">
          <label className="block text-sm font-semibold text-primary">
            {'Ghi ch\u00fa n\u1ed9i b\u1ed9'}
            <textarea value={note} onChange={(event) => onNoteChange(event.target.value)} rows="3" maxLength="1000" placeholder={'Kh\u00f4ng b\u1eaft bu\u1ed9c'} className="mt-2 w-full resize-none rounded-commerce-control border border-outline-variant/50 px-3 py-2 text-sm font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-surface-beige bg-surface-ivory px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={loading} className="rounded-commerce-control border border-outline-variant px-5 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-white disabled:opacity-60">{'Quay l\u1ea1i'}</button>
          <button type="button" onClick={onConfirm} disabled={loading} className="rounded-commerce-control bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-wait disabled:opacity-70">
            {loading ? '\u0110ang c\u1eadp nh\u1eadt...' : 'C\u1eadp nh\u1eadt tr\u1ea1ng th\u00e1i'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderStatusWorkflow({ order, loading, onUpdate, className = '' }) {
  const [selectedStatus, setSelectedStatus] = useState(order.status);
  const [confirmingStatus, setConfirmingStatus] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    setSelectedStatus(order.status);
    setConfirmingStatus(null);
    setNote('');
  }, [order.id, order.status]);

  const blockedByRefund = Boolean(order.refundPending);
  const hasNextTransition = (ADMIN_ALLOWED_TRANSITIONS[order.status]?.length || 0) > 0;
  const canUpdate = !blockedByRefund && hasNextTransition && selectedStatus !== order.status && isValidOrderTarget(order.status, selectedStatus);
  const updateTitle = loading
    ? 'Đang cập nhật trạng thái'
    : blockedByRefund
      ? 'Đơn hàng đang có yêu cầu hoàn tiền'
      : !hasNextTransition
        ? 'Không có bước chuyển trạng thái hợp lệ'
        : selectedStatus === order.status
          ? 'Hãy chọn trạng thái tiếp theo'
          : !isValidOrderTarget(order.status, selectedStatus)
            ? 'Không có bước chuyển trạng thái hợp lệ'
            : 'Cập nhật trạng thái';

  const openConfirm = () => {
    if (!canUpdate) return;
    setConfirmingStatus(selectedStatus);
  };

  const closeConfirm = () => {
    if (loading) return;
    setConfirmingStatus(null);
  };

  const handleConfirm = () => {
    if (!confirmingStatus) return;
    onUpdate(confirmingStatus, note);
  };

  return (
    <>
      <div className={`grid w-full grid-cols-[minmax(0,1fr)_78px] items-center gap-2 ${className}`}>
        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} disabled={loading || blockedByRefund} className={`h-9 min-w-0 w-full rounded-commerce-control border px-3 text-xs font-bold outline-none transition-colors focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70 ${ORDER_STATUS_CLASSES[order.status] || 'border-gray-200 bg-gray-100 text-gray-800'}`}>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status} disabled={status !== order.status && !isValidOrderTarget(order.status, status)}>
              {getOrderStatusLabel(status)}
            </option>
          ))}
        </select>
        <div className="flex h-9 w-[78px] shrink-0 items-center justify-center">
          <button type="button" onClick={openConfirm} disabled={!canUpdate || loading} title={updateTitle} aria-label={updateTitle} className="inline-flex h-9 w-[78px] items-center justify-center whitespace-nowrap rounded-commerce-control bg-primary text-xs font-bold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-primary disabled:text-white disabled:opacity-100 disabled:hover:bg-primary">
            {loading ? '\u0110ang c\u1eadp nh\u1eadt...' : 'C\u1eadp nh\u1eadt'}
          </button>
        </div>
      </div>
      {confirmingStatus && (
        <OrderStatusConfirmDialog order={order} nextStatus={confirmingStatus} note={note} loading={loading} onNoteChange={setNote} onCancel={closeConfirm} onConfirm={handleConfirm} />
      )}
    </>
  );
}