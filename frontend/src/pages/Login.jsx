import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { authService } from '../services/api/authService';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
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

      if (response.user && (response.user.role === 'admin' || response.user.role === 'staff')) {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Đăng nhập bằng Google thất bại. Vui lòng thử lại.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authService.login(formData);
      // Save token and user info
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Dispatch a custom event to notify Header of auth change
      window.dispatchEvent(new Event('auth-change'));

      if (response.user && (response.user.role === 'admin' || response.user.role === 'staff')) {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <main className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)] w-full">
          <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden h-full min-h-[600px]">
            <img alt="Heritage Home Lifestyle" className="absolute inset-0 w-full h-full object-cover" data-alt="A sophisticated modern minimalist living room featuring a handcrafted deep brown wooden sofa and a marble coffee table. The sunlight softly filters through thin linen curtains, creating long shadows on a beige textured wall. The atmosphere is warm, quiet, and premium, embodying a luxury Vietnamese heritage aesthetic with earthy tones and high-end natural materials." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCrLHHBmcmHI8ZNwxewKj_IR9SqwWO7ulyjpV5Z1uDPAZNlB9bESnRz2x1THpYEYabz7DNU6iA5GaJAy3FaWmX9GgcjGeP1ctgXDjpIOT4w1BGXSKei4SdulX8Phf6QR3OKPS7s0NeuSz_kFfA-p5KxLGErEqcxSUSU8P5dU3u2u5nN91f8QWWWeImq1p-HXNSQYJdpp5RqJFX-QT1QaBQl0Ity_9HT37VKuJju_XpdAXQY5rt5sXs1BgIBsHSVm-3f8gy4ANY8Xs" />
            <div className="absolute inset-0 bg-black/20 z-10"></div>
            <div className="relative z-20 flex flex-col justify-between p-16 w-full text-white">
              <div>
                <h1 className="font-display-lg text-display-lg tracking-tighter mb-4">Heritage Home</h1>
                <p className="font-label-lg text-label-lg uppercase tracking-[0.2em] text-white/80">Nội thất đương đại</p>
              </div>
              <div className="max-w-md">
                <p className="font-headline-md text-headline-md mb-6 italic">"Nơi bản sắc truyền thống hòa quyện cùng ngôn ngữ thiết kế tối giản."</p>
                <div className="w-24 h-px bg-accent-gold"></div>
              </div>
            </div>
          </section>

          <section className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 bg-surface-bright relative">
            <Link to="/" className="absolute top-8 right-8 text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2">
              <span className="font-label-lg text-label-lg">TRANG CHỦ</span>
            </Link>

            <div className="w-full max-w-[440px]">
              <div className="flex gap-8 mb-12 border-b border-outline-variant">
                <button className="pb-4 font-label-lg text-label-lg border-b-2 border-primary text-primary transition-all duration-300">ĐĂNG NHẬP</button>
                <Link to="/register" className="pb-4 font-label-lg text-label-lg border-b-2 border-transparent text-on-surface-variant hover:text-primary transition-all duration-300">ĐĂNG KÝ</Link>
              </div>

              <div className="form-transition opacity-100 translate-x-0">
                <div className="mb-8">
                  <h2 className="font-headline-lg text-headline-lg text-primary mb-2">Mừng bạn trở lại</h2>
                  <p className="text-on-surface-variant font-body-md">Vui lòng nhập thông tin để truy cập không gian riêng của bạn.</p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-sm font-body-md text-body-md border border-red-200">
                    {error}
                  </div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-1">
                    <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Email</label>
                    <input required name="email" value={formData.email} onChange={handleChange} className="w-full px-0 py-3 bg-transparent border-t-0 border-x-0 border-b border-outline-variant focus:border-accent-gold transition-all font-body-md placeholder:text-outline/50" placeholder="example@heritage.vn" type="email" />
                  </div>
                  <div className="space-y-1 relative">
                    <div className="flex justify-between items-center">
                      <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Mật khẩu</label>
                    </div>
                    <input required name="password" value={formData.password} onChange={handleChange} className="w-full px-0 py-3 bg-transparent border-t-0 border-x-0 border-b border-outline-variant focus:border-accent-gold transition-all font-body-md placeholder:text-outline/50" placeholder="••••••••" type="password" />
                    <div className="flex justify-end pt-2">
                      <Link to="/forgot-password" className="text-[13px] text-on-surface-variant hover:text-accent-terracotta transition-colors underline-offset-2 hover:underline">Quên mật khẩu?</Link>
                    </div>
                  </div>
                  <button disabled={isLoading} className="w-full py-4 bg-primary text-white font-label-lg text-label-lg tracking-[0.1em] hover:bg-primary/90 transition-colors shadow-lg mt-8 disabled:opacity-70 disabled:cursor-not-allowed" type="submit">
                    {isLoading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP'}
                  </button>
                </form>

                <div className="relative my-6 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-outline-variant"></div>
                  </div>
                  <span className="relative px-4 bg-surface-bright text-on-surface-variant font-label-sm text-label-sm uppercase">Hoặc</span>
                </div>

                <div className="flex justify-center w-full">
                  <GoogleLogin
                    theme="outline"
                    size="large"
                    width="100%"
                    text="signin_with"
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                  />
                </div>
              </div>
            </div>
          </section>
        </main>
      </main>
      <Footer />
    </div>
  );
}