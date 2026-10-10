type EventData = {
  skuId?: string;
  productId?: string;
  quantity?: number;
  attemptId?: string;
  result?: string;
  code?: string;
};
const events: { name: string; at: number; data: EventData }[] = [];
const seen = new Set<string>();
export function record(name: string, data: EventData = {}) {
  if (process.env.NODE_ENV !== 'development' && process.env.NEXT_PUBLIC_DEMO_TESTING !== '1')
    return;
  const key = data.attemptId ? name + data.attemptId : null;
  if (key && seen.has(key)) return;
  if (key) seen.add(key);
  events.push({ name, at: Date.now(), data });
  if (events.length > 500) events.shift();
}
export function readEvents() {
  return structuredClone(events);
}
