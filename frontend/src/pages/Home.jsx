import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { productService } from '../services/api/productService';
import { getStaticFileUrl } from '../utils/imageUtils';
import ScrollReveal from '../components/common/ScrollReveal';
import WishlistButton from '../components/common/WishlistButton';
import { wishlistService } from '../services/api/wishlistService';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offsetY, setOffsetY] = useState(0);
  const [wishlistIds, setWishlistIds] = useState([]);

  useEffect(() => {
    const fetchWishlistIds = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await wishlistService.getWishlistIds();
          if (res && res.ids) setWishlistIds(res.ids);
        } catch (error) {
          console.error("Failed to fetch wishlist ids", error);
        }
      }
    };
    fetchWishlistIds();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productService.getProducts();
        const productList = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];
        setProducts(productList);
      } catch (err) {
        setError(err.message || 'Lỗi khi tải sản phẩm');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();

    const handleScroll = () => setOffsetY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        
{/**/}

{/**/}

<main className="transition-all">
{/**/}
<section className="relative w-full h-[921px] overflow-hidden flex items-center">
<img className="absolute inset-0 w-full h-full object-cover" data-alt="A grand, high-ceilinged modern living room with floor-to-ceiling windows overlooking a misty tropical garden. The interior is bathed in soft, natural morning light, highlighting a large linen sofa in soft beige and a dark wooden coffee table. The atmosphere is quiet, luxurious, and deeply rooted in a modern Vietnamese aesthetic with warm earth tones and minimalist handcrafted furniture." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAnFNRWu99iE-KGcQhBkZEatunNd2j7PqZtKlSMA5ZhgWglgYL-kZ3Nh4aEomsW80J8Rgpt6heJcduJ2ZaHm8rO34trynGCqtCTX5KHk15fEqqEaMUGgFJboH9ZtxYkm4sms5jR5jL09Mr5rtAuc0oyl2x3Eb8xJN7QIbMjP2YJZjhDemghV1GdCpTAZ-nytb8TIP6vIV_WVJa-uDM1b0Kcg-vX0LUYMECGDE3CK5VUgH-C26wwnmYfckMvd9tCQkQyiTfl8cqlDcw" style={{ transform: `translateY(${Math.min(offsetY * 0.05, 20)}px)` }} />
<div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent"></div>
<div className="relative z-10 px-margin-desktop max-w-container-max mx-auto w-full text-white">
<ScrollReveal delay={100}>
<h1 className="font-display-lg text-display-lg md:text-[64px] mb-6 max-w-2xl leading-tight">Nội thất đẹp cho không gian sống</h1>
</ScrollReveal>
<ScrollReveal delay={200}>
<p className="font-body-lg text-body-lg mb-10 max-w-lg text-white/90">Sự giao thoa giữa di sản Việt Nam và thiết kế đương đại, mang lại hơi thở sang trọng và ấm cúng cho tổ ấm của bạn.</p>
</ScrollReveal>
<ScrollReveal delay={300}>
<Link className="inline-flex items-center px-10 py-5 bg-primary text-on-primary font-label-lg text-label-lg uppercase tracking-widest hover:bg-primary-container transition-all shadow-lg active:scale-95" to="/products">
                    Khám phá bộ sưu tập
                </Link>
</ScrollReveal>
</div>
</section>
{/**/}
<section className="py-section-gap px-margin-desktop max-w-container-max mx-auto">
<ScrollReveal>
<div className="flex justify-between items-end mb-12">
<div>
<span className="text-accent-gold font-label-lg uppercase tracking-widest mb-4 block">Phân loại</span>
<h2 className="font-headline-lg text-headline-lg text-primary">Danh mục nổi bật</h2>
</div>
</div>
</ScrollReveal>
<ScrollReveal delay={100} className="grid grid-cols-2 md:grid-cols-6 gap-6">
{/**/}
<Link className="group block text-center space-y-4" to="/products?category=sofa">
<div className="aspect-square bg-surface-beige rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-[1.02] shadow-sm group-hover:shadow-md">
<img className="w-full h-full object-cover" alt="Sofa" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCxaFM62QerL1EP4PWsZlBTLAbM4Rzu3214C9s2YUF3Gu5H_YToBWpskuRd-i8-4FFu3Qy7wajO4bZXcihvk2ivUjIJUC913djnbZXF4tSZJu4WoHfX1R3DLxy3bRdr3NkD9m2bkmtQbwjTcyxf_Es-P80JiwLKWiesRXOj-pqcyxgcQPuRzZA2ZqX5pedkLhS7pWJ6eWczS7jOEzu74Kj3ely6WNB-aTXDR_abByZYEuiW9Y-sNLJM3aN_4XZTCXdluUGNca5wvQg" />
</div>
<span className="font-label-lg text-label-lg text-on-surface group-hover:text-accent-terracotta transition-colors">Sofa</span>
</Link>
<Link className="group block text-center space-y-4" to="/products?category=ban">
<div className="aspect-square bg-surface-beige rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-[1.02] shadow-sm group-hover:shadow-md">
<img className="w-full h-full object-cover" alt="Bàn" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBOAwWyanIQJ_E_VLLU0T1mlBQApdnKjjPAvPo2ZUNpd-GdNxaC6SkHMVhYGjM5nC5YHw6953ZaKaqDup6eeJQgNhIa4dyNvQWuNJbAxqYU8V9o_RlOrl4uAsT2SJdxh5Or0dbCH3BVbfdF_glaSBjhgn9NtdYZiKDD0AJHzy6Z3tD8LQ1RfHjG27MIe4Sve4LO40KYCCB1OmshMohsz0vMSz-ThHx1WwJJRJAeB36heBNR4kCMr40_ruHHQVKnC13TxfRDxnYMX7o" />
</div>
<span className="font-label-lg text-label-lg text-on-surface group-hover:text-accent-terracotta transition-colors">Bàn</span>
</Link>
<Link className="group block text-center space-y-4" to="/products?category=ghe">
<div className="aspect-square bg-surface-beige rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-[1.02] shadow-sm group-hover:shadow-md">
<img className="w-full h-full object-cover" alt="Ghế" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBydDOHqE8r5V2S0ehF6iuDgDrk0fvXM7RSiz9pNjnI-_JbSIXSsNi9stXhHlhAv4C4xWcFU2KgdIlfG_TEaCTaBPqX00LQm7XyKLhY7M827hQ6hRqg8iTL1vsiXjKWrSH7jkpCtLO7GLQGEfxWrhG7Zv_LqThN-QkbmWgaOsOMV9lHhgFtC3gF5-af_DiCtP0ytRFwWgozypRI_YQtNbd34PXnJ2KblncxpFwzxzOuo_HpbXMcCjQhSrk4vXd8LDkWz-0WDCzZOzU" />
</div>
<span className="font-label-lg text-label-lg text-on-surface group-hover:text-accent-terracotta transition-colors">Ghế</span>
</Link>
<Link className="group block text-center space-y-4" to="/products?category=giuong">
<div className="aspect-square bg-surface-beige rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-[1.02] shadow-sm group-hover:shadow-md">
<img className="w-full h-full object-cover" alt="Giường" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNd4aPAssL__5QteAhfPkEvpHU9RvHwbcCW2Ph8VXhC3q6aOTwGWkFS73cdxyFfvg6dL5weDYZ0HeL2VSX_1Yef_Nheb6Bi9FHv-hgiuvQHLBpHlieiV0jePQlq6RN8wKtKIE_lfZNiMV9o8sapTH3klzDG-pa6a-gJM806OwAsVmsuIR7MVcHMnyS3_mPR9rU9FsbG7m343lCofW-eUfDfGTKW9Q-33DjzRNuE4GY2reyA3g9lZHgGGwACtDSjnt3Su2TZiRa9pg" />
</div>
<span className="font-label-lg text-label-lg text-on-surface group-hover:text-accent-terracotta transition-colors">Giường</span>
</Link>
<Link className="group block text-center space-y-4" to="/products?category=tu">
<div className="aspect-square bg-surface-beige rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-[1.02] shadow-sm group-hover:shadow-md">
<img className="w-full h-full object-cover" alt="Tủ" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAI4yP8GMsBqfUcHE5DuTcIZIG6YawnqUS0pv4sixOml5vPfQzjZtgYN6Zfq_JhYfMGvMEwAWjTzuj99s6KzuIv2J-1rpeBt4S-g0uuxqBiqQ5s6Erx6HuCAg26ORBnY6cmRJVCnXPrejBvwzjrFOpbOMQHWhiAeRvitMyRrm5gdMhOPXy5inj72lFSpst1abQ18GokeTwoBsfdyMzMdum-mn9sqHwvu_RO9u3gTZAZTaXn485UqTlbpSz_iuKR-eDJpI9UiYjXGOM" />
</div>
<span className="font-label-lg text-label-lg text-on-surface group-hover:text-accent-terracotta transition-colors">Tủ</span>
</Link>
<Link className="group block text-center space-y-4" to="/products?category=den">
<div className="aspect-square bg-surface-beige rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-[1.02] shadow-sm group-hover:shadow-md">
<img className="w-full h-full object-cover" alt="Đèn" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDA2RTQPBKl9I_yPfKU4CXM8i2EJbyOAk6awuSi_iMoOCPxj0d1zQ3uRCOaA6Q3rYJxidGQdUEMftucwWH057C1HEUUF04_nASzgpgG418zUDUL0Q9_vzLJoGcQ8wdN7cj6smgesCxB4MPDfNMMNkUIvS2yOFpU_dM1vWpuhwTbM22B4GihUp70XpfGr_wETXOgWcPBJ7lfcxl--Q6krBv0LfbPhsbmVjimP4NfgBVH2rXwk52g32ZOV7GaIHxWOUZRyDdAiiHpnDU" />
</div>
<span className="font-label-lg text-label-lg text-on-surface group-hover:text-accent-terracotta transition-colors">Đèn</span>
</Link>
</ScrollReveal>
</section>
{/**/}
<section className="py-section-gap bg-surface-container-low px-margin-desktop">
<div className="max-w-container-max mx-auto">
<ScrollReveal>
<div className="flex flex-col md:flex-row md:items-end justify-between mb-16 space-y-4 md:space-y-0">
<div>
<span className="text-accent-gold font-label-lg uppercase tracking-widest mb-4 block">Xu hướng mới</span>
<h2 className="font-headline-lg text-headline-lg text-primary">Bộ sưu tập Heritage 2024</h2>
</div>
<Link className="font-label-lg text-label-lg text-primary border-b border-primary pb-1 hover:text-accent-terracotta transition-all" to="/products">Xem tất cả sản phẩm</Link>
</div>
</ScrollReveal>

{loading ? (
  <div className="flex justify-center items-center py-20">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
) : error ? (
  <div className="text-center py-20 text-error font-body-lg">
    {error}
  </div>
) : (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
    {products.slice(0, 4).map((product, index) => (
      <ScrollReveal key={product.id} delay={index * 100}>
      <Link to={`/products/${product.id}`} className="group cursor-pointer block">
        <div className="relative aspect-[4/5] overflow-hidden mb-6 bg-surface-beige">
          <img 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            src={getStaticFileUrl(product.imageUrl || (product.images && product.images.length > 0 ? product.images[0] : null)) || 'https://placehold.co/400x500?text=No+Image'} 
            alt={product.name} 
          />
          <WishlistButton 
            productId={product.id} 
            initialIsActive={wishlistIds.includes(product.id)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 hover:text-accent-terracotta"
            iconClassName="text-[20px]"
          />
          <button onClick={(e) => { e.preventDefault(); /* addToCart(product) if imported */ }} className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-white text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg translate-y-4 group-hover:translate-y-0 hover:text-accent-terracotta">
            <span className="material-symbols-outlined" data-icon="shopping_cart">shopping_cart</span>
          </button>
        </div>
        <h3 className="font-headline-md text-[20px] text-primary mb-2">{product.name}</h3>
        <p className="font-body-md text-on-surface-variant text-muted">{formatPrice(product.price)}</p>
      </Link>
      </ScrollReveal>
    ))}
  </div>
)}
</div>
</section>
{/**/}
<section className="py-section-gap px-margin-desktop overflow-hidden">
<div className="max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-12 gap-gutter items-center">
<ScrollReveal className="md:col-span-5 space-y-8">
<span className="text-accent-terracotta font-label-lg uppercase tracking-widest block">Lookbook Nội Thất</span>
<h2 className="font-display-lg text-display-lg text-primary leading-tight">Chương mới của nghệ thuật sống</h2>
<p className="font-body-lg text-body-lg text-on-surface-variant">Bộ sưu tập "Cảm hứng Đông Dương" tái hiện những giá trị truyền thống qua lăng kính tối giản hiện đại. Mỗi món đồ không chỉ là nội thất, mà là một tác phẩm nghệ thuật kể câu chuyện riêng về sự tinh tế.</p>
<Link className="inline-block border-b-2 border-primary pb-2 font-label-lg text-label-lg text-primary hover:text-accent-gold hover:border-accent-gold transition-all duration-300" to="/products">Khám phá BST Indochine</Link>
</ScrollReveal>
<div className="md:col-span-7 grid grid-cols-2 gap-6 items-start">
<ScrollReveal delay={100} className="masonry-item">
<img className="w-full h-[500px] object-cover rounded-sm shadow-xl" data-alt="A vertical editorial shot of a living room corner. It features a woven cane screen, a large terracotta floor vase, and a low wooden bench. The lighting is soft and golden, characteristic of late afternoon sun, creating a warm, nostalgic Vietnamese atmosphere with a modern luxury twist." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxdcTUyKONKXYiC1y6EgQ2ujVXNjvnEOstHIf546Acm_z444ntWg-rhwzcFZhXBIBC5y5WWXs-m7qCjnn8_Wu4ibuc3sEMwXYXd4uShmpPkRbsTyUI8myx8CF3QVAx0SgtVhuQ8v5oREV8OGGLeMW46HisqgbcEn14NCfsgrPYCcX5rA_zic2tNUZISTdAz_HreKaORdTelxoRXIetblh6j1N1CNNYRFWcQk456IYNOD29U5FcZFld6Kqk2Ms5r53xkQMTJt1rH10" />
</ScrollReveal>
<ScrollReveal delay={200} className="masonry-item">
<img className="w-full h-[400px] object-cover rounded-sm shadow-xl" data-alt="A minimalist setting showing a circular stone table with a single tea set. The background is a texture-heavy ivory wall. The composition is off-center, typical of modern luxury interior photography, emphasizing whitespace and organic shapes. The mood is tranquil and sophisticated." src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8b94P09QOnsDtlPOFkSfZD4zc0k76Bioyhq2TDQB4YIR3S9_HxnI7gXsHMFyWFRL2QJVD8FIvOd3dgjvxdhbpDCBJwJlDubQdAUG9wKkuzV7tL8X-KAD2Px6XiBhq3AFTtorTxFgVY8Q9p1k2DceNf4Q1gGPs1-l59mUD-dhdgj8CzyVCqsnXl29RxZugnNpfRvLh4I8fuIZjcQ5hbacV72bUivcxTvy5x7dzDcF6WVOMOLNpmPFeINJdWecxc3D1zw6pUVj91ks" />
</ScrollReveal>
</div>
</div>
</section>
{/**/}
<section className="relative w-full h-[600px] flex items-center justify-center overflow-hidden">
<img className="absolute inset-0 w-full h-full object-cover grayscale-[20%]" data-alt="A wide-angle shot of a high-end architectural firm's interior studio. Architects are seen in the distance working on blueprints at large light wood tables. The space is filled with natural light, glass partitions, and physical architectural models. The overall aesthetic is professional, creative, and luxurious, showcasing an environment of expert design." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAuZ-4fplJaqFpFhobxtK_KByBbd8kKIw5lEpburQJa_D2P0MYSigGseNMd0P4LFNatbhOP-7KstWzsYOEQKKotR20fFbAfsZtehFIzUwEGPofBhLBtvUbqePwoZ6lFkhmRsoUempVTFgtvatGRn0JI34POsZh0tzcKA51lC_GCp5PBEYDdWZ6gUlVJVvXdFCs-f-IGopjniJWghN4_udsF1kFSXO0s96fXo83hFGPbmOGaNQ6LC9qOFqaOT5EGFCjt8uljvFPgPMA" style={{ transform: `translateY(${Math.min(offsetY * 0.05, 20)}px)` }} />
<div className="absolute inset-0 bg-primary/30 backdrop-blur-[2px]"></div>
<ScrollReveal className="relative z-10 text-center text-white px-margin-mobile">
<h2 className="font-display-lg text-display-lg mb-8">Thiết kế nội thất trọn gói</h2>
<p className="font-body-lg text-body-lg mb-10 max-w-2xl mx-auto text-white/90">Chúng tôi đồng hành cùng bạn từ bản vẽ sơ phác đến khi hoàn thiện không gian sống mơ ước, đảm bảo sự tinh hoa trong từng chi tiết.</p>
<Link to="/design-service#consultation" className="inline-block px-12 py-5 bg-accent-gold text-on-primary font-label-lg text-label-lg uppercase tracking-widest hover:bg-secondary transition-all shadow-xl active:scale-95">
                    Đặt lịch tư vấn
                </Link>
</ScrollReveal>
</section>
{/**/}
<section className="py-section-gap px-margin-desktop max-w-container-max mx-auto">
<ScrollReveal className="text-center mb-16">
<span className="text-accent-gold font-label-lg uppercase tracking-widest mb-4 block">Blog kiến thức</span>
<h2 className="font-headline-lg text-headline-lg text-primary">Cảm hứng không gian</h2>
</ScrollReveal>
<div className="grid grid-cols-1 md:grid-cols-3 gap-10">
{/**/}
<ScrollReveal delay={100}>
<Link to="/blogs/toi-gian-nhung-am-ap-xu-huong-noi-that-2024" className="group cursor-pointer block">
<article>
<div className="aspect-[16/10] overflow-hidden mb-6">
<img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" data-alt="A modern lifestyle image showing a beautifully curated living room with soft lighting. An open book and a cup of coffee sit on a marble table. In the background, a person is partially visible, relaxing. The mood is cozy, lived-in luxury, emphasizing the brand's commitment to comfort and style." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCM7TKUPwsrPYOZrZUr_5FmXq0v0oD4rzUfo-08Ra02zJIt9-3hzgVq9QJwLhnYAdvuYUxYzs6a0Atawl_1cp4iQdPM6vnniGbZ8VT2Ga-Jc8ZQQr9PxqwzAeoy-MdrRmGoYo1R8HZfNnKPFa0JMRlz6GoRxb47hQpN8-K261icFbAYdEds31Cc7CTQ623UYhNlgYS3Ko-Udy9Zg92Jf9m0qI-jlhoynxMmlP6MXyx8GYhcO7cJAKHiDWN7yzv8uDMBUX3fRuqLMo0" />
</div>
<span className="text-on-surface-variant font-label-sm uppercase mb-3 block">Xu hướng / 15.05.2024</span>
<h3 className="font-headline-md text-[22px] text-primary mb-4 group-hover:text-accent-terracotta transition-colors">Tối giản nhưng ấm áp: Xu hướng nội thất 2024</h3>
<p className="font-body-md text-on-surface-variant line-clamp-2">Làm thế nào để giữ cho ngôi nhà tối giản mà vẫn mang lại cảm giác ấm cúng, sang trọng?</p>
</article>
</Link>
</ScrollReveal>
<ScrollReveal delay={200}>
<Link to="/blogs/suc-hut-tu-chat-lieu-go-tu-nhien-thuong-hang" className="group cursor-pointer block">
<article>
<div className="aspect-[16/10] overflow-hidden mb-6">
<img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" data-alt="A detailed shot of handcrafted wooden joinery. The lighting is moody and focused on the craftsmanship, showing the rich grain of the wood and the precision of the interlocking pieces. This image represents the dedication to quality and tradition in high-end furniture manufacturing." src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3WTlBldch1wbw6bEopVVugCLIcEV8S-auHYs1PXRUtMy-L2EdOTGCXTIDrAnUCntQuusqQgpkYRTJP0o96XyRqvwIJglfcJzqhb2imgmRXHtViKKaYdlxB--xJDS9tHcc6pGdr79xtRRYHP99UPLKNFBz5uPr4FZOE61kXg-3sNtkdM-eijDsWE6WPeXqTzJrSUgpmDQ8UNZOMrrklKHSNWUnuaS-ygHZ7cdFKkP0LhnZ8xNsO0jMEtf4gzZPTjsS-Dwesv-Q460" />
</div>
<span className="text-on-surface-variant font-label-sm uppercase mb-3 block">Chất liệu / 10.05.2024</span>
<h3 className="font-headline-md text-[22px] text-primary mb-4 group-hover:text-accent-terracotta transition-colors">Sức hút từ chất liệu gỗ tự nhiên thượng hạng</h3>
<p className="font-body-md text-on-surface-variant line-clamp-2">Khám phá lý do tại sao gỗ óc chó và gỗ sồi luôn là lựa chọn hàng đầu cho các thiết kế cao cấp.</p>
</article>
</Link>
</ScrollReveal>
<ScrollReveal delay={300}>
<Link to="/blogs/5-bi-quyet-phoi-mau-cho-phong-khach-sang-trong" className="group cursor-pointer block">
<article>
<div className="aspect-[16/10] overflow-hidden mb-6">
<img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" data-alt="A bright and airy kitchen space with modern cabinetry and high-end appliances. A large bowl of fresh lemons sits on the counter, adding a pop of color to the neutral ivory and stone palette. The lighting is clean and high-key, suggesting a healthy and luxury lifestyle." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAlW64rpRKOxGhfetX2jurAM7NJurqwTqB6EXIcC4J9gzNa2ITPEx4XHa5y3SXnqP3AWF0L1pN6dNLlmSeIfQaepGndnSMXK9ZWaB2Kth53tdZVpztzcflpWu1JAISvPPuapFMLn4PstjdQAnG6zr4L7pCj8aIjABSEthdzh_tJJ94CvtPTAyxYyrfe_sNMMA7WB311RIBcK7Jg7XtZqMMkuoZWDeACFXNGCYwspG5p_OImtaSC593dMb_FE_Pah1jHW8_tUf7tIzI" />
</div>
<span className="text-on-surface-variant font-label-sm uppercase mb-3 block">Tư vấn / 05.05.2024</span>
<h3 className="font-headline-md text-[22px] text-primary mb-4 group-hover:text-accent-terracotta transition-colors">5 Bí quyết phối màu cho phòng khách sang trọng</h3>
<p className="font-body-md text-on-surface-variant line-clamp-2">Những quy tắc vàng trong phối hợp màu sắc để tạo nên không gian sống đẳng cấp và hài hòa.</p>
</article>
</Link>
</ScrollReveal>
</div>
</section>
{/**/}


</main>
{/**/}













      </main>
      <Footer />
    </div>
  );
}