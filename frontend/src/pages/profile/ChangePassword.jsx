import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api/authService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';

export default function ChangePassword() {
  const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, clearSession } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Mat khau moi khong khop', type: 'error' }}));
      return;
    }
    setLoading(true);
    try {
      await authService.changePassword({ currentPassword: formData.currentPassword, newPassword: formData.newPassword });
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Doi mat khau thanh cong. Vui long dang nhap lai.', type: 'success' }}));
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      clearSession();
      navigate('/login', { replace: true });
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.data?.message || error.response?.data?.message || 'Co loi xay ra', type: 'error' }}));
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="border-b border-[#eeeeee] pb-6">
        <h2 className="text-2xl font-bold text-[#333333]">Doi mat khau</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#777777]">
          De bao mat tai khoan, vui long khong chia se mat khau cho nguoi khac.
        </p>
      </div>
      <div className="mt-6 max-w-2xl rounded-[12px] border border-[#e5e5e5] bg-[#fafaf8] p-5 md:p-6">
        {user?.provider === 'google' ? (
          <div className="ui-empty-state border-0 shadow-none">
            <span className="material-symbols-outlined mb-3 block text-4xl text-[#999999]">g_translate</span>
            <p>Tai khoan Google khong su dung mat khau noi bo.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="current-password" className="mb-2 block text-sm font-semibold text-[#555555]">Mat khau hien tai</label>
              <Input id="current-password" className="ui-input w-full" type="password" required value={formData.currentPassword} onChange={e => setFormData({ ...formData, currentPassword: e.target.value })} />
            </div>
            <div>
              <label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-[#555555]">Mat khau moi</label>
              <Input id="new-password" className="ui-input w-full" type="password" required minLength={6} value={formData.newPassword} onChange={e => setFormData({ ...formData, newPassword: e.target.value })} />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-[#555555]">Xac nhan mat khau moi</label>
              <Input id="confirm-password" className="ui-input w-full" type="password" required minLength={6} value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} />
            </div>
            <div className="pt-1">
              <Button disabled={loading} type="submit" className="w-full sm:w-auto">
                {loading ? 'Dang cap nhat...' : 'Cap nhat mat khau'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
