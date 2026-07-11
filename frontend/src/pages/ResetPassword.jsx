import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/api/authService';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { clearSession } = useAuth();

  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Lien ket dat lai mat khau khong hop le.', type: 'error' } }));
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

    if (formData.newPassword !== formData.confirmPassword) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Mat khau xac nhan khong khop', type: 'error' } }));
      return;
    }

    if (formData.newPassword.length < 6) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Mat khau moi phai tu 6 ky tu tro len', type: 'error' } }));
      return;
    }

    setLoading(true);

    try {
      const response = await authService.resetPassword({
        token,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword
      });
      
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: response.message || 'Dat lai mat khau thanh cong. Vui long dang nhap lai.', type: 'success' } }));
      clearSession();
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.data?.message || error.response?.data?.message || 'Lien ket dat lai mat khau khong hop le hoac da het han.', type: 'error' } }));
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
            <h2 className="mt-7 text-2xl font-semibold text-[#333333]">Dat lai mat khau</h2>
            <p className="mt-3 text-sm leading-6 text-[#666666]">
              Nhap mat khau moi cho tai khoan cua ban.
            </p>
          </div>
        
          {!token ? (
            <div className="mt-7 rounded-[10px] border border-[#f1c9c0] bg-[#fff7f5] px-4 py-3 text-center text-sm leading-6 text-[#b94732]">
              Thieu token xac thuc. Vui long kiem tra lai lien ket.
            </div>
          ) : (
            <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#434343]">Mat khau moi</label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  className="ui-input w-full"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                />
              </div>
            
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#434343]">Xac nhan mat khau moi</label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  className="ui-input w-full"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Dang xu ly...' : 'Dat lai mat khau'}
              </Button>
            </form>
          )}

          <div className="mt-7 text-center">
            <Link to="/login" className="text-sm font-semibold text-[#333333] transition-colors hover:text-[#bfa37c]">
              Quay lai dang nhap
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
