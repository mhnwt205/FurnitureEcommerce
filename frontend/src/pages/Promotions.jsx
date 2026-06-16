import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';

export default function Promotions() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        
{/**/}

{/**/}
<aside className="hidden md:flex flex-col h-screen fixed left-0 top-0 z-40 bg-surface-beige w-20 hover:w-80 group transition-all duration-300 overflow-hidden border-r border-outline-variant/30">
<div className="p-6 mb-12 opacity-0 group-hover:opacity-100 transition-opacity">
<h2 className="font-headline-md text-headline-md text-primary whitespace-nowrap">Heritage Home</h2>
<p className="text-label-sm font-label-sm text-on-surface-variant">Nội thất đương đại</p>
</div>
<div className="flex flex-col space-y-4 px-4">
<a className="text-on-surface-variant px-4 py-3 hover:bg-surface-container-high rounded-lg flex items-center transition-all group-hover:justify-start justify-center" href="#">
<span className="material-symbols-outlined" data-icon="call">call</span>
<span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-label-lg text-label-lg">Hotline</span>
</a>
<a className="text-on-surface-variant px-4 py-3 hover:bg-surface-container-high rounded-lg flex items-center transition-all group-hover:justify-start justify-center" href="#">
<span className="material-symbols-outlined" data-icon="location_on">location_on</span>
<span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-label-lg text-label-lg">Cửa hàng</span>
</a>
<a className="bg-primary text-on-primary rounded-lg px-4 py-3 flex items-center transition-all group-hover:justify-start justify-center shadow-md" href="#">
<span className="material-symbols-outlined" data-icon="sell" style={{ fontVariationSettings: "'FILL' 1" }}>sell</span>
<span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-label-lg text-label-lg">Khuyến mãi</span>
</a>
<a className="text-on-surface-variant px-4 py-3 hover:bg-surface-container-high rounded-lg flex items-center transition-all group-hover:justify-start justify-center" href="#">
<span className="material-symbols-outlined" data-icon="person">person</span>
<span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-label-lg text-label-lg">Tài khoản</span>
</a>
</div>
</aside>
<main className="md:ml-20">
{/**/}
<section className="relative h-[614px] md:h-[716px] flex items-center overflow-hidden bg-primary-container">
<div className="absolute inset-0 bg-black/40 z-10"></div>
<img alt="Promotional Banner Furniture" className="absolute inset-0 w-full h-full object-cover" data-alt="A luxurious minimalist living room featuring a premium dark emerald velvet sofa and a low-profile walnut coffee table. The scene is bathed in warm golden hour sunlight streaming through floor-to-ceiling windows, highlighting rich textures and organic shapes. The atmosphere is sophisticated and high-end, representing a modern Vietnamese heritage aesthetic with soft shadows and refined beige walls." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxzJCB9NjF_STlyfq5lrYiRRKpRg8En3m_0jP5C_1JCvE9D9wczWw8rLRZvrgbI-coLCH_Rinv0hVa8l0cKAu6G8KIwVGVIHRHV58hCSc22UITzPj5Xo_4QwhrUracaVUza6lDZ4NKOoLfx4l-BCg64_UgHdYYRZtFpn3_2cdrHDdAghPZ5q5OhjatkeVYbCOiCjs6f9jTRfOxYvouIv-ox8Kj-ydojmBHYlKJOeuo23Q24z8K4uHjH-_zYxKKh9agOqTNljU8Jps" />
<div className="relative z-20 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full text-white">
<span className="font-label-lg text-label-lg uppercase tracking-widest text-accent-gold mb-4 block">Seasonal Campaign</span>
<h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-6 leading-tight">Ưu đãi nội thất<br />lên đến 70%</h1>
<p className="font-body-lg text-body-lg mb-8 max-w-xl text-surface-ivory/80">Khám phá bộ sưu tập Heritage Home với mức giá đặc biệt chưa từng có. Tôn vinh không gian sống bằng những tác phẩm thủ công tinh xảo.</p>
{/**/}
<div className="flex space-x-4 mb-10" id="countdown">
<div className="countdown-item rounded-lg p-4 min-w-[80px] text-center">
<span className="block text-2xl font-bold font-display-lg" id="days">11</span>
<span className="text-xs font-label-sm uppercase opacity-70">Ngày</span>
</div>
<div className="countdown-item rounded-lg p-4 min-w-[80px] text-center">
<span className="block text-2xl font-bold font-display-lg" id="hours">23</span>
<span className="text-xs font-label-sm uppercase opacity-70">Giờ</span>
</div>
<div className="countdown-item rounded-lg p-4 min-w-[80px] text-center">
<span className="block text-2xl font-bold font-display-lg" id="minutes">50</span>
<span className="text-xs font-label-sm uppercase opacity-70">Phút</span>
</div>
<div className="countdown-item rounded-lg p-4 min-w-[80px] text-center">
<span className="block text-2xl font-bold font-display-lg" id="seconds">27</span>
<span className="text-xs font-label-sm uppercase opacity-70">Giây</span>
</div>
</div>
<a className="inline-block bg-accent-gold text-primary font-label-lg text-label-lg px-10 py-4 rounded-none hover:bg-white transition-all transform hover:-translate-y-1" href="#shop-now">MUA NGAY</a>
</div>
</section>
{/**/}
<section className="py-12 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto border-b border-outline-variant/20">
<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
<div className="flex flex-wrap gap-4">
<button className="px-6 py-2 rounded-full border border-primary bg-primary text-on-primary text-label-sm font-label-sm">Tất cả ưu đãi</button>
<button className="px-6 py-2 rounded-full border border-outline-variant text-on-surface-variant hover:border-primary transition-all text-label-sm font-label-sm">Giảm từ 50%</button>
<button className="px-6 py-2 rounded-full border border-outline-variant text-on-surface-variant hover:border-primary transition-all text-label-sm font-label-sm">Sofa &amp; Ghế</button>
<button className="px-6 py-2 rounded-full border border-outline-variant text-on-surface-variant hover:border-primary transition-all text-label-sm font-label-sm">Bàn &amp; Tủ</button>
<button className="px-6 py-2 rounded-full border border-outline-variant text-on-surface-variant hover:border-primary transition-all text-label-sm font-label-sm">Phòng Ngủ</button>
</div>
<div className="flex items-center space-x-2 text-on-surface-variant">
<span className="material-symbols-outlined">filter_list</span>
<span className="font-label-lg text-label-lg">Sắp xếp: Mới nhất</span>
</div>
</div>
</section>
{/**/}
<section className="py-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto" id="shop-now">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
{/**/}
<div className="group relative bg-surface-beige p-6 rounded-none product-card-shadow transition-all">
<div className="absolute top-8 left-8 z-20 bg-accent-terracotta text-white font-label-sm text-[10px] px-3 py-1 uppercase tracking-tighter">Sale -40%</div>
<div className="relative overflow-hidden aspect-[4/5] mb-6">
<img alt="Chair" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" data-alt="A modern minimalist ash wood lounge chair with neutral cream linen upholstery. The chair is positioned in a bright studio with soft beige textured walls and subtle warm lighting. The aesthetic is clean, sophisticated, and premium, highlighting the fine craftsmanship of the furniture piece within a modern Vietnamese architectural context." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCMPeHrAVzNgPwD4hnkrwL5ekYmAUYUrYThbZEl92coVOYG19DtUXqBX33GX4CchX4LKX71Qcgdugh0Jp4Cr4-CR_Uy1pngYOD5sgpNcy18MbFi6_Lew_-s1rCa4ERWu_U-w2OopIYNPG9YlJmez6vh-SvDK30v6Gb5NbxrAKzx4Q5Fo20Fw5HhVgk9fslzs_PUEl2g5DSBftiHMP_BLX7i5UW0fBbVP_aMPStSmbJu9MFOXq1cSwFGLj360pQYukk8tv4XsyGSrqA" />
<div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
</div>
<div>
<h3 className="font-headline-md text-headline-md text-primary mb-2">Ghế Lounge Heritage</h3>
<p className="text-on-surface-variant text-body-sm font-body-sm mb-4">Gỗ sồi tự nhiên, Nệm Linen cao cấp</p>
<div className="flex items-baseline space-x-3">
<span className="text-accent-terracotta font-bold text-lg">12.500.000đ</span>
<span className="text-on-surface-variant/50 line-through text-sm">18.900.000đ</span>
</div>
</div>
<button className="mt-6 w-full py-4 border border-primary text-primary font-label-lg text-label-lg hover:bg-primary hover:text-on-primary transition-all">THÊM VÀO GIỎ HÀNG</button>
</div>
{/**/}
<div className="group relative bg-surface-beige p-6 rounded-none product-card-shadow transition-all">
<div className="absolute top-8 left-8 z-20 bg-accent-terracotta text-white font-label-sm text-[10px] px-3 py-1 uppercase tracking-tighter">Hot Sale -55%</div>
<div className="relative overflow-hidden aspect-[4/5] mb-6">
<img alt="Table" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" data-alt="An elegant mid-century modern dining table crafted from dark stained teak wood. The table is set in a spacious, high-ceilinged room with ivory walls and a large abstract painting in muted earth tones. Soft ambient light emphasizes the smooth wood grain and minimalist silhouette, creating a feeling of timeless luxury and warmth." src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7P6uL5FOdYFUZ-UlIpUbYsy22J7eWGArKgKTE16qLoOc2Tdyd6TP3B_PyQ2Y1LpGzX4sv_unZ_FXwdIh5fkaEzbqUAutHjmidd8D_eDf3kHMNDMWAratJDjAm7s0TOjdJarJTX3FotkAjBgZ64oNFrubZI1Ph6aNEBI-HzV21uRNud2CjFoJmsP4dkvOSdAVtSjj_Y7fFbE5Z6Re2ibEZ1HSHqiz4d9Dnp0818jyavyDaPDeooVJah_uIa5WaAgxgq4VvpuIiN4w" />
</div>
<div>
<h3 className="font-headline-md text-headline-md text-primary mb-2">Bàn Ăn Cố Đô</h3>
<p className="text-on-surface-variant text-body-sm font-body-sm mb-4">Gỗ Gõ Đỏ nguyên khối, hoàn thiện satin</p>
<div className="flex items-baseline space-x-3">
<span className="text-accent-terracotta font-bold text-lg">24.000.000đ</span>
<span className="text-on-surface-variant/50 line-through text-sm">48.000.000đ</span>
</div>
</div>
<button className="mt-6 w-full py-4 border border-primary text-primary font-label-lg text-label-lg hover:bg-primary hover:text-on-primary transition-all">THÊM VÀO GIỎ HÀNG</button>
</div>
{/**/}
<div className="group relative bg-surface-beige p-6 rounded-none product-card-shadow transition-all">
<div className="absolute top-8 left-8 z-20 bg-accent-terracotta text-white font-label-sm text-[10px] px-3 py-1 uppercase tracking-tighter">Outlet -70%</div>
<div className="relative overflow-hidden aspect-[4/5] mb-6">
<img alt="Sofa" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" data-alt="A luxurious modular sectional sofa in a soft dove-grey woven fabric. The sofa is arranged in a contemporary penthouse living space with warm wood flooring and minimalist decor. High-end lighting creates a cozy yet airy atmosphere, reflecting a calm and prestigious lifestyle. The overall style is modern-minimalist with tactile textures." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhI3PWnsZn2Me8OwpV85QimfLRPKdsmOmdD-sHe-b-XVwTuB4WfZAM1fm3bfGIYcnkVhx9uaJhPh9Ph8ZGent49E-cTlFHP8P0LqbAHBZki6W4khpWVCfWmgtIWGAfEV0GMzrpXvDq_vShQw9tWkk5KZE5Le8WCQP0kM_tnljtr_s7O0aOjMRR26GHnneF9Y5AteNvopqklB-IPsKTUiNqyhESmdaO3P1fV1WaJ9qfpLUOGQBeOmcHVRHu7I_owEYZKX5bdybZjF8" />
</div>
<div>
<h3 className="font-headline-md text-headline-md text-primary mb-2">Sofa Module Mây</h3>
<p className="text-on-surface-variant text-body-sm font-body-sm mb-4">Thiết kế linh hoạt, vải bọc nhập khẩu Ý</p>
<div className="flex items-baseline space-x-3">
<span className="text-accent-terracotta font-bold text-lg">15.600.000đ</span>
<span className="text-on-surface-variant/50 line-through text-sm">52.000.000đ</span>
</div>
</div>
<button className="mt-6 w-full py-4 border border-primary text-primary font-label-lg text-label-lg hover:bg-primary hover:text-on-primary transition-all">THÊM VÀO GIỎ HÀNG</button>
</div>
</div>
<div className="mt-20 flex justify-center">
<button className="flex items-center space-x-3 text-primary font-label-lg text-label-lg group border-b border-primary pb-2 hover:text-accent-terracotta hover:border-accent-terracotta transition-all">
<span className="">XEM THÊM SẢN PHẨM ƯU ĐÃI</span>
<span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
</button>
</div>
</section>
{/**/}
<section className="bg-surface-container py-section-gap">
<div className="max-w-[800px] mx-auto px-margin-mobile text-center">
<h2 className="font-headline-lg text-headline-lg text-primary mb-6">Đừng bỏ lỡ ưu đãi mới nhất</h2>
<p className="font-body-md text-body-md text-on-surface-variant mb-10">Đăng ký nhận bản tin Heritage Home để là người đầu tiên biết về các chương trình khuyến mãi độc quyền và bộ sưu tập mới.</p>
<form className="flex flex-col md:flex-row gap-0">
<input className="flex-grow px-6 py-4 bg-transparent border border-outline-variant focus:border-primary focus:ring-0 outline-none placeholder:text-outline text-primary" placeholder="Địa chỉ email của bạn" type="email" />
<button className="bg-primary text-on-primary px-10 py-4 font-label-lg text-label-lg hover:bg-primary-container transition-colors uppercase">Đăng Ký</button>
</form>
</div>
</section>
</main>
{/**/}

{/**/}















      </main>
      <Footer />
    </div>
  );
}