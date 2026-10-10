import { catalog } from './catalog';
import type { Catalog } from './types';
export function fixture(name: 'BASE' | 'PAGES' | 'LIMIT' | 'CONTENT' | 'EMPTY'): Catalog {
  const c = structuredClone(catalog);
  if (name === 'CONTENT') return c;
  if (name === 'EMPTY') {
    c.products = [];
    c.skus = [];
    return c;
  }
  if (name === 'BASE') {
    c.products = c.products.slice(0, 9);
    c.skus = c.skus.filter((s) => c.products.some((p) => p.id === s.productId));
    const ranks = [4, 7, 3, 1, 2, 5, 6, 8, 9];
    c.products.forEach((p, i) => {
      p.featuredRank = ranks[i];
      p.keywords =
        i === 0
          ? ['smartphone', 'usb c']
          : i === 3
            ? ['charging', 'usb c']
            : i === 4
              ? ['usb connector']
              : [];
    });
    return c;
  }
  c.products = [];
  c.skus = [];
  const count = name === 'PAGES' ? 25 : 500;
  for (let i = 1; i <= count; i++) {
    const p = structuredClone(catalog.products[4]);
    p.id = `PX${String(i).padStart(2, '0')}`;
    p.slug = `fixture-${i}`;
    p.name = `Fixture product ${i}`;
    p.featuredRank = i;
    p.optionDefinitions =
      name === 'LIMIT' ? [{ name: 'Color', values: ['A', 'B', 'C', 'D', 'E', 'F'] }] : [];
    c.products.push(p);
    for (let k = 0; k < (name === 'LIMIT' ? 6 : 1); k++)
      c.skus.push({
        id: `${p.id}-${k}`,
        productId: p.id,
        options: name === 'LIMIT' ? { Color: 'ABCDEF'[k] } : {},
        priceCents: name === 'LIMIT' ? 999999 : i * 100,
        currency: 'USD',
        initialStock: 999,
        maxPerOrder: 99,
        status: 'active',
      });
  }
  return c;
}
