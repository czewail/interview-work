'use client';
import type { Product, SKU } from '@/lib/types';
export function Options({
  product,
  skus,
  value,
  onChange,
  disabled = false,
}: {
  product: Product;
  skus: SKU[];
  value: Record<string, string>;
  onChange: (next: Record<string, string>, cleared: boolean) => void;
  disabled?: boolean;
}) {
  function choose(name: string, v: string) {
    const next = { ...value, [name]: v };
    let cleared = false;
    for (const o of product.optionDefinitions) {
      if (o.name === name || !next[o.name]) continue;
      const compatible = skus.some((s) =>
        Object.entries(next).every(([k, x]) => !x || s.options[k] === x),
      );
      if (!compatible) {
        delete next[o.name];
        cleared = true;
      }
    }
    onChange(next, cleared);
  }
  return (
    <div className="options">
      {product.optionDefinitions.map((o, index) => (
        <fieldset key={o.name}>
          <legend>
            {o.name} <span>{value[o.name] || 'Select an option'}</span>
          </legend>
          <div className="option-buttons">
            {o.values.map((v) => {
              const exists = skus.some((s) => s.options[o.name] === v);
              const compatible = skus.some(
                (s) =>
                  s.options[o.name] === v &&
                  product.optionDefinitions
                    .slice(0, index)
                    .every((d) => !value[d.name] || s.options[d.name] === value[d.name]),
              );
              return (
                <button
                  type="button"
                  key={v}
                  id={`option-${o.name}-${v.replaceAll(' ', '-')}`}
                  aria-pressed={value[o.name] === v}
                  disabled={disabled || !exists || !compatible}
                  className={value[o.name] === v ? 'selected' : ''}
                  onClick={() => choose(o.name, v)}
                >
                  {o.name === 'Color' && <i className={`color-swatch color-${v.toLowerCase()}`} />}
                  <span>{v}</span>
                  {value[o.name] === v && <span aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
export function selectedSKU(skus: SKU[], options: Record<string, string>) {
  return skus.find(
    (s) =>
      Object.keys(s.options).length === Object.keys(options).length &&
      Object.entries(s.options).every(([k, v]) => options[k] === v),
  );
}
