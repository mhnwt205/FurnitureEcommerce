import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { productService } from '../services/api/productService';
import { wishlistService } from '../services/api/wishlistService';
import { useCart } from '../hooks/useCart';
import { getStaticFileUrl } from '../utils/imageUtils';
import ScrollReveal from '../components/common/ScrollReveal';
import WishlistButton from '../components/common/WishlistButton';
import PriceDisplay from '../components/common/PriceDisplay';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const { addToCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = parseInt(searchParams.get('page')) || 1;
  const categoryParam = searchParams.get('category') || 'ALL';
  const searchString = searchParams.get('search') || '';
  const minPriceParam = searchParams.get('minPrice') || '';
  const maxPriceParam = searchParams.get('maxPrice') || '';
  const sortParam = searchParams.get('sort') || 'newest';
  const viewParam = searchParams.get('view') || 'grid';

  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Local state for forms
  const [searchInput, setSearchInput] = useState(searchString);
  const [minPriceInput, setMinPriceInput] = useState(minPriceParam);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPriceParam);

  const categories = [
    { name: 'Tất cả', slug: 'ALL' },
    { name: 'Sofa', slug: 'sofa' },
    { name: 'Bàn', slug: 'ban' },
    { name: 'Ghế', slug: 'ghe' },
    { name: 'Giường', slug: 'giuong' },
    { name: 'Tủ', slug: 'tu' },
    { name: 'Đèn', slug: 'den' }
  ];

  useEffect(() => {
    const fetchWishlistIds = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await wishlistService.getWishlistIds();
          if (res && res.ids) {
            setWishlistIds(res.ids);
          }
        } catch (error) {
          console.error("Failed to fetch wishlist ids", error);
        }
      }
    };
    fetchWishlistIds();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const limit = 12;
        const params = { page: pageParam, limit };
        if (categoryParam !== 'ALL') params.category = categoryParam;
        if (searchString) params.search = searchString;

        if (minPriceParam) params.minPrice = minPriceParam;
        if (maxPriceParam) params.maxPrice = maxPriceParam;
        if (sortParam) params.sort = sortParam;

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
        setError(err.message || 'Lỗi khi tải sản phẩm');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [pageParam, categoryParam, searchString, minPriceParam, maxPriceParam, sortParam]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      searchParams.set('page', newPage);
      setSearchParams(searchParams);
      window.scrollTo(0, 0);
    }
  };

  const updateFilters = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.keys(updates).forEach(key => {
      if (updates[key] === null || updates[key] === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, updates[key]);
      }
    });
    newParams.set('page', '1'); // reset page on filter change
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  const handlePriceFilter = () => {
    if (minPriceInput && maxPriceInput && Number(minPriceInput) > Number(maxPriceInput)) {
      alert("Giá tối thiểu không thể lớn hơn giá tối đa");
      return;
    }
    updateFilters({ minPrice: minPriceInput, maxPrice: maxPriceInput });
  };


  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        
{/**/}

<main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
{/**/}
<nav className="flex items-center gap-2 mb-stack-md text-on-surface-variant font-label-sm text-label-sm">
<Link className="hover:text-primary transition-colors" to="/">Trang chủ</Link>
<span className="material-symbols-outlined text-[14px]" data-icon="chevron_right">chevron_right</span>
<span className="text-primary font-bold">Sản phẩm</span>
</nav>
{/**/}
<div className="mb-stack-lg border-l-4 border-accent-gold pl-6">
<h1 className="font-display-lg text-display-lg text-primary">Sản phẩm</h1>
<p className="text-on-surface-variant font-body-md mt-2 max-w-2xl">Khám phá bộ sưu tập nội thất đương đại, nơi sự tinh tế gặp gỡ các giá trị di sản Việt Nam.</p>
</div>
<div className="flex flex-col lg:flex-row gap-gutter relative">
{/**/}
<aside className="w-full lg:w-72 flex-shrink-0 space-y-stack-lg lg:sticky lg:top-24 lg:self-start">
{/**/}
<button className="lg:hidden flex items-center justify-between w-full p-4 bg-surface-beige rounded-lg text-primary font-bold">
<span className="">Bộ lọc sản phẩm</span>
<span className="material-symbols-outlined" data-icon="filter_list">filter_list</span>
</button>
<div className="hidden lg:block space-y-8">
{/**/}
<div className="border-b border-outline-variant pb-6">
<h3 className="font-label-lg text-label-lg text-primary mb-4">DANH MỤC</h3>
<ul className="space-y-3 font-body-sm text-on-surface-variant">
{categories.map(cat => (
  <li 
    key={cat.slug}
    onClick={() => updateFilters({ category: cat.slug })}
    className={`flex items-center justify-between cursor-pointer group ${categoryParam === cat.slug ? 'text-accent-terracotta font-bold' : 'hover:text-accent-terracotta'}`}
  >
    <span>{cat.name}</span>
  </li>
))}
</ul>
</div>
{/**/}
<div className="border-b border-outline-variant pb-6">
<h3 className="font-label-lg text-label-lg text-primary mb-4">KHOẢNG GIÁ</h3>
<div className="space-y-4">
<div className="flex gap-2">
  <input type="number" placeholder="Từ" value={minPriceInput} onChange={e => setMinPriceInput(e.target.value)} className="w-full bg-white border border-outline-variant rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary" />
  <input type="number" placeholder="Đến" value={maxPriceInput} onChange={e => setMaxPriceInput(e.target.value)} className="w-full bg-white border border-outline-variant rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary" />
</div>
<div className="flex gap-2">
  <button onClick={handlePriceFilter} className="flex-1 bg-surface-container-highest text-primary font-bold py-2 rounded text-sm hover:bg-outline-variant transition-colors">Áp dụng</button>
  <button onClick={() => { setMinPriceInput(''); setMaxPriceInput(''); updateFilters({ minPrice: null, maxPrice: null }); }} className="flex-1 border border-outline-variant text-outline hover:text-primary hover:border-primary font-bold py-2 rounded text-sm transition-colors">Xoá</button>
</div>
</div>
</div>
</div>
</aside>
{/**/}
<div className="flex-1">
{/**/}
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-stack-lg p-4 bg-surface-container-low rounded-xl">
<div className="flex items-center gap-4 flex-1">
<form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xs">
<input 
  className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary" 
  placeholder="Tìm trong kết quả..." 
  type="text" 
  value={searchInput}
  onChange={e => setSearchInput(e.target.value)}
/>
<button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary">
  <span className="material-symbols-outlined text-[20px]" data-icon="search">search</span>
</button>
</form>
<span className="text-body-sm text-on-surface-variant hidden md:inline">
  {loading ? 'Đang tải...' : `Hiển thị ${products.length} sản phẩm${totalItems > 0 ? ` (Tổng số: ${totalItems})` : ''}`}
</span>
</div>
<div className="flex items-center gap-6">
<div className="flex items-center gap-2">
<span className="text-label-sm text-on-surface-variant">Sắp xếp:</span>
<select 
  value={sortParam}
  onChange={(e) => updateFilters({ sort: e.target.value })}
  className="bg-transparent border-none text-label-sm font-bold text-primary focus:ring-0 p-0 cursor-pointer"
>
  <option value="newest">Mới nhất</option>
  <option value="popular">Phổ biến nhất</option>
  <option value="price_asc">Giá: Thấp đến Cao</option>
  <option value="price_desc">Giá: Cao đến Thấp</option>
  <option value="name_asc">Tên: A-Z</option>
</select>
</div>
<div className="flex items-center border-l border-outline-variant pl-4 gap-2">
<button onClick={() => updateFilters({ view: 'grid' })} className={`p-1 ${viewParam === 'grid' ? 'text-primary' : 'text-outline hover:text-primary transition-colors'}`}><span className="material-symbols-outlined" data-icon="grid_view">grid_view</span></button>
<button onClick={() => updateFilters({ view: 'list' })} className={`p-1 ${viewParam === 'list' ? 'text-primary' : 'text-outline hover:text-primary transition-colors'}`}><span className="material-symbols-outlined" data-icon="list">list</span></button>
</div>
</div>
</div>
{/**/}

{loading ? (
  <div className="flex justify-center items-center py-20">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
) : error ? (
  <div className="text-center py-20 text-error font-body-lg">
    {error}
  </div>
) : products.length === 0 ? (
  <div className="text-center py-20 bg-surface-container-low rounded-xl">
    <span className="material-symbols-outlined text-[48px] text-outline mb-4" data-icon="inventory_2">inventory_2</span>
    <h3 className="text-headline-md text-primary mb-2">Không tìm thấy sản phẩm</h3>
    <p className="text-on-surface-variant font-body-md">Vui lòng thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
    <button onClick={() => updateFilters({ search: null, category: null, minPrice: null, maxPrice: null })} className="mt-6 font-label-lg text-primary border border-primary px-6 py-2 rounded hover:bg-primary hover:text-white transition-colors">Xoá bộ lọc</button>
  </div>
) : (
  <div className={viewParam === 'grid' ? "grid grid-cols-2 md:grid-cols-3 gap-6" : "flex flex-col gap-6"}>
    {products.map((product, index) => (
      <ScrollReveal key={product.id} delay={(index % 4) * 100}>
      <Link to={`/products/${product.id}`} className={`group relative bg-surface-beige rounded-xl overflow-hidden product-card-shadow ${viewParam === 'list' ? 'flex flex-col sm:flex-row min-h-[220px]' : 'flex flex-col h-full'}`}>
        <div className={`relative overflow-hidden bg-surface-container-highest ${viewParam === 'list' ? 'w-full sm:w-[260px] shrink-0' : 'aspect-[4/5] w-full'}`}>
          <img 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            src={getStaticFileUrl(product.imageUrl || (product.images && product.images.length > 0 ? product.images[0] : null)) || 'https://placehold.co/400x500?text=No+Image'} 
            alt={product.name} 
          />
          {product.hasPromotion && product.discountPercent > 0 && (
            <span className="absolute top-4 left-4 z-10 rounded bg-accent-terracotta px-2 py-1 text-xs font-bold text-white">-{product.discountPercent}%</span>
          )}
          <WishlistButton 
            productId={product.id} 
            initialIsActive={wishlistIds.includes(product.id)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 hover:text-accent-terracotta"
            iconClassName="text-[20px]"
          />
        </div>
        <div className={`p-6 flex flex-col flex-1 ${viewParam === 'list' ? 'justify-between py-6 sm:py-8' : ''}`}>
          <div>
            <p className="text-label-sm text-outline mb-1 uppercase">{product.category?.name || 'SẢN PHẨM'}</p>
            <h4 className={`font-headline-md text-headline-md text-primary mb-2 line-clamp-2 ${viewParam === 'grid' ? 'min-h-[56px]' : ''}`}>{product.name}</h4>
            {viewParam === 'list' && <p className="text-body-sm text-on-surface-variant mb-4 line-clamp-3">{product.description || 'Sản phẩm nội thất cao cấp mang đến không gian sang trọng và tinh tế.'}</p>}
          </div>
          <div className={`flex mt-auto ${viewParam === 'list' ? 'flex-row items-center justify-between pt-4' : 'flex-col gap-2'}`}>
            <PriceDisplay {...product} size="normal" showBadge />
            <button onClick={(e) => { e.preventDefault(); addToCart(product); }} className={`border border-primary text-primary font-label-lg hover:bg-primary hover:text-white transition-all duration-300 ${viewParam === 'list' ? 'px-8 py-3' : 'w-full mt-4 py-3'}`}>
              THÊM VÀO GIỎ
            </button>
          </div>
        </div>
      </Link>
      </ScrollReveal>
    ))}
  </div>
)}
{/**/}
{totalPages > 1 && (
<nav className="flex justify-center items-center gap-2 mt-section-gap">
<button onClick={() => handlePageChange(pageParam - 1)} disabled={pageParam === 1} className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant text-outline hover:border-primary hover:text-primary transition-all disabled:opacity-50 disabled:hover:border-outline-variant disabled:hover:text-outline">
<span className="material-symbols-outlined" data-icon="keyboard_arrow_left">keyboard_arrow_left</span>
</button>

{[...Array(totalPages)].map((_, i) => {
  const pageNumber = i + 1;
  return (
    <button 
      key={pageNumber} 
      onClick={() => handlePageChange(pageNumber)}
      className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${pageParam === pageNumber ? 'bg-primary text-white font-bold' : 'border border-outline-variant text-primary hover:bg-surface-container-high'}`}
    >
      {pageNumber}
    </button>
  );
})}

<button onClick={() => handlePageChange(pageParam + 1)} disabled={pageParam === totalPages} className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant text-outline hover:border-primary hover:text-primary transition-all disabled:opacity-50 disabled:hover:border-outline-variant disabled:hover:text-outline">
<span className="material-symbols-outlined" data-icon="keyboard_arrow_right">keyboard_arrow_right</span>
</button>
</nav>
)}
</div>
</div>
</main>
{/**/}

{/**/}











      </main>
      <Footer />
    </div>
  );
}