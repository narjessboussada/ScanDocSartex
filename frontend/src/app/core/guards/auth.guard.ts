import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token =
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
      ? window.localStorage.getItem('token')
      : null;

  if (token) return true; // connecté → accès autorisé

  if (typeof window !== 'undefined') {
    router.navigate(['/login']); // pas connecté → redirige
  }
  return false;
};