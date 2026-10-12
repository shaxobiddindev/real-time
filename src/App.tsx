import { useEffect } from 'react';
import { useHashRoute } from './hooks/useHashRoute';
import { useTheme } from './hooks/useTheme';
import { useToast } from './hooks/useToast';
import MonitorPage from './monitor/MonitorPage';
import SchedulingPage from './scheduling/SchedulingPage';

/** Sahifalar ro'yxati. Yangi bo'lim qo'shish: komponent yarating va shu yerga bitta qator qo'shing. */
const PAGES = [
  { path: '/rejalashtirish', label: 'Rejalashtirish algoritmlari', Component: SchedulingPage },
  { path: '/monitoring', label: 'O‘lchash tizimi (real vaqt)', Component: MonitorPage },
] as const;

export interface PageProps {
  query: URLSearchParams;
  path: string;
  notify: (message: string) => void;
}

export default function App() {
  const route = useHashRoute();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const page = PAGES.find((p) => p.path === route.path) ?? PAGES[0];

  useEffect(() => {
    document.title = `${page.label} — Real vaqt tizimlari`;
  }, [page]);

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <a className="brand" href={`#${PAGES[0].path}`}>
            <svg viewBox="0 0 26 26" aria-hidden="true">
              <rect width="26" height="26" rx="7" fill="currentColor" />
              <rect x="5" y="7" width="9" height="5" rx="1.5" fill="var(--paper)" />
              <rect x="15" y="7" width="6" height="5" rx="1.5" fill="var(--paper)" opacity=".6" />
              <rect x="5" y="14" width="13" height="5" rx="1.5" fill="var(--paper)" opacity=".8" />
            </svg>
            <span>Real vaqt tizimlari</span>
          </a>
          <nav className="tabs" aria-label="Bo‘limlar">
            {PAGES.map((p) => (
              <a key={p.path} href={`#${p.path}`} aria-current={p === page ? 'page' : undefined}>
                {p.label}
              </a>
            ))}
          </nav>
          <span className="spacer" />
          <button
            type="button"
            className="btn ghost small"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Oq fonga o‘tish' : 'Qora fonga o‘tish'}
          >
            {theme === 'dark' ? '☀ Oq fon' : '☾ Qora fon'}
          </button>
        </div>
      </header>

      <page.Component key={page.path} query={route.query} path={page.path} notify={toast.show} />

      <footer className="footer wrap">
        Barcha hisob-kitoblar brauzerda bajariladi — server kerak emas. Ochiq manba:{' '}
        <a href="https://github.com/shaxobiddindev/real-time" target="_blank" rel="noreferrer">
          github.com/shaxobiddindev/real-time
        </a>
      </footer>

      {toast.message && (
        <div className="toast" role="status">
          {toast.message}
        </div>
      )}
    </>
  );
}
