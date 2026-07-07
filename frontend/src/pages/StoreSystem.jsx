import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import ScrollReveal from '../components/common/ScrollReveal';

const heroImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7RMBItC6aJJA3iltd15eNdOXMZeqxOqWF2g5sr0AQ4nPwWJ4hPHVF9aM7teqQ7_C1uXBeEHMrLNHu0Bl4ZxOnbyTxh1l_-tEedQcxTA4rml4ABKth4iVllnlrMFf6WMgDdTUa4SMkJdsIUFkYI1BkfB5uaqvoHQEeetWUijofVhzdP4tvLpxR06hTZlnTWAwLE6NuDj7J4PSl94GmIPW0L9isKw77mUo0aT_EqVy_IoPWGNZVioFOSanoIBI_E1r5QGnmtlHMIAg';
const mapImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuADSY36lfl06fQ0-wvsgST1iZPnXuVn4FsRwtiuMX_8eLUKXb954s7WG_jxXFrdVhOhBE-tjgoVDvwLTt9yhKm5SuL6h1HAQ6SaSuVR3kS-TKi568ga0INUCgt-7WgUQClClKBCLl0Nn9K_7UeCdeII7NnRd79_0RlCZP2IDwUEB7FE4amyK6jrmg29_5-DyUyMr2vKMtrB3gStu21-0yO0qb_kum-0JPeBFoUeI7wGorWUjwgDijOcyzPzebwvLIHwZPQOIvHlEKc';

const stores = [
  {
    id: 'hcm',
    city: 'TP. Hồ Chí Minh',
    name: 'Heritage District 1',
    badge: 'Flagship',
    address: '123 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM',
    area: '1,200m²',
    parking: 'Bãi đỗ ô tô',
    hours: '08:00 - 21:00',
    phone: '0281234567',
    email: 'hcm@heritage.vn',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBkjoyiJJH6TB4MKWhsPhqZLo04FvIcQLf5kvc3dLUVnc51m6Jwvj5LY5PH5dq5s6o1fkZLHgaMnEm47ftvmx9V_0zxkXEXoGXxsMSUdj5_eh8vrSG3ZRAsE115T18OS8FkQL1rgq-TFRi2LM2EFJfIU1E02cf_GYNiRjLc7CUObbw34nSksGw1EIWzZ3thkkc7_k7Mx93K029l7gG9Wuff8C4zfypGvlKrJobzuBFLH90duNNsOqTV0lACJIFyOc5Q0rkfkTZwlF8'
  },
  {
    id: 'hanoi',
    city: 'Hà Nội',
    name: 'Heritage Hoan Kiem',
    address: '45 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội',
    area: '850m²',
    parking: 'Bãi đỗ xe máy',
    hours: '09:00 - 20:00',
    phone: '0241234567',
    email: 'hn@heritage.vn',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjZSlt2IMaeG_UbndxOH93OAjH2qVBtuyEoZT6zTI3oKMfre3tUhntngd1ZfDvOQweFByXhKAY1mUk89ZudNKGEKHugWGdEdj-8S_vzXHHoTj2SjHMdC9eeDfbimdjPYfAr-uvYQhDdiJFZcK5E1h9dBdyEZ6ilxTNgZBzOmVAyiXAl3zQ9CixgPcfKwSo2PEYa5zkr0eeeE2crRSk1H6A6JWKG7QzHUP1I9ZxQeR2_msevJEU12a-H3nUxwKxeyFPheqfsTdUxoQ'
  },
  {
    id: 'hungyen',
    city: 'Hưng Yên',
    name: 'Heritage Concept Ecopark',
    address: 'Khu đô thị Ecopark, Xuân Quan, Hưng Yên',
    area: '1,500m²',
    parking: 'Bãi đỗ ô tô',
    hours: '08:30 - 18:30',
    phone: '0221234567',
    email: 'ecopark@heritage.vn',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtx4uzAqaOOmDt8r_SykWMMkd4HqE-FTkT0f0hk9IwOl23Kr00yxLgicGrc_7dcstOzFHpBjYvECDDBaj6pp9FTyVG5PuF16_I-hP6h7f4UEIwATHNR-tqpdllHFDFckfTq6R7lFPeFge4S9yl1Ku1zlO5RLFLFowBF6J8ISqPt1J5j-6LD5HWNYIDfKJlyAQR9rlV2PjdS0r7JS8YXKIdpxNNDNeik1uw8uRCMeWy1CgaaB2FNlOX03KmH3BmLcoJSPXlmjbaWfI'
  }
];

const cityFilters = [
  { value: 'all', label: 'Tất cả' },
  { value: 'hcm', label: 'TP. Hồ Chí Minh' },
  { value: 'hanoi', label: 'Hà Nội' },
  { value: 'hungyen', label: 'Hưng Yên' }
];

export default function StoreSystem() {
  const [activeCity, setActiveCity] = useState('all');
  const filteredStores = useMemo(() => (
    activeCity === 'all' ? stores : stores.filter(store => store.id === activeCity)
  ), [activeCity]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white text-[#333333]">
      <Header />
      <main className="flex-grow">
        <section className="relative overflow-hidden">
          <img className="absolute inset-0 h-full w-full object-cover object-center opacity-100" alt="Không gian showroom nội thất" src={heroImage} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.44)_0%,rgba(0,0,0,0.20)_36%,rgba(0,0,0,0.05)_62%,rgba(0,0,0,0)_82%)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(0deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0)_75%)]" />
          <div className="relative mx-auto flex min-h-[420px] max-w-[1200px] items-end px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
            <ScrollReveal className="max-w-2xl text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.28)]">
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/85">Hệ thống cửa hàng</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">Trải nghiệm sản phẩm tại showroom</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/90">Khám phá không gian trưng bày, chất liệu và tỉ lệ sản phẩm trực tiếp tại các showroom hiện có.</p>
            </ScrollReveal>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <ScrollReveal className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-[#333333]">Danh sách showroom</h2>
              <p className="mt-3 text-sm leading-6 text-[#777777]">{filteredStores.length} showroom được tìm thấy.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {cityFilters.map(filter => (
                <button key={filter.value} type="button" onClick={() => setActiveCity(filter.value)} className={`shrink-0 rounded-[8px] border px-4 py-2 text-sm font-semibold transition-colors ${activeCity === filter.value ? 'border-[#333333] bg-[#333333] text-white' : 'border-[#dddddd] bg-white text-[#555555] hover:border-[#bfa37c] hover:text-[#333333]'}`}>
                  {filter.label}
                </button>
              ))}
            </div>
          </ScrollReveal>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(360px,0.72fr)]">
            <div className="space-y-4">
              {filteredStores.map((store, index) => (
                <ScrollReveal key={store.id} delay={(index + 1) * 80}>
                  <article className="group rounded-[12px] border border-[#e5e5e5] bg-white p-4 transition-colors hover:border-[#bfa37c]">
                    <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
                      <div className="aspect-square overflow-hidden rounded-[10px] bg-[#f3f3f1]">
                        <img className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" src={store.image} alt={store.name} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-[#777777]">{store.city}</p>
                            <h3 className="mt-1 text-lg font-bold text-[#333333]">{store.name}</h3>
                          </div>
                          {store.badge && <span className="ui-badge">{store.badge}</span>}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#666666]">{store.address}</p>
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#777777]">
                          <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">straighten</span>{store.area}</span>
                          <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">local_parking</span>{store.parking}</span>
                          <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">schedule</span>{store.hours}</span>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#eeeeee] pt-4">
                          <a className="ui-button-secondary px-3 py-2 text-xs" href={`tel:${store.phone}`}>Gọi điện</a>
                          <a className="ui-button-secondary px-3 py-2 text-xs" href={`mailto:${store.email}`}>Email</a>
                          <a className="ui-button-primary px-3 py-2 text-xs" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`} target="_blank" rel="noreferrer">Chỉ đường</a>
                        </div>
                      </div>
                    </div>
                  </article>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={120} className="overflow-hidden rounded-[12px] border border-[#e5e5e5] bg-[#f7f7f5] lg:sticky lg:top-24 lg:h-[620px]">
              <div className="relative h-[360px] lg:h-full">
                <img className="h-full w-full object-cover grayscale opacity-70 transition-all duration-700 hover:grayscale-0 hover:opacity-90" src={mapImage} alt="Bản đồ khu vực showroom" />
                <div className="absolute left-[44%] top-[58%] rounded-full bg-[#333333] p-2 text-white shadow-[0_10px_30px_rgba(0,0,0,0.12)]"><span className="material-symbols-outlined">location_on</span></div>
                <div className="absolute bottom-5 left-5 right-5 rounded-[10px] border border-white/60 bg-white/95 p-4">
                  <p className="text-sm font-bold text-[#333333]">Tìm showroom gần bạn</p>
                  <p className="mt-1 text-xs leading-5 text-[#777777]">Dùng nút chỉ đường trên từng showroom để mở bản đồ với địa chỉ tương ứng.</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section className="bg-[#f7f7f5] py-16 lg:py-20">
          <div className="mx-auto grid max-w-[1200px] gap-6 px-4 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center lg:px-8">
            <ScrollReveal>
              <h2 className="text-3xl font-bold text-[#333333]">Nhận tư vấn thiết kế tại nhà</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#777777]">Đội ngũ thiết kế sẽ trao đổi nhu cầu và đề xuất giải pháp nội thất phù hợp với không gian của bạn.</p>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <Link to="/design-service#consultation" className="ui-button-primary inline-flex px-6 py-3 text-sm">Gửi yêu cầu</Link>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}


