import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@ng-internal/ui';
import { MockAuthService } from './mock-auth.service';

const FALLBACK_URL = '/explore';

function normalizeReturnUrl(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return FALLBACK_URL;
  }

  return value.startsWith('/login') ? FALLBACK_URL : value;
}

@Component({
  selector: 'app-login-page',
  imports: [ButtonComponent, ReactiveFormsModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  host: { 'data-boundary-page': 'host' },
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(MockAuthService);

  readonly returnUrl = computed(() =>
    normalizeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
  );

  readonly form = this.fb.nonNullable.group({
    email: ['jordan@example.com', [Validators.required, Validators.email]],
    password: ['tractor-store', Validators.required],
  });

  readonly canSubmit = computed(() => this.form.valid);

  constructor() {
    if (this.auth.canAccessProtectedRoute()) {
      queueMicrotask(() => {
        void this.router.navigateByUrl(this.returnUrl());
      });
    }
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.canSubmit()) return;

    this.auth.login('@tractor-store/host/login');
    void this.router.navigateByUrl(this.returnUrl());
  }
}
