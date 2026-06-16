import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import ScrollReveal from '../components/common/ScrollReveal';

export default function About() {
  const [offsetY, setOffsetY] = React.useState(0);

  useEffect(() => {
    const handleScroll = () => setOffsetY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-surface-bright text-on-surface font-body-md selection:bg-accent-gold/30">
      <Header />
      <main className="flex-grow">
        {/* Cinematic Hero Section */}
        <section className="relative h-[600px] md:h-[921px] w-full overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 z-0">
            <img 
              alt="Heritage Home Interior" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVkrT63K8cwINVUOBFlZTDvPQRl7d8v1dQUbpabqN40CQSUYfZL642bBft25xx16L6a9Y7qLoDcbpVTAnzlP7DcAtej1zOoXsHP6GFyuNKCZNBc1fXs8FdtHdRvwuWLhb8hfgGglwO5y4JupymsPgCMOftnIl9H_qVuRZhK3iO6GnDLjxb8mnzsRWS0URuSTETf4WBvBxTnTmFmb9gVITd-lp2TK9JU-BZ9doObSPy66WB4FVZx_Iz8r2VsJc3nnuG5QE4gXurIhs"
              style={{ transform: `translateY(${Math.min(offsetY * 0.05, 20)}px)` }}
            />
            <div className="absolute inset-0 bg-[#442a22]/20"></div>
          </div>
          <ScrollReveal className="relative z-10 text-center px-5 max-w-4xl">
            <h1 className="font-display-lg text-white text-4xl md:text-5xl font-bold mb-4">Nơi Di Sản Chạm Đến Không Gian Hiện Đại</h1>
            <p className="font-body-lg text-white/90 text-lg md:text-xl max-w-2xl mx-auto italic">"Tại Heritage Home, chúng tôi không chỉ tạo ra nội thất; chúng tôi gìn giữ những câu chuyện văn hóa trong từng đường nét tối giản."</p>
          </ScrollReveal>
        </section>

        {/* Our Heritage Section */}
        <ScrollReveal as="section" className="py-20 md:py-32 px-5 md:px-16 max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="font-label-lg text-sm text-[#C5A059] uppercase tracking-[0.2em] mb-4 block font-semibold">Câu chuyện của chúng tôi</span>
            <h2 className="font-headline-lg text-3xl font-semibold text-[#442a22] mb-8 leading-tight">Gìn giữ nghề thủ công Việt qua lăng kính đương đại.</h2>
            <div className="space-y-4 text-[#504441] font-body-md text-base">
              <p>Khởi nguồn từ những xưởng mộc truyền thống tại các làng nghề lâu đời, Heritage Home được thành lập với khao khát mang linh hồn của gỗ và kỹ nghệ chạm khắc Việt Nam vào những không gian sống hiện đại, tinh tế.</p>
              <p>Mỗi sản phẩm là một cuộc đối thoại giữa quá khứ và hiện tại. Chúng tôi tôn trọng những quy tắc tỉ lệ vàng của kiến trúc truyền thống nhưng lược bỏ những chi tiết rườm rà, tập trung vào sự thanh thoát và công năng tối ưu.</p>
            </div>
          </div>
          <div className="relative group">
            <div className="aspect-[4/5] overflow-hidden rounded-lg">
              <img 
                alt="Nghề Thủ Công" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAId_73a1McB87neOyo_4Jim5C85plBcV-gZh1duOHBLHOd1ooBwitOWsST8BEHBbSha-4ffVqE7pbxGMyYVKv829hIWOgRMKMmmOW1XOfx-qqHZqtMre9-RVUcqluXorCPTkzvLwUBgyuJpOawIYperJBda0nsxESLYEFRptGXRgvS3mv7qTz4qX8CIZ8CQEKDRHir8PQWiYmZTh0B5quDfG3-RsIPhMNfOrEdJ_3AQLkHv8WAQ6-ESS4l3vIq7Zydt22ACvEYjJI"
              />
            </div>
            <div className="absolute -bottom-8 -left-8 bg-[#F2EEE5] p-8 hidden lg:block shadow-lg max-w-xs">
              <p className="font-display-lg text-2xl font-bold text-[#BF360C] mb-2">20+</p>
              <p className="font-label-lg text-sm font-semibold text-[#442a22]">Năm kinh nghiệm trong ngành thiết kế di sản.</p>
            </div>
          </div>
        </ScrollReveal>

        {/* Core Values: Bento Grid */}
        <ScrollReveal as="section" className="bg-[#F9F7F2] py-20 md:py-32">
          <div className="px-5 md:px-16 max-w-[1280px] mx-auto">
            <div className="text-center mb-20">
              <h2 className="font-headline-lg text-3xl font-semibold text-[#442a22] mb-4">Giá trị cốt lõi</h2>
              <div className="w-24 h-[1px] bg-[#C5A059] mx-auto"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quality */}
              <div className="bg-[#F2EEE5] p-8 flex flex-col items-center text-center group hover:bg-[#442a22] transition-colors duration-500">
                <div className="w-16 h-16 rounded-full border border-[#442a22] flex items-center justify-center mb-8 group-hover:border-white">
                  <span className="material-symbols-outlined text-[#442a22] text-3xl group-hover:text-white">verified</span>
                </div>
                <h3 className="font-headline-md text-2xl font-semibold text-[#442a22] mb-4 group-hover:text-white">Chất Lượng</h3>
                <p className="font-body-md text-base text-[#504441] group-hover:text-white/80">Sử dụng nguồn gỗ tự nhiên bền vững và quy trình kiểm định nghiêm ngặt từ xưởng đến tay khách hàng.</p>
              </div>
              {/* Aesthetics */}
              <div className="bg-[#F2EEE5] p-8 flex flex-col items-center text-center group hover:bg-[#442a22] transition-colors duration-500">
                <div className="w-16 h-16 rounded-full border border-[#442a22] flex items-center justify-center mb-8 group-hover:border-white">
                  <span className="material-symbols-outlined text-[#442a22] text-3xl group-hover:text-white">auto_awesome</span>
                </div>
                <h3 className="font-headline-md text-2xl font-semibold text-[#442a22] mb-4 group-hover:text-white">Thẩm Mỹ</h3>
                <p className="font-body-md text-base text-[#504441] group-hover:text-white/80">Sự cân bằng hoàn hảo giữa nét thô mộc của tự nhiên và sự sang trọng của nghệ thuật tối giản.</p>
              </div>
              {/* Sustainability */}
              <div className="bg-[#F2EEE5] p-8 flex flex-col items-center text-center group hover:bg-[#442a22] transition-colors duration-500">
                <div className="w-16 h-16 rounded-full border border-[#442a22] flex items-center justify-center mb-8 group-hover:border-white">
                  <span className="material-symbols-outlined text-[#442a22] text-3xl group-hover:text-white">eco</span>
                </div>
                <h3 className="font-headline-md text-2xl font-semibold text-[#442a22] mb-4 group-hover:text-white">Bền Vững</h3>
                <p className="font-body-md text-base text-[#504441] group-hover:text-white/80">Cam kết bảo vệ môi trường thông qua việc tái chế vật liệu và ưu tiên các phương pháp thủ công ít tác động.</p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Our Team Section */}
        <ScrollReveal as="section" className="py-20 md:py-32 px-5 md:px-16 max-w-[1280px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-[#d4c3be] pb-8">
            <h2 className="font-headline-lg text-3xl font-semibold text-[#442a22]">Đội ngũ thiết kế</h2>
            <p className="font-body-md text-base text-[#504441] max-w-md mt-4 md:mt-0">Những người đứng sau những bản vẽ mang hơi thở di sản và tầm nhìn tương lai.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            <div className="group cursor-pointer">
              <div className="aspect-[3/4] overflow-hidden mb-4">
                <img 
                  alt="Lê Minh Anh - Giám đốc Sáng tạo" 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5oRxpdNAMnLPo07bl0VoWW1Kw-RNDxyou_3cXAJHuR6cvdYv0uV-xZIhsrJngWGsylGIBP99k2UtXPuimnCooVoAPsItTJD_59bVkgJLTQrLMxnBkgR2LR1_MqSiJdIGkgS0wg4ltSStp9YBVGnsTTMfCa6Zz0TR0eJ9izj6alm_z1hDheW5KCpOjpJFV2RH3buHSK7tyWmlSOZaxLaXytaBrIMqk8iycBpGVYyP734bhrr8nSDxHHMDVVX7REZPuVUA4dqlbQyg"
                />
              </div>
              <h4 className="font-headline-md text-xl font-semibold text-[#442a22]">Lê Minh Anh</h4>
              <p className="font-label-lg text-sm text-[#C5A059]">Giám đốc Sáng tạo</p>
            </div>
            <div className="group cursor-pointer">
              <div className="aspect-[3/4] overflow-hidden mb-4">
                <img 
                  alt="Nguyễn Hoàng Nam - Kiến trúc sư Trưởng" 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZAznhHVlehhd42KLETJbSaERasU1Uw9MIEyDzHEyvtcb6HT08tTHuTQjh-1r0MJAPa4yfvuQ-BuSNSj63-v92Kj_uc6DDYRMiWqKc3TigKWNgEiD7thFOullv8Sdc-thTvey7Df_3_KW57DK-mB1LgLhZl8H2mJSPr18HC7O7OIWUu1cBOBLlvMFzJJ-cZB_7CtRu4s9CJWYG_2AuNDDzMkvERXkEpAUnd0hIkDrxdFX12TsQxSBaUtumUGv4HeZFOl3a2B1yNvY"
                />
              </div>
              <h4 className="font-headline-md text-xl font-semibold text-[#442a22]">Nguyễn Hoàng Nam</h4>
              <p className="font-label-lg text-sm text-[#C5A059]">Kiến trúc sư Trưởng</p>
            </div>
            <div className="group cursor-pointer">
              <div className="aspect-[3/4] overflow-hidden mb-4">
                <img 
                  alt="Phạm Thu Trang - Chuyên gia Vật liệu" 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCMmdeTWhYxe2Re90gtlKJ46kg_8P61lh7LopT9WB0-rEPeW0arnr8jYqdHQnY42xTNbdH_b4esP2L5HF6YTHKAdnvFFrAgbWQZupLmqyGMAMK-1bb0Z_5a7ntLhjvhfdXD9CCDW-BEZlPi-PNsjlMN8gr54xABItvACspM-Sb3mWyNNlNEqe6GDhSCBthGVP1ZtMGPdqI4P0OBsYuL-G5X3tjUjuOWVya9fvRQA4Lhpn8D2C4wScm-8XQx-lNx26p7Opzx5kMfR-o"
                />
              </div>
              <h4 className="font-headline-md text-xl font-semibold text-[#442a22]">Phạm Thu Trang</h4>
              <p className="font-label-lg text-sm text-[#C5A059]">Chuyên gia Vật liệu</p>
            </div>
            <div className="group cursor-pointer">
              <div className="aspect-[3/4] overflow-hidden mb-4">
                <img 
                  alt="Trần Quốc Bảo - Nghệ nhân Chế tác" 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDokLzNLNVqyYkg4xLCM-hVmCwX1wzkBEo8RGVi1BX-latQGoVzTrcK5h4SrFpOA_7nyufmlj8tVZsDxJpRNZ4VkWp0j3htzbGa-Qw6XpV4HTrrldihegD6cxGfrJXFuqiGyQFboZ-yoDFhQ16nqFQBg7Pzgo-_59y79peks6-EfOH0GXP6AqLWH_OeaRZSvrNnDtbPiR0waeENzP-OpV7yLBsqBvH_xluClyx3JteeWTZ4P4QtvQsBVPBZpXkUgKeL28eISnBs7-k"
                />
              </div>
              <h4 className="font-headline-md text-xl font-semibold text-[#442a22]">Trần Quốc Bảo</h4>
              <p className="font-label-lg text-sm text-[#C5A059]">Nghệ nhân Chế tác</p>
            </div>
          </div>
        </ScrollReveal>

        {/* Final CTA Section */}
        <ScrollReveal as="section" className="relative py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[#5d4037] z-0"></div>
          <div className="absolute inset-0 opacity-10 z-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]"></div>
          <div className="relative z-10 px-5 text-center max-w-[1280px] mx-auto">
            <h2 className="font-display-lg text-3xl md:text-4xl font-bold text-[#d4ada1] mb-8">Bắt đầu hành trình kiến tạo không gian di sản của riêng bạn.</h2>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/products" className="bg-[#fbf9f4] text-[#442a22] px-10 py-4 font-label-lg text-sm font-semibold hover:bg-[#C5A059] hover:text-white transition-all duration-300 shadow-lg uppercase">
                Khám phá Bộ sưu tập
              </Link>
              <Link to="/design-service#consultation" className="border border-[#d4ada1] text-[#d4ada1] px-10 py-4 font-label-lg text-sm font-semibold hover:bg-white/10 transition-all duration-300 uppercase">
                Liên hệ Tư vấn
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </main>
      <Footer />
    </div>
  );
}
