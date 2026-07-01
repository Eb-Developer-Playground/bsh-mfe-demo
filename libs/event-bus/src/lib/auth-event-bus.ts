import { defineChannel } from './event-bus-setup';

export interface AuthUser {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly roles: readonly string[];
}

export interface AuthStateSnapshot {
  readonly isAuthenticated: boolean;
  readonly user: AuthUser | null;
}

export interface AuthInteractionRequest {
  readonly source: string;
}

export const authState =
  defineChannel<AuthStateSnapshot>('auth:state');

export const authLoginRequest =
  defineChannel<AuthInteractionRequest>('auth:login-request');

export const authLogoutRequest =
  defineChannel<AuthInteractionRequest>('auth:logout-request');
