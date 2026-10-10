'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FlaskConical, LockKeyhole } from 'lucide-react';
import { useStore } from './store';
import { Loading, ProductImage, Summary } from './ui';
import {
  begin,
  cancel,
  inspectLine,
  money,
  optionText,
  quote,
  states,
  validateDraft,
} from '@/lib/commerce';
import type { CheckoutDraft, Scenario } from '@/lib/types';
import { record } from '@/lib/events';
const failureMessages = {
  declined: 'Demo payment declined',
  failed: 'Something went wrong',
  timed_out: 'Demo payment timed out',
  cancelled: 'Simulation cancelled',
  needs_review: 'Items changed, review your order',
};
const fields = [
  ['email', 'Email', 'email', 'alex@example.com'],
  ['fullName', 'Full name', 'text', 'Alex Demo'],
  ['address1', 'Address line 1', 'text', '123 Demo Street'],
  ['address2', 'Address line 2 (optional)', 'text', 'Apartment, suite, etc.'],
  ['city', 'City', 'text', 'San Francisco'],
  ['zip', 'ZIP code', 'text', '94105'],
] as const;
export default function CheckoutPage() {
  const store = useStore(),
    router = useRouter(),
    [scenario, setScenario] = useState<Scenario>('success'),
    [errors, setErrors] = useState<Partial<Record<keyof CheckoutDraft, string>>>({}),
    [submitError, setSubmitError] = useState(''),
    [busy, setBusy] = useState(false),
    lock = useRef(false),
    reviewedPrices = useRef<string | null>(null);
  const a = store.state.activeAttempt,
    pending = a?.state === 'processing',
    invalid = store.state.cart.some((l) => !inspectLine(store.catalog, store.state, l).valid),
    total = quote(store.catalog, store.state, store.draft.shippingMethod),
    shown = pending ? a.quoteSnapshot : total;
  useEffect(() => {
    if (!store.ready) return;
    if (a?.state === 'succeeded' && a.orderId && !store.state.cart.length) {
      router.replace(`/order/?id=${a.orderId}`);
      return;
    }
    if (invalid && !pending) {
      store.notify('Items changed, review your order');
      const bad = store.state.cart.find((l) => !inspectLine(store.catalog, store.state, l).valid);
      router.replace(`/cart/#cart-${bad?.skuId}`);
    }
  }, [store.ready, a?.state, a?.orderId, invalid, pending]);
  const priceSignature = JSON.stringify(total.items.map((l) => [l.skuId, l.priceCents]));
  useEffect(() => {
    if (store.ready && reviewedPrices.current === null) reviewedPrices.current = priceSignature;
  }, [store.ready, priceSignature]);
  useEffect(() => {
    record('begin_checkout');
  }, []);
  function edit(key: keyof CheckoutDraft, value: string) {
    store.setDraft({ ...store.draft, [key]: value });
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  }
  function blur(key: keyof CheckoutDraft) {
    setErrors((prev) => ({ ...prev, [key]: validateDraft(store.draft)[key] }));
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current || pending) return;
    const validation = validateDraft(store.draft);
    const email = e.currentTarget.elements.namedItem('email') as HTMLInputElement;
    if (email.validity.typeMismatch) validation.email = 'Enter a valid email address.';
    setErrors(validation);
    if (Object.keys(validation).length) {
      setSubmitError('Please check the highlighted fields.');
      document.getElementById(Object.keys(validation)[0])?.focus();
      return;
    }
    if (store.catalogError) {
      setSubmitError('We couldn’t load products. Retry before placing your order.');
      return;
    }
    if (reviewedPrices.current !== priceSignature) {
      reviewedPrices.current = priceSignature;
      setSubmitError('Price updated. Review the new total, then place your demo order again.');
      return;
    }
    lock.current = true;
    setBusy(true);
    setSubmitError('');
    try {
      await store.mutate((s) =>
        begin(store.catalog, s, store.draft.shippingMethod, scenario, total),
      );
      record('demo_payment_start');
    } catch (err) {
      setSubmitError((err as Error).message);
      await store.refresh();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!store.ready) return <Loading label="Loading cart" />;
  if (!store.state.cart.length && !pending)
    return (
      <div className="empty-state">
        <h1>Your cart is empty</h1>
        <Link className="button primary" href="/">
          Continue shopping
        </Link>
      </div>
    );
  return (
    <>
      <Link className="back-link" href="/cart/">
        <ArrowLeft size={16} />
        Back to cart
      </Link>
      <div className="page-heading">
        <div>
          <h1>A few details, then it’s yours.</h1>
          <p>Guest checkout. A simulated order, from start to finish.</p>
        </div>
        <span className="checkout-secure">
          <LockKeyhole size={16} />
          Demo checkout
        </span>
      </div>
      {pending ? (
        <section className="processing" role="status">
          <span className="spinner" />
          <h2>Processing your demo order</h2>
          <p>No payment is being taken. This simulation can be resumed if you refresh.</p>
          <button
            className="button"
            onClick={() =>
              store.mutate((s) => cancel(s, a.id)).catch((e) => setSubmitError(e.message))
            }
          >
            Cancel simulation
          </button>
        </section>
      ) : (
        a &&
        a.state in failureMessages && (
          <div className="alert" role="alert">
            {failureMessages[a.state as keyof typeof failureMessages]}. Your cart is unchanged.
            Review your details and try again.
          </div>
        )
      )}
      <form noValidate onSubmit={submit} className="checkout-layout">
        <div className="checkout-form">
          <fieldset disabled={pending || busy}>
            <section className="checkout-section">
              <div className="section-title">
                <span>01</span>
                <h2>Contact & shipping</h2>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    store.setDraft({
                      email: 'alex@example.com',
                      fullName: 'Alex Demo',
                      address1: '123 Demo Street',
                      address2: '',
                      city: 'San Francisco',
                      state: 'CA',
                      zip: '94105',
                      shippingMethod: store.draft.shippingMethod,
                    });
                    setErrors({});
                    setSubmitError('');
                  }}
                >
                  Use demo details
                </button>
              </div>
              <p className="muted small">
                Use fictional details. Delivery details are not saved in this demo.
              </p>
              <div className="form-grid">
                {fields.map(([key, label, type, placeholder]) => (
                  <label
                    key={key}
                    className={['city', 'zip'].includes(key) ? '' : 'span-2'}
                    htmlFor={key}
                  >
                    {label}
                    <input
                      id={key}
                      name={key}
                      type={type}
                      placeholder={placeholder}
                      value={store.draft[key]}
                      onChange={(e) => edit(key, e.target.value)}
                      onBlur={() => blur(key)}
                      aria-required={key !== 'address2'}
                      aria-invalid={!!errors[key]}
                      aria-describedby={errors[key] ? `${key}-error` : undefined}
                      autoComplete="off"
                    />
                    {errors[key] && (
                      <span className="field-error" id={`${key}-error`}>
                        {errors[key]}
                      </span>
                    )}
                  </label>
                ))}
                <label htmlFor="state">
                  State
                  <select
                    id="state"
                    value={store.draft.state}
                    onChange={(e) => edit('state', e.target.value)}
                    onBlur={() => blur('state')}
                    aria-required="true"
                    aria-invalid={!!errors.state}
                    aria-describedby={errors.state ? 'state-error' : undefined}
                  >
                    <option value="">Choose state</option>
                    {states.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  {errors.state && (
                    <span className="field-error" id="state-error">
                      {errors.state}
                    </span>
                  )}
                </label>
                <label>
                  Country
                  <input value="United States" readOnly />
                </label>
              </div>
            </section>
            <section className="checkout-section">
              <div className="section-title">
                <span>02</span>
                <h2>Delivery method</h2>
              </div>
              <label
                className={`delivery-option ${store.draft.shippingMethod === 'standard' ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="shipping"
                  checked={store.draft.shippingMethod === 'standard'}
                  onChange={() => edit('shippingMethod', 'standard')}
                />
                <span>
                  <strong>Standard</strong>
                  <small>Demo · 3–5 business days</small>
                </span>
                <strong>{total.subtotalCents >= 10000 ? 'Free' : '$5.99'}</strong>
              </label>
              <label
                className={`delivery-option ${store.draft.shippingMethod === 'express' ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="shipping"
                  checked={store.draft.shippingMethod === 'express'}
                  onChange={() => edit('shippingMethod', 'express')}
                />
                <span>
                  <strong>Express</strong>
                  <small>Demo · 1–2 business days</small>
                </span>
                <strong>$14.99</strong>
              </label>
            </section>
            <section className="checkout-section">
              <div className="section-title">
                <span>03</span>
                <h2>Demo payment</h2>
              </div>
              <div className="demo-payment">
                <FlaskConical size={24} />
                <div>
                  <strong>Try the whole experience.</strong>
                  <p>No card details needed. No payment will be taken.</p>
                </div>
                <Check size={18} />
              </div>
              <details className="demo-controls">
                <summary>Demo controls</summary>
                <label>
                  Simulated result
                  <select
                    aria-label="Simulated payment result"
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value as Scenario)}
                  >
                    <option value="success">Success</option>
                    <option value="declined">Declined</option>
                    <option value="error">Technical error</option>
                    <option value="timeout">Timeout</option>
                  </select>
                </label>
                <p className="small muted">
                  Success, declined and error take 2 seconds. Timeout takes 8 seconds.
                </p>
              </details>
            </section>
          </fieldset>
        </div>
        <div className="checkout-review">
          <h2>Review your order</h2>
          <div className="review-items">
            {shown.items.map((l) => (
              <div className="review-item" key={l.skuId}>
                <ProductImage src={l.image} alt={l.name} />
                <div>
                  <strong>{l.name}</strong>
                  <small>{optionText(l.options)}</small>
                  <small>
                    Qty {l.quantity} × {money(l.priceCents)}
                  </small>
                </div>
                <strong>{money(l.quantity * l.priceCents)}</strong>
              </div>
            ))}
          </div>
          {store.draft.fullName && (
            <div className="address-review">
              <strong>Deliver to</strong>
              <p>
                {store.draft.fullName}
                <br />
                {store.draft.address1}
                {store.draft.address2 && <>, {store.draft.address2}</>}
                <br />
                {store.draft.city}, {store.draft.state} {store.draft.zip}
                <br />
                United States
              </p>
              <p>{store.draft.email}</p>
            </div>
          )}
          <Summary totals={shown}>
            {submitError && (
              <p className="error" role="alert">
                {submitError}
              </p>
            )}
            {Object.values(errors).filter(Boolean).length > 0 && (
              <p className="error" role="alert">
                Check your contact and shipping details before continuing.
              </p>
            )}
            {store.catalogError && (
              <button type="button" className="button" onClick={store.retryCatalog}>
                Retry products
              </button>
            )}
            <button
              className="button primary full place-order"
              type="submit"
              disabled={pending || busy || invalid || store.catalogError}
            >
              {pending
                ? 'Processing…'
                : busy
                  ? 'Validating…'
                  : `Place demo order — ${money(shown.totalCents)}`}
              <ArrowRight size={16} />
            </button>
            {a && a.state in failureMessages && (
              <p className="small">Try again by placing a new demo order.</p>
            )}
          </Summary>
        </div>
      </form>
    </>
  );
}
