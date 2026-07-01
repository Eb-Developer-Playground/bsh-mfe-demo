import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideZonelessChangeDetection, ApplicationRef } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { provideShellNav } from './provide-shell-nav';
import {
  decideContribution,
  exploreContribution,
} from '../../testing/nav-contribution.fixture';
import { testManifest } from '../../testing/manifest.fixture';
import { fakeNfByRemote } from '../../testing/native-federation.stub';

describe('provideShellNav', () => {
  it('registers an app initializer that wires the Router resetConfig', async () => {
    const nf = fakeNfByRemote({
      '@tractor-store/explore': { navContribution: exploreContribution },
      '@tractor-store/decide': { navContribution: decideContribution },
    });

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideShellNav(nf, testManifest),
      ],
    });

    // Initializers run when the injector resolves ApplicationRef.
    const appRef = TestBed.inject(ApplicationRef);
    await appRef.whenStable();

    const router = TestBed.inject(Router);
    // resetConfig has run via setupShellNavigation, so the router holds the
    // static login route, generated remote routes, and the wildcard redirect.
    expect(router.config.at(0)?.path).toBe('login');
    expect(router.config.length).toBeGreaterThanOrEqual(5);
    expect(router.config.at(-1)).toEqual({
      path: '**',
      redirectTo: 'explore',
    });
  });

  it('logs a warning when no remotes are available', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const nf = fakeNfByRemote({});

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideShellNav(nf, {}),
      ],
    });

    const appRef = TestBed.inject(ApplicationRef);
    await appRef.whenStable();

    const router = TestBed.inject(Router);
    // The static login route stays available even when no remote contribution loads.
    expect(router.config).toHaveLength(2);
    expect(router.config[0]?.path).toBe('login');
    expect(router.config[1]).toEqual({ path: '**', redirectTo: 'explore' });
    consoleWarn.mockRestore();
  });
});
