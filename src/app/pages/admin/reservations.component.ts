import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, AdminRow, AdminStats, Status, WeekDay } from '../../core/admin-api.service';
import { moneyShort } from '../../core/data';
import { ReservationDrawerComponent } from './reservation-drawer.component';

@Component({
  selector: 'app-admin-reservations',
  standalone: true,
  imports: [FormsModule, ReservationDrawerComponent],
  template: `
<div class="a-head">
  <div>
    <h1 class="a-title">Réservations</h1>
    <p class="a-sub">Toutes les réservations de lives, en un coup d'œil.</p>
  </div>
  <button type="button" class="btn btn-ink btn-sm" (click)="exportCsv()">Exporter en CSV</button>
</div>

@if (error(); as e) { <p class="alert" role="alert">{{ e }}</p> }

@if (stats(); as s) {
  <div class="a-stats">
    <div class="a-stat"><span>Réservations</span><b>{{ s.count }}</b><small>{{ s.upcoming }} à venir</small></div>
    <div class="a-stat a-stat--accent"><span>Encaissé</span><b>{{ money(s.paid) }}</b><small>paiements confirmés</small></div>
    <div class="a-stat"><span>En attente</span><b>{{ money(s.pending) }}</b><small>pas encore payé</small></div>
    <div class="a-stat"><span>À distance</span><b>{{ s.remote_share }} %</b><small>hors Togo</small></div>
  </div>
}

<div class="a-card a-week">
  <p class="a-card-title">7 prochains jours de live</p>
  <div class="a-bars">
    @for (d of week(); track d.label) {
      <div class="a-bar">
        <span class="a-bar-count">{{ d.count || '' }}</span>
        <div class="a-bar-fill" [style.height.%]="d.count ? max(d.pct, 8) : 3" [class.zero]="!d.count"></div>
        <span class="a-bar-label">{{ d.label }}</span>
      </div>
    }
  </div>
</div>

<div class="a-toolbar">
  <div class="a-chips">
    @for (f of statusFilters; track f.v) {
      <button type="button" class="a-chipbtn" [class.on]="status() === f.v" (click)="status.set(f.v)">
        {{ f.label }} <span>{{ countOf(f.v) }}</span>
      </button>
    }
  </div>
  <div class="a-tools">
    <select class="a-input" [ngModel]="mode()" (ngModelChange)="mode.set($event)" aria-label="Format">
      <option value="all">Tous les formats</option>
      <option value="presentiel">Présentiel</option>
      <option value="distance">À distance</option>
    </select>
    <input type="search" class="a-input" placeholder="Rechercher…" [ngModel]="q()" (ngModelChange)="q.set($event)" aria-label="Rechercher">
  </div>
</div>

<div class="a-card a-tablewrap">
  @if (loading()) {
    <p class="a-empty">Chargement…</p>
  } @else if (rows().length === 0) {
    <p class="a-empty">Aucune réservation ne correspond.</p>
  } @else {
    <table class="a-table">
      <thead><tr><th>Réf.</th><th>Business</th><th>Live</th><th>Offre</th><th class="r">Montant</th><th>Statut</th></tr></thead>
      <tbody>
        @for (r of rows(); track r.id) {
          <tr (click)="open.set(r)" tabindex="0" (keydown.enter)="open.set(r)">
            <td class="nw mono">{{ r.ref }}</td>
            <td><b>{{ r.biz }}</b><small>{{ r.person }}</small></td>
            <td><b class="nw">{{ r.when }}</b><small>{{ r.place }}</small></td>
            <td class="nw">{{ r.pkg }}</td>
            <td class="nw r"><b>{{ money(r.amount) }}</b></td>
            <td><span class="a-pill" [class.paid]="r.status === 'Payé'" [class.pending]="r.status === 'En attente'" [class.cancel]="r.status === 'Annulé'">{{ r.status }}</span></td>
          </tr>
        }
      </tbody>
    </table>
  }
</div>

@if (open(); as r) {
  <app-reservation-drawer [r]="r" (closed)="open.set(null)" (changed)="updated($event)" />
}`,
})
export class AdminReservationsComponent implements OnInit {
  private readonly api = inject(AdminApi);
  readonly money = moneyShort;

  readonly all = signal<AdminRow[]>([]);
  readonly stats = signal<AdminStats | null>(null);
  readonly week = signal<WeekDay[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly open = signal<AdminRow | null>(null);

  readonly status = signal<'all' | Status>('all');
  readonly mode = signal<'all' | 'presentiel' | 'distance'>('all');
  readonly q = signal('');

  readonly statusFilters: { v: 'all' | Status; label: string }[] = [
    { v: 'all', label: 'Toutes' }, { v: 'Payé', label: 'Payées' },
    { v: 'En attente', label: 'En attente' }, { v: 'Annulé', label: 'Annulées' },
  ];

  readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.all().filter((r) =>
      (this.status() === 'all' || r.status === this.status()) &&
      (this.mode() === 'all' || (this.mode() === 'distance') === r.remote) &&
      (!q || `${r.biz} ${r.person} ${r.ref} ${r.email}`.toLowerCase().includes(q)),
    );
  });

  max = Math.max;
  countOf = (v: 'all' | Status) => (v === 'all' ? this.all().length : this.all().filter((r) => r.status === v).length);

  ngOnInit(): void {
    this.reload();
    this.api.week().subscribe((w) => this.week.set(w));
  }

  reload(): void {
    this.api.reservations().subscribe({
      next: (r) => { this.all.set(r); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.error.set(AdminApi.msg(e, 'Impossible de charger les réservations.')); },
    });
    this.api.stats().subscribe((s) => this.stats.set(s));
  }

  updated(row: AdminRow): void {
    this.all.update((l) => l.map((r) => (r.id === row.id ? row : r)));
    this.open.set(row);
    this.api.stats().subscribe((s) => this.stats.set(s));
  }

  exportCsv(): void {
    this.api.exportCsv().subscribe({
      next: (b) => this.api.save(b, 'reservations-ocd-live.csv'),
      error: (e) => this.api.notify(AdminApi.msg(e), true),
    });
  }
}
