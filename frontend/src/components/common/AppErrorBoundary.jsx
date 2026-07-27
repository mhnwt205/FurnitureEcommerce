import React from 'react';
import clientLogger from '../../utils/clientLogger';

export default class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    clientLogger.error('uncaught_render_error', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-surface-beige px-4 py-10" role="alert">
          <section className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
            <span className="material-symbols-outlined text-5xl text-error" aria-hidden="true">error</span>
            <h1 className="mt-4 text-2xl font-semibold text-primary">Đã xảy ra lỗi</h1>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              Trang không thể hiển thị lúc này. Vui lòng tải lại hoặc trở về trang chủ.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button type="button" onClick={() => window.location.reload()} className="ui-button-primary px-5 py-2.5">
                Tải lại trang
              </button>
              <a href="/" className="ui-button-secondary px-5 py-2.5">
                Về trang chủ
              </a>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
