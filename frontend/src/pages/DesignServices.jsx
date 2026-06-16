import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import ScrollReveal from '../components/common/ScrollReveal';

export default function DesignServices() {
  const location = useLocation();

  const [offsetY, setOffsetY] = React.useState(0);

  const consultationRef = useRef(null);

  useEffect(() => {
    if (window.location.hash === '#consultation') {
      const timer = setTimeout(() => {
        const target = consultationRef.current || document.getElementById('consultation');
        target?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setOffsetY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToConsultation = (e) => {
    e?.preventDefault?.();
    const target = consultationRef.current || document.getElementById('consultation');
    if (target) {
      window.history.replaceState(null, '', '/design-service#consultation');
      requestAnimationFrame(() => {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      });
    } else {
      window.location.href = '/design-service#consultation';
    }
  };

  const handleConsultationSubmit = (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "Cảm ơn bạn. Chúng tôi sẽ liên hệ trong thời gian sớm nhất." } }));
    e.target.reset();
  };

  return (
    <div className="bg-background text-on-surface font-body-md overflow-x-hidden min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* Hero Section: Bespoke Interior Solutions */}
        <section className="relative h-[870px] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              className="w-full h-full object-cover" 
              alt="Bespoke Interior"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFlWAg5EoCzMM6yT5PPPPzBf2qDoD3AzZmkFtOK995d5HDgwktLuieW6DX_fBqZOrqh_L0Ac1ThEnBdbnsZHRiSyUmxWTN5vly9PX46JWyBV7Y-WD8LRZpCfHOSJta_CkozjioPQbu7uwbi2Cu2gHh_Efa5zOiUbvDRQwM8hoyx5jkXjc7QxRfAsw5yVwWJhN8ShbjpVSBARLmF4qCcH31ggv4wgS4l6qBEw2s3h7cEbQlAE3oTQYQXvGY7o1AUWq0HtM4qcM2PBo"
              style={{ transform: `translateY(${Math.min(offsetY * 0.05, 20)}px)` }}
            />
            <div className="absolute inset-0 bg-black/30"></div>
          </div>
          <ScrollReveal className="relative z-10 px-margin-desktop max-w-container-max mx-auto w-full">
            <div className="max-w-2xl text-white">
              <span className="font-label-lg text-label-lg uppercase tracking-[0.2em] text-accent-gold mb-4 block">Kiến Tạo Di Sản</span>
              <h1 className="font-display-lg text-display-lg md:text-[64px] mb-6 leading-tight">Giải pháp nội thất độc bản</h1>
              <p className="font-body-lg text-body-lg mb-10 opacity-90 leading-relaxed">Chúng tôi kết hợp tinh hoa thủ công Việt Nam với phong cách tối giản đương đại để tạo nên những không gian kể câu chuyện riêng của bạn. Mỗi chi tiết đều được trau chuốt, mỗi chất liệu đều được lựa chọn từ tâm hồn.</p>
              <div className="flex gap-4">
                <button onClick={scrollToConsultation} className="bg-primary text-on-primary px-10 py-4 font-label-lg text-label-lg hover:bg-primary-container transition-all">KHỞI ĐẦU HÀNH TRÌNH</button>
                <Link to="/featured-projects" className="border border-white text-white px-10 py-4 font-label-lg text-label-lg hover:bg-white hover:text-primary transition-all flex items-center justify-center">XEM DỰ ÁN</Link>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Our Process Section */}
        <section className="py-section-gap px-margin-desktop max-w-container-max mx-auto">
          <ScrollReveal className="text-center mb-20">
            <h2 className="font-headline-lg text-headline-lg text-primary mb-4">Quy trình làm việc</h2>
            <div className="w-24 h-1 bg-accent-gold mx-auto"></div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter relative">
            {/* Step 1 */}
            <ScrollReveal delay={100} className="group">
              <div className="relative mb-8 overflow-hidden aspect-[3/4] bg-surface-beige">
                <img 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100" 
                  alt="Tư vấn"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQvEHW2-y3C6ykTMAKquQr4F9oqNrto8D6C4BdUivPogoDesUsguPcAqc6J4but-Epy3kdzjpDsMWFJDxigp4i4LZUWoZOc9P7pr6malvgaznw9hNx9IxfTSbmkyMtZhlIlc4P4L83kAOs5ceh3gJk9shxybWN-9HLqUlfuIgwLaIVYVPNLuZ2tSvut0hTqv-yzh1qOTLqRY97QRyNdeVk56d1CcXDCmOoZ4ckUb5Sq1TNRoBo76ncGKi1j5hBOjRlHXHSJb5yjzo"
                />
                <div className="absolute top-4 left-4 w-12 h-12 bg-primary text-on-primary flex items-center justify-center font-display-lg text-headline-md">01</div>
              </div>
              <h3 className="font-headline-md text-headline-md text-primary mb-2">Tư vấn</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">Trao đổi sâu sắc về lối sống, sở thích thẩm mỹ và tầm nhìn cho không gian sống của bạn.</p>
            </ScrollReveal>
            {/* Step 2 */}
            <ScrollReveal delay={200} className="group">
              <div className="relative mb-8 overflow-hidden aspect-[3/4] bg-surface-beige">
                <img 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100" 
                  alt="Ý tưởng"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwxSKNSZbkVUK3u1hQ_MmTWsNwVG4jzBAIDZhEuZCj7vU2cnPm4rxRs-5cOmB7JbxPKmIbh4Ps5OQPVLFRh_Yd4qU-49BANKDt2DFWUUfyFoBMFrA9VBxH2E1v4l3gMWqDjqJpEqARZgR05LxPbtYAhIMu5_YRsNE5BQAuu9VSuhzcIAgCq_HuahtUzOXZlbsUek9z1UVI5glToiLxAzXIiYkxA228JnoECviokJkjv3CMGHGfaxr5-zkyifF6II2ekYF3MdnXRK0"
                />
                <div className="absolute top-4 left-4 w-12 h-12 bg-primary text-on-primary flex items-center justify-center font-display-lg text-headline-md">02</div>
              </div>
              <h3 className="font-headline-md text-headline-md text-primary mb-2">Ý tưởng</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">Chúng tôi chuyển hóa mong ước thành ngôn ngữ thiết kế nhất quán, lựa chọn bảng màu và vật liệu phù hợp.</p>
            </ScrollReveal>
            {/* Step 3 */}
            <ScrollReveal delay={300} className="group">
              <div className="relative mb-8 overflow-hidden aspect-[3/4] bg-surface-beige">
                <img 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100" 
                  alt="Thiết kế 3D"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-5MgKDgOb0E5G6USJ9_i8kXhDDG92PfLBNWAN5ad7TXJ8S6xvkKRYbpGpJoZg-D2JUedZSisxSWvOvcnSDRBHwLjqaiznKhrC9c04KuJ-_j5Fx7SG3LgYWtSx9cmyiVSO50T84mpJfqUSn36AV9GXfNgCYeONDqR3sYJByhKsBhAkhoYki1hv0UPaLqQk31TU0SwOBlw_PM-XRYYrz9dr8j_8igTxcEIa6OvzrqkxNdWZFGDPLqtgMeSjVjrBVYoXK0A64lJ2nrg"
                />
                <div className="absolute top-4 left-4 w-12 h-12 bg-primary text-on-primary flex items-center justify-center font-display-lg text-headline-md">03</div>
              </div>
              <h3 className="font-headline-md text-headline-md text-primary mb-2">Thiết kế 3D</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">Trải nghiệm ngôi nhà tương lai qua các bản phối cảnh 3D siêu thực và hồ sơ kỹ thuật chi tiết.</p>
            </ScrollReveal>
            {/* Step 4 */}
            <ScrollReveal delay={400} className="group">
              <div className="relative mb-8 overflow-hidden aspect-[3/4] bg-surface-beige">
                <img 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100" 
                  alt="Thi công"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfZNiMNNu_Q_hdsmb8CAWv_99Z1DlsiPbUIpRih6kj0CtHS04VG31Q0lZiLXzwOrp9NeD9wW4ts1_rvFIFnNlAjSM4rpwb3lEPUg6pANQprlCmfnVP84S5amEz6DJzSEA8FrR_zJfujQ1wnYb-UgVrnXE2v2fP5uEBzcWqWamzzFQXiN9l2rOjWeGLzduKjlOvtSFNgxBaVlgRNVSeQWso0eL4-uYarqToDl6hmylNWBb1DNUgsPPqHJOxkmErtgI6VEzNu2RVt9M"
                />
                <div className="absolute top-4 left-4 w-12 h-12 bg-primary text-on-primary flex items-center justify-center font-display-lg text-headline-md">04</div>
              </div>
              <h3 className="font-headline-md text-headline-md text-primary mb-2">Thi công</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">Đội ngũ nghệ nhân bậc thầy và quản lý dự án hiện thực hóa thiết kế với sự tỉ mỉ tuyệt đối.</p>
            </ScrollReveal>
          </div>
        </section>

        {/* Service Tiers Section */}
        <section className="bg-[#FAF8F4] py-20 lg:py-32">
          <ScrollReveal className="px-6 md:px-12 lg:px-24 max-w-[1440px] mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-24">
              <h2 className="font-headline-lg text-4xl lg:text-5xl text-primary mb-6">CHỌN GÓI THIẾT KẾ PHÙ HỢP</h2>
              <p className="text-lg text-neutral-600 leading-relaxed">Từ căn hộ hiện đại đến biệt thự cao cấp, chúng tôi cung cấp các giải pháp thiết kế phù hợp với nhu cầu và ngân sách của từng khách hàng.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
              {/* Standard Tier */}
              <ScrollReveal delay={100} className="bg-white border border-[#E7E0D6] rounded-2xl shadow-sm hover:-translate-y-2 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full">
                <div className="h-56 overflow-hidden">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQvEHW2-y3C6ykTMAKquQr4F9oqNrto8D6C4BdUivPogoDesUsguPcAqc6J4but-Epy3kdzjpDsMWFJDxigp4i4LZUWoZOc9P7pr6malvgaznw9hNx9IxfTSbmkyMtZhlIlc4P4L83kAOs5ceh3gJk9shxybWN-9HLqUlfuIgwLaIVYVPNLuZ2tSvut0hTqv-yzh1qOTLqRY97QRyNdeVk56d1CcXDCmOoZ4ckUb5Sq1TNRoBo76ncGKi1j5hBOjRlHXHSJb5yjzo" alt="Tiêu chuẩn" className="w-full h-full object-cover" />
                </div>
                <div className="p-8 flex flex-col flex-grow">
                  <span className="uppercase tracking-[0.2em] font-bold text-accent-gold text-xs mb-3 block">CẤP ĐỘ 01</span>
                  <h3 className="text-4xl font-light text-primary mb-4">Tiêu chuẩn</h3>
                  <p className="text-neutral-600 mb-8 min-h-[48px]">Phù hợp cho căn hộ nhỏ và không gian sống hiện đại.</p>
                  
                  <ul className="space-y-4 mb-8 flex-grow">
                    <li className="flex items-start gap-3">
                      <span className="text-accent-gold font-bold">✓</span>
                      <span className="text-neutral-700">Thiết kế 1 không gian</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent-gold font-bold">✓</span>
                      <span className="text-neutral-700">Moodboard vật liệu</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent-gold font-bold">✓</span>
                      <span className="text-neutral-700">Mặt bằng bố trí nội thất</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent-gold font-bold">✓</span>
                      <span className="text-neutral-700">Danh sách mua sắm đề xuất</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent-gold font-bold">✓</span>
                      <span className="text-neutral-700">02 lần chỉnh sửa</span>
                    </li>
                  </ul>

                  <div className="border-t border-[#E7E0D6] pt-6 mb-8 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Diện tích phù hợp:</span>
                      <span className="text-primary font-medium">30m² - 80m²</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Thời gian triển khai:</span>
                      <span className="text-primary font-medium">7 - 14 ngày</span>
                    </div>
                  </div>

                  <button onClick={scrollToConsultation} className="w-full py-4 bg-accent-gold text-white font-label-lg hover:bg-yellow-600 transition-colors rounded-lg">NHẬN TƯ VẤN</button>
                </div>
              </ScrollReveal>

              {/* Premium Tier */}
              <ScrollReveal delay={200} className="bg-white border-2 border-accent-gold rounded-2xl shadow-md hover:-translate-y-2 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full relative">
                <div className="absolute top-4 right-4 bg-accent-gold text-white px-4 py-1 rounded-full font-label-sm text-xs uppercase tracking-widest z-10">Phổ biến nhất</div>
                <div className="h-56 overflow-hidden">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwxSKNSZbkVUK3u1hQ_MmTWsNwVG4jzBAIDZhEuZCj7vU2cnPm4rxRs-5cOmB7JbxPKmIbh4Ps5OQPVLFRh_Yd4qU-49BANKDt2DFWUUfyFoBMFrA9VBxH2E1v4l3gMWqDjqJpEqARZgR05LxPbtYAhIMu5_YRsNE5BQAuu9VSuhzcIAgCq_HuahtUzOXZlbsUek9z1UVI5glToiLxAzXIiYkxA228JnoECviokJkjv3CMGHGfaxr5-zkyifF6II2ekYF3MdnXRK0" alt="Cao cấp" className="w-full h-full object-cover" />
                </div>
                <div className="p-8 flex flex-col flex-grow">
                  <span className="uppercase tracking-[0.2em] font-bold text-accent-gold text-xs mb-3 block">CẤP ĐỘ 02</span>
                  <h3 className="text-4xl font-light text-primary mb-4">Cao cấp</h3>
                  <p className="text-neutral-600 mb-8 min-h-[48px]">Giải pháp thiết kế toàn diện cho căn hộ và nhà phố.</p>
                  
                  <ul className="space-y-4 mb-8 flex-grow">
                    <li className="flex items-start gap-3">
                      <span className="text-accent-gold font-bold">✓</span>
                      <span className="text-neutral-700">Thiết kế toàn bộ công trình</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent-gold font-bold">✓</span>
                      <span className="text-neutral-700">Phối cảnh 3D</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent-gold font-bold">✓</span>
                      <span className="text-neutral-700">Hồ sơ kỹ thuật thi công</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent-gold font-bold">✓</span>
                      <span className="text-neutral-700">Nội thất đóng theo yêu cầu</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent-gold font-bold">✓</span>
                      <span className="text-neutral-700">Giám sát tác giả</span>
                    </li>
                  </ul>

                  <div className="border-t border-[#E7E0D6] pt-6 mb-8 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Diện tích phù hợp:</span>
                      <span className="text-primary font-medium">80m² - 250m²</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Thời gian triển khai:</span>
                      <span className="text-primary font-medium">15 - 30 ngày</span>
                    </div>
                  </div>

                  <button onClick={scrollToConsultation} className="w-full py-4 bg-accent-gold text-white font-label-lg hover:bg-yellow-600 transition-colors rounded-lg">NHẬN TƯ VẤN</button>
                </div>
              </ScrollReveal>

              {/* Luxury Tier */}
              <ScrollReveal delay={300} className="bg-white border border-[#E7E0D6] rounded-2xl shadow-sm hover:-translate-y-2 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full md:col-span-2 lg:col-span-1">
                <div className="h-56 overflow-hidden">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-5MgKDgOb0E5G6USJ9_i8kXhDDG92PfLBNWAN5ad7TXJ8S6xvkKRYbpGpJoZg-D2JUedZSisxSWvOvcnSDRBHwLjqaiznKhrC9c04KuJ-_j5Fx7SG3LgYWtSx9cmyiVSO50T84mpJfqUSn36AV9GXfNgCYeONDqR3sYJByhKsBhAkhoYki1hv0UPaLqQk31TU0SwOBlw_PM-XRYYrz9dr8j_8igTxcEIa6OvzrqkxNdWZFGDPLqtgMeSjVjrBVYoXK0A64lJ2nrg" alt="Sang trọng" className="w-full h-full object-cover" />
                </div>
                <div className="p-8 flex flex-col flex-grow">
                  <span className="uppercase tracking-[0.2em] font-bold text-accent-gold text-xs mb-3 block">CẤP ĐỘ 03</span>
                  <h3 className="text-4xl font-light text-primary mb-4">Sang trọng</h3>
                  <p className="text-neutral-600 mb-8 min-h-[48px]">Dành cho biệt thự, penthouse và các dự án cao cấp.</p>
                  
                  <ul className="space-y-4 mb-8 flex-grow">
                    <li className="flex items-start gap-3">
                      <span className="text-accent-gold font-bold">✓</span>
                      <span className="text-neutral-700">Thiết kế tổng thể</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent-gold font-bold">✓</span>
                      <span className="text-neutral-700">Thiết kế cảnh quan</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent-gold font-bold">✓</span>
                      <span className="text-neutral-700">Tuyển chọn vật liệu cao cấp</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent-gold font-bold">✓</span>
                      <span className="text-neutral-700">Thiết kế nội thất bespoke</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent-gold font-bold">✓</span>
                      <span className="text-neutral-700">Bảo trì và hỗ trợ dài hạn</span>
                    </li>
                  </ul>

                  <div className="border-t border-[#E7E0D6] pt-6 mb-8 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Diện tích phù hợp:</span>
                      <span className="text-primary font-medium">250m²+</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Thời gian triển khai:</span>
                      <span className="text-primary font-medium">30 - 60 ngày</span>
                    </div>
                  </div>

                  <button onClick={scrollToConsultation} className="w-full py-4 bg-accent-gold text-white font-label-lg hover:bg-yellow-600 transition-colors rounded-lg">NHẬN TƯ VẤN</button>
                </div>
              </ScrollReveal>
            </div>
          </ScrollReveal>
        </section>

        {/* Booking Section */}
        <div id="consultation" ref={consultationRef}>
          <ScrollReveal as="section" className="py-section-gap px-margin-desktop max-w-container-max mx-auto overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
              <div className="lg:col-span-5 mb-12 lg:mb-0">
                <h2 className="font-display-lg text-display-lg text-primary mb-8">BẮT ĐẦU DỰ ÁN CỦA BẠN</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant mb-10">Để lại thông tin, đội ngũ thiết kế sẽ liên hệ tư vấn trong thời gian sớm nhất.</p>
                <div className="space-y-8">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-full bg-surface-beige flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined" data-icon="call">call</span>
                    </div>
                    <div>
                      <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Hotline</p>
                      <p className="font-headline-md text-headline-md text-primary">+84 (0) 24 3456 789</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-full bg-surface-beige flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined" data-icon="location_on">location_on</span>
                    </div>
                    <div>
                      <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Studio Chính</p>
                      <p className="font-body-md text-body-md">Quận 1, TP. Hồ Chí Minh, VN</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-start-7 lg:col-span-6 bg-white p-12 shadow-xl rounded-xl">
                <form onSubmit={handleConsultationSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-label-lg text-label-lg text-primary mb-2">Họ &amp; Tên *</label>
                      <input required className="w-full bg-transparent border-0 border-b border-outline focus:border-accent-gold focus:ring-0 px-0 py-2 transition-all font-body-md" placeholder="Nguyễn Văn A" type="text"/>
                    </div>
                    <div>
                      <label className="block font-label-lg text-label-lg text-primary mb-2">Số điện thoại *</label>
                      <input required className="w-full bg-transparent border-0 border-b border-outline focus:border-accent-gold focus:ring-0 px-0 py-2 transition-all font-body-md" placeholder="090 000 0000" type="tel"/>
                    </div>
                  </div>
                  <div>
                    <label className="block font-label-lg text-label-lg text-primary mb-2">Email</label>
                    <input className="w-full bg-transparent border-0 border-b border-outline focus:border-accent-gold focus:ring-0 px-0 py-2 transition-all font-body-md" placeholder="example@email.com" type="email"/>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-label-lg text-label-lg text-primary mb-2">Loại công trình</label>
                      <select className="w-full bg-transparent border-0 border-b border-outline focus:border-accent-gold focus:ring-0 px-0 py-2 transition-all font-body-md appearance-none bg-no-repeat bg-right" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23666\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundSize: '16px'}}>
                        <option>Căn hộ</option>
                        <option>Nhà phố</option>
                        <option>Biệt thự</option>
                        <option>Văn phòng</option>
                        <option>Showroom</option>
                        <option>Khác</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-label-lg text-label-lg text-primary mb-2">Ngân sách dự kiến</label>
                      <select className="w-full bg-transparent border-0 border-b border-outline focus:border-accent-gold focus:ring-0 px-0 py-2 transition-all font-body-md appearance-none bg-no-repeat bg-right" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23666\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundSize: '16px'}}>
                        <option>Dưới 100 triệu</option>
                        <option>100 - 300 triệu</option>
                        <option>300 - 500 triệu</option>
                        <option>500 triệu - 1 tỷ</option>
                        <option>Trên 1 tỷ</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-label-lg text-label-lg text-primary mb-2">Nội dung yêu cầu</label>
                    <textarea className="w-full bg-transparent border-0 border-b border-outline focus:border-accent-gold focus:ring-0 px-0 py-2 transition-all font-body-md resize-none" placeholder="Hãy mô tả ngắn gọn về yêu cầu thiết kế của bạn..." rows="4"></textarea>
                  </div>
                  <button className="w-full bg-accent-gold text-white py-5 font-label-lg text-label-lg uppercase tracking-widest hover:bg-yellow-600 transition-all rounded-lg shadow-sm hover:shadow-md" type="submit">GỬI YÊU CẦU TƯ VẤN</button>
                </form>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </main>
      <Footer />
    </div>
  );
}