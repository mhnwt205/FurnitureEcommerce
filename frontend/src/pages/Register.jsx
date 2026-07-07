import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { authService } from '../services/api/authService';
import { GoogleLogin } from '@react-oauth/google';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    password: '',
    confirm_password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setIsLoading(true);
    try {
      const response = await authService.googleLogin(credentialResponse.credential);
      // Save token and user info
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Dispatch a custom event to notify Header of auth change
      window.dispatchEvent(new Event('auth-change'));
      
      if (response.user && response.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Đăng ký bằng Google thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Đăng ký bằng Google thất bại. Vui lòng thử lại.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirm_password) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.register({
        fullName: formData.fullname,
        email: formData.email,
        password: formData.password
      });
      setSuccess(response.message || 'Đăng ký thành công. Vui lòng kiểm tra email để xác nhận tài khoản.');
      setFormData({
        fullname: '',
        email: '',
        password: '',
        confirm_password: ''
      });
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f5f1]">
      <Header />
      <main className="flex-grow px-4 py-10 sm:px-6 lg:py-16">
        <section className="mx-auto grid w-full max-w-[1040px] overflow-hidden rounded-[14px] border border-[#e5e5e5] bg-white shadow-[0_18px_45px_rgba(0,0,0,0.06)] lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="hidden border-r border-[#eeeeee] bg-[#fafaf8] p-10 lg:flex lg:flex-col lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#bfa37c]">Heritage Home</p>
              <h1 className="mt-5 max-w-sm text-3xl font-semibold leading-tight text-[#333333]">
                Tạo tài khoản để giữ mọi lựa chọn của bạn ở một nơi.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-[#666666]">
                Lưu sản phẩm yêu thích, theo dõi đơn hàng và nhận thông tin phù hợp với không gian sống của bạn.
              </p>
            </div>
            <div className="mt-12 h-px w-20 bg-[#bfa37c]" />
          </aside>
          
          <section className="flex items-center justify-center px-5 py-9 sm:px-8 lg:px-12 lg:py-14">
            <div className="w-full max-w-[460px]">
              <div className="mb-8 flex items-center justify-between gap-4 border-b border-[#eeeeee]">
                <Link
                  to="/login"
                  className="border-b-2 border-transparent pb-3 text-sm font-bold uppercase tracking-[0.12em] text-[#777777] transition-colors hover:text-[#bfa37c]"
                >
                  Đăng nhập
                </Link>
                <button className="border-b-2 border-[#333333] pb-3 text-sm font-bold uppercase tracking-[0.12em] text-[#333333]">
                  Đăng ký
                </button>
              </div>

              <div className="mb-7">
                <h1 className="text-2xl font-semibold text-[#333333]">Tạo tài khoản mới</h1>
                <p className="mt-2 text-sm leading-6 text-[#666666]">
                  Bắt đầu hành trình kiến tạo tổ ấm cùng chúng tôi.
                </p>
              </div>

              {success && (
                <div className="mb-5 rounded-[10px] border border-[#cfe7d0] bg-[#f3fbf3] px-4 py-3 text-sm leading-6 text-[#2f7d32]">
                  {success}
                </div>
              )}

              {error && (
                <div className="mb-5 rounded-[10px] border border-[#f1c9c0] bg-[#fff7f5] px-4 py-3 text-sm leading-6 text-[#b94732]">
                  {error}
                </div>
              )}

              {!success && (
                <form className="space-y-5" id="registrationForm" onSubmit={handleSubmit}>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#434343]" htmlFor="fullname">Họ và tên</label>
                    <input required value={formData.fullname} onChange={handleChange} className="ui-input w-full" id="fullname" name="fullname" placeholder="Nguyễn Văn A" type="text" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#434343]" htmlFor="email">Email</label>
                    <input required value={formData.email} onChange={handleChange} className="ui-input w-full" id="email" name="email" placeholder="example@email.com" type="email" />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#434343]" htmlFor="password">Mật khẩu</label>
                      <input required minLength="6" value={formData.password} onChange={handleChange} className="ui-input w-full" id="password" name="password" placeholder="Nhập mật khẩu" type="password" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#434343]" htmlFor="confirm_password">Xác nhận mật khẩu</label>
                      <input required minLength="6" value={formData.confirm_password} onChange={handleChange} className="ui-input w-full" id="confirm_password" name="confirm_password" placeholder="Nhập lại mật khẩu" type="password" />
                    </div>
                  </div>
                  <button disabled={isLoading} className="ui-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60" type="submit">
                    {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
                  </button>
                </form>
              )}

              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#eeeeee]" />
                </div>
                <span className="relative bg-white px-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#999999]">
                  Hoặc
                </span>
              </div>

              <div className="flex justify-center w-full">
                <GoogleLogin
                  theme="outline"
                  size="large"
                  width="100%"
                  text="continue_with"
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                />
              </div>

              <p className="mt-8 text-center text-sm text-[#666666]">
                Đã có tài khoản?{' '}
                <Link to="/login" className="font-semibold text-[#333333] transition-colors hover:text-[#bfa37c]">Đăng nhập</Link>
              </p>
            </div>
          </section>
        </section>
      </main>
      <Footer />
    </div>
  );
}