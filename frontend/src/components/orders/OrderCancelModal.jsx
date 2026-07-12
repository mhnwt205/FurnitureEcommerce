import React, { useMemo, useState } from 'react';
import { CANCELLATION_REASON_OPTIONS } from '../../utils/cancellationReasons';

export default function OrderCancelModal({ open, onClose, onConfirm, loading = false, error = '', refundMode = false }) {
  const [reasonCode, setReasonCode] = useState('no_longer_needed');
  const [reasonText, setReasonText] = useState('');
  const [localError, setLocalError] = useState('');
  const selectedReason = useMemo(() => CANCELLATION_REASON_OPTIONS.find((item) => item.code === reasonCode), [reasonCode]);

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const cleanText = reasonText.trim();
    if (reasonCode === 'other' && !cleanText) {
      setLocalError('Vui lòng nhập lý do hủy đơn.');
      return;
    }
    if (cleanText.length > 1000) {
      setLocalError('Lý do hủy đơn tối đa 1000 ký tự.');
      return;
    }
    setLocalError('');
    onConfirm({ reasonCode, reasonText: cleanText || undefined });
  };

  const handleClose = () => {
    if (loading) return;
    setLocalError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Hủy đơn hàng">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-[12px] border border-[#e5e1dc] bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-[#333333]">Xác nhận hủy đơn hàng</h2>
        <p className="mt-2 text-sm leading-6 text-[#666666]">{refundMode ? 'Yêu cầu hoàn tiền sẽ được ghi nhận. Đơn hàng chỉ hủy sau khi quản trị viên xác nhận hoàn tiền thành công.' : 'Sau khi hủy, đơn hàng sẽ chuyển sang trạng thái đã hủy nếu vẫn đủ điều kiện.'}</p>
        <label htmlFor="cancel-reason-code" className="mt-5 block text-sm font-bold text-[#333333]">Lý do hủy</label>
        <select id="cancel-reason-code" value={reasonCode} onChange={(event) => { setReasonCode(event.target.value); setLocalError(''); }} className="mt-2 h-12 w-full rounded-[8px] border border-[#d8d2cb] px-3 text-sm outline-none focus:border-[#bfa37c]">
          {CANCELLATION_REASON_OPTIONS.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
        </select>
        <label htmlFor="cancel-reason-text" className="mt-4 block text-sm font-bold text-[#333333]">Ghi chú {selectedReason?.code === 'other' ? '(bắt buộc)' : '(tùy chọn)'}</label>
        <textarea id="cancel-reason-text" value={reasonText} onChange={(event) => { setReasonText(event.target.value); setLocalError(''); }} maxLength={1000} rows={4} className="mt-2 w-full rounded-[8px] border border-[#d8d2cb] p-3 text-sm outline-none focus:border-[#bfa37c]" />
        {(localError || error) && <div className="mt-4 rounded-[8px] border border-[#f5d2d3] bg-[#fdebec] px-4 py-3 text-sm font-semibold text-[#9f2f2d]">{localError || error}</div>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleClose} disabled={loading} className="rounded-commerce-control border border-[#333333] px-5 py-2.5 text-sm font-bold uppercase text-[#333333] disabled:opacity-60">Đóng</button>
          <button type="submit" disabled={loading} className="rounded-commerce-control bg-[#9f2f2d] px-5 py-2.5 text-sm font-bold uppercase text-white disabled:opacity-60">{loading ? 'Đang gửi...' : (refundMode ? 'Gửi yêu cầu hủy và hoàn tiền' : 'Xác nhận hủy')}</button>
        </div>
      </form>
    </div>
  );
}
