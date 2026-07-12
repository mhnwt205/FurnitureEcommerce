import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { productService } from '../services/api/productService';
import ScrollReveal from '../components/common/ScrollReveal';
import { wishlistService } from '../services/api/wishlistService';
import { useAuth } from '../context/AuthContext';
import {
  CustomerProductCard,
  LoadingProductGrid,
  PrimaryButton,
  SecondaryButton,
  SectionContainer,
  SectionTitle,
  SoftBadge
} from '../components/common/CustomerHomeUI';

const heroImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAnFNRWu99iE-KGcQhBkZEatunNd2j7PqZtKlSMA5ZhgWglgYL-kZ3Nh4aEomsW80J8Rgpt6heJcduJ2ZaHm8rO34trynGCqtCTX5KHk15fEqqEaMUGgFJboH9ZtxYkm4sms5jR5jL09Mr5rtAuc0oyl2x3Eb8xJN7QIbMjP2YJZjhDemghV1GdCpTAZ-nytb8TIP6vIV_WVJa-uDM1b0Kcg-vX0LUYMECGDE3CK5VUgH-C26wwnmYfckMvd9tCQkQyiTfl8cqlDcw';

const categoryTiles = [
  {
    name: 'Sofa',
    href: '/products?category=sofa',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxaFM62QerL1EP4PWsZlBTLAbM4Rzu3214C9s2YUF3Gu5H_YToBWpskuRd-i8-4FFu3Qy7wajO4bZXcihvk2ivUjIJUC913djnbZXF4tSZJu4WoHfX1R3DLxy3bRdr3NkD9m2bkmtQbwjTcyxf_Es-P80JiwLKWiesRXOj-pqcyxgcQPuRzZA2ZqX5pedkLhS7pWJ6eWczS7jOEzu74Kj3ely6WNB-aTXDR_abByZYEuiW9Y-sNLJM3aN_4XZTCXdluUGNca5wvQg'
  },
  {
    name: 'Bàn',
    href: '/products?category=ban',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOAwWyanIQJ_E_VLLU0T1mlBQApdnKjjPAvPo2ZUNpd-GdNxaC6SkHMVhYGjM5nC5YHw6953ZaKaqDup6eeJQgNhIa4dyNvQWuNJbAxqYU8V9o_RlOrl4uAsT2SJdxh5Or0dbCH3BVbfdF_glaSBjhgnNtdYZiKDD0AJHzy6Z3tD8LQ1RfHjG27MIe4Sve4LO40KYCCB1OmshMohsz0vMSz-ThHx1WwJJRJAeB36heBNR4kCMr40_ruHHQVKnC13TxfRDxnYMX7o'
  },
  {
    name: 'Ghế',
    href: '/products?category=ghe',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBydDOHqE8r5V2S0ehF6iuDgDrk0fvXM7RSiz9pNjnI-_JbSIXSsNi9stXhHlhAv4C4xWcFU2KgdIlfG_TEaCTaBPqX00LQm7XyKLhY7M827hQ6hRqg8iTL1vsiXjKWrSH7jkpCtLO7GLQGEfxWrhG7Zv_LqThN-QkbmWgaOsOMV9lHhgFtC3gF5-af_DiCtP0ytRFwWgozypRI_YQtNbd34PXnJ2KblncxpFwzxzOuo_HpbXMcCjQhSrk4vXd8LDkWz-0WDCzZOzU'
  },
  {
    name: 'Giường',
    href: '/products?category=giuong',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNd4aPAssL__5QteAhfPkEvpHU9RvHwbcCW2Ph8VXhC3q6aOTwGWkFS73cdxyFfvg6dL5weDYZ0HeL2VSX_1Yef_Nheb6Bi9FHv-hgiuvQHLBpHlieiV0jePQlq6RN8wKtKIE_lfZNiMV9o8sapTH3klzDG-pa6a-gJM806OwAsVmsuIR7MVcHMnyS3_mPR9rU9FsbG7m343lCofW-eUfDfGTKW9Q-33DjzRNuE4GY2reyA3g9lZHgGGwACtDSjnt3Su2TZiRa9pg'
  },
  {
    name: 'Tủ',
    href: '/products?category=tu',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAI4yP8GMsBqfUcHE5DuTcIZIG6YawnqUS0pv4sixOml5vPfQzjZtgYN6Zfq_JhYfMGvMEwAWjTzuj99s6KzuIv2J-1rpeBt4S-g0uuxqBiqQ5s6Erx6HuCAg26ORBnY6cmRJVCnXPrejBvwzjrFOpbOMQHWhiAeRvitMyRrm5gdMhOPXy5inj72lFSpst1abQ18GokeTwoBsfdyMzMdum-mn9sqHwvu_RO9u3gTZAZTaXn485UqTlbpSz_iuKR-eDJpI9UiYjXGOM'
  },
  {
    name: 'Đèn',
    href: '/products?category=den',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDA2RTQPBKl9I_yPfKU4CXM8i2EJbyOAk6awuSi_iMoOCPxj0d1zQ3uRCOaA6Q3rYJxidGQdUEMftucwWH057C1HEUUF04_nASzgpgG418zUDUL0Q9_vzLJoGcQ8wdN7cj6smgesCxB4MPDfNMMNkUIvS2yOFpU_dM1vWpuhwTbM22B4GihUp70XpfGr_wETXOgWcPBJ7lfcxl--Q6krBv0LfbPhsbmVjimP4NfgBVH2rXwk52g32ZOV7GaIHxWOUZRyDdAiiHpnDU'
  }
];

const inspirationImages = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBxdcTUyKONKXYiC1y6EgQ2ujVXNjvnEOstHIf546Acm_z444ntWg-rhwzcFZhXBIBC5y5WWXs-m7qCjnn8_Wu4ibuc3sEMwXYXd4uShmpPkRbsTyUI8myx8CF3QVAx0SgtVhuQ8v5oREV8OGGLeMW46HisqgbcEn14NCfsgrPYCcX5rA_zic2tNUZISTdAz_HreKaORdTelxoRXIetblh6j1N1CNNYRFWcQk456IYNOD29U5FcZFld6Kqk2Ms5r53xkQMTJt1rH10',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA8b94P09QOnsDtlPOFkSfZD4zc0k76Bioyhq2TDQB4YIR3S9_HxnI7gXsHMFyWFRL2QJVD8FIvOd3dgjvxdhbpDCBJwJlDubQdAUG9wKkuzV7tL8X-KAD2Px6XiBhq3AFTtorTxFgVY8Q9p1k2DceNf4Q1gGPs1-l59mUD-dhdgj8CzyVCqsnXl29RxZugnNpfRvLh4I8fuIZjcQ5hbacV72bUivcxTvy5x7dzDcF6WVOMOLNpmPFeINJdWecxc3D1zw6pUVj91ks',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAuZ-4fplJaqFpFhobxtK_KByBbd8kKIw5lEpburQJa_D2P0MYSigGseNMd0P4LFNatbhOP-7KstWzsYOEQKKotR20fFbAfsZtehFIzUwEGPofBhLBtvUbqePwoZ6lFkhmRsoUempVTFgtvatGRn0JI34POsZh0tzcKA51lC_GCp5PBEYDdWZ6gUlVJVvXdFCs-f-IGopjniJWghN4_udsF1kFSXO0s96fXo83hFGPbmOGaNQ6LC9qOFqaOT5EGFCjt8uljvFPgPMA'
];

const categoryFallbackImages = {
  ban: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVW_FINLUajHzFyzX2X5cS9xGsFCwlFsEGFfPK4c-zD1aRUP618SNsTdHv4heEM7xr55eDXOZ0AjXLaNqsokDjBdADGCRP4Gqnp76GpZnasEaD1WcsxMpEu4fEdFk-yGKh61Ot575TilS4O4D7_XU-LzynRBt283s0UngwxBrHS46DzdJGiuuVx5QM1oqXYzufb8GzXw4bBsMsFNqtg0nE9ETpTGpXh1RLOT5AqPKPvlBCnOb3-enYOdd_z-Z0JY3xXm5H8X0jKEo',
  table: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVW_FINLUajHzFyzX2X5cS9xGsFCwlFsEGFfPK4c-zD1aRUP618SNsTdHv4heEM7xr55eDXOZ0AjXLaNqsokDjBdADGCRP4Gqnp76GpZnasEaD1WcsxMpEu4fEdFk-yGKh61Ot575TilS4O4D7_XU-LzynRBt283s0UngwxBrHS46DzdJGiuuVx5QM1oqXYzufb8GzXw4bBsMsFNqtg0nE9ETpTGpXh1RLOT5AqPKPvlBCnOb3-enYOdd_z-Z0JY3xXm5H8X0jKEo'
};

const normalizeCategoryKey = (value = '') => value
  .toString()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .trim();

const getCategorySlugFromHref = (href = '') => {
  const match = href.match(/[?&]category=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : '';
};

const getCategoryImageCandidates = (category) => {
  const slugKey = normalizeCategoryKey(category?.slug || getCategorySlugFromHref(category?.href));
  const nameKey = normalizeCategoryKey(category?.name);
  const fallbackImage = categoryFallbackImages[slugKey] || categoryFallbackImages[nameKey];

  return [category?.image, category?.imageUrl, category?.thumbnail, fallbackImage].filter(Boolean);
};

function CategoryTileImage({ category }) {
  const [imageIndex, setImageIndex] = useState(0);
  const imageCandidates = getCategoryImageCandidates(category);
  const imageSrc = imageCandidates[imageIndex];
  const initial = category.name?.trim()?.charAt(0) || 'H';

  if (!imageSrc) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#eee6d8] px-3 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-md border border-primary/15 bg-white/65 text-xl font-semibold text-[#333333]">
          {initial}
        </span>
        <span className="text-sm font-semibold text-[#333333]">{category.name}</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={`Danh mục ${category.name}`}
      className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.035]"
      loading="lazy"
      onError={() => setImageIndex((currentIndex) => currentIndex + 1)}
    />
  );
}

const reviews = [
  {
    name: 'Minh Anh',
    space: 'Căn hộ Thảo Điền',
    quote: 'Sofa và bàn trà lên nhà rất vừa vặn. Màu gỗ dịu, nhìn ngoài còn đẹp hơn ảnh.'
  },
  {
    name: 'Quốc Huy',
    space: 'Nhà phố Bình Thạnh',
    quote: 'Đội tư vấn giúp tôi chọn đúng kích thước phòng khách. Tổng thể gọn, ấm và dễ sống.'
  },
  {
    name: 'Lan Chi',
    space: 'Villa Đà Lạt',
    quote: 'Các chi tiết hoàn thiện chỉn chu. Không gian sau lắp đặt có cảm giác rất yên tĩnh.'
  }
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wishlistIds, setWishlistIds] = useState([]);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchWishlistIds = async () => {
      if (!isAuthenticated) {
        setWishlistIds([]);
        return;
      }

      try {
        const res = await wishlistService.getWishlistIds();
        if (res?.ids) setWishlistIds(res.ids);
      } catch (wishlistError) {
        console.error('Failed to fetch wishlist ids', wishlistError);
      }
    };

    fetchWishlistIds();
  }, [isAuthenticated]);

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
        setError(err.message || 'Không thể tải sản phẩm. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const featuredProducts = products.slice(0, 4);
  const promotedProducts = products.filter(product => product.hasPromotion).slice(0, 3);
  const promotionShowcase = promotedProducts.length > 0 ? promotedProducts : products.slice(0, 3);

  return (
    <div className="min-h-screen bg-white text-[#434343]">
      <Header />
      <main className="w-full max-w-full overflow-x-hidden">
        <section className="relative min-h-[560px] overflow-hidden bg-[#1f1b18] text-[#2f2f2f] md:min-h-[72vh] lg:min-h-[76vh]">
          <img
            className="absolute inset-0 h-full w-full object-cover object-center opacity-100 md:object-[center_right]"
            src={heroImage}
            alt="Phòng khách hiện đại với sofa linen, bàn gỗ tối màu và ánh sáng tự nhiên"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(31,27,24,0.48)_0%,rgba(31,27,24,0.24)_34%,rgba(31,27,24,0.06)_58%,rgba(31,27,24,0)_78%)]" />
          <div className="relative z-10 mx-auto flex min-h-[560px] w-full max-w-container-max items-center px-5 py-14 md:min-h-[72vh] md:px-10 md:py-16 lg:min-h-[76vh] lg:px-16">
            <ScrollReveal className="w-full max-w-[560px] text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.28)]">
              <p className="mb-4 text-sm font-medium tracking-[0.12em] text-[#E7D5C4]">Heritage Home Studio</p>
              <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-white md:text-5xl lg:text-[56px]">
                Nội thất giữ nhịp sống chậm
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-[#F4EFE8] md:text-lg">
                Chọn sofa, bàn, đèn và giải pháp thiết kế cho một tổ ấm ấm áp, gọn ghẽ, bền theo thời gian.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <PrimaryButton to="/products" className="border-[#333333] bg-[#333333] text-white hover:bg-[#4A3A31]">
                  Xem bộ sưu tập
                </PrimaryButton>
                <SecondaryButton to="/design-service" className="border-white/80 bg-white text-[#333333] shadow-none hover:border-white hover:bg-[#FAFAF8]">
                  Tư vấn không gian
                </SecondaryButton>
              </div>
            </ScrollReveal>
          </div>
        </section>
        <SectionContainer>
          <SectionTitle
            title="Bắt đầu từ căn phòng bạn yêu nhất"
            description="Mỗi danh mục được chọn lọc theo tỷ lệ, chất liệu và cảm giác sử dụng hằng ngày. Ít món hơn, đúng món hơn."
          />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {categoryTiles.map((category, index) => (
              <ScrollReveal key={category.name} delay={index * 60}>
                <Link to={category.href} className="group block">
                  <div className="overflow-hidden rounded-lg border border-[#E8E4DD] bg-white transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-[#D8D2C8]">
                    <div className="aspect-[4/5] overflow-hidden bg-[#F7F5F1]">
                      <CategoryTileImage category={category} />
                    </div>
                    <div className="flex items-center justify-between px-3 py-3">
                      <span className="font-semibold text-[#333333]">{category.name}</span>
                      <span className="material-symbols-outlined text-[18px] text-[#999999] transition-transform group-hover:translate-x-1">arrow_forward</span>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </SectionContainer>
        <SectionContainer surface="soft">
          <SectionTitle
            eyebrow="Sản phẩm chọn lọc"
            title="Những thiết kế đang được yêu thích"
            description="Giá hiển thị lấy trực tiếp từ hệ thống sản phẩm, bao gồm khuyến mãi đang hiệu lực nếu có."
            action={<SecondaryButton to="/products">Xem tất cả</SecondaryButton>}
          />
          {loading ? (
            <LoadingProductGrid />
          ) : error ? (
            <div className="rounded-xl border border-error/20 bg-white px-6 py-10 text-center text-error">{error}</div>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product, index) => (
                <ScrollReveal key={product.id} delay={index * 90}>
                  <CustomerProductCard product={product} isWishlisted={wishlistIds.includes(product.id)} />
                </ScrollReveal>
              ))}
            </div>
          )}
        </SectionContainer>

        <SectionContainer className="py-14 md:py-20 lg:py-24">
          <div className="grid items-stretch gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <ScrollReveal className="rounded-lg border border-[#E8E4DD] bg-[#FAFAF8] p-7 text-[#333333] md:p-10">
              <SoftBadge className="border-[#E8E4DD] bg-white text-[#7A5C49]">Ưu đãi hiện hành</SoftBadge>
              <h2 className="mt-6 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.02em] text-[#333333] md:text-4xl">
                Giá tốt hơn, vẫn giữ nguyên chất liệu và tỉ lệ.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-[#666666]">
                Các chương trình khuyến mãi được tính tự động theo thời gian hiệu lực, ưu tiên và sản phẩm áp dụng.
              </p>
              <div className="mt-10">
                <PrimaryButton to="/promotions" className="border-[#333333] bg-[#333333] text-white hover:bg-[#4A3A31]">
                  Xem khuyến mãi
                </PrimaryButton>
              </div>
            </ScrollReveal>

            <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-1">
              {promotionShowcase.map((product, index) => (
                <ScrollReveal key={product.id} delay={index * 80}>
                  <CustomerProductCard
                    product={product}
                    isWishlisted={wishlistIds.includes(product.id)}
                    variant="compact"
                  />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </SectionContainer>

        <SectionContainer>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <ScrollReveal className="space-y-6">
              <SectionTitle
                title="Gợi ý nội thất theo phong cách sống"
                description="Trợ lý AI hỗ trợ chọn sản phẩm theo ngân sách, diện tích, chất liệu và thói quen sinh hoạt của gia đình."
              />
              <div className="grid gap-4 sm:grid-cols-3">
                {['Ngân sách', 'Diện tích', 'Phong cách'].map((item) => (
                  <div key={item} className="rounded-lg border border-[#E8E4DD] bg-white p-5">
                    <p className="text-sm font-semibold text-[#333333]">{item}</p>
                    <p className="mt-2 text-sm leading-6 text-[#666666]">Gợi ý được cân nhắc theo dữ liệu sản phẩm hiện có.</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
            <ScrollReveal delay={120} className="rounded-lg border border-[#E8E4DD] bg-[#FAFAF8] p-5 md:p-7">
              <div className="rounded-lg border border-[#E8E4DD] bg-white p-6 shadow-none">
                <div className="flex items-center gap-3 border-b border-[#E8E4DD] pb-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#333333] text-white">
                    <span className="material-symbols-outlined text-[20px]">support_agent</span>
                  </span>
                  <div>
                    <p className="font-semibold text-[#333333]">AI Tư vấn nội thất</p>
                    <p className="text-sm text-[#666666]">Đề xuất theo giá sau khuyến mãi</p>
                  </div>
                </div>
                <div className="space-y-3 pt-5 text-sm leading-6 text-[#666666]">
                  <p className="rounded-md bg-[#FAFAF8] p-4 text-[#434343]">Tôi cần sofa dưới 10 triệu cho phòng khách nhỏ.</p>
                  <p className="rounded-md border border-[#E8E4DD] p-4">Hệ thống sẽ ưu tiên sản phẩm có giá finalPrice phù hợp và còn hiệu lực khuyến mãi.</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </SectionContainer>

        <SectionContainer surface="soft">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <ScrollReveal>
              <img
                src={inspirationImages[2]}
                alt="Studio thiết kế nội thất với bàn làm việc, mô hình và ánh sáng tự nhiên"
                className="h-[360px] w-full rounded-lg object-cover md:h-[520px]"
                loading="lazy"
              />
            </ScrollReveal>
            <ScrollReveal delay={120} className="rounded-lg border border-[#E8E4DD] bg-white p-7 md:p-10">
              <SectionTitle
                title="Từ bản vẽ đến căn phòng hoàn thiện"
                description="Đội ngũ thiết kế đồng hành cùng bạn trong việc đo đạc, phối vật liệu và chọn sản phẩm phù hợp với nhịp sống thật."
              />
              <div className="grid gap-4 sm:grid-cols-3">
                {['Đo đạc', 'Phối cảnh', 'Lắp đặt'].map((step) => (
                  <div key={step} className="border-t border-[#E8E4DD] pt-4">
                    <p className="font-semibold text-[#333333]">{step}</p>
                    <p className="mt-2 text-sm leading-6 text-[#666666]">Rõ ràng, tiết chế và bám sát không gian.</p>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <PrimaryButton to="/design-service#consultation">Đặt lịch tư vấn</PrimaryButton>
              </div>
            </ScrollReveal>
          </div>
        </SectionContainer>

        <SectionContainer>
          <SectionTitle
            title="Cảm hứng từ những không gian đã hoàn thiện"
            description="Các dự án được xây dựng bằng cùng một tinh thần: ít chi tiết thừa, vật liệu thật, ánh sáng mềm và công năng rõ."
            action={<SecondaryButton to="/featured-projects">Xem dự án</SecondaryButton>}
          />
          <div className="grid gap-5 md:grid-cols-12">
            <ScrollReveal className="md:col-span-7">
              <Link to="/featured-projects" className="group block overflow-hidden rounded-lg bg-[#F7F5F1]">
                <img
                  src={inspirationImages[0]}
                  alt="Góc phòng khách với bình gốm, ghế gỗ và ánh sáng chiều"
                  className="h-[420px] w-full object-cover transition-transform duration-700 group-hover:scale-[1.035] md:h-[520px]"
                  loading="lazy"
                />
              </Link>
            </ScrollReveal>
            <div className="grid gap-5 md:col-span-5">
              <ScrollReveal delay={80}>
                <Link to="/featured-projects" className="group block overflow-hidden rounded-lg bg-[#F7F5F1]">
                  <img
                    src={inspirationImages[1]}
                    alt="Bàn trà đá tròn trong không gian tối giản"
                    className="h-[230px] w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                    loading="lazy"
                  />
                </Link>
              </ScrollReveal>
              <ScrollReveal delay={160} className="rounded-lg border border-[#E8E4DD] bg-white p-7">
                <p className="text-2xl font-semibold tracking-[-0.02em] text-[#333333] md:text-3xl">Không gian tốt bắt đầu từ tỉ lệ đúng.</p>
                <p className="mt-4 leading-7 text-[#666666]">Chúng tôi ưu tiên sự vừa vặn, ánh sáng và cảm giác sử dụng trước mọi chi tiết trang trí.</p>
              </ScrollReveal>
            </div>
          </div>
        </SectionContainer>

        <SectionContainer surface="soft">
          <SectionTitle
            title="Khách hàng nói về không gian của họ"
            description="Những phản hồi ngắn sau khi sản phẩm được đưa vào nhịp sống hằng ngày."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {reviews.map((review, index) => (
              <ScrollReveal key={review.name} delay={index * 90}>
                <article className="flex h-full flex-col justify-between rounded-lg border border-[#E8E4DD] bg-white p-7">
                  <p className="text-base leading-8 text-[#434343]">“{review.quote}”</p>
                  <div className="mt-7 border-t border-[#E8E4DD] pt-5">
                    <p className="font-semibold text-[#333333]">{review.name}</p>
                    <p className="mt-1 text-sm text-[#666666]">{review.space}</p>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </SectionContainer>
      </main>
      <Footer />
    </div>
  );
}