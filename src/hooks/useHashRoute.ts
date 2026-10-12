import { useEffect, useState } from 'react';

export interface HashRoute {
  path: string;
  query: URLSearchParams;
}

const parse = (): HashRoute => {
  const raw = window.location.hash.replace(/^#/, '');
  const [path, qs = ''] = raw.split('?');
  return { path: path || '/', query: new URLSearchParams(qs) };
};

/** Oddiy hash-marshrutlash: `#/yo'l?parametrlar`. Statik hostingda (GitHub Pages) ham ishlaydi. */
export function useHashRoute(): HashRoute {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

/** Joriy sahifa uchun ulashish havolasini yasaydi. */
export function shareUrl(path: string, params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return `${window.location.origin}${window.location.pathname}#${path}${qs ? `?${qs}` : ''}`;
}

/** URL'dan ulashilgan parametrlarni olib tashlaydi (sahifa yangilanganda qayta yuklanmasligi uchun). */
export function clearQuery(path: string) {
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${path}`);
}
