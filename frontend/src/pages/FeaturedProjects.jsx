import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import ScrollReveal from '../components/common/ScrollReveal';
import { projectsData } from '../data/projectDetailsData';

export default function FeaturedProjects() {
  const [offsetY, setOffsetY] = React.useState(0);

  useEffect(() => {
    const handleScroll = () => setOffsetY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const heroProject = projectsData.find(p => p.slug === 'the-heritage-estate') || projectsData[0];
  const gridProjects = projectsData.filter(p => p.slug !== heroProject.slug);

  const getBentoLayout = (index) => {
    const layouts = [
      { colSpan: 'md:col-span-8', aspect: 'aspect-[16/9]' },
      { colSpan: 'md:col-span-4', aspect: 'aspect-[4/5]' },
      { colSpan: 'md:col-span-4', aspect: 'aspect-[1/1]' },
      { colSpan: 'md:col-span-8', aspect: 'aspect-[21/9]' }
    ];
    return layouts[index % layouts.length];
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-bright text-on-surface font-body-md selection:bg-accent-gold/30">
      <Header />
      <main className="flex-grow">
        {/* Hero Section: Major Landmark Project */}
        <section className="relative w-full h-[600px] md:h-[870px] overflow-hidden">
          <img 
            alt={heroProject.name} 
            className="w-full h-full object-cover transition-transform duration-1000" 
            src={heroProject.image}
            style={{ transform: `translateY(${Math.min(offsetY * 0.05, 20)}px)` }}
          />
          <div className="absolute inset-0 bg-black/30 flex items-end">
            <div className="max-w-[1280px] mx-auto w-full px-5 md:px-16 pb-12 md:pb-32">
              <ScrollReveal className="max-w-2xl bg-[#fbf9f4]/90 backdrop-blur-md p-6 md:p-8 border-l-4 border-[#C5A059]">
                <p className="font-label-lg text-[14px] font-semibold tracking-widest text-[#BF360C] mb-2 uppercase">Dự Án Tiêu Biểu</p>
                <h1 className="font-display-lg text-3xl md:text-5xl font-bold text-[#442a22] mb-4">{heroProject.name}</h1>
                <p className="font-body-lg text-base md:text-lg text-[#504441] mb-8 leading-relaxed">
                  Một sự giao thoa hoàn hảo giữa kiến trúc và tinh thần đương đại, tạo nên không gian sống đậm chất nghệ thuật.
                </p>
                <Link to={`/featured-projects/${heroProject.slug}`} className="bg-[#442a22] text-white px-8 py-4 font-label-lg text-sm font-semibold hover:bg-[#5d4037] transition-all flex items-center gap-2 w-fit group">
                  KHÁM PHÁ CHI TIẾT
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Project Gallery Section */}
        <section className="py-20 md:py-32 max-w-[1280px] mx-auto px-5 md:px-16">
          <div className="mb-16">
            <ScrollReveal className="max-w-xl">
              <h2 className="font-headline-lg text-3xl font-semibold text-[#442a22] mb-4">Bộ Sưu Tập Dự Án</h2>
              <p className="font-body-md text-base text-[#504441]">Khám phá các không gian nội thất được thiết kế cá nhân hóa, nơi mỗi chi tiết đều kể một câu chuyện về sự tinh tế và di sản.</p>
            </ScrollReveal>
          </div>

          {/* Bento-style Project Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {gridProjects.map((project, index) => {
              const layout = getBentoLayout(index);
              return (
                <ScrollReveal key={project.slug} delay={(index + 1) * 100} className={`${layout.colSpan} group project-card overflow-hidden cursor-pointer block`}>
                  <Link to={`/featured-projects/${project.slug}`} className="block w-full h-full">
                    <div className={`relative overflow-hidden ${layout.aspect} bg-[#F2EEE5]`}>
                      <img 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        src={project.image} 
                        alt={project.name}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="bg-[#fbf9f4] text-[#442a22] px-6 py-3 font-label-lg text-sm font-semibold shadow-[0_10px_30px_rgba(93,64,55,0.08)]">XEM CHI TIẾT</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="font-label-sm text-xs text-[#C5A059] uppercase tracking-tighter">{project.category}</span>
                      <h3 className="font-headline-md text-2xl font-semibold text-[#442a22] mt-1">{project.name}</h3>
                    </div>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>

          {/* Call to Action */}
          <ScrollReveal className="mt-32 bg-[#5d4037] p-8 md:p-16 text-center text-[#d4ada1]">
            <h2 className="font-display-lg text-3xl md:text-5xl font-bold mb-6 text-white">Bắt Đầu Câu Chuyện Của Bạn</h2>
            <p className="font-body-lg text-lg mb-10 opacity-90 max-w-2xl mx-auto text-[#f2f1ec]">Chúng tôi không chỉ bán nội thất, chúng tôi kiến tạo không gian sống mang đậm bản sắc cá nhân và giá trị di sản.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/design-service#consultation" className="inline-block bg-[#fbf9f4] text-[#442a22] px-10 py-4 font-label-lg text-sm font-semibold hover:bg-white transition-all uppercase tracking-widest text-center">Liên Hệ Tư Vấn</Link>
              <button className="border border-[#fbf9f4] text-[#fbf9f4] px-10 py-4 font-label-lg text-sm font-semibold hover:bg-[#fbf9f4]/10 transition-all uppercase tracking-widest">Tải Profile Công Ty</button>
            </div>
          </ScrollReveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}
