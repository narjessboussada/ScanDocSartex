import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface NavItem { label: string; icon: string; link: string; exact?: boolean; }
interface Session { email?: string; name?: string; role?: string; }

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatTooltipModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent {
  private router = inject(Router);

  // Facultatifs : s'ils ne sont pas fournis, l'utilisateur est lu depuis la session (token JWT)
  @Input() userName = '';
  @Input() role = '';
  @Output() logout = new EventEmitter<void>();

  // ⚠ Adapte les routes à celles de ton app.routes.ts
  readonly historyLink = '/scans';
  readonly newScanLink = '/scans/upload';

  readonly nav: NavItem[] = [
    { label: 'Historique',   icon: 'history',          link: this.historyLink },
    { label: 'Nouveau scan', icon: 'document_scanner', link: this.newScanLink, exact: true },
  ];

  collapsed = localStorage.getItem('navbar:collapsed') === '1';
  private session: Session = this.readSession();

  toggle() {
    this.collapsed = !this.collapsed;
    try { localStorage.setItem('navbar:collapsed', this.collapsed ? '1' : '0'); } catch {}
  }

  /** Historique reste actif sur le détail d'un scan (/scans/139), mais pas sur « Nouveau scan » */
  isActive(item: NavItem): boolean {
    const url = this.router.url.split('?')[0];
    if (item.exact) return url === item.link;
    return url.startsWith(item.link) && !url.startsWith(this.newScanLink);
  }

  // ── Utilisateur connecté ─────────────────────────────────

  get email(): string {
    return this.session.email || (this.userName.includes('@') ? this.userName : '');
  }

  /** Nom affiché : nom complet s'il existe, sinon dérivé de l'email (narjess.boussada@… → Narjess Boussada) */
  get displayName(): string {
    const explicit = this.userName && !this.userName.includes('@') ? this.userName : this.session.name;
    if (explicit) return explicit;
    const mail = this.email;
    if (!mail) return 'Utilisateur';
    return mail.split('@')[0].split(/[\s._-]+/).filter(Boolean)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }

  get initials(): string {
    const words = this.displayName.split(/\s+/).filter(Boolean);
    return ((words[0]?.[0] || '?') + (words[1]?.[0] || '')).toUpperCase();
  }

  get roleLabel(): string {
    return (this.role || this.session.role) === 'admin' ? 'Administrateur' : 'Opérateur';
  }

  /** Lit email / nom / rôle dans le token JWT ou l'objet utilisateur stocké par le navigateur */
  private readSession(): Session {
    const out: Session = {};
    const take = (o: any) => {
      if (!o || typeof o !== 'object') return;
      out.email ??= o.email;
      out.name  ??= o.name || o.fullName || o.username || (o.prenom && o.nom ? `${o.prenom} ${o.nom}` : undefined);
      out.role  ??= o.role;
      if (o.user) take(o.user);
    };

    for (const store of [localStorage, sessionStorage]) {
      try {
        for (let i = 0; i < store.length; i++) {
          const raw = store.getItem(store.key(i) as string) || '';
          if (/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(raw)) take(this.decodeJwt(raw));
          else if (raw.startsWith('{')) { try { take(JSON.parse(raw)); } catch {} }
        }
      } catch {}
    }
    return out;
  }

  private decodeJwt(token: string): any {
    try {
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
    } catch { return null; }
  }
}