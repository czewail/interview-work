import type { Catalog, DemoState } from './types';
import { CommerceError, newState } from './commerce';
const TTL = 30 * 24 * 60 * 60 * 1000;
const num = (x: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): x is number =>
  typeof x === 'number' && Number.isSafeInteger(x) && x >= min && x <= max;
const obj = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);
const text = (x: unknown): x is string => typeof x === 'string';
function validSnapshot(x: unknown) {
  return (
    obj(x) &&
    text(x.name) &&
    text(x.slug) &&
    /^[a-z0-9-]+$/.test(x.slug) &&
    text(x.image) &&
    x.image.startsWith('/products/') &&
    !x.image.includes('..') &&
    obj(x.options) &&
    Object.values(x.options).every(text) &&
    num(x.priceCents, 1, 999999)
  );
}
function validQuote(x: unknown) {
  return (
    obj(x) &&
    Array.isArray(x.items) &&
    x.items.length <= 20 &&
    x.items.every((l) => validSnapshot(l) && text(l.skuId) && num(l.quantity, 1, 99)) &&
    ['standard', 'express'].includes(String(x.shippingMethod)) &&
    ['subtotalCents', 'shippingCents', 'taxCents', 'totalCents'].every((k) => num(x[k]))
  );
}
export function validState(x: unknown): x is DemoState {
  if (
    !obj(x) ||
    x.schemaVersion !== 1 ||
    !text(x.catalogVersion) ||
    !num(x.revision) ||
    !num(x.cartRevision) ||
    !num(x.lastMutatedAt) ||
    !Array.isArray(x.cart) ||
    x.cart.length > 20 ||
    !obj(x.inventoryDeductions) ||
    !Object.values(x.inventoryDeductions).every((v) => num(v)) ||
    !Array.isArray(x.orders) ||
    x.orders.length > 20
  )
    return false;
  if (
    !x.cart.every(
      (l) =>
        obj(l) &&
        text(l.skuId) &&
        num(l.quantity, 1, 99) &&
        num(l.addedAt) &&
        validSnapshot(l.displaySnapshot),
    ) ||
    new Set(x.cart.map((l) => l.skuId)).size !== x.cart.length
  )
    return false;
  if (
    !x.orders.every(
      (o) =>
        validQuote(o) &&
        text(o.id) &&
        o.id.startsWith('demo-') &&
        text(o.attemptId) &&
        num(o.createdAt) &&
        o.status === 'demo_placed' &&
        o.currency === 'USD',
    )
  )
    return false;
  const a = x.activeAttempt;
  if (
    a !== null &&
    (!obj(a) ||
      !text(a.id) ||
      ![
        'processing',
        'succeeded',
        'declined',
        'failed',
        'timed_out',
        'cancelled',
        'needs_review',
      ].includes(String(a.state)) ||
      !num(a.cartRevision) ||
      !text(a.catalogVersion) ||
      !validQuote(a.quoteSnapshot) ||
      !obj(a.inventorySnapshot) ||
      !Object.values(a.inventorySnapshot).every((v) => num(v)) ||
      !['success', 'declined', 'error', 'timeout'].includes(String(a.scenario)) ||
      !num(a.startedAt) ||
      !num(a.resolveAt) ||
      a.resolveAt < a.startedAt)
  )
    return false;
  return true;
}
export function recover(raw: unknown, c: Catalog, now: number) {
  let notice = '';
  let state: DemoState;
  if (raw === undefined) state = newState(c, now);
  else if (!validState(raw) || raw.lastMutatedAt > now + 300000) {
    state = newState(c, now);
    notice = 'Demo data was reset';
  } else if (now - raw.lastMutatedAt >= TTL) {
    state = newState(c, now);
    notice = 'Your demo session expired';
  } else state = structuredClone(raw);
  if (state.catalogVersion !== c.catalogVersion) {
    state.catalogVersion = c.catalogVersion;
    if (state.activeAttempt?.state === 'processing') state.activeAttempt.state = 'needs_review';
  }
  return { state, notice };
}
export class DemoRepository {
  private db: IDBDatabase | null = null;
  private memory: DemoState;
  private queue: Promise<unknown> = Promise.resolve();
  temporary = false;
  failNextWrite = false;
  constructor(
    private getCatalog: () => Catalog,
    private onMode: () => void,
    private now: () => number = Date.now,
  ) {
    this.memory = newState(getCatalog(), now());
  }
  async open(forceMemory = false) {
    if (forceMemory) {
      this.temporary = true;
      this.onMode();
      return;
    }
    try {
      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        let finished = false;
        const timer = setTimeout(() => {
          finished = true;
          reject(new Error('Storage timeout'));
        }, 3000);
        const request = indexedDB.open('form-demo-store', 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore('state');
        };
        request.onsuccess = () => {
          clearTimeout(timer);
          if (finished) {
            request.result.close();
            return;
          }
          resolve(request.result);
        };
        request.onerror = () => {
          clearTimeout(timer);
          reject(request.error);
        };
        request.onblocked = () => {
          /* bounded by timer */
        };
      });
    } catch {
      this.temporary = true;
      this.onMode();
    }
  }
  async run(mutator?: (s: DemoState) => void) {
    const task = () => this.transact(mutator);
    const result = this.queue.then(task, task);
    this.queue = result.catch(() => {});
    return result;
  }
  private async transact(
    mutator?: (s: DemoState) => void,
  ): Promise<{ state: DemoState; notice: string; changed: boolean }> {
    const apply = (raw: unknown) => {
      const recovered = recover(raw, this.getCatalog(), this.now()),
        before = JSON.stringify(recovered.state),
        previousRevision = recovered.state.revision;
      mutator?.(recovered.state);
      const changed = before !== JSON.stringify(recovered.state);
      if (changed) {
        recovered.state.revision = previousRevision + 1;
        recovered.state.lastMutatedAt = this.now();
      }
      return {
        ...recovered,
        changed: changed || JSON.stringify(raw) !== JSON.stringify(recovered.state),
      };
    };
    if (this.temporary || !this.db) {
      const result = apply(this.memory);
      this.memory = structuredClone(result.state);
      return result;
    }
    try {
      return await new Promise((resolve, reject) => {
        let domainError: unknown;
        const tx = this.db!.transaction('state', 'readwrite'),
          store = tx.objectStore('state');
        let result: ReturnType<typeof apply>;
        const request = store.get('current');
        request.onsuccess = () => {
          try {
            result = apply(request.result);
            if (result.changed) {
              if (this.failNextWrite) {
                this.failNextWrite = false;
                tx.abort();
                return;
              }
              store.put(result.state, 'current');
            }
          } catch (e) {
            domainError = e;
            tx.abort();
          }
        };
        tx.oncomplete = () => {
          this.memory = structuredClone(result.state);
          resolve(result);
        };
        tx.onerror = () => {};
        tx.onabort = () => reject(domainError || tx.error || new Error('Storage write failed'));
      });
    } catch (e) {
      if (e instanceof CommerceError) throw e;
      this.temporary = true;
      this.db.close();
      this.db = null;
      this.onMode();
      throw new CommerceError(
        "Changes can't be saved on this browser. Nothing was changed. Try again in temporary mode.",
        'STORAGE',
      );
    }
  }
  close() {
    this.db?.close();
  }
}
