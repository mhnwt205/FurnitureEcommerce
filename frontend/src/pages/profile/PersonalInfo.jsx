import React, { useEffect, useState } from 'react';
import { customerService } from '../../services/api/customerService';
import Toast from '../../components/common/Toast';

export default function PersonalInfo() {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', phone: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await customerService.getMyProfile();
      setProfile(data);
      setFormData({ fullName: data.fullName || '', phone: data.phone || '' });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await customerService.updateMyProfile(formData);
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Cập nhật thông tin thành công', type: 'success' }}));
      setIsEditing(false);
      fetchProfile();
      
      // Update local storage user
      const user = JSON.parse(localStorage.getItem('user'));
      if(user) {
        user.fullName = formData.fullName;
        localStorage.setItem('user', JSON.stringify(user));
        window.dispatchEvent(new Event('auth-change'));
      }
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Có lỗi xảy ra', type: 'error' }}));
    }
  };

  if (!profile) return <div>Đang tải...</div>;

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-outline-variant pb-8">
        <div>
          <h1 className="font-display-lg text-display-lg text-primary mb-2">Xin chào, {profile.fullName || profile.email.split('@')[0]}</h1>
          <p className="font-body-md text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-accent-gold">stars</span>
            Thành viên từ tháng {new Date(profile.createdAt).getMonth() + 1}, {new Date(profile.createdAt).getFullYear()}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-gutter pt-4">
        <div className="bg-surface-beige p-8 md:p-10 rounded-lg space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-md text-headline-md text-primary">Thông tin cá nhân</h3>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="text-accent-gold font-label-lg text-label-lg hover:underline underline-offset-4">Chỉnh sửa</button>
            )}
          </div>
          <form className="grid grid-cols-1 gap-y-6 max-w-2xl" onSubmit={handleSave}>
            <div className="flex flex-col gap-2">
              <label className="font-label-lg text-label-lg text-on-surface-variant opacity-70">Họ và Tên</label>
              <input 
                className={`bg-transparent border-0 border-b border-outline-variant py-3 font-body-md text-body-md focus:ring-0 focus:border-accent-gold transition-colors ${!isEditing && 'opacity-80'}`} 
                readOnly={!isEditing} 
                type="text" 
                value={isEditing ? formData.fullName : profile.fullName || ''}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-lg text-label-lg text-on-surface-variant opacity-70">Địa chỉ Email</label>
              <input 
                className="bg-transparent border-0 border-b border-outline-variant py-3 font-body-md text-body-md focus:ring-0 focus:border-accent-gold transition-colors opacity-70" 
                readOnly 
                type="email" 
                value={profile.email}
              />
              <span className="text-[12px] text-outline-variant">Email không thể thay đổi</span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-lg text-label-lg text-on-surface-variant opacity-70">Số điện thoại</label>
              <input 
                className={`bg-transparent border-0 border-b border-outline-variant py-3 font-body-md text-body-md focus:ring-0 focus:border-accent-gold transition-colors ${!isEditing && 'opacity-80'}`} 
                readOnly={!isEditing} 
                type="tel" 
                value={isEditing ? formData.phone : profile.phone || ''}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            
            {isEditing && (
              <div className="flex gap-4 pt-4">
                <button type="submit" className="px-6 py-3 bg-primary text-white rounded font-label-lg">Lưu thay đổi</button>
                <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-3 border border-outline-variant rounded font-label-lg">Hủy</button>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
