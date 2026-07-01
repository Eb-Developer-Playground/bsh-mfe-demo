import type { NFEventRegistry } from '@softarc/native-federation-orchestrator/registry';

type Entry = { data: unknown; timestamp: number };
type Handler = (event: Entry) => void;

type StorageLike = {
  clear: () => void;
  getItem: (key: string) => string | null;
  key: (index: number) => string | null;
  readonly length: number;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

function createStorageStub(): StorageLike {
  const store = new Map<string, string>();

  return {
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
}

function installStorageStub(name: 'localStorage' | 'sessionStorage'): void {
  const existing = window[name] as Partial<StorageLike> | undefined;
  if (
    existing &&
    typeof existing.clear === 'function' &&
    typeof existing.getItem === 'function' &&
    typeof existing.setItem === 'function' &&
    typeof existing.removeItem === 'function' &&
    typeof existing.key === 'function'
  ) {
    return;
  }

  Object.defineProperty(window, name, {
    configurable: true,
    value: createStorageStub(),
  });
}

const fakeRegistry = (): NFEventRegistry => {
  const listeners = new Map<string, Handler[]>();
  const history = new Map<string, Entry[]>();

  const append = (type: string, entry: Entry) => {
    const past = history.get(type) ?? [];
    past.push(entry);
    history.set(type, past);
    for (const cb of listeners.get(type) ?? []) cb(entry);
  };

  return {
    on: (
      type: string,
      cb: Handler,
      opts: { replay?: number } = {},
    ) => {
      const replay = opts.replay ?? 1;
      const arr = listeners.get(type) ?? [];
      arr.push(cb);
      listeners.set(type, arr);
      const past = history.get(type) ?? [];
      if (past.length > 0 && replay > 0) {
        const start = Math.max(0, past.length - replay);
        queueMicrotask(() => {
          for (let i = start; i < past.length; i++) cb(past[i]);
        });
      }
      return () => {
        const next = (listeners.get(type) ?? []).filter((h) => h !== cb);
        listeners.set(type, next);
      };
    },
    emit: (type: string, data: unknown) => {
      append(type, { data, timestamp: Date.now() });
    },
    update: (type: string, fn: (last: unknown) => unknown) => {
      const past = history.get(type) ?? [];
      const last = past[past.length - 1]?.data;
      append(type, { data: fn(last), timestamp: Date.now() });
    },
    onReady: () => () => {},
    register: async () => {},
  } as unknown as NFEventRegistry;
};

// Mirrors what the host installs synchronously at bootstrap, so modules that
// call defineChannel() at top level have a registry to bind against. Specs
// can still swap in their own fake via beforeEach.
(installStorageStub('localStorage'));
(installStorageStub('sessionStorage'));
(window as unknown as { __NF_REGISTRY__: NFEventRegistry }).__NF_REGISTRY__ =
  fakeRegistry();
