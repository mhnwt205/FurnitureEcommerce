import React from 'react';
import { Link } from 'react-router-dom';
import ScrollReveal from '../components/common/ScrollReveal';

export const projectsData = [
  {
    slug: 'the-heritage-estate',
    name: 'The Heritage Estate - Nam An',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZpj37FOBcKRlAbi-FnFLGq7atfxDW95fzxfLEeueR5-YT2qayeodS-X19EbDqYE06bunVefqMuIJpruZuF99c7vbi26RhkTS503j_RORpDo28R-zONQSPL_jGVw48pnqL03ZbbUWzIzeS4w1fUKGhFnRh_pI-HnTj2TADBay41aaXDyc_mSJp0qkW9XTHeUNGmQSakF6GatFYnON7Rp_alh9t62t7e6Q60v3iJerzEUuiAjPoBOkshQ1H7E37288OZ3ypin0Z6yI',
    category: 'Biệt Thự Đơn Lập',
    usedProductIds: [42, 43, 44, 45],
    preferredCategories: ['sofa', 'ban', 'ghe', 'den', 'tu']
  },
  {
    slug: 'indochine-villa-sai-gon',
    name: 'Indochine Villa Sài Gòn',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhBHdmmXWwh92Kz0skZ1sqSlpKG8GRiDpSH1zHPIqE9_f3BiFm7EtP32ZZ8O3mKKASOV6PuWDwNQiFiwiMhGswUC9WzgwXYD0oWq0fxulclr1PJ12ZWVlIkFwZvs3Wdi8lCGFvgPFgBZ7b24Pi4U4uhqlvWBlev-Qbel4lZboQXBV-zTr6DIM9whLgvqLrzOTd_hY7oQEdOKAPSFitD6fSLnNbIjqn-zpQC1d2j4ZqPioHd0ExcY3bpTgD398wORWrrM1bu3CcAQE',
    category: 'Biệt Thự Đơn Lập',
    usedProductIds: [42, 43, 44, 45],
    preferredCategories: ['sofa', 'ban', 'ghe', 'den', 'tu']
  },
  {
    slug: 'modern-penthouse-skyline',
    name: 'Modern Penthouse Skyline',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDW2MWHynxyt2LnutacOPTAubhcpH82qHKuuW58qDNBWH-WhFZu8Jt0TXI0E24YYZZ27ZQ10x9Ht41uRq35mK-203AX3n_5EX0ivf1jZmdgeQR3EcbTgCoDmRnGcTSWoFzSoQI3hQRIe_HcxMeBZzdh7-nnsWFYaqVP7zXmncWi_TnOp0s1jMbqDzreiWRQ-pFpMJPSCEVe0v8O_G4urapKlDqOekqaYOrSR5pEQreDbLDMZYxb6UwOvBaZfhhK99ciHtJ3e4A4YS4',
    category: 'Căn Hộ Cao Cấp',
    usedProductIds: [46, 47, 48, 49],
    preferredCategories: ['sofa', 'ban', 'den', 'ke', 'trang-tri']
  },
  {
    slug: 'creative-hub-office',
    name: 'Creative Hub Office',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDHmu_CVBWGBcwZKIcsNFNCRqAU2ev8GDcja0n2jWIy7uy8bZFfksaKuwLncx0E9wAsLIMvydkI4But6vP7-KHHRW5yUIWRZQdRFqkVNhb8tQ5dvFTnHp2TjHx61oW1zadvnx8tr5zUpbWy8jPeJXzxu0YCsPaEiFul2IWVde029lP9aBxNEkHrOZ3DgtQPb4MvkkSrq4F0JscqHAluW5_lJ3DowWHJhv1qr3DPy3T0UyXFAKfqpK9CN63gybkGd2iVq9cAZVfzyYg',
    category: 'Không Gian Làm Việc',
    usedProductIds: [50, 51, 42, 43],
    preferredCategories: ['ban', 'ghe', 'ke', 'den']
  },
  {
    slug: 'zen-retreat-villa-da-lat',
    name: 'Zen Retreat Villa',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1hpnfRgBAQOtBEzEt-e785U23li0yp0YX9otQXFcKnq9_J0s7YqIYnN3qvFIlyGNAuGoyS0skSVcoF--0sRZ0g7riJAM54wy4j35Lbf-qHIO_agU49SHUM0Ui21wg7z0TicHHWz60G1H89DSJCkf3xn-JH7Lqf5z-e3QHv_rocQm3FV-RTy334GkLxLDsNLnfKDgmSHRno6PyPCtX7F7Xt0ny6np_FPmWZKmiWwiY8uHVxrJd7wxrPCaAQfBwbND4K5CfssBIrno',
    category: 'Nghỉ Dưỡng',
    usedProductIds: [44, 45, 46, 47],
    preferredCategories: ['giuong', 'tu', 'den', 'ban', 'ghe']
  }
];

export const selectProjectProducts = (allProducts, project, limit = 4) => {
  if (!allProducts || !allProducts.length) return [];
  const activeProducts = allProducts.filter(p => p.status !== 'inactive' && p.status !== 'INACTIVE');
  
  let selected = [];
  const usedIds = project?.usedProductIds || [];
  const prefs = project?.preferredCategories || [];
  
  const getCatSlug = (p) => p.category?.slug?.toLowerCase();

  // 1. Used IDs (try to get distinct categories if possible)
  const used = activeProducts.filter(p => usedIds.includes(p.id));
  for (let p of used) {
    if (selected.length < limit && !selected.find(s => getCatSlug(s) === getCatSlug(p))) {
      selected.push(p);
    }
  }
  
  // 2. Add from preferred categories
  for (let prefCat of prefs) {
    if (selected.length >= limit) break;
    // skip if we already have this category
    if (selected.find(s => getCatSlug(s) === prefCat)) continue;
    
    const candidates = activeProducts.filter(p => getCatSlug(p) === prefCat && !selected.find(s => s.id === p.id));
    if (candidates.length > 0) {
      selected.push(candidates[0]);
    }
  }
  
  // 3. Fill with remaining active products distinct categories if not enough
  for (let p of activeProducts) {
    if (selected.length >= limit) break;
    if (!selected.find(s => s.id === p.id) && !selected.find(s => getCatSlug(s) === getCatSlug(p))) {
      selected.push(p);
    }
  }
  
  // 4. If still not enough, just fill with any remaining active
  for (let p of activeProducts) {
    if (selected.length >= limit) break;
    if (!selected.find(s => s.id === p.id)) {
      selected.push(p);
    }
  }
  
  return selected;
};


export const ModernPenthouseSkyline = ({ project }) => (
<>

<section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
<div className="absolute inset-0 bg-primary/20 z-10"></div>
<img className="absolute inset-0 w-full h-full object-cover" data-alt="A breathtaking view from a high-floor luxury penthouse at dusk, overlooking a sprawling modern city skyline. The interior features floor-to-ceiling glass windows, warm ambient cove lighting, and high-end modern furniture with a focus on deep brown leather and polished marble textures. The atmosphere is serene and prestigious, using a color palette of ivory, espresso brown, and golden urban lights." src={project.image}/>
<div className="relative z-20 text-center text-white px-margin-mobile">
<span className="block font-label-lg text-label-lg uppercase tracking-[0.3em] mb-6 animate-fade-in text-glow">Dự Án Độc Bản</span>
<h1 className="font-display-lg text-display-lg md:text-[80px] leading-tight mb-8 text-glow">Modern Penthouse Skyline</h1>
<p className="font-body-lg text-body-lg max-w-2xl mx-auto opacity-90 mb-12">Sự giao thoa hoàn hảo giữa tầm nhìn triệu đô và ngôn ngữ thiết kế tối giản đương đại.</p>

</div>
<div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 animate-bounce">
<span className="material-symbols-outlined text-white text-4xl">keyboard_arrow_down</span>
</div>
</section>

<ScrollReveal as="section" className="py-section-gap px-margin-desktop max-w-container-max mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter">
<div className="lg:col-span-7">
<h2 className="font-headline-lg text-headline-lg text-primary mb-8">Triết lý thiết kế: Sang trọng từ sự tĩnh lặng</h2>
<div className="space-y-6 text-on-surface-variant font-body-lg leading-relaxed">
<p>Dự án Modern Penthouse Skyline tọa lạc tại trái tim của thành phố, nơi nhịp sống hối hả bị bỏ lại sau cánh cửa để nhường chỗ cho sự tĩnh lặng và đẳng cấp. Chúng tôi áp dụng triết lý "Modern Vietnamese Heritage" - kết hợp tinh hoa truyền thống và sự tinh giản của kiến trúc đương đại.</p>
<p>Mọi chi tiết từ sàn gỗ óc chó nhập khẩu đến hệ thống chiếu sáng thông minh đều được tuyển chọn khắt khe nhằm tạo ra một không gian sống không chỉ đẹp mà còn mang lại cảm xúc trọn vẹn cho gia chủ.</p>
</div>
</div>
<div className="lg:col-span-4 lg:col-start-9 bg-surface-beige p-12 flex flex-col justify-center h-fit luxury-shadow">
<h3 className="font-label-lg text-label-lg text-secondary mb-10 uppercase tracking-widest">Thông tin dự án</h3>
<ul className="space-y-8">
<li className="flex items-center justify-between border-b border-outline-variant pb-4">
<span className="font-body-sm text-on-surface-variant">Diện tích</span>
<span className="font-headline-md text-primary">350m2</span>
</li>
<li className="flex items-center justify-between border-b border-outline-variant pb-4">
<span className="font-body-sm text-on-surface-variant">Thời gian thi công</span>
<span className="font-headline-md text-primary">08 tháng</span>
</li>
<li className="flex items-center justify-between border-b border-outline-variant pb-4">
<span className="font-body-sm text-on-surface-variant">Phong cách</span>
<span className="font-headline-md text-primary">Modern Minimalist</span>
</li>
</ul>
</div>
</ScrollReveal>

<ScrollReveal as="section" className="bg-surface-ivory py-section-gap overflow-hidden">
<div className="px-margin-desktop max-w-container-max mx-auto">
<div className="mb-16">
<div>
<h2 className="font-display-lg text-display-lg text-primary mb-4">Gallery Không Gian</h2>
<p className="text-on-surface-variant font-body-md">Hành trình trải nghiệm qua từng góc nhỏ của căn hộ.</p>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-12">
<div className="masonry-item space-y-12">
<div className="relative group overflow-hidden">
<img className="w-full aspect-[4/5] object-cover transition-transform duration-700 group-hover:scale-110" data-alt="A sleek, minimalist kitchen area with dark matte cabinetry, white marble countertops, and integrated high-end appliances. The lighting is focused and warm, highlighting the clean lines and premium textures. The scene is shot from a low angle to emphasize the height and professional finish of the cabinetry in a luxury light-mode interior." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDa1cPelFpOh9oxrCcui4QkxZiUhgEJf0l_2nSZYKTdiyctTMuVrBnKQIZKivLUnQgBh-abuZlTfMDRbSyOB94xOzEy1xfyxXl6Yh7LGVVkK6yAgujzagtN84ylo9Fj4KSPiyY8lw_t-ZqThJi3LM0GZ2lKf1Tb2ouHzkuOaKGz0wBCItTu872vi7g1J7ca__SpgJ8cnZ56eqcLagAmzSJZRniiorB5Me6pY9rcpy--2FJH2khAE_bnM_h4nO3NLWEXCRcnvkL18jQ"/>
<div className="absolute bottom-6 left-6 text-white opacity-0 group-hover:opacity-100 transition-opacity">
<span className="font-label-sm uppercase tracking-widest">Khu vực bếp</span>
</div>
</div>
<div className="relative group overflow-hidden">
<img className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-110" data-alt="A spacious master bedroom with a large king-sized bed featuring charcoal gray linens and textured pillows. The room has warm indirect lighting behind the headboard and a floor-to-ceiling window showcasing city lights at night. The design is minimal with a plush beige rug and elegant side tables, creating a serene and luxurious sanctuary." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFuedJDy3pyUu6-g_HXHugAehAV0Kh1HgfXlO8YJeTSkKKadomQlBx8CSPdTPORuwp5D9UrHP0d--srpbNyNXdiiT8IU1U00kzo2TuvtQ_B2ogCBTTRbZbkeJKXuPpT19hP1PoGlSXxYNCgIVmNVkIrVSn2eVieHHR6C1vH_KU6W9hdgKr0DFcEVfF4eEldyi9ZrCA1KoK3u1wau9pQM2E_Q_5u3fWPQnDrrd5PS-TfkHV1hMK7yDrd_ADbRtcRW8C83bacAqm9Vg"/>
<div className="absolute bottom-6 left-6 text-white opacity-0 group-hover:opacity-100 transition-opacity">
<span className="font-label-sm uppercase tracking-widest">Phòng ngủ Master</span>
</div>
</div>
</div>
<div className="masonry-item space-y-12">
<div className="relative group overflow-hidden">
<img className="w-full aspect-[3/4] object-cover transition-transform duration-700 group-hover:scale-110" data-alt="An expansive open-plan living area with a large L-shaped cream sofa, a minimalist low-profile coffee table, and a bespoke sculptural bookshelf against a warm beige wall. Soft daylight floods through large windows, creating a bright and airy atmosphere. The flooring is polished concrete with high-quality artistic rugs, blending modern luxury with residential comfort." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBE8G6Qojc4kkwVKMnzLr9isdDJZTeTaRarPYSqmTCO3dXbhsL5RJaeR5CYHDqiFSV79n_rDzvLF0SYeHkcSVKA5Svpdu-QfnqDVky-m-_QAVUExxHZWk1Paggoype9DbXtEGRWmQDsQvWZmOq2Yrum_gaoXtJFWivfeK0bBQrcgOWeVr6cUBpqmXImtWyMkhXLli6-RZRjErLeX7ZP-5Ba9BzbFQZPC3FcVdtzYoCsPUzfJj3XkzhF79qrI0TT02dfeovl9qfHlZY"/>
<div className="absolute bottom-6 left-6 text-white opacity-0 group-hover:opacity-100 transition-opacity">
<span className="font-label-sm uppercase tracking-widest">Phòng khách mở</span>
</div>
</div>
<div className="relative group overflow-hidden">
<img className="w-full aspect-[4/5] object-cover transition-transform duration-700 group-hover:scale-110" data-alt="A close-up of a high-end designer dining area with a heavy solid oak table and minimalist dining chairs in deep brown leather. Above the table hangs a contemporary artistic chandelier with a soft golden glow. The background features a subtle textured wall and a glimpse of the city view through sheer curtains, epitomizing modern heritage style." src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7cwtVldQj1EjlSVrVVQlclbRKJGRYSvRySUMggAQnBnbLIZKbAP_6VxqWh2rqRh6nRpsMy4N4aKI9TxmbT-M7SyQyqx57K3Tz0hHVdVfxdVLNLmnlK-pSJGrnSCiSjUTrNAX4y62Vo5Bapkajay3itm7PcuUguCbKQAVVbC26Eu-DIbpFvSGogCUbfNvqALvrQBuSAVVSkDB4nnXIJMTy3Z3Anwiok8IaKqK_azqVtlIaqGFnPFN-BhCiboWYDVwBcyL_WZIlx_c"/>
<div className="absolute bottom-6 left-6 text-white opacity-0 group-hover:opacity-100 transition-opacity">
<span className="font-label-sm uppercase tracking-widest">Không gian dùng bữa</span>
</div>
</div>
</div>
</div>
</div>
</ScrollReveal>




</>
);

export const ZenRetreatVillaDaLat = ({ project }) => (
<>

<section className="relative h-[870px] w-full overflow-hidden flex items-center">
<div className="absolute inset-0 z-0">
<img className="w-full h-full object-cover" data-alt="A breathtaking interior of a luxury Zen villa in Da Lat featuring floor-to-ceiling glass windows overlooking misty pine-covered mountains. The room is filled with warm, natural sunlight illuminating a minimalist sunken wooden seating area and polished concrete floors. Handcrafted oak furniture and local silk textiles create a harmonious blend of modern luxury and traditional Vietnamese warmth. The atmosphere is profoundly quiet and peaceful." src={project.image}/>
<div className="absolute inset-0 bg-black/20"></div>
</div>
<div className="relative z-10 w-full px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto text-white">
<div className="max-w-2xl">
<span className="inline-block py-1 px-3 bg-white/10 backdrop-blur-md rounded-full font-label-sm text-label-sm uppercase tracking-widest mb-6">Dự án Hoàn tất</span>
<h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-4">Zen Retreat Villa</h1>
<p className="font-headline-md text-headline-md opacity-90">Đà Lạt, Lâm Đồng</p>
</div>
</div>
</section>

<ScrollReveal as="section" className="py-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
<div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
<div className="md:col-span-7">
<h2 className="font-headline-lg text-headline-lg text-primary mb-8">Một ốc đảo thanh bình giữa lòng cao nguyên, nơi kiến trúc và thiên nhiên giao hòa.</h2>
<p className="font-body-lg text-body-lg text-on-surface-variant mb-6">
                        Zen Retreat Villa được thiết kế như một chốn trú ẩn tinh thần, tách biệt hoàn toàn khỏi sự ồn ào của đô thị. Dự án chú trọng vào việc sử dụng vật liệu bền vững như gỗ tái chế và đá tự nhiên, kết hợp cùng ánh sáng tự nhiên để tạo nên một không gian sống chậm, an lạc.
                    </p>
<p className="font-body-md text-body-md text-on-surface-variant">
                        Mỗi góc nhỏ trong ngôi nhà đều được chăm chút tỉ mỉ để tối ưu hóa tầm nhìn hướng núi, mang hơi thở của rừng thông len lỏi vào từng không gian sinh hoạt.
                    </p>
</div>
<div className="md:col-span-4 md:col-start-9 space-y-8 mt-12 md:mt-0 p-8 bg-surface-beige rounded-xl">
<div>
<p className="font-label-sm text-label-sm uppercase tracking-widest text-outline mb-1">Diện tích</p>
<p className="font-headline-md text-headline-md text-primary">280m2</p>
</div>
<div>
<p className="font-label-sm text-label-sm uppercase tracking-widest text-outline mb-1">Thời gian thực hiện</p>
<p className="font-headline-md text-headline-md text-primary">10 tháng</p>
</div>
<div>
<p className="font-label-sm text-label-sm uppercase tracking-widest text-outline mb-1">Phong cách thiết kế</p>
<p className="font-headline-md text-headline-md text-primary">Zen Modern</p>
</div>
</div>
</div>
</ScrollReveal>

<ScrollReveal as="section" className="pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
<div className="grid grid-cols-1 md:grid-cols-12 md:grid-rows-2 gap-4 h-auto md:h-[1200px]">

<div className="md:col-span-8 md:row-span-1 bento-item overflow-hidden bg-surface-beige rounded-2xl relative">
<img className="w-full h-full object-cover" data-alt="A serene master bedroom at Zen Retreat Villa with a low-profile Japanese-style platform bed made of light ash wood. The room features textured ivory walls and a large picture window showing a Zen garden with moss and smooth river stones. Soft, warm morning light creates long, peaceful shadows. The bedding is minimalist white linen, complemented by a single ceramic vase with a pine branch." src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0er9BtZKLPQ41yl_Pm3e5pAE1Mkk_TVHk9flFE_i-zoByf1jq1-L4W-uWn3r0e4_AxkFcnxvSygKmrhphgqRAW2B4QiRXjg1_nH6P8Cmr8x36AkgXyhyd8ziRiBn2on-OfZs3jrFNrDAwsUrXUT9MVWmeQY9dvaQuwq4vn-gpb1rOBa3wSkwx8SgbneYjLkW5RyAHu5Y50p6f6ZJz3u6YVYFucWtEIZa_B9O5VQomAdMVKy-RiYG54xhhky0xQDr6CXmsTZyLtU4"/>
<div className="absolute bottom-6 left-6 text-white bg-black/20 backdrop-blur-sm p-4 rounded-lg">
<h3 className="font-label-lg text-label-lg">Phòng ngủ chính - Tầm nhìn hướng rừng</h3>
</div>
</div>

<div className="md:col-span-4 md:row-span-2 bento-item overflow-hidden bg-surface-beige rounded-2xl relative">
<img className="w-full h-full object-cover" data-alt="An intimate reading nook with a built-in window seat crafted from warm teak wood. A stack of art books and a handcrafted ceramic tea set sit on a low table nearby. Thick, woven wool blankets and soft cushions in earth tones invite relaxation. Outside the window, a misty Da Lat pine forest provides a tranquil, monochromatic green backdrop. The lighting is soft and moody." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDP5q8SAJ2biU5GZSS7swuEzlCSbLrr3IEwENIilzFQK_B5U6DVNz6rqi7jkURdkbaEPfPt-Z9QvOykU6zRIMPe3QLGzXZ54G8sVJ6tRMzCOLpp3p2gNNXFh2k8nCs4IkSqM2y5MhWaSEkI3X6PGSnoOnK0Tx5AANX0sCUmQUJmxkxLvsrKxRmNDtBB6jcErChu8Eu3ST3n9u0UbRPYUbID9yP66LfhWccMp-8LJN5IJPQMUIu_lRpWLGE7ADdpIl96ARFZiol2mDQ"/>
<div className="absolute bottom-6 left-6 text-white bg-black/20 backdrop-blur-sm p-4 rounded-lg">
<h3 className="font-label-lg text-label-lg">Góc đọc sách &amp; Thiền định</h3>
</div>
</div>

<div className="md:col-span-4 md:row-span-1 bento-item overflow-hidden bg-surface-beige rounded-2xl relative">
<img className="w-full h-full object-cover" data-alt="A modern Zen bathroom featuring a deep Japanese soaking tub (ofuro) made of dark Hinoki wood. The walls are finished in a raw, tactile slate stone that glistens with moisture. Minimalist matte black fixtures and a small wooden stool complete the scene. A small skylight above the tub allows a direct view of the sky, letting in cool, filtered forest light." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZxpnl3WW22mkX2Q9yGHZ9Fx-pHGGHLB9IlA_RZVtHJFbyLoq3hQluQ3Jkk4QGX4QGnQ5CaJzewZryyknUiaT_KQYQlT9l7hDDbz84J-WYqMXkaKYl8mm52Ia9b50GDqpEf9R1V2cmaP6nHvJeFMT1mMUnRB6RbMAQNAfBcP0NOgRtlZixIla3Vwj4gKlnWXLp0jYF5hP-ev1W6sEPnh_m6RA2Mf1IllkyFDCum7SDEOvqSlrJB3x7-gIdl83LjP4Ha_tFB_nx2gY"/>
<div className="absolute bottom-6 left-6 text-white bg-black/20 backdrop-blur-sm p-4 rounded-lg">
<h3 className="font-label-lg text-label-lg">Phòng tắm Ofuro</h3>
</div>
</div>

<div className="md:col-span-4 md:row-span-1 bento-item overflow-hidden bg-surface-beige rounded-2xl relative">
<img className="w-full h-full object-cover" data-alt="A transition space featuring a traditional Zen rock garden (Karesansui) integrated into the interior hallway. White raked gravel, large dark granite boulders, and a single maple tree create a focal point under a dramatic architectural light well. The space is bounded by clean white walls and dark wood floor borders, embodying the 'Heritage Modernist' aesthetic with absolute clarity." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDiDlaJpcbabbxR-eSC0x0V4Kf4-sX8qBmUKwTeN0O2oqL85c8lGDYzd4vRSaOA85_ogBo-NcNPLW_sW9Ur1Gd1rwTBj0yG_YQ0WavnPTgf_0IPi4JG9GPosoQJSxX4HqU-Wn_78ZNowlC_DNaos4ndRbiBkwpmu_W4PyTnef1tarGT_aLLJU-CyqlZk-fyNQnEqCsh_Swd0Dte3RaztijKxW2d3jRBtl0FkcZLEVpE-SIXIItpf0ohepG09YQjl-DCzf6K0aWiHLk"/>
<div className="absolute bottom-6 left-6 text-white bg-black/20 backdrop-blur-sm p-4 rounded-lg">
<h3 className="font-label-lg text-label-lg">Sân vườn Zen trong nhà</h3>
</div>
</div>
</div>
</ScrollReveal>


</>
);

export const CreativeHubOffice = ({ project }) => (
<>

<section className="relative h-[870px] overflow-hidden">
<div className="absolute inset-0 hero-gradient z-10"></div>
<img alt="Creative Hub Office" className="w-full h-full object-cover" data-alt="A sprawling, high-end collaborative workspace in a Heritage Modernist style. The scene features large industrial windows letting in soft morning light, highlighting polished concrete floors and warm walnut wood ceiling slats. Modern ergonomic chairs in deep brown leather are clustered around a large minimalist communal table. The atmosphere is quiet, professional, and inspiring, with a palette of ivory, beige, and rich chocolate browns." src={project.image}/>
<div className="absolute bottom-0 left-0 w-full p-margin-desktop z-20 max-w-container-max mx-auto left-1/2 -translate-x-1/2">
<div className="max-w-2xl text-white">
<span className="font-label-lg text-label-lg tracking-[0.2em] uppercase opacity-90 mb-4 block">Dự án tiêu biểu</span>
<h1 className="font-display-lg text-display-lg md:text-[64px] mb-6 leading-tight">Creative Hub Office</h1>
<p className="font-body-lg text-body-lg opacity-80 max-w-lg">Một không gian làm việc truyền cảm hứng, cân bằng hoàn hảo giữa hiệu suất công việc và năng lượng sáng tạo.</p>
</div>
</div>
</section>

<ScrollReveal as="section" className="py-section-gap px-margin-desktop max-w-container-max mx-auto">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
<div className="lg:col-span-8">
<h2 className="font-headline-lg text-headline-lg mb-8 text-primary">Tầm nhìn thiết kế</h2>
<p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed mb-6">
                        Dự án Creative Hub Office được thiết kế dựa trên triết lý "Heritage Modernist" - nơi những giá trị di sản tinh tế gặp gỡ ngôn ngữ kiến trúc tối giản đương đại. Chúng tôi tập trung vào việc tạo ra những điểm chạm cảm xúc thông qua vật liệu tự nhiên như gỗ óc chó, đá cẩm thạch và kim loại mờ.
                    </p>
<p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                        Không gian không chỉ là nơi làm việc mà là một hệ sinh thái nuôi dưỡng sự sáng tạo, với các khu vực mở khuyến khích tương tác và những góc yên tĩnh để tập trung sâu. Ánh sáng được điều phối thông minh để giảm căng thẳng và tăng cường sự tập trung trong suốt 8 giờ làm việc.
                    </p>
</div>
<div className="lg:col-span-4 bg-surface-beige p-10 rounded-xl flex flex-col justify-center shadow-sm">
<h3 className="font-label-lg text-label-lg text-secondary mb-8 uppercase tracking-widest border-b border-outline-variant pb-2">Thông tin dự án</h3>
<div className="space-y-6">
<div>
<span className="block font-label-sm text-label-sm text-outline mb-1">Diện tích</span>
<span className="font-headline-md text-headline-md text-primary">600m2</span>
</div>
<div>
<span className="block font-label-sm text-label-sm text-outline mb-1">Thời gian thi công</span>
<span className="font-headline-md text-headline-md text-primary">6 Tháng</span>
</div>
<div>
<span className="block font-label-sm text-label-sm text-outline mb-1">Phong cách</span>
<span className="font-headline-md text-headline-md text-primary">Contemporary Office</span>
</div>
</div>
</div>
</div>
</ScrollReveal>

<ScrollReveal as="section" className="px-margin-desktop max-w-container-max mx-auto pb-section-gap">
<div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-gutter h-auto md:h-[1000px]">
<div className="md:col-span-2 md:row-span-2 overflow-hidden rounded-xl image-zoom-hover group">
<img alt="Phòng họp chính" className="w-full h-full object-cover transition-transform duration-700" data-alt="A luxurious minimalist meeting room within the Creative Hub Office. A long, seamless wooden conference table is surrounded by designer leather chairs. Floor-to-ceiling glass walls look out onto a modern city skyline. The interior is decorated with subtle Heritage Modernist accents, using a sophisticated warm color palette of beige, ivory, and deep browns, lit by architectural cove lighting." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxuF5wjhsQt_IxTYNOT7o8VYF_YgEtxMxuGbA3_k2M9YM4up64c4Z_mI71vA3vmRGa_bB1TvYKRNyuh6ruYHEst1r9jO9zJbZA3-gxP5wg5fRsDC994bR5gwQjq4AFSKy9Ed9L8OLRIwZ6Kk2fBjdkMw_dcSUnjxVm0UvmQOl5wqL-h9Qzo8_HWIAEhNsi4WrBJqk_r2dHa9JC3BZPma3Bjh9Lu1gGa2AH4TBuBH2SR1wnmRtHRtd6ZjvnK365mdXcmssog7rFh8I"/>
<div className="absolute bottom-6 left-6 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
<p className="font-label-lg text-label-lg uppercase tracking-wider">Phòng họp Executive</p>
</div>
</div>
<div className="md:col-span-2 md:row-span-1 overflow-hidden rounded-xl image-zoom-hover group relative">
<img alt="Khu vực làm việc mở" className="w-full h-full object-cover transition-transform duration-700" data-alt="A bright and airy open workspace featuring rows of minimalist desks. The floor is a light-colored wood, and the walls are a warm ivory. Large indoor plants add a touch of nature to the sophisticated professional environment. The layout is spacious and uncluttered, adhering to a Modern-Minimalist aesthetic with high-quality materials and soft ambient lighting." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQQTKoWLjdv1vVbJsDRqmqoLJ81k4cbZZeIQd04R-YvWtK9pqVholFOn6GofQnphh2C0xjm17gAo7KnH7SltK08g5kxXCEeHRXkwuwIY12Tw66P6aCb0ErpGCcxlDiGxi4d2E0SCmK-9mCq1TxZXHV9hR3jIoz24UCNkgpgYHXOq0N2NsXGmI4z_Z1liTxE_NxvcJZJxKVuPwPsqAINH53CN7hagQgbZLSt5iZy8MBtRCL3vw1p8w-0q0Vrt9TGTdKha7yDDWgNsU"/>
<div className="absolute bottom-6 left-6 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
<p className="font-label-lg text-label-lg uppercase tracking-wider">Không gian làm việc chung</p>
</div>
</div>
<div className="md:col-span-1 md:row-span-1 overflow-hidden rounded-xl image-zoom-hover group relative">
<img alt="Breakout area" className="w-full h-full object-cover transition-transform duration-700" data-alt="A cozy and stylish breakout area in a professional office. Placed in a quiet corner with soft, comfortable seating in terracotta and beige tones. A minimalist coffee table and a curated selection of art books are present. The lighting is warm and indirect, creating a serene and relaxed mood within a premium, handcrafted interior design." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJAbX5_9Qd8yzPTugupOhzxzqQ0DkyOtvGg3GisKriBoImx26LsDJqcfbfiglU_WGflA_Bvr5CD-IOJZEQ6CU5hzMjrN5va-2pwnoMlvETiF5sI_usN1OC5BFv7L2FoV_KUkELFeCetyxA8jsb2b8-MdofVnO8bQQB8tZxTAADcLnAWVi0w1Xr-om9GDSRmtvs7Q3A_easgilj_Th8zE6R5EaJJsd9yKXXBgXLHTZnTg_biLO8NMQ74YPLcajqm4tiOSjkJckjBCg"/>
<div className="absolute bottom-6 left-6 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
<p className="font-label-lg text-label-lg uppercase tracking-wider">Khu vực nghỉ ngơi</p>
</div>
</div>
<div className="md:col-span-1 md:row-span-1 overflow-hidden rounded-xl image-zoom-hover group relative">
<img alt="Work focus" className="w-full h-full object-cover transition-transform duration-700" data-alt="Close-up of a high-end minimalist office desk setup. Featuring a walnut wood desk surface, a premium leather desk mat, and a sleek modern desk lamp in muted gold. A large window in the background provides soft natural light. The aesthetic is clean and sophisticated, focusing on handcrafted details and high-quality textures." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDXeItj7PM0CwMYP-7bw4i3hYjZQSU1YV1rBcepiJN7ORSgK6V-HX8STPSzSAMEvH-xiNExjQ0vn4YdLLhFEsMUdvN1ZUZoGUzvSQe6acIEntfbtFMtZ5-eCm5C1X7uGmi93c3u9zKR5wRIe5Rd2ckvpRS95L5PNSpwj8UNv-RH-DL9794KvCF44Y2M_iKs5qRqrzCZ3KzvnfajhyOAzrxTt323exPVvd7k7tH4AiB0ViEB_0sZnAosMq1EYQuEusCmgu023Zd3to"/>
<div className="absolute bottom-6 left-6 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
<p className="font-label-lg text-label-lg uppercase tracking-wider">Góc tập trung</p>
</div>
</div>
</div>
</ScrollReveal>


</>
);

export const projectComponents = {
  "modern-penthouse-skyline": ModernPenthouseSkyline,
  "zen-retreat-villa-da-lat": ZenRetreatVillaDaLat,
  "creative-hub-office": CreativeHubOffice,
};
