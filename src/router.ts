import { useEffect, useState } from 'react';

/** Tiny hash router: avoids a dependency and works on static hosting. */
export const useRoute = () => {
  const [hash, setHash] = useState(location.hash.slice(1) || '/');
  useEffect(() => {
    const on = () => { setHash(location.hash.slice(1) || '/'); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash.split('/').filter(Boolean);
};
export const go = (path: string) => { location.hash = path; };
