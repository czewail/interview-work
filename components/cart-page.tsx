'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ShoppingBag, LockKeyhole } from 'lucide-react';
import { useStore } from './store';
import { Modal, ProductImage, Quantity, Summary, Loading } from './ui';
import { Options, selectedSKU } from './options';
import {
  add,
  cancel,
  changeOptions,
  inspectLine,
  money,
  optionText,
  quote,
  remove,
  setQuantity,
} from '@/lib/commerce';
import type { CartLine } from '@/lib/types';
import { record } from '@/lib/events';
export default function CartPage() {
  const store = useStore(),
    [error, setError] = useState(''),
    [undo, setUndo] = useState<{ line: CartLine; expires: number } | null>(null),
    [editing, setEditing] = useState<CartLine | null>(null),
    [options, setOptions] = useState<Record<string, string>>({}),
    [editError, setEditError] = useState(''),
    [saving, setSaving] = useState(false);
  const pending = store.state.activeAttempt?.state === 'processing',
    invalid =
      store.catalogError ||
      store.state.cart.some((l) => !inspectLine(store.catalog, store.state, l).valid),
    total = quote(store.catalog, store.state, 'standard');
  useEffect(() => {
    record('view_cart');
    void store.refresh();
  }, []);
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), Math.max(0, undo.expires - Date.now()));
    return () => clearTimeout(timer);
  }, [undo]);
  useEffect(() => {
    if (pending) setUndo(null);
  }, [pending]);
  async function action(fn: Parameters<typeof store.mutate>[0]) {
    try {
      await store.mutate(fn);
      setError('');
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  const editSku = store.catalog.skus.find((s) => s.id === editing?.skuId),
    editProduct = store.catalog.products.find((p) => p.id === editSku?.productId),
    editSkus = store.catalog.skus.filter(
      (s) => s.productId === editProduct?.id && s.status === 'active',
    );
  if (!store.ready) return <Loading label="Loading cart" />;
  return (
    <>
      <Link className="back-link" href={store.listUrl}>
        <ArrowLeft size={16} />
        Continue shopping
      </Link>
      <div className="page-heading">
        <div>
          <h1>
            Your cart
            <span className="heading-count">
              {store.state.cart.reduce((n, l) => n + l.quantity, 0)}
            </span>
          </h1>
          <p>A few good things, chosen by you.</p>
        </div>
        <span className="muted small">USD · Demo stock</span>
      </div>
      {pending && (
        <div className="alert">
          <LockKeyhole size={18} />
          Checkout in progress. Your cart is locked.<Link href="/checkout/">Resume checkout</Link>
          <button
            className="text-button"
            onClick={() => action((s) => cancel(s, store.state.activeAttempt?.id))}
          >
            Cancel simulation
          </button>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {undo && (
        <div className="undo-bar" role="status">
          <span>{undo.line.displaySnapshot.name} removed.</span>
          <button
            onClick={async () => {
              if (Date.now() > undo.expires) {
                setUndo(null);
                return;
              }
              if (await action((s) => add(store.catalog, s, undo.line.skuId, undo.line.quantity)))
                setUndo(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
      {!store.state.cart.length ? (
        <div className="empty-state">
          <ShoppingBag size={42} strokeWidth={1} />
          <h2>Your cart is empty</h2>
          <p>Find something that fits your everyday.</p>
          <Link className="button primary" href="/">
            Continue shopping <ArrowRight size={16} />
          </Link>
          {store.state.orders[0] && (
            <Link className="underlined" href={`/order/?id=${store.state.orders[0].id}`}>
              View latest demo order
            </Link>
          )}
        </div>
      ) : (
        <div className="cart-layout">
          <section className="cart-items" aria-label="Cart items">
            {store.state.cart.map((line) => {
              const x = inspectLine(store.catalog, store.state, line);
              return (
                <article
                  className={`cart-item ${!x.valid ? 'invalid-item' : ''}`}
                  key={line.skuId}
                  id={`cart-${line.skuId}`}
                  tabIndex={-1}
                >
                  <Link className="cart-image" href={`/products/${x.info.slug}/`}>
                    <ProductImage src={x.info.image} alt={x.info.name} />
                  </Link>
                  <div className="cart-item-info">
                    <span className="product-kicker">{x.product?.brand || 'Demo product'}</span>
                    <Link className="cart-item-name" href={`/products/${x.info.slug}/`}>
                      {x.info.name}
                    </Link>
                    <p className="muted small">
                      {optionText(x.info.options) || 'One standard option'}
                    </p>
                    <strong>{money(x.info.priceCents)}</strong>
                    {x.priceChanged && (
                      <p className="price-updated">
                        Price updated: {money(line.displaySnapshot.priceCents)} →{' '}
                        {money(x.info.priceCents)}
                      </p>
                    )}
                    {(!x.valid || store.catalogError) && (
                      <p className="error">
                        {store.catalogError ? 'Waiting to verify product information' : x.error}
                      </p>
                    )}
                    <div className="cart-item-links">
                      <button
                        className="text-button"
                        disabled={pending || !x.product}
                        onClick={() => {
                          setEditing(line);
                          setOptions(x.info.options);
                          setEditError('');
                        }}
                      >
                        Change options
                      </button>
                      <button
                        className="text-button"
                        disabled={pending}
                        onClick={async () => {
                          if (await action((s) => remove(s, line.skuId))) {
                            setUndo({ line, expires: Date.now() + 5000 });
                            store.notify('Item removed from cart');
                            record('remove_from_cart', { skuId: line.skuId });
                          }
                        }}
                      >
                        Remove
                      </button>
                      {!x.valid && x.available > 0 && (
                        <button
                          className="text-button"
                          disabled={pending}
                          onClick={() =>
                            action((s) => setQuantity(store.catalog, s, line.skuId, x.available))
                          }
                        >
                          Update to {x.available}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="cart-item-quantity">
                    <Quantity
                      value={line.quantity}
                      commit
                      max={x.available}
                      disabled={pending || !x.valid || store.catalogError}
                      onInvalid={setError}
                      onChange={async (v) => {
                        if (
                          await action((s) => setQuantity(store.catalog, s, line.skuId, Number(v)))
                        )
                          record('update_cart_item', { skuId: line.skuId, quantity: Number(v) });
                      }}
                    />
                    <strong>
                      {x.valid && !store.catalogError
                        ? money(x.info.priceCents * line.quantity)
                        : 'Not included'}
                    </strong>
                  </div>
                </article>
              );
            })}
            <p className="muted small">Adding to your cart does not reserve demo stock.</p>
          </section>
          <Summary
            totals={
              store.catalogError
                ? { subtotalCents: 0, shippingCents: 0, taxCents: 0, totalCents: 0 }
                : total
            }
            estimate
          >
            {invalid && (
              <p className="error">
                Estimates include valid items only. Resolve unavailable items before checkout.
              </p>
            )}
            {store.catalogError && (
              <button className="button" onClick={store.retryCatalog}>
                Retry
              </button>
            )}
            {invalid || pending ? (
              <button className="button primary full" disabled>
                Checkout <ArrowRight size={17} />
              </button>
            ) : (
              <Link href="/checkout/" className="button primary full" onClick={() => setUndo(null)}>
                Checkout <ArrowRight size={17} />
              </Link>
            )}
            <p className="summary-hint">
              <LockKeyhole size={14} />
              Guest checkout · Demo payment
            </p>
          </Summary>
        </div>
      )}
      {store.state.cart.length > 0 && (
        <div className="mobile-cart-bar">
          <div>
            <small>Demo total · USD</small>
            <strong>{money(total.totalCents)}</strong>
          </div>
          {invalid || pending ? (
            <button className="button primary" disabled>
              Checkout
            </button>
          ) : (
            <Link href="/checkout/" className="button primary" onClick={() => setUndo(null)}>
              Checkout <ArrowRight size={16} />
            </Link>
          )}
        </div>
      )}
      {editing && editProduct && (
        <Modal title="Change options" onClose={() => setEditing(null)}>
          <h3>{editProduct.name}</h3>
          <Options
            product={editProduct}
            skus={editSkus}
            value={options}
            onChange={(v, cleared) => {
              setOptions(v);
              setEditError(cleared ? 'Choose the remaining options.' : '');
            }}
          />
          {selectedSKU(editSkus, options) && (
            <p>
              {money(selectedSKU(editSkus, options)!.priceCents)} each · Quantity {editing.quantity}
            </p>
          )}
          {editError && (
            <p className="error" role="alert">
              {editError}
            </p>
          )}
          <div className="modal-actions">
            <button className="button" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button
              className="button primary"
              disabled={saving}
              onClick={async () => {
                const sku = selectedSKU(editSkus, options);
                if (!sku) {
                  setEditError('Choose your options.');
                  return;
                }
                setSaving(true);
                try {
                  await store.mutate((s) => changeOptions(store.catalog, s, editing.skuId, sku.id));
                  setEditing(null);
                  record('update_cart_item', { skuId: sku.id });
                } catch (e) {
                  setEditError((e as Error).message);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? 'Saving…' : 'Save options'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
