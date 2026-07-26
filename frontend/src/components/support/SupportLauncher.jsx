import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import SupportChatPanel from './SupportChatPanel.jsx';

export default function SupportLauncher({ open = false, onOpenChange, launcherRef }) {
  const { isAuthenticated, user } = useAuth();
  const localLauncherRef = useRef(null);
  const dialogRef = useRef(null);
  const navigate = useNavigate();
  const openerRef = launcherRef || localLauncherRef;
  const setOpen = (nextOpen) => onOpenChange?.(nextOpen);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        openerRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll('button, textarea, [href]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    dialogRef.current?.querySelector('button')?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, openerRef]);

  const close = () => {
    setOpen(false);
    openerRef.current?.focus();
  };

  if (!isAuthenticated || user?.role !== 'customer') return null;

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 min-w-12 items-center justify-center gap-2 rounded-[10px] border border-[#333333] bg-[#333333] px-3 text-sm font-bold text-white shadow-[0_8px_22px_rgba(0,0,0,0.14)] hover:bg-[#4a3a31]"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined">support_agent</span>
        <span className="hidden sm:inline">Hỗ trợ</span>
      </button>
      {open ? (
        <div ref={dialogRef} className="fixed inset-0 z-[100] flex items-end justify-end bg-black/20 p-2 sm:p-6" role="dialog" aria-modal="true" aria-label="Trò chuyện hỗ trợ">
          <div className="hidden flex-1 sm:block" onClick={close} aria-hidden="true" />
          <SupportChatPanel active onClose={close} />
          <button type="button" onClick={() => { close(); navigate('/profile/support'); }} className="absolute bottom-3 right-20 hidden text-xs font-semibold text-white underline sm:block">
            Mở trang đầy đủ
          </button>
        </div>
      ) : null}
    </>
  );
}
