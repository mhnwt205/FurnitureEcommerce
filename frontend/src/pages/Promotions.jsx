import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import ScrollReveal from '../components/common/ScrollReveal';
import { CustomerProductCard, LoadingProductGrid, SectionActionLink } from '../components/common/CustomerHomeUI';
import { productService } from '../services/api/productService';

const heroImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxzJCB9NjF_STlyfq5lrYiRRKpRg8En3m_0jP5C_1JCvE9D9wczWw8rLRZvrgbI-coLCH_Rinv0hVa8l0cKAu6G8KIwVGVIHRHV58hCSc22UITzPj5Xo_4QwhrUracaVUza6lDZ4NKOoLfx4l-BCg64_UgHdYYRZtFpn3_2cdrHDdAghPZ5q5OhjatkeVYbCOiCjs6f9jTRfOxYvouIv-ox8Kj-ydojmBHYlKJOeuo23Q24z8K4uHjH-_zYxKKh9agOqTNljU8Jps';

export default function Promotions() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    productService.getProducts({ limit: 24 })
      .then((response) => {
        if (!active) return;
        const list = response?.data || (Array.isArray(response) ? response : []);
        setProducts(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Không thể tải danh sách ưu đãi.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const promotedProducts = useMemo(() => (
    products.filter(product => Boolean(product?.hasPromotion || Number(product?.discountAmount || 0) > 0 || Number(product?.discountPercent || 0) > 0))
  ), [products]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white text-[#333333]">
      <Header />
      <main className="flex-grow">
        <section className="relative overflow-hidden bg-[#f7f7f5]">
          <div className="absolute inset-0">
            <img alt="Không gian nội thất trong chương trình ưu đãi" className="h-full w-full object-cover object-center opacity-100" src={heroImage} />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.46)_0%,rgba(0,0,0,0.20)_36%,rgba(0,0,0,0.05)_62%,rgba(0,0,0,0)_82%)]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(0deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0)_75%)]" />
          </div>
          <div className="relative mx-auto flex min-h-[520px] w-full max-w-[1200px] items-end px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <ScrollReveal className="max-w-2xl text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.28)]">
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/85">Ưu đãi hiện có</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">Khuyến mãi nội thất đang áp dụng</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/90">Các sản phẩm có ưu đãi được lấy từ hệ thống hiện tại. Giá và mức giảm hiển thị theo dữ liệu thật của sản phẩm.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a href="#promotion-products" className="inline-flex items-center justify-center rounded-[8px] bg-white px-6 py-3 text-sm font-bold text-[#333333] transition-colors hover:bg-[#f3f3f1]">Xem sản phẩm ưu đãi</a>
                <Link to="/products" className="inline-flex items-center justify-center rounded-[8px] border border-white/60 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10">Tất cả sản phẩm</Link>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section id="promotion-products" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <ScrollReveal className="mb-10 flex flex-col gap-4 border-b border-[#eeeeee] pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-[#333333]">Sản phẩm đang có ưu đãi</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#777777]">Danh sách chỉ hiển thị sản phẩm có khuyến mãi hoặc giảm giá thật từ dữ liệu hiện tại.</p>
            </div>
            <SectionActionLink to="/products">Xem tất cả</SectionActionLink>
          </ScrollReveal>

          {loading ? (
            <LoadingProductGrid count={8} />
          ) : error ? (
            <div className="ui-empty-state">
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#999999]">sell</span>
              <h3 className="text-base font-bold text-[#333333]">Chưa tải được ưu đãi</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777777]">{error}</p>
            </div>
          ) : promotedProducts.length === 0 ? (
            <div className="ui-empty-state">
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#999999]">local_offer</span>
              <h3 className="text-base font-bold text-[#333333]">Chưa có sản phẩm khuyến mãi</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777777]">Khi Promotion Engine áp dụng ưu đãi cho sản phẩm, danh sách này sẽ tự động hiển thị.</p>
              <Link to="/products" className="ui-button-primary mt-5 inline-flex px-5 py-2.5 text-sm">Tiếp tục mua sắm</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-7">
              {promotedProducts.map(product => (
                <CustomerProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        <section className="bg-[#f7f7f5] py-16 lg:py-20">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.78fr)_minmax(320px,0.52fr)] lg:px-8">
            <ScrollReveal>
              <h2 className="text-3xl font-bold text-[#333333]">Ưu đãi sản phẩm được áp dụng tự động</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#777777]">Bạn không cần nhập mã thủ công cho ưu đãi sản phẩm. Nếu sản phẩm đủ điều kiện, giá khuyến mãi sẽ được hiển thị trực tiếp trong card và trong giỏ hàng.</p>
            </ScrollReveal>
            <ScrollReveal delay={100} className="rounded-[12px] border border-[#e5e5e5] bg-white p-6">
              <p className="text-sm font-semibold text-[#333333]">Cần tư vấn chọn sản phẩm?</p>
              <p className="mt-2 text-sm leading-6 text-[#777777]">Đội ngũ tư vấn có thể giúp bạn chọn món phù hợp theo không gian và ngân sách.</p>
              <Link to="/design-service#consultation" className="ui-button-primary mt-5 inline-flex px-5 py-2.5 text-sm">Gửi yêu cầu tư vấn</Link>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}


