import React, { useEffect, useState } from 'react';
import { addressService } from '../../services/api/addressService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import FormField from '../../components/ui/FormField';

const emptyAddressForm = {
  id: null,
  fullName: '',
  phone: '',
  province: '',
  district: '',
  ward: '',
  addressLine: '',
  isDefault: false
};

const fieldLabelClass = 'mb-2 block text-sm font-semibold text-[#434343]';
const fieldInputClass = 'h-11 w-full';

export default function AddressBook() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(emptyAddressForm);

  useEffect(() => { fetchAddresses(); }, []);

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
    setFormData({ ...emptyAddressForm, isDefault: addresses.length === 0 });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa địa chỉ này?')) {
      try {
        await addressService.deleteAddress(id);
        fetchAddresses();
        window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Đã xóa địa chỉ', type: 'success' } }));
      } catch (error) {
        window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Lỗi khi xóa địa chỉ', type: 'error' } }));
      }
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await addressService.setDefaultAddress(id);
      fetchAddresses();
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Đã đặt làm mặc định', type: 'success' } }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Lỗi khi đặt mặc định', type: 'error' } }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) await addressService.updateAddress(formData.id, formData);
      else await addressService.addAddress(formData);
      setIsEditing(false);
      fetchAddresses();
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Lưu địa chỉ thành công', type: 'success' } }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Lỗi khi lưu địa chỉ', type: 'error' } }));
    }
  };

  if (loading) return <Skeleton className="h-48 rounded-[12px]" />;

  if (isEditing) {
    return (
      <div className="w-full rounded-[12px] border border-[#e5e5e5] bg-[#fafaf8] p-5 md:p-6">
        <div className="mb-6 border-b border-[#eeeeee] pb-4">
          <h3 className="text-xl font-bold text-[#333333]">{formData.id ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</h3>
          <p className="mt-2 text-sm leading-6 text-[#777777]">Cập nhật thông tin nhận hàng để đơn hàng được giao chính xác.</p>
        </div>

        <form onSubmit={handleSave} className="w-full space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField label="Họ tên" className="w-full" labelClassName={fieldLabelClass}>
              <Input
                type="text"
                className={fieldInputClass}
                required
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              />
            </FormField>

            <FormField label="Số điện thoại" className="w-full" labelClassName={fieldLabelClass}>
              <Input
                type="tel"
                className={fieldInputClass}
                required
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <FormField label="Tỉnh/Thành" className="w-full" labelClassName={fieldLabelClass}>
              <Input
                type="text"
                className={fieldInputClass}
                required
                value={formData.province}
                onChange={e => setFormData({ ...formData, province: e.target.value })}
              />
            </FormField>

            <FormField label="Quận/Huyện" className="w-full" labelClassName={fieldLabelClass}>
              <Input
                type="text"
                className={fieldInputClass}
                required
                value={formData.district}
                onChange={e => setFormData({ ...formData, district: e.target.value })}
              />
            </FormField>

            <FormField label="Phường/Xã" className="w-full" labelClassName={fieldLabelClass}>
              <Input
                type="text"
                className={fieldInputClass}
                required
                value={formData.ward}
                onChange={e => setFormData({ ...formData, ward: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Địa chỉ cụ thể" className="w-full" labelClassName={fieldLabelClass}>
            <Input
              type="text"
              className={fieldInputClass}
              required
              value={formData.addressLine}
              onChange={e => setFormData({ ...formData, addressLine: e.target.value })}
            />
          </FormField>

          <label htmlFor="isDefault" className="flex w-fit cursor-pointer items-center gap-3 rounded-[8px] py-1 text-sm font-semibold text-[#333333]">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
              className="h-4 w-4 rounded border-[#dddddd] text-[#333333] focus:ring-[#bfa37c]"
            />
            <span>Đặt làm địa chỉ mặc định</span>
          </label>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <Button type="submit" className="h-11 px-5 text-sm sm:w-auto">Lưu địa chỉ</Button>
            <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} className="h-11 px-5 text-sm sm:w-auto">Hủy</Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-[#eeeeee] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#333333]">Sổ địa chỉ</h2>
          <p className="mt-2 text-sm leading-6 text-[#777777]">Quản lý địa chỉ nhận hàng của bạn.</p>
        </div>
        <Button type="button" onClick={handleAddNew} className="px-5 py-2.5 text-sm">Thêm địa chỉ</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2">
        {addresses.map(addr => (
          <div key={addr.id} className="relative rounded-[12px] border border-[#e5e5e5] bg-white p-5 transition-colors hover:border-[#bfa37c]">
            {addr.isDefault && <Badge variant="warning" className="absolute right-5 top-5">Mặc định</Badge>}
            <h4 className="pr-24 text-base font-bold text-[#333333]">{addr.fullName}</h4>
            <p className="mt-1 text-sm text-[#777777]">{addr.phone}</p>
            <p className="mt-4 text-sm leading-6 text-[#555555]">{addr.addressLine}</p>
            <p className="text-sm leading-6 text-[#555555]">{addr.ward}, {addr.district}, {addr.province}</p>
            <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[#eeeeee] pt-4 text-sm font-semibold">
              <button type="button" onClick={() => handleEdit(addr)} className="text-[#333333] hover:text-[#bfa37c]">Chỉnh sửa</button>
              <button type="button" onClick={() => handleDelete(addr.id)} className="text-[#9f2f2d] hover:underline">Xóa</button>
              {!addr.isDefault && <button type="button" onClick={() => handleSetDefault(addr.id)} className="ml-auto text-[#333333] hover:text-[#bfa37c]">Đặt mặc định</button>}
            </div>
          </div>
        ))}
        {addresses.length === 0 && <div className="ui-empty-state md:col-span-2">Chưa có địa chỉ nào được lưu.</div>}
      </div>
    </>
  );
}