'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Search, ShoppingBag, ArrowRight, Box } from 'lucide-react';
import { useStore } from './store';
import { parseQuery, queryUrl, searchQuery } from '@/lib/query';
import { record } from '@/lib/events';
export function Shell({ children }: { children: React.ReactNode }) {
  const store = useStore(),
    router = useRouter(),
    path = usePathname(),
    params = useSearchParams(),
    [search, setSearch] = useState(''),
    [error, setError] = useState('');
  const count = store.state.cart.reduce((n, l) => n + l.quantity, 0);
  useEffect(() => setSearch(params.get('q') || ''), [params]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () =>
      document.body.classList.toggle(
        'keyboard-open',
        !!viewport && window.innerHeight - viewport.height > 150,
      );
    viewport?.addEventListener('resize', resize);
    return () => {
      viewport?.removeEventListener('resize', resize);
      document.body.classList.remove('keyboard-open');
    };
  }, []);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="demo-banner">
        <span>
          <Box size={13} /> Demo store — no real payments or shipments.
        </span>
        <Link href="/demo-info/">
          About this demo <ArrowUpRight size={13} />
        </Link>
      </div>
      <header className="header">
        <div className="header-top">
          <Link href="/" className="wordmark" aria-label="Form home">
            form<span className="brand-dot">.</span>
          </Link>
          <span className="header-tagline">Technology, considered.</span>
          <form
            className="search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if ([...search.trim()].length > 100) {
                setError('Use 100 characters or fewer.');
                return;
              }
              setError('');
              const q = parseQuery(
                path === '/' ? new URLSearchParams(params.toString()) : new URLSearchParams(),
                store.catalog,
              ).query;
              router.push(queryUrl(searchQuery(q, search)));
              record('search');
            }}
          >
            <Search size={18} />
            <input
              aria-label="Search products"
              placeholder="Find your next everyday essential"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button aria-label="Search" type="submit">
              <ArrowRight size={18} />
            </button>
          </form>
          <span className="currency">US / USD</span>
          <Link href="/cart/" className="cart-link" aria-label={`Cart, ${count} items`}>
            <ShoppingBag size={20} />
            <span>Cart</span>
            <b>{store.ready ? (count > 99 ? '99+' : count) : '…'}</b>
          </Link>
        </div>
        {error && (
          <p className="error search-error" role="alert">
            {error}
          </p>
        )}
      </header>
      {store.temporary && (
        <div className="persistent-warning">
          Changes are temporary and will be lost when you refresh. Refreshing may restore your last
          saved cart.
        </div>
      )}
      {store.offline && (
        <div className="persistent-warning">You’re offline. Some content may be unavailable.</div>
      )}
      <main id="main" className="container">
        {children}
      </main>
      <footer className="footer container">
        <Link href="/" className="wordmark">
          form<span className="brand-dot">.</span>
        </Link>
        <p>A little more considered. Every day.</p>
        <span>English · USD</span>
        <Link href="/demo-info/">
          Demo information <ArrowUpRight size={15} />
        </Link>
      </footer>
      <div className="sr-only" aria-live="polite">
        {store.notice}
      </div>
      {store.notice && (
        <div className="toast" role="status">
          <span>{store.notice}</span>
          <button aria-label="Dismiss notification" onClick={() => store.notify('')}>
            ×
          </button>
        </div>
      )}
    </>
  );
}
