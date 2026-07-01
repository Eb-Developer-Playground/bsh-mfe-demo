import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import {
  authLoginRequest,
  authLogoutRequest,
  authState,
} from '@ng-internal/event-bus';
import { NavigateToDirective } from '@ng-internal/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ENV } from '../../../env.config';
import { testEnv } from '../../../testing/env.fixture';
import { CompactHeaderComponent } from './compact-header';

describe('CompactHeaderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompactHeaderComponent],
      providers: [provideRouter([]), { provide: ENV, useValue: testEnv }],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(CompactHeaderComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('exposes a cdn-prefixed logo url', () => {
    expect(create().componentInstance.logoUrl).toBe(
      'http://cdn.test/cdn/img/logo.svg',
    );
  });

  it('renders the logo with cdn src and accessible alt text', () => {
    const img = (create().nativeElement as HTMLElement).shadowRoot!.querySelector(
      'img',
    ) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('http://cdn.test/cdn/img/logo.svg');
    expect(img.getAttribute('alt')).toBe('Micro Frontends - Tractor Store');
  });

  it('points the logo link at the explore home intent', () => {
    const fixture = create();
    const dir = fixture.debugElement
      .query(By.directive(NavigateToDirective))
      .injector.get(NavigateToDirective);
    expect(dir.appNavigateTo()).toBe('explore.home');
  });

  it('marks the host with the banner role', () => {
    const host: HTMLElement = create().nativeElement;
    expect(host.getAttribute('role')).toBe('banner');
  });

  it('shows the shell-provided auth details when signed in', async () => {
    const fixture = create();
    authState.emit({
      isAuthenticated: true,
      user: {
        id: 'demo-user',
        displayName: 'Jordan Fields',
        email: 'jordan@example.com',
        roles: ['customer'],
      },
    });

    await Promise.resolve();
    fixture.detectChanges();

    const shadow = (fixture.nativeElement as HTMLElement).shadowRoot!;
    expect(shadow.textContent).toContain('Authenticated');
    expect(shadow.textContent).toContain('Jordan Fields');
    const buttons = shadow.querySelectorAll('.c_CompactHeader__authButton');
    expect(buttons[0]?.textContent?.trim()).toBe('Simulate login');
    expect(buttons[1]?.textContent?.trim()).toBe('Simulate logout');
  });

  it('shows an anonymous indicator and both simulation controls by default', () => {
    const shadow = (create().nativeElement as HTMLElement).shadowRoot!;
    const buttons = shadow.querySelectorAll('.c_CompactHeader__authButton');

    expect(shadow.textContent).toContain('Anonymous');
    expect(shadow.textContent).toContain('Guest session active');
    expect(buttons[0]?.textContent?.trim()).toBe('Simulate login');
    expect(buttons[1]?.textContent?.trim()).toBe('Simulate logout');
  });

  it('requests login through the shared auth channel', () => {
    const fixture = create();
    const seen = vi.fn();
    const off = authLoginRequest.on(seen);

    (
      (fixture.nativeElement as HTMLElement).shadowRoot!.querySelectorAll(
        '.c_CompactHeader__authButton',
      )[0] as HTMLButtonElement
    ).click();

    expect(seen).toHaveBeenCalledWith({
      source: '@tractor-store/checkout/compact-header',
    });
    off();
  });

  it('requests logout through the shared auth channel', async () => {
    const fixture = create();
    const seen = vi.fn();
    const off = authLogoutRequest.on(seen);
    authState.emit({
      isAuthenticated: true,
      user: {
        id: 'demo-user',
        displayName: 'Jordan Fields',
        email: 'jordan@example.com',
        roles: ['customer'],
      },
    });

    await Promise.resolve();
    fixture.detectChanges();
    (
      (fixture.nativeElement as HTMLElement).shadowRoot!.querySelectorAll(
        '.c_CompactHeader__authButton',
      )[1] as HTMLButtonElement
    ).click();

    expect(seen).toHaveBeenCalledWith({
      source: '@tractor-store/checkout/compact-header',
    });
    off();
  });
});
