import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminPkg, AdminRow, AdminStats, ApiService, Status, WeekDay } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { moneyShort } from '../../core/data';

type ModeFilter = 'all' | 'presentiel' | 'remote';
type StatusFilter = 'all' | Status;

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  readonly money = moneyShort;

  // Connexion
  readonly email = signal('');
  readonly password = signal('');
  readonly loginError = signal<string | null>(null);
  readonly loggingIn = signal(false);

  // Données venant de l'API
  readonly allRows = signal<AdminRow[]>([]);
  readonly stats = signal<AdminStats | null>(null);
  readonly week = signal<WeekDay[]>([]);
  readonly pkgs = signal<AdminPkg[]>([]);
  readonly loadError = signal<string | null>(null);

  // Filtres
  readonly mode = signal<ModeFilter>('all');
  readonly status = signal<StatusFilter>('all');
  readonly q = signal('');

  readonly modeFilters: { v: ModeFilter; label: string }[] = [
    { v: 'all', label: 'Tous les formats' },
    { v: 'presentiel', label: 'Présentiel' },
    { v: 'remote', label: 'À distance' },
  ];
  readonly statusFilters: { v: StatusFilter; label: string }[] = [
    { v: 'all', label: 'Tous les statuts' },
    { v: 'Payé', label: 'Payé' },
    { v: 'En attente', label: 'En attente' },
    { v: 'Annulé', label: 'Annulé' },
  ];
  readonly statuses: Status[] = ['Payé', 'En attente', 'Annulé'];
  readonly navItems = ['Réservations', 'Calendrier', 'Packages et promos', 'Paiements', 'Clients', 'Paramètres'];

  readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.allRows().filter(
      (r) =>
        (this.mode() === 'all' || (this.mode() === 'remote' ? r.remote : !r.remote)) &&
        (this.status() === 'all' || r.status === this.status()) &&
        (q === '' || r.biz.toLowerCase().includes(q) || r.person.toLowerCase().includes(q)),
    );
  });

  constructor() {
    // Si le jeton expire (l'intercepteur déconnecte), on vide l'écran
    effect(() => {
      if (!this.auth.isLoggedIn()) {
        this.allRows.set([]);
        this.stats.set(null);
      }
    });
  }

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) this.loadAll();
  }

  login(): void {
    if (this.loggingIn()) return;
    this.loginError.set(null);
    this.loggingIn.set(true);
    this.auth.login(this.email().trim(), this.password()).subscribe({
      next: () => {
        this.loggingIn.set(false);
        this.password.set('');
        this.loadAll();
      },
      error: (err: HttpErrorResponse) => {
        this.loggingIn.set(false);
        this.loginError.set(
          err.status === 401
            ? 'Email ou mot de passe incorrect.'
            : 'Impossible de joindre le serveur. Vérifie que le backend est lancé.',
        );
      },
    });
  }

  logout(): void {
    this.auth.logout();
  }

  loadAll(): void {
    this.loadError.set(null);
    const fail = (err: HttpErrorResponse) => {
      if (err.status !== 401) this.loadError.set('Impossible de charger les données.');
    };
    this.api.adminReservations().subscribe({ next: (r) => this.allRows.set(r), error: fail });
    this.api.adminStats().subscribe({ next: (s) => this.stats.set(s), error: fail });
    this.api.adminWeek().subscribe({ next: (w) => this.week.set(w), error: fail });
    this.api.adminPackages().subscribe({ next: (p) => this.pkgs.set(p), error: fail });
  }

  setStatus(row: AdminRow, status: Status): void {
    if (status === row.status) return;
    this.api.setStatus(row.id, status).subscribe({
      next: () => this.loadAll(),
      error: (err: HttpErrorResponse) => {
        this.loadError.set(err.status === 409 ? err.error?.detail ?? 'Créneau déjà pris.' : 'Modification impossible.');
        this.loadAll();
      },
    });
  }

  exportCsv(): void {
    this.api
      .exportCsv({
        mode: this.mode() === 'all' ? undefined : this.mode(),
        status: this.status() === 'all' ? undefined : this.status(),
        q: this.q().trim() || undefined,
      })
      .subscribe((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reservations-ocd.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  chipClass(status: string): string {
    return status === 'Payé' ? 'chip chip--paid' : status === 'En attente' ? 'chip chip--pending' : 'chip chip--cancelled';
  }
}
