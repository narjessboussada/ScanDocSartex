import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn } from '@angular/common/http';

import { authInterceptor } from './auth.interceptor';
import { describe, beforeEach, it } from 'node:test';

describe('authInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) => 
    TestBed.runInInjectionContext(() => authInterceptor(req, next));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });
});

function expect<T>(actual: T) {
  return {
    toBeTruthy(): void {
      if (!actual) {
        throw new Error(`Expected value to be truthy, but received ${actual}`);
      }
    },
  };
}

