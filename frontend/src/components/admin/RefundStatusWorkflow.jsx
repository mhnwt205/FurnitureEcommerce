import React, { useEffect, useState } from 'react';

const REFUND_STATUSES = ['pending', 'processing', 'succeeded', 'failed', 'unknown'];

const REFUND_STATUS_LABELS = {
  pending: 'Ch\u1edd x\u1eed l\u00fd',
  processing: '\u0110ang x\u1eed l\u00fd',
  succeeded: 'Th\u00e0nh c\u00f4ng',
  failed: 'Th\u1ea5t b\u1ea1i',
  unknown: 'Ch\u01b0a x\u00e1c \u0111\u1ecbnh'
};

const REFUND_STATUS_CLASSES = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  processing: 'border-sky-200 bg-sky-50 text-sky-800',
  succeeded: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  failed: 'border-red-200 bg-red-50 text-red-800',
  unknown: 'border-gray-200 bg-gray-50 text-gray-800'
};

const REFUND_ALLOWED_TRANSITIONS = {
  pending: ['processing'],
  processing: ['succeeded', 'failed', 'unknown'],
  unknown: ['succeeded'],
  succeeded: [],
  failed: []
};

const REFUND_CONFIRM_COPY = {
  'pending:processing': {
    title: 'B\u1eaft \u0111\u1ea7u x\u1eed l\u00fd ho\u00e0n ti\u1ec1n?',
    message: 'H\u00e3y \u0111\u1ea3m b\u1ea3o b\u1ea1n \u0111ang th\u1ef1c hi\u1ec7n ho\u00e0n ti\u1ec1n th\u1ee7 c\u00f4ng tr\u00ean VNPay Merchant tr\u01b0\u1edbc khi ti\u1ebfp t\u1ee5c.',
    confirmLabel: 'B\u1eaft \u0111\u1ea7u x\u1eed l\u00fd'
  },
  'processing:succeeded': {
    title: 'X\u00e1c nh\u1eadn ho\u00e0n ti\u1ec1n th\u00e0nh c\u00f4ng?',
    message: 'Ch\u1ec9 x\u00e1c nh\u1eadn th\u00e0nh c\u00f4ng sau khi b\u1ea1n \u0111\u00e3 th\u1ef1c s\u1ef1 ho\u00e0n ti\u1ec1n tr\u00ean VNPay Merchant. H\u00e0nh \u0111\u1ed9ng n\u00e0y s\u1ebd h\u1ee7y \u0111\u01a1n h\u00e0ng, c\u1eadp nh\u1eadt thanh to\u00e1n th\u00e0nh \u0110\u00e3 ho\u00e0n ti\u1ec1n v\u00e0 ho\u00e0n l\u1ea1i t\u1ed3n kho.',
    confirmLabel: 'X\u00e1c nh\u1eadn th\u00e0nh c\u00f4ng',
    tone: 'danger'
  },
  'processing:failed': {
    title: 'X\u00e1c nh\u1eadn ho\u00e0n ti\u1ec1n th\u1ea5t b\u1ea1i?',
    message: '\u0110\u01a1n h\u00e0ng s\u1ebd gi\u1eef tr\u1ea1ng th\u00e1i hi\u1ec7n t\u1ea1i, thanh to\u00e1n v\u1eabn l\u00e0 \u0110\u00e3 thanh to\u00e1n v\u00e0 kh\u00e1ch h\u00e0ng c\u00f3 th\u1ec3 g\u1eedi l\u1ea1i y\u00eau c\u1ea7u n\u1ebfu \u0111\u01a1n c\u00f2n \u0111\u1ee7 \u0111i\u1ec1u ki\u1ec7n.',
    confirmLabel: 'X\u00e1c nh\u1eadn th\u1ea5t b\u1ea1i'
  },
  'processing:unknown': {
    title: '\u0110\u00e1nh d\u1ea5u k\u1ebft qu\u1ea3 ch\u01b0a x\u00e1c \u0111\u1ecbnh?',
    message: '\u0110\u01a1n h\u00e0ng s\u1ebd ti\u1ebfp t\u1ee5c b\u1ecb kh\u00f3a chuy\u1ec3n tr\u1ea1ng th\u00e1i cho \u0111\u1ebfn khi k\u1ebft qu\u1ea3 ho\u00e0n ti\u1ec1n \u0111\u01b0\u1ee3c x\u00e1c minh.',
    confirmLabel: 'X\u00e1c nh\u1eadn ch\u01b0a x\u00e1c \u0111\u1ecbnh'
  },
  'unknown:succeeded': {
    title: 'X\u00e1c nh\u1eadn k\u1ebft qu\u1ea3 ho\u00e0n ti\u1ec1n th\u00e0nh c\u00f4ng?',
    message: 'Ch\u1ec9 ti\u1ebfp t\u1ee5c khi b\u1ea1n \u0111\u00e3 x\u00e1c minh giao d\u1ecbch ho\u00e0n ti\u1ec1n th\u00e0nh c\u00f4ng tr\u00ean VNPay Merchant.',
    confirmLabel: 'X\u00e1c nh\u1eadn th\u00e0nh c\u00f4ng',
    tone: 'danger'
  }
};

const getRefundStatusLabel = (status) => REFUND_STATUS_LABELS[status] || status || '-';
const getRefundConfirmCopy = (currentStatus, nextStatus) => REFUND_CONFIRM_COPY[`${currentStatus}:${nextStatus}`];
const isValidRefundTarget = (currentStatus, targetStatus) => REFUND_ALLOWED_TRANSITIONS[currentStatus]?.includes(targetStatus) || false;

function RefundConfirmDialog({ refund, nextStatus, form, loading, onFormChange, onCancel, onConfirm }) {
  const copy = getRefundConfirmCopy(refund.status, nextStatus);
  if (!copy) return null;

  const isResolve = nextStatus !== 'processing';
  const isSucceeded = nextStatus === 'succeeded';
  const confirmClass = copy.tone === 'danger'
    ? 'bg-red-700 text-white hover:bg-red-800 focus:ring-red-700/30'
    : 'bg-primary text-white hover:bg-primary/90 focus:ring-primary/30';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[500px] overflow-hidden rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="refund-confirm-title">
        <div className="border-b border-surface-beige px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">VNPay manual refund</p>
              <h3 id="refund-confirm-title" className="mt-1.5 text-lg font-bold text-primary">{copy.title}</h3>
            </div>
            <button type="button" onClick={onCancel} disabled={loading} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-beige hover:text-primary disabled:opacity-60" aria-label="Dong xac nhan hoan tien">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">{copy.message}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <span className={`inline-flex rounded-commerce-control border px-3 py-1 ${REFUND_STATUS_CLASSES[refund.status] || REFUND_STATUS_CLASSES.unknown}`}>{getRefundStatusLabel(refund.status)}</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            <span className={`inline-flex rounded-commerce-control border px-3 py-1 ${REFUND_STATUS_CLASSES[nextStatus] || REFUND_STATUS_CLASSES.unknown}`}>{getRefundStatusLabel(nextStatus)}</span>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {isSucceeded && (
            <label className="block text-sm font-semibold text-primary">
              {'M\u00e3 tham chi\u1ebfu VNPay'}
              <input type="text" value={form.providerTransactionId} onChange={(event) => onFormChange('providerTransactionId', event.target.value)} placeholder={'Nh\u1eadp n\u1ebfu c\u00f3'} className="mt-2 w-full rounded-commerce-control border border-outline-variant/50 px-3 py-2 text-sm font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </label>
          )}
          {isResolve && (
            <label className="block text-sm font-semibold text-primary">
              {'M\u00e3 k\u1ebft qu\u1ea3/tham chi\u1ebfu VNPay'}
              <input type="text" value={form.providerResponseCode} onChange={(event) => onFormChange('providerResponseCode', event.target.value)} placeholder={'Nh\u1eadp n\u1ebfu c\u00f3'} className="mt-2 w-full rounded-commerce-control border border-outline-variant/50 px-3 py-2 text-sm font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </label>
          )}
          <label className="block text-sm font-semibold text-primary">
            {'Ghi ch\u00fa qu\u1ea3n tr\u1ecb vi\u00ean'}
            <textarea value={form.adminNote} onChange={(event) => onFormChange('adminNote', event.target.value)} rows="3" maxLength="1000" placeholder={'Kh\u00f4ng b\u1eaft bu\u1ed9c'} className="mt-2 w-full resize-none rounded-commerce-control border border-outline-variant/50 px-3 py-2 text-sm font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-surface-beige bg-surface-ivory px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={loading} className="rounded-commerce-control border border-outline-variant px-5 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-white disabled:opacity-60">{'Quay l\u1ea1i'}</button>
          <button type="button" onClick={onConfirm} disabled={loading} className={`rounded-commerce-control px-5 py-2.5 text-sm font-bold transition-colors focus:outline-none focus:ring-2 disabled:cursor-wait disabled:opacity-70 ${confirmClass}`}>
            {loading ? '\u0110ang c\u1eadp nh\u1eadt...' : copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RefundStatusWorkflow({ refund, loading, onUpdate }) {
  const [selectedStatus, setSelectedStatus] = useState(refund.status);
  const [confirmingStatus, setConfirmingStatus] = useState(null);
  const [form, setForm] = useState({ providerTransactionId: '', providerResponseCode: '', adminNote: '' });

  useEffect(() => {
    setSelectedStatus(refund.status);
    setConfirmingStatus(null);
    setForm({
      providerTransactionId: refund.providerTransactionId || '',
      providerResponseCode: refund.providerResponseCode || '',
      adminNote: refund.adminNote || ''
    });
  }, [refund.requestId, refund.status, refund.providerTransactionId, refund.providerResponseCode, refund.adminNote]);

  const canUpdate = selectedStatus !== refund.status && isValidRefundTarget(refund.status, selectedStatus);

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
    onUpdate(refund, confirmingStatus, form);
  };

  return (
    <>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} disabled={loading} className="h-9 w-full rounded-commerce-control border border-outline-variant/50 bg-white px-3 text-xs font-semibold text-primary outline-none transition-colors hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-wait disabled:bg-surface-container disabled:text-on-surface-variant sm:w-[185px]">
          {REFUND_STATUSES.map((status) => (
            <option key={status} value={status} disabled={status !== refund.status && !isValidRefundTarget(refund.status, status)}>
              {getRefundStatusLabel(status)}
            </option>
          ))}
        </select>
        <button type="button" onClick={openConfirm} disabled={!canUpdate || loading} className="inline-flex h-9 shrink-0 items-center justify-center rounded-commerce-control bg-primary px-3.5 text-xs font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary disabled:text-white disabled:opacity-100 disabled:hover:bg-primary sm:px-4">
          {loading ? '\u0110ang c\u1eadp nh\u1eadt...' : 'C\u1eadp nh\u1eadt'}
        </button>
      </div>
      {confirmingStatus && (
        <RefundConfirmDialog refund={refund} nextStatus={confirmingStatus} form={form} loading={loading} onFormChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))} onCancel={closeConfirm} onConfirm={handleConfirm} />
      )}
    </>
  );
}