import { Injectable, computed, signal } from '@angular/core';
import {
  authLoginRequest,
  authLogoutRequest,
  authState,
  type AuthStateSnapshot,
} from '@ng-internal/event-bus';

const STORAGE_KEY = 'tractor-store.mock-auth';

const ANONYMOUS_STATE: AuthStateSnapshot = Object.freeze({
  isAuthenticated: false,
  user: null,
});

const AUTHENTICATED_STATE: AuthStateSnapshot = Object.freeze({
  isAuthenticated: true,
  user: {
    id: 'demo-user',
    displayName: 'Jordan Fields',
    email: 'jordan@example.com',
    roles: ['customer'],
  },
});

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function isAuthStateSnapshot(value: unknown): value is AuthStateSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const snapshot = value as Record<string, unknown>;
  if (typeof snapshot['isAuthenticated'] !== 'boolean') return false;
  const user = snapshot['user'];
  if (user === null) return true;
  if (typeof user !== 'object' || user === null) return false;
  const authUser = user as Record<string, unknown>;
  return (
    typeof authUser['id'] === 'string' &&
    typeof authUser['displayName'] === 'string' &&
    typeof authUser['email'] === 'string' &&
    Array.isArray(authUser['roles'])
  );
}

@Injectable({ providedIn: 'root' })
export class MockAuthService {
  private readonly state = signal<AuthStateSnapshot>(ANONYMOUS_STATE);
  readonly snapshot = this.state.asReadonly();
  readonly isAuthenticated = computed(() => this.state().isAuthenticated);
  readonly user = computed(() => this.state().user);

  private initialized = false;

  initialize(): void {
    if (!this.initialized) {
      this.initialized = true;
      this.state.set(this.readFromStorage());
      authLoginRequest.on(({ source }) => this.login(source));
      authLogoutRequest.on(({ source }) => this.logout(source));
    }
    authState.emit(this.state());
  }

  login(_source = '@tractor-store/host'): void {
    this.persist(AUTHENTICATED_STATE);
  }

  logout(_source = '@tractor-store/host'): void {
    this.persist(ANONYMOUS_STATE);
  }

  canAccessProtectedRoute(): boolean {
    return this.isAuthenticated();
  }

  private persist(next: AuthStateSnapshot): void {
    this.state.set(next);
    if (hasWindow()) {
      try {
        if (next.isAuthenticated) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Demo auth tolerates unavailable storage.
      }
    }
    authState.emit(next);
  }

  private readFromStorage(): AuthStateSnapshot {
    if (!hasWindow()) return ANONYMOUS_STATE;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return ANONYMOUS_STATE;
      const parsed: unknown = JSON.parse(raw);
      return isAuthStateSnapshot(parsed) ? parsed : ANONYMOUS_STATE;
    } catch {
      return ANONYMOUS_STATE;
    }
  }
}
