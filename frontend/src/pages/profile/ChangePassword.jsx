import React, { useState } from 'react';
import { authService } from '../../services/api/authService';
import Toast from '../../components/common/Toast';

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="border-b border-outline-variant pb-8 mb-8">
        <h1 className="font-display-lg text-display-lg text-primary mb-2">Đổi mật khẩu</h1>
        <p className="font-body-md text-on-surface-variant">Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác.</p>
      </div>

      <div className="bg-surface-beige p-8 md:p-10 rounded-lg max-w-2xl">
        {user.provider === 'google' ? (
          <div className="text-center py-8 text-on-surface-variant font-body-lg">
            <span className="material-symbols-outlined text-4xl mb-4 text-accent-gold">g_translate</span>
            <p>Tài khoản Google không sử dụng mật khẩu nội bộ.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="font-label-lg text-label-lg text-on-surface-variant opacity-70">Mật khẩu hiện tại</label>
            <input 
              className="bg-transparent border-0 border-b border-outline-variant py-3 font-body-md text-body-md focus:ring-0 focus:border-accent-gold transition-colors" 
              type="password" 
              required
              value={formData.currentPassword}
              onChange={e => setFormData({...formData, currentPassword: e.target.value})}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-label-lg text-label-lg text-on-surface-variant opacity-70">Mật khẩu mới</label>
            <input 
              className="bg-transparent border-0 border-b border-outline-variant py-3 font-body-md text-body-md focus:ring-0 focus:border-accent-gold transition-colors" 
              type="password" 
              required
              minLength={6}
              value={formData.newPassword}
              onChange={e => setFormData({...formData, newPassword: e.target.value})}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-label-lg text-label-lg text-on-surface-variant opacity-70">Xác nhận mật khẩu mới</label>
            <input 
              className="bg-transparent border-0 border-b border-outline-variant py-3 font-body-md text-body-md focus:ring-0 focus:border-accent-gold transition-colors" 
              type="password" 
              required
              minLength={6}
              value={formData.confirmPassword}
              onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
            />
          </div>
          <div className="pt-4">
            <button disabled={loading} type="submit" className="px-8 py-3 bg-primary text-white rounded font-label-lg disabled:opacity-50">Cập nhật mật khẩu</button>
          </div>
        </form>
        )}
      </div>
    </>
  );
}
