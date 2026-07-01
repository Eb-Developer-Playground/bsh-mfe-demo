import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authLoginRequest,
  authLogoutRequest,
  authState,
  type AuthStateSnapshot,
} from './auth-event-bus';

type Handler = (event: { data: unknown; timestamp: number }) => void;

const fakeRegistry = () => {
  const listeners = new Map<string, Handler[]>();
  return {
    on: (type: string, cb: Handler) => {
      const arr = listeners.get(type) ?? [];
      arr.push(cb);
      listeners.set(type, arr);
      return () => {
        const next = (listeners.get(type) ?? []).filter((h) => h !== cb);
        listeners.set(type, next);
      };
    },
    emit: (type: string, data: unknown) => {
      for (const cb of listeners.get(type) ?? []) {
        cb({ data, timestamp: Date.now() });
      }
    },
  };
};

describe('auth event channels', () => {
  let original: unknown;

  beforeEach(() => {
    original = (window as unknown as { __NF_REGISTRY__?: unknown })
      .__NF_REGISTRY__;
    (window as unknown as { __NF_REGISTRY__: unknown }).__NF_REGISTRY__ =
      fakeRegistry();
  });

  afterEach(() => {
    (window as unknown as { __NF_REGISTRY__?: unknown }).__NF_REGISTRY__ =
      original as never;
  });

  it('forwards auth snapshots to subscribers', () => {
    const seen = vi.fn();
    const payload: AuthStateSnapshot = {
      isAuthenticated: true,
      user: {
        id: 'demo-user',
        displayName: 'Jordan Fields',
        email: 'jordan@example.com',
        roles: ['customer'],
      },
    };

    authState.on(seen);
    authState.emit(payload);

    expect(seen).toHaveBeenCalledWith(payload);
  });

  it('forwards login requests to subscribers', () => {
    const seen = vi.fn();
    authLoginRequest.on(seen);
    authLoginRequest.emit({ source: '@tractor-store/explore/header' });
    expect(seen).toHaveBeenCalledWith({
      source: '@tractor-store/explore/header',
    });
  });

  it('returns an unsubscribe for logout requests', () => {
    const seen = vi.fn();
    const off = authLogoutRequest.on(seen);
    off();
    authLogoutRequest.emit({ source: '@tractor-store/checkout/compact-header' });
    expect(seen).not.toHaveBeenCalled();
  });
});
