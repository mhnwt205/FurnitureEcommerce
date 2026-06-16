import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';

export default function StoreSystem() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        
{/**/}

<main className="min-h-screen">
{/**/}
<section className="relative h-[409px] flex items-center justify-center overflow-hidden">
<div className="absolute inset-0 bg-primary/40 z-10"></div>
<img className="absolute inset-0 w-full h-full object-cover" data-alt="A grand interior view of a luxury furniture showroom with soaring ceilings and natural light pouring through massive windows. The space is filled with high-end contemporary sofas and artisanal wooden tables arranged in a curated gallery style. The atmosphere is warm and sophisticated, with a soft ivory and deep brown color palette reflecting modern heritage. Soft ambient lighting highlights the textures of the premium upholstery." src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7RMBItC6aJJA3iltd15eNdOXMZeqxOqWF2g5sr0AQ4nPwWJ4hPHVF9aM7teqQ7_C1uXBeEHMrLNHu0Bl4ZxOnbyTxh1l_-tEedQcxTA4rml4ABKth4iVllnlrMFf6WMgDdTUa4SMkJdsIUFkYI1BkfB5uaqvoHQEeetWUijofVhzdP4tvLpxR06hTZlnTWAwLE6NuDj7J4PSl94GmIPW0L9isKw77mUo0aT_EqVy_IoPWGNZVioFOSanoIBI_E1r5QGnmtlHMIAg" />
<div className="relative z-20 text-center text-white px-margin-mobile">
<h1 className="font-display-lg text-display-lg mb-4">Hệ thống cửa hàng</h1>
<p className="font-body-lg text-body-lg max-w-2xl mx-auto opacity-90">Khám phá không gian sống đương đại tại hệ thống showroom Heritage Home trên toàn quốc.</p>
</div>
</section>
{/**/}
<section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg -mt-20 relative z-30 mb-section-gap">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter bg-surface shadow-xl rounded-xl overflow-hidden min-h-[700px]">
{/**/}
<div className="lg:col-span-5 flex flex-col h-full bg-surface-bright">
{/**/}
<div className="p-6 border-b border-outline-variant space-y-6">
<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
<button className="city-tab px-6 py-2 rounded-full font-label-lg border border-outline text-on-surface-variant hover:border-primary hover:text-primary transition-all whitespace-nowrap active-city bg-primary text-on-primary border-primary" onclick="filterCity('all')">Tất cả</button>
<button className="city-tab px-6 py-2 rounded-full font-label-lg border border-outline text-on-surface-variant hover:border-primary hover:text-primary transition-all whitespace-nowrap" onclick="filterCity('hcm')">TP. Hồ Chí Minh</button>
<button className="city-tab px-6 py-2 rounded-full font-label-lg border border-outline text-on-surface-variant hover:border-primary hover:text-primary transition-all whitespace-nowrap" onclick="filterCity('hanoi')">Hà Nội</button>
<button className="city-tab px-6 py-2 rounded-full font-label-lg border border-outline text-on-surface-variant hover:border-primary hover:text-primary transition-all whitespace-nowrap" onclick="filterCity('hungyen')">Hưng Yên</button>
</div>
<div className="flex items-center justify-between">
<span className="font-body-sm text-on-surface-variant"><strong id="store-count">3</strong> showroom được tìm thấy</span>
<button className="flex items-center gap-2 text-primary font-label-lg hover:underline">
<span className="material-symbols-outlined text-[18px]">near_me</span> Tìm cửa hàng gần bạn
                            </button>
</div>
</div>
{/**/}
<div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[600px]">
{/**/}
<div className="store-card group bg-surface-beige p-5 rounded-lg border border-transparent hover:border-accent-gold/30 transition-all cursor-pointer" data-city="hcm">
<div className="flex gap-4">
<div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-md">
<img className="store-image w-full h-full object-cover transition-transform duration-500" data-alt="A close-up of a luxury furniture boutique window display showing a minimalist brown leather armchair and a sleek marble side table. The interior is bathed in warm, golden lighting that emphasizes the premium textures. Large glass panes reflect the high-end metropolitan street outside. The overall mood is exclusive, high-key, and minimalist." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkjoyiJJH6TB4MKWhsPhqZLo04FvIcQLf5kvc3dLUVnc51m6Jwvj5LY5PH5dq5s6o1fkZLHgaMnEm47ftvmx9V_0zxkXEXoGXxsMSUdj5_eh8vrSG3ZRAsE115T18OS8FkQL1rgq-TFRi2LM2EFJfIU1E02cf_GYNiRjLc7CUObbw34nSksGw1EIWzZ3thkkc7_k7Mx93K029l7gG9Wuff8C4zfypGvlKrJobzuBFLH90duNNsOqTV0lACJIFyOc5Q0rkfkTZwlF8" />
</div>
<div className="flex-1">
<div className="flex justify-between items-start">
<h3 className="font-headline-md text-[18px] text-primary">Heritage District 1</h3>
<span className="bg-secondary-container text-on-secondary-container text-[10px] px-2 py-0.5 rounded uppercase font-bold">Flagship</span>
</div>
<p className="font-body-sm text-on-surface-variant mt-1 leading-relaxed">123 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM</p>
<div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-label-sm text-outline">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">straighten</span> 1,200m²</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">local_parking</span> Bãi đỗ ô tô</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">schedule</span> 08:00 - 21:00</span>
</div>
</div>
</div>
<div className="mt-4 pt-4 border-t border-outline-variant flex items-center justify-between">
<div className="flex gap-4">
<a className="text-primary hover:text-accent-terracotta" href="tel:0281234567"><span className="material-symbols-outlined">call</span></a>
<a className="text-primary hover:text-accent-terracotta" href="mailto:hcm@heritage.vn"><span className="material-symbols-outlined">mail</span></a>
</div>
<button className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-lg hover:bg-primary-container transition-colors flex items-center gap-2">
                                    Chỉ đường <span className="material-symbols-outlined text-[18px]">directions</span>
</button>
</div>
</div>
{/**/}
<div className="store-card group bg-surface-bright p-5 rounded-lg border border-outline-variant hover:border-accent-gold/30 transition-all cursor-pointer" data-city="hanoi">
<div className="flex gap-4">
<div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-md">
<img className="store-image w-full h-full object-cover transition-transform duration-500" data-alt="The elegant entrance of a modern furniture showroom in Hanoi featuring dark wood accents and warm accent lighting. A large branded sign is visible next to a large glass door. Inside, a glimpse of a well-lit living room setup with premium sofas can be seen. The exterior is sleek and minimalist with clean lines and a sophisticated atmosphere." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjZSlt2IMaeG_UbndxOH93OAjH2qVBtuyEoZT6zTI3oKMfre3tUhntngd1ZfDvOQweFByXhKAY1mUk89ZudNKGEKHugWGdEdj-8S_vzXHHoTj2SjHMdC9eeDfbimdjPYfAr-uvYQhDdiJFZcK5E1h9dBdyEZ6ilxTNgZBzOmVAyiXAl3zQ9CixgPcfKwSo2PEYa5zkr0eeeE2crRSk1H6A6JWKG7QzHUP1I9ZxQeR2_msevJEU12a-H3nUxwKxeyFPheqfsTdUxoQ" />
</div>
<div className="flex-1">
<h3 className="font-headline-md text-[18px] text-primary">Heritage Hoan Kiem</h3>
<p className="font-body-sm text-on-surface-variant mt-1 leading-relaxed">45 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội</p>
<div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-label-sm text-outline">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">straighten</span> 850m²</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">local_parking</span> Bãi đỗ xe máy</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">schedule</span> 09:00 - 20:00</span>
</div>
</div>
</div>
<div className="mt-4 pt-4 border-t border-outline-variant flex items-center justify-between">
<div className="flex gap-4">
<a className="text-primary hover:text-accent-terracotta" href="tel:0241234567"><span className="material-symbols-outlined">call</span></a>
<a className="text-primary hover:text-accent-terracotta" href="mailto:hn@heritage.vn"><span className="material-symbols-outlined">mail</span></a>
</div>
<button className="bg-surface-beige text-primary px-4 py-2 rounded-lg font-label-lg hover:bg-outline-variant/20 transition-colors flex items-center gap-2">
                                    Chỉ đường <span className="material-symbols-outlined text-[18px]">directions</span>
</button>
</div>
</div>
{/**/}
<div className="store-card group bg-surface-bright p-5 rounded-lg border border-outline-variant hover:border-accent-gold/30 transition-all cursor-pointer" data-city="hungyen">
<div className="flex gap-4">
<div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-md">
<img className="store-image w-full h-full object-cover transition-transform duration-500" data-alt="A modern industrial style furniture workshop and showroom in Hung Yen with high ceilings and large metal trusses. The space is illuminated by large industrial windows, creating a bright and airy environment. Handcrafted wooden furniture is displayed on polished concrete floors. The mood is creative and authentic, showcasing a blend of traditional craftsmanship and modern design." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtx4uzAqaOOmDt8r_SykWMMkd4HqE-FTkT0f0hk9IwOl23Kr00yxLgicGrc_7dcstOzFHpBjYvECDDBaj6pp9FTyVG5PuF16_I-hP6h7f4UEIwATHNR-tqpdllHFDFckfTq6R7lFPeFge4S9yl1Ku1zlO5RLFLFowBF6J8ISqPt1J5j-6LD5HWNYIDfKJlyAQR9rlV2PjdS0r7JS8YXKIdpxNNDNeik1uw8uRCMeWy1CgaaB2FNlOX03KmH3BmLcoJSPXlmjbaWfI" />
</div>
<div className="flex-1">
<h3 className="font-headline-md text-[18px] text-primary">Heritage Concept Ecopark</h3>
<p className="font-body-sm text-on-surface-variant mt-1 leading-relaxed">Khu đô thị Ecopark, Xuân Quan, Hưng Yên</p>
<div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-label-sm text-outline">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">straighten</span> 1,500m²</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">local_parking</span> Bãi đỗ ô tô</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">schedule</span> 08:30 - 18:30</span>
</div>
</div>
</div>
<div className="mt-4 pt-4 border-t border-outline-variant flex items-center justify-between">
<div className="flex gap-4">
<a className="text-primary hover:text-accent-terracotta" href="tel:0221234567"><span className="material-symbols-outlined">call</span></a>
<a className="text-primary hover:text-accent-terracotta" href="mailto:ecopark@heritage.vn"><span className="material-symbols-outlined">mail</span></a>
</div>
<button className="bg-surface-beige text-primary px-4 py-2 rounded-lg font-label-lg hover:bg-outline-variant/20 transition-colors flex items-center gap-2">
                                    Chỉ đường <span className="material-symbols-outlined text-[18px]">directions</span>
</button>
</div>
</div>
</div>
</div>
{/**/}
<div className="lg:col-span-7 relative min-h-[400px]">
<div className="absolute inset-0 bg-surface-container-high flex flex-col items-center justify-center">
{/**/}
<div className="w-full h-full relative overflow-hidden bg-[#e5e7eb]">
<img className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-700" data-location="Ho Chi Minh City" src="https://lh3.googleusercontent.com/aida-public/AB6AXuADSY36lfl06fQ0-wvsgST1iZPnXuVn4FsRwtiuMX_8eLUKXb954s7WG_jxXFrdVhOhBE-tjgoVDvwLTt9yhKm5SuL6h1HAQ6SaSuVR3kS-TKi568ga0INUCgt-7WgUQClClKBCLl0Nn9K_7UeCdeII7NnRd79_0RlCZP2IDwUEB7FE4amyK6jrmg29_5-DyUyMr2vKMtrB3gStu21-0yO0qb_kum-0JPeBFoUeI7wGorWUjwgDijOcyzPzebwvLIHwZPQOIvHlEKc" />
{/**/}
<div className="absolute top-[60%] left-[45%] group cursor-pointer">
<div className="bg-primary text-white p-2 rounded-full shadow-lg animate-bounce">
<span className="material-symbols-outlined">location_on</span>
</div>
<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 custom-glass p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
<p className="font-label-lg text-primary">Heritage District 1</p>
<p className="font-body-sm text-on-surface-variant">Q.1, TP.HCM</p>
</div>
</div>
<div className="absolute top-[30%] left-[55%] group cursor-pointer">
<div className="bg-accent-terracotta text-white p-2 rounded-full shadow-lg">
<span className="material-symbols-outlined">location_on</span>
</div>
</div>
</div>
{/**/}
<div className="absolute bottom-6 right-6 flex flex-col gap-2">
<button className="bg-white p-2 rounded-lg shadow-md hover:bg-surface-beige transition-colors text-primary"><span className="material-symbols-outlined">add</span></button>
<button className="bg-white p-2 rounded-lg shadow-md hover:bg-surface-beige transition-colors text-primary"><span className="material-symbols-outlined">remove</span></button>
<button className="bg-white p-2 rounded-lg shadow-md hover:bg-surface-beige transition-colors text-primary"><span className="material-symbols-outlined">my_location</span></button>
</div>
</div>
</div>
</div>
</section>
{/**/}
<section className="bg-surface-beige py-section-gap px-margin-mobile">
<div className="max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-2 gap-stack-lg items-center">
<div>
<h2 className="font-headline-lg text-headline-lg text-primary mb-4">Nhận tư vấn thiết kế tại nhà</h2>
<p className="font-body-md text-body-md text-on-surface-variant max-w-lg">Đội ngũ kiến trúc sư của chúng tôi sẵn sàng đến tận công trình để tư vấn giải pháp nội thất tối ưu cho không gian của bạn.</p>
</div>
<div className="flex flex-col sm:flex-row gap-4">
<input className="flex-1 px-6 py-4 rounded-lg bg-surface border border-outline-variant focus:border-accent-gold outline-none" placeholder="Email của bạn" type="email" />
<button className="bg-primary text-on-primary px-8 py-4 rounded-lg font-label-lg hover:bg-primary-container transition-all">Gửi yêu cầu</button>
</div>
</div>
</section>
</main>
{/**/}
<div className="hidden md:flex flex-col h-screen fixed left-0 top-0 z-40">
<div className="bg-surface-ivory dark:bg-inverse-surface w-20 flex flex-col items-center py-8 gap-10 h-full border-r border-outline-variant/30 shadow-xl">
<div className="font-headline-md text-headline-md text-primary rotate-180 [writing-mode:vertical-lr]">Heritage Home</div>
<div className="flex-1 flex flex-col justify-center gap-8">
<a className="group relative text-on-surface-variant hover:text-primary transition-all" href="#">
<span className="material-symbols-outlined">call</span>
<span className="absolute left-full ml-4 bg-primary text-on-primary px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Hotline</span>
</a>
<a className="group relative text-on-surface-variant hover:text-primary transition-all" href="#">
<span className="material-symbols-outlined">location_on</span>
<span className="absolute left-full ml-4 bg-primary text-on-primary px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Cửa hàng</span>
</a>
<a className="group relative text-on-surface-variant hover:text-primary transition-all" href="#">
<span className="material-symbols-outlined">sell</span>
<span className="absolute left-full ml-4 bg-primary text-on-primary px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Khuyến mãi</span>
</a>
</div>
</div>
</div>
{/**/}

{/**/}















      </main>
      <Footer />
    </div>
  );
}