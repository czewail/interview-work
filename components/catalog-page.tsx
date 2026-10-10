'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
  Headphones,
  Laptop,
  Smartphone,
  Cable,
  LayoutGrid,
  X,
  Check,
} from 'lucide-react';
import { useStore } from './store';
import { Loading, Modal, ProductImage } from './ui';
import { categories } from '@/lib/catalog';
import {
  defaultQuery,
  parseQuery,
  priceError,
  queryCatalog,
  queryUrl,
  type Query,
} from '@/lib/query';
import { money } from '@/lib/commerce';
import { record } from '@/lib/events';
const icons = { Phones: Smartphone, Computers: Laptop, Audio: Headphones, Accessories: Cable };
export default function CatalogPage() {
  const store = useStore(),
    router = useRouter(),
    params = useSearchParams(),
    parsed = parseQuery(new URLSearchParams(params.toString()), store.catalog),
    q = parsed.query,
    result = queryCatalog(store.catalog, q, store.state);
  const [draft, setDraft] = useState<Query>(q),
    [filterOpen, setFilterOpen] = useState(false),
    [error, setError] = useState('');
  const brands = [...new Set(store.catalog.products.map((p) => p.brand))].sort();
  const queryString = params.toString();
  const pendingQuery = useRef<string | null>(null);
  const returnScroll = useRef(store.listUrl === queryUrl(q) ? store.listScroll : 0);
  const restored = useRef(false);
  useEffect(() => {
    if (!store.ready || restored.current) return;
    restored.current = true;
    if (returnScroll.current)
      requestAnimationFrame(() =>
        window.scrollTo({ top: returnScroll.current, behavior: 'instant' }),
      );
  }, [store.ready]);
  useEffect(() => {
    const arrived = '/' + (queryString ? '?' + queryString : '');
    // A delayed route commit must not overwrite edits made immediately after clicking a category.
    if (pendingQuery.current === arrived) pendingQuery.current = null;
    else setDraft(parseQuery(new URLSearchParams(queryString), store.catalog).query);
    setError('');
  }, [queryString, store.catalog]);
  useEffect(() => {
    if (!store.ready) return;
    const canonical = queryUrl({ ...q, page: result.page });
    store.setListUrl(canonical);
    if (canonical !== '/' + (queryString ? '?' + queryString : ''))
      router.replace(canonical, { scroll: false });
    parsed.notices.forEach(store.notify);
  }, [queryString, result.page, store.ready, store.catalog]);
  function commit(next: Query) {
    const committed = { ...next, page: 1 };
    pendingQuery.current = queryUrl(committed);
    setDraft(committed);
    router.push(pendingQuery.current, { scroll: false });
    record('filter_apply');
  }
  function clear() {
    commit({ ...defaultQuery, brands: [] });
  }
  function filters() {
    const invalid = priceError(draft.min, draft.max),
      count = invalid ? '—' : queryCatalog(store.catalog, draft, store.state).total;
    return (
      <>
        <div className="filter-heading">
          <h2>Filters</h2>
          <button
            className="text-button"
            onClick={() => {
              setDraft({ ...defaultQuery, brands: [] });
              setError('');
            }}
          >
            Clear all
          </button>
        </div>
        <fieldset>
          <legend>Category</legend>
          <label className="choice">
            <input
              type="radio"
              name="category"
              checked={!draft.category}
              onChange={() => setDraft({ ...draft, category: '' })}
            />{' '}
            All products
          </label>
          {categories.map((c) => (
            <label className="choice" key={c}>
              <input
                type="radio"
                name="category"
                checked={draft.category === c}
                onChange={() => setDraft({ ...draft, category: c })}
              />
              {c}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Brand</legend>
          {brands.map((b) => (
            <label className="choice" key={b}>
              <input
                type="checkbox"
                checked={draft.brands.includes(b)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    brands: e.target.checked
                      ? [...draft.brands, b]
                      : draft.brands.filter((x) => x !== b),
                  })
                }
              />
              {b}
              <span>
                {
                  store.catalog.products.filter(
                    (p) =>
                      p.brand === b &&
                      p.status === 'active' &&
                      store.catalog.skus.some((s) => s.productId === p.id && s.status === 'active'),
                  ).length
                }
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>
            Price range <small>USD</small>
          </legend>
          <div className="price-inputs">
            <label>
              <span className="sr-only">Minimum price</span>
              <span>$</span>
              <input
                aria-label="Minimum price"
                placeholder="Min"
                inputMode="decimal"
                value={draft.min}
                onChange={(e) => setDraft({ ...draft, min: e.target.value })}
              />
            </label>
            <span>–</span>
            <label>
              <span className="sr-only">Maximum price</span>
              <span>$</span>
              <input
                aria-label="Maximum price"
                placeholder="Max"
                inputMode="decimal"
                value={draft.max}
                onChange={(e) => setDraft({ ...draft, max: e.target.value })}
              />
            </label>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </fieldset>
        <fieldset>
          <legend>Availability</legend>
          <label className="choice">
            <input
              type="checkbox"
              checked={draft.stockOnly}
              onChange={(e) => setDraft({ ...draft, stockOnly: e.target.checked })}
            />
            In stock only
          </label>
        </fieldset>
        <button
          className="button primary full"
          onClick={() => {
            if (invalid) {
              setError(invalid);
              return;
            }
            commit(draft);
            setFilterOpen(false);
          }}
        >
          Apply ({count}) <ArrowRight size={16} />
        </button>
        <button
          className="text-button full"
          onClick={() => {
            setDraft(q);
            setError('');
            setFilterOpen(false);
          }}
        >
          Cancel
        </button>
        <div className="filter-note">
          <BoxNote />
          <p>Good to know</p>
          <span>Explore freely. Every product, price and order is part of this demo.</span>
          <Link href="/demo-info/">
            How it works <ArrowUpRight size={14} />
          </Link>
        </div>
      </>
    );
  }
  const filtered = !!(q.q || q.category || q.brands.length || q.min || q.max || q.stockOnly),
    matching = q.min !== '' || q.max !== '' || q.stockOnly;
  return (
    <>
      <section className="catalog-intro">
        <div className="breadcrumb">
          Home <span>/</span> Shop
        </div>
        <div className="intro-row">
          <div>
            <h1>Good tech. Everyday.</h1>
            <p>Thoughtful essentials for the way you work, listen and live.</p>
          </div>
          <span className="collection-note">
            THE EVERYDAY COLLECTION
            <br />
            <b>Explore. Find your fit.</b>
          </span>
        </div>
      </section>
      <nav className="category-nav" aria-label="Product categories">
        <button
          className={!q.category ? 'active' : ''}
          onClick={() => commit({ ...q, category: '' })}
        >
          <LayoutGrid size={17} />
          All products
        </button>
        {categories.map((c) => {
          const Icon = icons[c];
          return (
            <button
              key={c}
              className={q.category === c ? 'active' : ''}
              onClick={() => commit({ ...q, category: c })}
            >
              <Icon size={18} />
              {c}
            </button>
          );
        })}
      </nav>
      <div className="catalog-layout">
        <aside className="filters desktop-filters">{filters()}</aside>
        <section className="products-section" aria-label="Products">
          <div className="results-toolbar">
            <span aria-live="polite">
              <strong>{result.total}</strong> products{q.q && <> for “{q.q}”</>}
            </span>
            <button
              className="button mobile-filter"
              onClick={() => {
                setDraft(q);
                setFilterOpen(true);
              }}
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>
            <label className="sort">
              Sort by{' '}
              <select
                aria-label="Sort products"
                value={q.sort}
                onChange={(e) => commit({ ...q, sort: e.target.value as Query['sort'] })}
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="newest">Newest</option>
                {q.q && <option value="relevance">Relevance</option>}
              </select>
            </label>
          </div>
          {filtered && (
            <div className="chips">
              {q.q && (
                <button
                  onClick={() =>
                    commit({ ...q, q: '', sort: q.sort === 'relevance' ? 'featured' : q.sort })
                  }
                >
                  {q.q}
                  <X size={13} />
                </button>
              )}
              {q.category && (
                <button onClick={() => commit({ ...q, category: '' })}>
                  {q.category}
                  <X size={13} />
                </button>
              )}
              {q.brands.map((b) => (
                <button
                  key={b}
                  onClick={() => commit({ ...q, brands: q.brands.filter((x) => x !== b) })}
                >
                  {b}
                  <X size={13} />
                </button>
              ))}
              {(q.min || q.max) && (
                <button onClick={() => commit({ ...q, min: '', max: '' })}>
                  ${q.min || '0'}–{q.max ? '$' + q.max : 'any'}
                  <X size={13} />
                </button>
              )}
              {q.stockOnly && (
                <button onClick={() => commit({ ...q, stockOnly: false })}>
                  In stock
                  <X size={13} />
                </button>
              )}
              <button className="text-button" onClick={clear}>
                Clear all
              </button>
            </div>
          )}
          {!store.ready ? (
            <Loading />
          ) : store.catalogError ? (
            <div className="empty-state">
              <h2>We couldn’t load products.</h2>
              <p>Try again. Your cart is safe.</p>
              <button className="button primary" onClick={store.retryCatalog}>
                Retry
              </button>
            </div>
          ) : !result.total ? (
            <div className="empty-state">
              <SearchEmpty />
              <h2>
                {store.catalog.products.length
                  ? 'No products match your search'
                  : 'No products available'}
              </h2>
              <p>
                {store.catalog.products.length
                  ? 'Try a different search or give your filters a little more room.'
                  : 'The demo catalog is empty. Please try again.'}
              </p>
              <button
                className="button primary"
                onClick={store.catalog.products.length ? clear : store.retryCatalog}
              >
                {store.catalog.products.length ? 'Clear filters' : 'Retry'}
              </button>
            </div>
          ) : (
            <>
              <div className="product-grid">
                {result.items.map((r, i) => (
                  <article
                    className="product-card"
                    key={r.product.id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('a'))
                        store.setListScroll(window.scrollY);
                    }}
                  >
                    <Link
                      href={`/products/${r.product.slug}/`}
                      className="product-image-link"
                      aria-label={r.product.name}
                      onClick={() => record('select_item', { productId: r.product.id })}
                    >
                      <ProductImage
                        src={r.product.images[0]}
                        alt={r.product.name}
                        priority={i < 4}
                      />
                      <span className="image-category">{r.product.categoryId}</span>
                      {!r.available && <span className="sold-out">Out of stock</span>}
                      <span className="product-open">
                        <ArrowUpRight size={18} />
                      </span>
                    </Link>
                    <div className="product-meta">
                      <span>{r.product.brand}</span>
                      <span className="swatches" aria-hidden="true">
                        {r.product.optionDefinitions
                          .find((o) => o.name === 'Color')
                          ?.values.map((color) => (
                            <i key={color} className={`color-${color.toLowerCase()}`} />
                          ))}
                      </span>
                    </div>
                    <Link href={`/products/${r.product.slug}/`} className="product-name">
                      {r.product.name}
                    </Link>
                    <p className="product-spec">{r.product.highlights[0]}</p>
                    <div className="card-price">
                      <span>
                        {matching ? 'Matching options from ' : r.differentPrices ? 'From ' : ''}
                        <strong>{money(r.price)}</strong>
                      </span>
                      {r.available && <span className="stock-dot" title="Demo stock available" />}
                    </div>
                  </article>
                ))}
              </div>
              <nav className="pagination" aria-label="Pagination">
                <span>
                  Showing {(result.page - 1) * 12 + 1}–{Math.min(result.page * 12, result.total)} of{' '}
                  {result.total}
                </span>
                <div>
                  <button
                    aria-label="Previous page"
                    disabled={result.page === 1}
                    onClick={() => router.push(queryUrl({ ...q, page: result.page - 1 }))}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  {Array.from({ length: result.pages }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === result.pages || Math.abs(n - result.page) <= 1)
                    .map((n) => (
                      <button
                        key={n}
                        className={n === result.page ? 'selected' : ''}
                        aria-current={n === result.page ? 'page' : undefined}
                        onClick={() => router.push(queryUrl({ ...q, page: n }))}
                      >
                        {n}
                      </button>
                    ))}
                  <button
                    aria-label="Next page"
                    disabled={result.page === result.pages}
                    onClick={() => router.push(queryUrl({ ...q, page: result.page + 1 }))}
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </nav>
            </>
          )}
          <div className="catalog-bottom">
            <Check size={15} />
            <span>Clear specs. Your choice.</span>
            <span>Demo stock · USD prices</span>
          </div>
        </section>
      </div>
      {filterOpen && (
        <Modal
          title="Filter products"
          className="filter-modal"
          onClose={() => setFilterOpen(false)}
        >
          <div className="filters">{filters()}</div>
        </Modal>
      )}
    </>
  );
}
function BoxNote() {
  return <SlidersHorizontal size={22} />;
}
function SearchEmpty() {
  return <LayoutGrid size={32} />;
}
