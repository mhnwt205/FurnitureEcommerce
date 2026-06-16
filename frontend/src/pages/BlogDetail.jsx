import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { blogDetailsData } from '../data/blogDetailsData';

const Template1 = () => (<div className="w-full">
<article className="w-full mx-auto mb-section-gap">
<div className="flex flex-col gap-stack-lg">
<p className="font-body-lg text-body-lg text-primary italic border-l-4 border-accent-gold pl-6 leading-relaxed">
                    "Tại Heritage Home, chúng tôi tin rằng mỗi vân gỗ là một bản giao hưởng của thời gian. Sự sang trọng thực sự không nằm ở sự hào nhoáng, mà nằm ở tính bền vững và sự kết nối giữa con người với thiên nhiên."
                </p>
<div className="grid grid-cols-1 md:grid-cols-2 gap-gutter items-center my-stack-lg">
<div className="order-2 md:order-1">
<h2 className="font-headline-md text-headline-md text-primary mb-stack-md">Gỗ Óc Chó: Đẳng cấp từ sự tĩnh lặng</h2>
<p className="text-on-surface-variant mb-stack-md leading-relaxed">
                            Gỗ óc chó (Walnut) luôn là ưu tiên hàng đầu trong các thiết kế hiện đại nhờ gam màu nâu trầm ấm đặc trưng và hệ vân sóng nước uyển chuyển. Không chỉ mang lại vẻ đẹp thẩm mỹ, gỗ óc chó còn có độ bền vượt trội, khả năng kháng sâu tự nhiên, giúp món đồ nội thất trường tồn qua nhiều thế hệ.
                        </p>
</div>
<div className="order-1 md:order-2 rounded-xl overflow-hidden bg-surface-beige p-stack-sm">
<img alt="Walnut Wood Texture" className="w-full h-full object-cover rounded-lg" data-alt="A macro close-up photograph showcasing the intricate and swirling grain patterns of premium dark walnut wood. The lighting is soft and directional, creating subtle highlights on the organic textures and deep chocolate brown hues. The image captures the tactile quality and natural imperfections of the wood, emphasizing a sense of luxury, craftsmanship, and organic beauty in a minimalist setting with a warm color palette." src="https://lh3.googleusercontent.com/aida-public/AB6AXuADXpYt0OUEDhNOMJ32uKu_nHXnJszh5TN1oKR4yWeO7d_0tmJiGg2SMqNkjL5q-_06oZX7UTnDghIi2Kp4jZWtgcW8FSpRRBxtO-kd0pR_XQa21-beWFd6RUXnt72JBrlo_fse_6B7v2z6_VI8KdX3nuu-uhaso_l_sFhMLDbK8TIDxSY1i8HVmHDONd33DRaRwgc6n-ZP2NtJlqHNiz7-l_IqkGgcTV92Hec7-SKN_i2qhe1cx0LD7hiOjNIWXSJTlqHRkEJ83Ac"/>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-gutter items-center my-stack-lg">
<div className="rounded-xl overflow-hidden bg-surface-beige p-stack-sm">
<img alt="Oak Wood Processing" className="w-full h-full object-cover rounded-lg" data-alt="A high-detail photograph of raw oak planks stacked neatly in a light-filled, modern architectural studio. The wood features a light, honey-gold tone with distinct, straight grains. The setting is bright and airy with a minimalist ivory background, highlighting the sustainable sourcing and raw beauty of the material. Soft shadows add depth, creating a clean, modern aesthetic focused on high-quality natural resources." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVij1jj01bSQcWOiCngy0Z1kiRVLKgznocytvYP6IO24VfFRyaOkDcYiJDDhFpTUQa-Iz0CbaJUO0ZuvOTgZrbNhNxfuAclXPKxZwdrM7Ly3gjxZUBhhvPMw3gC_W1jI4wJSpoE7U939mfzkhCPLUpeawtJ9ueMAkaMG1t0we0ir1miJtdleVRXsORK-U9N74Fj1VIH2PTerJVK259s5Vuz7p77vJM2iLNVH_msKC1KoD3aA3k-coMt__BfBQnmIXszyt-pD0QNBM"/>
</div>
<div>
<h2 className="font-headline-md text-headline-md text-primary mb-stack-md">Gỗ Sồi: Sự trẻ trung và tinh tế</h2>
<p className="text-on-surface-variant mb-stack-md leading-relaxed">
                            Nếu óc chó đại diện cho sự quyền quý, thì gỗ sồi (Oak) lại mang đến hơi thở trẻ trung, sáng láng cho không gian sống. Tại Heritage Home, chúng tôi sử dụng gỗ sồi trắng Bắc Mỹ được tẩm sấy theo tiêu chuẩn quốc tế, đảm bảo sự ổn định tuyệt đối trong điều kiện khí hậu Việt Nam.
                        </p>
</div>
</div>
<div className="bg-surface-beige p-stack-lg rounded-xl my-stack-lg text-center">
<h3 className="font-headline-md text-headline-md text-primary mb-stack-md">Quy trình Heritage: Từ rừng đến mái ấm</h3>
<p className="max-w-2xl mx-auto text-on-surface-variant mb-stack-lg">
                        Mỗi sản phẩm tại Heritage Home đều trải qua 12 công đoạn chế tác thủ công. Chúng tôi chỉ sử dụng gỗ từ các nguồn rừng được cấp chứng chỉ FSC, đảm bảo việc khai thác đi đôi với tái tạo môi trường.
                    </p>
<div className="grid grid-cols-3 gap-stack-md">
<div className="flex flex-col items-center">
<span className="material-symbols-outlined text-accent-gold text-4xl mb-stack-sm" data-icon="eco">eco</span>
<span className="font-label-lg text-label-lg">Bền vững</span>
</div>
<div className="flex flex-col items-center">
<span className="material-symbols-outlined text-accent-gold text-4xl mb-stack-sm" data-icon="front_hand">front_hand</span>
<span className="font-label-lg text-label-lg">Thủ công</span>
</div>
<div className="flex flex-col items-center">
<span className="material-symbols-outlined text-accent-gold text-4xl mb-stack-sm" data-icon="verified">verified</span>
<span className="font-label-lg text-label-lg">Bảo chứng</span>
</div>
</div>
</div>
</div>
</article>
{/*  */}
<section className="bg-surface-container py-section-gap">
<div className="max-w-container-max mx-auto px-margin-desktop">
<div className="flex flex-col md:flex-row justify-between items-end mb-stack-lg gap-gutter">
<div>
<span className="font-label-lg text-label-lg text-accent-terracotta uppercase tracking-widest block mb-stack-sm">Sở hữu ngay</span>
<h2 className="font-headline-lg text-headline-lg text-primary">Shop The Look</h2>
</div>
<a className="font-label-lg text-label-lg text-primary border-b border-primary hover:text-accent-terracotta transition-all" href="#">Xem tất cả bộ sưu tập</a>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
{/*  */}
<div className="group cursor-pointer">
<div className="aspect-[4/5] overflow-hidden bg-surface-beige mb-stack-md relative">
<img alt="Heritage Dining Table" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" data-alt="A minimalist solid walnut dining table showcased in a spacious, sunlit dining room with ivory walls and polished concrete floors. The table features clean lines and a smooth, dark finish that highlights the natural wood grain. A single artisanal ceramic vase with a dried branch sits on top. The atmosphere is quiet, luxurious, and modern-minimalist, adhering to a sophisticated ivory and deep brown color palette." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVW_FINLUajHzFyzX2X5cS9xGsFCwlFsEGFfPK4c-zD1aRUP618SNsTdHv4heEM7xr55eDXOZ0AjXLaNqsokDjBdADGCRP4Gqnp76GpZnasEaD1WcsxMpEu4fEdFk-yGKh61Ot575TilS4O4D7_XU-LzynRBt283s0UngwxBrHS46DzdJGiuuVx5QM1oqXYzufb8GzXw4bBsMsFNqtg0nE9ETpTGpXh1RLOT5AqPKPvlBCnOb3-enYOdd_z-Z0JY3xXm5H8X0jKEo"/>
<button className="absolute bottom-4 right-4 bg-primary text-on-primary p-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-xl">
<span className="material-symbols-outlined" data-icon="add_shopping_cart">add_shopping_cart</span>
</button>
</div>
<h3 className="font-headline-md text-[18px] text-primary group-hover:text-accent-terracotta transition-colors">Bàn Ăn Walnut Heritage</h3>
<p className="font-label-lg text-label-lg text-accent-gold mt-1">28,500,000 VND</p>
</div>
{/*  */}
<div className="group cursor-pointer">
<div className="aspect-[4/5] overflow-hidden bg-surface-beige mb-stack-md relative">
<img alt="Oak Lounge Chair" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" data-alt="A contemporary lounge chair made of light oak and cream-colored linen fabric, positioned against a textured beige wall. The design is ergonomic and sculptural, emphasizing the joinery of the wooden frame. Soft morning light casts gentle shadows, creating a serene and inviting mood. The image reflects a modern Vietnamese heritage aesthetic, blending traditional craftsmanship with high-end minimal design in a soft tonal palette." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrvn-QSZhD9aWIaHwpID1oaR-QFJ_ls40sLTfLGKHm42Xxlqc5ZRic_KEJDEGSDchb92BdwHiDcRUGqem8ih1Ir7EN5As-xXf7MtLDT0h37GklNt2peijfNBZtUoDwA7JIII8sH0x3mn7cqiPMs9fJ20c42RhbVVMbXiIBQotHsgoObFB3AMbVmpu6HwL53cfDnoG3xGy_BfkILihhcj4-MxnPTOLLT4Wt-EVFoShLNRhcusr7ZkwNCMGzejzMD3b1yxAvjS6E7PE"/>
<button className="absolute bottom-4 right-4 bg-primary text-on-primary p-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-xl">
<span className="material-symbols-outlined" data-icon="add_shopping_cart">add_shopping_cart</span>
</button>
</div>
<h3 className="font-headline-md text-[18px] text-primary group-hover:text-accent-terracotta transition-colors">Ghế Thư Giãn Sồi Trắng</h3>
<p className="font-label-lg text-label-lg text-accent-gold mt-1">12,200,000 VND</p>
</div>
{/*  */}
<div className="group cursor-pointer">
<div className="aspect-[4/5] overflow-hidden bg-surface-beige mb-stack-md relative">
<img alt="Wooden Sideboard" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" data-alt="A premium walnut wood sideboard with intricate hand-carved detailing on the door panels. It is displayed in a minimalist living area with a large neutral-toned rug and soft ambient lighting. The piece exudes a sense of history and modernity combined. The deep brown wood tones contrast beautifully against the ivory background, maintaining a quiet, sophisticated, and editorial feel consistent with high-end furniture photography." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCPgdrg4YOVyQdTdKR97BJRti9JSiqUUYiFdLA_Z3y4WRCZj9uy7xjl5py7i_vRFn_CsUbBrMKCf2HyMtMlBzNd9M7XDPLNrw1deQkYaSUyh_leqfFHjbQ8LrS0qpmfcVucv76mRpfAOqhNehXMjPCCHNevF0GMF2XxpV7Hys77aTrqMiTHRakuBZ3HLAEfMrJUw638fHECOlWG0RoO6ugemzVMntEpGBZ2EmB5TdJ5Yh6MJEWdOeUvi2bOd4QuX2CaEH7296o4Zmo"/>
<button className="absolute bottom-4 right-4 bg-primary text-on-primary p-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-xl">
<span className="material-symbols-outlined" data-icon="add_shopping_cart">add_shopping_cart</span>
</button>
</div>
<h3 className="font-headline-md text-[18px] text-primary group-hover:text-accent-terracotta transition-colors">Tủ Sideboard Cổ Điển</h3>
<p className="font-label-lg text-label-lg text-accent-gold mt-1">45,000,000 VND</p>
</div>
</div>
</div>
</section>
</div>);


const Template2 = () => (<div className="w-full">
<article className="flex flex-col gap-stack-lg">
<p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                Phong cách Indochine (Đông Dương) không chỉ là sự kết hợp giữa nét hoài cổ của văn hóa Á Đông và vẻ lãng mạn của kiến trúc Pháp, mà còn là một bản hòa ca của ánh sáng. Trong một không gian đậm chất di sản, ánh sáng đóng vai trò là "chất keo" kết nối các yếu tố trang trí, tạo nên chiều sâu và khơi gợi cảm xúc người ở.
            </p>
<h2 className="font-headline-md text-headline-md text-primary mt-stack-lg">1. Ánh sáng vàng: Linh hồn của sự ấm cúng</h2>
<p className="text-on-surface-variant leading-relaxed">
                Tại Heritage Home, chúng tôi tin rằng màu sắc của ánh sáng có thể thay đổi hoàn toàn diện mạo của một căn phòng. Với tông màu gỗ tối và gạch bông đặc trưng của Indochine, ánh sáng trắng thường tạo cảm giác lạnh lẽo và lạc quẻ. Thay vào đó, nhiệt độ màu từ 2700K đến 3000K (vàng ấm) là lựa chọn tối ưu để tôn lên các vân gỗ tự nhiên và làm dịu đi những đường nét kiến trúc góc cạnh.
            </p>
{/*  */}
<blockquote className="bg-surface-beige border-l-4 border-accent-gold p-stack-lg my-stack-md italic font-headline-md text-primary-container">
                "Ánh sáng trong nội thất Đông Dương không nên quá gắt. Nó cần được 'lọc' qua những lớp chất liệu tự nhiên như lụa, mây tre để tạo ra những mảng sáng tối dịu dàng, tựa như nắng chiều qua khung cửa sổ gỗ."
                <cite className="block mt-stack-md font-label-lg text-label-lg not-italic text-on-surface-variant">— KTS. Trần Minh Đức, Giám đốc Nghệ thuật tại Heritage Home</cite>
</blockquote>
<h2 className="font-headline-md text-headline-md text-primary mt-stack-lg">2. Sự kết hợp giữa truyền thống và hiện đại</h2>
<p className="text-on-surface-variant leading-relaxed">
                Thử thách lớn nhất là làm sao để tích hợp công nghệ chiếu sáng hiện đại như đèn LED âm trần hay đèn ray nam châm vào một không gian đậm chất truyền thống mà không làm mất đi tính thẩm mỹ. Bí quyết nằm ở sự ẩn giấu và lớp lang:
            </p>
<div className="grid grid-cols-1 md:grid-cols-2 gap-gutter my-stack-md">
<div className="flex flex-col gap-stack-sm">
<img alt="Silk Lanterns Detail" className="w-full aspect-[4/5] object-cover rounded-sm" data-alt="A close-up shot of a traditional Vietnamese silk lantern, handcrafted with delicate cream-colored silk and dark wood frame. It is hung in a modern minimalist space with Indochine accents. The light inside glows warmly, illuminating the fine texture of the fabric and casting a soft, diffuse light on the surrounding bamboo wall. The mood is intimate, luxurious, and peaceful." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGvFdPjogXTpyvwso8Dk-V3OkYcE-QJGcOcPrGz8sannX2FQrVt1Wq9Q6XLWAWKMTX_f4NuVB1A-USXvNk_VDzdZF-Psusif2kQNgExBRLy3KzBDtkcjtStiF_whrMWMO1dutl7TmbxsitATE0HJi4L_eUu6E1BhmUJaLo27oBFvlL8ITXh_9069NdsIAt0-xaBxdoiMx0-OeLWlplFXLAPixs-wsGm3sw-IaBHqrWn0Yptnk7NGSkTQ3Q6a6paZRREamQqenTaHo"/>
<p className="font-label-sm text-label-sm text-text-muted italic">Đèn lồng lụa thủ công làm mềm mại không gian hiện đại.</p>
</div>
<div className="flex flex-col gap-stack-sm">
<img alt="Accent Lighting" className="w-full aspect-[4/5] object-cover rounded-sm" data-alt="A professionally lit accent wall in a high-end Indochine residence. A spotlight highlights a piece of traditional lacquer art against a dark charcoal wall. The lighting is precise, creating a dramatic interplay of shadows and focus. The floor is made of polished dark teakwood, reflecting the warm glow. A tall ceramic vase with lotus flowers stands elegantly in the corner." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCPZDSkViPse4szeXSpnDOteu_lPOofaWxumO0bAOyCqEhZudXEkEv7HCtKmmx3AHL8WZzUXIzK3cRP2wJ_c8cSqQJg-pl0bzGfgM7_p9_JucrFgv2N7v0FD8sfpsJ3HMlYZV0Edfrosw2jNWNT5_JORsStvCVYHtR2WKaGFogLxqW4C_-VZDekSi62ootmTGfl-191sntwLjReijis-NrbOmxNlcwVPTP7uDHJIxZDL1XlzICyyzpy0R0gRzQDDf8ZM1xKcUxO1Nc"/>
<p className="font-label-sm text-label-sm text-text-muted italic">Hệ thống đèn tiêu điểm làm nổi bật các tác phẩm nghệ thuật.</p>
</div>
</div>
<ul className="list-none flex flex-col gap-stack-sm">
<li className="flex items-start gap-stack-sm">
<span className="material-symbols-outlined text-accent-gold">check_circle</span>
<span><strong>Ánh sáng điểm (Accent Lighting):</strong> Sử dụng đèn âm trần hẹp góc để tập trung vào tranh sơn mài hoặc tủ trưng bày gỗ trắc.</span>
</li>
<li className="flex items-start gap-stack-sm">
<span className="material-symbols-outlined text-accent-gold">check_circle</span>
<span><strong>Ánh sáng nền (Ambient Lighting):</strong> Sử dụng đèn lồng vải lụa hoặc chụp đèn mây tre để tạo luồng sáng tỏa nhẹ nhàng cho toàn bộ phòng khách.</span>
</li>
</ul>
<p className="text-on-surface-variant leading-relaxed">
                Cuối cùng, nghệ thuật sắp đặt ánh sáng không chỉ là việc lắp đặt các bóng đèn, mà là việc tạo ra một trải nghiệm thị giác giàu tính di sản, nơi gia chủ có thể tìm thấy sự tĩnh lặng sau những giờ làm việc mệt mỏi.
            </p>
<div className="flex items-center gap-stack-lg border-t border-b border-surface-container py-stack-lg my-stack-lg">
<span className="font-label-lg text-label-lg text-primary uppercase">Tags:</span>
<div className="flex gap-stack-sm">
<span className="bg-surface-container-low px-3 py-1 text-label-sm text-text-muted transition-colors">Indochine</span>
<span className="bg-surface-container-low px-3 py-1 text-label-sm text-text-muted transition-colors">Lighting Design</span>
<span className="bg-surface-container-low px-3 py-1 text-label-sm text-text-muted transition-colors">Interior Art</span>
</div>
</div>
</article>
{/*  */}
<div className="bg-surface-beige p-stack-lg mt-stack-lg rounded-sm">
<h4 className="font-headline-md text-headline-md text-primary mb-stack-sm">Bản tin Di Sản</h4>
<p className="font-body-sm text-body-sm text-on-surface-variant mb-stack-lg">Nhận các bài viết về phong cách sống và thiết kế nội thất hàng tuần.</p>
<form className="flex flex-col gap-stack-sm">
<input className="bg-transparent border-0 border-b border-primary py-2 px-0 focus:ring-0 focus:border-accent-gold text-body-sm outline-none" placeholder="Email của bạn" type="email"/>
<button className="bg-primary text-white py-3 font-label-lg text-label-lg hover:bg-primary-container transition-colors uppercase mt-2" type="submit">Đăng ký ngay</button>
</form>
</div>
</div>);


const Template3 = () => (<div className="w-full">
<article className="w-full mx-auto py-section-gap">
<p className="font-body-lg text-body-lg text-on-surface-variant italic mb-12 leading-relaxed first-letter:text-5xl first-letter:font-bold first-letter:mr-3 first-letter:float-left first-letter:text-primary">
                Phòng khách không chỉ là nơi đón khách, mà còn là linh hồn của ngôi nhà. Việc lựa chọn bảng màu chuẩn xác sẽ nâng tầm không gian sống từ bình thường trở nên đẳng cấp và giàu tính thẩm mỹ nghệ thuật.
            </p>
<div className="space-y-16">
{/*  */}
<section className="scroll-reveal">
<h2 className="font-headline-lg text-headline-lg mb-6 text-primary flex items-baseline gap-3">
<span className="text-accent-terracotta italic font-bold">01.</span>
                        Nền tảng từ gam màu trung tính
                    </h2>
<p className="font-body-md text-body-md mb-8 leading-loose">
                        Hãy bắt đầu với các sắc độ của Beige, Ivory hoặc Xám ấm (Warm Grey). Đây là những gam màu "vượt thời gian" giúp mở rộng không gian và tạo cảm giác thư thái. Màu Ivory (Trắng Ngà) của Heritage Home được lấy cảm hứng từ những bức tường vôi truyền thống, mang lại vẻ đẹp dịu dàng nhưng vô cùng sang trọng.
                    </p>
<div className="bg-surface-beige p-8 rounded-lg flex flex-wrap gap-4 items-center mb-8">
<div className="flex-1 min-w-[150px]">
<span className="font-label-sm text-label-sm uppercase block mb-3 text-outline">Bảng màu gợi ý</span>
<div className="flex gap-2">
<div className="w-12 h-12 rounded-full bg-[#F9F7F2] border border-outline-variant color-swatch" title="Ivory"></div>
<div className="w-12 h-12 rounded-full bg-[#F2EEE5] border border-outline-variant color-swatch" title="Beige"></div>
<div className="w-12 h-12 rounded-full bg-[#dbdad5] border border-outline-variant color-swatch" title="Warm Grey"></div>
</div>
</div>
<div className="flex-1 min-w-[200px] italic font-body-sm text-body-sm text-on-surface-variant">
                            "Màu trung tính là tấm toan hoàn hảo để tôn vinh những món đồ nội thất thủ công."
                        </div>
</div>
</section>
{/*  */}
<section className="scroll-reveal">
<h2 className="font-headline-lg text-headline-lg mb-6 text-primary flex items-baseline gap-3">
<span className="text-accent-terracotta italic font-bold">02.</span>
                        Điểm nhấn Terracotta ấm áp
                    </h2>
<div className="grid grid-cols-1 md:grid-cols-2 gap-gutter items-center mb-8">
<div>
<p className="font-body-md text-body-md leading-loose">
                                Sắc đỏ gạch nung (Terracotta) gợi nhắc về chất liệu gốm truyền thống của Việt Nam. Khi kết hợp với nền trắng ngà, Terracotta tạo nên sự tương phản mạnh mẽ nhưng vẫn đầy tinh tế. Hãy sử dụng màu này cho gối tựa, thảm trải sàn hoặc các bình gốm trang trí để tạo "nhịp điệu" cho căn phòng.
                            </p>
</div>
<img className="w-full h-64 object-cover rounded-lg shadow-sm" data-alt="A close-up shot of professional interior styling showing a cream-colored armchair with a deep terracotta linen pillow. In the background, a minimalist dark wood side table holds a matte terracotta vase with dried branches. The lighting is soft and warm, highlighting the high-quality textures of the fabrics and materials in a sophisticated, minimalist Vietnamese style." src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4xXWpM6vwgkGl0Ds25JQ6vhA6v6VaN02uWF9G_QKsYvm08V0MJ0tkqtYZZvq5rw6Pvq4UiAOcar1XALn09DGkp94aUaKBl9WeFdE8Gf7wa8LZxpGdvQ4jlBI5rkbvDS-cRfb9BxO-hCDM9_P4EgleGFfwNQn7lEjYyXXHeahTiAN6SvnYzbjbXImRg4EM68dtbUvTBt_0ORg0wSpTBzBw6dcu-d7BkGprQ6gzXuYZHFFxWuXm_nuRvD02sC0amLHD1k_gieEWMvU"/>
</div>
</section>
{/*  */}
<section className="scroll-reveal">
<h2 className="font-headline-lg text-headline-lg mb-6 text-primary flex items-baseline gap-3">
<span className="text-accent-terracotta italic font-bold">03.</span>
                        Xanh Rêu - Hơi thở thiên nhiên
                    </h2>
<p className="font-body-md text-body-md mb-8 leading-loose">
                        Để không gian thêm phần sâu lắng, màu Xanh Rêu (Moss Green) là lựa chọn không thể bỏ qua. Nó mang lại cảm giác bình yên của những khu vườn cổ kính. Sự kết hợp giữa Xanh Rêu và gỗ tự nhiên màu trầm sẽ tạo nên một phong cách Modern Vietnamese đích thực.
                    </p>
<div className="grid grid-cols-3 gap-2 h-48">
<img className="w-full h-full object-cover rounded-sm" data-alt="Minimalist living room detail with moss green velvet curtains against a soft beige wall. A simple wooden stool stands nearby with a ceramic pot." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDS54BzScFn2htXcEugkORQjdmaXOcgmPLrUnVO2wmqog5im2o3254hZMXvVuRBdx3bpci2omNPIxB3eeokmQ8Y4-mXEwXapslw3AzcOoc4zLQHmkWRb5ME7_URJt29fAZpHZSHiyZvRbKS5OblDZ-4esgZW8G5MQMrVB8Of5pnJaDL-gPb8oLVQOgl3FK2Ny8gu7nSiwpZYeOgRuU2IVCSnnpoN7mRTHGn27QKLLEI2spRKue85Sd3gplbrQNZyoN_IR6kscbqsfs"/>
<img className="w-full h-full object-cover rounded-sm" data-alt="A beautiful dark green upholstered chair sitting in a corner of a sunlit ivory room. The floor is made of light-colored wood planks." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcpkFvUpUJZtSGCWPz1_qsoutcSOqJqVGGpy-O4VbeWSDtznne-0Bqcm3SXm0rmsYmfFeJVrG-6KxKLI_c8s8hrVOKTgK5szkgxiEHCy8NnrhdEkp4Ho0vWcf2pfDCtxAOcrC4PT56WRzD7w_nKS9UIR1QLmuN6TF0IamSCJh29QWJVelRfRfX5z7YrTJsqhKGMnIdcDDFlprt-nudU6Lq29UznKp6gtxiBTI38gLVvEygejMTTzeAlKcG8E_usnQtRXTwJr07iDI"/>
<img className="w-full h-full object-cover rounded-sm" data-alt="Interior decor details with a collection of green and neutral ceramic vases on a dark oak shelf, styled in a minimalist and luxury way." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrURLS77GTWxBtNNqLIOytLqEAIE5DECZmL9vRbHlSsYP3UJoeSomczV_yy6C6t1uxhDriC4FKheOVeXl6d7p6AXysQRCyCq6hi-ct0E4djMr4yvHjNmt5TPMKh2uVQAQhyF5FWNwvhS0HP6IXmseASG_s_WSwHydWDnVUOh8R_POxwXUXxNs9gmTS5T7cIIrrr5YNofmzV73QmqGOhcyiDNDpY1NdhUhUunhZWJLElY_rgqt25VO8WOcJGFaUoV1fw6FgWsob4pw"/>
</div>
</section>
{/*  */}
<section className="scroll-reveal">
<div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
<div className="bg-surface-ivory p-10 border border-outline-variant/20 rounded-xl">
<h3 className="font-headline-md text-headline-md mb-4 text-primary">04. Quy tắc 60-30-10</h3>
<p className="font-body-sm text-body-sm leading-relaxed">
                                Đừng quên áp dụng tỉ lệ vàng: 60% màu chủ đạo (Trung tính), 30% màu bổ trợ (Gỗ/Xám) và 10% màu điểm nhấn (Terracotta/Xanh rêu). Điều này giúp cân bằng thị giác hoàn hảo.
                            </p>
</div>
<div className="bg-primary-container p-10 text-white rounded-xl">
<h3 className="font-headline-md text-headline-md mb-4">05. Phụ kiện Kim Loại</h3>
<p className="font-body-sm text-body-sm leading-relaxed text-on-primary-container">
                                Một chút ánh kim từ đồng thau (Gold Brass) trên chân bàn hay tay nắm cửa s��� là cú chốt cuối cùng để hoàn thiện vẻ đẹp "sang trọng thầm lặng" cho phòng khách của bạn.
                            </p>
</div>
</div>
</section>
</div>
{/*  */}
<div className="my-section-gap text-center relative px-8 py-12">
<div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-accent-gold/30"></div>
<p className="font-display-lg-mobile text-display-lg-mobile text-primary italic leading-tight">
                    "Màu sắc không chỉ là ánh sáng, nó là cảm xúc của ngôi nhà."
                </p>
<div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-accent-gold/30"></div>
</div>
{/*  */}
<div className="border-t border-outline-variant pt-8 flex flex-wrap justify-between items-center gap-6">
<div className="flex gap-2">
<span className="px-4 py-2 bg-surface-beige rounded-full font-label-sm text-label-sm text-on-surface-variant">#InteriorDesign</span>
<span className="px-4 py-2 bg-surface-beige rounded-full font-label-sm text-label-sm text-on-surface-variant">#ColorPalette</span>
<span className="px-4 py-2 bg-surface-beige rounded-full font-label-sm text-label-sm text-on-surface-variant">#ModernVietnamese</span>
</div>
<div className="flex items-center gap-4">
<span className="font-label-sm text-label-sm text-outline">CHIA SẺ:</span>
<button className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:bg-primary hover:text-white transition-all"><span className="material-symbols-outlined text-sm">share</span></button>
<button className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:bg-primary hover:text-white transition-all"><span className="material-symbols-outlined text-sm">favorite</span></button>
</div>
</div>
</article>
</div>);



export default function BlogDetail() {
  const { slug } = useParams();
  const post = blogDetailsData[slug];
  const relatedPosts = Object.entries(blogDetailsData)
    .filter(([key, _]) => key !== slug)
    .slice(0, 3);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-bright text-on-surface">
        <Header />
        <main className="flex-grow flex items-center justify-center py-20 px-5">
          <div className="text-center max-w-lg">
            <span className="material-symbols-outlined text-[64px] text-outline-variant mb-4">article</span>
            <h1 className="font-display-lg text-4xl text-primary mb-4">Không tìm thấy bài viết</h1>
            <p className="font-body-lg text-on-surface-variant mb-8">Bài viết bạn đang tìm kiếm có thể đã bị xóa hoặc đường dẫn không chính xác.</p>
            <Link to="/" className="inline-block bg-primary text-on-primary px-8 py-3 rounded-full font-label-lg hover:bg-secondary transition-colors">
              Về trang chủ
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-bright text-on-surface font-body-md selection:bg-accent-gold/30">
      <Header />
      <div className="flex-grow">
        {/* HERO BANNER FULL WIDTH */}
        <section className="relative w-full h-[60vh] min-h-[400px] flex items-end justify-center overflow-hidden mb-8">
          <img src={post.heroImage} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative z-10 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pb-16">
             <div className="text-white max-w-3xl">
                <span className="font-label-lg text-label-lg bg-accent-terracotta px-3 py-1 mb-6 inline-block uppercase">{post.category}</span>
                <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg mb-4 leading-tight">{post.title}</h1>
                <p className="font-body-lg text-lg md:text-xl text-white/90 mb-6">{post.excerpt}</p>
                <div className="flex items-center gap-4 text-white/80 font-body-sm text-sm">
                  <span>{post.date}</span>
                </div>
             </div>
          </div>
        </section>

        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap">
          <div className="flex flex-col lg:flex-row gap-gutter">
            {/* CONTENT COLUMN */}
            <div className="w-full lg:w-[70%] xl:w-[75%]">
              {slug === 'suc-hut-tu-chat-lieu-go-tu-nhien-thuong-hang' && <Template1 />}
              {slug === 'toi-gian-nhung-am-ap-xu-huong-noi-that-2024' && <Template2 />}
              {slug === '5-bi-quyet-phoi-mau-cho-phong-khach-sang-trong' && <Template3 />}
            </div>

            {/* SIDEBAR COLUMN */}
            <aside className="w-full lg:w-[30%] xl:w-[25%] mt-12 lg:mt-0">
              <div className="sticky top-24">
                <h3 className="font-headline-md text-2xl text-primary mb-6 border-b border-surface-container pb-4">Bài viết liên quan</h3>
                <div className="flex flex-col gap-8">
                  {relatedPosts.map(([relatedSlug, item]) => (
                    <Link to={`/blogs/${relatedSlug}`} key={relatedSlug} className="group cursor-pointer block">
                      <article>
                        <div className="aspect-[16/10] overflow-hidden mb-4 rounded-sm">
                          <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={item.heroImage} alt={item.title} />
                        </div>
                        <span className="text-on-surface-variant font-label-sm uppercase mb-2 block">{item.category} / {item.date}</span>
                        <h4 className="font-headline-sm text-lg text-primary mb-2 group-hover:text-accent-terracotta transition-colors line-clamp-2">{item.title}</h4>
                      </article>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
