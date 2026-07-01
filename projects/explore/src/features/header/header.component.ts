import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
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
import { NavigationComponent } from '../../shared/components/navigation/navigation';
import { ResourceService } from '../../shared/utils/resource.service';
import { LOADER } from '../../core/remote-loader';

const ANONYMOUS_AUTH: AuthStateSnapshot = {
  isAuthenticated: false,
  user: null,
};

@Component({
  selector: 'app-header',
  imports: [NavigationComponent, NavigateToDirective],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class HeaderComponent {
  private readonly image = inject(ResourceService);
  readonly logoUrl = this.image.cdnUrl('/cdn/img/logo.svg');
  private readonly loader = inject(LOADER);
  private readonly authSnapshot = signal<AuthStateSnapshot>(ANONYMOUS_AUTH);

  readonly isAuthenticated = computed(() => this.authSnapshot().isAuthenticated);
  readonly authStatus = computed(() =>
    this.isAuthenticated() ? 'Authenticated' : 'Anonymous',
  );
  readonly displayName = computed(
    () => this.authSnapshot().user?.displayName ?? null,
  );

  constructor() {
    void this.loader('@tractor-store/checkout', 'mfe-mini-cart');
    const off = authState.on((snapshot) => this.authSnapshot.set(snapshot));
    inject(DestroyRef).onDestroy(off);
  }

  login(): void {
    authLoginRequest.emit({ source: '@tractor-store/explore/header' });
  }

  logout(): void {
    authLogoutRequest.emit({ source: '@tractor-store/explore/header' });
  }
}
