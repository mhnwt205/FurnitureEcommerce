import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { authService } from '../services/api/authService';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setSession } = useAuth();

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
      setSession(response);

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
      setSession(response);

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
    <div className="min-h-screen flex flex-col bg-[#f7f5f1]">
      <Header />
      <main className="flex-grow px-4 py-10 sm:px-6 lg:py-16">
        <section className="mx-auto grid w-full max-w-[1040px] overflow-hidden rounded-[14px] border border-[#e5e5e5] bg-white shadow-[0_18px_45px_rgba(0,0,0,0.06)] lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="hidden border-r border-[#eeeeee] bg-[#fafaf8] p-10 lg:flex lg:flex-col lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#bfa37c]">Heritage Home</p>
              <h1 className="mt-5 max-w-sm text-3xl font-semibold leading-tight text-[#333333]">
                Không gian mua sắm nội thất dành cho bạn.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-[#666666]">
                Đăng nhập để theo dõi đơn hàng, lưu sản phẩm yêu thích và tiếp tục trải nghiệm mua sắm của bạn.
              </p>
            </div>
            <div className="mt-12 h-px w-20 bg-[#bfa37c]" />
          </aside>

          <section className="flex items-center justify-center px-5 py-9 sm:px-8 lg:px-12 lg:py-14">
            <div className="w-full max-w-[430px]">
              <div className="mb-8 flex items-center justify-between gap-4 border-b border-[#eeeeee]">
                <button className="border-b-2 border-[#333333] pb-3 text-sm font-bold uppercase tracking-[0.12em] text-[#333333]">
                  Đăng nhập
                </button>
                <Link
                  to="/register"
                  className="border-b-2 border-transparent pb-3 text-sm font-bold uppercase tracking-[0.12em] text-[#777777] transition-colors hover:text-[#bfa37c]"
                >
                  Đăng ký
                </Link>
              </div>

              <div className="mb-7">
                <h2 className="text-2xl font-semibold text-[#333333]">Mừng bạn trở lại</h2>
                <p className="mt-2 text-sm leading-6 text-[#666666]">
                  Vui lòng nhập thông tin để truy cập tài khoản của bạn.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-[10px] border border-[#f1c9c0] bg-[#fff7f5] px-4 py-3 text-sm leading-6 text-[#b94732]">
                  {error}
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#434343]">
                    Email
                  </label>
                  <Input
                    id="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="ui-input w-full"
                    placeholder="example@email.com"
                    type="email"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#434343]">
                    Mật khẩu
                  </label>
                  <Input
                    id="password"
                    required
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="ui-input w-full"
                    placeholder="Nhập mật khẩu"
                    type="password"
                  />
                  <div className="mt-2 flex justify-end">
                    <Link to="/forgot-password" className="text-sm text-[#777777] transition-colors hover:text-[#bfa37c]">
                      Quên mật khẩu?
                    </Link>
                  </div>
                </div>

                <Button disabled={isLoading} className="w-full" type="submit">
                  {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
                </Button>
              </form>

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
                  text="signin_with"
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                />
              </div>

              <p className="mt-8 text-center text-sm text-[#666666] lg:hidden">
                <Link to="/" className="font-semibold text-[#333333] transition-colors hover:text-[#bfa37c]">
                  Về trang chủ
                </Link>
              </p>
            </div>
          </section>
        </section>
      </main>
      <Footer />
    </div>
  );
}