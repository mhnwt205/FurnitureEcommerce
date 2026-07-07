import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import ScrollReveal from '../components/common/ScrollReveal';

const heroImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVkrT63K8cwINVUOBFlZTDvPQRl7d8v1dQUbpabqN40CQSUYfZL642bBft25xx16L6a9Y7qLoDcbpVTAnzlP7DcAtej1zOoXsHP6GFyuNKCZNBc1fXs8FdtHdRvwuWLhb8hfgGglwO5y4JupymsPgCMOftnIl9H_qVuRZhK3iO6GnDLjxb8mnzsRWS0URuSTETf4WBvBxTnTmFmb9gVITd-lp2TK9JU-BZ9doObSPy66WB4FVZx_Iz8r2VsJc3nnuG5QE4gXurIhs';
const craftImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAId_73a1McB87neOyo_4Jim5C85plBcV-gZh1duOHBLHOd1ooBwitOWsST8BEHBbSha-4ffVqE7pbxGMyYVKv829hIWOgRMKMmmOW1XOfx-qqHZqtMre9-RVUcqluXorCPTkzvLwUBgyuJpOawIYperJBda0nsxESLYEFRptGXRgvS3mv7qTz4qX8CIZ8CQEKDRHir8PQWiYmZTh0B5quDfG3-RsIPhMNfOrEdJ_3AQLkHv8WAQ6-ESS4l3vIq7Zydt22ACvEYjJI';

const values = [
  { icon: 'verified', title: 'Chất lượng', text: 'Sử dụng nguồn gỗ tự nhiên bền vững và quy trình kiểm định nghiêm ngặt từ xưởng đến tay khách hàng.' },
  { icon: 'auto_awesome', title: 'Thẩm mỹ', text: 'Tìm sự cân bằng giữa nét thô mộc của tự nhiên và sự gọn gàng của không gian sống hiện đại.' },
  { icon: 'eco', title: 'Bền vững', text: 'Ưu tiên vật liệu có vòng đời dài, phương pháp chế tác ít tác động và thiết kế có thể sử dụng lâu dài.' }
];

const team = [
  { name: 'Lê Minh Anh', role: 'Giám đốc sáng tạo', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA5oRxpdNAMnLPo07bl0VoWW1Kw-RNDxyou_3cXAJHuR6cvdYv0uV-xZIhsrJngWGsylGIBP99k2UtXPuimnCooVoAPsItTJD_59bVkgJLTQrLMxnBkgR2LR1_MqSiJdIGkgS0wg4ltSStp9YBVGnsTTMfCa6Zz0TR0eJ9izj6alm_z1hDheW5KCpOjpJFV2RH3buHSK7tyWmlSOZaxLaXytaBrIMqk8iycBpGVYyP734bhrr8nSDxHHMDVVX7REZPuVUA4dqlbQyg' },
  { name: 'Nguyễn Hoàng Nam', role: 'Kiến trúc sư trưởng', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZAznhHVlehhd42KLETJbSaERasU1Uw9MIEyDzHEyvtcb6HT08tTHuTQjh-1r0MJAPa4yfvuQ-BuSNSj63-v92Kj_uc6DDYRMiWqKc3TigKWNgEiD7thFOullv8Sdc-thTvey7Df_3_KW57DK-mB1LgLhZl8H2mJSPr18HC7O7OIWUu1cBOBLlvMFzJJ-cZB_7CtRu4s9CJWYG_2AuNDDzMkvERXkEpAUnd0hIkDrxdFX12TsQxSBaUtumUGv4HeZFOl3a2B1yNvY' },
  { name: 'Phạm Thu Trang', role: 'Chuyên gia vật liệu', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMmdeTWhYxe2Re90gtlKJ46kg_8P61lh7LopT9WB0-rEPeW0arnr8jYqdHQnY42xTNbdH_b4esP2L5HF6YTHKAdnvFFrAgbWQZupLmqyGMAMK-1bb0Z_5a7ntLhjvhfdXD9CCDW-BEZlPi-PNsjlMN8gr54xABItvACspM-Sb3mWyNNlNEqe6GDhSCBthGVP1ZtMGPdqI4P0OBsYuL-G5X3tjUjuOWVya9fvRQA4Lhpn8D2C4wScm-8XQx-lNx26p7Opzx5kMfR-o' },
  { name: 'Trần Quốc Bảo', role: 'Nghệ nhân chế tác', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDokLzNLNVqyYkg4xLCM-hVmCwX1wzkBEo8RGVi1BX-latQGoVzTrcK5h4SrFpOA_7nyufmlj8tVZsDxJpRNZ4VkWp0j3htzbGa-Qw6XpV4HTrrldihegD6cxGfrJXFuqiGyQFboZ-yoDFhQ16nqFQBg7Pzgo-_59y79peks6-EfOH0GXP6AqLWH_OeaRZSvrNnDtbPiR0waeENzP-OpV7yLBsqBvH_xluClyx3JteeWTZ4P4QtvQsBVPBZpXkUgKeL28eISnBs7-k' }
];

export default function About() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white text-[#333333]">
      <Header />
      <main className="flex-grow">
        <section className="relative overflow-hidden bg-[#f7f7f5]">
          <img alt="Không gian nội thất Heritage Home" className="absolute inset-0 h-full w-full object-cover object-center opacity-100" src={heroImage} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.48)_0%,rgba(0,0,0,0.22)_38%,rgba(0,0,0,0.06)_62%,rgba(0,0,0,0)_82%)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(0deg,rgba(0,0,0,0.32)_0%,rgba(0,0,0,0)_75%)]" />
          <div className="relative mx-auto flex min-h-[560px] max-w-[1200px] items-end px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <ScrollReveal className="max-w-3xl text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.28)]">
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/85">Về Heritage Home</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">Nơi di sản chạm đến không gian hiện đại</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/90">Chúng tôi tạo nên những món nội thất có tỉ lệ rõ ràng, chất liệu thật và cảm giác sử dụng bền bỉ trong đời sống hằng ngày.</p>
            </ScrollReveal>
          </div>
        </section>

        <ScrollReveal as="section" className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#777777]">Câu chuyện của chúng tôi</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-[#333333] md:text-4xl">Giữ tinh thần thủ công Việt trong một ngôn ngữ sống gọn hơn.</h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-[#666666]">
              <p>Khởi nguồn từ những xưởng mộc truyền thống, Heritage Home được xây dựng với mong muốn đưa vẻ đẹp của gỗ và kỹ nghệ chế tác Việt vào không gian sống hiện đại.</p>
              <p>Mỗi sản phẩm là cuộc đối thoại giữa quá khứ và hiện tại. Chúng tôi tôn trọng tỉ lệ, chất liệu và công năng, đồng thời lược bỏ chi tiết rườm rà để món đồ dễ sống cùng hơn.</p>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden rounded-[12px] bg-[#f3f3f1]">
              <img alt="Nghề thủ công nội thất" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" src={craftImage} />
            </div>
            <div className="mt-4 rounded-[12px] border border-[#e5e5e5] bg-white p-5 lg:absolute lg:-bottom-8 lg:-left-8 lg:mt-0 lg:max-w-xs">
              <p className="text-3xl font-bold text-[#333333]">20+</p>
              <p className="mt-1 text-sm leading-6 text-[#777777]">Năm kinh nghiệm trong thiết kế và chế tác nội thất.</p>
            </div>
          </div>
        </ScrollReveal>

        <section className="bg-[#f7f7f5] py-16 lg:py-20">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <ScrollReveal className="mb-10 max-w-2xl">
              <h2 className="text-3xl font-bold text-[#333333]">Giá trị cốt lõi</h2>
              <p className="mt-3 text-sm leading-6 text-[#777777]">Một hệ tiêu chuẩn đơn giản để mọi quyết định thiết kế trở nên rõ ràng hơn.</p>
            </ScrollReveal>
            <div className="grid gap-5 md:grid-cols-3">
              {values.map((value, index) => (
                <ScrollReveal key={value.title} delay={(index + 1) * 80}>
                  <article className="h-full rounded-[12px] border border-[#e5e5e5] bg-white p-6 transition-colors hover:border-[#bfa37c]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#e5e5e5] text-[#333333]"><span className="material-symbols-outlined text-[20px]">{value.icon}</span></div>
                    <h3 className="mt-5 text-lg font-bold text-[#333333]">{value.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#777777]">{value.text}</p>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <ScrollReveal as="section" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mb-10 flex flex-col gap-4 border-b border-[#eeeeee] pb-6 md:flex-row md:items-end md:justify-between">
            <h2 className="text-3xl font-bold text-[#333333]">Đội ngũ thiết kế</h2>
            <p className="max-w-md text-sm leading-6 text-[#777777]">Những người đứng sau các bản vẽ, lựa chọn vật liệu và chi tiết chế tác.</p>
          </div>
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {team.map(member => (
              <article key={member.name} className="group">
                <div className="aspect-[3/4] overflow-hidden rounded-[12px] bg-[#f3f3f1]">
                  <img alt={`${member.name} - ${member.role}`} className="h-full w-full object-cover grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0" src={member.image} />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#333333]">{member.name}</h3>
                <p className="mt-1 text-sm text-[#777777]">{member.role}</p>
              </article>
            ))}
          </div>
        </ScrollReveal>

        <section className="bg-[#333333] py-16 lg:py-20">
          <ScrollReveal className="mx-auto max-w-[900px] px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold leading-tight text-white md:text-4xl">Bắt đầu hành trình kiến tạo không gian của riêng bạn</h2>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/products" className="inline-flex items-center justify-center rounded-[8px] bg-white px-6 py-3 text-sm font-bold text-[#333333] transition-colors hover:bg-[#f3f3f1]">Khám phá bộ sưu tập</Link>
              <Link to="/design-service#consultation" className="inline-flex items-center justify-center rounded-[8px] border border-white/40 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10">Liên hệ tư vấn</Link>
            </div>
          </ScrollReveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}


