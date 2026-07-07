import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import ScrollReveal from '../components/common/ScrollReveal';
import { consultationRequestService } from '../services/api/consultationRequestService';

const heroImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFlWAg5EoCzMM6yT5PPPPzBf2qDoD3AzZmkFtOK995d5HDgwktLuieW6DX_fBqZOrqh_L0Ac1ThEnBdbnsZHRiSyUmxWTN5vly9PX46JWyBV7Y-WD8LRZpCfHOSJta_CkozjioPQbu7uwbi2Cu2gHh_Efa5zOiUbvDRQwM8hoyx5jkXjc7QxRfAsw5yVwWJhN8ShbjpVSBARLmF4qCcH31ggv4wgS4l6qBEw2s3h7cEbQlAE3oTQYQXvGY7o1AUWq0HtM4qcM2PBo';
const stepImages = [
  heroImage,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAwxSKNSZbkVUK3u1hQ_MmTWsNwVG4jzBAIDZhEuZCj7vU2cnPm4rxRs-5cOmB7JbxPKmIbh4Ps5OQPVLFRh_Yd4qU-49BANKDt2DFWUUfyFoBMFrA9VBxH2E1v4l3gMWqDjqJpEqARZgR05LxPbtYAhIMu5_YRsNE5BQAuu9VSuhzcIAgCq_HuahtUzOXZlbsUek9z1UVI5glToiLxAzXIiYkxA228JnoECviokJkjv3CMGHGfaxr5-zkyifF6II2ekYF3MdnXRK0',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC-5MgKDgOb0E5G6USJ9_i8kXhDDG92PfLBNWAN5ad7TXJ8S6xvkKRYbpGpJoZg-D2JUedZSisxSWvOvcnSDRBHwLjqaiznKhrC9c04KuJ-_j5Fx7SG3LgYWtSx9cmyiVSO50T84mpJfqUSn36AV9GXfNgCYeONDqR3sYJByhKsBhAkhoYki1hv0UPaLqQk31TU0SwOBlw_PM-XRYYrz9dr8j_8igTxcEIa6OvzrqkxNdWZFGDPLqtgMeSjVjrBVYoXK0A64lJ2nrg',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAfZNiMNNu_Q_hdsmb8CAWv_99Z1DlsiPbUIpRih6kj0CtHS04VG31Q0lZiLXzwOrp9NeD9wW4ts1_rvFIFnNlAjSM4rpwb3lEPUg6pANQprlCmfnVP84S5amEz6DJzSEA8FrR_zJfujQ1wnYb-UgVrnXE2v2fP5uEBzcWqWamzzFQXiN9l2rOjWeGLzduKjlOvtSFNgxBaVlgRNVSeQWso0eL4-uYarqToDl6hmylNWBb1DNUgsPPqHJOxkmErtgI6VEzNu2RVt9M'
];

const processSteps = [
  { title: 'Tư vấn', text: 'Trao đổi sâu về lối sống, sở thích thẩm mỹ và tầm nhìn cho không gian sống của bạn.' },
  { title: 'Ý tưởng', text: 'Chuyển nhu cầu thành ngôn ngữ thiết kế nhất quán, bảng màu và vật liệu phù hợp.' },
  { title: 'Thiết kế 3D', text: 'Trải nghiệm không gian tương lai qua phối cảnh 3D và hồ sơ kỹ thuật chi tiết.' },
  { title: 'Thi công', text: 'Đội ngũ thi công và quản lý dự án hiện thực hóa thiết kế với sự tỉ mỉ cần thiết.' }
];

const serviceTiers = [
  { level: 'Cấp độ 01', title: 'Tiêu chuẩn', image: stepImages[0], desc: 'Phù hợp cho căn hộ nhỏ và không gian sống hiện đại.', features: ['Thiết kế 1 không gian', 'Moodboard vật liệu', 'Mặt bằng bố trí nội thất', 'Danh sách mua sắm đề xuất', '02 lần chỉnh sửa'], area: '30m² - 80m²', time: '7 - 14 ngày' },
  { level: 'Cấp độ 02', title: 'Cao cấp', image: stepImages[1], desc: 'Giải pháp thiết kế toàn diện cho căn hộ và nhà phố.', features: ['Thiết kế toàn bộ công trình', 'Phối cảnh 3D', 'Hồ sơ kỹ thuật thi công', 'Nội thất đóng theo yêu cầu', 'Giám sát tác giả'], area: '80m² - 250m²', time: '15 - 30 ngày', featured: true },
  { level: 'Cấp độ 03', title: 'Sang trọng', image: stepImages[2], desc: 'Dành cho biệt thự, penthouse và các dự án cao cấp.', features: ['Thiết kế tổng thể', 'Thiết kế cảnh quan', 'Tuyển chọn vật liệu cao cấp', 'Thiết kế nội thất bespoke', 'Bảo trì và hỗ trợ dài hạn'], area: '250m²+', time: '30 - 60 ngày' }
];

export default function DesignServices() {
  const [consultationSubmitting, setConsultationSubmitting] = React.useState(false);
  const [consultationError, setConsultationError] = React.useState('');
  const [consultationSuccess, setConsultationSuccess] = React.useState('');
  const consultationRef = useRef(null);

  useEffect(() => {
    if (window.location.hash === '#consultation') {
      const timer = setTimeout(() => {
        const target = consultationRef.current || document.getElementById('consultation');
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  const scrollToConsultation = (e) => {
    e?.preventDefault?.();
    const target = consultationRef.current || document.getElementById('consultation');
    if (target) {
      window.history.replaceState(null, '', '/design-service#consultation');
      requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } else {
      window.location.href = '/design-service#consultation';
    }
  };

  const handleConsultationSubmit = async (e) => {
    e.preventDefault();
    setConsultationError('');
    setConsultationSuccess('');

    const form = e.currentTarget;
    const formData = new FormData(form);
    const fullName = (formData.get('fullName') || '').toString().trim();
    const phone = (formData.get('phone') || '').toString().trim();
    const email = (formData.get('email') || '').toString().trim();
    const message = (formData.get('message') || '').toString().trim();
    const website = (formData.get('website') || '').toString().trim();

    if (!fullName) { setConsultationError('Vui lòng nhập họ và tên.'); return; }
    if (!phone) { setConsultationError('Vui lòng nhập số điện thoại.'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setConsultationError('Email không đúng định dạng.'); return; }
    if (!message) { setConsultationError('Vui lòng mô tả nhu cầu tư vấn.'); return; }

    const payload = {
      fullName,
      phone,
      email: email || undefined,
      projectType: (formData.get('projectType') || '').toString().trim() || undefined,
      budgetRange: (formData.get('budgetRange') || '').toString().trim() || undefined,
      message,
      source: 'design_service',
      website: website || undefined
    };

    try {
      setConsultationSubmitting(true);
      const response = await consultationRequestService.createConsultationRequest(payload);
      const requestCode = response?.request?.requestCode;
      const successMessage = requestCode ? `Cảm ơn bạn. Mã yêu cầu tư vấn của bạn là ${requestCode}.` : 'Cảm ơn bạn. Chúng tôi sẽ liên hệ trong thời gian sớm nhất.';
      setConsultationSuccess(successMessage);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: successMessage, type: 'success' } }));
      form.reset();
    } catch (error) {
      setConsultationError(error.message || 'Không thể gửi yêu cầu tư vấn. Vui lòng thử lại sau.');
    } finally {
      setConsultationSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#f7f7f5] text-[#333333]">
      <Header />
      <main className="flex-grow">
        <section className="relative overflow-hidden bg-white">
          <div className="mx-auto grid min-h-[680px] w-full max-w-[1200px] items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.68fr)] lg:px-8 lg:py-20">
            <ScrollReveal className="max-w-2xl">
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#777777]">Dịch vụ tư vấn thiết kế</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-[#333333] md:text-6xl">Giải pháp nội thất được đo theo cách bạn sống</h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[#666666]">Chúng tôi kết hợp tư vấn không gian, lựa chọn vật liệu và sản phẩm thật để tạo nên phương án nội thất rõ ràng, dễ triển khai.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button onClick={scrollToConsultation} className="ui-button-primary px-6 py-3 text-sm">Bắt đầu tư vấn</button>
                <Link to="/featured-projects" className="ui-button-secondary inline-flex items-center justify-center px-6 py-3 text-sm">Xem dự án</Link>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={120} className="relative hidden overflow-hidden rounded-[14px] border border-[#e5e5e5] bg-[#fafaf8] lg:block">
              <img className="h-[520px] w-full object-cover" alt="Không gian nội thất tư vấn" src={heroImage} />
            </ScrollReveal>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <ScrollReveal className="mb-10 max-w-2xl">
            <h2 className="text-3xl font-bold text-[#333333]">Quy trình làm việc</h2>
            <p className="mt-3 text-sm leading-6 text-[#777777]">Từng bước được giữ gọn để bạn dễ theo dõi, từ trao đổi ban đầu đến phương án triển khai.</p>
          </ScrollReveal>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {processSteps.map((step, index) => (
              <ScrollReveal key={step.title} delay={(index + 1) * 80} className="group">
                <article className="h-full rounded-[12px] border border-[#e5e5e5] bg-white p-4 transition-colors hover:border-[#bfa37c]">
                  <div className="aspect-[4/5] overflow-hidden rounded-[10px] bg-[#f3f3f1]">
                    <img src={stepImages[index]} alt={step.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <div className="pt-5">
                    <span className="text-xs font-bold text-[#bfa37c]">{String(index + 1).padStart(2, '0')}</span>
                    <h3 className="mt-2 text-lg font-bold text-[#333333]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#777777]">{step.text}</p>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section className="bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <ScrollReveal className="mx-auto mb-10 max-w-3xl text-center">
              <h2 className="text-3xl font-bold text-[#333333] md:text-4xl">Chọn gói thiết kế phù hợp</h2>
              <p className="mt-3 text-sm leading-6 text-[#777777]">Từ căn hộ hiện đại đến biệt thự cao cấp, mỗi gói giúp bạn bắt đầu cuộc trao đổi với phạm vi rõ hơn.</p>
            </ScrollReveal>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {serviceTiers.map((tier, index) => (
                <ScrollReveal key={tier.title} delay={(index + 1) * 100} className="h-full">
                  <article className={`relative flex h-full flex-col overflow-hidden rounded-[12px] border bg-white ${tier.featured ? 'border-[#bfa37c]' : 'border-[#e5e5e5]'}`}>
                    {tier.featured && <span className="absolute right-4 top-4 z-10 rounded-[6px] bg-[#333333] px-3 py-1 text-xs font-bold text-white">Phổ biến</span>}
                    <div className="h-48 overflow-hidden bg-[#f3f3f1]"><img src={tier.image} alt={tier.title} className="h-full w-full object-cover" /></div>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#777777]">{tier.level}</p>
                      <h3 className="mt-2 text-2xl font-bold text-[#333333]">{tier.title}</h3>
                      <p className="mt-2 min-h-[48px] text-sm leading-6 text-[#777777]">{tier.desc}</p>
                      <ul className="mt-5 flex-1 space-y-3">
                        {tier.features.map(feature => <li key={feature} className="flex gap-2 text-sm text-[#555555]"><span className="text-[#bfa37c]">✓</span><span>{feature}</span></li>)}
                      </ul>
                      <div className="mt-5 space-y-2 border-t border-[#eeeeee] pt-4 text-sm">
                        <div className="flex justify-between gap-4"><span className="text-[#777777]">Diện tích</span><span className="font-semibold text-[#333333]">{tier.area}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-[#777777]">Thời gian</span><span className="font-semibold text-[#333333]">{tier.time}</span></div>
                      </div>
                      <button onClick={scrollToConsultation} className="ui-button-primary mt-5 w-full py-3 text-sm">Nhận tư vấn</button>
                    </div>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <div id="consultation" ref={consultationRef}>
          <ScrollReveal as="section" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.08fr)] lg:items-start">
              <div className="lg:sticky lg:top-24">
                <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#777777]">Đặt lịch tư vấn</p>
                <h2 className="mt-3 text-3xl font-bold text-[#333333] md:text-4xl">Bắt đầu dự án của bạn</h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-[#777777]">Để lại thông tin, đội ngũ thiết kế sẽ liên hệ tư vấn trong thời gian sớm nhất.</p>
                <div className="mt-8 space-y-5">
                  <div className="flex items-center gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-white text-[#333333]"><span className="material-symbols-outlined text-[20px]">call</span></div><div><p className="text-xs font-semibold text-[#777777]">Hotline</p><p className="font-bold text-[#333333]">+84 (0) 24 3456 789</p></div></div>
                  <div className="flex items-center gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-white text-[#333333]"><span className="material-symbols-outlined text-[20px]">location_on</span></div><div><p className="text-xs font-semibold text-[#777777]">Studio chính</p><p className="text-sm text-[#555555]">Quận 1, TP. Hồ Chí Minh, VN</p></div></div>
                </div>
              </div>

              <div className="w-full rounded-[12px] border border-[#e5e5e5] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-8">
                <form onSubmit={handleConsultationSubmit} className="grid w-full grid-cols-1 gap-5 md:grid-cols-2">
                  <input type="text" name="website" tabIndex="-1" autoComplete="off" className="hidden" aria-hidden="true" />
                  <div className="space-y-3"><label className="block text-sm font-semibold text-[#333333]">Họ và tên *</label><input required className="ui-input h-11 w-full rounded-[8px]" name="fullName" placeholder="Nguyễn Văn A" type="text" /></div>
                  <div className="space-y-3"><label className="block text-sm font-semibold text-[#333333]">Số điện thoại *</label><input required className="ui-input h-11 w-full rounded-[8px]" name="phone" placeholder="090 000 0000" type="tel" /></div>
                  <div className="space-y-3 md:col-span-2"><label className="block text-sm font-semibold text-[#333333]">Email</label><input className="ui-input h-11 w-full rounded-[8px]" name="email" placeholder="example@email.com" type="email" /></div>
                  <div className="space-y-3"><label className="block text-sm font-semibold text-[#333333]">Loại công trình</label><select name="projectType" className="ui-select h-11 w-full rounded-[8px]"><option>Căn hộ</option><option>Nhà phố</option><option>Biệt thự</option><option>Văn phòng</option><option>Showroom</option><option>Khác</option></select></div>
                  <div className="space-y-3"><label className="block text-sm font-semibold text-[#333333]">Ngân sách dự kiến</label><select name="budgetRange" className="ui-select h-11 w-full rounded-[8px]"><option>Dưới 100 triệu</option><option>100 - 300 triệu</option><option>300 - 500 triệu</option><option>500 triệu - 1 tỷ</option><option>Trên 1 tỷ</option></select></div>
                  <div className="space-y-3 md:col-span-2"><label className="block text-sm font-semibold text-[#333333]">Nội dung yêu cầu</label><textarea className="ui-textarea min-h-[130px] w-full resize-y rounded-[8px]" name="message" required placeholder="Hãy mô tả ngắn gọn về yêu cầu thiết kế của bạn..." rows="4" /></div>
                  {consultationError && <p className="rounded-[8px] border border-[#f5d2d3] bg-[#fdebec] px-4 py-3 text-sm font-medium text-[#9f2f2d] md:col-span-2">{consultationError}</p>}
                  {consultationSuccess && <p className="rounded-[8px] border border-[#dbe8d8] bg-[#edf3ec] px-4 py-3 text-sm font-medium text-[#346538] md:col-span-2">{consultationSuccess}</p>}
                  <button className="ui-button-primary w-full py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2" type="submit" disabled={consultationSubmitting}>{consultationSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu tư vấn'}</button>
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
