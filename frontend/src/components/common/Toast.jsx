import React, { useState, useEffect } from 'react';

export default function Toast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleShowToast = (e) => {
      setToast(e.detail);
      
      setTimeout(() => {
        setToast(null);
      }, 3000);
    };

    window.addEventListener('show-toast', handleShowToast);
    return () => window.removeEventListener('show-toast', handleShowToast);
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 transform translate-y-0 opacity-100">
      <span className="material-symbols-outlined text-white">check_circle</span>
      <span className="font-medium">{toast.message}</span>
    </div>
  );
}
