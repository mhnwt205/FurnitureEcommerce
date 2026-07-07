import React from 'react';

export default function FloatingButtons() {
  return (
    <div className="fixed bottom-20 right-4 z-[90] flex flex-col items-center gap-2 sm:bottom-24 sm:right-6 md:bottom-28 md:right-8">
      <button
        className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-white text-[#555555] shadow-[0_6px_18px_rgba(0,0,0,0.08)] transition-colors duration-200 hover:border-[#bfa37c] hover:text-[#333333] active:scale-[0.98] sm:h-12 sm:w-12"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Lên đầu trang"
        aria-label="Lên đầu trang"
      >
        <span className="material-symbols-outlined text-[24px]">keyboard_arrow_up</span>
      </button>
      <a
        className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#333333] bg-[#333333] text-white shadow-[0_8px_22px_rgba(0,0,0,0.14)] transition-colors duration-200 hover:bg-[#4a3a31] active:scale-[0.98] sm:h-12 sm:w-12"
        href="tel:19006789"
        title="Gọi Hotline: 1900 6789"
        aria-label="Gọi Hotline: 1900 6789"
      >
        <span className="material-symbols-outlined text-[22px]">call</span>
      </a>
    </div>
  );
}