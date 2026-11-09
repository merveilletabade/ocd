import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminApi } from '../../core/admin-api.service';
import { AuthService } from '../../core/auth.service';

interface NavItem { path: string; label: string; icon: string; exact?: boolean }

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
@if (!auth.isLoggedIn()) {
  <div class="login">
    <form class="login-card" (ngSubmit)="login()">
      <img class="logo" src="assets/logo.png" alt="OCD">
      <h1 class="page-title page-title--sm">Espace administration</h1>
      <p class="muted">Connecte-toi pour gérer les réservations.</p>
      @if (loginError(); as msg) { <p class="alert" role="alert">{{ msg }}</p> }
      <div class="field">
        <label for="login-email">Email</label>
        <input id="login-email" name="email" type="email" autocomplete="username" placeholder="ocd@gmail.com" [ngModel]="email()" (ngModelChange)="email.set($event)">
      </div>
      <div class="field">
        <label for="login-pwd">Mot de passe</label>
        <input id="login-pwd" name="password" type="password" autocomplete="current-password" [ngModel]="password()" (ngModelChange)="password.set($event)">
      </div>
      <button type="submit" class="btn btn-accent" [disabled]="loggingIn() || !email() || !password()">{{ loggingIn() ? 'Connexion...' : 'Se connecter' }}</button>
      <a routerLink="/" class="login-back">Retour au site</a>
    </form>
  </div>
} @else {
  <div class="a-shell">
    <aside class="a-side" [class.open]="menu()">
      <div class="a-brand">
        <a routerLink="/" class="a-logo" aria-label="Retour au site"><img src="assets/logo.png" alt="OCD"></a>
        <span class="a-brand-tag">Admin</span>
      </div>
      <nav class="a-nav" (click)="menu.set(false)">
        @for (n of nav; track n.path) {
          <a class="a-nav-item" [routerLink]="n.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!n.exact }">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="n.icon"/></svg>
            <span>{{ n.label }}</span>
          </a>
        }
      </nav>
      <div class="a-side-foot">
        <p class="a-user">{{ auth.email() }}</p>
        <a routerLink="/" class="a-nav-item a-nav-item--ghost">Voir le site</a>
        <button type="button" class="a-nav-item a-nav-item--ghost" (click)="auth.logout()">Se déconnecter</button>
      </div>
    </aside>

    <div class="a-body">
      <header class="a-mobilebar">
        <button type="button" class="a-burger" (click)="menu.set(!menu())" aria-label="Menu">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
        <img src="assets/logo.png" alt="OCD" height="32">
      </header>
      <main class="a-main"><router-outlet /></main>
    </div>

    @if (api.toast(); as t) {
      <div class="a-toast" [class.err]="t.error" role="status">{{ t.text }}</div>
    }
  </div>
}`,
})
export class AdminShellComponent {
  readonly auth = inject(AuthService);
  readonly api = inject(AdminApi);

  readonly menu = signal(false);
  readonly email = signal('');
  readonly password = signal('');
  readonly loginError = signal<string | null>(null);
  readonly loggingIn = signal(false);

  readonly nav: NavItem[] = [
    { path: '/admin', label: 'Réservations', exact: true, icon: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01' },
    { path: '/admin/calendrier', label: 'Calendrier', icon: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z' },
    { path: '/admin/offres', label: 'Packages et promos', icon: 'M20 12l-8 8-9-9V4h7l10 8zM8 8h.01' },
    { path: '/admin/paiements', label: 'Paiements', icon: 'M3 7h18v12H3zM3 11h18M7 15h3' },
    { path: '/admin/clients', label: 'Clients', icon: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-1a4 4 0 0 0-3-3.9M16 4.2a3.5 3.5 0 0 1 0 6.6' },
    { path: '/admin/parametres', label: 'Paramètres', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z' },
  ];

  login(): void {
    this.loginError.set(null);
    this.loggingIn.set(true);
    this.auth.login(this.email().trim(), this.password()).subscribe({
      next: () => { this.loggingIn.set(false); this.password.set(''); },
      error: (e) => {
        this.loggingIn.set(false);
        this.loginError.set(e.status === 401 ? 'Email ou mot de passe incorrect.' : AdminApi.msg(e, 'Connexion impossible.'));
      },
    });
  }
}
