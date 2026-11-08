import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ADMIN_ROWS, WEEK, moneyShort } from '../../core/data';

type ModeFilter = 'all' | 'presentiel' | 'remote';
type StatusFilter = 'all' | 'Payé' | 'En attente' | 'Annulé';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin.component.html',
})
export class AdminComponent {
  readonly money = moneyShort;

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

  readonly navItems = ['Réservations', 'Calendrier', 'Packages et promos', 'Paiements', 'Clients', 'Paramètres'];

  readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    return ADMIN_ROWS.filter(
      (r) =>
        (this.mode() === 'all' || (this.mode() === 'remote' ? r.remote : !r.remote)) &&
        (this.status() === 'all' || r.status === this.status()) &&
        (q === '' || r.biz.toLowerCase().includes(q) || r.person.toLowerCase().includes(q)),
    );
  });

  private readonly active = ADMIN_ROWS.filter((r) => r.status !== 'Annulé');
  readonly statCount = this.active.length;
  readonly statPaid = ADMIN_ROWS.filter((r) => r.status === 'Payé').reduce((a, r) => a + r.amount, 0);
  readonly statPending = ADMIN_ROWS.filter((r) => r.status === 'En attente').reduce((a, r) => a + r.amount, 0);
  readonly statRemote = Math.round((this.active.filter((r) => r.remote).length / this.active.length) * 100);

  readonly week = WEEK.map((d) => ({ ...d, pct: Math.round((d.count / 6) * 100) }));

  readonly pkgs = [
    { name: 'Standard', note: 'Live de 1h30 + replay', price: '15 000 F' },
    { name: 'Boost', note: 'Annonce sur les réseaux OCD', price: '20 000 F' },
    { name: 'Premium', note: 'Annonce par Bovan', price: '45 000 F' },
    { name: 'Offre de lancement', note: 'Active · −20 % sur tous les packages', price: '−20 %' },
  ];

  chipClass(status: string): string {
    return status === 'Payé' ? 'chip chip--paid' : status === 'En attente' ? 'chip chip--pending' : 'chip chip--cancelled';
  }
}
