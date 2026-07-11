import React, { useState, useEffect } from 'react';
import { productService } from '../services/api/productService';
import { categoryService } from '../services/api/categoryService';
import { uploadService } from '../services/api/uploadService';
import AdminLayout from '../layouts/AdminLayout';
import { getStaticFileUrl } from '../utils/imageUtils';
import { formatPrice } from '../utils/formatters';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [apiCategories, setApiCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Image Upload State
  const [imageFiles, setImageFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [primaryImageUrl, setPrimaryImageUrl] = useState('');
  const [imagesToDelete, setImagesToDelete] = useState([]);
  
  const initialFormState = {
    name: '',
    categoryId: '',
    slug: '',
    description: '',
    price: 0,
    imageUrl: '',
    stock: 0,
    color: '',
    material: '',
    dimensions: '',
    widthCm: '',
    heightCm: '',
    depthCm: '',
    roomType: '',
    style: '',
    isActive: true
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const catData = await categoryService.getCategories();
      setApiCategories(catData);
      await fetchProducts(1, limit, '', 'ALL');
    } catch (err) {
      setError(err.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (p = page, l = limit, search = searchTerm, cat = categoryFilter) => {
    try {
      const params = { includeInactive: true, page: p, limit: l };
      if (search) params.search = search;
      if (cat !== 'ALL') params.category = cat;
      
      const res = await productService.getProducts(params);
      if (res.data) {
        setProducts(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotalItems(res.pagination.total);
      } else {
        setProducts(res);
        setTotalPages(1);
        setTotalItems(res.length);
      }
    } catch (err) {
      setError(err.message || 'Lỗi tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if initial data is already loaded
    if (apiCategories.length > 0) {
      // Debounce search slightly
      const timer = setTimeout(() => {
        fetchProducts(page, limit, searchTerm, categoryFilter);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [page, limit, searchTerm, categoryFilter]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleLimitChange = (e) => {
    setLimit(parseInt(e.target.value));
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (e) => {
    setCategoryFilter(e.target.value);
    setPage(1);
  };

  // getStaticFileUrl imported from utils

  const handleOpenAddModal = () => {
    setEditMode(false);
    setCurrentProductId(null);
    setFormData(initialFormState);
    setImageFiles([]);
    setExistingImages([]);
    setPrimaryImageUrl('');
    setImagesToDelete([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditMode(true);
    setCurrentProductId(product.id);
    setFormData({
      name: product.name || '',
      categoryId: product.categoryId || '',
      slug: product.slug || '',
      description: product.description || '',
      price: product.price || 0,
      imageUrl: product.imageUrl || '',
      stock: product.stock || 0,
      color: product.color || '',
      material: product.material || '',
      dimensions: product.dimensions || '',
      widthCm: product.widthCm ?? '',
      heightCm: product.heightCm ?? '',
      depthCm: product.depthCm ?? '',
      roomType: product.roomType || '',
      style: product.style || '',
      isActive: product.isActive !== false
    });
    setImageFiles([]);
    setImagesToDelete([]);
    
    if (product.images && product.images.length > 0) {
      const sortedImages = [...product.images].sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        return a.sortOrder - b.sortOrder;
      });
      setExistingImages(sortedImages);
      const primary = sortedImages.find(img => img.isPrimary);
      setPrimaryImageUrl(primary ? primary.imageUrl : sortedImages[0].imageUrl);
    } else if (product.imageUrl) {
      setExistingImages([{ id: 'old', imageUrl: product.imageUrl, isPrimary: true }]);
      setPrimaryImageUrl(product.imageUrl);
    } else {
      setExistingImages([]);
      setPrimaryImageUrl('');
    }
    
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này? (Nếu sản phẩm đã có đơn hàng, nó sẽ được ẩn đi thay vì xóa hoàn toàn)')) {
      try {
        const res = await productService.deleteProduct(id);
        alert(res?.message || 'Xóa sản phẩm thành công!');
        fetchProducts();
      } catch (err) {
        alert(err.message || 'Lỗi khi xóa sản phẩm');
      }
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    if (window.confirm(`Bạn muốn ${currentStatus !== false ? 'ẩn' : 'hiện lại'} sản phẩm này?`)) {
      try {
        await productService.updateProduct(id, { isActive: !(currentStatus !== false) });
        alert(`${currentStatus !== false ? 'Ẩn' : 'Hiện lại'} sản phẩm thành công!`);
        fetchProducts();
      } catch (err) {
        alert(err.message || `Lỗi khi ${currentStatus !== false ? 'ẩn' : 'hiện'} sản phẩm`);
      }
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    const totalCurrent = existingImages.length + imageFiles.length + files.length;
    if (totalCurrent > 8) {
      alert('Chỉ được tải lên tối đa 8 ảnh cho mỗi sản phẩm.');
      return;
    }
    
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} vượt quá 5MB`);
        return false;
      }
      return true;
    });

    const newFiles = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: `new-${Date.now()}-${Math.random()}`
    }));

    setImageFiles(prev => {
      const updated = [...prev, ...newFiles];
      if (!primaryImageUrl && updated.length > 0 && existingImages.length === 0) {
        setPrimaryImageUrl(updated[0].preview);
      }
      return updated;
    });
  };

  const handleRemoveExistingImage = (id, url) => {
    setExistingImages(prev => prev.filter(img => img.id !== id));
    if (id !== 'old') {
      setImagesToDelete(prev => [...prev, id]);
    }
    if (primaryImageUrl === url) {
      setPrimaryImageUrl('');
    }
  };

  const handleRemoveNewImage = (id, preview) => {
    setImageFiles(prev => prev.filter(img => img.id !== id));
    if (primaryImageUrl === preview) {
      setPrimaryImageUrl('');
    }
  };

  const handleSetPrimaryImage = (url) => {
    setPrimaryImageUrl(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.categoryId) {
      alert('Vui lòng nhập tên và chọn danh mục.');
      return;
    }
    if (formData.price < 0 || formData.stock < 0) {
      alert('Giá và Tồn kho phải lớn hơn hoặc bằng 0.');
      return;
    }

    try {
      setIsSaving(true);
      
      let newImageUrls = [];
      if (imageFiles.length > 0) {
        const uploadRes = await uploadService.uploadProductImages(imageFiles.map(f => f.file));
        newImageUrls = uploadRes.imageUrls;
      }

      // Determine final primary URL
      // If primaryImageUrl is a preview (blob), find its index and map to newImageUrls
      let finalPrimaryUrl = primaryImageUrl;
      if (primaryImageUrl && primaryImageUrl.startsWith('blob:')) {
        const idx = imageFiles.findIndex(f => f.preview === primaryImageUrl);
        if (idx !== -1 && newImageUrls[idx]) {
          finalPrimaryUrl = newImageUrls[idx];
        } else {
          finalPrimaryUrl = '';
        }
      }

      const payload = {
        ...formData,
        categoryId: parseInt(formData.categoryId, 10),
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock, 10),
        images: newImageUrls,
        primaryImageUrl: finalPrimaryUrl,
        imagesToDelete: imagesToDelete
      };
      
      // If slug is empty, remove it so backend auto-generates
      if (!payload.slug) delete payload.slug;

      if (editMode) {
        await productService.updateProduct(currentProductId, payload);
        alert('Cập nhật sản phẩm thành công!');
      } else {
        await productService.createProduct(payload);
        alert('Thêm sản phẩm thành công!');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      alert(err.message || 'Lỗi khi lưu sản phẩm');
    } finally {
      setIsSaving(false);
    }
  };

  // categoriesForFilter
  const categoriesForFilter = [{ slug: 'ALL', name: 'Tất cả danh mục' }, ...apiCategories];
  
  const filteredProducts = products;

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
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="font-display-sm text-2xl text-primary mb-2">Quản lý Sản phẩm</h1>
          <p className="text-on-surface-variant font-body-sm">Xem và quản lý thông tin sản phẩm trong cửa hàng.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchProducts} className="flex items-center gap-2 border border-outline-variant text-primary px-4 py-2 rounded shadow-sm hover:bg-surface-beige transition-colors">
            <span className="material-symbols-outlined text-sm">refresh</span>
            Làm mới
          </button>
          <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded shadow-sm hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-sm">add</span>
            Thêm sản phẩm
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-error-container text-on-error-container p-4 rounded-lg mb-8">{error}</div>
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
          {/* Toolbar */}
          <div className="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-4 justify-between bg-surface-container-lowest">
            <div className="relative w-full md:w-96">
              <input 
                type="text" 
                placeholder="Tìm kiếm theo tên sản phẩm..." 
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full bg-white border border-outline-variant rounded pl-10 pr-4 py-2 text-body-sm outline-none focus:border-accent-gold transition-colors"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[20px]">search</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-label-sm text-on-surface-variant uppercase">Lọc theo:</span>
              <select 
                value={categoryFilter}
                onChange={handleCategoryChange}
                className="bg-white border border-outline-variant rounded px-3 py-2 text-body-sm outline-none focus:border-accent-gold min-w-[150px]"
              >
                {categoriesForFilter.map(cat => (
                  <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">search_off</span>
              <p className="text-on-surface-variant">Không tìm thấy sản phẩm nào phù hợp.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-beige border-b border-outline-variant">
                  <tr>
                    <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider w-20">Ảnh</th>
                    <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">Tên sản phẩm</th>
                    <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">Danh mục</th>
                    <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">Giá bán</th>
                    <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider text-center">Tồn kho</th>
                    <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider text-center">Trạng thái</th>
                    <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="p-4">
                        <div className="relative inline-block">
                          <img 
                            src={getStaticFileUrl(product.imageUrl || (product.images && product.images.length > 0 ? product.images[0] : null)) || 'https://placehold.co/100x100?text=No+Image'} 
                            alt={product.name} 
                            className="w-12 h-12 object-cover rounded border border-outline-variant"
                          />
                          {(product._count?.wishlists > 0) && (
                            <span className="absolute -top-2 -right-2 bg-accent-terracotta text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                              {product._count.wishlists}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-label-lg text-primary line-clamp-2" title={product.name}>{product.name}</p>
                        <p className="text-body-sm text-outline-variant mt-1">ID: {product.id} {product.slug && `| ${product.slug}`}</p>
                      </td>
                      <td className="p-4">
                        <span className="inline-block bg-surface-container text-on-surface text-xs px-2 py-1 rounded">
                          {product.category?.name || 'Chưa phân loại'}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-headline-sm text-accent-terracotta">{formatPrice(product.price)}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-label-md text-primary">{product.stock || 0}</span>
                      </td>
                      <td className="p-4 text-center">
                        {product.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                            Đã ẩn
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleToggleActive(product.id, product.isActive)} className={`p-2 transition-colors ${product.isActive !== false ? 'text-outline hover:text-orange-500' : 'text-outline hover:text-green-500'}`} title={product.isActive !== false ? "Ẩn sản phẩm" : "Hiện lại sản phẩm"}>
                            <span className="material-symbols-outlined text-[20px]">{product.isActive !== false ? 'visibility_off' : 'visibility'}</span>
                          </button>
                          <button onClick={() => handleOpenEditModal(product)} className="p-2 text-outline hover:text-primary transition-colors" title="Sửa">
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="p-2 text-outline hover:text-error transition-colors" title="Xóa">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 border-t border-outline-variant flex justify-between items-center bg-surface-container-lowest text-body-sm text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <span>Hiển thị</span>
                  <select value={limit} onChange={handleLimitChange} className="border border-outline-variant rounded px-2 py-1 bg-white outline-none focus:border-accent-gold">
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>sản phẩm mỗi trang. Tổng số: {totalItems}</span>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handlePageChange(page - 1)} 
                      disabled={page === 1}
                      className="px-3 py-1 border border-outline-variant rounded hover:bg-surface-beige disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      Trước
                    </button>
                    <span>Trang {page} / {totalPages}</span>
                    <button 
                      onClick={() => handlePageChange(page + 1)} 
                      disabled={page === totalPages}
                      className="px-3 py-1 border border-outline-variant rounded hover:bg-surface-beige disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-outline-variant p-6 flex justify-between items-center z-10">
              <h2 className="font-headline-sm text-primary">{editMode ? 'Cập nhật Sản phẩm' : 'Thêm Sản phẩm mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-outline-variant hover:text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-label-md text-on-surface mb-1">Tên sản phẩm *</label>
                <input 
                  type="text" 
                  name="name" 
                  required
                  value={formData.name} 
                  onChange={handleFormChange}
                  className="w-full border border-outline-variant rounded p-2 text-body-md focus:border-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-md text-on-surface mb-1">Danh mục *</label>
                  <select 
                    name="categoryId" 
                    required
                    value={formData.categoryId} 
                    onChange={handleFormChange}
                    className="w-full border border-outline-variant rounded p-2 text-body-md focus:border-primary outline-none"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {apiCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-1">Slug (để trống tự sinh)</label>
                  <input 
                    type="text" 
                    name="slug" 
                    value={formData.slug} 
                    onChange={handleFormChange}
                    className="w-full border border-outline-variant rounded p-2 text-body-md focus:border-primary outline-none bg-surface-container-lowest"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-md text-on-surface mb-1">Giá bán (VNĐ) *</label>
                  <input 
                    type="number" 
                    name="price" 
                    min="0"
                    required
                    value={formData.price} 
                    onChange={handleFormChange}
                    className="w-full border border-outline-variant rounded p-2 text-body-md focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-1">Tồn kho *</label>
                  <input 
                    type="number" 
                    name="stock" 
                    min="0"
                    required
                    value={formData.stock} 
                    onChange={handleFormChange}
                    className="w-full border border-outline-variant rounded p-2 text-body-md focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div className="border border-outline-variant rounded-lg p-4 bg-surface-container-lowest space-y-4">
                <div>
                  <h3 className="font-label-lg text-primary">{'Th\u00f4ng s\u1ed1 s\u1ea3n ph\u1ea9m'}</h3>
                  <p className="text-body-sm text-on-surface-variant mt-1">{'C\u00e1c tr\u01b0\u1eddng n\u00e0y kh\u00f4ng b\u1eaft bu\u1ed9c, d\u00f9ng \u0111\u1ec3 l\u1ecdc v\u00e0 t\u01b0 v\u1ea5n s\u1ea3n ph\u1ea9m ch\u00ednh x\u00e1c h\u01a1n.'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label-md text-on-surface mb-1">{'M\u00e0u s\u1eafc'}</label>
                    <input
                      type="text"
                      name="color"
                      value={formData.color}
                      onChange={handleFormChange}
                      placeholder={'V\u00ed d\u1ee5: x\u00e1m, tr\u1eafng, n\u00e2u g\u1ed7'}
                      className="w-full border border-outline-variant rounded p-2 text-body-md focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-label-md text-on-surface mb-1">{'Ch\u1ea5t li\u1ec7u'}</label>
                    <input
                      type="text"
                      name="material"
                      value={formData.material}
                      onChange={handleFormChange}
                      placeholder={'V\u00ed d\u1ee5: g\u1ed7 c\u00f4ng nghi\u1ec7p, v\u1ea3i, da PU'}
                      className="w-full border border-outline-variant rounded p-2 text-body-md focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-label-md text-on-surface mb-1">{'K\u00edch th\u01b0\u1edbc hi\u1ec3n th\u1ecb'}</label>
                  <input
                    type="text"
                    name="dimensions"
                    value={formData.dimensions}
                    onChange={handleFormChange}
                    placeholder={'V\u00ed d\u1ee5: 160 x 200 cm'}
                    className="w-full border border-outline-variant rounded p-2 text-body-md focus:border-primary outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-label-md text-on-surface mb-1">{'Chi\u1ec1u r\u1ed9ng (cm)'}</label>
                    <input
                      type="number"
                      name="widthCm"
                      min="0"
                      value={formData.widthCm}
                      onChange={handleFormChange}
                      placeholder="160"
                      className="w-full border border-outline-variant rounded p-2 text-body-md focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-label-md text-on-surface mb-1">{'Chi\u1ec1u cao (cm)'}</label>
                    <input
                      type="number"
                      name="heightCm"
                      min="0"
                      value={formData.heightCm}
                      onChange={handleFormChange}
                      placeholder="90"
                      className="w-full border border-outline-variant rounded p-2 text-body-md focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-label-md text-on-surface mb-1">{'Chi\u1ec1u s\u00e2u (cm)'}</label>
                    <input
                      type="number"
                      name="depthCm"
                      min="0"
                      value={formData.depthCm}
                      onChange={handleFormChange}
                      placeholder="200"
                      className="w-full border border-outline-variant rounded p-2 text-body-md focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label-md text-on-surface mb-1">{'Ph\u00f2ng ph\u00f9 h\u1ee3p'}</label>
                    <input
                      type="text"
                      name="roomType"
                      value={formData.roomType}
                      onChange={handleFormChange}
                      placeholder={'V\u00ed d\u1ee5: ph\u00f2ng ng\u1ee7, ph\u00f2ng kh\u00e1ch'}
                      className="w-full border border-outline-variant rounded p-2 text-body-md focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-label-md text-on-surface mb-1">{'Phong c\u00e1ch'}</label>
                    <input
                      type="text"
                      name="style"
                      value={formData.style}
                      onChange={handleFormChange}
                      placeholder={'V\u00ed d\u1ee5: hi\u1ec7n \u0111\u1ea1i, t\u1ed1i gi\u1ea3n'}
                      className="w-full border border-outline-variant rounded p-2 text-body-md focus:border-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-label-md text-on-surface">Ảnh sản phẩm (Tối đa 8 ảnh)</label>
                  <span className="text-body-sm text-on-surface-variant">{existingImages.length + imageFiles.length}/8</span>
                </div>
                
                <div className="space-y-4">
                  <input 
                    type="file" 
                    multiple
                    accept="image/jpeg, image/jpg, image/png, image/webp"
                    onChange={handleImageChange}
                    disabled={existingImages.length + imageFiles.length >= 8}
                    className="w-full border border-outline-variant rounded p-2 text-body-md focus:border-primary outline-none disabled:opacity-50"
                  />
                  
                  {/* Gallery Preview */}
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    {/* Existing Images */}
                    {existingImages.map(img => (
                      <div key={img.id} className={`relative group border-2 rounded-lg overflow-hidden aspect-square ${primaryImageUrl === img.imageUrl ? 'border-accent-gold' : 'border-outline-variant'}`}>
                        <img src={getStaticFileUrl(img.imageUrl) || 'https://placehold.co/100x100?text=No+Image'} alt="Existing" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          <button type="button" onClick={() => handleSetPrimaryImage(img.imageUrl)} className="text-xs bg-white text-primary px-2 py-1 rounded hover:bg-accent-gold hover:text-white transition-colors">Ảnh chính</button>
                          <button type="button" onClick={() => handleRemoveExistingImage(img.id, img.imageUrl)} className="text-xs bg-error text-white px-2 py-1 rounded hover:bg-red-700 transition-colors">Xóa</button>
                        </div>
                        {primaryImageUrl === img.imageUrl && (
                          <div className="absolute top-1 left-1 bg-accent-gold text-white text-[10px] px-2 py-0.5 rounded shadow">Ảnh chính</div>
                        )}
                      </div>
                    ))}
                    
                    {/* New Images */}
                    {imageFiles.map(img => (
                      <div key={img.id} className={`relative group border-2 rounded-lg overflow-hidden aspect-square ${primaryImageUrl === img.preview ? 'border-accent-gold' : 'border-outline-variant border-dashed'}`}>
                        <img src={img.preview} alt="New" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          <button type="button" onClick={() => handleSetPrimaryImage(img.preview)} className="text-xs bg-white text-primary px-2 py-1 rounded hover:bg-accent-gold hover:text-white transition-colors">Ảnh chính</button>
                          <button type="button" onClick={() => handleRemoveNewImage(img.id, img.preview)} className="text-xs bg-error text-white px-2 py-1 rounded hover:bg-red-700 transition-colors">Xóa</button>
                        </div>
                        {primaryImageUrl === img.preview && (
                          <div className="absolute top-1 left-1 bg-accent-gold text-white text-[10px] px-2 py-0.5 rounded shadow">Ảnh chính</div>
                        )}
                        <div className="absolute top-1 right-1 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded shadow">Mới</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-label-md text-on-surface mb-1">Mô tả</label>
                <textarea 
                  name="description" 
                  rows="3"
                  value={formData.description} 
                  onChange={handleFormChange}
                  className="w-full border border-outline-variant rounded p-2 text-body-md focus:border-primary outline-none resize-y"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="isActive" 
                  name="isActive" 
                  checked={formData.isActive} 
                  onChange={handleFormChange}
                  className="w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-body-md text-on-surface cursor-pointer">Hoạt động (Hiển thị trên web)</label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-outline-variant mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-outline-variant rounded text-on-surface-variant hover:bg-surface-beige transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
