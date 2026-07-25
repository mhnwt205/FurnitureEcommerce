import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { voucherService } from '../../services/api/voucherService';
import useFinancialRefresh from '../../hooks/useFinancialRefresh';

const label = { AVAILABLE: 'Có thể dùng', USED: 'Đã dùng', EXPIRED: 'Đã hết hạn' };
export default function VoucherDetail() {
  const { id } = useParams(); const [voucher, setVoucher] = useState(null); const [error, setError] = useState('');
  const load = useCallback(async () => { try { setError(''); const response = await voucherService.getMyVoucher(id); setVoucher(response.data); } catch (requestError) { setError(requestError.data?.error?.message || 'Không tìm thấy Voucher.'); } }, [id]);
  useEffect(() => { load(); }, [load]); useFinancialRefresh(load);
  if (!voucher && !error) return <main className="mx-auto max-w-2xl px-4 py-10"><div className="ui-skeleton h-64 rounded-ui-card"/></main>;
  if (error) return <main className="mx-auto max-w-2xl px-4 py-10"><p role="alert">{error}</p><button className="ui-button-secondary mt-4" onClick={load}>Thử lại</button><Link className="ml-3 text-sm underline" to="/profile/vouchers">Quay lại</Link></main>;
  const discount = voucher.discountType === 'PERCENTAGE' ? `${voucher.discountValueVnd}%` : `${Number(voucher.discountValueVnd || 0).toLocaleString('vi-VN')} đ`;
  return <main className="mx-auto max-w-2xl px-4 py-10"><Link className="text-sm text-ui-muted underline" to="/profile/vouchers">Voucher của tôi</Link><article className="ui-card mt-4 p-6"><div className="flex items-start justify-between gap-4"><div><p className="font-bold tracking-wider">{voucher.code}</p><h1 className="mt-2 text-headline-lg">{voucher.name}</h1></div><span className="ui-badge">{label[voucher.effectiveStatus] || voucher.effectiveStatus}</span></div>{voucher.description && <p className="mt-4 text-sm leading-6 text-ui-muted">{voucher.description}</p>}<dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-ui-muted">Giảm giá</dt><dd className="mt-1 font-semibold">{discount}</dd></div><div><dt className="text-ui-muted">Đơn tối thiểu</dt><dd className="mt-1 font-semibold">{voucher.minimumOrderAmountVnd ? `${Number(voucher.minimumOrderAmountVnd).toLocaleString('vi-VN')} đ` : 'Không yêu cầu'}</dd></div><div><dt className="text-ui-muted">Hạn sử dụng</dt><dd className="mt-1">{new Date(voucher.expiresAt).toLocaleString('vi-VN')}</dd></div><div><dt className="text-ui-muted">Nguồn nhận</dt><dd className="mt-1">{voucher.acquisitionSource}</dd></div>{voucher.usedAt && <div><dt className="text-ui-muted">Đã sử dụng</dt><dd className="mt-1">{new Date(voucher.usedAt).toLocaleString('vi-VN')}</dd></div>}</dl></article></main>;
}
