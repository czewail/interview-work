import type { Catalog, Category, Product, SKU } from '../lib/types';
export const categories: Category[] = ['Phones', 'Computers', 'Audio', 'Accessories'];
const products: Product[] = [],
  skus: SKU[] = [];
function product(
  id: string,
  name: string,
  brand: string,
  categoryId: Category,
  art: string,
  options: Product['optionDefinitions'],
  variants: [string, string[], number, number, number?][],
  rank: number,
  highlights: string[],
  status: Product['status'] = 'active',
) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-$/, '');
  const specifications: Product['specifications'] =
    categoryId === 'Phones' || categoryId === 'Computers'
      ? [
          { label: 'Processor', value: 'Demo A8, 8-core' },
          { label: 'RAM', value: 'Varies by selected option; otherwise 8 GB' },
          { label: 'Storage', value: 'Varies by selected option; otherwise 256 GB' },
          {
            label: 'Display',
            value: categoryId === 'Phones' ? '6.2-inch OLED, 60 Hz' : '13.6-inch IPS, 60 Hz',
          },
          { label: 'Ports', value: 'USB-C' },
          { label: 'Power', value: 'USB-C, 20 V / 3 A (60 W)' },
          { label: 'Compatibility', value: 'Demo OS; USB-C accessories' },
        ]
      : categoryId === 'Audio'
        ? [
            { label: 'Connection', value: 'Bluetooth 5.3 / USB-C' },
            { label: 'Battery life', value: 'Up to 30 hours (demo specification)' },
            {
              label: 'Noise cancellation',
              value: art === 'headphones' ? 'Active noise cancellation' : 'Not specified',
            },
            {
              label: 'Compatibility',
              value: 'Bluetooth-enabled iOS, Android, Windows and macOS devices',
            },
            { label: 'Power', value: 'USB-C, 5 V / 1 A (5 W)' },
          ]
        : [
            { label: 'Interface', value: 'USB-C' },
            { label: 'Input power', value: '5–20 V, up to 3 A (60 W)' },
            { label: 'Output power', value: 'Up to 60 W; varies by host device' },
            { label: 'Compatibility', value: 'USB-C phones and computers; host support required' },
          ];
  products.push({
    id,
    slug,
    name,
    brand,
    model: id,
    categoryId,
    description: `${name} brings a considered approach to your everyday setup. ${highlights.join('. ')}. Explore the available options to find your fit. All specifications and branding are fictional demo data.`,
    keywords: [categoryId.toLowerCase(), ...highlights.map((x) => x.toLowerCase())],
    images: [`/products/${art}.webp`, `/products/${art}-detail.webp`],
    specifications,
    optionDefinitions: options,
    status,
    featuredRank: rank,
    publishedAt: `2026-09-${String(Math.min(Number(id.replace(/\D/g, '')) || 1, 28)).padStart(2, '0')}`,
    highlights,
    packageContents: `${name}, quick-start guide${categoryId !== 'Accessories' ? ', USB-C cable' : ''}`,
  });
  variants.forEach(([skuId, values, priceCents, initialStock, maxPerOrder]) =>
    skus.push({
      id: skuId,
      productId: id,
      options: Object.fromEntries(options.map((o, i) => [o.name, values[i]])),
      priceCents,
      initialStock,
      maxPerOrder: maxPerOrder ?? 10,
      currency: 'USD',
      status: 'active',
    }),
  );
}
const color = { name: 'Color', values: ['Black', 'White'] };
product(
  'P01',
  'Nova Phone',
  'Lumio',
  'Phones',
  'phone',
  [
    { name: 'Color', values: ['Black', 'Silver'] },
    { name: 'Storage', values: ['128 GB', '256 GB'] },
  ],
  [
    ['NP-B128', ['Black', '128 GB'], 49999, 8],
    ['NP-B256', ['Black', '256 GB'], 59999, 2],
    ['NP-S128', ['Silver', '128 GB'], 49999, 0],
  ],
  4,
  ['6.2-inch OLED', '128 / 256 GB storage'],
);
product(
  'P02',
  'Aero Laptop',
  'Vela',
  'Computers',
  'laptop',
  [
    { name: 'RAM', values: ['16 GB'] },
    { name: 'Storage', values: ['512 GB'] },
  ],
  [['AL-16512', ['16 GB', '512 GB'], 129999, 6]],
  7,
  ['13.6-inch display', '16 GB RAM · 512 GB SSD'],
);
product(
  'P03',
  'Echo Headphones',
  'Lumio',
  'Audio',
  'headphones',
  [color],
  [
    ['EH-B', ['Black'], 9999, 3],
    ['EH-W', ['White'], 10999, 0],
  ],
  1,
  ['Active noise cancellation', '30-hour listening'],
);
product(
  'P04',
  'USB C Cable',
  'Vela',
  'Accessories',
  'cable',
  [{ name: 'Length', values: ['1 m'] }],
  [['UC-1', ['1 m'], 1999, 20]],
  10,
  ['60 W charging', '1 m braided cable'],
);
product(
  'P05',
  'USB Adapter',
  'Vela',
  'Accessories',
  'adapter',
  [],
  [['UA-1', [], 550, 99, 99]],
  12,
  ['USB-C connection', 'Pocket-sized design'],
);
product('P06', 'Solo Charger', 'Orbit', 'Accessories', 'charger', [], [['SC-1', [], 4999, 1]], 8, [
  '60 W USB-C power',
  'Compact everyday charging',
]);
product(
  'P07',
  'Pulse Speaker',
  'Orbit',
  'Audio',
  'speaker',
  [{ name: 'Color', values: ['Black'] }],
  [['PS-1', ['Black'], 7999, 0]],
  11,
  ['Bluetooth 5.3', 'Portable sound'],
);
product(
  'P08',
  'Archived Phone',
  'Lumio',
  'Phones',
  'phone',
  [],
  [['AP-1', [], 29999, 10]],
  35,
  ['USB-C', 'Demo archive'],
  'archived',
);
product('P09', 'Retired Hub', 'Orbit', 'Accessories', 'hub', [], [['RH-1', [], 3999, 5]], 36, [
  'USB-C',
  'Demo archive',
]);
skus.find((s) => s.id === 'RH-1')!.status = 'archived';
const rest: [string, string, Category, string, number, string[]][] = [
  [
    'Arc Wireless Earbuds',
    'Vela',
    'Audio',
    'earbuds',
    6999,
    ['Compact charging case', 'Bluetooth 5.3'],
  ],
  [
    'Studio Monitor',
    'Orbit',
    'Computers',
    'monitor',
    32999,
    ['27-inch display', 'USB-C connectivity'],
  ],
  [
    'Form Mechanical Keyboard',
    'Vela',
    'Accessories',
    'keyboard',
    8999,
    ['Tactile switches', 'Compact layout'],
  ],
  ['Slate Tablet', 'Lumio', 'Computers', 'tablet', 34999, ['11-inch display', '256 GB storage']],
  [
    'Pebble Wireless Mouse',
    'Orbit',
    'Accessories',
    'mouse',
    3999,
    ['Quiet clicks', 'Bluetooth connection'],
  ],
  ['Move Mini Speaker', 'Vela', 'Audio', 'speaker', 5999, ['Portable listening', 'USB-C charging']],
  ['Nova Phone Plus', 'Lumio', 'Phones', 'phone', 69999, ['6.2-inch OLED', '256 GB storage']],
  [
    'Desk USB-C Hub',
    'Orbit',
    'Accessories',
    'hub',
    6999,
    ['Four-port connection', '60 W pass-through'],
  ],
  [
    'Aero Laptop Air',
    'Vela',
    'Computers',
    'laptop',
    99999,
    ['13.6-inch display', 'Lightweight design'],
  ],
  [
    'Echo Studio Headphones',
    'Lumio',
    'Audio',
    'headphones',
    14999,
    ['Active noise cancellation', '30-hour listening'],
  ],
  [
    'Pocket Power Bank',
    'Orbit',
    'Accessories',
    'powerbank',
    4599,
    ['10,000 mAh capacity', 'USB-C connection'],
  ],
  [
    'Studio Display Mini',
    'Vela',
    'Computers',
    'monitor',
    22999,
    ['24-inch display', 'USB-C connectivity'],
  ],
  ['Nova Phone Mini', 'Lumio', 'Phones', 'phone', 39999, ['6.2-inch OLED', '128 GB storage']],
  ['Arc Sport Earbuds', 'Vela', 'Audio', 'earbuds', 8999, ['Secure everyday fit', 'Bluetooth 5.3']],
  [
    'Travel Wall Charger',
    'Orbit',
    'Accessories',
    'charger',
    2999,
    ['USB-C power', 'Compact format'],
  ],
  [
    'Slate Tablet Pro',
    'Lumio',
    'Computers',
    'tablet',
    54999,
    ['11-inch display', '256 GB storage'],
  ],
  [
    'Form Keyboard Pro',
    'Vela',
    'Accessories',
    'keyboard',
    11999,
    ['Tactile switches', 'Full-size layout'],
  ],
  [
    'Desk Wireless Mouse',
    'Orbit',
    'Accessories',
    'mouse',
    2999,
    ['Quiet clicks', 'USB-C charging'],
  ],
  [
    'Echo On-Ear Headphones',
    'Lumio',
    'Audio',
    'headphones',
    7999,
    ['Bluetooth 5.3', '30-hour listening'],
  ],
  [
    'Braided USB-C Cable',
    'Vela',
    'Accessories',
    'cable',
    2499,
    ['60 W charging', 'Braided finish'],
  ],
  ['Nova Phone Studio', 'Lumio', 'Phones', 'phone', 79999, ['6.2-inch OLED', '256 GB storage']],
  ['Aero Work Laptop', 'Vela', 'Computers', 'laptop', 149999, ['13.6-inch display', '16 GB RAM']],
  [
    'Move Home Speaker',
    'Orbit',
    'Audio',
    'speaker',
    12999,
    ['Bluetooth 5.3', 'Room-filling sound'],
  ],
  [
    'Pocket USB-C Adapter',
    'Orbit',
    'Accessories',
    'adapter',
    1499,
    ['USB-C connection', 'Compact format'],
  ],
  ['Arc Everyday Earbuds', 'Vela', 'Audio', 'earbuds', 4999, ['Bluetooth 5.3', 'USB-C charging']],
  [
    'Travel Power Bank',
    'Orbit',
    'Accessories',
    'powerbank',
    5999,
    ['20,000 mAh capacity', 'USB-C power'],
  ],
  [
    'Studio Portable USB-C Multiport Dock with HDMI, USB-A and Power Delivery for Your Everyday Workspace',
    'Vela',
    'Accessories',
    'hub',
    9999,
    ['USB-C connection', '60 W pass-through'],
  ],
];
rest.forEach(([name, brand, cat, art, price, highlights], i) => {
  const n = i + 10,
    id = `P${String(n).padStart(2, '0')}`;
  product(
    id,
    name,
    brand,
    cat,
    art,
    [{ name: 'Color', values: ['Graphite', 'Silver', 'Sand'] }],
    ['Graphite', 'Silver', 'Sand'].map((v, k) => [
      `${id}-${k + 1}`,
      [v],
      price + k * 1000,
      k === 2 && i % 3 === 0 ? 0 : 8 + k * 4,
    ]),
    i === 0 ? 2 : i === 1 ? 3 : i + 5,
    highlights,
  );
});
// Explicit demo specification overrides; display copy is never parsed to infer capabilities.
const overrides: Record<string, Record<string, string>> = {
  P11: {
    Processor: 'Not specified',
    RAM: 'Not specified',
    Storage: 'Not specified',
    Display: '27-inch IPS, 60 Hz',
    Power: 'USB-C, 20 V / 3 A (60 W)',
    Compatibility: 'USB-C DisplayPort Alt Mode hosts',
  },
  P21: {
    Processor: 'Not specified',
    RAM: 'Not specified',
    Storage: 'Not specified',
    Display: '24-inch IPS, 60 Hz',
    Compatibility: 'USB-C DisplayPort Alt Mode hosts',
  },
  P13: { Display: '11-inch IPS, 60 Hz' },
  P25: { Display: '11-inch IPS, 60 Hz' },
  P22: { Storage: '128 GB' },
  P31: { RAM: '16 GB' },
};
for (const p of products) {
  for (const spec of p.specifications) {
    spec.value = overrides[p.id]?.[spec.label] ?? spec.value;
  }
  for (const sku of skus.filter((s) => s.productId === p.id)) {
    const shade = sku.options.Color?.toLowerCase();
    if (shade && ['white', 'silver', 'sand'].includes(shade))
      sku.imageId = p.images[0].replace('.webp', `-${shade}.webp`);
  }
}
export const catalog: Catalog = {
  schemaVersion: 1,
  catalogVersion: '2026.10.10-v2',
  products,
  skus,
};

import { writeFileSync } from 'node:fs';
import { validateCatalog } from '../lib/catalog';
validateCatalog(catalog);
writeFileSync('lib/catalog-data.json', JSON.stringify(catalog, null, 2) + '\n');
console.log('Wrote 36-product demo catalog.');
