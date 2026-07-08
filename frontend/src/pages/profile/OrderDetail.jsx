import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderService } from '../../services/api/orderService';
import { reviewService } from '../../services/api/reviewService';
import { uploadService } from '../../services/api/uploadService';
import { getStaticFileUrl } from '../../utils/imageUtils';
import { formatPlainVnd as formatMoney } from '../../utils/formatters';
import { getCustomerOrderStatusClass as getStatusClass, getCustomerOrderStatusText as getStatusText } from '../../utils/statusMaps';

const REVIEWABLE_STATUSES = ['delivered', 'completed'];

function ItemImage({ src, alt }) { if (!src) return <div className="flex h-full w-full items-center justify-center bg-[#f3f3f1] text-[#999999]"><span className="material-symbols-outlined text-2xl">inventory_2</span></div>; return <img src={src} alt={alt} className="h-full w-full object-cover" />; }

export default function OrderDetail({ orderId }) {
  const { id } = useParams();
  const effectiveId = orderId || id;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', images: [] });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => { fetchOrder(); }, [effectiveId]);

  const fetchOrder = async () => {
    try { const data = await orderService.getMyOrderById(effectiveId); setOrder(data); }
    catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const canReviewItem = (item) => REVIEWABLE_STATUSES.includes(order?.status) && (!item.reviews || item.reviews.length === 0);
  const openReviewModal = (item) => { setSelectedItem(item); setReviewForm({ rating: 5, comment: '', images: [] }); setReviewError(''); };
  const closeReviewModal = () => { if (reviewSubmitting) return; setSelectedItem(null); setReviewForm({ rating: 5, comment: '', images: [] }); setReviewError(''); };
  const handleReviewImageChange = (event) => { const files = Array.from(event.target.files || []).slice(0, 5); setReviewForm(prev => ({ ...prev, images: files })); };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!selectedItem || !order) return;
    try {
      setReviewSubmitting(true); setReviewError('');
      let imageUrls = [];
      if (reviewForm.images.length > 0) {
        const uploadResult = await uploadService.uploadReviewImages(reviewForm.images, { productId: selectedItem.productId, orderId: order.id, orderItemId: selectedItem.id });
        imageUrls = uploadResult.imageUrls || [];
      }
      const result = await reviewService.createReview({ productId: selectedItem.productId, orderId: order.id, orderItemId: selectedItem.id, rating: Number(reviewForm.rating), comment: reviewForm.comment, images: imageUrls });
      setOrder(prev => ({ ...prev, orderItems: prev.orderItems.map(item => item.id === selectedItem.id ? { ...item, reviews: [{ id: result.review?.id, rating: result.review?.rating, createdAt: result.review?.createdAt }] } : item) }));
      closeReviewModal();
    } catch (err) { setReviewError(err.message || 'Không thể gửi đánh giá.'); }
    finally { setReviewSubmitting(false); }
  };

  const renderStars = (value, onChange = null) => <div className="flex items-center gap-1">{Array.from({ length: 5 }, (_, index) => { const starValue = index + 1; return <button key={starValue} type="button" onClick={() => onChange?.(starValue)} className={`material-symbols-outlined text-[26px] transition-colors ${starValue <= value ? 'text-[#bfa37c]' : 'text-[#cfcfcf]'} ${onChange ? 'cursor-pointer hover:text-[#bfa37c]' : 'cursor-default'}`}>{starValue <= value ? 'star' : 'star_outline'}</button>; })}</div>;

  if (loading) return <div className="space-y-4"><div className="ui-skeleton h-10 w-64 rounded" /><div className="ui-skeleton h-48 rounded-[12px]" /><div className="ui-skeleton h-36 rounded-[12px]" /></div>;
  if (!order) return <div className="ui-empty-state"><span className="material-symbols-outlined mb-3 block text-4xl text-[#999999]">search_off</span><h4 className="text-base font-bold text-[#333333]">Không tìm thấy đơn hàng</h4><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777777]">Đơn hàng không tồn tại hoặc bạn không có quyền truy cập.</p><Link to="/profile?tab=orders" className="ui-button-primary mt-5 inline-flex px-5 py-2.5 text-sm">Quay lại danh sách</Link></div>;

  return (
    <>
      <div className="mb-7 flex flex-col gap-4 border-b border-[#eeeeee] pb-6 md:flex-row md:items-center md:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-bold text-[#333333]">Chi tiết đơn hàng #{order.orderCode || order.id}</h2><span className={`rounded-[6px] border px-2.5 py-1 text-xs font-bold ${getStatusClass(order.status)}`}>{getStatusText(order.status)}</span></div><p className="mt-2 text-sm text-[#777777]">Ngày đặt: {new Date(order.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>
        <Link to="/profile?tab=orders" className="ui-button-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"><span className="material-symbols-outlined text-[18px]">arrow_back</span>Quay lại</Link>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {order.statusHistory && order.statusHistory.length > 0 && <section className="rounded-[12px] border border-[#e5e5e5] bg-white p-5"><h3 className="mb-5 flex items-center gap-2 text-[15px] font-bold text-[#333333]"><span className="material-symbols-outlined text-xl">history</span>Lịch sử trạng thái</h3><div className="ml-2 space-y-5 border-l border-[#e5e5e5] pl-5">{order.statusHistory.map(history => <div key={history.id} className="relative"><span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#bfa37c] shadow-[0_0_0_1px_#e5e5e5]" /><p className="text-sm font-bold text-[#333333]">{getStatusText(history.toStatus)}</p><time className="mt-1 block text-xs text-[#777777]">{new Date(history.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</time>{history.cancelReason && <div className="mt-2 rounded-[8px] border border-[#f5d2d3] bg-[#fdebec] p-2.5 text-xs text-[#9f2f2d]"><span className="font-bold">Lý do hủy:</span> {history.cancelReason}</div>}</div>)}</div></section>}
          <section className="overflow-hidden rounded-[12px] border border-[#e5e5e5] bg-white"><div className="border-b border-[#eeeeee] p-5"><h3 className="flex items-center gap-2 text-[15px] font-bold text-[#333333]"><span className="material-symbols-outlined text-xl">inventory_2</span>Sản phẩm đã đặt</h3></div><div className="divide-y divide-[#eeeeee]">{order.orderItems?.map(item => { const rawImage = item?.product?.images?.find(img => img.isPrimary)?.imageUrl || item?.product?.images?.[0]?.imageUrl || item?.product?.imageUrl; const imageUrl = rawImage ? getStaticFileUrl(rawImage) : ''; const reviewed = item.reviews && item.reviews.length > 0; return <div key={item.id} className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_170px_120px] md:items-center"><div className="flex min-w-0 gap-4"><div className="h-20 w-20 shrink-0 overflow-hidden rounded-[10px] border border-[#eeeeee]"><ItemImage src={imageUrl} alt={item.productName} /></div><div className="min-w-0"><p className="line-clamp-2 text-sm font-semibold text-[#333333]">{item.productName}</p><p className="mt-1 text-xs text-[#777777]">Số lượng: {item.quantity}</p></div></div><div className="text-sm text-[#555555] md:text-center">{formatMoney(item.finalPrice ?? item.price)} <span className="text-[#999999]">x</span> {item.quantity}</div><div className="flex items-center justify-between gap-3 md:block md:text-right"><p className="font-bold text-[#b94732]">{formatMoney(item.subtotal)}</p>{reviewed ? <span className="mt-2 inline-flex items-center gap-1 rounded-[8px] border border-[#dbe8d8] bg-[#edf3ec] px-2.5 py-1.5 text-xs font-semibold text-[#346538]"><span className="material-symbols-outlined text-[16px]">check_circle</span>Đã đánh giá</span> : canReviewItem(item) ? <button type="button" onClick={() => openReviewModal(item)} className="mt-2 inline-flex items-center gap-1 rounded-[8px] border border-[#333333] px-3 py-1.5 text-xs font-semibold text-[#333333] transition-colors hover:bg-[#333333] hover:text-white"><span className="material-symbols-outlined text-[16px]">rate_review</span>Đánh giá</button> : <span className="mt-2 block text-xs text-[#777777]">Chưa thể đánh giá</span>}</div></div>; })}</div></section>
        </div>
        <aside className="space-y-6 lg:sticky lg:top-24"><section className="rounded-[12px] border border-[#e5e5e5] bg-white p-5"><h3 className="mb-5 flex items-center gap-2 text-[15px] font-bold text-[#333333]"><span className="material-symbols-outlined text-xl">local_shipping</span>Giao hàng</h3><div className="space-y-4 text-sm"><div><p className="text-xs font-bold text-[#777777]">Người nhận</p><p className="mt-1 font-semibold text-[#333333]">{order.fullName}</p></div><div><p className="text-xs font-bold text-[#777777]">Điện thoại</p><p className="mt-1 text-[#333333]">{order.phone}</p></div><div><p className="text-xs font-bold text-[#777777]">Địa chỉ</p><p className="mt-1 leading-6 text-[#333333]">{order.address}</p></div>{order.note && <div><p className="text-xs font-bold text-[#777777]">Ghi chú của bạn</p><p className="mt-2 rounded-[8px] border border-[#eeeeee] bg-[#fafaf8] p-3 leading-6 text-[#555555]">{order.note}</p></div>}</div></section><section className="rounded-[12px] border border-[#e5e5e5] bg-white p-5"><h3 className="mb-5 flex items-center gap-2 text-[15px] font-bold text-[#333333]"><span className="material-symbols-outlined text-xl">payments</span>Thanh toán</h3><div className="space-y-3 border-b border-[#eeeeee] pb-4 text-sm"><div className="flex justify-between gap-4"><span className="text-[#777777]">Phương thức</span><span className="font-bold uppercase text-[#333333]">{order.paymentMethod}</span></div><div className="flex justify-between gap-4"><span className="text-[#777777]">Tạm tính</span><span className="font-semibold text-[#333333]">{formatMoney(order.totalAmount)}</span></div></div><div className="mt-4 flex items-end justify-between gap-4"><span className="text-sm font-bold text-[#333333]">Tổng cộng</span><span className="text-2xl font-bold text-[#b94732]">{formatMoney(order.totalAmount)}</span></div></section></aside>
      </div>
      {selectedItem && <div className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"><form onSubmit={handleReviewSubmit} className="ui-modal-panel w-full max-w-xl overflow-hidden" role="dialog" aria-modal="true" aria-label="Đánh giá sản phẩm"><div className="ui-modal-header flex items-start justify-between gap-4"><div><h3 className="text-xl font-bold text-[#333333]">Đánh giá sản phẩm</h3><p className="mt-1 line-clamp-2 text-sm text-[#777777]">{selectedItem.productName}</p></div><button type="button" onClick={closeReviewModal} className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#777777] hover:bg-[#fdebec] hover:text-[#9f2f2d]" aria-label="Đóng form đánh giá"><span className="material-symbols-outlined">close</span></button></div><div className="space-y-5 p-5"><div><label className="mb-2 block text-sm font-semibold text-[#333333]">Số sao</label>{renderStars(reviewForm.rating, rating => setReviewForm(prev => ({ ...prev, rating })))}</div><div><label className="mb-2 block text-sm font-semibold text-[#333333]">Bình luận</label><textarea value={reviewForm.comment} onChange={e => setReviewForm(prev => ({ ...prev, comment: e.target.value }))} rows="4" maxLength="2000" placeholder="Sản phẩm có đúng kỳ vọng của bạn không?" className="ui-textarea" /></div><label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#777777]"><span className="material-symbols-outlined text-[20px]">add_photo_alternate</span><span>{reviewForm.images.length > 0 ? `${reviewForm.images.length} ảnh đã chọn` : 'Thêm tối đa 5 ảnh'}</span><input type="file" accept="image/*" multiple onChange={handleReviewImageChange} className="hidden" /></label>{reviewError && <div className="rounded-[8px] border border-[#f5d2d3] bg-[#fdebec] px-4 py-3 text-sm text-[#9f2f2d]">{reviewError}</div>}</div><div className="ui-modal-footer flex justify-end gap-3"><button type="button" onClick={closeReviewModal} className="ui-button-secondary px-5 py-2.5 text-sm">Hủy</button><button type="submit" disabled={reviewSubmitting} className="ui-button-primary px-6 py-2.5 text-sm disabled:opacity-60">{reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}</button></div></form></div>}
    </>
  );
}