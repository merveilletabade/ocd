import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AdminApi, AdminRow, PaymentsSummary } from '../../core/admin-api.service';
import { PAYMENTS, moneyShort } from '../../core/data';
import { ReservationDrawerComponent } from './reservation-drawer.component';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [ReservationDrawerComponent],
  template: `
<div class="a-head">
  <div>
    <h1 class="a-title">Paiements</h1>
    <p class="a-sub">L'argent encaissé, ce qui attend, et par quel moyen on te paie.</p>
  </div>
</div>

<p class="a-note">Mode simulation : les paiements sont validés sans débiter personne. Branche FedaPay pour encaisser de vrais paiements.</p>

@if (s(); as p) {
  <div class="a-stats">
    <div class="a-stat a-stat--accent"><span>Encaissé</span><b>{{ money(p.paid) }}</b><small>{{ p.paid_count }} paiement{{ p.paid_count > 1 ? 's' : '' }}</small></div>
    <div class="a-stat"><span>En attente</span><b>{{ money(p.pending) }}</b><small>{{ p.pending_count }} réservation{{ p.pending_count > 1 ? 's' : '' }}</small></div>
    <div class="a-stat"><span>Panier moyen</span><b>{{ money(p.average) }}</b><small>par paiement</small></div>
    <div class="a-stat"><span>Annulées</span><b>{{ p.cancelled_count }}</b><small>créneaux libérés</small></div>
  </div>

  <div class="a-two">
    <div class="a-card">
      <p class="a-card-title">Par moyen de paiement</p>
      @for (m of p.by_method; track m.id) {
        <div class="a-method">
          @if (logo(m.id); as src) { <img [src]="src" [alt]="m.label"> } @else { <span class="a-logo-ph"></span> }
          <div class="a-method-main">
            <div class="a-method-line"><b>{{ m.label }}</b><span>{{ money(m.amount) }}</span></div>
            <div class="a-track"><div [style.width.%]="m.amount * 100 / p.paid"></div></div>
            <small class="muted">{{ m.count }} paiement{{ m.count > 1 ? 's' : '' }}</small>
          </div>
        </div>
      } @empty {
        <p class="a-empty">Aucun paiement confirmé pour l'instant.</p>
      }
    </div>

    <div class="a-card">
      <p class="a-card-title">Derniers paiements</p>
      @for (r of recent(); track r.id) {
        <button type="button" class="a-line" (click)="open.set(r)">
          <span><b>{{ r.biz }}</b><small>{{ r.method }} · {{ r.ref }}</small></span>
          <span class="r"><b>{{ money(r.amount) }}</b></span>
        </button>
      } @empty {
        <p class="a-empty">Rien à afficher.</p>
      }
    </div>
  </div>
}

@if (open(); as r) {
  <app-reservation-drawer [r]="r" (closed)="open.set(null)" (changed)="updated($event)" />
}`,
})
export class AdminPaymentsComponent implements OnInit {
  private readonly api = inject(AdminApi);
  readonly money = moneyShort;
  readonly s = signal<PaymentsSummary | null>(null);
  readonly rows = signal<AdminRow[]>([]);
  readonly open = signal<AdminRow | null>(null);
  readonly recent = computed(() =>
    this.rows().filter((r) => r.status === 'Payé').sort((a, b) => b.created.localeCompare(a.created)).slice(0, 8),
  );

  logo = (id: string) => PAYMENTS.find((m) => m.id === id)?.logo;

  ngOnInit(): void { this.load(); }
  load(): void {
    this.api.payments().subscribe((p) => this.s.set(p));
    this.api.reservations().subscribe((r) => this.rows.set(r));
  }
  updated(row: AdminRow): void { this.open.set(row); this.load(); }
}
