export type Category = 'Phones' | 'Computers' | 'Audio' | 'Accessories';
export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  model: string;
  categoryId: Category;
  description: string;
  keywords: string[];
  images: string[];
  specifications: { label: string; value: string }[];
  optionDefinitions: { name: string; values: string[] }[];
  status: 'active' | 'archived';
  featuredRank: number;
  publishedAt: string;
  highlights: string[];
  packageContents: string;
};
export type SKU = {
  id: string;
  productId: string;
  options: Record<string, string>;
  priceCents: number;
  currency: 'USD';
  initialStock: number;
  maxPerOrder: number;
  status: 'active' | 'archived';
  imageId?: string;
};
export type Catalog = {
  schemaVersion: number;
  catalogVersion: string;
  products: Product[];
  skus: SKU[];
};
export type Snapshot = {
  name: string;
  image: string;
  slug: string;
  options: Record<string, string>;
  priceCents: number;
};
export type CartLine = {
  skuId: string;
  quantity: number;
  addedAt: number;
  displaySnapshot: Snapshot;
};
export type Shipping = 'standard' | 'express';
export type Totals = {
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
};
export type OrderItem = Snapshot & { skuId: string; quantity: number };
export type Quote = Totals & { items: OrderItem[]; shippingMethod: Shipping };
export type Scenario = 'success' | 'declined' | 'error' | 'timeout';
export type AttemptStatus =
  'processing' | 'succeeded' | 'declined' | 'failed' | 'timed_out' | 'cancelled' | 'needs_review';
export type Attempt = {
  id: string;
  state: AttemptStatus;
  cartRevision: number;
  catalogVersion: string;
  quoteSnapshot: Quote;
  inventorySnapshot: Record<string, number>;
  scenario: Scenario;
  startedAt: number;
  resolveAt: number;
  orderId?: string;
};
export type DemoOrder = Quote & {
  id: string;
  attemptId: string;
  createdAt: number;
  status: 'demo_placed';
  currency: 'USD';
};
export type DemoState = {
  schemaVersion: number;
  catalogVersion: string;
  revision: number;
  cartRevision: number;
  lastMutatedAt: number;
  cart: CartLine[];
  inventoryDeductions: Record<string, number>;
  activeAttempt: Attempt | null;
  orders: DemoOrder[];
};
export type CheckoutDraft = {
  email: string;
  fullName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  shippingMethod: Shipping;
};
