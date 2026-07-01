import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderService } from '../../services/api/orderService';
import { reviewService } from '../../services/api/reviewService';
import { uploadService } from '../../services/api/uploadService';
import { getStaticFileUrl } from '../../utils/imageUtils';

const REVIEWABLE_STATUSES = ['delivered', 'completed'];

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', images: [] });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const data = await orderService.getMyOrderById(id);
      setOrder(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Chờ xác nhận';
      case 'confirmed': return 'Đã xác nhận';
      case 'preparing': return 'Đang chuẩn bị';
      case 'shipping': return 'Đang giao';
      case 'delivered': return 'Đã giao';
      case 'completed': return 'Hoàn thành';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  const canReviewItem = (item) => {
    return REVIEWABLE_STATUSES.includes(order?.status) && (!item.reviews || item.reviews.length === 0);
  };

  const openReviewModal = (item) => {
    setSelectedItem(item);
    setReviewForm({ rating: 5, comment: '', images: [] });
    setReviewError('');
  };

  const closeReviewModal = () => {
    if (reviewSubmitting) return;
    setSelectedItem(null);
    setReviewForm({ rating: 5, comment: '', images: [] });
    setReviewError('');
  };

  const handleReviewImageChange = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 5);
    setReviewForm(prev => ({ ...prev, images: files }));
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!selectedItem || !order) return;

    try {
      setReviewSubmitting(true);
      setReviewError('');
      let imageUrls = [];

      if (reviewForm.images.length > 0) {
        const uploadResult = await uploadService.uploadReviewImages(reviewForm.images, {
          productId: selectedItem.productId,
          orderId: order.id,
          orderItemId: selectedItem.id
        });
        imageUrls = uploadResult.imageUrls || [];
      }

      const result = await reviewService.createReview({
        productId: selectedItem.productId,
        orderId: order.id,
        orderItemId: selectedItem.id,
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment,
        images: imageUrls
      });

      setOrder(prev => ({
        ...prev,
        orderItems: prev.orderItems.map(item => (
          item.id === selectedItem.id
            ? { ...item, reviews: [{ id: result.review?.id, rating: result.review?.rating, createdAt: result.review?.createdAt }] }
            : item
        ))
      }));
      closeReviewModal();
    } catch (err) {
      setReviewError(err.message || 'Không thể gửi đánh giá.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const renderStars = (value, onChange = null) => (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;
        return (
          <button
            key={starValue}
            type="button"
            onClick={() => onChange?.(starValue)}
            className={`material-symbols-outlined text-[28px] ${starValue <= value ? 'text-accent-gold' : 'text-outline-variant'} ${onChange ? 'cursor-pointer hover:text-accent-gold' : 'cursor-default'}`}
          >
            {starValue <= value ? 'star' : 'star_outline'}
          </button>
        );
      })}
    </div>
  );

  if (loading) return <div className="p-10 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div><p className="text-on-surface-variant">Đang tải...</p></div>;
  if (!order) return (
    <div className="bg-surface-beige p-10 rounded-lg text-center flex flex-col items-center">
      <span className="material-symbols-outlined text-4xl text-outline-variant mb-4">search_off</span>
      <h4 className="font-label-lg text-label-lg text-primary mb-2">Không tìm thấy đơn hàng</h4>
      <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">Đơn hàng không tồn tại hoặc bạn không có quyền truy cập.</p>
      <Link to="/profile?tab=orders" className="inline-block px-8 py-3 bg-primary text-on-primary font-label-lg text-label-lg hover:bg-primary/90 transition-colors rounded">Quay lại danh sách</Link>
    </div>
  );

  return (
    <>
      <div className="border-b border-outline-variant/50 pb-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-3xl text-primary mb-2 flex items-center gap-3">
            Chi tiết đơn hàng #{order.orderCode}
            <span className="text-sm px-3 py-1 bg-surface-beige rounded-full uppercase tracking-wider font-bold text-accent-gold">{getStatusText(order.status)}</span>
          </h1>
          <p className="font-body-md text-on-surface-variant">Ngày đặt: {new Date(order.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
        </div>
        <Link to="/profile?tab=orders" className="inline-flex items-center gap-2 px-6 py-2.5 bg-surface-ivory border border-outline-variant/30 rounded-lg text-primary hover:bg-surface-beige transition-colors font-label-md">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Quay lại
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-start">
        <div className="space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-outline-variant/20 shadow-sm">
            <h3 className="font-label-lg text-primary uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-surface-beige pb-4">
              <span className="material-symbols-outlined text-xl">history</span> Lịch sử trạng thái
            </h3>
            <div className="relative pl-6 border-l-2 border-outline-variant/40 space-y-6 ml-2">
              {order.statusHistory?.map((history) => (
                <div key={history.id} className="relative">
                  <div className="absolute -left-[33px] top-1.5 w-4 h-4 rounded-full border-2 border-white bg-accent-gold shadow-sm"></div>
                  <div>
                    <div className="flex flex-wrap items-baseline gap-2 mb-1">
                      <p className="font-label-md text-primary font-bold uppercase tracking-wider">{getStatusText(history.toStatus)}</p>
                      <time className="text-xs text-on-surface-variant font-medium">• {new Date(history.createdAt).toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric'})}</time>
                    </div>
                    {history.cancelReason && (
                      <div className="mt-2 text-xs text-error bg-error-container/20 border border-error-container/30 p-2.5 rounded font-medium">
                        <span className="font-bold">Lý do hủy:</span> {history.cancelReason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 border-b border-surface-beige">
              <h3 className="font-label-lg text-primary uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">inventory_2</span> Sản phẩm đã đặt
              </h3>
            </div>
            <div className="p-0">
              <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-surface-ivory border-b border-surface-beige text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <div className="col-span-5">Sản phẩm</div>
                <div className="col-span-3 text-center">Đơn giá x Số lượng</div>
                <div className="col-span-2 text-right">Thành tiền</div>
                <div className="col-span-2 text-right">Đánh giá</div>
              </div>
              <div className="divide-y divide-surface-beige">
                {order.orderItems?.map(item => {
                  const rawImage = item?.product?.images?.find(img => img.isPrimary)?.imageUrl
                    || item?.product?.images?.[0]?.imageUrl
                    || item?.product?.imageUrl;
                  const imageUrl = getStaticFileUrl(rawImage) || 'https://placehold.co/80x80?text=SP';
                  const reviewed = item.reviews && item.reviews.length > 0;
                  return (
                    <div key={item.id} className="p-4 md:p-6 flex flex-col md:grid md:grid-cols-12 gap-4 items-center hover:bg-surface-bright transition-colors">
                      <div className="col-span-5 flex items-center gap-4 w-full">
                        <div className="w-20 h-20 bg-white rounded-lg flex-shrink-0 border border-outline-variant/20 overflow-hidden shadow-sm">
                          <img
                            src={imageUrl}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://placehold.co/80x80?text=SP';
                            }}
                          />
                        </div>
                        <div>
                          <p className="font-label-lg text-[15px] text-primary">{item.productName}</p>
                          <p className="text-xs text-on-surface-variant mt-1 md:hidden">
                            {Number(item.finalPrice ?? item.price).toLocaleString('vi-VN')} đ x {item.quantity}
                          </p>
                        </div>
                      </div>
                      <div className="col-span-3 w-full md:w-auto hidden md:block text-center">
                        <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap min-w-max font-medium text-primary bg-surface-ivory px-3 py-1.5 rounded-lg border border-surface-beige">
                          {Number(item.finalPrice ?? item.price).toLocaleString('vi-VN')} đ <span className="text-on-surface-variant">x</span> {item.quantity}
                        </span>
                      </div>
                      <div className="col-span-2 w-full md:w-auto flex justify-between md:block text-right border-t border-outline-variant/20 md:border-t-0 pt-3 md:pt-0">
                        <span className="md:hidden text-xs text-on-surface-variant uppercase tracking-wider font-bold">Thành tiền:</span>
                        <span className="font-bold text-[15px] text-accent-terracotta">{Number(item.subtotal).toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="col-span-2 w-full md:w-auto flex justify-end">
                        {reviewed ? (
                          <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-green-50 text-green-700 border border-green-100 text-sm font-label-md">
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            Đã đánh giá
                          </span>
                        ) : canReviewItem(item) ? (
                          <button onClick={() => openReviewModal(item)} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary hover:text-white transition-colors text-sm font-label-md">
                            <span className="material-symbols-outlined text-[18px]">rate_review</span>
                            Đánh giá
                          </button>
                        ) : (
                          <span className="text-xs text-on-surface-variant">Chưa thể đánh giá</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-outline-variant/20 shadow-sm">
            <h3 className="font-label-lg text-primary uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-surface-beige pb-4">
              <span className="material-symbols-outlined text-xl">local_shipping</span> Giao hàng
            </h3>
            <div className="space-y-5 font-body-sm">
              <div><p className="text-on-surface-variant text-[11px] mb-1 uppercase font-bold tracking-wider">Người nhận</p><p className="font-label-lg text-[15px] text-primary">{order.fullName}</p></div>
              <div><p className="text-on-surface-variant text-[11px] mb-1 uppercase font-bold tracking-wider">Điện thoại</p><p className="text-primary font-medium">{order.phone}</p></div>
              <div><p className="text-on-surface-variant text-[11px] mb-1 uppercase font-bold tracking-wider">Địa chỉ</p><p className="text-primary leading-relaxed font-medium">{order.address}</p></div>
              {order.note && <div><p className="text-on-surface-variant text-[11px] mb-2 uppercase font-bold tracking-wider">Ghi chú của bạn</p><p className="italic bg-surface-ivory p-3 rounded-lg border border-surface-beige text-primary break-words">{order.note}</p></div>}
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-2xl border border-outline-variant/20 shadow-sm bg-gradient-to-b from-white to-surface-ivory">
            <h3 className="font-label-lg text-primary uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-surface-beige pb-4">
              <span className="material-symbols-outlined text-xl">payments</span> Thanh toán
            </h3>
            <div className="space-y-4 font-body-sm mb-6 border-b border-outline-variant/30 pb-6">
              <div className="flex justify-between items-center"><span className="text-on-surface-variant font-medium">Phương thức:</span><span className="font-bold text-primary uppercase tracking-wider text-[10px] bg-surface-beige px-3 py-1.5 rounded-full border border-surface-container">{order.paymentMethod}</span></div>
              <div className="flex justify-between items-center"><span className="text-on-surface-variant font-medium">Tạm tính:</span><span className="font-semibold text-primary">{Number(order.totalAmount).toLocaleString('vi-VN')} đ</span></div>
              <div className="flex justify-between items-center"><span className="text-on-surface-variant font-medium">Phí giao hàng:</span><span className="font-semibold text-primary">Miễn phí</span></div>
            </div>
            <div className="flex justify-between items-end"><span className="font-label-lg text-primary uppercase tracking-wider">Tổng cộng</span><span className="font-headline-sm text-accent-terracotta text-2xl">{Number(order.totalAmount).toLocaleString('vi-VN')} đ</span></div>
          </div>
        </div>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleReviewSubmit} className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-surface-beige flex justify-between items-start gap-4">
              <div>
                <h3 className="font-display-lg text-2xl text-primary">Đánh giá sản phẩm</h3>
                <p className="text-on-surface-variant text-sm mt-1 line-clamp-2">{selectedItem.productName}</p>
              </div>
              <button type="button" onClick={closeReviewModal} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-label-lg text-primary mb-2">Số sao</label>
                {renderStars(reviewForm.rating, (rating) => setReviewForm(prev => ({ ...prev, rating })))}
              </div>
              <div>
                <label className="block text-sm font-label-lg text-primary mb-2">Bình luận</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                  rows="4"
                  maxLength="2000"
                  placeholder="Sản phẩm có đúng kỳ vọng của bạn không?"
                  className="w-full border border-outline-variant rounded-lg px-4 py-3 outline-none focus:border-primary bg-white"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                <span>{reviewForm.images.length > 0 ? `${reviewForm.images.length} ảnh đã chọn` : 'Thêm tối đa 5 ảnh'}</span>
                <input type="file" accept="image/*" multiple onChange={handleReviewImageChange} className="hidden" />
              </label>
              {reviewError && <div className="bg-error-container/30 text-error px-4 py-3 rounded-lg text-sm">{reviewError}</div>}
            </div>
            <div className="p-6 border-t border-surface-beige flex justify-end gap-3">
              <button type="button" onClick={closeReviewModal} className="px-5 py-2.5 border border-outline-variant rounded-lg text-primary hover:bg-surface-beige transition-colors">Hủy</button>
              <button type="submit" disabled={reviewSubmitting} className="px-6 py-2.5 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-60">
                {reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}