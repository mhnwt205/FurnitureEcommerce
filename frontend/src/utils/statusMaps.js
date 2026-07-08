export const CUSTOMER_ORDER_STATUS_STYLES = {
  pending: 'bg-[#fbf3db] text-[#956400] border-[#f1dfb5]',
  confirmed: 'bg-[#e1f3fe] text-[#1f6c9f] border-[#c8e6f6]',
  preparing: 'bg-[#f3eef8] text-[#6e4b86] border-[#e6d9ee]',
  shipping: 'bg-[#e9f4f8] text-[#2f6477] border-[#d4e7ee]',
  delivered: 'bg-[#edf3ec] text-[#346538] border-[#dbe8d8]',
  completed: 'bg-[#edf3ec] text-[#346538] border-[#dbe8d8]',
  cancelled: 'bg-[#fdebec] text-[#9f2f2d] border-[#f5d2d3]'
};

export const CUSTOMER_ORDER_STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy'
};

export const CUSTOMER_ORDER_LIST_STATUS_LABELS = {
  ...CUSTOMER_ORDER_STATUS_LABELS,
  preparing: 'Đang chuẩn bị hàng',
  shipping: 'Đang giao hàng',
  delivered: 'Đã giao hàng'
};

export const CUSTOMER_PAYMENT_STATUS_STYLES = {
  paid: 'bg-[#edf3ec] text-[#346538] border-[#dbe8d8]',
  unpaid: 'bg-[#fbf3db] text-[#956400] border-[#f1dfb5]',
  failed: 'bg-[#fdebec] text-[#9f2f2d] border-[#f5d2d3]',
  refunded: 'bg-[#f3eef8] text-[#6e4b86] border-[#e6d9ee]'
};

export const PAYMENT_STATUS_LABELS = {
  paid: 'Đã thanh toán',
  unpaid: 'Chưa thanh toán',
  failed: 'Thanh toán lỗi',
  refunded: 'Đã hoàn tiền'
};

export const ADMIN_PAYMENT_STATUS_STYLES = {
  paid: 'bg-green-100 text-green-800 border-green-200',
  unpaid: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  refunded: 'bg-purple-100 text-purple-800 border-purple-200'
};

export const ADMIN_ORDER_STATUS_CLASSES = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 text-yellow-600',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200 text-blue-600',
  preparing: 'bg-purple-100 text-purple-800 border-purple-200 text-purple-600',
  shipping: 'bg-sky-100 text-sky-800 border-sky-200 text-sky-600',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200 text-emerald-600',
  completed: 'bg-green-100 text-green-800 border-green-200 text-green-600',
  cancelled: 'bg-red-100 text-red-800 border-red-200 text-red-600'
};

export const ADMIN_ORDER_CHART_COLORS = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  preparing: '#8B5CF6',
  shipping: '#0EA5E9',
  delivered: '#10B981',
  completed: '#059669',
  cancelled: '#EF4444'
};

export const ADMIN_ORDER_STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy'
};

export const ADMIN_ORDER_STATUS_BADGE_CLASSES = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  shipping: 'bg-sky-100 text-sky-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

export const CONSULTATION_STATUS_OPTIONS = [
  { value: 'new', label: 'Mới' },
  { value: 'contacted', label: 'Đã liên hệ' },
  { value: 'consulting', label: 'Đang tư vấn' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' }
];

export const CONSULTATION_STATUS_CLASSES = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  contacted: 'bg-amber-100 text-amber-800 border-amber-200',
  consulting: 'bg-purple-100 text-purple-800 border-purple-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200'
};

export const PROMOTION_STATUS_OPTIONS = [
  { value: 'draft', label: 'Bản nháp' },
  { value: 'scheduled', label: 'Đã lên lịch' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'expired', label: 'Đã hết hạn' },
  { value: 'disabled', label: 'Đã tắt' }
];

export const PROMOTION_STATUS_CLASSES = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  active: 'bg-green-100 text-green-700 border-green-200',
  expired: 'bg-amber-100 text-amber-700 border-amber-200',
  disabled: 'bg-red-100 text-red-700 border-red-200'
};

export const defaultCustomerStatusClass = 'bg-[#f3f3f3] text-[#555555] border-[#e5e5e5]';
export const defaultAdminStatusClass = 'bg-gray-100 text-gray-800 border-gray-200';

export const getCustomerOrderStatusText = (status) => CUSTOMER_ORDER_STATUS_LABELS[status] || status;
export const getCustomerOrderStatusClass = (status) => CUSTOMER_ORDER_STATUS_STYLES[status] || defaultCustomerStatusClass;
export const getCustomerOrderStatusBadge = (status) => ({ text: getCustomerOrderStatusText(status), color: getCustomerOrderStatusClass(status) });
export const getCustomerOrderListStatusBadge = (status) => ({
  text: CUSTOMER_ORDER_LIST_STATUS_LABELS[status] || status,
  color: getCustomerOrderStatusClass(status)
});

export const getCustomerPaymentStatusBadge = (status) => ({
  text: PAYMENT_STATUS_LABELS[status] || status,
  color: CUSTOMER_PAYMENT_STATUS_STYLES[status] || defaultCustomerStatusClass
});

export const getAdminPaymentStatusBadge = (status) => ({
  text: PAYMENT_STATUS_LABELS[status] || status,
  color: ADMIN_PAYMENT_STATUS_STYLES[status] || defaultAdminStatusClass
});

export const getAdminOrderStatusColorClass = (status) => ADMIN_ORDER_STATUS_BADGE_CLASSES[status] || 'bg-gray-100 text-gray-800';

export const getConsultationStatusLabel = (status) => CONSULTATION_STATUS_OPTIONS.find(item => item.value === status)?.label || status || 'Không rõ';
export const getPromotionStatusLabel = (status) => PROMOTION_STATUS_OPTIONS.find(item => item.value === status)?.label || status || '-';
