import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { orderService } from '../services/api/orderService';
import { paymentService } from '../services/api/paymentService';
import { getProductImage } from '../utils/imageUtils';
import { formatPrice } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

const copy = {
  brand: 'Heritage Home',
  subtitle: 'Checkout',
  backStore: 'Quay l\u1ea1i c\u1eeda h\u00e0ng',
  checkoutTitle: 'Thanh to\u00e1n',
  account: 'T\u00e0i kho\u1ea3n',
  signedIn: '\u0110ang \u0111\u0103ng nh\u1eadp',
  signedInHint: 'Th\u00f4ng tin t\u00e0i kho\u1ea3n \u0111\u01b0\u1ee3c l\u1ea5y t\u1eeb phi\u00ean \u0111\u0103ng nh\u1eadp hi\u1ec7n t\u1ea1i.',
  shippingInfo: 'Th\u00f4ng tin giao h\u00e0ng',
  fullName: 'H\u1ecd v\u00e0 t\u00ean',
  email: 'Email',
  phone: 'S\u1ed1 \u0111i\u1ec7n tho\u1ea1i',
  address: '\u0110\u1ecba ch\u1ec9 chi ti\u1ebft',
  note: 'Ghi ch\u00fa',
  fullNamePlaceholder: 'Nh\u1eadp h\u1ecd v\u00e0 t\u00ean',
  phonePlaceholder: '0901 234 567',
  addressPlaceholder: 'S\u1ed1 nh\u00e0, t\u00ean \u0111\u01b0\u1eddng, ph\u01b0\u1eddng/x\u00e3...',
  notePlaceholder: 'Th\u1eddi gian nh\u1eadn h\u00e0ng ho\u1eb7c l\u01b0u \u00fd cho \u0111\u01a1n h\u00e0ng',
  shippingMethod: 'Ph\u01b0\u01a1ng th\u1ee9c giao h\u00e0ng',
  shippingNeutral: 'Nh\u1eadp \u0111\u1ecba ch\u1ec9 \u0111\u1ec3 x\u00e1c nh\u1eadn ph\u01b0\u01a1ng th\u1ee9c giao h\u00e0ng ph\u00f9 h\u1ee3p.',
  shippingPending: 'Ph\u00ed v\u00e0 th\u1eddi gian giao h\u00e0ng s\u1ebd \u0111\u01b0\u1ee3c x\u00e1c nh\u1eadn khi \u0111\u1eb7t h\u00e0ng.',
  paymentMethod: 'Ph\u01b0\u01a1ng th\u1ee9c thanh to\u00e1n',
  vnpayTitle: 'Thanh to\u00e1n VNPay',
  vnpayDesc: 'Thanh to\u00e1n an to\u00e0n qua c\u1ed5ng VNPay.',
  codTitle: 'Thanh to\u00e1n khi nh\u1eadn h\u00e0ng (COD)',
  codDesc: 'Thanh to\u00e1n b\u1eb1ng ti\u1ec1n m\u1eb7t khi nh\u1eadn h\u00e0ng.',
  cart: 'Gi\u1ecf h\u00e0ng',
  products: 's\u1ea3n ph\u1ea9m',
  product: 's\u1ea3n ph\u1ea9m',
  total: 'T\u1ed5ng',
  quantity: 'S\u1ed1 l\u01b0\u1ee3ng',
  remove: 'X\u00f3a',
  promotion: 'Khuy\u1ebfn m\u00e3i',
  autoPromotion: '\u01afu \u0111\u00e3i s\u1ea3n ph\u1ea9m \u0111\u01b0\u1ee3c \u00e1p d\u1ee5ng t\u1ef1 \u0111\u1ed9ng n\u1ebfu c\u00f3.',
  summary: 'T\u00f3m t\u1eaft \u0111\u01a1n h\u00e0ng',
  subtotal: 'T\u1ea1m t\u00ednh',
  totalPayment: 'T\u1ed5ng thanh to\u00e1n',
  vat: '\u0110\u00e3 bao g\u1ed3m VAT',
  updatingPrice: '\u0110ang c\u1eadp nh\u1eadt gi\u00e1 m\u1edbi nh\u1ea5t...',
  priceWarning: 'Kh\u00f4ng th\u1ec3 c\u1eadp nh\u1eadt gi\u00e1 m\u1edbi nh\u1ea5t. Gi\u00e1 cu\u1ed1i c\u00f9ng s\u1ebd \u0111\u01b0\u1ee3c ki\u1ec3m tra l\u1ea1i khi \u0111\u1eb7t h\u00e0ng.',
  priceWarningSubmit: 'Kh\u00f4ng th\u1ec3 c\u1eadp nh\u1eadt gi\u00e1 m\u1edbi nh\u1ea5t. Backend s\u1ebd t\u00ednh l\u1ea1i gi\u00e1 khi \u0111\u1eb7t h\u00e0ng.',
  createOrderError: 'L\u1ed7i t\u1ea1o \u0111\u01a1n h\u00e0ng',
  vnpayUrlError: 'Kh\u00f4ng th\u1ec3 t\u1ea1o URL thanh to\u00e1n VNPay',
  orderError: 'C\u00f3 l\u1ed7i x\u1ea3y ra khi \u0111\u1eb7t h\u00e0ng',
  processing: '\u0110ang x\u1eed l\u00fd...',
  payVnpay: 'Thanh to\u00e1n VNPay',
  placeOrder: '\u0110\u1eb7t h\u00e0ng',
  secure: 'Thanh to\u00e1n an to\u00e0n v\u00e0 b\u1ea3o m\u1eadt',
  emptyTitle: 'Gi\u1ecf h\u00e0ng c\u1ee7a b\u1ea1n \u0111ang tr\u1ed1ng',
  emptyText: 'H\u00e3y quay l\u1ea1i danh s\u00e1ch s\u1ea3n ph\u1ea9m \u0111\u1ec3 ch\u1ecdn m\u00f3n ph\u00f9 h\u1ee3p cho kh\u00f4ng gian c\u1ee7a b\u1ea1n.',
  continueShopping: 'Ti\u1ebfp t\u1ee5c mua s\u1eafm',
  decrease: 'Gi\u1ea3m s\u1ed1 l\u01b0\u1ee3ng',
  increase: 'T\u0103ng s\u1ed1 l\u01b0\u1ee3ng'
};

const getCartImageUrl = (item) => getProductImage(item, null);

const getUserLabel = (user) => user?.fullName || user?.name || user?.email || copy.signedIn;

function CartImage({ item, className = '' }) {
  const imageUrl = getCartImageUrl(item);

  if (!imageUrl) {
    return (
      <div className={`grid place-items-center bg-[#f7f7f7] text-[#aaa] ${className}`}>
        <span className="material-symbols-outlined text-[24px]" aria-hidden="true">image_not_supported</span>
      </div>
    );
  }

  return <img src={imageUrl} alt={item.name} className={`bg-[#f7f7f7] object-cover ${className}`} loading="lazy" decoding="async" />;
}

function CheckoutCard({ title, children, className = '', right }) {
  return (
    <section className={`rounded-[12px] border border-[#e5e5e5] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold leading-5 text-[#333333]">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-[12px] font-semibold text-[#555555]">{label}</span>
      {children}
    </label>
  );
}

function PaymentOption({ value, title, description, paymentMethod, onChange }) {
  const selected = paymentMethod === value;

  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-[8px] border px-3.5 py-3 transition-colors duration-200 ${selected ? 'border-[#333333] bg-[#fafafa]' : 'border-[#dddddd] bg-white hover:border-[#999999]'}`}>
      <input name="payment" type="radio" value={value} checked={selected} onChange={onChange} className="mt-1 h-4 w-4 accent-[#333333]" />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold leading-5 text-[#333333]">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-5 text-[#777777]">{description}</span>
      </span>
    </label>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const { cartItems, cartCount, cartTotal, getCartItemUnitPrice, refreshCartPricing, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user: currentUser, authStatus, isAuthenticated, refreshSession } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    note: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshingPricing, setRefreshingPricing] = useState(false);
  const [pricingWarning, setPricingWarning] = useState(null);

  const isGuestCheckout = authStatus === 'unauthenticated';
  const isLoggedInCheckout = isAuthenticated && authStatus === 'authenticated';

  const hasItemDiscount = cartItems.some(item => {
    const basePrice = Number(item.originalPrice ?? item.price ?? 0);
    const unitPrice = getCartItemUnitPrice(item);
    return Boolean(item.hasPromotion || Number(item.discountAmount || 0) > 0 || (basePrice > 0 && unitPrice > 0 && unitPrice < basePrice));
  });

  useEffect(() => {
    if (authStatus === 'initializing' || authStatus === 'unavailable') return;

    const refreshPricing = async () => {
      try {
        setRefreshingPricing(true);
        setPricingWarning(null);
        await refreshCartPricing();
      } catch (error) {
        setPricingWarning(copy.priceWarning);
      } finally {
        setRefreshingPricing(false);
      }
    };
    refreshPricing();

    if (isLoggedInCheckout && currentUser) {
      setFormData(prev => ({
        ...prev,
        fullName: currentUser.fullName || prev.fullName,
        email: currentUser.email || '',
        phone: currentUser.phone || prev.phone,
        address: currentUser.address || prev.address
      }));
    }
  }, [authStatus, isLoggedInCheckout, currentUser]);
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOrder = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0 || loading || authStatus === 'initializing') return;

    if (authStatus === 'unavailable') {
      setError('Khong the xac minh trang thai phien. Vui long thu lai khi ket noi on dinh.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      try {
        setRefreshingPricing(true);
        setPricingWarning(null);
        await refreshCartPricing();
      } catch (refreshError) {
        setPricingWarning(copy.priceWarningSubmit);
      } finally {
        setRefreshingPricing(false);
      }

      const orderPayload = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        note: formData.note.trim(),
        paymentMethod: paymentMethod,
        items: cartItems.map(item => ({
          productId: parseInt(item.id, 10),
          quantity: parseInt(item.quantity, 10)
        }))
      };

      if (isGuestCheckout) {
        orderPayload.email = formData.email.trim().toLowerCase();
      }

      const resultOrder = await orderService.createOrder(orderPayload);
      if (!resultOrder || !resultOrder.order || !resultOrder.order.id) {
        setError(copy.createOrderError);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: copy.createOrderError } }));
        return;
      }

      if (paymentMethod === 'VNPAY') {
        if (resultOrder.customerType === 'guest') {
          if (resultOrder.paymentUrl) {
            window.location.href = resultOrder.paymentUrl;
            return;
          }
          const orderCode = resultOrder.order?.orderCode ? ` Mã đơn: ${resultOrder.order.orderCode}.` : '';
          const message = `Đơn hàng đã được tạo nhưng chưa thể mở cổng thanh toán.${orderCode}`;
          setError(message);
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { message } }));
          return;
        }

        const resultVnpay = await paymentService.createVnpayUrl({ orderId: resultOrder.order.id });
        if (resultVnpay.success && resultVnpay.paymentUrl) {
          window.location.href = resultVnpay.paymentUrl;
          return;
        }

        setError(copy.vnpayUrlError);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: copy.vnpayUrlError } }));
        return;
      }

      clearCart();
      navigate('/order-success', {
        state: {
          order: resultOrder.order,
          customerType: resultOrder.customerType
        }
      });
    } catch (err) {
      setError(err.message || copy.orderError);
    } finally {
      setLoading(false);
    }
  };
  if (authStatus === 'initializing') {
    return (
      <main className="min-h-screen bg-[#f6f6f6] px-4 py-6 text-[#333333]">
        <div className="mx-auto w-full max-w-[980px]">
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="text-[24px] font-bold tracking-[-0.02em] text-[#333333]">{copy.brand}</Link>
            <Link to="/products" className="text-[13px] font-semibold text-[#666666] transition-colors hover:text-[#333333]">{copy.backStore}</Link>
          </div>
          <section className="mx-auto mt-20 w-full max-w-[460px] rounded-[12px] border border-[#e5e5e5] bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#dddddd] border-t-[#333333]" />
            <p className="mt-5 text-[14px] font-semibold text-[#333333]">Đang xác minh phiên đăng nhập...</p>
          </section>
        </div>
      </main>
    );
  }

  if (authStatus === 'unavailable') {
    return (
      <main className="min-h-screen bg-[#f6f6f6] px-4 py-6 text-[#333333]">
        <div className="mx-auto w-full max-w-[980px]">
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="text-[24px] font-bold tracking-[-0.02em] text-[#333333]">{copy.brand}</Link>
            <Link to="/products" className="text-[13px] font-semibold text-[#666666] transition-colors hover:text-[#333333]">{copy.backStore}</Link>
          </div>
          <section className="mx-auto mt-20 w-full max-w-[460px] rounded-[12px] border border-[#e5e5e5] bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <span className="material-symbols-outlined text-[40px] text-[#999999]">cloud_off</span>
            <h1 className="mt-5 text-[20px] font-bold text-[#333333]">Khong the xac minh phien</h1>
            <p className="mt-2 text-[13px] leading-6 text-[#777777]">Vui long thu lai khi ket noi toi may chu on dinh.</p>
            <button type="button" onClick={refreshSession} className="mt-6 inline-flex h-10 items-center justify-center rounded-[6px] bg-[#333333] px-5 text-[13px] font-bold text-white hover:bg-[#111111]">
              Thu lai
            </button>
          </section>
        </div>
      </main>
    );
  }
  if (cartItems.length === 0) {
    return (
      <main className="min-h-screen bg-[#f6f6f6] px-4 py-6 text-[#333333]">
        <div className="mx-auto w-full max-w-[980px]">
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="text-[24px] font-bold tracking-[-0.02em] text-[#333333]">{copy.brand}</Link>
            <Link to="/products" className="text-[13px] font-semibold text-[#666666] transition-colors hover:text-[#333333]">{copy.backStore}</Link>
          </div>
          <section className="mx-auto mt-20 w-full max-w-[460px] rounded-[12px] border border-[#e5e5e5] bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-[10px] border border-[#e5e5e5] bg-[#fafafa] text-[#777777]">
              <span className="material-symbols-outlined text-[30px]" aria-hidden="true">shopping_cart</span>
            </div>
            <h1 className="mt-5 text-[22px] font-bold leading-8 text-[#333333]">{copy.emptyTitle}</h1>
            <p className="mx-auto mt-2 max-w-[340px] text-[13px] leading-6 text-[#777777]">{copy.emptyText}</p>
            <Link to="/products" className="mt-7 inline-flex h-11 items-center justify-center rounded-[6px] bg-[#333333] px-7 text-[13px] font-bold text-white transition-colors hover:bg-[#111111]">
              {copy.continueShopping}
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f6f6] px-4 py-5 text-[#333333] md:py-7">
      <div className="mx-auto w-full max-w-[980px]">
        <header className="mb-5 flex items-center justify-between gap-4">
          <Link to="/" className="text-[26px] font-bold tracking-[-0.03em] text-[#333333]">{copy.brand}</Link>
          <Link to="/products" className="text-[13px] font-semibold text-[#666666] transition-colors hover:text-[#333333]">{copy.backStore}</Link>
        </header>

        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#888888]">{copy.subtitle}</p>
            <h1 className="mt-1 text-[24px] font-bold leading-8 text-[#333333]">{copy.checkoutTitle}</h1>
          </div>
          <span className="hidden text-[13px] font-medium text-[#777777] sm:block">{cartCount} {copy.products}</span>
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,58%)_minmax(320px,42%)]">
          <div className="space-y-4">
            <CheckoutCard title={copy.account}>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#333333] text-[14px] font-bold uppercase text-white">
                  {isGuestCheckout ? 'G' : getUserLabel(currentUser).charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-[#333333]">{isGuestCheckout ? 'Thanh toán với tư cách khách' : getUserLabel(currentUser)}</p>
                  {isGuestCheckout ? (
                    <p className="text-[12px] leading-5 text-[#777777]">Bạn không cần tạo tài khoản. <Link to="/login" className="font-semibold text-[#333333] underline underline-offset-2">Đăng nhập</Link> nếu muốn dùng thông tin đã lưu.</p>
                  ) : currentUser?.email ? (
                    <p className="truncate text-[12px] text-[#777777]">{currentUser.email}</p>
                  ) : (
                    <p className="text-[12px] text-[#777777]">{copy.signedInHint}</p>
                  )}
                </div>
              </div>
            </CheckoutCard>
            <CheckoutCard title={copy.shippingInfo}>
              <form id="checkout-form" onSubmit={handleOrder} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={copy.fullName} className="sm:col-span-2">
                  <input required name="fullName" value={formData.fullName} onChange={handleInputChange} className="h-11 w-full rounded-[7px] border border-[#dddddd] bg-white px-3 text-[13px] text-[#333333] outline-none transition-colors placeholder:text-[#aaaaaa] focus:border-[#333333]" placeholder={copy.fullNamePlaceholder} type="text" />
                </Field>
                <Field label={isLoggedInCheckout ? 'Email tài khoản' : copy.email}>
                  <input required name="email" value={formData.email} onChange={handleInputChange} readOnly={isLoggedInCheckout} aria-readonly={isLoggedInCheckout} className={`h-11 w-full rounded-[7px] border border-[#dddddd] px-3 text-[13px] text-[#333333] outline-none transition-colors placeholder:text-[#aaaaaa] focus:border-[#333333] ${isLoggedInCheckout ? 'bg-[#f5f5f5] text-[#666666] cursor-not-allowed' : 'bg-white'}`} placeholder="example@gmail.com" type="email" />
                </Field>
                <Field label={copy.phone}>
                  <input required name="phone" value={formData.phone} onChange={handleInputChange} className="h-11 w-full rounded-[7px] border border-[#dddddd] bg-white px-3 text-[13px] text-[#333333] outline-none transition-colors placeholder:text-[#aaaaaa] focus:border-[#333333]" placeholder={copy.phonePlaceholder} type="tel" />
                </Field>
                <Field label={copy.address} className="sm:col-span-2">
                  <input required name="address" value={formData.address} onChange={handleInputChange} className="h-11 w-full rounded-[7px] border border-[#dddddd] bg-white px-3 text-[13px] text-[#333333] outline-none transition-colors placeholder:text-[#aaaaaa] focus:border-[#333333]" placeholder={copy.addressPlaceholder} type="text" />
                </Field>
                <Field label={copy.note} className="sm:col-span-2">
                  <textarea name="note" value={formData.note} onChange={handleInputChange} className="min-h-[82px] w-full resize-y rounded-[7px] border border-[#dddddd] bg-white px-3 py-2.5 text-[13px] text-[#333333] outline-none transition-colors placeholder:text-[#aaaaaa] focus:border-[#333333]" placeholder={copy.notePlaceholder} />
                </Field>
              </form>
            </CheckoutCard>

            <CheckoutCard title={copy.shippingMethod}>
              <div className="rounded-[8px] border border-dashed border-[#d8d8d8] bg-[#fafafa] px-3.5 py-3 text-[13px] leading-5 text-[#777777]">
                {formData.address ? copy.shippingPending : copy.shippingNeutral}
              </div>
            </CheckoutCard>

            <CheckoutCard title={copy.paymentMethod}>
              <div className="space-y-2.5">
                <PaymentOption value="VNPAY" title={copy.vnpayTitle} description={copy.vnpayDesc} paymentMethod={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
                <PaymentOption value="COD" title={copy.codTitle} description={copy.codDesc} paymentMethod={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
              </div>
            </CheckoutCard>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <CheckoutCard title={copy.cart} right={<span className="text-[12px] font-semibold text-[#777777]">{cartCount} {copy.products}</span>}>
              <div className="max-h-[300px] space-y-3 overflow-y-auto pr-1">
                {cartItems.map(item => {
                  const unitPrice = getCartItemUnitPrice(item);
                  return (
                    <article key={item.id} className="grid grid-cols-[64px_1fr] gap-3 rounded-[8px] border border-[#eeeeee] p-2.5">
                      <Link to={`/products/${item.id}`} className="relative aspect-square overflow-hidden rounded-[6px] bg-[#f7f7f7]">
                        <CartImage item={item} className="h-full w-full" />
                        <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-[5px] bg-[#333333] px-1 text-[11px] font-bold text-white">{item.quantity}</span>
                      </Link>
                      <div className="min-w-0">
                        <Link to={`/products/${item.id}`} className="line-clamp-2 text-[13px] font-bold leading-5 text-[#333333] transition-colors hover:text-[#111111]">{item.name}</Link>
                        {item.category?.name && <p className="mt-0.5 truncate text-[12px] text-[#777777]">{item.category.name}</p>}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[13px] font-bold text-[#333333]">{formatPrice(unitPrice * item.quantity)}</span>
                          <button type="button" onClick={() => removeFromCart(item.id)} className="text-[12px] font-semibold text-[#888888] transition-colors hover:text-[#c33924]">{copy.remove}</button>
                        </div>
                        <div className="mt-2 inline-flex h-8 items-center rounded-[6px] border border-[#dddddd] bg-white">
                          <button type="button" onClick={() => updateQuantity(item.id, -1)} aria-label={`${copy.decrease} ${item.name}`} className="grid h-full w-8 place-items-center text-[#555555] hover:bg-[#f6f6f6]">
                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">remove</span>
                          </button>
                          <span className="grid h-full min-w-[34px] place-items-center border-x border-[#dddddd] px-2 text-[12px] font-bold text-[#333333]">{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.id, 1)} aria-label={`${copy.increase} ${item.name}`} className="grid h-full w-8 place-items-center text-[#555555] hover:bg-[#f6f6f6]">
                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </CheckoutCard>

            {hasItemDiscount && (
              <CheckoutCard title={copy.promotion}>
                <p className="rounded-[8px] border border-[#eeeeee] bg-[#fafafa] px-3.5 py-3 text-[13px] leading-5 text-[#666666]">{copy.autoPromotion}</p>
              </CheckoutCard>
            )}

            <CheckoutCard title={copy.summary}>
              <dl className="space-y-3 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#777777]">{copy.subtotal}</dt>
                  <dd className="font-semibold text-[#333333]">{formatPrice(cartTotal)}</dd>
                </div>
              </dl>

              <div className="mt-4 border-t border-[#eeeeee] pt-4">
                <div className="flex items-end justify-between gap-4">
                  <span className="text-[14px] font-bold text-[#333333]">{copy.totalPayment}</span>
                  <div className="text-right">
                    <span className="block text-[20px] font-bold leading-7 text-[#333333]">{formatPrice(cartTotal)}</span>
                    <span className="text-[11px] text-[#888888]">{copy.vat}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {refreshingPricing && <p className="rounded-[8px] border border-[#eeeeee] bg-[#fafafa] px-3 py-2 text-[12px] text-[#777777]">{copy.updatingPrice}</p>}
                {pricingWarning && <p className="rounded-[8px] border border-[#ecd7c9] bg-[#fff8f4] px-3 py-2 text-[12px] text-[#9c4f2b]">{pricingWarning}</p>}
                {error && <p className="rounded-[8px] border border-[#f0d1cb] bg-[#fff6f4] px-3 py-2 text-[12px] text-[#c33924]">{error}</p>}
              </div>

              <button form="checkout-form" type="submit" disabled={loading} className="mt-4 flex h-11 w-full items-center justify-center rounded-[6px] bg-[#333333] px-5 text-[13px] font-bold text-white transition-all duration-200 hover:bg-[#111111] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70">
                {loading ? copy.processing : paymentMethod === 'VNPAY' ? copy.payVnpay : copy.placeOrder}
              </button>

              <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-[#777777]">
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">lock</span>
                {copy.secure}
              </div>
            </CheckoutCard>
          </aside>
        </section>
      </div>
    </main>
  );
}
