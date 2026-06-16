import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { projectComponents, projectsData, selectProjectProducts } from '../data/projectDetailsData';
import ScrollReveal from '../components/common/ScrollReveal';
import { productService } from '../services/api/productService';
import { getStaticFileUrl } from '../utils/imageUtils';
const UsedProducts = ({ products }) => {
  if (!products || products.length === 0) return null;
  return (
    <section className="py-section-gap bg-surface-container-low">
      <div className="px-margin-desktop max-w-container-max mx-auto">
        <div className="flex justify-between items-end mb-16">
          <div className="flex flex-col gap-stack-sm">
            <span className="font-label-lg text-label-lg text-accent-terracotta uppercase tracking-widest">Sản phẩm sử dụng</span>
            <h2 className="font-headline-lg text-headline-lg text-primary">Sản phẩm trong dự án</h2>
          </div>
          <Link to="/products" className="font-label-lg text-label-lg text-primary border-b border-primary hover:text-accent-terracotta hover:border-accent-terracotta transition-all pb-1">Xem tất cả sản phẩm</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
          {products.slice(0, 4).map((p, i) => (
            <ScrollReveal key={p.id} delay={i * 100} className="group cursor-pointer">
              <Link to={`/products/${p.id}`} className="block">
                <div className="aspect-[4/5] bg-surface-beige overflow-hidden rounded-lg mb-4">
                  <img 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    alt={p.name}
                    src={getStaticFileUrl(p.imageUrl || (p.images && p.images.length > 0 ? p.images[0] : null)) || 'https://placehold.co/400x500?text=No+Image'}
                  />
                </div>
                <span className="font-label-sm text-xs text-outline mb-1 uppercase block">{p.category?.name || 'SẢN PHẨM'}</span>
                <h4 className="font-headline-md text-headline-md text-primary mb-2 line-clamp-1">{p.name}</h4>
                <p className="font-label-lg text-label-lg text-accent-gold mt-2">{p.price?.toLocaleString()} VND</p>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

const RelatedProjectsList = ({ projects }) => {
  if (!projects || projects.length === 0) return null;
  return (
    <ScrollReveal as="section" className="py-section-gap px-margin-desktop max-w-container-max mx-auto">
      <h2 className="font-headline-lg text-headline-lg text-primary mb-12">Dự án liên quan</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        {projects.map(p => (
          <Link key={p.slug} to={`/featured-projects/${p.slug}`} className="group relative aspect-[16/9] overflow-hidden rounded-lg block">
            <img 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
              alt={p.name}
              src={p.image}
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors duration-500"></div>
            <div className="absolute bottom-8 left-8 text-white">
              <p className="font-label-lg text-label-lg uppercase tracking-widest mb-2 opacity-80">{p.category}</p>
              <h3 className="font-headline-md text-headline-md">{p.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </ScrollReveal>
  );
};

const TheHeritageEstate = ({ project }) => {
  const [offsetY, setOffsetY] = React.useState(0);

  useEffect(() => {
    const handleScroll = () => setOffsetY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
  <>
    {/* 1. Hero Section */}
    <section className="relative h-[921px] overflow-hidden flex items-end pb-32">
      <div className="absolute inset-0 z-0">
        <img 
          className="w-full h-full object-cover" 
          alt="The Heritage Estate" 
          src={project.image}
          style={{ transform: `translateY(${Math.min(offsetY * 0.05, 20)}px)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
      </div>
      <ScrollReveal className="relative z-10 w-full px-margin-desktop max-w-container-max mx-auto text-white">
        <div className="flex flex-col gap-4">
          <span className="font-label-lg text-label-lg tracking-[0.2em] uppercase text-accent-gold">Nam An | 2024</span>
          <h1 className="font-display-lg text-display-lg md:text-[80px] leading-tight max-w-3xl">The Heritage Estate</h1>
        </div>
      </ScrollReveal>
    </section>

    {/* 2. Project Overview */}
    <ScrollReveal as="section" className="py-section-gap px-margin-desktop max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-12 gap-gutter items-start">
      <div className="md:col-span-7 flex flex-col gap-stack-lg">
        <div className="flex flex-col gap-stack-md">
          <h2 className="font-headline-lg text-headline-lg text-primary">Triết lý thiết kế</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
              The Heritage Estate là sự giao thoa tinh tế giữa hơi thở đương đại và những giá trị di sản Việt Nam. Chúng tôi không chỉ xây dựng một không gian sống, mà còn kiến tạo một tác phẩm nghệ thuật tôn vinh sự tĩnh lặng và chiều sâu của vật liệu tự nhiên. Với tầm nhìn của chủ nhân về một chốn đi về sang trọng nhưng vẫn ấm cúng, dự án tập trung vào sự cân bằng giữa ánh sáng tự nhiên và các cấu trúc gỗ thủ công.
          </p>
        </div>
        <div className="flex flex-col gap-stack-md">
          <h3 className="font-headline-md text-headline-md text-primary">Vật liệu & Nghệ nhân</h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
              Dự án sử dụng Gỗ Óc Chó (Walnut) nhập khẩu được chế tác bởi các thợ mộc lành nghề tại địa phương, kết hợp cùng lụa tơ tằm thủ công từ làng nghề truyền thống và đá tự nhiên nguyên khối. Mỗi bề mặt đều mang một câu chuyện về sự tỉ mỉ và tôn trọng thiên nhiên.
          </p>
        </div>
      </div>
      <div className="md:col-span-5 bg-surface-beige p-10 rounded-lg flex flex-col gap-8 luxury-shadow">
        <h3 className="font-label-lg text-label-lg text-primary uppercase border-b border-outline-variant pb-4">Thông số dự án</h3>
        <div className="grid grid-cols-1 gap-6">
          <div className="flex justify-between items-center">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Diện tích</span>
            <span className="font-headline-md text-headline-md text-primary">450 m²</span>
          </div>
          <div className="flex justify-between items-center border-t border-outline-variant/30 pt-6">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Hoàn thiện</span>
            <span className="font-headline-md text-headline-md text-primary">08 Tháng</span>
          </div>
          <div className="flex justify-between items-center border-t border-outline-variant/30 pt-6">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Phong cách</span>
            <span className="font-headline-md text-headline-md text-primary">Heritage Modernist</span>
          </div>
          <div className="flex justify-between items-center border-t border-outline-variant/30 pt-6">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Địa điểm</span>
            <span className="font-headline-md text-headline-md text-primary">Nam An, Đà Nẵng</span>
          </div>
        </div>
      </div>
    </ScrollReveal>

    {/* 3. Image Gallery */}
    <ScrollReveal as="section" className="px-margin-desktop max-w-container-max mx-auto mb-section-gap">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        <div className="md:col-span-8 group overflow-hidden rounded-lg">
          <img 
            className="w-full h-[600px] object-cover transition-transform duration-700 group-hover:scale-105" 
            alt="Bedroom"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCwmd2NGf4g-7_5O7yI6wRuWQVRrG-kudGLCn0S_ua4gJ7NyMWhFaXohXkp2CJ3CdrN-EUvLozrnfbTwbRJ3tmA7s5BCJIptndm4fwRq4LoIrU0X94qxjqSpEqqjitz8i9IJnypxPdOlwk_ytHsSOTsaRlDq64J-3NQwVkAPQ-bYkYjHGs1Chrc2MwgpZun9HoXzlzSWM6sqBU6s5HhMycGYMs4ilyNcXkkMBOowOI6T-vDsoaSQp4lQ1tC094slFsnHw1HUWva2Yw"
          />
        </div>
        <div className="md:col-span-4 flex flex-col gap-gutter">
          <div className="h-1/2 group overflow-hidden rounded-lg">
            <img 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              alt="Kitchen"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDT3vnorcoA0MNREUUxBYbNqxEA_We4WEZMa7yet-QtoaRyXMhpojQGLCgQfneL6zXsOhvIQ62zbAObk_TvA_uNVwU8M8C66xpuc5Ef_UsS4yvMJ6oRzf4sf4bp0b7JEePsu5FMwvGL7LWybfgAyJwqwReYzjROYUXgmQJ5aW6Vqdp4Cd4nZvqB-RX0ldb3E1iL5iA7zJvZRL02IgNSEgBP3OJ_xLblitEaTH8mZ77byfFP7WbsIkUbwke2cG0bcB_TQRbsOw40UOY"
            />
          </div>
          <div className="h-1/2 group overflow-hidden rounded-lg">
            <img 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              alt="Dining"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfkGNE_dW6sC7FdnFeFbHsjAwmfC8fJ-qtIYdVI4jJlv-iE_DX41x1L0F7tbQwy7B0V7DPe1Cb_U5JOvuxwwmxUHNt9THVRHaF7XPS6YIaYWzMWGvsMYLTtnw8M4cN6oksr2uTgCx3Q7e--EdbliMN16xm_U-R99I5tMlUHCd4syKHXFvtBMjxBoiMa15fRyIofizoKNl1Zp8SVdNCQYoe8dFdzvffernwlgPSQhHEspgvtlCPcLl3g-qxhu7Xnswzn4XKYAhzEx0"
            />
          </div>
        </div>
        <div className="md:col-span-12 group overflow-hidden rounded-lg mt-6">
          <img 
            className="w-full h-[500px] object-cover transition-transform duration-700 group-hover:scale-105" 
            alt="Living room"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2y58pRA8-8iMdCbEe7oJhZenexxXpwQBSfKw9c2Qx_4bal9ZpF_Lsqsaph9g7dsm2pBytEy_HO9VxFTIhSK5uSf38qrb6wUoKPjwf2UaamDhbCyWMQhbBvyzLoyCvMQaApK5fgKe9LbarF714KISUbxVLPIwm6hZ35bcycfiqBuUe3cXbjg_ZVabihcMH6De0dMgnH_9_c9nsVQCsu7-rXuYQtfXzHaEZSTgPKDcslGsVmmy1JQIUei8StNoImpRw9wycUiL2KA8"
          />
        </div>
      </div>
    </ScrollReveal>
  </>
  );
};

const IndochineVillaSaiGon = ({ project }) => {
  const [offsetY, setOffsetY] = React.useState(0);

  useEffect(() => {
    const handleScroll = () => setOffsetY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* 1. Hero Section */}
      <section className="relative h-screen min-h-[700px] w-full overflow-hidden">
        <img alt="Indochine Villa Exterior" className="absolute inset-0 w-full h-full object-cover" src={project.image} style={{ transform: `translateY(${Math.min(offsetY * 0.05, 20)}px)` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60"></div>
        <ScrollReveal className="absolute inset-0 flex flex-col justify-end px-margin-desktop pb-section-gap max-w-container-max mx-auto text-white">
          <p className="font-label-lg text-label-lg mb-4 tracking-[0.2em] uppercase opacity-90">Dinh thự riêng tư</p>
          <h1 className="font-display-lg text-display-lg mb-6 leading-tight max-w-3xl">Indochine Villa Sài Gòn</h1>
          <p className="font-headline-md text-headline-md font-light italic max-w-2xl opacity-80">
            "Nơi vẻ đẹp thanh lịch vượt thời gian của kiến trúc Pháp giao thoa cùng linh hồn di sản Việt, kiến tạo nên một thánh đường của ánh sáng và hoài niệm."
          </p>
        </ScrollReveal>
      </section>

      {/* 2. Project Info & Design Story */}
      <ScrollReveal as="section" className="px-margin-desktop py-section-gap max-w-container-max mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* Info Card */}
          <div className="lg:col-span-4 bg-surface-beige p-10 rounded-lg shadow-[0_10px_30px_rgba(93,64,55,0.05)] luxury-shadow">
            <h3 className="font-label-lg text-label-lg text-accent-terracotta mb-8 tracking-widest uppercase">Thông tin dự án</h3>
            <ul className="space-y-stack-lg">
              <li className="flex justify-between border-b border-outline-variant/30 pb-4">
                <span className="text-on-surface-variant font-medium">Diện tích</span>
                <span className="text-primary font-semibold">500 m²</span>
              </li>
              <li className="flex justify-between border-b border-outline-variant/30 pb-4">
                <span className="text-on-surface-variant font-medium">Thời gian</span>
                <span className="text-primary font-semibold">12 Tháng</span>
              </li>
              <li className="flex justify-between border-b border-outline-variant/30 pb-4">
                <span className="text-on-surface-variant font-medium">Phong cách</span>
                <span className="text-primary font-semibold">Đông Dương kết hợp Tân Cổ Điển Pháp</span>
              </li>
              <li className="flex justify-between pb-2">
                <span className="text-on-surface-variant font-medium">Địa điểm</span>
                <span className="text-primary font-semibold">Quận 2, TP.HCM</span>
              </li>
            </ul>
          </div>
          {/* Story Text */}
          <div className="lg:col-span-8 lg:pl-12">
            <h2 className="font-headline-lg text-headline-lg text-primary mb-8">Câu chuyện thiết kế</h2>
            <div className="space-y-6 font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
              <p>
                Indochine Villa Sài Gòn không chỉ đơn thuần là một dự án cải tạo; đó là một quá trình phục dựng tinh tế những giá trị cốt lõi. Ẩn mình trong khu dân cư yên tĩnh tại Quận 2, dự án là nhịp cầu nối giữa vẻ đẹp hoài cổ của Đông Dương những năm 1920 và những đòi hỏi khắt khe của phong cách sống thượng lưu hiện đại.
              </p>
              <p>
                Thiết kế xoay quanh triết lý "Di sản xúc giác". Chúng tôi đã tỉ mỉ tìm kiếm những khối gỗ sồi tái chế cho hệ tủ kệ may đo, những viên gạch bông ép thủ công từ các xưởng nghệ nhân miền Trung, và khéo léo lồng ghép kết cấu mây đan vào những đường nét nội thất tối giản.
              </p>
              <div className="py-8">
                <blockquote className="border-l-4 border-accent-gold pl-8 italic text-primary font-headline-md">
                  "Mục tiêu là tạo ra một không gian biết thở—nơi không khí luôn mát lành dưới những vòm trần cao, và bóng tối nhảy múa nhịp nhàng trên những bức tường vôi nhám."
                </blockquote>
              </div>
              <p>
                Mỗi góc nhỏ đều kể một câu chuyện về nghề thủ công. Cầu thang lớn, trái tim của căn biệt thự, được chạm khắc hoàn toàn bằng tay để mô phỏng đường cong mềm mại của thảm thực vật bản địa, trong khi hệ thống đèn chiếu sáng là sự diễn giải đầy tính đương đại của những chiếc đèn lồng lụa truyền thống.
              </p>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* 3. Gallery Section */}
      <ScrollReveal as="section" className="bg-surface-ivory py-section-gap">
        <div className="px-margin-desktop max-w-container-max mx-auto">
          <div className="mb-12">
            <h2 className="font-headline-lg text-headline-lg text-primary">Thư viện hình ảnh</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {/* Big Item */}
            <div className="lg:col-span-2 lg:row-span-2 relative group overflow-hidden rounded-lg">
              <img alt="Grand Living Room" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAG-X6ayk6ucqZPDf8BJcdNU2U0YvH6pW997de3EFYyHjx6BVVRF2S36RAyp43dGcWhDwjPAoLVqIQG-kxokMP_6CB9nLXsKD_BN47opNjt11olyohC0zoob1dQSv-DjTP-0GtZixN0W15F-L92uKZrdWp5xcIdHCk8VSMUfsNjZjMtARow2y0nfKdsvJRsDKevVHgXjlqCSOAhl-eZgFcHw5CFvN_g447FHpn_MdTT7L627v25BL8G34XGq3g0b_ahjhcqdHGZVm8"/>
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <span className="text-white font-label-lg">Đại sảnh & Không gian phòng khách</span>
              </div>
            </div>
            {/* Small Items */}
            <div className="aspect-[4/5] relative group overflow-hidden rounded-lg">
              <img alt="Dining Area" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAF4XLidtoGZSLd7FBcbOVi7AHv-bMwvYWBZihh1SdK-u57-REJyTm1YhU4jAbiDqU86U0PyM6nl_uaOAaB5LsLH6sKK33ia5e4eSm4CAeNB4TSUpx688eYrj0lFJlmPCAi4sehtT5LfxOnPEGVnOv7bj-nw657ga8LZILn5MGWlirhJAbd2lQ6JZVwrlJqvI0EopmQ9VGVJxCfnjHx4D06Y4lQR6K7Fy28XfS9Fzfimu1VTwZk7dugF6DG7a7GTbgcqcXb2j0GOXk"/>
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white font-label-lg border border-white px-6 py-2 uppercase tracking-widest">Khu vực phòng ăn</span>
              </div>
            </div>
            <div className="aspect-[4/5] relative group overflow-hidden rounded-lg">
              <img alt="The Master Suite" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQTWeUhjxuASAYAi5wyundme6QFDStd53mRbLe7_78ce5o7HopGdKaTbPJt4ebS8m1KWmp0gT7innASO27DpkZYZnpEHXnDKB7a3LU5JE2Ym813iPGfkbgm9aO5kwVRA47JBbqcrnvYWF9g8riDZ-VhNsiORUeHcQ1Kn6j9Y2nJ9UD2pYRrKpAFjQs0KF9jeFxiPIS4IxZYh98O295RWYLUmbSe-L2tIdkN19-IRd0I8Hgq0xE4FuGzllB6TRkOpFxSEjSU2VQpII"/>
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white font-label-lg border border-white px-6 py-2 uppercase tracking-widest">Phòng ngủ Master</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </>
  );
};

const ProjectNotFound = () => (
  <section className="flex flex-col items-center justify-center py-section-gap px-margin-desktop min-h-[60vh] text-center">
    <h1 className="font-display-lg text-display-lg text-primary mb-6">Project Not Found</h1>
    <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg mb-8">
      Rất tiếc, dự án bạn đang tìm kiếm không tồn tại hoặc đã được gỡ bỏ.
    </p>
    <Link 
      to="/featured-projects" 
      className="bg-primary hover:bg-primary-container text-white px-8 py-3 rounded font-label-lg transition-colors"
    >
      Quay lại danh sách dự án
    </Link>
  </section>
);

export default function ProjectDetail() {
  const { slug } = useParams();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    productService.getProducts({ limit: 100 })
      .then(res => setProducts(res.data ? res.data : (Array.isArray(res) ? res : [])))
      .catch(console.error);
    window.scrollTo(0, 0);
  }, [slug]);

  const currentProject = projectsData.find(p => p.slug === slug);
  const displayProducts = selectProjectProducts(products, currentProject, 4);

  // Normalize slug equivalent
  const normalizedSlug = slug;

  const relatedProjects = projectsData
    .filter(p => p.slug !== normalizedSlug)
    .slice(0, 2);

  // Map slugs to components. Include both indochine variants to point to the same component if needed.
  // The instruction said: "Nếu hiện tại Indochine đang dùng slug khác như: the-heritage-estate thì vẫn giữ được route cũ để không lỗi, nhưng cần thêm slug đúng mới."
  const renderContent = () => {
    if (slug === 'the-heritage-estate') {
      return <TheHeritageEstate project={currentProject} />;
    }
    if (slug === 'indochine-villa-sai-gon') {
      return <IndochineVillaSaiGon project={currentProject} />;
    }
    const DynamicComponent = projectComponents[slug];
    if (DynamicComponent) {
      return <DynamicComponent project={currentProject} />;
    }
    return <ProjectNotFound />;
  };

  // Simple intersection observer effect for fade-in animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fadeIn');
        }
      });
    }, { threshold: 0.1 });

    const sections = document.querySelectorAll('.observe-section');
    sections.forEach(section => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, [slug]);

  const isValidProject = slug === 'the-heritage-estate' || slug === 'indochine-villa-sai-gon' || !!projectComponents[slug];

  return (
    <div className="bg-surface-bright text-on-surface selection:bg-accent-gold selection:text-white min-h-screen flex flex-col">
      <style>{`
        .luxury-shadow { box-shadow: 0 10px 30px rgba(93, 64, 55, 0.08); }
      `}</style>
      <Header />
      <main className="flex-grow pt-20">
        {renderContent()}
        {isValidProject && (
          <>
            <UsedProducts products={displayProducts} />
            <RelatedProjectsList projects={relatedProjects} />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
