import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Redirige / vers /login
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Page login — accessible sans être connecté
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component')
        .then(m => m.LoginComponent),
  },

  // Page liste des scans — protégée par authGuard
  {
    path: 'scans',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/scan/scan-list/scan-list.component')
        .then(m => m.ScanListComponent),
  },

  // Page détail d'un scan — :id = paramètre dynamique (ex: /scans/42)
  {
    path: 'scans/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/scan/scan-detail/scan-detail.component')
        .then(m => m.ScanDetailComponent),
  },

  // Page upload/scan d'un document
  {
    path: 'upload',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/scan/scan-upload/scan-upload.component')
        .then(m => m.ScanUploadComponent),
  },

  // Toute URL inconnue → redirige vers /scans
  { path: '**', redirectTo: '/scans' },
];