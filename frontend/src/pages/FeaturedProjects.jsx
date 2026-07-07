import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import ScrollReveal from '../components/common/ScrollReveal';
import { projectsData } from '../data/projectDetailsData';

export default function FeaturedProjects() {
  const heroProject = projectsData.find(project => project.slug === 'the-heritage-estate') || projectsData[0];
  const gridProjects = projectsData.filter(project => project.slug !== heroProject?.slug);

  const getLayout = (index) => {
    const layouts = [
      'md:col-span-7',
      'md:col-span-5',
      'md:col-span-5',
      'md:col-span-7'
    ];
    return layouts[index % layouts.length];
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white text-[#333333]">
      <Header />
      <main className="flex-grow">
        {heroProject && (
          <section className="relative overflow-hidden bg-[#f7f7f5]">
            <img alt={heroProject.name} className="absolute inset-0 h-full w-full object-cover object-center opacity-100" src={heroProject.image} />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.46)_0%,rgba(0,0,0,0.22)_36%,rgba(0,0,0,0.06)_62%,rgba(0,0,0,0)_82%)]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(0deg,rgba(0,0,0,0.30)_0%,rgba(0,0,0,0)_75%)]" />
            <div className="relative mx-auto flex min-h-[620px] max-w-[1200px] items-end px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
              <ScrollReveal className="max-w-2xl text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.28)]">
                <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/85">Dự án tiêu biểu</p>
                <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">{heroProject.name}</h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-white/90">Một không gian nội thất được cá nhân hóa, nơi chất liệu, ánh sáng và tỉ lệ cùng tạo nên cảm giác sống rõ ràng hơn.</p>
                <Link to={`/featured-projects/${heroProject.slug}`} className="mt-8 inline-flex items-center justify-center rounded-[8px] bg-white px-6 py-3 text-sm font-bold text-[#333333] transition-colors hover:bg-[#f3f3f1]">
                  Khám phá chi tiết
                </Link>
              </ScrollReveal>
            </div>
          </section>
        )}

        <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <ScrollReveal className="mb-10 max-w-2xl">
            <h2 className="text-3xl font-bold text-[#333333] md:text-4xl">Bộ sưu tập dự án</h2>
            <p className="mt-3 text-sm leading-6 text-[#777777]">Khám phá các không gian nội thất được thiết kế theo nhu cầu thật, với hình ảnh và thông tin từ dữ liệu dự án hiện có.</p>
          </ScrollReveal>

          {gridProjects.length === 0 ? (
            <div className="ui-empty-state">
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#999999]">collections_bookmark</span>
              <h3 className="text-base font-bold text-[#333333]">Chưa có dự án khác</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777777]">Các dự án mới sẽ được hiển thị tại đây khi dữ liệu được cập nhật.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-12">
              {gridProjects.map((project, index) => (
                <ScrollReveal key={project.slug} delay={(index + 1) * 80} className={`${getLayout(index)} group`}>
                  <Link to={`/featured-projects/${project.slug}`} className="block">
                    <div className="aspect-[16/10] overflow-hidden rounded-[12px] bg-[#f3f3f1]">
                      <img className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" src={project.image} alt={project.name} />
                    </div>
                    <div className="px-1 pt-4">
                      <p className="text-xs font-semibold text-[#777777]">{project.category}</p>
                      <h3 className="mt-1 text-xl font-bold leading-6 text-[#333333] transition-colors group-hover:text-[#bfa37c]">{project.name}</h3>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          )}

          <ScrollReveal className="mt-16 rounded-[12px] border border-[#e5e5e5] bg-[#f7f7f5] p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <h2 className="text-2xl font-bold text-[#333333]">Bắt đầu câu chuyện của bạn</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#777777]">Trao đổi với đội ngũ thiết kế để chuyển nhu cầu không gian thành phương án nội thất rõ ràng.</p>
              </div>
              <Link to="/design-service#consultation" className="ui-button-primary inline-flex px-6 py-3 text-sm">Liên hệ tư vấn</Link>
            </div>
          </ScrollReveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}


