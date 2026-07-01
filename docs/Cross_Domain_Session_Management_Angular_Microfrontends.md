# Secure Cross-Domain Session Management for Angular Microfrontends

**Research Report**
**Date**: July 2026
**Author**: Owen Adirah
**Domain**: Enterprise Security Architecture — Angular Microfrontends

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Session Management Options](#3-session-management-options)
   - 3.1 BFF + HttpOnly Session Cookie (IETF Recommended)
   - 3.2 Shell-Owned OIDC + Module Federation Singleton
   - 3.3 Token Broker (postMessage from Auth Subdomain)
   - 3.4 RFC 8693 Token Exchange (Backend-to-Backend)
   - 3.5 localStorage JWT Tokens (Discouraged)
4. [Security Posture Comparison](#4-security-posture-comparison)
5. [Cross-Domain SSO Mechanics](#5-cross-domain-sso-mechanics)
6. [Angular Library Comparison](#6-angular-library-comparison)
7. [Decision Framework](#7-decision-framework)
8. [Enterprise Security Checklist](#8-enterprise-security-checklist)
9. [Recommended Enterprise Stack (2026)](#9-recommended-enterprise-stack-2026)
10. [Key Risks and Mitigations](#10-key-risks-and-mitigations)
11. [References](#11-references)

---

## 1. Executive Summary

This report evaluates five session management strategies for Angular microfrontend architectures where a single client accesses services across multiple domains. Each option is assessed against enterprise security requirements including XSS/CSRF resistance, third-party cookie resilience, OWASP/NIST compliance, and Angular-specific implementation complexity.

**Key Finding**: The Backend-for-Frontend (BFF) pattern is the IETF-recommended highest-security approach for browser-based applications. For same-domain microfrontend deployments, shell-owned OIDC with Module Federation singleton sharing offers the best balance of security and developer experience.

**Critical Context**: Third-party cookie deprecation across major browsers (Safari full block since v13.1, Firefox partitioning, Chrome user-choice) has eliminated traditional cross-domain cookie-based session sharing as a viable strategy. All recommended approaches are designed to function without third-party cookies.

---

## 2. Problem Statement

When a single Angular client accesses multiple domains in a microfrontend architecture, three intersecting challenges emerge:

1. **Token Storage** — Where do access tokens live in the browser (or do they exist in the browser at all)?
2. **Session Propagation** — How do independently deployed MFEs share authentication state?
3. **Cross-Domain Trust** — How do backend services verify user identity across domain boundaries?

### Constraints

- Angular SPA (public OAuth client) cannot securely store long-lived secrets
- Third-party cookies are effectively deprecated across all major browsers
- Safari ITP and Firefox ETP block iframe-based silent authentication renewal
- Microfrontends may be deployed on different subdomains or entirely separate domains
- Enterprise compliance requires auditability, session revocation, and zero-trust alignment

---

## 3. Session Management Options

### 3.1 BFF + HttpOnly Session Cookie (IETF Recommended)

**Security Posture: HIGHEST**

Explicitly recommended by IETF draft-oauth-browser-based-apps (Section 6.1). The browser never sees or handles OAuth tokens.

#### Architecture

```
Angular SPA  ──(HttpOnly Cookie)──>  BFF Server  ──(Bearer Token)──>  Downstream APIs
                                         │
                                         ▼
                                   Identity Provider
                              (Auth Code + PKCE, Confidential Client)
```

#### How It Works

1. BFF server performs OIDC authentication as a **confidential client** (has a client secret)
2. Tokens are stored **server-side** (Redis, database, or encrypted session store)
3. BFF issues a `__Host-` prefixed HttpOnly session cookie to the browser
4. All API calls route through the BFF proxy, which injects Bearer tokens server-side
5. Browser has zero access to tokens — XSS cannot exfiltrate them

#### Cookie Specification

```
Set-Cookie: __Host-session=<opaque-id>; HttpOnly; Secure; SameSite=Lax; Path=/
```

The `__Host-` prefix prevents subdomain session fixation attacks. The cookie cannot be shared with or overridden by subdomains.

#### Angular Implementation

No OIDC library is needed in the browser. Two artifacts only:

**CSRF Interceptor** — Replaces `Authorization: Bearer` entirely:

```typescript
export const csrfHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({
    withCredentials: true,
    headers: req.headers.set('X-CSRF', '1')
  }));
};
```

**Session Service** — Signals-based, no token management:

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  session = toSignal(
    defer(() => this.http.get<SessionClaim[]>('/bff/user').pipe(
      catchError(() => of(null)),
      shareReplay(1)
    )),
    { initialValue: null }
  );

  isAuthenticated = computed(() => this.session() !== null);
  username = computed(() =>
    this.session()?.find(c => c.type === 'name')?.value ?? null
  );

  login()  { window.location.href = '/bff/login'; }
  logout() { window.location.href = '/bff/logout'; }
}
```

#### Reference Implementations

- **.NET**: Duende BFF Angular Sample (https://github.com/DuendeSoftware/Samples/tree/main/BFF/v4/Angular)
- **Node.js**: `express-openid-connect` + `express-session` with Redis store

#### Advantages

- Tokens never exist in browser memory — XSS cannot exfiltrate them
- Confidential client flow — stronger than public client PKCE
- Immune to Safari ITP / Firefox ETP / third-party cookie deprecation
- Simplest Angular implementation — no OIDC library needed

#### Disadvantages

- Requires a server-side component (BFF) per deployment group
- Adds network hop latency for all API calls
- Operational overhead for session store (Redis/DB)
- More complex infrastructure compared to client-side-only approaches

---

### 3.2 Shell-Owned OIDC + Module Federation Singleton

**Security Posture: HIGH**

Best for same-registration-domain MFE architectures where all microfrontends share a common top-level domain.

#### Architecture

```
Shell Application (owns auth)
  ├── AuthService (singleton, providedIn: 'root')
  │    ├── Owns OIDC flow (PKCE + Code Flow)
  │    ├── Stores access token in-memory ONLY
  │    ├── Manages refresh token rotation
  │    └── Exposes auth state via Signal/Observable
  │
  ├── MFE 1 (consumes auth state via DI)
  ├── MFE 2 (consumes auth state via DI)
  └── MFE 3 (consumes auth state via DI)
```

#### Core Rule

MFEs **never** initialize their own auth flows or store their own tokens. The shell owns everything. Remotes consume auth state via Angular dependency injection.

#### Module Federation Configuration

The `singleton: true` flag is critical — ensures exactly one auth library instance across shell and all remotes:

```javascript
// webpack.config.js (shell AND each remote — identical shared entry)
shared: {
  'angular-oauth2-oidc': {
    singleton: true,
    strictVersion: true,
    requiredVersion: 'auto'
  },
}
```

#### Shell Auth Bootstrap (Angular 20+)

```typescript
// Shell only — remotes MUST NOT call forRoot() or provideAuth()
export const appConfig: ApplicationConfig = {
  providers: [
    provideAuth({
      config: {
        authority: 'https://id.company.com',
        redirectUrl: window.location.origin,
        clientId: 'shell-spa',
        scope: 'openid profile email offline_access',
        responseType: 'code',
        silentRenew: true,
        useRefreshToken: true,  // NO iframe silent refresh
      },
    }),
  ],
};
```

#### Remote Component Usage

```typescript
@Component({ ... })
export class OrdersComponent {
  private auth = inject(OidcSecurityService);
  isAuthenticated = this.auth.isAuthenticated();  // Same singleton from shell
}
```

#### Advantages

- No additional infrastructure — pure client-side solution
- Native Angular DI sharing via Module Federation
- Clean separation of concerns (shell owns auth, remotes consume)
- Works well with `angular-oauth2-oidc`, `@auth0/auth0-angular`, `@azure/msal-angular`

#### Disadvantages

- Tokens exist in browser memory — accessible to XSS
- All MFEs must be on the same top-level domain
- Module Federation version alignment required across all MFEs
- Refresh token rotation must be handled carefully to avoid race conditions

---

### 3.3 Token Broker (Cross-Subdomain)

**Security Posture: MEDIUM**

For MFEs on different subdomains of the same parent domain. Uses a hidden iframe as a centralized token authority communicating via `postMessage`.

#### Architecture

```
MFE (app.example.com) ──postMessage('REQUEST_TOKEN')──> Hidden Iframe (auth.example.com/broker)
                       <──postMessage('TOKEN_GRANTED')──
```

#### How It Works

1. A hidden iframe loaded from `auth.example.com/broker` holds the user's session
2. MFEs request tokens by sending `postMessage` to the broker iframe
3. The broker validates the requesting origin against an allowlist
4. If approved, the broker issues a short-lived, scope-restricted access token
5. The MFE receives the token in memory and uses it for API calls

#### Critical Security Rule

**Never use wildcard `targetOrigin` in `postMessage`.** Microsoft MSRC (August 2025) documented CVE-class token theft from `postMessage({ token }, '*')` in production Azure/Teams deployments.

```typescript
// CORRECT — always specify exact origin
broker.postMessage({ type: 'REQUEST_TOKEN', scope }, 'https://auth.example.com');

// RECEIVING — always validate source
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://auth.example.com') return;
  // process event.data
});
```

#### Advantages

- Works across subdomains without shared Module Federation
- Centralized token management via broker
- MFEs receive only scoped, short-lived tokens

#### Disadvantages

- Relies on iframe — affected by Safari ITP for cross-subdomain scenarios
- `postMessage` is a common attack surface if not properly origin-validated
- More complex to implement and debug than Module Federation singleton
- Token exists in browser memory — XSS accessible

---

### 3.4 RFC 8693 Token Exchange (Backend-to-Backend)

**Security Posture: HIGH (Backend Layer)**

A backend-only pattern that complements Options 1-3. Used when one backend service needs to call another backend service on behalf of the user.

#### Request Format

```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
subject_token=<original-user-access-token>
audience=https://hr-service.company.com
scope=read:employee-data
```

#### Response — Narrowly Scoped Token with Delegation Audit Trail

```json
{
  "sub": "user@company.com",
  "aud": "https://hr-service.company.com",
  "scope": "read:employee-data",
  "act": { "sub": "travel-booking-service" }
}
```

The `act` (actor) claim provides a full delegation chain for audit purposes.

#### IdP Support

| Identity Provider | Support Level |
|---|---|
| Keycloak | Native RFC 8693 |
| Azure AD / Entra ID | On-Behalf-Of flow (OBO) |
| Okta | Native RFC 8693 |
| Auth0 | Enterprise tier |

#### Advantages

- Zero browser exposure — entirely server-side
- Fine-grained, per-service audience and scope restriction
- Full audit trail via nested `act` claims
- Aligns with zero-trust / least-privilege principles

#### Disadvantages

- Backend-only — does not solve frontend session management alone
- Requires IdP support for token exchange grant type
- Additional complexity in service mesh configuration

---

### 3.5 localStorage JWT Tokens

**Security Posture: LOWEST — OWASP Explicitly Discourages**

Storing tokens in `localStorage` or `sessionStorage` is the simplest implementation but carries the highest security risk.

#### Why It's Discouraged

- **XSS = Instant Token Exfiltration**: Any XSS vulnerability (including from a compromised MFE or third-party script) can read all tokens via `localStorage.getItem()`
- **No HttpOnly Protection**: JavaScript has unrestricted access
- **Persistent Storage**: `localStorage` survives tab/browser closure — stolen tokens remain valid
- **OWASP Position**: "Do not store session identifiers in localStorage or sessionStorage" (OWASP Session Management Cheat Sheet)

#### When It Might Be Acceptable

- Internal tools with no external user access
- Development/staging environments only
- Short-lived tokens (< 5 minutes) with no refresh tokens

**Recommendation**: Avoid in production enterprise systems.

---

## 4. Security Posture Comparison

| # | Approach | XSS Risk | CSRF Risk | Cookie Dependency | Third-Party Cookie Resilient |
|---|---|---|---|---|---|
| 1 | BFF + HttpOnly Cookie + DPoP | **NONE** — token never in browser | LOW — SameSite + X-CSRF header | 1st-party only | YES |
| 2 | Shell OIDC + In-Memory + MF Singleton | MEDIUM — token in JS memory | NONE | None (memory) | YES |
| 3 | Token Broker (postMessage iframe) | MEDIUM | NONE | 1st-party (IdP domain) | PARTIAL |
| 4 | RFC 8693 Token Exchange | **NONE** (server-side) | N/A (backend) | None (backend only) | YES |
| 5 | localStorage JWT | **CRITICAL** — instant exfiltration | NONE | None | YES |

---

## 5. Cross-Domain SSO Mechanics

For truly separate domains sharing SSO, the solution relies on the **Identity Provider's own session** — not cross-application cookies.

```
app-a.company.com              id.company.com              app-b.company.com
       │                              │                              │
       │── OIDC login ──────────────>│                              │
       │<── id_token + session ──────│                              │
       │    cookie at id.company     │                              │
                                      │<── OIDC login ──────────────│
                                      │── SSO session auto-auth ──>│
                                      │   (no user prompt needed)  │
```

The IdP's session cookie at `id.company.com` is first-party to the IdP domain. It persists across browser sessions and enables silent authentication for all registered applications. This mechanism is **immune to third-party cookie restrictions** because the cookie is always first-party when the browser redirects to the IdP.

---

## 6. Angular Library Comparison

| Library | MFE Support | Singleton Compatible | BFF-Ready | IdP Compatibility |
|---|---|---|---|---|
| `angular-oauth2-oidc` (manfredsteyer) | Best-in-class | Yes | No (client-side; use bare HttpClient for BFF) | Any OIDC provider |
| `angular-auth-oidc-client` (damienbod) | Good, Signals-aware | Yes | No (client-side) | Any OIDC provider |
| `@auth0/auth0-angular` | Verified | Yes | No (client-side) | Auth0 only |
| `@azure/msal-angular` | Works | Yes | No (client-side) | Entra ID / B2C |
| `keycloak-angular` | DI breaks with Angular v20+ Native Federation | Issues with Native Federation | Via Keycloak adapter | Keycloak native |
| Duende BFF (.NET) + bare Angular HttpClient | Reference implementation | N/A (server-side) | Purpose-built | Any OIDC provider |
| `express-openid-connect` + bare Angular HttpClient | Works | N/A (server-side) | Yes | Auth0 / Any OIDC |

### Important Vendor Notes

- **Azure AD B2C**: Closed to new customers May 2025. P2 tier retired March 2026. Full end-of-life May 2030. **Replacement: Microsoft Entra External ID** — MSAL Angular code is unchanged; only the authority URL changes from `*.b2clogin.com` to `*.ciamlogin.com`.

- **Keycloak + Native Federation**: Known DI issue (GitHub #989) — `keycloak-angular` breaks across federated module boundaries in Angular v20+. **Workaround**: Exclude Keycloak libraries from federation scope; expose a shell-owned `AuthFacadeService` instead.

---

## 7. Decision Framework

```
Q1: Are ALL MFEs on the same top-level domain? (*.company.com)
     YES → Module Federation singleton + shell-owned OIDC (Option 2)
     NO  → Q2

Q2: Do you need the HIGHEST security posture?
     YES → BFF pattern per MFE group (Option 1)
     NO  → Q3

Q3: Do backends call other backends on behalf of users?
     YES → Add RFC 8693 Token Exchange at backend layer (Option 4)
     NO  → PKCE + Code Flow with shell-owned auth is sufficient

Q4: Are any MFEs loaded from truly foreign domains (vendor-provided MFEs)?
     YES → BFF per foreign domain + RFC 8693 at domain boundary
     NO  → Module Federation singleton auth service
```

### Quick Reference — Pattern Selection by Scenario

| Scenario | Recommended Pattern |
|---|---|
| All MFEs same domain, standard security | Shell OIDC + Module Federation singleton |
| All MFEs same domain, high security (finance, healthcare) | BFF + HttpOnly cookie |
| MFEs across subdomains, same parent domain | Token Broker or BFF |
| MFEs on entirely separate domains | BFF per domain group + RFC 8693 |
| Vendor-provided third-party MFEs | BFF with strict CORS + CSP |
| Backend service-to-service calls | RFC 8693 Token Exchange |

---

## 8. Enterprise Security Checklist

Derived from OWASP, NIST 800-207 (Zero Trust Architecture), NIST 800-63-4, and IETF OAuth for Browser-Based Apps.

### Token Issuance

- [ ] PKCE mandatory for all public clients (Angular SPAs)
- [ ] Access token lifetime ≤ 15 minutes
- [ ] `aud` claim pinned per-MFE API endpoint (not wildcard)
- [ ] Refresh token rotation enabled with one-time use enforcement
- [ ] Sender-constrained tokens (DPoP) for highest security tier

### Token Storage

- [ ] **ZERO tokens in localStorage, sessionStorage, or IndexedDB**
- [ ] Access tokens: in-memory only (client-side) or server-side (BFF)
- [ ] Refresh tokens: HttpOnly + Secure + SameSite cookie via BFF only
- [ ] Session identifiers: opaque, high-entropy, server-generated

### Cross-Domain Communication

- [ ] `postMessage`: always specify exact `targetOrigin` (never `'*'`)
- [ ] `postMessage` receivers: validate `event.origin` before processing
- [ ] CSP `frame-src` restricted to trusted MFE origins only
- [ ] CORS: explicit origin allowlist, never wildcard on authenticated endpoints
- [ ] SRI (Subresource Integrity) hashes on all remote Module Federation entries

### Cookie Security

- [ ] `__Host-` prefix on session cookies (prevents subdomain fixation)
- [ ] `HttpOnly` flag set (prevents JavaScript access)
- [ ] `Secure` flag set (HTTPS only)
- [ ] `SameSite=Lax` or `SameSite=Strict` (prevents CSRF)
- [ ] `Path=/` scoped appropriately

### Browser Compatibility

- [ ] No iframe-based silent renew — use refresh token rotation instead
- [ ] BFF pattern: immune to Safari ITP / Firefox ETP entirely
- [ ] Evaluate CHIPS (`Partitioned` cookie attribute) for embedded MFE iframes
- [ ] Test with third-party cookies disabled in all target browsers

### Zero Trust Alignment

- [ ] Re-validate token on every sensitive operation (not just at session start)
- [ ] Step-up authentication trigger for high-value MFE operations
- [ ] Centralized session revocation propagation across all MFEs
- [ ] Continuous risk assessment (device posture, location, behavior)

---

## 9. Recommended Enterprise Stack (2026)

```
┌─────────────────────────────────────────────────────┐
│  LAYER 1: Browser ↔ BFF                            │
│  __Host- cookie, SameSite=Lax, HttpOnly, Secure    │
│  CSRF protection via X-CSRF custom header           │
├─────────────────────────────────────────────────────┤
│  LAYER 2: Angular Shell                             │
│  AuthService (signals) checking /bff/user           │
│  Module Federation singleton for MFE state sharing  │
│  No OIDC library in browser                         │
├─────────────────────────────────────────────────────┤
│  LAYER 3: BFF ↔ Microservices                      │
│  Bearer token injection at BFF proxy layer          │
│  RFC 8693 Token Exchange for downstream services    │
│  Per-MFE audience-restricted tokens                 │
├─────────────────────────────────────────────────────┤
│  LAYER 4: IdP Federation                           │
│  Keycloak / Entra ID / Auth0 as SSO anchor          │
│  Cross-domain auth via IdP session (1st-party)      │
│  SCIM for user provisioning across services         │
└─────────────────────────────────────────────────────┘
```

This stack provides defense-in-depth: even if one layer is compromised, the remaining layers contain the blast radius.

---

## 10. Key Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| XSS in any MFE exfiltrates tokens | Token theft, account takeover | BFF pattern (tokens never in browser) + strict CSP |
| Third-party cookie deprecation breaks SSO | Silent auth fails, user re-prompted | Refresh token rotation, BFF cookies (1st-party only) |
| Module Federation version mismatch | Duplicate auth instances, split sessions | `singleton: true` + `strictVersion: true` in webpack config |
| `postMessage` origin spoofing | Token interception | Always validate `event.origin`, never use `'*'` targetOrigin |
| Keycloak + Native Federation DI conflict | Auth service unavailable in remote MFEs | AuthFacadeService pattern, exclude Keycloak libs from federation |
| Azure AD B2C end-of-life (May 2030) | Service discontinuation | Migrate to Entra External ID (code unchanged, authority URL changes) |
| Compromised MFE in shared shell | Lateral movement to other MFEs | Per-MFE audience-restricted tokens, CSP isolation, SRI on remotes |

---

## 11. References

### Standards and Specifications

- **IETF**: draft-oauth-browser-based-apps — https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps
- **RFC 8693**: OAuth 2.0 Token Exchange — https://www.rfc-editor.org/info/rfc8693
- **NIST SP 800-207**: Zero Trust Architecture — https://nvlpubs.nist.gov/nistpubs/specialpublications/NIST.SP.800-207.pdf
- **NIST SP 800-63-4**: Digital Identity Guidelines — https://pages.nist.gov/800-63-4/

### Security Guidance

- **OWASP Session Management Cheat Sheet** — https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- **OWASP HTML5 Security Cheat Sheet** — https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html
- **MSRC postMessage CVE Advisory (August 2025)** — https://www.microsoft.com/en-us/msrc/blog/2025/08/postmessaged-and-compromised

### Tools and Libraries

- **Duende BFF** — https://docs.duendesoftware.com/bff
- **angular-oauth2-oidc** — https://github.com/manfredsteyer/angular-oauth2-oidc
- **angular-auth-oidc-client** — https://github.com/damienbod/angular-auth-oidc-client
- **@angular-architects/module-federation** — https://github.com/angular-architects/module-federation-plugin

### Enterprise Case Studies

- Spotify, IKEA, SAP — Microfrontend auth patterns at scale (various conference talks and blog posts)

---

*Report generated from research conducted via parallel analysis of IETF specifications, OWASP/NIST guidelines, Angular library documentation, and enterprise implementation patterns.*
