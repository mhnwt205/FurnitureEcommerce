import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../../services/api/orderService';
import { getStaticFileUrl } from '../../utils/imageUtils';

const statusStyles = {
  pending: 'bg-[#fbf3db] text-[#956400] border-[#f1dfb5]',
  confirmed: 'bg-[#e1f3fe] text-[#1f6c9f] border-[#c8e6f6]',
  preparing: 'bg-[#f3eef8] text-[#6e4b86] border-[#e6d9ee]',
  shipping: 'bg-[#e9f4f8] text-[#2f6477] border-[#d4e7ee]',
  delivered: 'bg-[#edf3ec] text-[#346538] border-[#dbe8d8]',
  completed: 'bg-[#edf3ec] text-[#346538] border-[#dbe8d8]',
  cancelled: 'bg-[#fdebec] text-[#9f2f2d] border-[#f5d2d3]'
};

function getStatusColor(status) { return statusStyles[status] || 'bg-[#f3f3f3] text-[#555555] border-[#e5e5e5]'; }
function getStatusText(status) {
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
}
function OrderThumb({ src, alt }) {
  if (!src) return <div className="flex h-full w-full items-center justify-center bg-[#f3f3f1] text-[#999999]"><span className="material-symbols-outlined text-2xl">inventory_2</span></div>;
  return <img src={src} alt={alt} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />;
}

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const data = await orderService.getMyOrders();
      setOrders(data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="space-y-4">{[0, 1, 2].map(item => <div key={item} className="ui-skeleton h-28 rounded-[12px]" />)}</div>;

  return (
    <>
      <div className="border-b border-[#eeeeee] pb-6"><h2 className="text-2xl font-bold text-[#333333]">Lịch sử đơn hàng</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#777777]">Quản lý và theo dõi trạng thái các đơn hàng của bạn.</p></div>
      <div className="pt-6">
        {orders.length === 0 ? (
          <div className="ui-empty-state"><span className="material-symbols-outlined mb-3 block text-4xl text-[#999999]">receipt_long</span><h4 className="text-base font-bold text-[#333333]">Bạn chưa có đơn hàng nào</h4><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777777]">Khám phá các sản phẩm nội thất hiện có và quay lại đây để theo dõi đơn hàng.</p><Link to="/products" className="ui-button-primary mt-5 inline-flex px-5 py-2.5 text-sm">Mua sắm ngay</Link></div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const firstItem = order.orderItems?.[0];
              const rawImage = firstItem?.product?.images?.find(img => img.isPrimary)?.imageUrl || firstItem?.product?.images?.[0]?.imageUrl || firstItem?.product?.imageUrl;
              const imageUrl = rawImage ? getStaticFileUrl(rawImage) : '';
              return (
                <Link key={order.id} to={`/profile/orders/${order.id}`} className="group block rounded-[12px] border border-[#e5e5e5] bg-white p-4 transition-colors duration-200 hover:border-[#bfa37c] hover:bg-[#fafaf8]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 gap-4"><div className="h-20 w-20 shrink-0 overflow-hidden rounded-[10px] border border-[#eeeeee] bg-[#f6f6f4]"><OrderThumb src={imageUrl} alt={firstItem?.productName || 'Sản phẩm'} /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-[#333333]">#{order.orderCode || order.id}</p><span className={`inline-flex rounded-[6px] border px-2 py-1 text-[11px] font-bold ${getStatusColor(order.status)}`}>{getStatusText(order.status)}</span></div><p className="mt-2 text-sm text-[#777777]">Ngày đặt: <span className="font-medium text-[#434343]">{new Date(order.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></p><p className="mt-1 line-clamp-1 text-sm text-[#777777]">Sản phẩm: <span className="font-medium text-[#434343]">{firstItem?.productName || 'Sản phẩm'} {order.orderItems?.length > 1 ? `và ${order.orderItems.length - 1} sản phẩm khác` : ''}</span></p></div></div>
                    <div className="flex items-end justify-between gap-4 border-t border-[#eeeeee] pt-4 md:block md:border-t-0 md:pt-0 md:text-right"><div><p className="text-xs font-semibold text-[#777777]">Tổng cộng</p><p className="mt-1 text-lg font-bold text-[#b94732]">{Number(order.totalAmount).toLocaleString('vi-VN')} đ</p></div><span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#333333] transition-colors group-hover:text-[#bfa37c]">Xem chi tiết <span className="material-symbols-outlined text-[16px]">arrow_forward</span></span></div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}