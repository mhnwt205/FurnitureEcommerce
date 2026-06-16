import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { authService } from '../services/api/authService';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('Đang xác thực email của bạn...');
  const hasVerified = React.useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Link xác thực không hợp lệ hoặc bị thiếu token.');
      return;
    }

    if (hasVerified.current) return;
    hasVerified.current = true;
    verify();
  }, [token]);

  const verify = async () => {
    try {
      await authService.verifyEmail(token);
      setStatus('success');
      setMessage('Xác thực email thành công! Tài khoản của bạn đã sẵn sàng.');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Xác thực thất bại. Link có thể đã hết hạn hoặc không hợp lệ.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-bright">
      <Header />
      <main className="flex-grow flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-outline-variant/30 text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h2 className="font-headline-md text-primary mb-2">Đang xác thực</h2>
            </>
          )}

          {status === 'success' && (
            <>
              <span className="material-symbols-outlined text-[64px] text-green-500 mb-4 block">check_circle</span>
              <h2 className="font-headline-md text-primary mb-2">Thành công</h2>
            </>
          )}

          {status === 'error' && (
            <>
              <span className="material-symbols-outlined text-[64px] text-error mb-4 block">error</span>
              <h2 className="font-headline-md text-error mb-2">Xác thực thất bại</h2>
            </>
          )}

          <p className="font-body-md text-on-surface-variant mb-8">{message}</p>

          {(status === 'success' || status === 'error') && (
            <Link to="/login" className="inline-block bg-primary text-white font-label-lg px-8 py-3 w-full hover:bg-primary/90 transition-colors shadow-sm rounded">
              ĐẾN TRANG ĐĂNG NHẬP
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
