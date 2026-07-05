import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Récupère le token stocké après le login
  const token =
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
      ? window.localStorage.getItem('token')
      : null;

  if (token) {
    // Clone la requête et ajoute le header Authorization
    // (on clone car les requêtes HTTP sont immutables)
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(authReq); // envoie la requête modifiée
  }

  return next(req); // pas de token → envoie la requête normale
};