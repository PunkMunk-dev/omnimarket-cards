import { useState } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Search, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useIsMobile } from '@/hooks/use-mobile';
import { WatchlistDropdown } from '@/components/WatchlistDropdown';

// Set to true to re-enable Sports tab for launch
const SHOW_SPORTS = false;

const tabs = [
  { to: '/tcg', label: 'TCG Market', shortLabel: 'TCG', beta: false },
  ...(SHOW_SPORTS ? [{ to: '/sports', label: 'Sports', shortLabel: 'Sports', beta: true }] : []),
];

export function TabNavigation() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [headerQuery, setHeaderQuery] = useState('');
  const { theme, setTheme } = useTheme();

  const isOnTcg = location.pathname === '/tcg';

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = headerQuery.trim();
    if (!q) return;
    navigate(`/?q=${encodeURIComponent(q)}`);
    setHeaderQuery('');
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const navItems = tabs.map(({ to, label, shortLabel, beta }) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) =>
        cn(
          'transition-all font-medium',
          isMobile
            ? 'relative flex flex-col items-center gap-0.5 py-2 px-3 text-[11px]'
            : 'px-3 py-2 rounded-xl text-sm inline-flex items-center gap-1.5',
          isMobile
            ? isActive
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
            : isActive
              ? 'text-[var(--om-text-0)] bg-[rgba(10,132,255,0.12)] border border-[rgba(10,132,255,0.25)]'
              : 'text-[var(--om-text-2)] hover:text-[var(--om-text-1)] hover:bg-[var(--om-border-0)]'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span>{isMobile ? shortLabel : label}</span>
          {beta && !isMobile && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
              style={{ background: 'rgba(255,180,0,0.12)', color: 'rgb(200,150,0)' }}>
              Beta
            </span>
          )}
          {isMobile && isActive && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
          )}
        </>
      )}
    </NavLink>
  ));

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
        <div className="flex items-center justify-around">
          {navItems}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center gap-0.5 py-2 px-3 text-[11px] transition-colors font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Search className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                <span>Search</span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
                )}
              </>
            )}
          </NavLink>
          <button
            onClick={toggleTheme}
            className="flex flex-col items-center gap-0.5 py-2 px-3 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </nav>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b shadow-sm" style={{ background: 'var(--om-bg-1)', borderColor: 'var(--om-border-0)' }}>
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 lg:px-8 flex h-14 md:h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex flex-col leading-none select-none shrink-0">
            <span className="text-[14px] md:text-[15px] font-semibold tracking-tight" style={{ color: 'var(--om-text-0)' }}>OmniMarket</span>
            <span className="mt-0.5 text-[10px] tracking-[0.32em] uppercase" style={{ color: 'var(--om-text-2)' }}>Cards</span>
          </Link>
          <nav className="flex items-center gap-1">{navItems}</nav>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {/* Global search — hidden on /tcg because TCG has its own dedicated search bar */}
          {!isOnTcg && (
            <form onSubmit={handleHeaderSearch} className="w-[260px] md:w-[340px] lg:w-[420px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--om-text-3)' }} />
                <input
                  type="text"
                  value={headerQuery}
                  onChange={(e) => setHeaderQuery(e.target.value)}
                  placeholder="Search any card, set, or player..."
                  className="flex h-10 md:h-11 w-full rounded-xl pl-10 pr-3 text-sm transition-all om-input"
                />
              </div>
            </form>
          )}
          <button
            onClick={toggleTheme}
            className="om-btn flex items-center justify-center h-10 w-10 rounded-xl transition-colors"
            style={{ background: 'var(--om-bg-2)', border: '1px solid var(--om-border-0)', color: 'var(--om-text-1)' }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <WatchlistDropdown onSearchItem={(query) => {
            navigate(`/?q=${encodeURIComponent(query)}&src=wl`);
          }} />
        </div>
      </div>
    </header>
  );
}
