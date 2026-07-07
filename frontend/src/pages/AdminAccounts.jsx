import React, { useState, useEffect } from 'react';
import { adminAccountService } from '../services/api/adminAccountService';
import { permissionService } from '../services/api/permissionService';
import AdminLayout from '../layouts/AdminLayout';

export default function AdminAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [permissionsList, setPermissionsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentAccountId, setCurrentAccountId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const initialFormState = {
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff', // staff, admin
    position: '',
    permissions: []
  };
  const [formData, setFormData] = useState(initialFormState);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accountsData, permissionsRes] = await Promise.all([
        adminAccountService.getAdminAccounts(),
        permissionService.getPermissions()
      ]);
      setAccounts(accountsData);
      setPermissionsList(permissionsRes.permissions || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditMode(false);
    setCurrentAccountId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (account) => {
    setEditMode(true);
    setCurrentAccountId(account.id);
    setFormData({
      fullName: account.fullName || '',
      email: account.email || '',
      phone: account.phone || '',
      password: '', // Do not load password on edit
      role: account.role || 'staff',
      position: account.position || '',
      permissions: account.userPermissions ? account.userPermissions.map(up => up.permission.key) : []
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (id, currentStatus, role) => {
    // Check if this is the last admin
    if (currentStatus && role === 'admin') {
      const adminCount = accounts.filter(a => a.role === 'admin' && a.isActive).length;
      if (adminCount <= 1) {
        alert('Không thể khóa tài khoản quản trị viên duy nhất còn hoạt động!');
        return;
      }
    }

    const actionText = currentStatus ? 'khóa' : 'mở khóa';
    if (window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản này?`)) {
      try {
        await adminAccountService.updateAdminAccountStatus(id, !currentStatus);
        alert(`Đã ${actionText} thành công!`);
        fetchData();
      } catch (err) {
        alert(err.message || 'Lỗi khi cập nhật trạng thái');
      }
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (permKey) => {
    setFormData(prev => {
      const perms = prev.permissions || [];
      if (perms.includes(permKey)) {
        return { ...prev, permissions: perms.filter(p => p !== permKey) };
      } else {
        return { ...prev, permissions: [...perms, permKey] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim() || !formData.email.trim() || (!editMode && !formData.password.trim())) {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    try {
      setIsSaving(true);
      if (editMode) {
        // Prepare payload for update
        const payload = {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          position: formData.position,
          permissions: formData.permissions
        };
        await adminAccountService.updateAdminAccount(currentAccountId, payload);
        alert('Cập nhật tài khoản quản trị thành công!');
      } else {
        await adminAccountService.createAdminAccount(formData);
        alert('Tạo tài khoản quản trị thành công!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Lỗi khi lưu tài khoản');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredAccounts = accounts.filter(a => {
    const search = searchTerm.toLowerCase();
    return (a.fullName && a.fullName.toLowerCase().includes(search)) ||
      (a.email && a.email.toLowerCase().includes(search)) ||
      (a.phone && a.phone.toLowerCase().includes(search)) ||
      (a.role && a.role.toLowerCase().includes(search)) ||
      (a.position && a.position.toLowerCase().includes(search));
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex-grow flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  const getPermissionGroupLabel = (group) => group === 'Promotions' ? 'Khuyến mãi' : group;

  // Group permissions for rendering
  const groupedPermissions = permissionsList.reduce((acc, perm) => {
    if (!acc[perm.group]) acc[perm.group] = [];
    acc[perm.group].push(perm);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="p-8 max-w-[1400px] mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-display-lg text-4xl text-primary tracking-tight mb-2">Quản lý Tài khoản Quản trị & Phân quyền</h1>
            <p className="text-on-surface-variant font-body-sm">Thêm mới, cập nhật thông tin và điều chỉnh quyền truy cập của nhân viên (staff) và quản trị viên (admin).</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={fetchData} className="flex items-center gap-2 border border-outline-variant/50 text-primary px-5 py-2.5 rounded-lg shadow-sm hover:bg-surface-beige transition-colors font-label-md tracking-wider uppercase">
              <span className="material-symbols-outlined text-sm">refresh</span>
              Làm mới
            </button>
            <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg shadow-[0_4px_12px_rgba(93,64,55,0.2)] hover:-translate-y-0.5 transition-all font-label-md tracking-wider uppercase">
              <span className="material-symbols-outlined text-sm">person_add</span>
              Thêm tài khoản
            </button>
          </div>
        </div>

      {error ? (
        <div className="bg-error-container text-on-error-container p-6 rounded-2xl mb-8">{error}</div>
      ) : (
        <div className="bg-white rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] overflow-hidden flex flex-col">
          {/* Toolbar */}
          <div className="p-6 border-b border-surface-beige flex flex-col md:flex-row gap-6 justify-between bg-white">
            <div className="relative w-full md:w-[400px]">
              <input
                type="text"
                placeholder="Tìm theo tên, email, chức vụ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant/50 rounded-full pl-12 pr-4 py-3 text-body-md outline-none focus:border-accent-gold focus:ring-1 focus:ring-accent-gold transition-colors shadow-sm"
              />
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[22px]">search</span>
            </div>
          </div>

          {/* Table */}
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-24">
              <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">manage_accounts</span>
              <p className="text-on-surface-variant font-label-lg">Không tìm thấy tài khoản quản trị nào.</p>
            </div>
          ) : (
            <div className="overflow-x-auto p-2">
              <table className="w-full text-left font-body-sm">
                <thead className="bg-surface-ivory border-b border-surface-beige text-xs font-label-lg uppercase tracking-wider">
                  <tr>
                    <th className="p-5 font-semibold text-on-surface-variant">Tên người dùng</th>
                    <th className="p-5 font-semibold text-on-surface-variant">Email / Số điện thoại</th>
                    <th className="p-5 font-semibold text-on-surface-variant">Vai trò</th>
                    <th className="p-5 font-semibold text-on-surface-variant">Chức vụ</th>
                    <th className="p-5 font-semibold text-on-surface-variant">Ngày tạo</th>
                    <th className="p-5 font-semibold text-on-surface-variant text-center">Trạng thái</th>
                    <th className="p-5 font-semibold text-on-surface-variant text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-beige">
                  {filteredAccounts.map(a => (
                    <tr key={a.id} className="hover:bg-surface-beige/30 transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-lg ${a.role === 'admin' ? 'bg-accent-terracotta' : 'bg-primary'}`}>
                            {a.fullName?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-label-lg text-primary text-[15px]">{a.fullName}</p>
                            <p className="text-xs text-on-surface-variant mt-1">ID: #{a.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 text-body-sm">
                        <p className="font-medium text-primary">{a.email}</p>
                        <p className="text-on-surface-variant mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">call</span>{a.phone || 'Chưa cập nhật'}</p>
                      </td>
                      <td className="p-5">
                        <span className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full font-bold ${a.role === 'admin' ? 'bg-accent-terracotta/10 text-accent-terracotta' : 'bg-primary/10 text-primary'}`}>
                          {a.role}
                        </span>
                      </td>
                      <td className="p-5 text-body-sm text-on-surface-variant">
                        {a.position || '—'}
                      </td>
                      <td className="p-5 text-body-sm text-on-surface-variant">
                        {new Date(a.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="p-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-full font-bold ${a.isActive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${a.isActive ? 'bg-success' : 'bg-error'}`}></span>
                          {a.isActive ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleOpenEditModal(a)} className="w-9 h-9 rounded-full hover:bg-surface-beige text-primary flex items-center justify-center transition-colors border border-transparent hover:border-outline-variant/50" title="Sửa thông tin">
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button onClick={() => handleToggleStatus(a.id, a.isActive, a.role)} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors border border-transparent hover:border-error/30 ${a.isActive ? 'hover:bg-error-container text-error' : 'hover:bg-success/20 text-success'}`} title={a.isActive ? 'Khóa tài khoản' : 'Mở khóa'}>
                            <span className="material-symbols-outlined text-[20px]">{a.isActive ? 'lock' : 'lock_open'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Thêm/Sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] overflow-hidden flex flex-col max-h-[90vh]" role="dialog" aria-modal="true" aria-label={editMode ? 'Cập nhật tài khoản quản trị' : 'Tạo tài khoản quản trị mới'}>
            <div className="p-8 border-b border-surface-beige flex justify-between items-center bg-white shrink-0">
              <h2 className="font-display-sm text-2xl text-primary font-semibold">{editMode ? 'Cập nhật tài khoản quản trị' : 'Tạo tài khoản quản trị mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container transition-colors" aria-label="Đóng form tài khoản">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto bg-surface-bright flex-grow">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">Họ và tên <span className="text-error">*</span></label>
                  <input required name="fullName" value={formData.fullName} onChange={handleFormChange} className="w-full border border-outline-variant/50 bg-white rounded-xl px-4 py-3 outline-none focus:border-accent-gold focus:ring-1 focus:ring-accent-gold transition-colors text-[15px]" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">Email <span className="text-error">*</span></label>
                  <input required type="email" name="email" value={formData.email} onChange={handleFormChange} className="w-full border border-outline-variant/50 bg-white rounded-xl px-4 py-3 outline-none focus:border-accent-gold focus:ring-1 focus:ring-accent-gold transition-colors text-[15px]" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">Số điện thoại</label>
                  <input name="phone" value={formData.phone} onChange={handleFormChange} className="w-full border border-outline-variant/50 bg-white rounded-xl px-4 py-3 outline-none focus:border-accent-gold focus:ring-1 focus:ring-accent-gold transition-colors text-[15px]" />
                </div>

                {!editMode && (
                  <div>
                    <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">Mật khẩu khởi tạo <span className="text-error">*</span></label>
                    <input required type="password" name="password" value={formData.password} onChange={handleFormChange} className="w-full border border-outline-variant/50 bg-white rounded-xl px-4 py-3 outline-none focus:border-accent-gold focus:ring-1 focus:ring-accent-gold transition-colors text-[15px]" />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">Chức vụ / Nhóm nhân viên</label>
                  <input type="text" name="position" value={formData.position} onChange={handleFormChange} className="w-full border border-outline-variant/50 bg-white rounded-xl px-4 py-3 outline-none focus:border-accent-gold focus:ring-1 focus:ring-accent-gold transition-colors text-[15px]" placeholder="Ví dụ: Nhân viên kho, CSKH" maxLength={100} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">Vai trò / Phân quyền <span className="text-error">*</span></label>
                  <select name="role" value={formData.role} onChange={handleFormChange} className="w-full border border-outline-variant/50 bg-white rounded-xl px-4 py-3 outline-none focus:border-accent-gold focus:ring-1 focus:ring-accent-gold transition-colors font-medium text-primary">
                    <option value="staff">Staff</option>
                    <option value="admin">Admin (Toàn quyền quản trị)</option>
                  </select>
                </div>

                {formData.role === 'staff' && (
                  <div className="pt-6 border-t border-surface-beige mt-6">
                    <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-4">Quyền hạn truy cập <span className="text-error">*</span></label>
                    <div className="space-y-4">
                      {Object.keys(groupedPermissions).map(group => (
                        <div key={group} className="bg-white p-5 rounded-2xl border border-surface-beige shadow-[0_4px_24px_rgba(93,64,55,0.02)]">
                          <h4 className="font-label-lg text-primary mb-4 uppercase tracking-widest text-[11px] border-b border-surface-beige pb-3">{getPermissionGroupLabel(group)}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groupedPermissions[group].map(perm => (
                              <label key={perm.key} className="flex items-start gap-3 cursor-pointer group">
                                <div className="relative flex items-center pt-1">
                                  <input
                                    type="checkbox"
                                    checked={formData.permissions.includes(perm.key)}
                                    onChange={() => handlePermissionChange(perm.key)}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-outline-variant/50 checked:border-primary checked:bg-primary transition-all shadow-sm"
                                  />
                                  <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                    <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[14px] font-medium text-primary block group-hover:text-accent-terracotta transition-colors">{perm.name}</span>
                                  <span className="text-xs text-on-surface-variant block mt-0.5">{perm.description}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formData.role === 'admin' && (
                  <div className="pt-6 border-t border-surface-beige mt-6">
                    <div className="bg-accent-terracotta/5 p-5 rounded-2xl border border-accent-terracotta/20 flex gap-4">
                      <span className="material-symbols-outlined text-accent-terracotta text-2xl mt-0.5">verified_user</span>
                      <div>
                        <p className="font-label-lg text-accent-terracotta text-[15px]">Toàn quyền hệ thống</p>
                        <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">Tài khoản Admin có quyền truy cập tất cả tính năng mà không bị giới hạn bởi các quyền hạn cụ thể.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-surface-beige bg-surface-bright shrink-0 sticky bottom-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 border border-outline-variant/50 rounded-lg text-primary hover:bg-surface-beige transition-colors font-label-md tracking-wider uppercase">Hủy</button>
                <button type="submit" disabled={isSaving} className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-label-md tracking-wider uppercase disabled:opacity-50 shadow-[0_4px_12px_rgba(93,64,55,0.2)]">
                  {isSaving ? 'Đang lưu...' : 'Lưu tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
