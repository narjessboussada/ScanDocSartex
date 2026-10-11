import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },

  {
    path: 'scans',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/scan/scan-list/scan-list.component').then(m => m.ScanListComponent),
  },

  // Doit rester AVANT 'scans/:id'
  {
    path: 'scans/upload',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/scan/scan-upload/scan-upload.component').then(m => m.ScanUploadComponent),
  },

  {
    path: 'scans/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/scan/scan-detail/scan-detail.component').then(m => m.ScanDetailComponent),
  },

  // Ancienne adresse conservée : ton code qui navigue vers /upload continue de marcher
  { path: 'upload', redirectTo: '/scans/upload', pathMatch: 'full' },

  { path: '**', redirectTo: '/scans' },
];