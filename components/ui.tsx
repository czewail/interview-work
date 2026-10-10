'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X, Minus, Plus, ImageOff } from 'lucide-react';
import { money } from '@/lib/commerce';
import type { Totals } from '@/lib/types';
export function ProductImage({
  src,
  alt,
  priority = false,
  className = '',
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return broken ? (
    <div className={`image-fallback ${className}`} role="img" aria-label={alt}>
      <ImageOff size={30} />
      <span>Image unavailable</span>
    </div>
  ) : (
    <img
      className={className}
      src={src}
      width={600}
      height={600}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      onError={() => setBroken(true)}
    />
  );
}
export function Modal({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const active = document.activeElement as HTMLElement;
    ref.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
      active?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={className}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close dialog">
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Quantity({
  value,
  onChange,
  max,
  disabled = false,
  label = 'Quantity',
  commit = false,
  onInvalid,
}: {
  value: number | string;
  onChange: (v: string) => void;
  max: number;
  disabled?: boolean;
  label?: string;
  commit?: boolean;
  onInvalid?: (s: string) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  function save() {
    if (
      !/^\d+$/.test(text) ||
      !Number.isSafeInteger(Number(text)) ||
      Number(text) < 1 ||
      Number(text) > max
    ) {
      setText(String(value));
      onInvalid?.(`Enter a whole quantity from 1 to ${max}.`);
      return;
    }
    if (text !== String(value)) onChange(text);
  }
  return (
    <div className="quantity">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || Number(value) <= 1}
        onClick={() => onChange(String(Number(value) - 1))}
      >
        <Minus size={14} />
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        value={commit ? text : value}
        disabled={disabled}
        onChange={(e) => (commit ? setText(e.target.value) : onChange(e.target.value))}
        onBlur={() => commit && save()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (commit) save();
          }
        }}
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || Number(value) >= max}
        onClick={() => onChange(String(Number(value) + 1))}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
export function Summary({
  totals,
  children,
  estimate = false,
}: {
  totals: Totals;
  children?: ReactNode;
  estimate?: boolean;
}) {
  return (
    <aside className="summary">
      <h2>
        Order summary <span>USD</span>
      </h2>
      <dl>
        <div>
          <dt>Subtotal</dt>
          <dd>{money(totals.subtotalCents)}</dd>
        </div>
        <div>
          <dt>Demo shipping{estimate && <small>Standard estimate</small>}</dt>
          <dd>{totals.shippingCents ? money(totals.shippingCents) : 'Free'}</dd>
        </div>
        <div>
          <dt>Demo tax (8%)</dt>
          <dd>{money(totals.taxCents)}</dd>
        </div>
        <div className="total">
          <dt>Demo total</dt>
          <dd aria-live="polite">{money(totals.totalCents)}</dd>
        </div>
      </dl>
      {children}
      <p className="muted small">Demo estimates only. No real payments or shipments.</p>
    </aside>
  );
}
export function Loading({ label = 'Loading products' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      {label}
      <div className="skeleton-grid">
        {[1, 2, 3, 4].map((n) => (
          <div className="skeleton" key={n} />
        ))}
      </div>
    </div>
  );
}
