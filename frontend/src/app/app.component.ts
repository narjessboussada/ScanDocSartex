import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NavbarComponent],
  template: `
    <!-- Affiche la navbar sur toutes les pages sauf /login -->
    <app-navbar *ngIf="showNavbar" />
    <main [class.with-navbar]="showNavbar">
      <router-outlet />
    </main>
  `,
  styles: [`
    main { padding: 0; }
    main.with-navbar { padding-top: 0; }
  `],
})
export class AppComponent {
  private router = inject(Router);
  showNavbar = false;

  constructor() {
    // Écoute chaque changement de route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Cache la navbar sur la page login
      this.showNavbar = !event.url.includes('/login');
    });
  }
}