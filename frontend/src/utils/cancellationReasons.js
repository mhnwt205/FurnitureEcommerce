export const CANCELLATION_REASON_OPTIONS = [
  { code: 'wrong_item', label: 'Đặt nhầm sản phẩm' },
  { code: 'change_address', label: 'Muốn thay đổi địa chỉ nhận hàng' },
  { code: 'change_payment_method', label: 'Muốn thay đổi phương thức thanh toán' },
  { code: 'delivery_time_unsuitable', label: 'Thời gian giao hàng không phù hợp' },
  { code: 'no_longer_needed', label: 'Không còn nhu cầu' },
  { code: 'other', label: 'Lý do khác' }
];

export const CANCELLATION_REASON_LABELS = CANCELLATION_REASON_OPTIONS.reduce((acc, item) => {
  acc[item.code] = item.label;
  return acc;
}, {});

export const CANCELLATION_ACTOR_LABELS = {
  customer: 'Khách hàng',
  guest: 'Khách vãng lai',
  admin: 'Quản trị viên',
  staff: 'Nhân viên',
  system: 'Hệ thống'
};
