'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useStore } from '@/components/store';
import { Modal } from '@/components/ui';
import { emptyDraft, newState } from '@/lib/commerce';
export default function Page() {
  const store = useStore(),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState('');
  return (
    <div className="info-page">
      <Link className="back-link" href="/">
        <ArrowLeft size={16} />
        Continue shopping
      </Link>
      <h1>A store made for exploring.</h1>
      <p className="lead">The whole shopping experience. Without the real-world transaction.</p>
      <section>
        <h2>Everything here is a demo</h2>
        <p>
          Form is a fictional electronics shop. All products, brands, images, specifications, prices
          and inventory are illustrative. Orders do not charge you, send emails or ship products.
        </p>
      </section>
      <section>
        <h2>Your browser is your shopping space</h2>
        <p>
          Your cart, the latest 20 successful demo orders and stock changes are saved in this
          browser for 30 days after your last successful shopping action. Browsing does not extend
          that time. Clearing site data removes them. They do not sync to other devices.
        </p>
        <p>
          Delivery details stay in this tab’s memory and clear when you refresh or complete an
          order. Please use the provided demo details, not personal information.
        </p>
      </section>
      <section>
        <h2>Demo delivery & tax</h2>
        <p>
          Standard delivery is $5.99, or free for subtotals of $100 or more. The fictional estimate
          is 3–5 business days. Express is always $14.99, with an estimate of 1–2 business days.
        </p>
        <p>
          Demo tax is a fixed 8% of the item subtotal, rounded once to the nearest cent. Shipping is
          not taxed. These rules demonstrate the checkout and do not represent real tax or shipping
          services.
        </p>
      </section>
      <section>
        <h2>Warranty & returns</h2>
        <p>
          No real goods are sold, so no warranty, returns or refunds apply. Product specifications
          do not represent real certifications. Reset the demo to restore initial inventory and
          start again.
        </p>
      </section>
      <section>
        <h2>A fresh start</h2>
        <p>
          Resetting clears your cart, saved orders, any simulation in progress and all local stock
          changes across this browser’s connected tabs.
        </p>
        <button className="button danger" disabled={!store.ready} onClick={() => setConfirm(true)}>
          Reset demo data
        </button>
        {error && <p className="error">{error}</p>}
      </section>
      <Link href="/" className="button primary">
        Explore the collection <ArrowRight size={16} />
      </Link>
      {confirm && (
        <Modal title="Reset demo data?" onClose={() => setConfirm(false)}>
          <p>
            This will clear your cart, orders, pending payment and stock changes. Your initial demo
            inventory will be restored. This cannot be undone.
          </p>
          <div className="modal-actions">
            <button className="button" onClick={() => setConfirm(false)}>
              Cancel
            </button>
            <button
              className="button danger"
              onClick={async () => {
                try {
                  await store.mutate((s) => Object.assign(s, newState(store.catalog)));
                  store.setDraft({ ...emptyDraft });
                  store.notify('Demo data was reset');
                  setConfirm(false);
                } catch (e) {
                  setError((e as Error).message);
                  setConfirm(false);
                }
              }}
            >
              Reset demo data
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
