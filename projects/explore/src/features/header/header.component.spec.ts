import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authLoginRequest,
  authLogoutRequest,
  authState,
} from '@ng-internal/event-bus';
import { LOADER } from '../../core/remote-loader';
import { ENV } from '../../env.config';
import { testEnv } from '../../testing/env.fixture';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let loader: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    loader = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: ENV, useValue: testEnv },
        { provide: LOADER, useValue: loader },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  });

  it('renders the cdn-prefixed logo', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const img = (fixture.nativeElement as HTMLElement).shadowRoot!.querySelector(
      '.e_Header__logo',
    ) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('http://cdn.test/cdn/img/logo.svg');
    expect(img.getAttribute('alt')).toBe('Micro Frontends - Tractor Store');
  });

  it('embeds the navigation and mini-cart slices', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const el: ShadowRoot = (fixture.nativeElement as HTMLElement).shadowRoot!;
    expect(el.querySelector('app-navigation')).not.toBeNull();
    expect(el.querySelector('mfe-mini-cart')).not.toBeNull();
  });

  it('marks the header with the explore boundary attribute', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).shadowRoot!
        .querySelector('header')
        ?.getAttribute('data-boundary'),
    ).toBe('explore');
  });

  it('eagerly preloads the cross-team mini-cart slice from checkout', () => {
    TestBed.createComponent(HeaderComponent);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledWith(
      '@tractor-store/checkout',
      'mfe-mini-cart',
    );
  });

  it('shows a sign-in action when the shell reports an anonymous session', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    const shadow = (fixture.nativeElement as HTMLElement).shadowRoot!;
    const buttons = shadow.querySelectorAll('.e_Header__authButton');

    expect(shadow.textContent).toContain('Anonymous');
    expect(shadow.textContent).toContain('Guest session active');
    expect(buttons[0]?.textContent?.trim()).toBe('Simulate login');
    expect(buttons[1]?.textContent?.trim()).toBe('Simulate logout');
  });

  it('renders the shell-provided user details when authenticated', async () => {
    const fixture = TestBed.createComponent(HeaderComponent);

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
    const buttons = shadow.querySelectorAll('.e_Header__authButton');
    expect(buttons[0]?.textContent?.trim()).toBe('Simulate login');
    expect(buttons[1]?.textContent?.trim()).toBe('Simulate logout');
  });

  it('requests login through the shared auth channel', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    const seen = vi.fn();
    const off = authLoginRequest.on(seen);

    fixture.detectChanges();
    (
      (fixture.nativeElement as HTMLElement).shadowRoot!.querySelectorAll(
        '.e_Header__authButton',
      )[0] as HTMLButtonElement
    ).click();

    expect(seen).toHaveBeenCalledWith({
      source: '@tractor-store/explore/header',
    });
    off();
  });

  it('requests logout through the shared auth channel', async () => {
    const fixture = TestBed.createComponent(HeaderComponent);
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
        '.e_Header__authButton',
      )[1] as HTMLButtonElement
    ).click();

    expect(seen).toHaveBeenCalledWith({
      source: '@tractor-store/explore/header',
    });
    off();
  });
});
