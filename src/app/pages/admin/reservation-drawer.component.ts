import { Component, inject, input, output, signal } from '@angular/core';
import { AdminApi, AdminRow, Status } from '../../core/admin-api.service';
import { moneyShort } from '../../core/data';

@Component({
  selector: 'app-reservation-drawer',
  standalone: true,
  template: `
<div class="a-overlay" (click)="closed.emit()"></div>
<aside class="a-drawer" role="dialog" aria-label="Détail de la réservation">
  <header class="a-drawer-head">
    <div>
      <p class="a-ref">{{ r().ref }}</p>
      <h2 class="a-drawer-title">{{ r().biz }}</h2>
    </div>
    <button type="button" class="a-x" (click)="closed.emit()" aria-label="Fermer">✕</button>
  </header>

  <div class="a-drawer-body">
    <section>
      <p class="a-label">Statut du paiement</p>
      <div class="a-seg">
        @for (s of statuses; track s) {
          <button type="button" [class.on]="r().status === s" [class.paid]="s === 'Payé'" [class.cancel]="s === 'Annulé'" [disabled]="busy()" (click)="set(s)">{{ s }}</button>
        }
      </div>
    </section>

    <section class="a-kv">
      <div><span>Live</span><b>{{ r().when }}</b></div>
      <div><span>Lieu</span><b>{{ r().place }}</b></div>
      <div><span>Offre</span><b>{{ r().pkg }}</b></div>
      <div><span>Produit présenté</span><b>{{ r().product }}</b></div>
    </section>

    <section class="a-kv">
      <div><span>Contact</span><b>{{ r().person }}</b></div>
      <div><span>Téléphone</span><b>{{ r().phone }}</b></div>
      <div><span>Email</span><b class="a-break">{{ r().email }}</b></div>
    </section>

    <section class="a-kv">
      <div><span>Moyen de paiement</span><b>{{ r().method }}</b></div>
      @if (r().discount) {
        <div><span>Prix de l'offre</span><b>{{ money(r().base_amount) }}</b></div>
        <div><span>Réduction</span><b>− {{ money(r().discount) }}</b></div>
      }
      <div><span>Total</span><b class="a-big">{{ money(r().amount) }}</b></div>
      <div><span>Réservé le</span><b>{{ r().created }}</b></div>
    </section>
  </div>

  <footer class="a-drawer-foot">
    <a class="btn btn-ink btn-sm" [href]="wa()" target="_blank" rel="noopener">WhatsApp</a>
    <a class="btn btn-outline btn-sm" [href]="'mailto:' + r().email">Écrire un email</a>
    @if (r().status === 'Payé') {
      <button type="button" class="btn btn-accent btn-sm" (click)="receipt()">Télécharger le reçu</button>
    }
  </footer>
</aside>`,
})
export class ReservationDrawerComponent {
  private readonly api = inject(AdminApi);
  readonly r = input.required<AdminRow>();
  readonly closed = output<void>();
  readonly changed = output<AdminRow>();

  readonly money = moneyShort;
  readonly statuses: Status[] = ['Payé', 'En attente', 'Annulé'];
  readonly busy = signal(false);

  wa(): string {
    return 'https://wa.me/' + this.r().phone.replace(/\D/g, '');
  }

  set(s: Status): void {
    if (s === this.r().status) return;
    this.busy.set(true);
    this.api.setStatus(this.r().id, s).subscribe({
      next: (row) => { this.busy.set(false); this.changed.emit(row); this.api.notify(`Statut : ${s}`); },
      error: (e) => { this.busy.set(false); this.api.notify(AdminApi.msg(e), true); },
    });
  }

  receipt(): void {
    this.api.receipt(this.r().id).subscribe({
      next: (b) => this.api.save(b, `recu-${this.r().ref}.pdf`),
      error: (e) => this.api.notify(AdminApi.msg(e), true),
    });
  }
}
