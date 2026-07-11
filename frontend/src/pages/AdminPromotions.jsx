import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import AdminTable from '../components/admin/AdminTable';
import { promotionService } from '../services/api/promotionService';
import { productService } from '../services/api/productService';
import { categoryService } from '../services/api/categoryService';
import { formatCurrencyNoFraction as formatMoney } from '../utils/formatters';
import { formatDateTime } from '../utils/date';
import { PROMOTION_STATUS_OPTIONS as STATUS_OPTIONS, PROMOTION_STATUS_CLASSES as STATUS_CLASSES, getPromotionStatusLabel as getStatusLabel } from '../utils/statusMaps';
import { useAuth } from '../context/AuthContext';

const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Phần trăm' },
  { value: 'fixed_amount', label: 'Số tiền cố định' }
];

const initialForm = () => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    status: 'draft',
    priority: 0,
    startAt: toDateTimeLocal(now),
    endAt: toDateTimeLocal(tomorrow),
    isActive: true,
    productIds: [],
    categoryIds: []
  };
};

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

const toIsoString = (value) => value ? new Date(value).toISOString() : null;


const getPriorityLabel = (priority) => {
  const value = Number(priority || 0);
  if (value >= 1000) return `Cao (${value})`;
  if (value >= 100) return `Trung bình (${value})`;
  return `Thấp (${value})`;
};

const getRuntimeState = (promotion) => {
  if (!promotion?.isActive || promotion?.status === 'disabled') return { label: 'Đã tắt', className: 'bg-red-50 text-red-700 border-red-200' };
  const now = Date.now();
  const start = new Date(promotion.startAt).getTime();
  const end = new Date(promotion.endAt).getTime();
  if (Number.isFinite(start) && now < start) return { label: 'Chưa bắt đầu', className: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (Number.isFinite(end) && now > end) return { label: 'Đã kết thúc', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (promotion.status === 'active' || promotion.status === 'scheduled') return { label: 'Đang hiệu lực', className: 'bg-green-50 text-green-700 border-green-200' };
  return { label: 'Chưa áp dụng', className: 'bg-slate-50 text-slate-700 border-slate-200' };
};

const getProductPrice = (product) => Number(product.finalPrice ?? product.displayPrice ?? product.price ?? 0);

const getUserPermissions = (user) => {
  const permissions = user?.userPermissions?.map(item => item.permission?.key || item.key).filter(Boolean) || [];
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
  return {
    role: user?.role,
    canView: isAdmin || permissions.includes('promotion.view'),
    canCreate: isAdmin || permissions.includes('promotion.create'),
    canUpdate: isAdmin || permissions.includes('promotion.update'),
    canDelete: isAdmin || permissions.includes('promotion.delete')
  };
};

export default function AdminPromotions() {
  const { user } = useAuth();
  const permissions = useMemo(() => getUserPermissions(user), [user]);
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [isActive, setIsActive] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [modalMode, setModalMode] = useState(null);
  const [currentPromotionId, setCurrentPromotionId] = useState(null);
  const [form, setForm] = useState(initialForm());
  const [productSearch, setProductSearch] = useState('');

  const modalOpen = Boolean(modalMode);
  const isViewMode = modalMode === 'view';
  const isEditMode = modalMode === 'edit';
  const limit = 10;

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return products;
    return products.filter(product => [product.name, product.slug, product.category?.name]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(term))
    );
  }, [products, productSearch]);

  useEffect(() => {
    fetchPromotions();
  }, [page, status, isActive, startDate, endDate]);

  const fetchPromotions = async (override = {}) => {
    try {
      setLoading(true);
      setError('');
      const response = await promotionService.getPromotions({
        page,
        limit,
        search,
        status,
        isActive,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        ...override
      });
      setPromotions(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalItems(response.pagination?.total || 0);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách khuyến mãi');
    } finally {
      setLoading(false);
    }
  };

  const ensureSelectionData = async () => {
    const tasks = [];
    if (categories.length === 0) {
      tasks.push(categoryService.getCategories().then(data => setCategories(Array.isArray(data) ? data : [])));
    }
    if (products.length === 0) {
      tasks.push(productService.getProducts({ includeInactive: true, limit: 100 }).then(response => {
        const list = Array.isArray(response) ? response : response?.data || [];
        setProducts(list);
      }));
    }
    if (tasks.length > 0) await Promise.all(tasks);
  };

  const openCreateModal = async () => {
    await ensureSelectionData();
    setCurrentPromotionId(null);
    setForm(initialForm());
    setProductSearch('');
    setModalMode('create');
  };

  const openPromotionModal = async (promotion, mode) => {
    try {
      await ensureSelectionData();
      setError('');
      const detail = await promotionService.getPromotionById(promotion.id);
      setCurrentPromotionId(detail.id);
      setForm({
        name: detail.name || '',
        description: detail.description || '',
        discountType: detail.discountType || 'percentage',
        discountValue: detail.discountValue ?? '',
        status: detail.status || 'draft',
        priority: detail.priority ?? 0,
        startAt: toDateTimeLocal(detail.startAt),
        endAt: toDateTimeLocal(detail.endAt),
        isActive: detail.isActive !== false,
        productIds: detail.promotionProducts?.map(item => item.productId || item.product?.id).filter(Boolean) || [],
        categoryIds: detail.promotionCategories?.map(item => item.categoryId || item.category?.id).filter(Boolean) || []
      });
      setProductSearch('');
      setModalMode(mode);
    } catch (err) {
      setError(err.message || 'Không thể tải chi tiết khuyến mãi');
    }
  };

  const closeModal = () => {
    if (saving) return;
    setModalMode(null);
    setCurrentPromotionId(null);
  };

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleId = (field, id) => {
    setForm(prev => {
      const current = new Set(prev[field]);
      if (current.has(id)) current.delete(id);
      else current.add(id);
      return { ...prev, [field]: [...current] };
    });
  };

  const validateForm = () => {
    if (!form.name.trim()) return 'Tên khuyến mãi là bắt buộc';
    const discountValue = Number(form.discountValue);
    if (form.discountType === 'percentage' && (!(discountValue > 0) || discountValue > 100)) {
      return 'Giảm theo phần trăm phải lớn hơn 0 và không quá 100';
    }
    if (form.discountType === 'fixed_amount' && !(discountValue > 0)) {
      return 'Số tiền giảm phải lớn hơn 0';
    }
    if (!form.startAt || !form.endAt || new Date(form.startAt) >= new Date(form.endAt)) {
      return 'Thời gian bắt đầu phải trước thời gian kết thúc';
    }
    if (form.status !== 'draft' && form.productIds.length === 0 && form.categoryIds.length === 0) {
      return 'Khuyến mãi không phải nháp cần chọn ít nhất một sản phẩm hoặc danh mục';
    }
    return '';
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    description: form.description?.trim() || null,
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    status: form.status,
    priority: Number(form.priority) || 0,
    startAt: toIsoString(form.startAt),
    endAt: toIsoString(form.endAt),
    isActive: Boolean(form.isActive),
    productIds: [...new Set(form.productIds.map(Number))],
    categoryIds: [...new Set(form.categoryIds.map(Number))]
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isViewMode) return;
    const issue = validateForm();
    if (issue) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: issue, type: 'error' } }));
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();
      if (isEditMode) await promotionService.updatePromotion(currentPromotionId, payload);
      else await promotionService.createPromotion(payload);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: isEditMode ? 'Đã cập nhật khuyến mãi' : 'Đã tạo khuyến mãi', type: 'success' } }));
      closeModal();
      await fetchPromotions();
    } catch (err) {
      setModalError(err.message || 'Không thể lưu khuyến mãi');
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: err.message || 'Không thể lưu khuyến mãi', type: 'error' } }));
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async (promotion) => {
    if (!permissions.canDelete) return;
    if (!window.confirm(`Tắt khuyến mãi "${promotion.name}"?`)) return;
    try {
      await promotionService.disablePromotion(promotion.id);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Đã tắt khuyến mãi', type: 'success' } }));
      await fetchPromotions();
    } catch (err) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: err.message || 'Không thể tắt khuyến mãi', type: 'error' } }));
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    fetchPromotions({ page: 1 });
  };

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setIsActive('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    fetchPromotions({ page: 1, search: '', status: '', isActive: '', startDate: undefined, endDate: undefined });
  };

  const renderDiscount = (promotion) => {
    if (promotion.discountType === 'percentage') return `${promotion.discountValue}%`;
    return formatMoney(promotion.discountValue);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Quản lý khuyến mãi</h1>
            <p className="mt-1 text-sm text-on-surface-variant">Tạo và quản lý chương trình giảm giá theo sản phẩm hoặc danh mục.</p>
          </div>
          {permissions.canCreate && (
            <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Tạo khuyến mãi
            </button>
          )}
        </div>

        <div className="rounded-xl border border-surface-beige bg-white p-4 shadow-sm">
          <form onSubmit={handleSearch} className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_150px_150px_155px_155px_auto_auto] lg:items-end">
            <label className="text-sm font-medium text-primary">
              Tìm kiếm
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Tên khuyến mãi" />
            </label>
            <label className="text-sm font-medium text-primary">
              Trạng thái
              <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="">Tất cả</option>
                {STATUS_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-primary">
              Đang hoạt động
              <select value={isActive} onChange={(event) => { setIsActive(event.target.value); setPage(1); }} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="">Tất cả</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Đã tắt</option>
              </select>
            </label>
            <label className="text-sm font-medium text-primary">
              Từ ngày
              <input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary" />
            </label>
            <label className="text-sm font-medium text-primary">
              Đến ngày
              <input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary" />
            </label>
            <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90">Lọc</button><button type="button" onClick={resetFilters} className="inline-flex items-center justify-center rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-bold text-primary hover:border-primary">Làm mới</button>
          </form>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-hidden rounded-xl border border-surface-beige bg-white shadow-sm">
          <AdminTable className="min-w-[1280px] table-fixed text-left text-sm">
              <thead className="bg-surface-beige/60 text-xs uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="w-[250px] px-4 py-3">Tên</th>
                  <th className="w-[130px] px-4 py-3">Loại giảm</th>
                  <th className="w-[130px] px-4 py-3 text-right">Giá trị</th>
                  <th className="w-[135px] px-4 py-3 text-center">Trạng thái</th>
                  <th className="w-[155px] px-4 py-3 text-center">Hiệu lực</th>
                  <th className="w-[145px] px-4 py-3">Bắt đầu</th>
                  <th className="w-[145px] px-4 py-3">Kết thúc</th>
                  <th className="w-[70px] px-4 py-3 text-center">SP</th>
                  <th className="w-[70px] px-4 py-3 text-center">DM</th>
                  <th className="w-[120px] px-4 py-3 text-center">Ưu tiên</th>
                  <th className="w-[175px] px-4 py-3 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-beige">
                {loading ? (
                  <tr><td colSpan="11" className="px-4 py-8 text-center text-on-surface-variant">Đang tải...</td></tr>
                ) : promotions.length === 0 ? (
                  <tr><td colSpan="11" className="px-4 py-8 text-center text-on-surface-variant">Chưa có khuyến mãi nào.</td></tr>
                ) : promotions.map(promotion => {
                  const runtime = getRuntimeState(promotion);
                  return (
                    <tr key={promotion.id} className="hover:bg-surface-beige/30">
                      <td className="px-4 py-3">
                        <div className="max-w-[220px] truncate font-semibold text-primary" title={promotion.name}>{promotion.name}</div>
                        <div className="text-xs text-on-surface-variant">ID: {promotion.id}</div>
                      </td>
                      <td className="px-4 py-3">{DISCOUNT_TYPES.find(item => item.value === promotion.discountType)?.label || promotion.discountType}</td>
                      <td className="px-4 py-3 text-right font-semibold text-accent-terracotta">{renderDiscount(promotion)}</td>
                      <td className="px-4 py-3 text-center"><span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_CLASSES[promotion.status] || STATUS_CLASSES.draft}`}>{getStatusLabel(promotion.status)}</span></td>
                      <td className="px-4 py-3 text-center"><span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${runtime.className}`}>{runtime.label}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(promotion.startAt, '-')}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(promotion.endAt, '-')}</td>
                      <td className="px-4 py-3 text-center">{promotion._count?.promotionProducts ?? promotion.promotionProducts?.length ?? 0}</td>
                      <td className="px-4 py-3 text-center">{promotion._count?.promotionCategories ?? promotion.promotionCategories?.length ?? 0}</td>
                      <td className="px-4 py-3 text-center"><span className="whitespace-nowrap text-xs font-semibold text-primary">{getPriorityLabel(promotion.priority)}</span></td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-surface-beige/40 p-1">
                          <button onClick={() => openPromotionModal(promotion, 'view')} className="inline-flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-outline-variant bg-white px-2.5 text-xs font-bold text-primary hover:border-primary">Xem</button>
                          {permissions.canUpdate && <button onClick={() => openPromotionModal(promotion, 'edit')} className="inline-flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-primary/40 bg-white px-2.5 text-xs font-bold text-primary hover:border-primary hover:bg-primary/5">Sửa</button>}
                          {permissions.canDelete && promotion.status !== 'disabled' && <button onClick={() => handleDisable(promotion)} className="inline-flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-red-200 bg-white px-2.5 text-xs font-bold text-red-600 hover:bg-red-50">Tắt</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
          </AdminTable>
          <div className="flex items-center justify-between border-t border-surface-beige px-4 py-3 text-sm text-on-surface-variant">
            <span>Tổng: {totalItems}</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(prev => Math.max(prev - 1, 1))} className="rounded border border-outline-variant px-3 py-1 disabled:opacity-40">Trước</button>
              <span>Trang {page}/{totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(prev => Math.min(prev + 1, totalPages))} className="rounded border border-outline-variant px-3 py-1 disabled:opacity-40">Sau</button>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleSubmit} className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Khuyến mãi">
            <div className="flex items-center justify-between border-b border-surface-beige px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-primary">{isViewMode ? 'Chi tiết khuyến mãi' : isEditMode ? 'Cập nhật khuyến mãi' : 'Tạo khuyến mãi'}</h2>
                <p className="text-sm text-on-surface-variant">Chọn sản phẩm hoặc danh mục áp dụng cho chương trình khuyến mãi.</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-beige" aria-label="Đóng khuyến mãi">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="max-h-[calc(92vh-140px)] overflow-y-auto px-6 py-5">
              {modalError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{modalError}</div>}
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="rounded-lg border border-surface-beige p-4">
                    <h3 className="mb-4 font-bold text-primary">Thông tin cơ bản</h3>
                    <label className="block text-sm font-medium text-primary">Tên khuyến mãi
                    <input disabled={isViewMode} value={form.name} onChange={(e) => updateForm('name', e.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-surface-beige/40" />
                  </label>
                  <label className="block text-sm font-medium text-primary">Mô tả
                    <textarea disabled={isViewMode} rows="3" value={form.description} onChange={(e) => updateForm('description', e.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-surface-beige/40" />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium text-primary">Loại giảm
                      <select disabled={isViewMode} value={form.discountType} onChange={(e) => updateForm('discountType', e.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-surface-beige/40">
                        {DISCOUNT_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-primary">Giá trị
                      <input disabled={isViewMode} type="number" min="0" value={form.discountValue} onChange={(e) => updateForm('discountValue', e.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-surface-beige/40" />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium text-primary">Trạng thái
                      <select disabled={isViewMode} value={form.status} onChange={(e) => updateForm('status', e.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-surface-beige/40">
                        {STATUS_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-primary">Ưu tiên
                      <input disabled={isViewMode} type="number" min="0" value={form.priority} onChange={(e) => updateForm('priority', e.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-surface-beige/40" />
                    </label>
                  </div>
                  </div>
                  <div className="rounded-lg border border-surface-beige p-4">
                    <h3 className="mb-4 font-bold text-primary">Thời gian hiệu lực</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium text-primary">Bắt đầu
                      <input disabled={isViewMode} type="datetime-local" value={form.startAt} onChange={(e) => updateForm('startAt', e.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-surface-beige/40" />
                    </label>
                    <label className="text-sm font-medium text-primary">Kết thúc
                      <input disabled={isViewMode} type="datetime-local" value={form.endAt} onChange={(e) => updateForm('endAt', e.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-surface-beige/40" />
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium text-primary">
                    <input disabled={isViewMode} type="checkbox" checked={form.isActive} onChange={(e) => updateForm('isActive', e.target.checked)} className="h-4 w-4" />
                    Đang kích hoạt
                  </label>
                </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-surface-beige p-4">
                    <h3 className="mb-1 font-bold text-primary">Đối tượng áp dụng</h3>
                    <p className="mb-4 text-xs text-on-surface-variant">Có thể chọn sản phẩm, danh mục hoặc kết hợp cả hai.</p>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-primary">Sản phẩm áp dụng</h3>
                        <p className="text-xs text-on-surface-variant">Hiển thị tối đa 100 sản phẩm đầu tiên.</p>
                      </div>
                      <span className="rounded-full bg-surface-beige px-2 py-1 text-xs font-bold text-primary">{form.productIds.length} chọn</span>
                    </div>
                    <input disabled={isViewMode} value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Tìm sản phẩm" className="mb-3 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-surface-beige/40" />
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {filteredProducts.map(product => (
                        <label key={product.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-surface-beige p-3 hover:bg-surface-beige/30">
                          <input disabled={isViewMode} type="checkbox" checked={form.productIds.includes(product.id)} onChange={() => toggleId('productIds', product.id)} className="mt-1 h-4 w-4" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-primary">{product.name}</span>
                            <span className="mt-0.5 block text-xs text-on-surface-variant">{product.category?.name || 'Chưa có danh mục'} - {formatMoney(getProductPrice(product))}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-surface-beige p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-bold text-primary">Danh mục áp dụng</h3>
                      <span className="rounded-full bg-surface-beige px-2 py-1 text-xs font-bold text-primary">{form.categoryIds.length} chọn</span>
                    </div>
                    <div className="grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">
                      {categories.map(category => (
                        <label key={category.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-beige p-3 hover:bg-surface-beige/30">
                          <input disabled={isViewMode} type="checkbox" checked={form.categoryIds.includes(category.id)} onChange={() => toggleId('categoryIds', category.id)} className="h-4 w-4" />
                          <span className="text-sm font-medium text-primary">{category.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-surface-beige px-6 py-4">
              <button type="button" onClick={closeModal} className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-bold text-primary hover:border-primary">Đóng</button>
              {!isViewMode && (
                <button disabled={saving} type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
                  {saving ? 'Đang lưu...' : isEditMode ? 'Cập nhật' : 'Tạo mới'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}