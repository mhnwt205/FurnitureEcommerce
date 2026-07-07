import React, { useEffect, useState } from 'react';
import { customerService } from '../../services/api/customerService';

export default function PersonalInfo() {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', phone: '' });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const data = await customerService.getMyProfile();
      setProfile(data);
      setFormData({ fullName: data.fullName || '', phone: data.phone || '' });
    } catch (error) { console.error(error); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await customerService.updateMyProfile(formData);
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Cập nhật thông tin thành công', type: 'success' }}));
      setIsEditing(false);
      fetchProfile();
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        user.fullName = formData.fullName;
        localStorage.setItem('user', JSON.stringify(user));
        window.dispatchEvent(new Event('auth-change'));
      }
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Có lỗi xảy ra', type: 'error' }}));
    }
  };

  if (!profile) {
    return <div className="space-y-4"><div className="ui-skeleton h-8 w-56 rounded" /><div className="ui-skeleton h-4 w-72 rounded" /><div className="ui-skeleton h-56 rounded-[12px]" /></div>;
  }

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-[#eeeeee] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-tight text-[#333333] md:text-[28px]">Xin chào, {profile.fullName || profile.email.split('@')[0]}</h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-[#777777]"><span className="material-symbols-outlined text-[18px] text-[#bfa37c]">stars</span>Thành viên từ tháng {new Date(profile.createdAt).getMonth() + 1}, {new Date(profile.createdAt).getFullYear()}</p>
        </div>
        {!isEditing && <button type="button" onClick={() => setIsEditing(true)} className="ui-button-secondary px-4 py-2 text-sm">Chỉnh sửa</button>}
      </div>
      <div className="pt-6">
        <div className="rounded-[12px] border border-[#e5e5e5] bg-[#fafaf8] p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between"><h3 className="text-[15px] font-bold text-[#333333]">Thông tin cá nhân</h3><span className="ui-badge">Hồ sơ</span></div>
          <form className="grid w-full max-w-4xl grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2" onSubmit={handleSave}>
            <div className="flex min-w-0 flex-col">
              <label className="mb-2 block text-sm font-semibold text-[#555555]">Họ và tên</label>
              <input className="ui-input h-11 w-full" readOnly={!isEditing} type="text" value={isEditing ? formData.fullName : profile.fullName || ''} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
            </div>
            <div className="flex min-w-0 flex-col">
              <label className="mb-2 block text-sm font-semibold text-[#555555]">Số điện thoại</label>
              <input className="ui-input h-11 w-full" readOnly={!isEditing} type="tel" value={isEditing ? formData.phone : profile.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="flex min-w-0 flex-col md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#555555]">Địa chỉ email</label>
              <input className="ui-input h-11 w-full opacity-75" readOnly type="email" value={profile.email} />
              <span className="mt-1.5 block text-xs text-[#888888]">Email không thể thay đổi</span>
            </div>
            {isEditing && <div className="flex flex-wrap gap-3 pt-2"><button type="submit" className="ui-button-primary px-5 py-2.5 text-sm">Lưu thay đổi</button><button type="button" onClick={() => setIsEditing(false)} className="ui-button-secondary px-5 py-2.5 text-sm">Hủy</button></div>}
          </form>
        </div>
      </div>
    </>
  );
}
