'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  ShoppingBag,
  Truck,
  ShieldCheck,
  Maximize2,
} from 'lucide-react';
import { useStore } from './store';
import { Modal, ProductImage, Quantity, Loading } from './ui';
import { Options, selectedSKU } from './options';
import { add, money } from '@/lib/commerce';
import { stock } from '@/lib/query';
import { record } from '@/lib/events';
export default function DetailPage({ slug }: { slug: string }) {
  const store = useStore(),
    p = store.catalog.products.find((p) => p.slug === slug),
    skus = store.catalog.skus.filter((s) => s.productId === p?.id && s.status === 'active');
  const [options, setOptions] = useState<Record<string, string>>(() =>
      skus.length === 1 ? skus[0].options : {},
    ),
    [quantity, setQuantity] = useState('1'),
    [image, setImage] = useState(0),
    [zoom, setZoom] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [added, setAdded] = useState(false),
    lock = useRef(false);
  const sku = selectedSKU(skus, options),
    pending = store.state.activeAttempt?.state === 'processing',
    remaining = sku ? stock(sku, store.state) : 0,
    inCart = store.state.cart.find((l) => l.skuId === sku?.id)?.quantity || 0,
    max = sku ? Math.max(0, Math.min(remaining, sku.maxPerOrder) - inCart) : 99;
  useEffect(() => {
    if (p) record('view_item', { productId: p.id });
  }, [p?.id]);
  if (!p)
    return (
      <div className="empty-state">
        <h1>Page not found</h1>
        <Link className="button primary" href="/">
          Continue shopping
        </Link>
      </div>
    );
  const unavailable = p.status === 'archived' || !skus.length,
    price = sku?.priceCents ?? Math.min(...skus.map((s) => s.priceCents));
  async function addItem() {
    if (lock.current) return;
    setError('');
    setAdded(false);
    if (!sku) {
      setError('Choose your options before adding to cart.');
      const missing = p!.optionDefinitions.find((o) => !options[o.name]);
      if (missing)
        document.querySelector<HTMLButtonElement>(`[id^="option-${missing.name}-"]`)?.focus();
      return;
    }
    if (
      !/^\d+$/.test(quantity) ||
      Number(quantity) < 1 ||
      !Number.isSafeInteger(Number(quantity)) ||
      Number(quantity) > max
    ) {
      setError(`Enter a whole quantity from 1 to ${max}.`);
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      await store.mutate((s) => add(store.catalog, s, sku.id, Number(quantity)));
      record('add_to_cart', { skuId: sku.id, quantity: Number(quantity), result: 'success' });
      setAdded(true);
      store.notify(`${p!.name} added to cart`);
    } catch (e) {
      setError((e as Error).message);
      record('add_to_cart_error', { skuId: sku.id, code: 'VALIDATION' });
    } finally {
      setTimeout(() => {
        lock.current = false;
        setBusy(false);
      }, 300);
    }
  }
  return (
    <div className="product-page">
      <Link className="back-link" href={store.listUrl}>
        <ArrowLeft size={16} />
        Continue shopping
      </Link>
      <div className="detail-layout">
        <div className="gallery">
          <button
            className="main-image"
            onClick={() => setZoom(true)}
            aria-label={`Enlarge ${p.name} image`}
          >
            <ProductImage
              src={image === 0 ? sku?.imageId || p.images[0] : p.images[image]}
              alt={p.name}
              priority
            />
            <span className="zoom-icon">
              <Maximize2 size={20} />
            </span>
          </button>
          <div className="thumbnails">
            {p.images.map((src, i) => (
              <button
                key={src}
                aria-label={`View image ${i + 1}`}
                aria-pressed={image === i}
                onClick={() => setImage(i)}
              >
                <ProductImage src={src} alt={`${p.name}, view ${i + 1}`} />
              </button>
            ))}
          </div>
          <p className="small muted">
            Illustrative demo product. Colors and specifications are fictional.
          </p>
        </div>
        <section className="buy-panel">
          <div className="product-kicker">
            {p.brand} <span>/</span> {p.categoryId} <span>/</span> {p.model}
          </div>
          <h1>{p.name}</h1>
          <p className="detail-price">
            {!sku && skus.length > 1 ? 'From ' : ''}
            {Number.isFinite(price) ? money(price) : 'Unavailable'}
            <small>USD</small>
          </p>
          <p className="detail-description">{p.description}</p>
          <ul className="highlights">
            {p.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          {!store.ready ? (
            <Loading label="Loading stock" />
          ) : unavailable ? (
            <div className="alert">
              Item no longer available. You can still browse the specifications below.
            </div>
          ) : (
            <>
              <Options
                product={p}
                skus={skus}
                value={options}
                disabled={pending || busy}
                onChange={(next, cleared) => {
                  setOptions(next);
                  setImage(0);
                  setAdded(false);
                  setError(cleared ? 'Options changed. Choose the remaining options.' : '');
                }}
              />
              {sku && (
                <p className={`inventory ${!remaining ? 'unavailable' : ''}`}>
                  <span className="stock-dot" />
                  {remaining === 0
                    ? 'Out of stock'
                    : remaining <= 5
                      ? `Only ${remaining} left`
                      : 'In stock'}
                  <small>Demo stock · {remaining} available</small>
                </p>
              )}
              <div className="purchase-actions">
                <div>
                  <span className="field-label">Quantity</span>
                  <Quantity
                    value={quantity}
                    onChange={setQuantity}
                    max={max}
                    disabled={pending || busy || (!!sku && !max)}
                  />
                </div>
                <button
                  className="button primary add-button"
                  disabled={busy || pending || store.catalogError || (!!sku && max === 0)}
                  onClick={addItem}
                >
                  <ShoppingBag size={18} />
                  {busy ? 'Adding…' : sku && max === 0 ? 'Unavailable' : 'Add to cart'}
                  <Plus size={18} />
                </button>
                {error && (
                  <p className="mobile-purchase-error error" role="alert">
                    {error}
                  </p>
                )}
              </div>
              {sku && max === 0 && remaining > 0 && (
                <p className="error">Your cart already contains the maximum allowed quantity.</p>
              )}
              {pending && (
                <p className="alert">
                  Checkout in progress. <Link href="/checkout/">Resume checkout</Link>
                </p>
              )}
              {store.catalogError && (
                <p className="alert">
                  We couldn’t load products. <button onClick={store.retryCatalog}>Retry</button>
                </p>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              {added && (
                <div className="success" role="status">
                  Added to your cart.
                  <Link href="/cart/">
                    View cart <ArrowRight size={16} />
                  </Link>
                </div>
              )}
            </>
          )}
          <div className="detail-promises">
            <div>
              <Truck size={19} />
              <span>
                Demo Standard shipping<small>$5.99 · Free on orders $100+</small>
              </span>
            </div>
            <div>
              <ShieldCheck size={19} />
              <span>
                Made for exploring<small>No real payments. No shipments.</small>
              </span>
            </div>
          </div>
        </section>
      </div>
      <div className="details-bottom">
        <section>
          <h2>The details</h2>
          <dl className="spec-table">
            {p.specifications.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>
                  {s.label === 'Storage' && sku?.options.Storage
                    ? sku.options.Storage
                    : s.label === 'RAM' && sku?.options.RAM
                      ? sku.options.RAM
                      : s.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h2>In the box</h2>
          <p>{p.packageContents}</p>
          <h2>Before you choose</h2>
          <p>
            Specifications are demo data, not real certifications. Check the selected options for
            variable details.
          </p>
          <Link className="underlined" href="/demo-info/">
            Demo shipping, warranty & returns <ArrowUpRightIcon />
          </Link>
        </section>
      </div>
      {zoom && (
        <Modal title={p.name} className="image-modal" onClose={() => setZoom(false)}>
          <ProductImage
            src={image === 0 ? sku?.imageId || p.images[0] : p.images[image]}
            alt={p.name}
            priority
          />
          <div className="image-controls">
            <button className="button" disabled={image === 0} onClick={() => setImage(image - 1)}>
              Previous
            </button>
            <span>
              {image + 1} / {p.images.length}
            </span>
            <button
              className="button"
              disabled={image === p.images.length - 1}
              onClick={() => setImage(image + 1)}
            >
              Next
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={15} />;
}
