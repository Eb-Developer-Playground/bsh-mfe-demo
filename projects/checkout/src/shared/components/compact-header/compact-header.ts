import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  authLoginRequest,
  authLogoutRequest,
  authState,
  type AuthStateSnapshot,
} from '@ng-internal/event-bus';
import { NavigateToDirective } from '@ng-internal/navigation';
import { ResourceService } from '../../utils/resource.service';

const ANONYMOUS_AUTH: AuthStateSnapshot = {
  isAuthenticated: false,
  user: null,
};

@Component({
  selector: 'app-compact-header',
  imports: [NavigateToDirective],
  template: `
    <div class="c_CompactHeader__inner">
      <a class="c_CompactHeader__link" [appNavigateTo]="'explore.home'">
        <img
          class="c_CompactHeader__logo"
          [src]="logoUrl"
          alt="Micro Frontends - Tractor Store"
        />
      </a>
      <div class="c_CompactHeader__auth">
        <div class="c_CompactHeader__authSummary">
          <span class="c_CompactHeader__authBadge" [class.c_CompactHeader__authBadge--active]="isAuthenticated()">
            {{ authStatus() }}
          </span>
          @if (isAuthenticated()) {
            <span class="c_CompactHeader__authLabel">{{ displayName() }}</span>
          } @else {
            <span class="c_CompactHeader__authLabel">Guest session active</span>
          }
        </div>
        <div class="c_CompactHeader__authActions">
          <button class="c_CompactHeader__authButton" type="button" (click)="login()">
            Simulate login
          </button>
          <button class="c_CompactHeader__authButton" type="button" (click)="logout()">
            Simulate logout
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './compact-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  host: { class: 'c_CompactHeader', role: 'banner' },
})
export class CompactHeaderComponent {
  private readonly image = inject(ResourceService);
  readonly logoUrl = this.image.cdnUrl('/cdn/img/logo.svg');
  private readonly authSnapshot = signal<AuthStateSnapshot>(ANONYMOUS_AUTH);

  readonly isAuthenticated = computed(() => this.authSnapshot().isAuthenticated);
  readonly authStatus = computed(() =>
    this.isAuthenticated() ? 'Authenticated' : 'Anonymous',
  );
  readonly displayName = computed(
    () => this.authSnapshot().user?.displayName ?? null,
  );

  constructor() {
    const off = authState.on((snapshot) => this.authSnapshot.set(snapshot));
    inject(DestroyRef).onDestroy(off);
  }

  login(): void {
    authLoginRequest.emit({ source: '@tractor-store/checkout/compact-header' });
  }

  logout(): void {
    authLogoutRequest.emit({ source: '@tractor-store/checkout/compact-header' });
  }
}
