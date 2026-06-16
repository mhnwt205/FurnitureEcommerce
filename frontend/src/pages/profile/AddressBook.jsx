import React, { useEffect, useState } from 'react';
import { addressService } from '../../services/api/addressService';
import Toast from '../../components/common/Toast';

export default function AddressBook() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    fullName: '',
    phone: '',
    province: '',
    district: '',
    ward: '',
    addressLine: '',
    isDefault: false
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const data = await addressService.getAddresses();
      setAddresses(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (addr) => {
    setFormData(addr);
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setFormData({
      id: null,
      fullName: '',
      phone: '',
      province: '',
      district: '',
      ward: '',
      addressLine: '',
      isDefault: addresses.length === 0 // default true if first address
    });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa địa chỉ này?')) {
      try {
        await addressService.deleteAddress(id);
        fetchAddresses();
        window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Đã xóa địa chỉ', type: 'success' }}));
      } catch (error) {
        window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Lỗi khi xóa địa chỉ', type: 'error' }}));
      }
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await addressService.setDefaultAddress(id);
      fetchAddresses();
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Đã đặt làm mặc định', type: 'success' }}));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Lỗi khi đặt mặc định', type: 'error' }}));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await addressService.updateAddress(formData.id, formData);
      } else {
        await addressService.addAddress(formData);
      }
      setIsEditing(false);
      fetchAddresses();
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Lưu địa chỉ thành công', type: 'success' }}));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Lỗi khi lưu địa chỉ', type: 'error' }}));
    }
  };

  if (loading) return <div>Đang tải...</div>;

  if (isEditing) {
    return (
      <div className="bg-surface-beige p-8 rounded-lg max-w-2xl">
        <h3 className="font-headline-md text-headline-md text-primary mb-6">{formData.id ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</h3>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-on-surface-variant">Họ tên</label>
              <input type="text" className="bg-white border border-outline-variant p-3 focus:ring-0 focus:border-accent-gold" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-on-surface-variant">Số điện thoại</label>
              <input type="tel" className="bg-white border border-outline-variant p-3 focus:ring-0 focus:border-accent-gold" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-on-surface-variant">Tỉnh/Thành</label>
              <input type="text" className="bg-white border border-outline-variant p-3 focus:ring-0 focus:border-accent-gold" required value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-on-surface-variant">Quận/Huyện</label>
              <input type="text" className="bg-white border border-outline-variant p-3 focus:ring-0 focus:border-accent-gold" required value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-on-surface-variant">Phường/Xã</label>
              <input type="text" className="bg-white border border-outline-variant p-3 focus:ring-0 focus:border-accent-gold" required value={formData.ward} onChange={e => setFormData({...formData, ward: e.target.value})} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-label-md text-on-surface-variant">Địa chỉ cụ thể</label>
            <input type="text" className="bg-white border border-outline-variant p-3 focus:ring-0 focus:border-accent-gold" required value={formData.addressLine} onChange={e => setFormData({...formData, addressLine: e.target.value})} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isDefault" checked={formData.isDefault} onChange={e => setFormData({...formData, isDefault: e.target.checked})} className="text-accent-gold focus:ring-0 rounded-sm" />
            <label htmlFor="isDefault" className="font-label-md text-primary">Đặt làm địa chỉ mặc định</label>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="submit" className="px-6 py-3 bg-primary text-white rounded font-label-lg">Lưu địa chỉ</button>
            <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-3 border border-outline-variant rounded font-label-lg">Hủy</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-end border-b border-outline-variant pb-8 mb-8">
        <div>
          <h1 className="font-display-lg text-display-lg text-primary mb-2">Sổ địa chỉ</h1>
          <p className="font-body-md text-on-surface-variant">Quản lý địa chỉ nhận hàng của bạn.</p>
        </div>
        <button onClick={handleAddNew} className="px-6 py-3 bg-accent-gold text-white font-label-lg rounded">Thêm địa chỉ</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {addresses.map(addr => (
          <div key={addr.id} className="border border-outline-variant rounded-lg p-6 relative">
            {addr.isDefault && (
              <span className="absolute top-6 right-6 text-[10px] bg-accent-gold/20 text-accent-gold font-bold px-2 py-1 rounded uppercase tracking-wider">Mặc định</span>
            )}
            <h4 className="font-label-lg text-primary mb-1">{addr.fullName}</h4>
            <p className="text-body-sm text-on-surface-variant mb-4">{addr.phone}</p>
            <p className="text-body-sm text-on-surface-variant">{addr.addressLine}</p>
            <p className="text-body-sm text-on-surface-variant">{addr.ward}, {addr.district}, {addr.province}</p>
            
            <div className="mt-6 flex items-center gap-4 border-t border-outline-variant/30 pt-4">
              <button onClick={() => handleEdit(addr)} className="text-label-sm text-primary hover:text-accent-gold">Chỉnh sửa</button>
              <button onClick={() => handleDelete(addr.id)} className="text-label-sm text-error hover:underline">Xóa</button>
              {!addr.isDefault && (
                <button onClick={() => handleSetDefault(addr.id)} className="text-label-sm text-primary hover:text-accent-gold ml-auto">Đặt mặc định</button>
              )}
            </div>
          </div>
        ))}
        {addresses.length === 0 && (
          <p className="text-on-surface-variant col-span-2">Chưa có địa chỉ nào được lưu.</p>
        )}
      </div>
    </>
  );
}
