import { useEffect, useRef } from 'react';

const EVENT = 'financial-data-invalidated';
const STORAGE_KEY = 'financial-data-revision';

export const invalidateFinancialData = () => {
  window.dispatchEvent(new Event(EVENT));
  localStorage.setItem(STORAGE_KEY, String(Date.now()));
};

export default function useFinancialRefresh(refresh) {
  const loading = useRef(false);

  useEffect(() => {
    const run = () => {
      if (document.visibilityState === 'hidden' || loading.current) return;
      loading.current = true;
      Promise.resolve(refresh()).finally(() => { loading.current = false; });
    };
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    const onStorage = (event) => { if (event.key === STORAGE_KEY) run(); };
    const onPageShow = (event) => { if (event.persisted) run(); };

    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(EVENT, run);
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(EVENT, run);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [refresh]);
}
