import React, { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { reviewService } from '../services/api/reviewService';
import { getStaticFileUrl } from '../utils/imageUtils';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [approval, setApproval] = useState('all');
  const [rating, setRating] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [page, limit, approval, rating]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await reviewService.getAdminReviews({ page, limit, search, approval, rating: rating || undefined });
      setReviews(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalItems(data.pagination?.total || 0);
    } catch (err) {
      setError(err.message || 'Lỗi tải danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async (review) => {
    try {
      const nextValue = !review.isApproved;
      await reviewService.updateReviewApproval(review.id, nextValue);
      setReviews(prev => prev.map(item => item.id === review.id ? { ...item, isApproved: nextValue } : item));
    } catch (err) {
      alert(err.message || 'Không thể cập nhật đánh giá');
    }
  };

  const renderStars = (value) => (
    <div className="flex items-center gap-0.5 text-accent-gold">
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className="material-symbols-outlined text-[18px]">
          {index < value ? 'star' : 'star_outline'}
        </span>
      ))}
    </div>
  );

  const getProductImage = (review) => {
    return review.product?.imageUrl || review.product?.images?.[0]?.imageUrl || 'https://placehold.co/80x80?text=SP';
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-[1400px] mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-display-lg text-4xl text-primary tracking-tight mb-2">Quản lý đánh giá</h1>
            <p className="text-on-surface-variant font-body-sm">Theo dõi và ẩn/hiện đánh giá sản phẩm từ khách hàng.</p>
          </div>
          <button onClick={fetchReviews} className="flex items-center gap-2 border border-outline-variant text-primary px-5 py-2.5 rounded shadow-sm hover:bg-surface-beige transition-colors font-label-md tracking-wider uppercase">
            <span className="material-symbols-outlined text-sm">refresh</span>
            Làm mới
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-[0_4px_24px_rgba(93,64,55,0.05)] flex flex-col lg:flex-row gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchReviews(); } }}
            placeholder="Tìm theo sản phẩm, khách hàng, nội dung..."
            className="border border-outline-variant/50 rounded-lg px-4 py-2 flex-1 outline-none focus:border-primary font-body-sm"
          />
          <select value={approval} onChange={(e) => { setApproval(e.target.value); setPage(1); }} className="border border-outline-variant/50 rounded-lg px-4 py-2 outline-none focus:border-primary font-body-sm">
            <option value="all">Tất cả trạng thái</option>
            <option value="approved">Đang hiển thị</option>
            <option value="hidden">Đã ẩn</option>
          </select>
          <select value={rating} onChange={(e) => { setRating(e.target.value); setPage(1); }} className="border border-outline-variant/50 rounded-lg px-4 py-2 outline-none focus:border-primary font-body-sm">
            <option value="">Tất cả sao</option>
            <option value="5">5 sao</option>
            <option value="4">4 sao</option>
            <option value="3">3 sao</option>
            <option value="2">2 sao</option>
            <option value="1">1 sao</option>
          </select>
          <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="border border-outline-variant/50 rounded-lg px-4 py-2 outline-none focus:border-primary font-body-sm">
            <option value={10}>10 dòng / trang</option>
            <option value={20}>20 dòng / trang</option>
            <option value={50}>50 dòng / trang</option>
          </select>
          <button onClick={() => { setPage(1); fetchReviews(); }} className="bg-primary text-white px-5 py-2 rounded-lg font-label-md">Tìm kiếm</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
        ) : error ? (
          <div className="bg-error-container text-on-error-container p-6 rounded-2xl">{error}</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">rate_review</span>
            <p className="text-on-surface-variant font-label-lg">Chưa có đánh giá nào.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(93,64,55,0.05)] overflow-hidden">
            <div className="overflow-x-auto p-2">
              <table className="w-full text-left font-body-sm">
                <thead className="bg-surface-ivory border-b border-surface-beige text-xs font-label-lg uppercase tracking-wider">
                  <tr>
                    <th className="p-5 font-semibold text-on-surface-variant">Sản phẩm</th>
                    <th className="p-5 font-semibold text-on-surface-variant">Khách hàng</th>
                    <th className="p-5 font-semibold text-on-surface-variant">Đánh giá</th>
                    <th className="p-5 font-semibold text-on-surface-variant">Nội dung</th>
                    <th className="p-5 font-semibold text-on-surface-variant text-center">Trạng thái</th>
                    <th className="p-5 font-semibold text-on-surface-variant text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-beige">
                  {reviews.map(review => (
                    <tr key={review.id} className="hover:bg-surface-beige/30 transition-colors align-top">
                      <td className="p-5 min-w-[260px]">
                        <div className="flex items-center gap-3">
                          <img src={getStaticFileUrl(getProductImage(review))} alt={review.product?.name} className="w-14 h-14 rounded-lg object-cover bg-surface-beige border border-outline-variant/30" />
                          <div>
                            <p className="font-label-lg text-primary line-clamp-2">{review.product?.name}</p>
                            <p className="text-xs text-on-surface-variant mt-1">Đơn: {review.order?.orderCode || review.orderId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 min-w-[200px]">
                        <p className="font-label-md text-primary">{review.user?.fullName || 'Khách hàng'}</p>
                        <p className="text-xs text-on-surface-variant mt-1">{review.user?.email}</p>
                        <p className="text-xs text-on-surface-variant mt-1">{new Date(review.createdAt).toLocaleString('vi-VN')}</p>
                      </td>
                      <td className="p-5">{renderStars(review.rating)}</td>
                      <td className="p-5 min-w-[320px] max-w-[460px]">
                        <p className="text-on-surface-variant whitespace-pre-line line-clamp-4">{review.comment || 'Không có bình luận.'}</p>
                        {review.images?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {review.images.map((imageUrl, index) => (
                              <a key={index} href={getStaticFileUrl(imageUrl)} target="_blank" rel="noreferrer">
                                <img src={getStaticFileUrl(imageUrl)} alt={`Review ${index + 1}`} className="w-12 h-12 rounded object-cover border border-outline-variant" />
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${review.isApproved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {review.isApproved ? 'Đang hiển thị' : 'Đã ẩn'}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        <button onClick={() => handleToggleApproval(review)} className="border border-outline-variant/50 px-4 py-2 rounded-lg text-primary hover:bg-surface-beige font-label-md">
                          {review.isApproved ? 'Ẩn' : 'Hiện'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-surface-beige flex flex-col md:flex-row justify-between items-center bg-surface-ivory gap-4">
              <div className="text-on-surface-variant font-body-sm">
                Hiển thị <span className="font-bold text-primary">{reviews.length}</span> trên tổng số <span className="font-bold text-primary">{totalItems}</span> đánh giá
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 border border-outline-variant/50 rounded hover:bg-surface-beige disabled:opacity-40 text-primary font-label-md">Trước</button>
                <span className="font-label-md text-primary mx-2">Trang {page} / {totalPages || 1}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 border border-outline-variant/50 rounded hover:bg-surface-beige disabled:opacity-40 text-primary font-label-md">Sau</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
