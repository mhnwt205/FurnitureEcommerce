import React from 'react';

export default function FloatingButtons() {
  return (
    <div className="fixed bottom-24 right-6 md:bottom-28 md:right-8 z-[90] flex flex-col gap-3 items-center">
      <button
        className="w-14 h-14 bg-[#e0e0e0] text-primary rounded-full flex items-center justify-center shadow-lg hover:bg-surface-container-highest transition-all duration-300 active:scale-95 group"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Lên đầu trang"
      >
        <span className="material-symbols-outlined text-[28px]">keyboard_arrow_up</span>
      </button>
      <a
        className="w-14 h-14 bg-[#5d4037] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-container transition-all duration-300 active:scale-95 group"
        href="tel:19006789"
        title="Gọi Hotline: 1900 6789"
      >
        <span className="material-symbols-outlined text-[28px]">call</span>
      </a>
    </div>
  );
}