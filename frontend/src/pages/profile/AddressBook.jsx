import React, { useEffect, useState } from 'react';
import { addressService } from '../../services/api/addressService';

export default function AddressBook() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: null, fullName: '', phone: '', province: '', district: '', ward: '', addressLine: '', isDefault: false });

  useEffect(() => { fetchAddresses(); }, []);

  const fetchAddresses = async () => {
    try { const data = await addressService.getAddresses(); setAddresses(data); }
    catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleEdit = (addr) => { setFormData(addr); setIsEditing(true); };
  const handleAddNew = () => { setFormData({ id: null, fullName: '', phone: '', province: '', district: '', ward: '', addressLine: '', isDefault: addresses.length === 0 }); setIsEditing(true); };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa địa chỉ này?')) {
      try { await addressService.deleteAddress(id); fetchAddresses(); window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Đã xóa địa chỉ', type: 'success' }})); }
      catch (error) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Lỗi khi xóa địa chỉ', type: 'error' }})); }
    }
  };

  const handleSetDefault = async (id) => {
    try { await addressService.setDefaultAddress(id); fetchAddresses(); window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Đã đặt làm mặc định', type: 'success' }})); }
    catch (error) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Lỗi khi đặt mặc định', type: 'error' }})); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) await addressService.updateAddress(formData.id, formData);
      else await addressService.addAddress(formData);
      setIsEditing(false); fetchAddresses();
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Lưu địa chỉ thành công', type: 'success' }}));
    } catch (error) { window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Lỗi khi lưu địa chỉ', type: 'error' }})); }
  };

  if (loading) return <div className="ui-skeleton h-48 rounded-[12px]" />;

  if (isEditing) {
    return (
      <div className="rounded-[12px] border border-[#e5e5e5] bg-[#fafaf8] p-5 md:p-6">
        <h3 className="mb-5 text-xl font-bold text-[#333333]">{formData.id ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</h3>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2"><div className="space-y-3"><label className="text-sm font-semibold text-[#555555]">Họ tên</label><input type="text" className="ui-input" required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} /></div><div className="space-y-3"><label className="text-sm font-semibold text-[#555555]">Số điện thoại</label><input type="tel" className="ui-input" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div></div>
          <div className="grid gap-4 md:grid-cols-3"><div className="space-y-3"><label className="text-sm font-semibold text-[#555555]">Tỉnh/Thành</label><input type="text" className="ui-input" required value={formData.province} onChange={e => setFormData({ ...formData, province: e.target.value })} /></div><div className="space-y-3"><label className="text-sm font-semibold text-[#555555]">Quận/Huyện</label><input type="text" className="ui-input" required value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} /></div><div className="space-y-3"><label className="text-sm font-semibold text-[#555555]">Phường/Xã</label><input type="text" className="ui-input" required value={formData.ward} onChange={e => setFormData({ ...formData, ward: e.target.value })} /></div></div>
          <div className="space-y-3"><label className="text-sm font-semibold text-[#555555]">Địa chỉ cụ thể</label><input type="text" className="ui-input" required value={formData.addressLine} onChange={e => setFormData({ ...formData, addressLine: e.target.value })} /></div>
          <div className="flex items-center gap-2"><input type="checkbox" id="isDefault" checked={formData.isDefault} onChange={e => setFormData({ ...formData, isDefault: e.target.checked })} className="rounded border-[#dddddd] text-[#333333] focus:ring-[#bfa37c]" /><label htmlFor="isDefault" className="text-sm font-semibold text-[#333333]">Đặt làm địa chỉ mặc định</label></div>
          <div className="flex flex-wrap gap-3 pt-2"><button type="submit" className="ui-button-primary px-5 py-2.5 text-sm">Lưu địa chỉ</button><button type="button" onClick={() => setIsEditing(false)} className="ui-button-secondary px-5 py-2.5 text-sm">Hủy</button></div>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-[#eeeeee] pb-6 md:flex-row md:items-end md:justify-between"><div><h2 className="text-2xl font-bold text-[#333333]">Sổ địa chỉ</h2><p className="mt-2 text-sm leading-6 text-[#777777]">Quản lý địa chỉ nhận hàng của bạn.</p></div><button type="button" onClick={handleAddNew} className="ui-button-primary px-5 py-2.5 text-sm">Thêm địa chỉ</button></div>
      <div className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2">
        {addresses.map(addr => <div key={addr.id} className="relative rounded-[12px] border border-[#e5e5e5] bg-white p-5 transition-colors hover:border-[#bfa37c]">{addr.isDefault && <span className="ui-badge absolute right-5 top-5 bg-[#fbf3db] text-[#956400]">Mặc định</span>}<h4 className="pr-24 text-base font-bold text-[#333333]">{addr.fullName}</h4><p className="mt-1 text-sm text-[#777777]">{addr.phone}</p><p className="mt-4 text-sm leading-6 text-[#555555]">{addr.addressLine}</p><p className="text-sm leading-6 text-[#555555]">{addr.ward}, {addr.district}, {addr.province}</p><div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[#eeeeee] pt-4 text-sm font-semibold"><button type="button" onClick={() => handleEdit(addr)} className="text-[#333333] hover:text-[#bfa37c]">Chỉnh sửa</button><button type="button" onClick={() => handleDelete(addr.id)} className="text-[#9f2f2d] hover:underline">Xóa</button>{!addr.isDefault && <button type="button" onClick={() => handleSetDefault(addr.id)} className="ml-auto text-[#333333] hover:text-[#bfa37c]">Đặt mặc định</button>}</div></div>)}
        {addresses.length === 0 && <div className="ui-empty-state md:col-span-2">Chưa có địa chỉ nào được lưu.</div>}
      </div>
    </>
  );
}