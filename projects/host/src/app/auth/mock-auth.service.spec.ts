import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authState } from '@ng-internal/event-bus';
import { MockAuthService } from './mock-auth.service';

describe('MockAuthService', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  it('starts anonymous and publishes that snapshot on initialize', () => {
    const seen = vi.fn();
    const off = authState.on(seen);
    const service = TestBed.inject(MockAuthService);

    service.initialize();

    expect(service.isAuthenticated()).toBe(false);
    expect(seen).toHaveBeenCalledWith({ isAuthenticated: false, user: null });
    off();
  });

  it('persists and replays a mock user after login', () => {
    const service = TestBed.inject(MockAuthService);

    service.initialize();
    service.login();

    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()?.displayName).toBe('Jordan Fields');
    expect(window.localStorage.getItem('tractor-store.mock-auth')).toContain(
      'Jordan Fields',
    );
  });

  it('clears persisted auth state on logout', () => {
    const service = TestBed.inject(MockAuthService);

    service.initialize();
    service.login();
    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(window.localStorage.getItem('tractor-store.mock-auth')).toBeNull();
  });
});
