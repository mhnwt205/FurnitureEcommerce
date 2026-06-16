import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/api/authService';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Liên kết đặt lại mật khẩu không hợp lệ.', type: 'error' } }));
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

    if (formData.newPassword !== formData.confirmPassword) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Mật khẩu xác nhận không khớp', type: 'error' } }));
      return;
    }

    if (formData.newPassword.length < 6) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Mật khẩu mới phải từ 6 ký tự trở lên', type: 'error' } }));
      return;
    }

    setLoading(true);

    try {
      const response = await authService.resetPassword({
        token,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword
      });
      
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: response.message || 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.', type: 'success' } }));
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.response?.data?.message || 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.', type: 'error' } }));
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
          <h2 className="text-3xl font-headline-lg text-primary">Đặt lại mật khẩu</h2>
          <p className="mt-2 text-sm font-body-md text-on-surface-variant">
            Nhập mật khẩu mới cho tài khoản của bạn.
          </p>
        </div>
        
        {!token ? (
          <div className="bg-error-container/20 text-error p-4 rounded-lg text-center font-body-md">
            Thiếu token xác thực. Vui lòng kiểm tra lại liên kết.
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block font-label-md text-primary mb-2">Mật khẩu mới</label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full bg-surface-beige border-none rounded-lg px-4 py-3 font-body-md text-primary focus:ring-1 focus:ring-accent-gold outline-none mb-4"
                value={formData.newPassword}
                onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block font-label-md text-primary mb-2">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full bg-surface-beige border-none rounded-lg px-4 py-3 font-body-md text-primary focus:ring-1 focus:ring-accent-gold outline-none"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-lg font-label-lg text-white bg-primary hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
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
