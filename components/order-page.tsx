'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, ArrowRight } from 'lucide-react';
import { useStore } from './store';
import { Loading, ProductImage, Summary } from './ui';
import { money, optionText } from '@/lib/commerce';
export default function OrderPage() {
  const store = useStore(),
    params = useSearchParams(),
    id = params.get('id'),
    order = store.state.orders.find((o) => o.id === id);
  if (!store.ready) return <Loading label="Loading order" />;
  if (!order)
    return (
      <div className="empty-state">
        <h1>Demo order not found on this browser</h1>
        <p>It may have expired, been cleared, or been placed in another browser.</p>
        <Link href="/" className="button primary">
          Continue shopping
        </Link>
      </div>
    );
  return (
    <div className="order-page">
      <div className="order-success-icon">
        <Check size={32} />
      </div>
      <h1>Demo order placed.</h1>
      <p className="order-subtitle">A good choice. And a complete test drive.</p>
      <div className="success order-disclaimer">
        No payment was taken. No items will be shipped.
      </div>
      <div className="order-meta">
        <div>
          <span>Demo order</span>
          <strong>{order.id}</strong>
        </div>
        <div>
          <span>Placed</span>
          <strong>{new Date(order.createdAt).toLocaleString('en-US')}</strong>
        </div>
      </div>
      <div className="cart-layout">
        <section>
          <h2>Your items</h2>
          {order.items.map((l) => (
            <article className="order-item" key={l.skuId}>
              <ProductImage src={l.image} alt={l.name} />
              <div>
                <h3>{l.name}</h3>
                <p className="muted">{optionText(l.options)}</p>
                <p>
                  Qty {l.quantity} × {money(l.priceCents)}
                </p>
              </div>
              <strong>{money(l.priceCents * l.quantity)}</strong>
            </article>
          ))}
          <p className="muted">Delivery details are not saved in this demo.</p>
        </section>
        <Summary totals={order}>
          <p>{order.shippingMethod === 'express' ? 'Express' : 'Standard'} demo delivery</p>
          <Link className="button primary full" href="/">
            Continue shopping <ArrowRight size={16} />
          </Link>
        </Summary>
      </div>
    </div>
  );
}
