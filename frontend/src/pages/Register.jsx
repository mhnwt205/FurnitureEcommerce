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
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow w-full">
        <section className="registration-split grid grid-cols-1 md:grid-cols-2 h-full min-h-[600px]">
          <div className="relative hidden md:block overflow-hidden h-full">
            <img className="absolute inset-0 w-full h-full object-cover" data-alt="A luxury contemporary living room with a neutral ivory palette featuring handcrafted wooden furniture and soft morning sunlight streaming through linen curtains. The space exudes modern Vietnamese heritage with a minimal brown leather sofa and artisanal ceramic vases on a low oak coffee table. The atmosphere is quiet, sophisticated, and deeply rooted in calm minimalist luxury aesthetics." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpc1RXSk6NPmsvTL8Eqm5idouYT6Y0ZB6-B4wh_jYqibcRtXFjFgJk4J5JotoyQ_h7Qq5E_eF31HntYLjM_VPg_62F-K5X1rG27IKeJCmi6-R4oCB_Q0wL6DCO-P_jka9e_ksjJuVEUr_fH4J_tr9JPOS_K8FJhyPJgh-fRWzKgcZJXMTGy2P5UVxC24QrG6DyeqDaN0lcZvX3AH3RpvtS09fqC1pdzyuGOUXczGmm40M1D9TwL0gpK3q5PFfQpYrLZMNl6Z9fXF8" />
            <div className="absolute inset-0 bg-primary/10 mix-blend-multiply"></div>
            <div className="absolute bottom-16 left-16 right-16 text-white z-10">
              <h2 className="font-display-lg text-display-lg mb-4">Kiến tạo không gian sống di sản</h2>
              <p className="font-body-lg text-body-lg max-w-md opacity-90">Tham gia cộng đồng Heritage Modernist để nhận những thông tin thiết kế độc bản và ưu đãi đặc quyền.</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center p-8 md:p-16 lg:p-24 bg-surface-ivory">
            <div className="w-full max-w-md">
              <div className="mb-10 text-center md:text-left">
                <h1 className="font-headline-lg text-headline-lg text-primary mb-2">Tạo tài khoản mới</h1>
                <p className="text-on-surface-variant">Bắt đầu hành trình kiến tạo tổ ấm cùng chúng tôi.</p>
              </div>

              {success && (
                <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-sm font-body-md border border-green-200">
                  {success}
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-sm font-body-md text-body-md border border-red-200">
                  {error}
                </div>
              )}

              {!success && (
                <form className="space-y-6" id="registrationForm" onSubmit={handleSubmit}>
                <div className="relative">
                  <label className="block font-label-lg text-label-lg text-primary mb-2" htmlFor="fullname">Họ và tên</label>
                  <input required value={formData.fullname} onChange={handleChange} className="w-full bg-transparent border-t-0 border-x-0 border-b border-outline-variant py-3 px-0 focus:ring-0 focus:border-accent-gold transition-all duration-300 placeholder:text-outline/50" id="fullname" name="fullname" placeholder="Nguyễn Văn A" type="text" />
                </div>
                <div className="relative">
                  <label className="block font-label-lg text-label-lg text-primary mb-2" htmlFor="email">Email</label>
                  <input required value={formData.email} onChange={handleChange} className="w-full bg-transparent border-t-0 border-x-0 border-b border-outline-variant py-3 px-0 focus:ring-0 focus:border-accent-gold transition-all duration-300 placeholder:text-outline/50" id="email" name="email" placeholder="example@email.com" type="email" />
                </div>
                <div className="relative">
                  <label className="block font-label-lg text-label-lg text-primary mb-2" htmlFor="password">Mật khẩu</label>
                  <input required minLength="6" value={formData.password} onChange={handleChange} className="w-full bg-transparent border-t-0 border-x-0 border-b border-outline-variant py-3 px-0 focus:ring-0 focus:border-accent-gold transition-all duration-300 placeholder:text-outline/50" id="password" name="password" placeholder="••••••••" type="password" />
                </div>
                <div className="relative">
                  <label className="block font-label-lg text-label-lg text-primary mb-2" htmlFor="confirm_password">Xác nhận mật khẩu</label>
                  <input required minLength="6" value={formData.confirm_password} onChange={handleChange} className="w-full bg-transparent border-t-0 border-x-0 border-b border-outline-variant py-3 px-0 focus:ring-0 focus:border-accent-gold transition-all duration-300 placeholder:text-outline/50" id="confirm_password" name="confirm_password" placeholder="••••••••" type="password" />
                </div>
                <div className="pt-4">
                  <button disabled={isLoading} className="w-full bg-primary text-white py-4 px-8 font-label-lg text-label-lg hover:bg-primary/90 transition-all active:scale-[0.98] duration-150 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed" type="submit">
                    {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
                  </button>
                </div>
              </form>
              )}

              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-outline-variant"></div>
                </div>
                <span className="relative px-4 bg-surface-ivory text-on-surface-variant font-label-sm text-label-sm uppercase">Hoặc</span>
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

              <p className="mt-10 text-center font-body-sm text-body-sm text-on-surface-variant">
                Đã có tài khoản?{' '}
                <Link to="/login" className="text-primary font-bold hover:text-accent-terracotta transition-colors decoration-accent-gold underline underline-offset-4">Đăng nhập</Link>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}