import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant pt-section-gap pb-8">
      <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 md:grid-cols-4 gap-gutter mb-20">
        <div className="space-y-6">
          <div className="font-headline-md text-headline-md text-primary">Heritage Home</div>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
            Kiến tạo không gian sống di sản cho người Việt hiện đại. Chúng tôi tin rằng mỗi ngôi nhà là một câu chuyện độc bản, phản chiếu tâm hồn gia chủ.
          </p>
          <div className="flex space-x-4 pt-4">
            <Link className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-300" to="#">FB</Link>
            <Link className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-300" to="#">IG</Link>
            <Link className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-300" to="#">YT</Link>
          </div>
        </div>
        <div>
          <h4 className="font-label-lg text-label-lg text-primary mb-8 uppercase tracking-widest">Khám phá</h4>
          <ul className="space-y-4">
            <li><Link className="font-body-sm text-body-sm text-on-surface-variant hover:text-accent-terracotta transition-colors" to="/about">Về chúng tôi</Link></li>
            <li><Link className="font-body-sm text-body-sm text-on-surface-variant hover:text-accent-terracotta transition-colors" to="/design-service">Dịch vụ thiết kế</Link></li>
            <li><Link className="font-body-sm text-body-sm text-on-surface-variant hover:text-accent-terracotta transition-colors" to="/featured-projects">Dự án tiêu biểu</Link></li>
            <li><Link className="font-body-sm text-body-sm text-on-surface-variant hover:text-accent-terracotta transition-colors" to="/stores">Hệ thống cửa hàng</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-label-lg text-label-lg text-primary mb-8 uppercase tracking-widest">Hỗ trợ</h4>
          <ul className="space-y-4">
            <li><Link className="font-body-sm text-body-sm text-on-surface-variant hover:text-accent-terracotta transition-colors" to="#">Chính sách bảo hành</Link></li>
            <li><Link className="font-body-sm text-body-sm text-on-surface-variant hover:text-accent-terracotta transition-colors" to="#">Vận chuyển &amp; Lắp đặt</Link></li>
            <li><Link className="font-body-sm text-body-sm text-on-surface-variant hover:text-accent-terracotta transition-colors" to="#">Đổi trả sản phẩm</Link></li>
            <li><Link className="font-body-sm text-body-sm text-on-surface-variant hover:text-accent-terracotta transition-colors" to="#">Câu hỏi thường gặp</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-label-lg text-label-lg text-primary mb-8 uppercase tracking-widest">Đăng ký nhận tin</h4>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">Nhận thông báo về các bộ sưu tập mới nhất và ưu đãi đặc quyền.</p>
          <form className="flex border-b border-primary py-2 group mb-8">
            <input className="bg-transparent border-none w-full focus:ring-0 text-body-sm placeholder:text-outline/50" placeholder="Email của bạn" type="email" />
            <button className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform" type="submit">arrow_forward</button>
          </form>

          <h4 className="font-label-lg text-label-lg text-primary mb-4 uppercase tracking-widest">Liên hệ</h4>
          <ul className="space-y-2">
            <li className="font-body-sm text-on-surface-variant"><span className="font-bold">Hotline:</span> +84 900 123 456</li>
            <li className="font-body-sm text-on-surface-variant"><span className="font-bold">Email:</span> hello@heritagehome.vn</li>
            <li className="font-body-sm text-on-surface-variant"><span className="font-bold">Địa chỉ:</span> 123 Đường D1, Quận 2, TP.HCM</li>
          </ul>
        </div>
      </div>
      <div className="max-w-container-max mx-auto px-margin-desktop pt-8 border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center text-on-surface-variant font-label-sm text-label-sm">
        <p>© 2024 Modern Vietnamese Heritage. Bảo lưu mọi quyền.</p>
        <div className="flex space-x-6 mt-4 md:mt-0 items-center">
          <span className="text-primary font-bold cursor-pointer">VI</span>
          <span className="opacity-40 cursor-pointer hover:opacity-100 transition-opacity">EN</span>
        </div>
      </div>
    </footer>
  );
}