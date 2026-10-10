import type { Catalog, Category } from './types';
import data from './catalog-data.json';
export const categories: Category[] = ['Phones', 'Computers', 'Audio', 'Accessories'];
export const catalog = data as Catalog;
export const brands = [...new Set(catalog.products.map((p) => p.brand))].sort();
export function validateCatalog(c: Catalog) {
  const fail = (s: string): never => {
    throw new Error(`Invalid catalog: ${s}`);
  };
  const integer = (x: number, min: number, max: number) =>
    Number.isSafeInteger(x) && x >= min && x <= max;
  if (c.schemaVersion !== 1 || !c.catalogVersion || c.products.length > 500 || c.skus.length > 3000)
    fail('catalog bounds');
  const ids = new Set<string>(),
    slugs = new Set<string>(),
    skuIds = new Set<string>(),
    combos = new Set<string>();
  for (const p of c.products) {
    if (ids.has(p.id) || slugs.has(p.slug)) fail(`duplicate product ${p.id}`);
    ids.add(p.id);
    slugs.add(p.slug);
    if (
      !p.id ||
      !/^[a-z0-9-]+$/.test(p.slug) ||
      !['active', 'archived'].includes(p.status) ||
      !categories.includes(p.categoryId) ||
      !p.brand ||
      !p.model ||
      !integer([...p.name].length, 1, 160) ||
      [...p.description].length > 5000 ||
      p.keywords.length > 20 ||
      p.keywords.some((k) => typeof k !== 'string') ||
      !Array.isArray(p.specifications) ||
      p.specifications.some((s) => typeof s.label !== 'string' || typeof s.value !== 'string') ||
      p.images.length < 1 ||
      p.images.length > 8 ||
      p.images.some((x) => !x.startsWith('/products/') || x.includes('..')) ||
      p.optionDefinitions.length > 3 ||
      !Number.isFinite(Date.parse(p.publishedAt)) ||
      !Number.isSafeInteger(p.featuredRank)
    )
      fail(p.id);
    if (
      new Set(p.optionDefinitions.map((o) => o.name)).size !== p.optionDefinitions.length ||
      p.optionDefinitions.some(
        (o) =>
          !o.name ||
          o.values.length < 1 ||
          o.values.length > 10 ||
          new Set(o.values).size !== o.values.length ||
          o.values.some((v) => typeof v !== 'string' || !v),
      )
    )
      fail(`options ${p.id}`);
  }
  for (const s of c.skus) {
    const p = c.products.find((p) => p.id === s.productId);
    if (!p || skuIds.has(s.id) || !s.id) fail(`SKU reference ${s.id}`);
    skuIds.add(s.id);
    if (
      !integer(s.priceCents, 1, 999999) ||
      s.currency !== 'USD' ||
      !integer(s.initialStock, 0, 999) ||
      !integer(s.maxPerOrder ?? 10, 1, 99) ||
      !['active', 'archived'].includes(s.status) ||
      (s.imageId !== undefined && (!s.imageId.startsWith('/products/') || s.imageId.includes('..')))
    )
      fail(s.id);
    if (
      Object.keys(s.options).length !== p!.optionDefinitions.length ||
      p!.optionDefinitions.some((o) => !o.values.includes(s.options[o.name]))
    )
      fail(`combination ${s.id}`);
    const key = `${s.productId}:${JSON.stringify(Object.entries(s.options).sort())}`;
    if (combos.has(key)) fail(`duplicate combination ${s.id}`);
    combos.add(key);
  }
  return c;
}
validateCatalog(catalog);
