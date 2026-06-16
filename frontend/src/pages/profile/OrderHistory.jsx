import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../../services/api/orderService';
import { getStaticFileUrl } from '../../utils/imageUtils';

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await orderService.getMyOrders();
      setOrders(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-accent-gold/10 text-accent-gold';
      case 'confirmed': return 'bg-primary/10 text-primary';
      case 'shipping': return 'bg-accent-terracotta/10 text-accent-terracotta';
      case 'completed': return 'bg-surface-container-highest text-on-surface-variant';
      case 'cancelled': return 'bg-error-container/20 text-error';
      default: return 'bg-surface-container-highest text-on-surface-variant';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Chờ xác nhận';
      case 'confirmed': return 'Đã xác nhận';
      case 'preparing': return 'Đang chuẩn bị';
      case 'shipping': return 'Đang giao';
      case 'completed': return 'Hoàn thành';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  if (loading) return <div>Đang tải...</div>;

  return (
    <>
      <div className="border-b border-outline-variant pb-8">
        <h1 className="font-display-lg text-display-lg text-primary mb-2">Lịch sử đơn hàng</h1>
        <p className="font-body-md text-on-surface-variant">Quản lý và theo dõi trạng thái các đơn hàng của bạn.</p>
      </div>

      <div className="pt-8 space-y-4">
        {orders.length === 0 ? (
          <div className="bg-surface-beige p-10 rounded-lg text-center">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-4">receipt_long</span>
            <h4 className="font-label-lg text-label-lg text-primary mb-2">Bạn chưa có đơn hàng nào</h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">Khám phá các sản phẩm nội thất cao cấp của chúng tôi.</p>
            <Link to="/products" className="inline-block px-8 py-3 bg-primary text-on-primary font-label-lg text-label-lg hover:bg-primary/90 transition-colors rounded">Mua sắm ngay</Link>
          </div>
        ) : (
          orders.map(order => {
            const firstItem = order.orderItems?.[0];
            const rawImage = firstItem?.product?.images?.find(img => img.isPrimary)?.imageUrl 
                             || firstItem?.product?.images?.[0]?.imageUrl 
                             || firstItem?.product?.imageUrl;
            const imageUrl = getStaticFileUrl(rawImage) || 'https://placehold.co/100x120?text=SP';

            return (
              <Link 
                key={order.id}
                to={`/profile/orders/${order.id}`}
                className="group bg-white hover:bg-surface-ivory transition-all duration-300 p-6 rounded-2xl border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between cursor-pointer gap-6 shadow-sm hover:shadow-md"
              >
                <div className="flex gap-6 items-center">
                  <div className="w-20 h-24 bg-surface-beige rounded-xl overflow-hidden flex-shrink-0 border border-outline-variant/20 shadow-sm">
                    <img 
                      src={imageUrl} 
                      alt="Order item" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://placehold.co/100x120?text=SP';
                      }}
                    />
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-label-lg text-lg text-primary font-bold">#{order.orderCode}</p>
                      <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <p className="font-body-sm text-sm text-on-surface-variant mb-2">
                      Ngày đặt: <span className="font-medium text-primary">{new Date(order.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                    <p className="font-body-sm text-sm text-on-surface-variant">
                      Sản phẩm: <span className="font-medium text-primary">{firstItem?.productName || 'Sản phẩm'} {order.orderItems?.length > 1 ? `và ${order.orderItems.length - 1} sản phẩm khác` : ''}</span>
                    </p>
                  </div>
                </div>
                <div className="text-left md:text-right flex flex-row md:flex-col justify-between items-center md:items-end w-full md:w-auto border-t md:border-t-0 md:border-l border-outline-variant/30 pt-4 md:pt-0 md:pl-6 mt-2 md:mt-0">
                  <div className="flex flex-col md:items-end">
                    <span className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-1">Tổng cộng</span>
                    <p className="font-headline-sm text-xl text-accent-terracotta">
                      {Number(order.totalAmount).toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                  <div className="text-primary font-label-sm text-sm flex items-center gap-1 group-hover:text-accent-gold transition-colors mt-2">
                    Xem chi tiết <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </>
  );
}
