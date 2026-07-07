import React from 'react';
import { Link } from 'react-router-dom';

const footerLinkClass = 'text-sm leading-6 text-[#434343] transition-colors duration-300 hover:text-[#bfa37c]';
const footerHeadingClass = 'mb-5 text-[15px] font-bold uppercase tracking-[0.08em] text-[#222222]';
const socialClass = 'flex h-10 w-10 items-center justify-center rounded-full border border-[#e2ded8] bg-white text-[#444444] transition-all duration-300 hover:border-[#bfa37c] hover:bg-[#bfa37c] hover:text-white';

function FacebookIcon() {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 8.6V6.9c0-.8.2-1.3 1.3-1.3H17V2.7c-.8-.1-1.6-.2-2.4-.2-2.4 0-4 1.5-4 4.1v2H8v3.2h2.6v8.7H14v-8.7h2.7l.4-3.2H14Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="4.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.8" cy="7.2" r="1.1" fill="currentColor" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg aria-hidden="true" className="h-[19px] w-[19px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21.5 7.2a3 3 0 0 0-2.1-2.1C17.6 4.6 12 4.6 12 4.6s-5.6 0-7.4.5a3 3 0 0 0-2.1 2.1A31.2 31.2 0 0 0 2 12a31.2 31.2 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.4.5 7.4.5s5.6 0 7.4-.5a3 3 0 0 0 2.1-2.1A31.2 31.2 0 0 0 22 12a31.2 31.2 0 0 0-.5-4.8ZM10 15.2V8.8l5.3 3.2L10 15.2Z" />
    </svg>
  );
}

function FooterColumn({ title, children, className = '' }) {
  return (
    <section className={className}>
      <h4 className={footerHeadingClass}>{title}</h4>
      {children}
    </section>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-[#eeeeee] bg-[#f8f8f8] text-[#434343]">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-10 px-5 py-14 md:grid-cols-2 md:px-8 md:py-16 lg:grid-cols-12 lg:gap-12 lg:px-6">
        <FooterColumn title="Heritage Home" className="lg:col-span-3">
          <p className="max-w-sm text-sm leading-7 text-[#434343]">
            Kiến tạo không gian sống di sản cho người Việt hiện đại. Chúng tôi tin rằng mỗi ngôi nhà là một câu chuyện độc bản, phản chiếu tâm hồn gia chủ.
          </p>
          <div className="mt-7 flex gap-3">
            <Link className={socialClass} to="#" aria-label="Facebook">
              <FacebookIcon />
            </Link>
            <Link className={socialClass} to="#" aria-label="Instagram">
              <InstagramIcon />
            </Link>
            <Link className={socialClass} to="#" aria-label="YouTube">
              <YouTubeIcon />
            </Link>
          </div>
        </FooterColumn>

        <FooterColumn title="Thông tin" className="lg:col-span-2">
          <ul className="space-y-3">
            <li><Link className={footerLinkClass} to="/about">Về chúng tôi</Link></li>
            <li><Link className={footerLinkClass} to="/design-service">Dịch vụ thiết kế</Link></li>
            <li><Link className={footerLinkClass} to="/featured-projects">Dự án tiêu biểu</Link></li>
            <li><Link className={footerLinkClass} to="/stores">Hệ thống cửa hàng</Link></li>
          </ul>
        </FooterColumn>

        <FooterColumn title="Chính sách" className="lg:col-span-2">
          <ul className="space-y-3">
            <li><Link className={footerLinkClass} to="#">Chính sách bảo hành</Link></li>
            <li><Link className={footerLinkClass} to="#">Vận chuyển &amp; Lắp đặt</Link></li>
            <li><Link className={footerLinkClass} to="#">Đổi trả sản phẩm</Link></li>
            <li><Link className={footerLinkClass} to="#">Câu hỏi thường gặp</Link></li>
          </ul>
        </FooterColumn>

        <FooterColumn title="Liên hệ" className="lg:col-span-3">
          <ul className="space-y-3 text-sm leading-6 text-[#434343]">
            <li className="inline-flex max-w-full items-baseline gap-1 whitespace-nowrap"><span className="font-semibold text-[#222222]">Hotline:</span> <span>+84 76773763</span></li>
            <li className="inline-flex max-w-full items-baseline gap-1 whitespace-nowrap"><span className="font-semibold text-[#222222]">Email:</span> <span>heritagehome@gmail.com</span></li>
            <li><span className="font-semibold text-[#222222]">Địa chỉ:</span> 828 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM</li>
          </ul>
        </FooterColumn>

        <FooterColumn title="Đăng ký nhận tin" className="lg:col-span-2">
          <p className="mb-5 text-sm leading-6 text-[#434343]">Nhận thông báo về các bộ sưu tập mới nhất và ưu đãi đặc quyền.</p>
          <form className="group flex items-center border-b border-[#d8d1c8] py-3 transition-colors duration-300 focus-within:border-[#bfa37c]">
            <input className="w-full border-none bg-transparent px-0 text-sm text-[#333333] placeholder:text-[#888888] focus:ring-0" placeholder="Email của bạn" type="email" />
            <button className="material-symbols-outlined text-[21px] text-[#333333] transition-colors duration-300 group-hover:text-[#bfa37c]" type="submit" aria-label="Đăng ký nhận tin">arrow_forward</button>
          </form>
        </FooterColumn>
      </div>

      <div className="bg-[#151515] px-5 py-6 text-center text-sm text-white">
        <p>© 2026 Modern Vietnamese Heritage. Bảo lưu mọi quyền.</p>
      </div>
    </footer>
  );
}