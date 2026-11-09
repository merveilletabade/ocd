import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, ClientOut } from '../../core/admin-api.service';
import { moneyShort } from '../../core/data';

@Component({
  selector: 'app-admin-clients',
  standalone: true,
  imports: [FormsModule],
  template: `
<div class="a-head">
  <div>
    <h1 class="a-title">Clients</h1>
    <p class="a-sub">Les business qui ont réservé, regroupés par adresse email.</p>
  </div>
  <input type="search" class="a-input" placeholder="Rechercher un client…" [ngModel]="q()" (ngModelChange)="q.set($event)" aria-label="Rechercher">
</div>

@if (error(); as e) { <p class="alert" role="alert">{{ e }}</p> }

<div class="a-clients">
  @for (c of rows(); track c.email) {
    <article class="a-card a-client">
      <button type="button" class="a-client-top" (click)="toggle(c.email)" [attr.aria-expanded]="openEmail() === c.email">
        <span class="a-avatar">{{ initials(c.name) }}</span>
        <span class="a-client-main"><b>{{ c.business }}</b><small>{{ c.name }}</small></span>
        <span class="a-client-num"><b>{{ c.count }}</b><small>live{{ c.count > 1 ? 's' : '' }}</small></span>
        <span class="a-client-num"><b>{{ money(c.spent) }}</b><small>payé</small></span>
        <span class="a-caret" [class.open]="openEmail() === c.email">⌄</span>
      </button>
      @if (openEmail() === c.email) {
        <div class="a-client-body">
          <div class="a-client-contact">
            <a [href]="'tel:' + c.phone">{{ c.phone }}</a>
            <a [href]="'mailto:' + c.email">{{ c.email }}</a>
            <a [href]="'https://wa.me/' + digits(c.phone)" target="_blank" rel="noopener">WhatsApp</a>
          </div>
          @for (r of c.reservations; track r.id) {
            <div class="a-line static">
              <span><b>{{ r.when }}</b><small>{{ r.pkg }} · {{ r.ref }}</small></span>
              <span class="r"><b>{{ money(r.amount) }}</b>
                <span class="a-pill" [class.paid]="r.status === 'Payé'" [class.pending]="r.status === 'En attente'" [class.cancel]="r.status === 'Annulé'">{{ r.status }}</span>
              </span>
            </div>
          }
        </div>
      }
    </article>
  } @empty {
    <p class="a-empty a-card">{{ loading() ? 'Chargement…' : 'Aucun client pour le moment.' }}</p>
  }
</div>`,
})
export class AdminClientsComponent implements OnInit {
  private readonly api = inject(AdminApi);
  readonly money = moneyShort;
  readonly all = signal<ClientOut[]>([]);
  readonly q = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly openEmail = signal<string | null>(null);

  readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.all().filter((c) => !q || `${c.name} ${c.business} ${c.email} ${c.phone}`.toLowerCase().includes(q));
  });

  ngOnInit(): void {
    this.api.clients().subscribe({
      next: (c) => { this.all.set(c); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.error.set(AdminApi.msg(e, 'Impossible de charger les clients.')); },
    });
  }
  toggle(email: string): void { this.openEmail.update((o) => (o === email ? null : email)); }
  digits = (s: string) => s.replace(/\D/g, '');
  initials = (n: string) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}
