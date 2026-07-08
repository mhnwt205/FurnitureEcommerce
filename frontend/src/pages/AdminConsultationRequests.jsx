import React, { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import AdminTable from '../components/admin/AdminTable';
import { consultationRequestService } from '../services/api/consultationRequestService';
import { formatShortDateTime as formatDateTime } from '../utils/date';
import { CONSULTATION_STATUS_OPTIONS as STATUS_OPTIONS, CONSULTATION_STATUS_CLASSES as STATUS_CLASSES, getConsultationStatusLabel as getStatusLabel } from '../utils/statusMaps';

const SkeletonRows = () => (
  <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(93,64,55,0.05)] overflow-hidden">
    <div className="p-6 space-y-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="grid grid-cols-8 gap-4 animate-pulse">
          <div className="h-4 bg-surface-beige rounded col-span-1"></div>
          <div className="h-4 bg-surface-beige rounded col-span-1"></div>
          <div className="h-4 bg-surface-beige rounded col-span-2"></div>
          <div className="h-4 bg-surface-beige rounded col-span-1"></div>
          <div className="h-4 bg-surface-beige rounded col-span-1"></div>
          <div className="h-4 bg-surface-beige rounded col-span-1"></div>
          <div className="h-4 bg-surface-beige rounded col-span-1"></div>
        </div>
      ))}
    </div>
  </div>
);

export default function AdminConsultationRequests() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
  const [modalMessage, setModalMessage] = useState({ type: '', text: '' });
  const [statusDraft, setStatusDraft] = useState('');
  const [assigneeDraft, setAssigneeDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [assignees, setAssignees] = useState([]);
  const [assigneesLoading, setAssigneesLoading] = useState(true);
  const [assigneesError, setAssigneesError] = useState('');

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch (error) {
      return null;
    }
  })();
  const tokenRole = (() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return '';
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      return payload?.role || '';
    } catch (error) {
      return '';
    }
  })();
  const permissions = currentUser?.userPermissions?.map(item => item.permission?.key || item.key).filter(Boolean) || [];
  const isAdminUser = String(currentUser?.role || tokenRole).toLowerCase() === 'admin';
  const canAssignConsultation = isAdminUser;
  const canUpdateConsultation = isAdminUser || permissions.includes('consultation.update');
  const normalizedAssigneeId = selectedConsultation?.assignedStaffId ? String(selectedConsultation.assignedStaffId) : '';
  const normalizedNote = selectedConsultation?.internalNote || '';
  const isStatusDirty = Boolean(selectedConsultation) && statusDraft !== selectedConsultation.status;
  const isAssigneeDirty = canAssignConsultation && Boolean(selectedConsultation) && assigneeDraft !== normalizedAssigneeId;
  const isNoteDirty = Boolean(selectedConsultation) && noteDraft !== normalizedNote;
  const hasUnsavedChanges = isStatusDirty || isAssigneeDirty || isNoteDirty;
  useEffect(() => {
    fetchConsultations();
  }, [page, limit, status, dateFrom, dateTo]);

  useEffect(() => {
    if (canAssignConsultation) {
      fetchAssignees();
    } else {
      setAssignees([]);
      setAssigneesError('');
      setAssigneesLoading(false);
    }
  }, [canAssignConsultation]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await consultationRequestService.getAdminConsultations({
        page,
        limit,
        status,
        search,
        dateFrom,
        dateTo
      });
      setConsultations(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalItems(response.pagination?.total || 0);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách yêu cầu tư vấn.');
    } finally {
      setLoading(false);
    }
  };


  const fetchAssignees = async () => {
    if (!canAssignConsultation) return;

    try {
      setAssigneesLoading(true);
      setAssigneesError('');
      const response = await consultationRequestService.getConsultationAssignees();
      setAssignees(response.assignees || []);
    } catch (err) {
      setAssigneesError(err.message || 'Không tải được danh sách nhân viên');
      setAssignees([]);
    } finally {
      setAssigneesLoading(false);
    }
  };
  const handleSearch = () => {
    setPage(1);
    fetchConsultations();
  };

  const handleRefresh = () => {
    setActionError('');
    setActionSuccess('');
    fetchConsultations();
  };

  const openDetail = async (item) => {
    try {
      setDetailLoading(true);
      setActionError('');
      setActionSuccess('');
      setModalMessage({ type: '', text: '' });
      const response = await consultationRequestService.getAdminConsultation(item.id);
      const request = response.request;
      setSelectedConsultation(request);
      setStatusDraft(request?.status || 'new');
      setAssigneeDraft(request?.assignedStaffId ? String(request.assignedStaffId) : '');
      setNoteDraft(request?.internalNote || '');
    } catch (err) {
      setActionError(err.message || 'Kh\u00F4ng th\u1EC3 t\u1EA3i chi ti\u1EBFt y\u00EAu c\u1EA7u t\u01B0 v\u1EA5n.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedConsultation(null);
    setStatusDraft('');
    setAssigneeDraft('');
    setNoteDraft('');
    setModalMessage({ type: '', text: '' });
    setSavingChanges(false);
    setActionError('');
    setActionSuccess('');
  };

  const mergeUpdatedConsultation = (updated) => {
    if (!updated) return;
    setConsultations(prev => prev.map(item => item.id === updated.id ? { ...item, ...updated } : item));
    setSelectedConsultation(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev);
  };

  const refreshSelectedConsultation = async (id) => {
    const response = await consultationRequestService.getAdminConsultation(id);
    const request = response.request;
    mergeUpdatedConsultation(request);
    setStatusDraft(request?.status || 'new');
    setAssigneeDraft(request?.assignedStaffId ? String(request.assignedStaffId) : '');
    setNoteDraft(request?.internalNote || '');
  };

  const handleSaveConsultationChanges = async () => {
    if (!selectedConsultation) return;

    if (!canUpdateConsultation) {
      setModalMessage({ type: 'error', text: 'B\u1EA1n c\u1EA7n quy\u1EC1n c\u1EADp nh\u1EADt y\u00EAu c\u1EA7u t\u01B0 v\u1EA5n \u0111\u1EC3 l\u01B0u thay \u0111\u1ED5i.' });
      return;
    }

    if (!hasUnsavedChanges) {
      setModalMessage({ type: 'info', text: 'Kh\u00F4ng c\u00F3 thay \u0111\u1ED5i c\u1EA7n l\u01B0u.' });
      return;
    }

    try {
      setSavingChanges(true);
      setActionError('');
      setActionSuccess('');
      setModalMessage({ type: '', text: '' });
      let latestRequest = selectedConsultation;

      if (isStatusDirty) {
        const response = await consultationRequestService.updateConsultationStatus(selectedConsultation.id, statusDraft);
        latestRequest = response.request;
        mergeUpdatedConsultation(latestRequest);
      }

      if (isAssigneeDirty) {
        const assignedStaffId = assigneeDraft ? Number(assigneeDraft) : null;
        const response = await consultationRequestService.assignConsultation(selectedConsultation.id, assignedStaffId);
        latestRequest = response.request;
        mergeUpdatedConsultation(latestRequest);
      }

      if (isNoteDirty) {
        const response = await consultationRequestService.updateConsultationNote(selectedConsultation.id, noteDraft);
        latestRequest = response.request;
        mergeUpdatedConsultation(latestRequest);
      }

      setStatusDraft(latestRequest?.status || 'new');
      setAssigneeDraft(latestRequest?.assignedStaffId ? String(latestRequest.assignedStaffId) : '');
      setNoteDraft(latestRequest?.internalNote || '');
      setModalMessage({ type: 'success', text: '\u0110\u00E3 l\u01B0u thay \u0111\u1ED5i y\u00EAu c\u1EA7u t\u01B0 v\u1EA5n.' });
    } catch (err) {
      try {
        await refreshSelectedConsultation(selectedConsultation.id);
      } catch (refreshError) {
        console.error('Refresh consultation after save failure error:', refreshError);
      }
      setModalMessage({ type: 'error', text: err.message || 'Kh\u00F4ng th\u1EC3 l\u01B0u thay \u0111\u1ED5i y\u00EAu c\u1EA7u t\u01B0 v\u1EA5n.' });
    } finally {
      setSavingChanges(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-[1500px] mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-4">
          <div>
            <h1 className="font-display-lg text-4xl text-primary tracking-tight mb-2">Quản lý yêu cầu tư vấn</h1>
            <p className="text-on-surface-variant font-body-sm">Theo dõi lead tư vấn, trạng thái chăm sóc và ghi chú nội bộ.</p>
          </div>
          <button onClick={handleRefresh} className="flex items-center justify-center gap-2 border border-outline-variant text-primary px-5 py-2.5 rounded shadow-sm hover:bg-surface-beige transition-colors font-label-md tracking-wider uppercase">
            <span className="material-symbols-outlined text-sm">refresh</span>
            Làm mới
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-[0_4px_24px_rgba(93,64,55,0.05)] grid grid-cols-1 lg:grid-cols-[1fr_180px_170px_170px_140px] gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="Tìm mã yêu cầu, tên, SĐT, email, nội dung..."
            className="border border-outline-variant/50 rounded-lg px-4 py-2 outline-none focus:border-primary font-body-sm"
          />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border border-outline-variant/50 rounded-lg px-4 py-2 outline-none focus:border-primary font-body-sm">
            <option value="all">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="border border-outline-variant/50 rounded-lg px-4 py-2 outline-none focus:border-primary font-body-sm" />
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="border border-outline-variant/50 rounded-lg px-4 py-2 outline-none focus:border-primary font-body-sm" />
          <button onClick={handleSearch} className="bg-primary text-white px-5 py-2 rounded-lg font-label-md">Tìm kiếm</button>
        </div>

        {!selectedConsultation && actionError && (
          <div className="rounded-2xl border border-error/20 bg-error-container/30 px-5 py-4 text-error font-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined">error</span>
            {actionError}
          </div>
        )}
        {!selectedConsultation && actionSuccess && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-green-700 font-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined">check_circle</span>
            {actionSuccess}
          </div>
        )}

        {!isAdminUser && (
          <div className="bg-surface-ivory text-on-surface-variant border border-outline-variant/40 rounded-xl px-4 py-3 font-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">lock</span>
            Bạn chỉ nhìn thấy các yêu cầu được phân công cho mình.
          </div>
        )}

        {loading ? (
          <SkeletonRows />
        ) : error ? (
          <div className="bg-error-container text-on-error-container p-8 rounded-2xl text-center space-y-4">
            <p className="font-label-lg">{error}</p>
            <button onClick={fetchConsultations} className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg font-label-md">
              <span className="material-symbols-outlined text-sm">refresh</span>
              Thử lại
            </button>
          </div>
        ) : consultations.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">support_agent</span>
            <p className="text-on-surface-variant font-label-lg">Chưa có yêu cầu tư vấn nào.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(93,64,55,0.05)] overflow-hidden">
            <AdminTable containerClassName="overflow-x-auto p-2" className="w-full min-w-[1040px] table-fixed text-left text-[13px] leading-5">
                <thead className="bg-surface-ivory border-b border-surface-beige text-xs font-label-lg uppercase tracking-wider">
                  <tr>
                    <th className="w-[126px] px-3 py-4 font-semibold text-on-surface-variant">Mã yêu cầu</th>
                    <th className="w-[132px] px-3 py-4 font-semibold text-on-surface-variant">Ngày tạo</th>
                    <th className="w-[188px] px-3 py-4 font-semibold text-on-surface-variant">Khách hàng</th>
                    <th className="w-[118px] px-3 py-4 font-semibold text-on-surface-variant">Điện thoại</th>
                    <th className="w-[128px] px-3 py-4 font-semibold text-on-surface-variant">Công trình</th>
                    <th className="w-[134px] px-3 py-4 font-semibold text-on-surface-variant">Ngân sách</th>
                    <th className="w-[126px] px-3 py-4 text-center font-semibold text-on-surface-variant">Trạng thái</th>
                    <th className="w-[150px] px-3 py-4 font-semibold text-on-surface-variant">Phụ trách</th>
                    <th className="sticky right-0 z-20 w-[88px] bg-white px-3 py-4 text-right font-semibold text-on-surface-variant">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-beige">
                  {consultations.map(item => (
                    <tr key={item.id} onClick={() => openDetail(item)} className="group cursor-pointer align-top transition-colors hover:bg-surface-beige/30">
                      <td className="whitespace-nowrap px-3 py-4 font-label-md text-primary">{item.requestCode}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-on-surface-variant">{formatDateTime(item.createdAt)}</td>
                      <td className="px-3 py-4">
                        <p className="truncate font-label-md text-primary" title={item.fullName}>{item.fullName}</p>
                        {item.email && <p className="mt-1 truncate text-xs text-on-surface-variant" title={item.email}>{item.email}</p>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-primary">{item.phone}</td>
                      <td className="truncate px-3 py-4 text-on-surface-variant" title={item.projectType || '-'}>{item.projectType || '-'}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-on-surface-variant">{item.budgetRange || '-'}</td>
                      <td className="px-3 py-4 text-center">
                        <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_CLASSES[item.status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <p className="truncate font-label-md text-primary" title={item.assignedStaff?.fullName || 'Chưa gán'}>{item.assignedStaff?.fullName || 'Chưa gán'}</p>
                        {item.assignedStaff?.email && <p className="mt-1 truncate text-xs text-on-surface-variant" title={item.assignedStaff.email}>{item.assignedStaff.email}</p>}
                      </td>
                      <td className="sticky right-0 z-10 bg-white px-3 py-4 text-right transition-colors group-hover:bg-surface-beige/30">
                        <button onClick={(event) => { event.stopPropagation(); openDetail(item); }} className="whitespace-nowrap rounded-lg border border-outline-variant/50 px-3 py-1.5 font-label-md uppercase tracking-wider text-primary transition-colors hover:bg-surface-beige hover:text-accent-terracotta">
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
            </AdminTable>

            <div className="p-4 border-t border-surface-beige flex flex-col md:flex-row justify-between items-center bg-surface-ivory gap-4">
              <div className="text-on-surface-variant font-body-sm flex items-center gap-3">
                <span>Hiển thị <span className="font-bold text-primary">{consultations.length}</span> trên tổng số <span className="font-bold text-primary">{totalItems}</span> yêu cầu</span>
                <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="border border-outline-variant/50 rounded px-2 py-1 outline-none focus:border-primary bg-white">
                  <option value={10}>10 dòng</option>
                  <option value={20}>20 dòng</option>
                  <option value={50}>50 dòng</option>
                </select>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 border border-outline-variant/50 rounded hover:bg-surface-beige disabled:opacity-40 text-primary font-label-md">Trước</button>
                <span className="font-label-md text-primary mx-2">Trang {page} / {totalPages || 1}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 border border-outline-variant/50 rounded hover:bg-surface-beige disabled:opacity-40 text-primary font-label-md">Sau</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {detailLoading && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex items-center gap-4 text-primary" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            Đang tải chi tiết...
          </div>
        </div>
      )}

      {selectedConsultation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-end p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[760px] overflow-hidden flex flex-col max-h-[94vh]" role="dialog" aria-modal="true" aria-label="Chi tiết yêu cầu tư vấn">
            <div className="p-6 border-b border-surface-beige flex items-start justify-between bg-white shrink-0">
              <div>
                <h2 className="font-display-sm text-2xl text-primary font-semibold">{selectedConsultation.requestCode}</h2>
                <p className="text-on-surface-variant text-sm mt-1">{formatDateTime(selectedConsultation.createdAt)}</p>
              </div>
              <button onClick={closeDetail} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container transition-colors shrink-0" aria-label="Đóng chi tiết yêu cầu tư vấn">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-surface-bright flex-grow space-y-6">
              {modalMessage.text && (
                <div className={`rounded-xl border px-4 py-3 font-body-sm flex items-center gap-2 ${modalMessage.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : modalMessage.type === 'error' ? 'border-error/20 bg-error-container/30 text-error' : 'border-outline-variant/40 bg-surface-ivory text-on-surface-variant'}`}>
                  <span className="material-symbols-outlined text-[20px]">{modalMessage.type === 'success' ? 'check_circle' : modalMessage.type === 'error' ? 'error' : 'info'}</span>
                  {modalMessage.text}
                </div>
              )}
              {!canUpdateConsultation && (
                <div className="rounded-xl border border-outline-variant/40 bg-surface-ivory px-4 py-3 text-on-surface-variant font-body-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                  {'B\u1EA1n c\u1EA7n quy\u1EC1n c\u1EADp nh\u1EADt y\u00EAu c\u1EA7u t\u01B0 v\u1EA5n \u0111\u1EC3 ch\u1EC9nh s\u1EEDa tr\u1EA1ng th\u00E1i, ph\u00E2n c\u00F4ng ho\u1EB7c ghi ch\u00FA.'}
                </div>
              )}
              <div className="bg-white p-5 rounded-2xl shadow-[0_4px_24px_rgba(93,64,55,0.05)] grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><p className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-1">Khách hàng</p><p className="font-label-lg text-primary">{selectedConsultation.fullName}</p></div>
                <div><p className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-1">Điện thoại</p><p className="font-label-lg text-primary">{selectedConsultation.phone}</p></div>
                <div><p className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-1">Email</p><p className="text-primary break-words">{selectedConsultation.email || '-'}</p></div>
                <div><p className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-1">Nguồn</p><p className="text-primary">{selectedConsultation.source || '-'}</p></div>
                <div><p className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-1">Loại công trình</p><p className="text-primary">{selectedConsultation.projectType || '-'}</p></div>
                <div><p className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-1">Phòng/Khu vực</p><p className="text-primary">{selectedConsultation.roomType || '-'}</p></div>
                <div><p className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-1">Ngân sách</p><p className="text-primary">{selectedConsultation.budgetRange || '-'}</p></div>
                <div><p className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-1">Liên hệ ưu tiên</p><p className="text-primary">{selectedConsultation.preferredContact || '-'}</p></div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
                <p className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-3">Nội dung yêu cầu</p>
                <p className="text-primary leading-relaxed whitespace-pre-line">{selectedConsultation.message || 'Không có nội dung.'}</p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-[0_4px_24px_rgba(93,64,55,0.05)] grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-2 block">Trạng thái</label>
                  <select value={statusDraft} onChange={(e) => { setStatusDraft(e.target.value); setModalMessage({ type: '', text: '' }); }} disabled={!canUpdateConsultation || savingChanges} className={`w-full border rounded-xl px-4 py-3 outline-none focus:border-accent-gold font-label-md disabled:opacity-60 ${STATUS_CLASSES[statusDraft] || 'bg-white text-primary border-outline-variant'}`}>
                    {STATUS_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-2 block">Phụ trách</label>
                  {canAssignConsultation ? (
                    <>
                      <select
                        value={assigneeDraft}
                        onChange={(e) => { setAssigneeDraft(e.target.value); setModalMessage({ type: '', text: '' }); }}
                        disabled={assigneesLoading || savingChanges || Boolean(assigneesError) || assignees.length === 0}
                        className="w-full border border-outline-variant/50 rounded-xl px-4 py-3 outline-none focus:border-accent-gold bg-white text-primary font-body-sm disabled:bg-surface-beige/40 disabled:text-on-surface-variant"
                      >
                        <option value="">
                          {assigneesLoading ? 'Đang tải nhân viên...' : assignees.length === 0 ? 'Chưa có nhân viên phù hợp' : 'Chưa gán'}
                        </option>
                        {assignees.map(staff => (
                          <option key={staff.id} value={staff.id}>
                            {staff.fullName || staff.email} - {staff.email} ({staff.role})
                          </option>
                        ))}
                      </select>
                      {assigneesError && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-error">
                          <span>Không tải được danh sách nhân viên</span>
                          <button type="button" onClick={fetchAssignees} className="font-bold underline">Thử lại</button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 bg-surface-beige/40 text-primary font-body-sm">
                      {selectedConsultation.assignedStaff?.fullName || selectedConsultation.assignedStaff?.email || 'Chưa gán'}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">Ghi chú nội bộ</label>
                  <button onClick={handleSaveConsultationChanges} disabled={savingChanges || !hasUnsavedChanges || !canUpdateConsultation} className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-label-md disabled:opacity-60 disabled:cursor-not-allowed">
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    {savingChanges ? '\u0110ang l\u01B0u...' : 'L\u01B0u thay \u0111\u1ED5i'}
                  </button>
                </div>
                <textarea value={noteDraft} onChange={(e) => { setNoteDraft(e.target.value); setModalMessage({ type: '', text: '' }); }} disabled={!canUpdateConsultation || savingChanges} rows="5" className="w-full border border-outline-variant/50 rounded-xl px-4 py-3 outline-none focus:border-accent-gold resize-none font-body-sm disabled:bg-surface-beige/40 disabled:text-on-surface-variant" placeholder="Nhập ghi chú chỉ dành cho nội bộ..." />
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-[0_4px_24px_rgba(93,64,55,0.05)]">
                <p className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-3">Thông tin liên kết</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-on-surface-variant">Tài khoản khách:</span> <span className="text-primary font-medium">{selectedConsultation.customer?.fullName || 'Guest'}</span></div>
                  <div><span className="text-on-surface-variant">Nhân viên phụ trách:</span> <span className="text-primary font-medium">{selectedConsultation.assignedStaff?.fullName || 'Chưa gán'}</span></div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-surface-beige flex justify-end bg-white shrink-0">
              <button onClick={closeDetail} className="px-8 py-3 border border-outline-variant rounded-lg text-primary hover:bg-surface-beige transition-colors font-label-md tracking-wider uppercase">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
