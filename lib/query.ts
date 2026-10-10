import { categories } from './catalog';
import type { Catalog, DemoState, Product, SKU } from './types';
export const sorts = ['featured', 'price-asc', 'price-desc', 'newest', 'relevance'] as const;
export type Query = {
  q: string;
  category: string;
  brands: string[];
  min: string;
  max: string;
  stockOnly: boolean;
  sort: (typeof sorts)[number];
  page: number;
};
export const defaultQuery: Query = {
  q: '',
  category: '',
  brands: [],
  min: '',
  max: '',
  stockOnly: false,
  sort: 'featured',
  page: 1,
};
export const normalizeSearch = (s: string) => s.trim().replace(/\s+/gu, ' ');
export function priceError(min: string, max: string) {
  const ok = (s: string) => s === '' || (/^\d{1,4}(\.\d{1,2})?$/.test(s) && Number(s) <= 9999.99);
  return !ok(min) || !ok(max)
    ? 'Enter a price from 0 to 9999.99, with up to two decimals.'
    : min !== '' && max !== '' && Number(min) > Number(max)
      ? 'Minimum price must not exceed maximum price.'
      : '';
}
export const cents = (s: string) => {
  const [a, b = ''] = s.split('.');
  return Number(a) * 100 + Number(b.padEnd(2, '0'));
};
export function parseQuery(params: URLSearchParams, c: Catalog) {
  const q = { ...defaultQuery, brands: [] as string[] },
    notices: string[] = [];
  q.q = normalizeSearch(params.get('q') || '');
  if ([...q.q].length > 100) {
    q.q = [...q.q].slice(0, 100).join('');
    notices.push('Search shortened to 100 characters');
  }
  const cat = params.get('category') || '';
  if (categories.includes(cat as never)) q.category = cat;
  q.brands = [...new Set(params.getAll('brand'))].filter((b) =>
    c.products.some((p) => p.brand === b),
  );
  q.min = params.get('min') || '';
  q.max = params.get('max') || '';
  if (priceError(q.min, q.max)) {
    q.min = '';
    q.max = '';
    notices.push('Invalid price range removed.');
  }
  q.stockOnly = params.get('stock') === '1';
  const sort = params.get('sort');
  q.sort = sorts.includes(sort as never) ? (sort as Query['sort']) : q.q ? 'relevance' : 'featured';
  if (!q.q && q.sort === 'relevance') q.sort = 'featured';
  const page = params.get('page') || '';
  q.page = /^[1-9]\d*$/.test(page) && Number.isSafeInteger(Number(page)) ? Number(page) : 1;
  return { query: q, notices };
}
export function queryUrl(q: Query) {
  const p = new URLSearchParams();
  if (q.q) p.set('q', q.q);
  if (q.category) p.set('category', q.category);
  q.brands.forEach((b) => p.append('brand', b));
  if (q.min !== '') p.set('min', q.min);
  if (q.max !== '') p.set('max', q.max);
  if (q.stockOnly) p.set('stock', '1');
  if (q.sort !== 'featured') p.set('sort', q.sort);
  if (q.page > 1) p.set('page', String(q.page));
  return '/' + (p.size ? '?' + p.toString() : '');
}
export function searchQuery(q: Query, text: string): Query {
  const next = normalizeSearch(text);
  return {
    ...q,
    q: next,
    page: 1,
    sort: !q.q && next ? 'relevance' : !next && q.sort === 'relevance' ? 'featured' : q.sort,
  };
}
export function stock(s: SKU, state: Pick<DemoState, 'inventoryDeductions'>) {
  return Math.max(0, s.initialStock - (state.inventoryDeductions[s.id] || 0));
}
export type Result = {
  product: Product;
  skus: SKU[];
  price: number;
  differentPrices: boolean;
  available: boolean;
};
export function queryCatalog(c: Catalog, q: Query, state: Pick<DemoState, 'inventoryDeductions'>) {
  const grouped = new Map<string, SKU[]>();
  for (const s of c.skus)
    if (s.status === 'active') {
      const arr = grouped.get(s.productId) || [];
      arr.push(s);
      grouped.set(s.productId, arr);
    }
  const terms = q.q.toLocaleLowerCase('en-US').split(' ').filter(Boolean),
    result: Result[] = [];
  for (const p of c.products) {
    if (
      p.status !== 'active' ||
      (q.category && p.categoryId !== q.category) ||
      (q.brands.length && !q.brands.includes(p.brand))
    )
      continue;
    const text = [p.name, p.brand, p.model, ...p.keywords].join(' ').toLocaleLowerCase('en-US');
    if (!terms.every((t) => text.includes(t))) continue;
    const all = grouped.get(p.id) || [];
    const matches = all.filter(
      (s) =>
        (q.min === '' || s.priceCents >= cents(q.min)) &&
        (q.max === '' || s.priceCents <= cents(q.max)) &&
        (!q.stockOnly || stock(s, state) > 0),
    );
    if (!matches.length) continue;
    result.push({
      product: p,
      skus: matches,
      price: Math.min(...matches.map((s) => s.priceCents)),
      differentPrices: new Set(all.map((s) => s.priceCents)).size > 1,
      available: matches.some((s) => stock(s, state) > 0),
    });
  }
  const relevance = (p: Product) =>
    p.name.toLowerCase() === q.q.toLowerCase()
      ? 0
      : terms.every((t) => p.name.toLowerCase().includes(t))
        ? 1
        : 2;
  result.sort((a, b) => {
    let diff = 0;
    switch (q.sort) {
      case 'price-asc':
        diff = a.price - b.price;
        break;
      case 'price-desc':
        diff = b.price - a.price;
        break;
      case 'newest':
        diff = Date.parse(b.product.publishedAt) - Date.parse(a.product.publishedAt);
        break;
      case 'relevance':
        diff =
          relevance(a.product) - relevance(b.product) ||
          a.product.featuredRank - b.product.featuredRank;
        break;
      default:
        diff = a.product.featuredRank - b.product.featuredRank;
    }
    return diff || a.product.id.localeCompare(b.product.id);
  });
  const pages = Math.max(1, Math.ceil(result.length / 12)),
    page = Math.min(q.page, pages);
  return {
    all: result,
    items: result.slice((page - 1) * 12, page * 12),
    total: result.length,
    pages,
    page,
  };
}
