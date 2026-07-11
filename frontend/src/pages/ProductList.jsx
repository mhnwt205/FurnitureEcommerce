import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { productService } from '../services/api/productService';
import { wishlistService } from '../services/api/wishlistService';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../hooks/useCart';
import { getProductImages } from '../utils/imageUtils';
import ScrollReveal from '../components/common/ScrollReveal';
import WishlistButton from '../components/common/WishlistButton';
import ProductImage from '../components/product/ProductImage';
import ProductBadge from '../components/product/ProductBadge';
import ProductPriceBlock from '../components/product/ProductPriceBlock';

const categories = [
  { name: 'Tất cả', slug: 'ALL' },
  { name: 'Sofa', slug: 'sofa' },
  { name: 'Bàn', slug: 'ban' },
  { name: 'Ghế', slug: 'ghe' },
  { name: 'Giường', slug: 'giuong' },
  { name: 'Tủ', slug: 'tu' },
  { name: 'Đèn', slug: 'den' }
];

const sortOptions = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'popular', label: 'Phổ biến nhất' },
  { value: 'price_asc', label: 'Giá: Thấp đến cao' },
  { value: 'price_desc', label: 'Giá: Cao đến thấp' },
  { value: 'name_asc', label: 'Tên: A-Z' }
];

function ProductImagePlaceholder({ productName }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#f7f7f7] px-3 text-center text-[#777777]">
      <span className="material-symbols-outlined text-[28px]">image_not_supported</span>
      <span className="mt-2 line-clamp-2 text-xs font-medium">{productName}</span>
    </div>
  );
}

function CollectionProductCard({ product, isWishlisted }) {
  const productImages = getProductImages(product);
  const primaryImage = productImages[0];
  const hoverImage = productImages[1];
  const soldCount = Number(product.soldCount ?? product.sold ?? product.totalSold ?? 0);
  const discountPercent = Number(product.discountPercent || 0);

  return (
    <article className="group h-full bg-white text-[#252a2b]">
      <div className="relative overflow-hidden bg-[#fafafa]">
        <Link to={`/products/${product.id}`} className="relative block aspect-square overflow-hidden">
          {primaryImage ? (
            <ProductImage
              src={primaryImage}
              alt={product.name}
              className={`h-full w-full object-cover transition-all duration-500 ease-commerce group-hover:scale-[1.035] ${hoverImage ? 'group-hover:opacity-0' : ''}`}
            />
          ) : (
            <ProductImagePlaceholder productName={product.name} />
          )}
          {hoverImage && (
            <ProductImage
              src={hoverImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-500 ease-commerce group-hover:scale-[1.035] group-hover:opacity-100"
            />
          )}
        </Link>

        <ProductBadge
          product={product}
          discountPercent={discountPercent}
          className="absolute left-[10px] top-[10px] z-10 bg-[#f41919] px-[9px] py-[5px] text-[12px] font-semibold leading-none text-white"
        />

        <WishlistButton
          productId={product.id}
          initialIsActive={isWishlisted}
          className="absolute right-[10px] top-[10px] z-10 h-8 w-8 border border-[#e5e5e5] bg-white/95 text-[#434343] opacity-95 shadow-none transition-all duration-300 ease-commerce hover:border-[#bfa37c] hover:text-[#bfa37c] md:opacity-0 md:group-hover:opacity-100"
          iconClassName="text-[18px]"
        />
      </div>

      <div className="px-3 pt-[12px] pb-1">
        {product.category?.name && (
          <p className="mb-[3px] line-clamp-1 text-[12px] leading-5 text-[#777777]">{product.category.name}</p>
        )}
        <Link to={`/products/${product.id}`} className="block">
          <h3 className="line-clamp-2 min-h-[42px] text-[14px] font-semibold leading-[1.5] text-[#333333] transition-colors duration-300 ease-commerce group-hover:text-[#bfa37c]">
            {product.name}
          </h3>
        </Link>
        <div className="mt-[6px]">
          <ProductPriceBlock
            product={product}
            size="normal"
            variant="compact"
            showBadge={false}
            showSavings={false}
            showPromotionName={false}
          />
        </div>
        {soldCount > 0 && <p className="mt-2 text-xs leading-5 text-[#777777]">Đã bán {soldCount}</p>}
      </div>
    </article>
  );
}

function ProductListRow({ product, isWishlisted, onAddToCart }) {
  const productImages = getProductImages(product);
  const primaryImage = productImages[0];
  const hoverImage = productImages[1];
  const soldCount = Number(product.soldCount ?? product.sold ?? product.totalSold ?? 0);
  const discountPercent = Number(product.discountPercent || 0);

  return (
    <article className="group grid gap-5 border-b border-[#e5e5e5] pb-6 text-[#252a2b] last:border-b-0 sm:grid-cols-[190px_1fr] lg:grid-cols-[220px_1fr]">
      <div className="relative overflow-hidden bg-[#fafafa]">
        <Link to={`/products/${product.id}`} className="relative block aspect-square overflow-hidden">
          {primaryImage ? (
            <ProductImage
              src={primaryImage}
              alt={product.name}
              className={`h-full w-full object-cover transition-all duration-500 ease-commerce group-hover:scale-[1.035] ${hoverImage ? 'group-hover:opacity-0' : ''}`}
            />
          ) : (
            <ProductImagePlaceholder productName={product.name} />
          )}
          {hoverImage && (
            <ProductImage
              src={hoverImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-500 ease-commerce group-hover:scale-[1.035] group-hover:opacity-100"
            />
          )}
        </Link>
        <ProductBadge
          product={product}
          discountPercent={discountPercent}
          className="absolute left-[10px] top-[10px] z-10 bg-[#f41919] px-[9px] py-[5px] text-[12px] font-semibold leading-none text-white"
        />
        <WishlistButton
          productId={product.id}
          initialIsActive={isWishlisted}
          className="absolute right-[10px] top-[10px] h-8 w-8 border border-[#e5e5e5] bg-white/95 text-[#434343] shadow-none transition-all duration-300 ease-commerce hover:border-[#bfa37c] hover:text-[#bfa37c]"
          iconClassName="text-[18px]"
        />
      </div>

      <div className="flex min-w-0 flex-col justify-between py-1">
        <div>
          {product.category?.name && <p className="mb-1 text-[12px] leading-5 text-[#777777]">{product.category.name}</p>}
          <Link to={`/products/${product.id}`} className="block">
            <h3 className="line-clamp-2 text-[16px] font-semibold leading-[1.5] text-[#333333] transition-colors duration-300 ease-commerce group-hover:text-[#bfa37c]">
              {product.name}
            </h3>
          </Link>
          {product.description && (
            <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-[#777777]">{product.description}</p>
          )}
          {soldCount > 0 && <p className="mt-3 text-xs text-[#777777]">Đã bán {soldCount}</p>}
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <ProductPriceBlock
            product={product}
            size="normal"
            variant="compact"
            showBadge={false}
            showSavings={false}
            showPromotionName={false}
          />
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onAddToCart(product);
            }}
            className="inline-flex h-[38px] items-center justify-center border border-[#252a2b] bg-white px-5 text-[13px] font-semibold text-[#252a2b] transition-all duration-300 ease-commerce hover:border-[#bfa37c] hover:text-[#bfa37c] active:scale-[0.98]"
          >
            Thêm vào giỏ
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductListSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-[30px] md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
        <div key={item} className="animate-pulse">
          <div className="aspect-square bg-[#f5f5f5]" />
          <div className="mt-3 h-3 w-2/3 bg-[#f1f1f1]" />
          <div className="mt-2 h-4 w-full bg-[#f1f1f1]" />
          <div className="mt-2 h-4 w-1/2 bg-[#f1f1f1]" />
        </div>
      ))}
    </div>
  );
}

function FilterSelect({ label, value, onChange, children, className = '' }) {
  return (
    <label className={`relative flex h-[42px] min-w-0 items-center border border-l-0 border-[#e7e7e7] bg-white text-[13px] font-semibold text-[#252a2b] first:border-l ${className}`}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={onChange}
        className="h-full w-full appearance-none bg-white px-3 pr-8 text-[13px] font-semibold text-[#252a2b] outline-none"
      >
        {children}
      </select>
      <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[16px] text-[#bababa]">expand_more</span>
    </label>
  );
}

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

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

  const [searchInput, setSearchInput] = useState(searchString);
  const [minPriceInput, setMinPriceInput] = useState(minPriceParam);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPriceParam);

  useEffect(() => {
    setSearchInput(searchString);
  }, [searchString]);

  useEffect(() => {
    setMinPriceInput(minPriceParam);
    setMaxPriceInput(maxPriceParam);
  }, [minPriceParam, maxPriceParam]);

  useEffect(() => {
    const fetchWishlistIds = async () => {
      if (!isAuthenticated) {
        setWishlistIds([]);
        return;
      }

      try {
        const res = await wishlistService.getWishlistIds();
        if (res && res.ids) {
          setWishlistIds(res.ids);
        }
      } catch (error) {
        console.error('Failed to fetch wishlist ids', error);
      }
    };
    fetchWishlistIds();
  }, [isAuthenticated]);

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
      const newParams = new URLSearchParams(searchParams);
      newParams.set('page', newPage);
      setSearchParams(newParams);
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
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  const handlePriceFilter = () => {
    if (minPriceInput && maxPriceInput && Number(minPriceInput) > Number(maxPriceInput)) {
      alert('Giá tối thiểu không thể lớn hơn giá tối đa');
      return;
    }
    updateFilters({ minPrice: minPriceInput, maxPrice: maxPriceInput });
  };

  const clearPriceFilter = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    updateFilters({ minPrice: null, maxPrice: null });
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setMinPriceInput('');
    setMaxPriceInput('');
    updateFilters({ search: null, category: null, minPrice: null, maxPrice: null });
  };

  const selectedCategory = categories.find((category) => category.slug === categoryParam);
  const resultLabel = loading
    ? 'Đang tải sản phẩm...'
    : `Hiển thị ${products.length} sản phẩm${totalItems > 0 ? ` trong tổng số ${totalItems}` : ''}`;
  const pageTitle = searchString
    ? `Kết quả tìm kiếm cho "${searchString}"`
    : selectedCategory && selectedCategory.slug !== 'ALL'
      ? selectedCategory.name
      : 'Sản phẩm';

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#252a2b]">
      <Header />
      <main className="w-full max-w-full flex-grow overflow-x-hidden bg-white">
        <nav className="border-b border-[#ededed] bg-white" aria-label="Breadcrumb">
          <div className="mx-auto w-full max-w-container-max px-5 py-[10px] text-xs text-[#777a7b] md:px-10 lg:px-16 xl:max-w-[1200px] xl:px-0">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link to="/" className="transition-colors hover:text-[#bfa37c]">Trang chủ</Link>
              </li>
              <li className="text-[#b9b9b9]">/</li>
              <li className="text-[#252a2b]">Sản phẩm</li>
            </ol>
          </div>
        </nav>

        <section className="mx-auto w-full max-w-container-max px-5 pb-12 pt-5 md:px-10 md:pb-14 md:pt-8 lg:px-16 xl:max-w-[1200px] xl:px-0">
          <div className="mb-5 md:mb-[30px]">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-[25px] font-bold leading-tight text-[#252a2b] md:text-[30px]">{pageTitle}</h1>
                <p className="mt-2 text-[13px] leading-6 text-[#777777]">{resultLabel}</p>
              </div>

              <form onSubmit={handleSearchSubmit} className="relative h-[38px] w-full md:w-[280px]">
                <input
                  className="h-full w-full border border-[#e7e7e7] bg-white px-3 pr-10 text-[13px] text-[#252a2b] outline-none transition-colors placeholder:text-[#999999] focus:border-[#bfa37c]"
                  placeholder="Tìm sản phẩm..."
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                />
                <button type="submit" className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center text-[#777777] transition-colors hover:text-[#bfa37c]" aria-label="Tìm kiếm">
                  <span className="material-symbols-outlined text-[19px]">search</span>
                </button>
              </form>
            </div>
          </div>

          <div className="mb-[30px]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-0">
              <div className="flex h-[42px] items-center border border-[#e7e7e7] bg-white px-[15px] text-[13px] font-semibold uppercase text-[#252a2b] lg:mr-[10px] lg:border-0 lg:px-0 lg:text-base">
                <span className="material-symbols-outlined mr-2 text-[20px] lg:hidden">tune</span>
                <span>Bộ lọc</span>
                <span className="mx-5 hidden h-5 w-px bg-[#e7e7e7] align-middle lg:inline-block" />
              </div>

              <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
                <FilterSelect
                  label="Danh mục"
                  value={categoryParam}
                  onChange={(e) => updateFilters({ category: e.target.value })}
                  className="lg:first:border-l"
                >
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>Danh mục: {category.name}</option>
                  ))}
                </FilterSelect>

                <details className="group relative h-[42px] border border-t-0 border-[#e7e7e7] bg-white text-[13px] text-[#252a2b] sm:border-l-0 sm:border-t lg:border-t lg:[&[open]>summary]:border-[#bfa37c]">
                  <summary className="flex h-full cursor-pointer list-none items-center justify-between px-3 font-semibold [&::-webkit-details-marker]:hidden">
                    <span>Giá sản phẩm</span>
                    <span className="material-symbols-outlined text-[16px] text-[#bababa]">expand_more</span>
                  </summary>
                  <div className="absolute left-0 top-full z-20 mt-[-1px] w-[280px] border border-[#e7e7e7] bg-white p-[15px] shadow-[0_6px_18px_rgba(0,0,0,0.08)]">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        aria-label="Giá từ"
                        placeholder="Từ"
                        value={minPriceInput}
                        onChange={e => setMinPriceInput(e.target.value)}
                        className="h-10 w-full border border-[#e7e7e7] px-3 text-[13px] outline-none transition-colors focus:border-[#bfa37c]"
                      />
                      <input
                        type="number"
                        aria-label="Giá đến"
                        placeholder="Đến"
                        value={maxPriceInput}
                        onChange={e => setMaxPriceInput(e.target.value)}
                        className="h-10 w-full border border-[#e7e7e7] px-3 text-[13px] outline-none transition-colors focus:border-[#bfa37c]"
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={handlePriceFilter} className="h-9 bg-[#252a2b] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#bfa37c]">Áp dụng</button>
                      <button type="button" onClick={clearPriceFilter} className="h-9 border border-[#e7e7e7] px-3 text-[13px] font-semibold text-[#252a2b] transition-colors hover:border-[#bfa37c] hover:text-[#bfa37c]">Xóa</button>
                    </div>
                  </div>
                </details>

                <FilterSelect
                  label="Sắp xếp"
                  value={sortParam}
                  onChange={(e) => updateFilters({ sort: e.target.value })}
                  className="border-t-0 sm:border-t lg:border-t"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>Sắp xếp: {option.label}</option>
                  ))}
                </FilterSelect>

                <div className="flex h-[42px] border border-t-0 border-[#e7e7e7] bg-white sm:border-l-0 lg:border-t">
                  <button
                    type="button"
                    onClick={() => updateFilters({ view: 'grid' })}
                    className={`grid w-12 place-items-center transition-colors ${viewParam === 'grid' ? 'bg-[#252a2b] text-white' : 'text-[#777777] hover:text-[#bfa37c]'}`}
                    aria-label="Xem dạng lưới"
                  >
                    <span className="material-symbols-outlined text-[19px]">grid_view</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFilters({ view: 'list' })}
                    className={`grid w-12 place-items-center border-l border-[#e7e7e7] transition-colors ${viewParam === 'list' ? 'bg-[#252a2b] text-white' : 'text-[#777777] hover:text-[#bfa37c]'}`}
                    aria-label="Xem dạng danh sách"
                  >
                    <span className="material-symbols-outlined text-[19px]">list</span>
                  </button>
                </div>
              </div>
            </div>

            {(searchString || categoryParam !== 'ALL' || minPriceParam || maxPriceParam) && (
              <div className="mt-[15px] flex flex-wrap items-center gap-2 text-[13px] text-[#5d5d5d]">
                {categoryParam !== 'ALL' && <span className="border border-[#dadada] px-3 py-1">Danh mục: {selectedCategory?.name}</span>}
                {searchString && <span className="border border-[#dadada] px-3 py-1">Tìm kiếm: {searchString}</span>}
                {(minPriceParam || maxPriceParam) && <span className="border border-[#dadada] px-3 py-1">Giá: {minPriceParam || '0'} - {maxPriceParam || '...'}</span>}
                <button type="button" onClick={clearAllFilters} className="text-[#3966b8] underline underline-offset-4">Xóa hết</button>
              </div>
            )}
          </div>

          {loading ? (
            <ProductListSkeleton />
          ) : error ? (
            <div className="border border-[#e7e7e7] bg-white px-6 py-14 text-center text-error">{error}</div>
          ) : products.length === 0 ? (
            <div className="border border-[#e7e7e7] bg-white px-6 py-14 text-center">
              <span className="material-symbols-outlined text-[42px] text-[#999999]">inventory_2</span>
              <h3 className="mt-4 text-xl font-semibold text-[#252a2b]">Không tìm thấy sản phẩm</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#777777]">Vui lòng thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
              <button type="button" onClick={clearAllFilters} className="mt-6 h-[38px] border border-[#252a2b] px-5 text-[13px] font-semibold text-[#252a2b] transition-colors hover:border-[#bfa37c] hover:text-[#bfa37c]">Xóa bộ lọc</button>
            </div>
          ) : viewParam === 'grid' ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-[30px] pb-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
              {products.map((product, index) => (
                <ScrollReveal key={product.id} delay={(index % 4) * 70}>
                  <CollectionProductCard product={product} isWishlisted={wishlistIds.includes(product.id)} />
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <div className="space-y-6 pb-8">
              {products.map((product, index) => (
                <ScrollReveal key={product.id} delay={(index % 4) * 70}>
                  <ProductListRow product={product} isWishlisted={wishlistIds.includes(product.id)} onAddToCart={addToCart} />
                </ScrollReveal>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="mb-10 mt-4 flex flex-wrap items-center justify-center gap-1 text-sm" aria-label="Pagination">
              <button
                type="button"
                aria-label="Trang trước"
                onClick={() => handlePageChange(pageParam - 1)}
                disabled={pageParam === 1}
                className="grid h-9 w-9 place-items-center border border-[#e5e5e5] text-[#777777] transition-colors hover:border-[#252a2b] hover:text-[#252a2b] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[#e5e5e5] disabled:hover:text-[#777777]"
              >
                <span className="material-symbols-outlined text-[19px]">keyboard_arrow_left</span>
              </button>

              {[...Array(totalPages)].map((_, i) => {
                const pageNumber = i + 1;
                return (
                  <button
                    key={pageNumber}
                    type="button"
                    aria-current={pageParam === pageNumber ? 'page' : undefined}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`grid h-9 min-w-9 place-items-center border px-3 transition-colors ${pageParam === pageNumber ? 'border-[#252a2b] bg-[#252a2b] font-semibold text-white' : 'border-[#e5e5e5] bg-white text-[#252a2b] hover:border-[#252a2b]'}`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                type="button"
                aria-label="Trang sau"
                onClick={() => handlePageChange(pageParam + 1)}
                disabled={pageParam === totalPages}
                className="grid h-9 w-9 place-items-center border border-[#e5e5e5] text-[#777777] transition-colors hover:border-[#252a2b] hover:text-[#252a2b] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[#e5e5e5] disabled:hover:text-[#777777]"
              >
                <span className="material-symbols-outlined text-[19px]">keyboard_arrow_right</span>
              </button>
            </nav>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}