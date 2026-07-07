import React, { useState, useEffect } from 'react';
import { customerService } from '../services/api/customerService';
import AdminLayout from '../layouts/AdminLayout';
import { getStaticFileUrl } from '../utils/imageUtils';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all'); // all, credentials, google
  const [verifiedFilter, setVerifiedFilter] = useState('all'); // all, verified, unverified
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, locked

  // Detail Modal State
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Confirm Status Modal State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, customerId: null, currentStatus: null, customerName: '' });

  useEffect(() => {
    fetchCustomers();
  }, [page, limit, search, providerFilter, verifiedFilter, statusFilter]);

  const fetchCustomers = async () => {
    try {
      let isEmailVerified = 'all';
      if (verifiedFilter === 'verified') isEmailVerified = 'true';
      if (verifiedFilter === 'unverified') isEmailVerified = 'false';

      let isActive = 'all';
      if (statusFilter === 'active') isActive = 'true';
      if (statusFilter === 'locked') isActive = 'false';

      const data = await customerService.getCustomers({
        page,
        limit,
        search,
        loginType: providerFilter,
        isEmailVerified,
        isActive
      });
      if (data && data.pagination) {
        setCustomers(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      } else {
        setCustomers(Array.isArray(data) ? data : []);
        setTotalItems(Array.isArray(data) ? data.length : 0);
      }
      setError(null);
    } catch (err) {
      setError(err.message || 'Lỗi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (id, currentStatus, fullName) => {
    setConfirmModal({
      isOpen: true,
      customerId: id,
      currentStatus,
      customerName: fullName || 'Khách hàng'
    });
  };

  const handleConfirmToggle = async () => {
    const { customerId, currentStatus } = confirmModal;
    const actionText = currentStatus ? 'khóa' : 'mở khóa';
    try {
      await customerService.updateCustomerStatus(customerId, !currentStatus);
      setConfirmModal({ isOpen: false, customerId: null, currentStatus: null, customerName: '' });
      fetchCustomers();
      if (selectedCustomerId === customerId) {
        fetchCustomerDetail(customerId);
      }
    } catch (err) {
      alert(err.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const handleOpenDetail = async (id) => {
    setSelectedCustomerId(id);
    setIsDetailOpen(true);
    fetchCustomerDetail(id);
  };

  const fetchCustomerDetail = async (id) => {
    try {
      setLoadingDetail(true);
      const data = await customerService.getCustomerById(id);
      setCustomerDetail(data);
    } catch (err) {
      alert(err.message || 'Lỗi tải chi tiết khách hàng');
    } finally {
      setLoadingDetail(false);
    }
  };



  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex-grow flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8 max-w-[1400px] mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-display-lg text-4xl text-primary tracking-tight mb-2">Quản lý Khách hàng</h1>
            <p className="text-on-surface-variant font-body-sm">Xem danh sách, đơn hàng, khóa hoặc mở khóa tài khoản khách hàng.</p>
          </div>
          <button onClick={fetchCustomers} className="flex items-center gap-2 border border-outline-variant text-primary px-5 py-2.5 rounded shadow-sm hover:bg-surface-beige transition-colors font-label-md tracking-wider uppercase">
            <span className="material-symbols-outlined text-sm">refresh</span>
            Làm mới
          </button>
        </div>

      {error ? (
        <div className="bg-error-container text-on-error-container p-6 rounded-2xl mb-8">{error}</div>
      ) : (
        <div className="bg-white rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] overflow-hidden flex flex-col">
          {/* Toolbar & Filters */}
          <div className="p-6 border-b border-surface-beige flex flex-col lg:flex-row lg:items-center gap-3 bg-white">
            <div className="relative flex-1 min-w-[280px]">
              <input 
                type="text" 
                placeholder="Tìm khách hàng theo tên, email, sđt..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full bg-surface-bright border border-outline-variant/50 rounded-full pl-11 h-12 text-body-md outline-none focus:border-accent-gold focus:ring-1 focus:ring-accent-gold transition-colors shadow-sm"
              />
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[22px]">search</span>
            </div>

            <select 
              value={providerFilter} 
              onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}
              className="h-12 rounded-full px-5 min-w-[180px] border border-outline-variant/50 text-body-md bg-white outline-none focus:border-accent-gold focus:ring-1 shadow-sm font-medium text-primary cursor-pointer"
            >
              <option value="all">Mọi loại đăng nhập</option>
              <option value="credentials">Email & Mật khẩu</option>
              <option value="google">Google</option>
            </select>

            <select 
              value={verifiedFilter} 
              onChange={(e) => { setVerifiedFilter(e.target.value); setPage(1); }}
              className="h-12 rounded-full px-5 min-w-[180px] border border-outline-variant/50 text-body-md bg-white outline-none focus:border-accent-gold focus:ring-1 shadow-sm font-medium text-primary cursor-pointer"
            >
              <option value="all">Xác thực Email</option>
              <option value="verified">Đã xác thực</option>
              <option value="unverified">Chưa xác thực</option>
            </select>

            <select 
              value={statusFilter} 
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-12 rounded-full px-5 min-w-[180px] border border-outline-variant/50 text-body-md bg-white outline-none focus:border-accent-gold focus:ring-1 shadow-sm font-medium text-primary cursor-pointer"
            >
              <option value="all">Trạng thái hoạt động</option>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Bị khóa</option>
            </select>
            
            <select 
              value={limit} 
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="h-12 rounded-full px-5 min-w-[150px] border border-outline-variant/50 text-body-md bg-white outline-none focus:border-accent-gold focus:ring-1 shadow-sm font-medium text-primary cursor-pointer"
            >
              <option value={10}>10 dòng / trang</option>
              <option value={20}>20 dòng / trang</option>
              <option value={50}>50 dòng / trang</option>
            </select>
          </div>

          {/* Table */}
          {customers.length === 0 ? (
            <div className="text-center py-24">
              <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">group</span>
              <p className="text-on-surface-variant font-label-lg">Không tìm thấy khách hàng nào.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto p-2">
                <table className="w-full text-left font-body-sm">
                  <thead className="bg-surface-ivory border-b border-surface-beige text-xs font-label-lg uppercase tracking-wider">
                    <tr>
                      <th className="p-5 font-semibold text-on-surface-variant">Khách hàng</th>
                      <th className="p-5 font-semibold text-on-surface-variant">Đăng nhập</th>
                      <th className="p-5 font-semibold text-on-surface-variant">Xác thực</th>
                      <th className="p-5 font-semibold text-on-surface-variant">Liên hệ</th>

                      <th className="p-5 font-semibold text-on-surface-variant text-center">Đơn hàng</th>
                      <th className="p-5 font-semibold text-on-surface-variant text-center">Yêu thích</th>
                      <th className="p-5 font-semibold text-on-surface-variant text-right">Tổng chi tiêu</th>
                      <th className="p-5 font-semibold text-on-surface-variant text-center">Trạng thái</th>
                      <th className="p-5 font-semibold text-on-surface-variant text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-beige">
                    {customers.map(c => (
                      <tr key={c.id} className="hover:bg-surface-beige/30 transition-colors">
                        <td className="p-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                              {c.fullName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-label-lg text-[15px] text-primary">{c.fullName}</p>
                              <p className="text-xs text-on-surface-variant mt-1">Tham gia: {new Date(c.createdAt).toLocaleDateString('vi-VN')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${c.provider === 'google' ? 'bg-error-container text-error' : 'bg-primary/10 text-primary'}`}>
                            {c.provider === 'google' ? 'Google' : 'Local'}
                          </span>
                        </td>
                        <td className="p-5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${c.emailVerified ? 'bg-success/10 text-success' : 'bg-outline-variant/30 text-on-surface-variant'}`}>
                            {c.emailVerified ? 'Verified' : 'Unverified'}
                          </span>
                        </td>
                        <td className="p-5 text-body-sm">
                          <p className="font-medium text-primary">{c.email}</p>
                          <p className="text-on-surface-variant mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">call</span>{c.phone || 'Chưa cập nhật'}</p>
                        </td>

                        <td className="p-5 text-center font-bold text-primary">
                          {c.orderCount || 0}
                        </td>
                        <td className="p-5 text-center font-bold text-accent-terracotta">
                          <div className="flex items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">favorite</span>
                            {c.wishlistCount || 0}
                          </div>
                        </td>
                        <td className="p-5 font-bold text-accent-terracotta text-[15px] text-right">
                          {formatCurrency(c.totalSpend || 0)}
                        </td>
                        <td className="p-5 text-center">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full font-bold ${c.isActive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-success' : 'bg-error'}`}></span>
                            {c.isActive ? 'Hoạt động' : 'Bị khóa'}
                          </span>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => handleOpenDetail(c.id)} className="w-9 h-9 rounded-full hover:bg-surface-beige text-primary flex items-center justify-center transition-colors border border-transparent hover:border-outline-variant/50" title="Xem chi tiết đơn hàng">
                              <span className="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                            <button onClick={() => handleToggleStatus(c.id, c.isActive, c.fullName)} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors border border-transparent hover:border-error/30 ${c.isActive ? 'hover:bg-error-container text-error' : 'hover:bg-success/20 text-success'}`} title={c.isActive ? 'Khóa tài khoản' : 'Mở khóa'}>
                              <span className="material-symbols-outlined text-[20px]">{c.isActive ? 'lock' : 'lock_open'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Phân trang */}
              <div className="p-4 border-t border-surface-beige flex flex-col md:flex-row justify-between items-center bg-surface-ivory gap-4">
                <div className="text-on-surface-variant font-body-sm">
                  Hiển thị <span className="font-bold text-primary">{customers.length}</span> trên tổng số <span className="font-bold text-primary">{totalItems}</span> khách hàng
                </div>
                <div className="flex gap-2 items-center">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page <= 1}
                    className="px-3 py-1.5 border border-outline-variant/50 rounded hover:bg-surface-beige disabled:opacity-40 disabled:hover:bg-transparent text-primary font-label-md transition-colors"
                  >
                    Trước
                  </button>
                  <span className="font-label-md text-primary mx-2">Trang {page} / {totalPages || 1}</span>
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 border border-outline-variant/50 rounded hover:bg-surface-beige disabled:opacity-40 disabled:hover:bg-transparent text-primary font-label-md transition-colors"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Drawer/Modal Chi tiết khách hàng */}
      {isDetailOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-[800px] h-full shadow-[0_0_40px_rgba(0,0,0,0.1)] flex flex-col animation-slide-left overflow-hidden">
            <div className="p-8 border-b border-surface-beige flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
              <div>
                <h2 className="font-display-sm text-2xl text-primary font-semibold">Chi tiết khách hàng</h2>
                <p className="text-sm text-on-surface-variant mt-1 font-medium">Lịch sử hoạt động và mua sắm.</p>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-8 flex-grow overflow-y-auto bg-surface-bright">
              {loadingDetail ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : customerDetail ? (
                <div className="space-y-8">
                  {/* Block 1: Basic Info */}
                  <div className="bg-white p-6 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
                    <h3 className="font-label-lg text-primary uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-surface-beige pb-4">
                      Thông tin cơ bản
                    </h3>
                    <div className="flex items-center gap-6 mb-6">
                      <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-display-sm">
                        {customerDetail.fullName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-display-sm text-2xl text-primary font-semibold">{customerDetail.fullName}</h3>
                        <p className="text-sm text-on-surface-variant mt-1 font-medium">Mã khách hàng: #{customerDetail.id}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 text-body-sm pt-6 border-t border-surface-beige">
                      <div>
                        <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-wider mb-1">Email</p>
                        <p className="font-medium text-primary text-[15px]">{customerDetail.email}</p>
                      </div>
                      <div>
                        <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-wider mb-1">Số điện thoại</p>
                        <p className="font-medium text-primary text-[15px]">{customerDetail.phone || 'Chưa có'}</p>
                      </div>
                      <div>
                        <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-wider mb-1">Ngày tham gia</p>
                        <p className="font-medium text-primary text-[15px]">{new Date(customerDetail.createdAt).toLocaleDateString('vi-VN')}</p>
                      </div>
                      <div>
                        <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-wider mb-1">Trạng thái tài khoản</p>
                        <p className={`font-bold text-[13px] uppercase tracking-wider inline-block px-3 py-1 rounded-full ${customerDetail.isActive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                          {customerDetail.isActive ? 'Đang hoạt động' : 'Bị khóa'}
                        </p>
                      </div>
                      <div>
                        <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-wider mb-1">Đăng nhập bằng</p>
                        <p className={`font-bold text-[13px] uppercase tracking-wider inline-block px-3 py-1 rounded-full ${customerDetail.provider === 'google' ? 'bg-error-container text-error' : 'bg-primary/10 text-primary'}`}>{customerDetail.provider === 'google' ? 'Google' : 'Local'}</p>
                      </div>
                      <div>
                        <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-wider mb-1">Email xác thực</p>
                        <p className={`font-bold text-[13px] uppercase tracking-wider inline-block px-3 py-1 rounded-full ${customerDetail.emailVerified ? 'bg-success/10 text-success' : 'bg-outline-variant/30 text-on-surface-variant'}`}>
                          {customerDetail.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Block 2: Shopping Overview */}
                  <div className="bg-white p-6 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
                    <h3 className="font-label-lg text-primary uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-surface-beige pb-4">
                      Tổng quan mua sắm
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="bg-surface-ivory p-4 rounded-xl border border-surface-beige">
                        <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider mb-1">Tổng đơn hàng</p>
                        <p className="font-display-sm text-2xl text-primary">{customerDetail.totalOrders || 0}</p>
                      </div>
                      <div className="bg-surface-ivory p-4 rounded-xl border border-surface-beige">
                        <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider mb-1">Sản phẩm yêu thích</p>
                        <p className="font-display-sm text-2xl text-primary">{customerDetail.wishlistCount || 0}</p>
                      </div>
                      <div className="bg-surface-ivory p-4 rounded-xl border border-surface-beige">
                        <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider mb-1">Tổng chi tiêu</p>
                        <p className="font-display-sm text-xl text-accent-terracotta truncate" title={formatCurrency(customerDetail.totalSpent || 0)}>{formatCurrency(customerDetail.totalSpent || 0)}</p>
                      </div>
                      <div className="bg-surface-ivory p-4 rounded-xl border border-surface-beige">
                        <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider mb-1">Giá trị đơn TB</p>
                        <p className="font-display-sm text-xl text-primary truncate" title={formatCurrency(customerDetail.averageOrderValue || 0)}>{formatCurrency(customerDetail.averageOrderValue || 0)}</p>
                      </div>
                      <div className="bg-surface-ivory p-4 rounded-xl border border-surface-beige">
                        <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider mb-1">Đơn gần nhất</p>
                        <p className="font-display-sm text-xl text-primary">{customerDetail.latestOrderDate ? new Date(customerDetail.latestOrderDate).toLocaleDateString('vi-VN') : '--'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Block 3: Shipping Addresses */}
                  <div className="bg-white p-6 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
                    <h3 className="font-label-lg text-primary uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-surface-beige pb-4">
                      Địa chỉ giao hàng
                    </h3>
                    {(!customerDetail.addresses || customerDetail.addresses.length === 0) ? (
                      <div className="bg-surface-ivory p-6 rounded-xl text-center border border-dashed border-surface-beige">
                        <span className="material-symbols-outlined text-3xl text-outline-variant mb-2">location_off</span>
                        <p className="text-on-surface-variant font-label-md">Khách hàng chưa cập nhật địa chỉ.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {customerDetail.addresses.map(addr => (
                          <div key={addr.id} className="bg-surface-ivory p-4 rounded-xl border border-surface-beige flex gap-4 items-start">
                            <span className="material-symbols-outlined text-outline-variant mt-0.5">location_on</span>
                            <div>
                              <p className="font-bold text-primary text-[14px]">
                                {addr.fullName} - {addr.phone}
                                {addr.isDefault && (
                                  <span className="ml-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">Mặc định</span>
                                )}
                              </p>
                              <p className="text-on-surface-variant text-[13px] mt-1">{addr.street}, {addr.ward}, {addr.district}, {addr.city}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Block 4: Order history */}
                  <div className="bg-white p-6 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
                    <div className="flex justify-between items-center mb-6 border-b border-surface-beige pb-4">
                      <h3 className="font-label-lg text-primary uppercase tracking-widest flex items-center gap-2">
                        Đơn hàng gần đây ({customerDetail.recentOrders?.length || 0})
                      </h3>
                      {customerDetail.totalOrders > 0 && (
                        <a href={`/admin/orders?search=${customerDetail.email}`} className="text-[12px] font-bold uppercase tracking-widest text-accent-terracotta hover:underline">
                          Xem tất cả
                        </a>
                      )}
                    </div>
                    {(!customerDetail.recentOrders || customerDetail.recentOrders.length === 0) ? (
                      <div className="bg-surface-ivory p-8 rounded-xl text-center border border-dashed border-surface-beige">
                        <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">inbox</span>
                        <p className="text-on-surface-variant font-label-md">Chưa có đơn hàng nào.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {customerDetail.recentOrders.map(o => (
                          <div key={o.id} className="bg-white border border-surface-beige p-5 rounded-xl flex justify-between items-center hover:border-primary/30 transition-colors shadow-sm">
                            <div>
                              <p className="font-label-lg text-primary text-[15px]">Mã đơn: #{o.id}</p>
                              <p className="text-xs text-on-surface-variant mt-1.5 flex items-center gap-1 font-medium"><span className="material-symbols-outlined text-[14px]">calendar_today</span>{new Date(o.createdAt).toLocaleDateString('vi-VN')} {new Date(o.createdAt).toLocaleTimeString('vi-VN')}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-accent-terracotta text-[16px] mb-1.5">{formatCurrency(o.totalAmount)}</p>
                              <span className={`text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full ${
                                o.status === 'completed' ? 'bg-success/10 text-success' :
                                o.status === 'cancelled' ? 'bg-error/10 text-error' :
                                o.status === 'shipping' ? 'bg-primary/10 text-primary' :
                                'bg-warning/10 text-warning'
                              }`}>
                                {o.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Block 5: Recent Wishlist Products */}
                  <div className="bg-white p-6 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
                    <div className="flex justify-between items-center mb-6 border-b border-surface-beige pb-4">
                      <h3 className="font-label-lg text-primary uppercase tracking-widest flex items-center gap-2">
                        Sản phẩm yêu thích gần đây
                      </h3>
                    </div>
                    {(!customerDetail.recentWishlistProducts || customerDetail.recentWishlistProducts.length === 0) ? (
                      <div className="bg-surface-ivory p-8 rounded-xl text-center border border-dashed border-surface-beige">
                        <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">favorite</span>
                        <p className="text-on-surface-variant font-label-md">Khách hàng chưa lưu sản phẩm yêu thích nào.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {customerDetail.recentWishlistProducts.map(p => (
                          <div key={p.id} className="bg-white border border-surface-beige p-4 rounded-xl flex items-center gap-4 hover:border-primary/30 transition-colors shadow-sm">
                            <div className="w-16 h-16 shrink-0 bg-surface-beige rounded-lg overflow-hidden border border-surface-beige/50">
                              <img src={getStaticFileUrl(p.imageUrl) || 'https://placehold.co/100x100?text=No+Image'} alt={p.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-label-lg text-primary text-[15px] truncate">{p.name}</p>
                              <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-1 font-medium">
                                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                {new Date(p.createdAt).toLocaleDateString('vi-VN')} {new Date(p.createdAt).toLocaleTimeString('vi-VN')}
                              </p>
                            </div>
                            <div className="text-right shrink-0 pl-4 border-l border-surface-beige">
                              <p className="font-bold text-accent-terracotta text-[15px]">{formatCurrency(p.price)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-center text-on-surface-variant font-label-lg py-12">Không tìm thấy thông tin chi tiết.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-8 border-none animation-fade-in" role="dialog" aria-modal="true" aria-label="Xác nhận trạng thái khách hàng">
            <h3 className="font-display-sm text-2xl text-primary font-semibold mb-4">
              Xác nhận {confirmModal.currentStatus ? 'khóa' : 'mở khóa'}
            </h3>
            <p className="text-on-surface-variant font-body-md mb-8 leading-relaxed">
              Bạn có chắc chắn muốn {confirmModal.currentStatus ? 'khóa' : 'mở khóa'} tài khoản của khách hàng{' '}
              <span className="font-bold text-primary">{confirmModal.customerName}</span>?
              {confirmModal.currentStatus && " Khi bị khóa, khách hàng sẽ không thể đăng nhập vào hệ thống."}
            </p>
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, customerId: null, currentStatus: null, customerName: '' })}
                className="px-6 py-3 border border-outline-variant/50 bg-white rounded-lg font-label-md tracking-wider uppercase text-primary hover:bg-surface-beige transition-colors focus:outline-none"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                className={`px-6 py-3 rounded-lg font-label-md tracking-wider uppercase text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5 focus:outline-none ${
                  confirmModal.currentStatus 
                    ? 'bg-error hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {confirmModal.currentStatus ? 'Khóa tài khoản' : 'Mở khóa'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
