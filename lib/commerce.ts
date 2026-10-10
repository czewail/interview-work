import type {
  Catalog,
  CartLine,
  DemoState,
  Quote,
  Shipping,
  Scenario,
  SKU,
  Snapshot,
  CheckoutDraft,
} from './types';
import { stock } from './query';
export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
export const optionText = (o: Record<string, string>) => Object.values(o).join(' / ');
export function totals(subtotalCents: number, shipping: Shipping = 'standard') {
  const shippingCents =
      subtotalCents === 0 ? 0 : shipping === 'express' ? 1499 : subtotalCents >= 10000 ? 0 : 599,
    taxCents = Math.floor((subtotalCents * 8 + 50) / 100);
  return {
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents: subtotalCents + shippingCents + taxCents,
  };
}
export function newState(c: Catalog, now = Date.now()): DemoState {
  return {
    schemaVersion: 1,
    catalogVersion: c.catalogVersion,
    revision: 0,
    cartRevision: 0,
    lastMutatedAt: now,
    cart: [],
    inventoryDeductions: {},
    activeAttempt: null,
    orders: [],
  };
}
export function snapshot(c: Catalog, s: SKU): Snapshot {
  const p = c.products.find((p) => p.id === s.productId)!;
  return {
    name: p.name,
    image: s.imageId || p.images[0],
    slug: p.slug,
    options: { ...s.options },
    priceCents: s.priceCents,
  };
}
export function inspectLine(c: Catalog, state: DemoState, line: CartLine) {
  const sku = c.skus.find((s) => s.id === line.skuId),
    p = c.products.find((p) => p.id === sku?.productId);
  const available = sku ? Math.min(stock(sku, state), sku.maxPerOrder ?? 10) : 0;
  const unavailable = !sku || sku.status !== 'active' || p?.status !== 'active';
  const error = unavailable
    ? 'Item no longer available'
    : available === 0
      ? 'Out of stock'
      : line.quantity > available
        ? `Only ${available} available`
        : '';
  return {
    sku,
    product: p,
    available,
    error,
    valid: !error,
    info: sku && p ? snapshot(c, sku) : line.displaySnapshot,
    priceChanged: !!sku && sku.priceCents !== line.displaySnapshot.priceCents,
  };
}
export function quote(c: Catalog, state: DemoState, shipping: Shipping): Quote {
  const items = state.cart.flatMap((l) => {
    const info = inspectLine(c, state, l);
    return info.valid ? [{ ...info.info, skuId: l.skuId, quantity: l.quantity }] : [];
  });
  return {
    items,
    shippingMethod: shipping,
    ...totals(
      items.reduce((n, l) => n + l.priceCents * l.quantity, 0),
      shipping,
    ),
  };
}
export class CommerceError extends Error {
  constructor(
    message: string,
    public code = 'INVALID',
  ) {
    super(message);
  }
}
function unlocked(s: DemoState) {
  if (s.activeAttempt?.state === 'processing')
    throw new CommerceError('Checkout in progress. Resume or cancel the simulation.', 'LOCKED');
}
function validQuantity(n: number) {
  if (!Number.isSafeInteger(n) || n < 1 || n > 99)
    throw new CommerceError('Enter a whole quantity from 1 to 99.');
}
function checked(c: Catalog, s: DemoState, skuId: string, quantity: number, now: number): CartLine {
  validQuantity(quantity);
  const sku = c.skus.find((s) => s.id === skuId);
  if (!sku || !c.products.some((p) => p.id === sku.productId))
    throw new CommerceError('Item no longer available');
  const line = { skuId, quantity, addedAt: now, displaySnapshot: snapshot(c, sku) };
  const x = inspectLine(c, s, line);
  if (x.error) throw new CommerceError(x.error);
  return line;
}
export function add(c: Catalog, s: DemoState, skuId: string, n: number, now = Date.now()) {
  unlocked(s);
  validQuantity(n);
  const existing = s.cart.find((l) => l.skuId === skuId);
  if (!existing && s.cart.length >= 20)
    throw new CommerceError('Your cart can hold up to 20 different options.');
  const line = checked(c, s, skuId, (existing?.quantity || 0) + n, now);
  if (existing)
    Object.assign(existing, { quantity: line.quantity, displaySnapshot: line.displaySnapshot });
  else s.cart.push(line);
  s.cartRevision++;
}
export function setQuantity(c: Catalog, s: DemoState, id: string, n: number) {
  unlocked(s);
  const old = s.cart.find((l) => l.skuId === id);
  if (!old) throw new CommerceError('This item was removed. Refresh your cart.');
  const line = checked(c, s, id, n, old.addedAt);
  Object.assign(old, line);
  s.cartRevision++;
}
export function remove(s: DemoState, id: string) {
  unlocked(s);
  s.cart = s.cart.filter((l) => l.skuId !== id);
  s.cartRevision++;
}
export function changeOptions(c: Catalog, s: DemoState, from: string, to: string) {
  unlocked(s);
  const old = s.cart.find((l) => l.skuId === from);
  if (!old) throw new CommerceError('This item was removed.');
  if (from === to) {
    checked(c, s, to, old.quantity, old.addedAt);
    return;
  }
  const target = s.cart.find((l) => l.skuId === to);
  const line = checked(c, s, to, old.quantity + (target?.quantity || 0), old.addedAt);
  s.cart = s.cart.filter((l) => l.skuId !== from && l.skuId !== to);
  s.cart.push(line);
  s.cartRevision++;
}
export function begin(
  c: Catalog,
  s: DemoState,
  shipping: Shipping,
  scenario: Scenario,
  expected: Quote,
  now = Date.now(),
  id = crypto.randomUUID(),
) {
  unlocked(s);
  if (!s.cart.length || s.cart.some((l) => !inspectLine(c, s, l).valid))
    throw new CommerceError('Items changed, review your order', 'REVIEW');
  const current = quote(c, s, shipping);
  if (JSON.stringify(current) !== JSON.stringify(expected))
    throw new CommerceError('Items changed, review your order', 'REVIEW');
  s.activeAttempt = {
    id,
    state: 'processing',
    cartRevision: s.cartRevision,
    catalogVersion: c.catalogVersion,
    quoteSnapshot: current,
    inventorySnapshot: Object.fromEntries(
      current.items.map((l) => [
        l.skuId,
        stock(
          c.skus.find((x) => x.id === l.skuId)!,
          s,
        ),
      ]),
    ),
    scenario,
    startedAt: now,
    resolveAt: now + (scenario === 'timeout' ? 8000 : 2000),
  };
}
export function resolveAttempt(c: Catalog, s: DemoState, now = Date.now(), expectedId?: string) {
  const a = s.activeAttempt;
  if (!a || a.state !== 'processing' || (expectedId && a.id !== expectedId) || now < a.resolveAt)
    return false;
  if (
    a.cartRevision !== s.cartRevision ||
    a.catalogVersion !== c.catalogVersion ||
    s.cart.some((l) => !inspectLine(c, s, l).valid) ||
    Object.entries(a.inventorySnapshot).some(([id, n]) => {
      const sku = c.skus.find((x) => x.id === id);
      return !sku || stock(sku, s) !== n;
    }) ||
    JSON.stringify(quote(c, s, a.quoteSnapshot.shippingMethod)) !== JSON.stringify(a.quoteSnapshot)
  ) {
    a.state = 'needs_review';
    return true;
  }
  if (a.scenario !== 'success') {
    a.state =
      a.scenario === 'declined' ? 'declined' : a.scenario === 'timeout' ? 'timed_out' : 'failed';
    return true;
  }
  const orderId = `demo-${a.id}`;
  if (!s.orders.some((o) => o.attemptId === a.id)) {
    s.orders.unshift({
      ...structuredClone(a.quoteSnapshot),
      id: orderId,
      attemptId: a.id,
      createdAt: now,
      status: 'demo_placed',
      currency: 'USD',
    });
    s.orders = s.orders.slice(0, 20);
    for (const l of a.quoteSnapshot.items)
      s.inventoryDeductions[l.skuId] = (s.inventoryDeductions[l.skuId] || 0) + l.quantity;
    s.cart = [];
    s.cartRevision++;
  }
  a.state = 'succeeded';
  a.orderId = orderId;
  return true;
}
export function cancel(s: DemoState, id?: string) {
  if (s.activeAttempt?.state === 'processing' && (!id || s.activeAttempt.id === id))
    s.activeAttempt.state = 'cancelled';
}
export const emptyDraft: CheckoutDraft = {
  email: '',
  fullName: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  shippingMethod: 'standard',
};
export const states =
  'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(
    ' ',
  );
export function validateDraft(d: CheckoutDraft) {
  const errors: Partial<Record<keyof CheckoutDraft, string>> = {};
  for (const [key, max, required] of [
    ['fullName', 80, true],
    ['address1', 120, true],
    ['address2', 120, false],
    ['city', 80, true],
  ] as const) {
    const n = [...d[key].trim()].length;
    if (required && !n) errors[key] = 'This field is required.';
    else if (n > max) errors[key] = `Use ${max} characters or fewer.`;
  }
  const email = d.email.trim();
  if (
    email.length < 3 ||
    email.length > 254 ||
    /\s/.test(email) ||
    !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(
      email,
    )
  )
    errors.email = 'Enter a valid email address.';
  if (!states.includes(d.state)) errors.state = 'Choose a state.';
  if (!/^\d{5}(-\d{4})?$/.test(d.zip.trim()))
    errors.zip = 'Use a 5-digit ZIP or ZIP+4 (94105-1234).';
  return errors;
}
