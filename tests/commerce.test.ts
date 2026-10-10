import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from '../lib/fixtures';
import { catalog, validateCatalog } from '../lib/catalog';
import {
  defaultQuery,
  parseQuery,
  priceError,
  queryCatalog,
  queryUrl,
  searchQuery,
} from '../lib/query';
import {
  add,
  begin,
  cancel,
  changeOptions,
  emptyDraft,
  inspectLine,
  newState,
  quote,
  remove,
  resolveAttempt,
  setQuantity,
  totals,
  validateDraft,
} from '../lib/commerce';
import { recover, validState, DemoRepository } from '../lib/persistence';
import 'fake-indexeddb/auto';
const base = () => fixture('BASE');
const state = () => newState(base(), 10000);
const names = (q = {}) =>
  queryCatalog(base(), { ...defaultQuery, ...q }, state()).all.map((x) => x.product.id);
test('CONTENT: 36 products, >=80 SKUs; validator rejects invalid catalog bounds/references/options', () => {
  assert.equal(catalog.products.length, 36);
  assert.ok(catalog.skus.length >= 80);
  for (const mutate of [
    (c: any) => (c.skus[0].priceCents = 0),
    (c: any) => (c.skus[0].initialStock = NaN),
    (c: any) => (c.skus[0].currency = 'EUR'),
    (c: any) => (c.skus[0].productId = 'missing'),
    (c: any) => (c.products[0].images = []),
    (c: any) => (c.products[0].slug = c.products[1].slug),
    (c: any) => (c.skus[1].options = c.skus[0].options),
  ]) {
    const c = structuredClone(catalog);
    mutate(c);
    assert.throws(() => validateCatalog(c));
  }
});
test('LIST: BASE active visibility, featured order and stable price sorts', () => {
  assert.deepEqual(names(), ['P04', 'P05', 'P03', 'P01', 'P06', 'P07', 'P02']);
  assert.deepEqual(names({ sort: 'price-asc' }), ['P05', 'P04', 'P06', 'P07', 'P03', 'P01', 'P02']);
  assert.deepEqual(names({ sort: 'newest' }), ['P07', 'P06', 'P05', 'P04', 'P03', 'P02', 'P01']);
});
test('LIST: price and stock are evaluated on the same SKU', () => {
  assert.deepEqual(names({ min: '100', max: '110' }), ['P03']);
  assert.deepEqual(names({ min: '100', max: '110', stockOnly: true }), []);
  assert.equal(names({ stockOnly: true }).length, 6);
  assert.deepEqual(names({ min: '99.99', max: '99.99' }), ['P03']);
});
test('LIST: token AND, brand OR and category AND', () => {
  assert.deepEqual(names({ q: 'nova phone' }), ['P01']);
  assert.deepEqual(names({ q: 'lumio impossible' }), []);
  assert.deepEqual(names({ category: 'Accessories', brands: ['Vela', 'Orbit'] }), [
    'P04',
    'P05',
    'P06',
  ]);
});
test('LIST: query normalization, invalid scalar removal, Unicode truncation, roundtrip', () => {
  const { query, notices } = parseQuery(
    new URLSearchParams(
      'q=' +
        encodeURIComponent('🙂'.repeat(101)) +
        '&brand=Vela&brand=Vela&brand=missing&category=bad&min=1e2&max=20&page=1.5',
    ),
    base(),
  );
  assert.equal([...query.q].length, 100);
  assert.equal(query.min, '');
  assert.equal(query.max, '');
  assert.equal(query.page, 1);
  assert.deepEqual(query.brands, ['Vela']);
  assert.equal(notices.length, 2);
  assert.deepEqual(parseQuery(new URLSearchParams(queryUrl(query).slice(2)), base()).query, query);
  assert.equal(
    parseQuery(new URLSearchParams('q=  nOvA   PHONE  &page=2&page=3'), base()).query.q,
    'nOvA PHONE',
  );
});
test('LIST: price validation rejects exponent, negative, precision, overflow and reversed range', () => {
  for (const v of ['-1', '1e2', 'abc', '1.001', '10000', 'Infinity']) assert.ok(priceError(v, ''));
  assert.ok(priceError('2', '1'));
  assert.equal(priceError('0', '9999.99'), '');
});
test('LIST: first search relevance; explicit sort survives edits and clear', () => {
  const q = searchQuery(defaultQuery, 'USB');
  assert.equal(q.sort, 'relevance');
  assert.equal(searchQuery(q, '').sort, 'featured');
  assert.equal(searchQuery({ ...q, sort: 'price-asc' }, 'cable').sort, 'price-asc');
  assert.equal(searchQuery({ ...q, sort: 'price-asc' }, '').sort, 'price-asc');
});
test('LIST: pagination 12/12/1, clamp out-of-range page', () => {
  const c = fixture('PAGES');
  assert.equal(queryCatalog(c, defaultQuery, state()).items.length, 12);
  assert.equal(queryCatalog(c, { ...defaultQuery, page: 2 }, state()).items.length, 12);
  const last = queryCatalog(c, { ...defaultQuery, page: 999 }, state());
  assert.equal(last.page, 3);
  assert.equal(last.items.length, 1);
});
test('PRICING: PRD exact totals and half-cent thresholds', () => {
  assert.deepEqual(totals(7097), {
    subtotalCents: 7097,
    shippingCents: 599,
    taxCents: 568,
    totalCents: 8264,
  });
  assert.equal(totals(9999).totalCents, 11398);
  assert.equal(totals(10000).totalCents, 10800);
  assert.equal(totals(10000, 'express').totalCents, 12299);
  assert.equal(totals(7097, 'express').totalCents, 9164);
  assert.equal(totals(0).totalCents, 0);
  assert.deepEqual(
    [1, 6, 7].map((n) => totals(n).taxCents),
    [0, 0, 1],
  );
  assert.equal(totals(1979998020).totalCents, 2138397862);
});
test('CART: repeated add merges; limits and invalid quantities leave state unchanged', () => {
  const c = base(),
    s = state();
  add(c, s, 'UC-1', 8);
  add(c, s, 'UC-1', 2);
  assert.equal(s.cart.length, 1);
  assert.equal(s.cart[0].quantity, 10);
  const before = structuredClone(s);
  for (const n of [1, NaN, Infinity, -1, 0.5, 100]) assert.throws(() => add(c, s, 'UC-1', n));
  assert.deepEqual(s, before);
});
test('CART: change options atomic merge and all-or-nothing stock check', () => {
  const c = base(),
    s = state();
  add(c, s, 'NP-B128', 1);
  add(c, s, 'NP-B256', 1);
  changeOptions(c, s, 'NP-B128', 'NP-B256');
  assert.equal(s.cart.length, 1);
  assert.equal(s.cart[0].quantity, 2);
  add(c, s, 'NP-B128', 1);
  const before = structuredClone(s);
  assert.throws(() => changeOptions(c, s, 'NP-B128', 'NP-B256'));
  assert.deepEqual(s, before);
});
test('CART: 20-line capacity, same SKU allowed; invalid rows remain but do not count', () => {
  const c = fixture('LIMIT'),
    s = newState(c);
  c.skus.slice(0, 20).forEach((x) => add(c, s, x.id, 1));
  assert.throws(() => add(c, s, c.skus[20].id, 1));
  add(c, s, c.skus[0].id, 1);
  assert.equal(s.cart.length, 20);
  c.skus[0].status = 'archived';
  assert.equal(quote(c, s, 'standard').items.length, 19);
  assert.equal(s.cart[0].quantity, 2);
});
test('CART: inventory decreases require explicit adjustment, current price ignores snapshot', () => {
  const c = base(),
    s = state();
  add(c, s, 'NP-B128', 5);
  c.skus[0].initialStock = 2;
  assert.equal(inspectLine(c, s, s.cart[0]).valid, false);
  assert.equal(quote(c, s, 'standard').subtotalCents, 0);
  setQuantity(c, s, 'NP-B128', 2);
  s.cart[0].displaySnapshot.priceCents = 1;
  assert.equal(quote(c, s, 'standard').subtotalCents, 99998);
});
test('PAY: success delayed 2 seconds, atomic order/cart/inventory and replay idempotency', () => {
  const c = base(),
    s = state();
  add(c, s, 'UC-1', 3);
  add(c, s, 'UA-1', 2);
  begin(c, s, 'standard', 'success', quote(c, s, 'standard'), 10000, 'test-id');
  assert.equal(resolveAttempt(c, s, 11999), false);
  assert.throws(() => add(c, s, 'SC-1', 1));
  assert.throws(() => remove(s, 'UC-1'));
  assert.throws(() => begin(c, s, 'standard', 'success', quote(c, s, 'standard')));
  resolveAttempt(c, s, 12000);
  assert.equal(s.orders.length, 1);
  assert.equal(s.orders[0].totalCents, 8264);
  assert.equal(s.inventoryDeductions['UC-1'], 3);
  assert.equal(s.inventoryDeductions['UA-1'], 2);
  assert.equal(s.cart.length, 0);
  resolveAttempt(c, s, 15000);
  assert.equal(s.orders.length, 1);
  assert.equal(s.inventoryDeductions['UC-1'], 3);
});
for (const scenario of ['declined', 'error', 'timeout'] as const)
  test(`PAY: ${scenario} leaves inventory/cart unchanged; retry uses a new attempt`, () => {
    const c = base(),
      s = state();
    add(c, s, 'SC-1', 1);
    const cart = structuredClone(s.cart);
    begin(c, s, 'standard', scenario, quote(c, s, 'standard'), 10000, 'first');
    resolveAttempt(c, s, scenario === 'timeout' ? 17999 : 11999);
    assert.equal(s.activeAttempt?.state, 'processing');
    resolveAttempt(c, s, 18000);
    assert.equal(s.orders.length, 0);
    assert.deepEqual(s.inventoryDeductions, {});
    assert.deepEqual(s.cart, cart);
    begin(c, s, 'standard', 'success', quote(c, s, 'standard'), 20000, 'second');
    resolveAttempt(c, s, 99999, 'first');
    assert.equal(s.activeAttempt?.state, 'processing');
    resolveAttempt(c, s, 22000, 'second');
    assert.equal(s.orders.length, 1);
  });
test('PAY: cancel wins when committed first; completed success cannot be cancelled', () => {
  const c = base(),
    s = state();
  add(c, s, 'SC-1', 1);
  begin(c, s, 'standard', 'success', quote(c, s, 'standard'), 10000, 'first');
  cancel(s);
  resolveAttempt(c, s, 12000);
  assert.equal(s.orders.length, 0);
  begin(c, s, 'standard', 'success', quote(c, s, 'standard'), 10000, 'second');
  resolveAttempt(c, s, 12000);
  cancel(s);
  assert.equal(s.orders.length, 1);
  assert.equal(s.activeAttempt?.state, 'succeeded');
});
for (const change of ['price', 'stock', 'status', 'version', 'revision'])
  test(`PAY: ${change} change aborts with needs_review`, () => {
    const c = base(),
      s = state();
    add(c, s, 'UC-1', 3);
    begin(c, s, 'standard', 'success', quote(c, s, 'standard'), 10000, 'id');
    const sku = c.skus.find((x) => x.id === 'UC-1')!;
    if (change === 'price') sku.priceCents++;
    if (change === 'stock') sku.initialStock = 2;
    if (change === 'status') sku.status = 'archived';
    if (change === 'version') c.catalogVersion = 'new';
    if (change === 'revision') s.cartRevision++;
    resolveAttempt(c, s, 12000);
    assert.equal(s.activeAttempt?.state, 'needs_review');
    assert.equal(s.orders.length, 0);
    assert.equal(s.cart[0].quantity, 3);
  });
test('PAY: reviewed quote must match before creating an attempt', () => {
  const c = base(),
    s = state();
  add(c, s, 'UC-1', 1);
  const q = quote(c, s, 'standard');
  c.skus.find((x) => x.id === 'UC-1')!.priceCents++;
  assert.throws(() => begin(c, s, 'standard', 'success', q));
  assert.equal(s.activeAttempt, null);
});
test('ORDER: latest 20 retained without restoring old inventory; snapshots immutable', () => {
  const c = base(),
    s = state();
  for (let i = 0; i < 21; i++) {
    add(c, s, 'UA-1', 1);
    begin(c, s, 'standard', 'success', quote(c, s, 'standard'), 10000, `a${i}`);
    resolveAttempt(c, s, 12000);
  }
  assert.equal(s.orders.length, 20);
  assert.equal(s.inventoryDeductions['UA-1'], 21);
  c.skus.find((x) => x.id === 'UA-1')!.priceCents = 1;
  assert.equal(s.orders[0].items[0].priceCents, 550);
});
test('FORM: Unicode names, boundaries, email and ZIP; no address in persisted quote', () => {
  const d = {
    ...emptyDraft,
    email: 'alex@example.com',
    fullName: '李 Zoë O’Neil',
    address1: '123 Demo St',
    city: 'São Paulo',
    state: 'CA',
    zip: '02108',
  };
  assert.deepEqual(validateDraft(d), {});
  for (const [key, length] of [
    ['fullName', 80],
    ['address1', 120],
    ['address2', 120],
    ['city', 80],
  ] as const) {
    assert.equal(validateDraft({ ...d, [key]: 'x'.repeat(length) })[key], undefined);
    assert.ok(validateDraft({ ...d, [key]: 'x'.repeat(length + 1) })[key]);
  }
  for (const email of ['a b@c.com', 'invalid', 'a@', ''])
    assert.ok(validateDraft({ ...d, email }).email);
  for (const zip of ['1234', 'abcde', '123456']) assert.ok(validateDraft({ ...d, zip }).zip);
  assert.deepEqual(validateDraft({ ...d, zip: '94105-1234' }), {});
});
test('DATA: expiry boundary, future corruption, unknown SKU retained, schema and nonfinite checks', () => {
  const c = base(),
    s = state();
  add(c, s, 'UC-1', 1);
  const ttl = 30 * 86400000;
  assert.equal(recover(s, c, 10000 + ttl - 1).state.cart.length, 1);
  assert.equal(recover(s, c, 10000 + ttl).state.cart.length, 0);
  assert.equal(recover({ ...s, lastMutatedAt: 400001 }, c, 10000).notice, 'Demo data was reset');
  s.cart[0].skuId = 'unknown';
  assert.equal(recover(s, c, 11000).state.cart.length, 1);
  assert.equal(validState({ ...s, schemaVersion: 9 }), false);
  for (const quantity of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    const x = structuredClone(s);
    x.cart[0].quantity = quantity;
    assert.equal(validState(x), false);
  }
});
test('DATA: catalog migration retains cart/orders and ends pending', () => {
  const c = base(),
    s = state();
  add(c, s, 'UC-1', 1);
  begin(c, s, 'standard', 'success', quote(c, s, 'standard'), 10000);
  c.catalogVersion = 'new';
  const r = recover(s, c, 11000);
  assert.equal(r.state.cart.length, 1);
  assert.equal(r.state.activeAttempt?.state, 'needs_review');
});
test('DATA: concurrent repositories serialize increments; write failure rolls back and permits memory retry', async () => {
  const c = base();
  const a = new DemoRepository(
      () => c,
      () => {},
    ),
    b = new DemoRepository(
      () => c,
      () => {},
    );
  await a.open();
  await b.open();
  await a.run((s) => Object.assign(s, newState(c)));
  await Promise.all([a.run((s) => add(c, s, 'UC-1', 1)), b.run((s) => add(c, s, 'UC-1', 1))]);
  assert.equal((await a.run()).state.cart[0].quantity, 2);
  a.failNextWrite = true;
  await assert.rejects(a.run((s) => setQuantity(c, s, 'UC-1', 3)));
  assert.equal(a.temporary, true);
  assert.equal((await a.run()).state.cart[0].quantity, 2);
  await a.run((s) => setQuantity(c, s, 'UC-1', 3));
  assert.equal((await a.run()).state.cart[0].quantity, 3);
  assert.equal((await b.run()).state.cart[0].quantity, 2);
  a.close();
  b.close();
});
test('DATA: concurrent checkout completion creates one order and one deduction', async () => {
  const c = base(),
    a = new DemoRepository(
      () => c,
      () => {},
    ),
    b = new DemoRepository(
      () => c,
      () => {},
    );
  await a.open();
  await b.open();
  await a.run((s) => {
    Object.assign(s, newState(c));
    add(c, s, 'SC-1', 1);
    begin(c, s, 'standard', 'success', quote(c, s, 'standard'), Date.now() - 3000, 'shared');
  });
  await Promise.all([a.run((s) => resolveAttempt(c, s)), b.run((s) => resolveAttempt(c, s))]);
  const s = (await a.run()).state;
  assert.equal(s.orders.length, 1);
  assert.equal(s.inventoryDeductions['SC-1'], 1);
  assert.equal(s.cart.length, 0);
  a.close();
  b.close();
});
test('PERF: 500 products / 3000 SKUs filtered within 200 ms', () => {
  const c = fixture('LIMIT'),
    s = newState(c),
    start = performance.now();
  const result = queryCatalog(c, { ...defaultQuery, stockOnly: true, sort: 'price-desc' }, s);
  const elapsed = performance.now() - start;
  assert.equal(result.total, 500);
  assert.ok(elapsed < 200, `filter took ${elapsed} ms`);
  console.log(`500/3000 query: ${elapsed.toFixed(2)} ms`);
});

test('PAY: stock changes still require review even when enough units remain', () => {
  const c = base(),
    s = state();
  add(c, s, 'UC-1', 1);
  begin(c, s, 'standard', 'success', quote(c, s, 'standard'), 10000, 'stock-check');
  c.skus.find((x) => x.id === 'UC-1')!.initialStock = 19;
  resolveAttempt(c, s, 12000);
  assert.equal(s.activeAttempt?.state, 'needs_review');
  assert.equal(s.orders.length, 0);
});

test('DATA: failed final transaction persists no partial order or inventory change', async () => {
  const c = base(),
    a = new DemoRepository(
      () => c,
      () => {},
    ),
    b = new DemoRepository(
      () => c,
      () => {},
    );
  await a.open();
  await b.open();
  await a.run((s) => {
    Object.assign(s, newState(c));
    add(c, s, 'SC-1', 1);
    begin(c, s, 'standard', 'success', quote(c, s, 'standard'), Date.now() - 3000, 'failed-final');
  });
  a.failNextWrite = true;
  await assert.rejects(a.run((s) => resolveAttempt(c, s)));
  const durable = (await b.run()).state;
  assert.equal(durable.orders.length, 0);
  assert.equal(durable.cart.length, 1);
  assert.deepEqual(durable.inventoryDeductions, {});
  assert.equal(durable.activeAttempt?.state, 'processing');
  a.close();
  b.close();
});
