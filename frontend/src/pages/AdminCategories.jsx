import React, { useState, useEffect } from 'react';
import { categoryService } from '../services/api/categoryService';
import AdminLayout from '../layouts/AdminLayout';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const initialFormState = {
    name: '',
    slug: '',
    description: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryService.getCategories();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Lỗi tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditMode(false);
    setCurrentCategoryId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (category) => {
    setEditMode(true);
    setCurrentCategoryId(category.id);
    setFormData({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa danh mục này?')) {
      try {
        await categoryService.deleteCategory(id);
        alert('Xóa danh mục thành công!');
        fetchCategories();
      } catch (err) {
        alert(err.message || 'Lỗi khi xóa danh mục');
      }
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên danh mục.');
      return;
    }

    try {
      setIsSaving(true);
      
      const payload = { ...formData };
      if (!payload.slug) delete payload.slug; // let backend auto-generate

      if (editMode) {
        await categoryService.updateCategory(currentCategoryId, payload);
        alert('Cập nhật danh mục thành công!');
      } else {
        await categoryService.createCategory(payload);
        alert('Thêm danh mục thành công!');
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      alert(err.message || 'Lỗi khi lưu danh mục');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCategories = categories.filter(cat => {
    const search = searchTerm.toLowerCase();
    return (cat.name && cat.name.toLowerCase().includes(search)) || 
           (cat.slug && cat.slug.toLowerCase().includes(search));
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

  return (
    <AdminLayout>
      <div className="p-8 max-w-[1400px] mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-display-lg text-4xl text-primary tracking-tight mb-2">Quản lý Danh mục</h1>
            <p className="text-on-surface-variant font-body-sm">Xem và quản lý các danh mục sản phẩm.</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={fetchCategories} className="flex items-center gap-2 border border-outline-variant text-primary px-5 py-2.5 rounded shadow-sm hover:bg-surface-beige transition-colors font-label-md tracking-wider uppercase">
              <span className="material-symbols-outlined text-sm">refresh</span>
              Làm mới
            </button>
            <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded shadow-[0_4px_12px_rgba(93,64,55,0.2)] hover:opacity-90 transition-all hover:-translate-y-0.5 font-label-md tracking-wider uppercase">
              <span className="material-symbols-outlined text-sm">add</span>
              Thêm danh mục
            </button>
          </div>
        </div>

      {error ? (
        <div className="bg-error-container text-on-error-container p-6 rounded-2xl mb-8">{error}</div>
      ) : (
        <div className="bg-white rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] overflow-hidden flex flex-col">
          {/* Toolbar */}
          <div className="p-6 border-b border-surface-beige flex flex-col md:flex-row gap-4 justify-between bg-white">
            <div className="relative w-full md:w-96">
              <input 
                type="text" 
                placeholder="Tìm danh mục theo tên, slug..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant/50 rounded-full pl-12 pr-4 py-3 text-body-md outline-none focus:border-accent-gold focus:ring-1 focus:ring-accent-gold transition-colors shadow-sm"
              />
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[22px]">search</span>
            </div>
          </div>

          {/* Table */}
          {filteredCategories.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">category</span>
              <p className="text-on-surface-variant">Không tìm thấy danh mục nào.</p>
            </div>
          ) : (
            <div className="overflow-x-auto p-2">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-ivory border-b border-surface-beige">
                  <tr>
                    <th className="p-5 font-label-lg text-on-surface-variant uppercase tracking-wider text-xs font-semibold">ID</th>
                    <th className="p-5 font-label-lg text-on-surface-variant uppercase tracking-wider text-xs font-semibold">Tên danh mục</th>
                    <th className="p-5 font-label-lg text-on-surface-variant uppercase tracking-wider text-xs font-semibold">Slug</th>
                    <th className="p-5 font-label-lg text-on-surface-variant uppercase tracking-wider text-xs font-semibold">Sản phẩm</th>
                    <th className="p-5 font-label-lg text-on-surface-variant uppercase tracking-wider text-xs font-semibold">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-beige">
                  {filteredCategories.map(cat => (
                    <tr key={cat.id} className="hover:bg-surface-beige/30 transition-colors">
                      <td className="p-5 font-medium text-on-surface-variant">#{cat.id}</td>
                      <td className="p-5">
                        <p className="font-label-lg text-primary text-[15px]">{cat.name}</p>
                        {cat.description && <p className="text-body-sm text-on-surface-variant line-clamp-1 mt-1">{cat.description}</p>}
                      </td>
                      <td className="p-5">
                        <span className="bg-surface-container/50 border border-outline-variant/30 text-on-surface text-xs px-3 py-1.5 rounded-full font-mono">{cat.slug}</span>
                      </td>
                      <td className="p-5 text-primary font-medium">
                        <span className="bg-primary/5 text-primary px-3 py-1 rounded-full font-bold">{cat._count?.products || 0}</span>
                      </td>
                      <td className="p-5">
                        <div className="flex gap-2">
                          <button onClick={() => handleOpenEditModal(cat)} className="w-10 h-10 rounded-full hover:bg-surface-beige text-primary flex items-center justify-center transition-colors border border-transparent hover:border-outline-variant/30" title="Sửa">
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button onClick={() => handleDelete(cat.id)} className="w-10 h-10 rounded-full hover:bg-error-container text-error flex items-center justify-center transition-colors border border-transparent hover:border-error/30" title="Xóa">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
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
      </div>

      {/* Modal Thêm/Sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" role="dialog" aria-modal="true" aria-label={editMode ? 'Sửa danh mục' : 'Thêm danh mục mới'}>
            <div className="p-8 border-b border-surface-beige flex justify-between items-center bg-white">
              <h2 className="font-display-sm text-2xl text-primary">{editMode ? 'Sửa Danh mục' : 'Thêm Danh mục mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container transition-colors" aria-label="Đóng form danh mục">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6 bg-surface-bright">
              <div className="space-y-6">
                <div>
                  <label className="block font-label-lg text-primary uppercase tracking-wider text-xs mb-2">Tên danh mục <span className="text-error">*</span></label>
                  <input required name="name" value={formData.name} onChange={handleFormChange} className="w-full bg-white border border-outline-variant/50 rounded-lg px-4 py-3 outline-none focus:border-accent-gold focus:ring-1 focus:ring-accent-gold transition-colors" />
                </div>
                
                <div>
                  <label className="block font-label-lg text-primary uppercase tracking-wider text-xs mb-2">Slug (Tùy chọn)</label>
                  <input name="slug" value={formData.slug} onChange={handleFormChange} className="w-full bg-white border border-outline-variant/50 rounded-lg px-4 py-3 outline-none focus:border-accent-gold focus:ring-1 focus:ring-accent-gold transition-colors" placeholder="De-trong-de-tu-sinh" />
                  <p className="text-xs text-on-surface-variant mt-2 italic">Sẽ tự tạo từ tên nếu để trống.</p>
                </div>

                <div>
                  <label className="block font-label-lg text-primary uppercase tracking-wider text-xs mb-2">Mô tả</label>
                  <textarea name="description" value={formData.description} onChange={handleFormChange} className="w-full bg-white border border-outline-variant/50 rounded-lg px-4 py-3 outline-none focus:border-accent-gold focus:ring-1 focus:ring-accent-gold transition-colors" rows="4"></textarea>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-4 pt-8 border-t border-surface-beige">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 border border-outline-variant rounded-lg text-primary hover:bg-surface-beige transition-colors font-label-md tracking-wider uppercase">Hủy</button>
                <button type="submit" disabled={isSaving} className="px-6 py-3 bg-primary text-white rounded-lg shadow-[0_4px_12px_rgba(93,64,55,0.2)] hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-50 font-label-md tracking-wider uppercase">
                  {isSaving ? 'Đang lưu...' : 'Lưu danh mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
