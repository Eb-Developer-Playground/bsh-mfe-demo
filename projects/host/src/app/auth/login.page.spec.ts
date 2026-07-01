import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { convertToParamMap, provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivatedRoute } from '@angular/router';
import { LoginPage } from './login.page';
import { MockAuthService } from './mock-auth.service';

describe('LoginPage', () => {
  const configure = (returnUrl: string | null, isAuthenticated = false) => {
    const auth = {
      canAccessProtectedRoute: vi.fn(() => isAuthenticated),
      login: vi.fn(),
    } as unknown as Pick<MockAuthService, 'canAccessProtectedRoute' | 'login'>;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        FormBuilder,
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(
                returnUrl ? { returnUrl } : {},
              ),
            },
          },
        },
        { provide: MockAuthService, useValue: auth },
      ],
    });

    return auth;
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults the return url to explore when none is provided', () => {
    configure(null);
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.returnUrl()).toBe('/explore');
  });

  it('normalizes unsafe return urls back to explore', () => {
    configure('https://evil.example/login');
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.returnUrl()).toBe('/explore');
  });

  it('logs in and navigates back to the requested url on submit', () => {
    const auth = configure('/checkout/cart');
    const router = TestBed.inject(Router);
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    fixture.componentInstance.onSubmit(new Event('submit'));

    expect(auth.login).toHaveBeenCalledWith('@tractor-store/host/login');
    expect(navigateByUrl).toHaveBeenCalledWith('/checkout/cart');
  });

  it('redirects authenticated users away from the login page', async () => {
    configure('/decide/product/CL-01', true);
    const router = TestBed.inject(Router);
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    await Promise.resolve();

    expect(navigateByUrl).toHaveBeenCalledWith('/decide/product/CL-01');
  });
});
