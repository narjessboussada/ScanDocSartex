import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NavbarComponent, ConfirmDialogComponent],
  template: `
    <div class="app-layout">
      <app-navbar *ngIf="showNavbar" (logout)="confirmLogout = true" />
      <main class="app-main">
        <router-outlet />
      </main>
    </div>

    <app-confirm-dialog
      [open]="confirmLogout"
      icon="logout"
      title="Se déconnecter ?"
      message="Vous allez être redirigé vers la page de connexion. Les modifications déjà enregistrées sont conservées."
      confirmLabel="Se déconnecter"
      (confirmed)="logout()"
      (cancelled)="confirmLogout = false" />
  `,
  styles: [`
    .app-layout { display: flex; min-height: 100vh; background: #F8FAFC; }
    .app-main   { flex: 1; min-width: 0; min-height: 100vh; background: #F8FAFC; }
  `],
})
export class AppComponent {
  private router = inject(Router);
  showNavbar = false;
  confirmLogout = false;

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Cache la sidebar sur la page login
      this.showNavbar = !event.urlAfterRedirects.includes('/login');
    });
  }

  logout() {
    this.confirmLogout = false;
    // Remplace par ton AuthService si tu en as un : this.auth.logout()
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}