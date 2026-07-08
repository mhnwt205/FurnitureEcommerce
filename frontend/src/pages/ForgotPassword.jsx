import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api/authService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

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
    <div className="min-h-screen bg-[#f7f5f1] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md items-center justify-center">
        <div className="ui-card w-full p-6 sm:p-8">
          <div className="text-center">
            <Link to="/" className="inline-block text-2xl font-semibold tracking-tight text-[#333333] transition-colors hover:text-[#bfa37c]">
              Heritage Home
            </Link>
            <h2 className="mt-7 text-2xl font-semibold text-[#333333]">Quên mật khẩu</h2>
            <p className="mt-3 text-sm leading-6 text-[#666666]">
              Nhập email đã đăng ký. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu cho bạn.
            </p>
          </div>
        
          {success ? (
            <div className="mt-7 rounded-[10px] border border-[#cfe7d0] bg-[#f3fbf3] px-4 py-3 text-center text-sm leading-6 text-[#2f7d32]">
              Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi.
            </div>
          ) : (
            <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#434343]">Địa chỉ email</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="ui-input w-full"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại mật khẩu'}
              </Button>
            </form>
          )}

          <div className="mt-7 text-center">
            <Link to="/login" className="text-sm font-semibold text-[#333333] transition-colors hover:text-[#bfa37c]">
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}