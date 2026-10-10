'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { catalog as seed } from '@/lib/catalog';
import { emptyDraft, newState, resolveAttempt } from '@/lib/commerce';
import { DemoRepository } from '@/lib/persistence';
import type { Catalog, CheckoutDraft, DemoState } from '@/lib/types';
import { record, readEvents } from '@/lib/events';
import { fixture } from '@/lib/fixtures';
type Store = {
  state: DemoState;
  catalog: Catalog;
  ready: boolean;
  temporary: boolean;
  notice: string;
  catalogError: boolean;
  offline: boolean;
  draft: CheckoutDraft;
  setDraft: (d: CheckoutDraft) => void;
  mutate: (fn: (s: DemoState) => void) => Promise<DemoState>;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
  retryCatalog: () => void;
  listUrl: string;
  setListUrl: (s: string) => void;
  listScroll: number;
  setListScroll: (n: number) => void;
};
const Context = createContext<Store | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => newState(seed, 0)),
    [catalog, setCatalog] = useState(seed),
    [ready, setReady] = useState(false),
    [temporary, setTemporary] = useState(false),
    [notice, notify] = useState(''),
    [catalogError, setCatalogError] = useState(false),
    [offline, setOffline] = useState(false),
    [draft, setDraft] = useState<CheckoutDraft>({ ...emptyDraft }),
    [listUrl, setListUrl] = useState('/'),
    [listScroll, setListScroll] = useState(0);
  const repository = useRef<DemoRepository | null>(null),
    channel = useRef<BroadcastChannel | null>(null),
    catalogRef = useRef(catalog),
    offset = useRef(0),
    stateRef = useRef(state);
  catalogRef.current = catalog;
  stateRef.current = state;
  async function mutate(fn: (s: DemoState) => void) {
    if (!repository.current) throw new Error('Loading cart');
    const previousAttempt = stateRef.current.activeAttempt;
    const result = await repository.current.run(fn);
    setState(result.state);
    stateRef.current = result.state;
    if (result.notice) notify(result.notice);
    const attempt = result.state.activeAttempt;
    if (
      result.changed &&
      attempt &&
      attempt.state !== 'processing' &&
      (attempt.id !== previousAttempt?.id || previousAttempt.state === 'processing')
    ) {
      record('demo_payment_result', { attemptId: attempt.id, result: attempt.state });
      if (attempt.state === 'succeeded') {
        setDraft({ ...emptyDraft });
        record('demo_order_placed', { attemptId: attempt.id, result: 'succeeded' });
      }
    }
    if (result.changed && !repository.current.temporary)
      channel.current?.postMessage(result.state.revision);
    return result.state;
  }
  async function refresh() {
    try {
      await mutate((s) => {
        resolveAttempt(catalogRef.current, s, Date.now() + offset.current);
      });
    } catch (e) {
      // A failed final write must not silently succeed on the next timer tick in memory mode.
      if (repository.current?.temporary && stateRef.current.activeAttempt?.state === 'processing') {
        await mutate((s) => {
          if (s.activeAttempt?.state === 'processing') s.activeAttempt.state = 'failed';
        });
      }
      notify((e as Error).message);
    }
  }
  useEffect(() => {
    let alive = true;
    const repo = new DemoRepository(
      () => catalogRef.current,
      () => {
        if (alive) setTemporary(true);
      },
      () => Date.now() + offset.current,
    );
    repository.current = repo;
    const bc =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('form-demo-store') : null;
    channel.current = bc;
    bc?.addEventListener('message', async () => {
      if (repo.temporary) return;
      await refresh();
      if (alive) notify('Cart updated in another tab');
    });
    const updateNetwork = () => setOffline(!navigator.onLine);
    updateNetwork();
    repo.open().then(async () => {
      if (!alive) {
        repo.close();
        return;
      }
      await refresh();
      if (alive) setReady(true);
    });
    const focus = () => {
      void refresh();
      updateNetwork();
    };
    window.addEventListener('focus', focus);
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    const timer = setInterval(() => {
      if (stateRef.current.activeAttempt?.state === 'processing') void refresh();
    }, 250);
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEMO_TESTING === '1') {
      const api = {
        read: () => structuredClone(stateRef.current),
        events: readEvents,
        catalog: () => structuredClone(catalogRef.current),
        fixture: async (name: Parameters<typeof fixture>[0]) => {
          const c = fixture(name);
          catalogRef.current = c;
          setCatalog(c);
          await mutate((s) => Object.assign(s, newState(c, Date.now() + offset.current)));
        },
        patchCatalog: async (fn: (c: Catalog) => void) => {
          const c = structuredClone(catalogRef.current);
          fn(c);
          catalogRef.current = c;
          setCatalog(c);
          await refresh();
        },
        advance: async (ms: number) => {
          offset.current += ms;
          await refresh();
        },
        failWrite: () => {
          repo.failNextWrite = true;
        },
        catalogError: (value = true) => setCatalogError(value),
        patchState: async (fn: (s: DemoState) => void) => {
          await mutate(fn);
        },
        reset: async () => {
          await mutate((s) =>
            Object.assign(s, newState(catalogRef.current, Date.now() + offset.current)),
          );
        },
      };
      (window as Window & { __demo?: typeof api }).__demo = api;
    }
    return () => {
      alive = false;
      repo.close();
      bc?.close();
      clearInterval(timer);
      window.removeEventListener('focus', focus);
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
    };
    // The repository owns the shared transaction lifetime, independent of renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Context.Provider
      value={{
        state,
        catalog,
        ready,
        temporary,
        notice,
        catalogError,
        offline,
        draft,
        setDraft,
        mutate,
        refresh,
        notify,
        retryCatalog: () => setCatalogError(false),
        listUrl,
        setListUrl,
        listScroll,
        setListScroll,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const c = useContext(Context);
  if (!c) throw new Error('Missing store');
  return c;
}
