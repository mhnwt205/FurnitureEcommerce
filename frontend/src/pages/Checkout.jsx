import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { useCart } from '../hooks/useCart';
import { orderService } from '../services/api/orderService';
import { paymentService } from '../services/api/paymentService';


import { getProductMainImage } from '../utils/imageUtils';

export default function Checkout() {
  const navigate = useNavigate();
  const { cartItems, cartCount, cartTotal, updateQuantity, removeFromCart, clearCart } = useCart();
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };
  
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Pre-fill user data
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setFormData(prev => ({
          ...prev,
          fullName: user.fullName || '',
          email: user.email || '',
          phone: user.phone || '',
          address: user.address || ''
        }));
      } catch (e) {}
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOrder = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const orderPayload = {
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        note: formData.note,
        paymentMethod: paymentMethod,
        items: cartItems.map(item => ({
          productId: parseInt(item.id, 10),
          quantity: parseInt(item.quantity, 10)
        }))
      };

      if (paymentMethod === 'VNPAY') {
        const resultOrder = await orderService.createOrder(orderPayload);
        if (!resultOrder || !resultOrder.order || !resultOrder.order.id) {
          setError('Lỗi tạo đơn hàng');
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Lỗi tạo đơn hàng' } }));
          return;
        }
        
        const resultVnpay = await paymentService.createVnpayUrl({ orderId: resultOrder.order.id });
        if (resultVnpay.success && resultVnpay.paymentUrl) {
          window.location.href = resultVnpay.paymentUrl;
        } else {
          setError('Không thể tạo URL thanh toán VNPay');
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Không thể tạo URL thanh toán VNPay' } }));
        }
      } else {
        const result = await orderService.createOrder(orderPayload);
        clearCart();
        navigate('/order-success', { state: { order: result.order } });
      }
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi đặt hàng');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center py-20">
          <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">shopping_cart</span>
          <h2 className="font-headline-md text-headline-md text-primary mb-6">Giỏ hàng của bạn đang trống</h2>
          <Link to="/products" className="bg-primary text-white px-8 py-3 rounded font-label-lg hover:opacity-90 transition-opacity">
            TIẾP TỤC MUA SẮM
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <main className="max-w-container-max mx-auto px-margin-desktop py-12">
          <div className="flex items-center justify-center space-x-8 mb-16 border-b border-outline-variant pb-6 hidden md:flex">
            <div className="flex items-center space-x-2 step-active pb-6 -mb-6">
              <span className="font-label-lg text-label-lg">1. Thông tin khách hàng</span>
            </div>
            <span className="material-symbols-outlined text-outline-variant" data-icon="chevron_right">chevron_right</span>
            <div className="flex items-center space-x-2 step-inactive">
              <span className="font-label-lg text-label-lg">2. Địa chỉ</span>
            </div>
            <span className="material-symbols-outlined text-outline-variant" data-icon="chevron_right">chevron_right</span>
            <div className="flex items-center space-x-2 step-inactive">
              <span className="font-label-lg text-label-lg">3. Thanh toán</span>
            </div>
            <span className="material-symbols-outlined text-outline-variant" data-icon="chevron_right">chevron_right</span>
            <div className="flex items-center space-x-2 step-inactive">
              <span className="font-label-lg text-label-lg">4. Hoàn tất</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8 space-y-12">
              <section>
                <h2 className="font-headline-md text-headline-md mb-8 text-primary">Giỏ hàng của bạn ({cartCount < 10 ? `0${cartCount}` : cartCount})</h2>
                <div className="space-y-6">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex items-start bg-surface-beige p-6 rounded-lg transition-all hover:shadow-sm">
                      <img 
                        className="w-32 h-32 object-cover rounded-md shrink-0" 
                        alt={item.name} 
                        src={getProductMainImage(item)} 
                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/128x128?text=No+Image'; }} 
                      />
                      <div className="flex-1 ml-8">
                        <div className="flex justify-between">
                          <h3 className="font-label-lg text-label-lg text-primary">{item.name}</h3>
                          <span className="font-label-lg text-label-lg">{formatPrice(item.price)}</span>
                        </div>
                        <p className="text-on-surface-variant font-body-sm text-body-sm mt-2">{item.category?.name || 'Sản phẩm'}</p>
                        <div className="mt-8 flex justify-between items-center">
                          <div className="flex items-center border border-outline-variant rounded px-2">
                            <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:text-accent-terracotta"><span className="material-symbols-outlined text-sm" data-icon="remove">remove</span></button>
                            <span className="px-4 font-label-lg">{item.quantity < 10 ? `0${item.quantity}` : item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:text-accent-terracotta"><span className="material-symbols-outlined text-sm" data-icon="add">add</span></button>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="text-on-surface-variant hover:text-error transition-colors flex items-center space-x-1">
                            <span className="material-symbols-outlined text-sm" data-icon="delete">delete</span>
                            <span className="text-label-sm font-label-sm">Xóa</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-12">
                <div>
                  <h2 className="font-headline-md text-headline-md mb-8 text-primary">Thông tin vận chuyển</h2>
                  <form id="checkout-form" onSubmit={handleOrder} className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                    <div className="md:col-span-2 border-b border-outline py-2 focus-within:border-accent-gold transition-colors">
                      <label className="text-label-sm font-label-sm text-on-surface-variant uppercase">Họ và tên</label>
                      <input required name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full bg-transparent border-none focus:ring-0 p-0 text-body-md font-body-md" placeholder="Nguyễn Văn A" type="text" />
                    </div>
                    <div className="border-b border-outline py-2 focus-within:border-accent-gold transition-colors">
                      <label className="text-label-sm font-label-sm text-on-surface-variant uppercase">Email</label>
                      <input required name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-transparent border-none focus:ring-0 p-0 text-body-md font-body-md" placeholder="example@gmail.com" type="email" />
                    </div>
                    <div className="border-b border-outline py-2 focus-within:border-accent-gold transition-colors">
                      <label className="text-label-sm font-label-sm text-on-surface-variant uppercase">Số điện thoại</label>
                      <input required name="phone" value={formData.phone} onChange={handleInputChange} className="w-full bg-transparent border-none focus:ring-0 p-0 text-body-md font-body-md" placeholder="0901 234 567" type="tel" />
                    </div>
                    <div className="md:col-span-2 border-b border-outline py-2 focus-within:border-accent-gold transition-colors">
                      <label className="text-label-sm font-label-sm text-on-surface-variant uppercase">Địa chỉ chi tiết</label>
                      <input required name="address" value={formData.address} onChange={handleInputChange} className="w-full bg-transparent border-none focus:ring-0 p-0 text-body-md font-body-md" placeholder="Số nhà, tên đường, phường/xã..." type="text" />
                    </div>
                    <div className="md:col-span-2 border-b border-outline py-2 focus-within:border-accent-gold transition-colors mt-4">
                      <label className="text-label-sm font-label-sm text-on-surface-variant uppercase">Ghi chú (Tùy chọn)</label>
                      <input name="note" value={formData.note} onChange={handleInputChange} className="w-full bg-transparent border-none focus:ring-0 p-0 text-body-md font-body-md" placeholder="Giao hàng giờ hành chính..." type="text" />
                    </div>
                  </form>
                </div>
                
                <div>
                  <h2 className="font-headline-md text-headline-md mb-8 text-primary">Phương thức thanh toán</h2>
                  <div className="space-y-4">
                    <label className="flex items-center p-6 border border-outline-variant rounded-lg cursor-pointer hover:border-primary transition-all group has-[:checked]:bg-surface-beige has-[:checked]:border-primary">
                      <input name="payment" type="radio" value="VNPAY" checked={paymentMethod === 'VNPAY'} onChange={(e) => setPaymentMethod(e.target.value)} className="hidden peer" />
                      <span className="material-symbols-outlined text-primary mr-4" data-icon="account_balance">account_balance</span>
                      <div className="flex-1">
                        <span className="block font-label-lg text-label-lg">Thanh toán VNPay</span>
                        <span className="text-body-sm text-on-surface-variant">Thanh toán an toàn qua cổng VNPay</span>
                      </div>
                      <div className="w-5 h-5 border-2 border-outline-variant rounded-full peer-checked:border-primary peer-checked:bg-primary flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </label>
                    
                    <label className="flex items-center p-6 border border-outline-variant rounded-lg cursor-pointer hover:border-primary transition-all group has-[:checked]:bg-surface-beige has-[:checked]:border-primary">
                      <input name="payment" type="radio" value="COD" checked={paymentMethod === 'COD'} onChange={(e) => setPaymentMethod(e.target.value)} className="hidden peer" />
                      <span className="material-symbols-outlined text-primary mr-4" data-icon="payments">payments</span>
                      <div className="flex-1">
                        <span className="block font-label-lg text-label-lg">Thanh toán khi nhận hàng (COD)</span>
                        <span className="text-body-sm text-on-surface-variant">Thanh toán bằng tiền mặt khi shipper giao hàng</span>
                      </div>
                      <div className="w-5 h-5 border-2 border-outline-variant rounded-full peer-checked:border-primary peer-checked:bg-primary flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </label>
                  </div>
                </div>
              </section>
            </div>

            <div className="lg:col-span-4">
              <div className="sticky top-32 space-y-8">
                <div className="bg-surface-beige p-8 rounded-lg">
                  <h2 className="font-headline-md text-headline-md mb-8 text-primary border-b border-outline-variant pb-4">Tóm tắt đơn hàng</h2>
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between font-body-md text-body-md">
                      <span className="text-on-surface-variant">Tạm tính ({cartCount} sản phẩm)</span>
                      <span className="">{formatPrice(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between font-body-md text-body-md">
                      <span className="text-on-surface-variant">Phí vận chuyển</span>
                      <span className="">Miễn phí</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-outline-variant pt-6 mb-8">
                    <div className="flex justify-between items-end">
                      <span className="font-label-lg text-label-lg text-primary">Tổng cộng</span>
                      <div className="text-right">
                        <span className="block font-headline-md text-headline-md text-primary">{formatPrice(cartTotal)}</span>
                        <span className="text-body-sm text-on-surface-variant">(Đã bao gồm VAT)</span>
                      </div>
                    </div>
                  </div>
                  
                  {error && <div className="text-error text-body-sm mb-4">{error}</div>}

                  <button form="checkout-form" type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded font-label-lg text-label-lg uppercase tracking-widest hover:bg-primary-container transition-colors shadow-lg active:scale-95 duration-150 disabled:opacity-70">
                      {loading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN THANH TOÁN'}
                  </button>
                  <div className="mt-6 flex items-center justify-center space-x-4 text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm" data-icon="lock">lock</span>
                    <span className="text-label-sm font-label-sm">Thanh toán an toàn &amp; bảo mật</span>
                  </div>
                </div>

                <div className="p-6 border border-outline-variant rounded-lg flex items-center space-x-4">
                  <div className="bg-secondary-fixed w-12 h-12 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-secondary-fixed" data-icon="call">call</span>
                  </div>
                  <div>
                    <span className="block text-label-sm font-label-sm text-on-surface-variant">Cần hỗ trợ tư vấn?</span>
                    <span className="block font-label-lg text-label-lg text-primary">1900 1234 (8:00 - 21:00)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </main>
      <Footer />
    </div>
  );
}