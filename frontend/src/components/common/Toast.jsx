import React, { useState, useEffect } from 'react';

const toastMeta = {
  success: {
    icon: 'check_circle',
    label: 'Thành công',
    accent: 'border-l-[#2F7D32]',
    iconClass: 'text-[#2F7D32]'
  },
  error: {
    icon: 'error',
    label: 'Có lỗi',
    accent: 'border-l-[#B94732]',
    iconClass: 'text-[#B94732]'
  },
  warning: {
    icon: 'warning',
    label: 'Lưu ý',
    accent: 'border-l-[#9A6A16]',
    iconClass: 'text-[#9A6A16]'
  },
  info: {
    icon: 'info',
    label: 'Thông báo',
    accent: 'border-l-[#3966B8]',
    iconClass: 'text-[#3966B8]'
  },
  loading: {
    icon: 'progress_activity',
    label: 'Đang xử lý',
    accent: 'border-l-[#777777]',
    iconClass: 'text-[#777777] animate-spin'
  }
};

export default function Toast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timeoutId;

    const handleShowToast = (e) => {
      window.clearTimeout(timeoutId);
      setToast(e.detail || {});

      const duration = Number(e.detail?.duration ?? 3000);
      if (duration > 0 && e.detail?.type !== 'loading') {
        timeoutId = window.setTimeout(() => {
          setToast(null);
        }, duration);
      }
    };

    window.addEventListener('show-toast', handleShowToast);
    window.addEventListener('toast', handleShowToast);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('show-toast', handleShowToast);
      window.removeEventListener('toast', handleShowToast);
    };
  }, []);

  if (!toast) return null;

  const type = toast.type || 'success';
  const meta = toastMeta[type] || toastMeta.info;
  const title = toast.title || meta.label;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] w-[calc(100vw-2.5rem)] max-w-[380px] translate-y-0 opacity-100 transition-all duration-300 ease-commerce sm:bottom-6 sm:right-6">
      <div className={`flex items-start gap-3 rounded-[12px] border border-[#e5e5e5] border-l-4 ${meta.accent} bg-white px-4 py-3.5 text-[#333333] shadow-[0_18px_42px_rgba(0,0,0,0.10)]`} role="status" aria-live="polite">
        <span className={`material-symbols-outlined mt-0.5 text-[21px] ${meta.iconClass}`} aria-hidden="true">{meta.icon}</span>
        <div className="min-w-0 flex-1">
          {toast.title && <p className="mb-0.5 text-[13px] font-bold leading-5 text-[#333333]">{title}</p>}
          <p className="break-words text-[13px] font-medium leading-5 text-[#555555]">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={() => setToast(null)}
          className="-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-[6px] text-[#777777] transition-colors hover:bg-[#f6f6f6] hover:text-[#333333]"
          aria-label="Đóng thông báo"
        >
          <span className="material-symbols-outlined text-[17px]" aria-hidden="true">close</span>
        </button>
      </div>
    </div>
  );
}
