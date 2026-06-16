import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api/authService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const response = await authService.forgotPassword(email);
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: response.message, type: 'success' } }));
      setSuccess(true);
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.', type: 'error' } }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-ivory py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-outline-variant/30 space-y-8">
        <div className="text-center">
          <Link to="/" className="font-display-lg text-[32px] tracking-tighter text-primary inline-block mb-6">
            Nội Thất Cao Cấp
          </Link>
          <h2 className="text-3xl font-headline-lg text-primary">Quên mật khẩu</h2>
          <p className="mt-2 text-sm font-body-md text-on-surface-variant">
            Nhập email đã đăng ký. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu cho bạn.
          </p>
        </div>
        
        {success ? (
          <div className="bg-success-container/20 text-success p-4 rounded-lg text-center font-body-md">
            Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi.
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block font-label-md text-primary mb-2">Địa chỉ Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full bg-surface-beige border-none rounded-lg px-4 py-3 font-body-md text-primary focus:ring-1 focus:ring-accent-gold outline-none"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-lg font-label-lg text-white bg-primary hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50"
            >
              {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại mật khẩu'}
            </button>
          </form>
        )}

        <div className="text-center mt-6">
          <Link to="/login" className="font-label-md text-accent-gold hover:text-accent-terracotta transition-colors">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
