import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-bright">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <section className="w-full max-w-lg rounded-xl bg-white p-8 text-center shadow-sm" aria-labelledby="not-found-title">
          <p className="text-sm font-semibold tracking-[0.18em] text-commerce-secondary">404</p>
          <h1 id="not-found-title" className="mt-3 text-3xl font-semibold text-primary">Không tìm thấy trang</h1>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            Đường dẫn bạn truy cập không tồn tại hoặc đã được thay đổi.
          </p>
          <Link to="/" className="ui-button-primary mt-6 inline-flex px-5 py-2.5">
            Về trang chủ
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
