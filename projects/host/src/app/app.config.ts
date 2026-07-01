import {
  ApplicationConfig,
  provideAppInitializer,
  provideZonelessChangeDetection,
  inject,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import {
  FederationManifest,
  NativeFederationResult,
} from '@softarc/native-federation-orchestrator';
import { EnvironmentConfig, createSliceLoader } from '@ng-internal/federation';
import { ENV, LOAD_REMOTE_SLICE } from './env.config';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideShellNav } from './nav/provide-shell-nav';
import { MockAuthService } from './auth/mock-auth.service';
import { hostRoutes } from './app.routes';

export const appConfig = (
  env: EnvironmentConfig,
  nf: NativeFederationResult,
  manifest: FederationManifest,
): ApplicationConfig => ({
  providers: [
    { provide: ENV, useValue: env },
    {
      provide: LOAD_REMOTE_SLICE,
      useValue: createSliceLoader(env, nf, manifest),
    },
    provideHttpClient(withFetch()),
    provideZonelessChangeDetection(),
    provideRouter(hostRoutes, withComponentInputBinding()),
    provideAppInitializer(() => inject(MockAuthService).initialize()),
    provideShellNav(nf, manifest),
  ],
});
