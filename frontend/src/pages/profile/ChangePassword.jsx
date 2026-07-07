import React, { useState } from 'react';
import { authService } from '../../services/api/authService';

export default function ChangePassword() {
  const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Mật khẩu mới không khớp', type: 'error' }}));
      return;
    }
    setLoading(true);
    try {
      await authService.changePassword({ currentPassword: formData.currentPassword, newPassword: formData.newPassword });
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Đổi mật khẩu thành công', type: 'success' }}));
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: error.response?.data?.message || 'Có lỗi xảy ra', type: 'error' }}));
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="border-b border-[#eeeeee] pb-6">
        <h2 className="text-2xl font-bold text-[#333333]">Đổi mật khẩu</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#777777]">
          Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác.
        </p>
      </div>
      <div className="mt-6 max-w-2xl rounded-[12px] border border-[#e5e5e5] bg-[#fafaf8] p-5 md:p-6">
        {user.provider === 'google' ? (
          <div className="ui-empty-state border-0 shadow-none">
            <span className="material-symbols-outlined mb-3 block text-4xl text-[#999999]">g_translate</span>
            <p>Tài khoản Google không sử dụng mật khẩu nội bộ.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#555555]">Mật khẩu hiện tại</label>
              <input className="ui-input w-full" type="password" required value={formData.currentPassword} onChange={e => setFormData({ ...formData, currentPassword: e.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#555555]">Mật khẩu mới</label>
              <input className="ui-input w-full" type="password" required minLength={6} value={formData.newPassword} onChange={e => setFormData({ ...formData, newPassword: e.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#555555]">Xác nhận mật khẩu mới</label>
              <input className="ui-input w-full" type="password" required minLength={6} value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} />
            </div>
            <div className="pt-1">
              <button disabled={loading} type="submit" className="ui-button-primary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}