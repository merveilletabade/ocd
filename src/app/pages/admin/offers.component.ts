import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, AdminPkg, PkgInput } from '../../core/admin-api.service';
import { durationLabel, moneyShort } from '../../core/data';

const blank = (): PkgInput => ({
  name: '', price: 15000, tagline: '', features: [], badge: false, active: true, slots: 1, vip: false, promo_percent: 0, promo_until: null,
});

@Component({
  selector: 'app-admin-offers',
  standalone: true,
  imports: [FormsModule],
  template: `
<div class="a-head">
  <div>
    <h1 class="a-title">Packages et promos</h1>
    <p class="a-sub">Modifie les prix et le contenu des offres, et active une promo sur celle que tu veux.</p>
  </div>
  <button type="button" class="btn btn-accent btn-sm" (click)="create()">+ Nouvelle offre</button>
</div>

@if (error(); as e) { <p class="alert" role="alert">{{ e }}</p> }

<div class="a-offers">
  @for (p of list(); track p.id) {
    <article class="a-offer" [class.off]="!p.active">
      <div class="a-offer-top">
        <div>
          <h2>{{ p.name }}</h2>
          <p class="small muted">{{ dur(p.slots) }}{{ p.vip ? ' · VIP' : '' }}</p>
        </div>
        <label class="a-switch" [title]="p.active ? 'Visible sur le site' : 'Masquée du site'">
          <input type="checkbox" [checked]="p.active" (change)="toggleActive(p)" aria-label="Offre visible">
          <span></span>
        </label>
      </div>
      <p class="a-offer-price">
        @if (p.promo_live) {
          <s>{{ money(p.price) }}</s> {{ money(final(p)) }}
        } @else {
          {{ money(p.price) }}
        }
      </p>
      <p class="a-offer-tag">{{ p.tagline }}</p>
      <div class="a-offer-badges">
        @if (!p.active) { <span class="a-pill cancel">Masquée</span> }
        @if (p.badge) { <span class="a-pill">Populaire</span> }
        @if (p.promo_live) { <span class="a-pill paid">Promo −{{ p.promo_percent }} %</span> }
        @else if (p.promo_percent) { <span class="a-pill cancel">Promo terminée</span> }
        <span class="a-pill muted-pill">{{ p.reservations }} réservation{{ p.reservations > 1 ? 's' : '' }}</span>
      </div>
      <div class="a-offer-actions">
        <button type="button" class="btn btn-ink btn-sm" (click)="edit(p)">Modifier</button>
        <button type="button" class="btn btn-outline btn-sm" (click)="quickPromo(p)">{{ p.promo_live ? 'Arrêter la promo' : 'Activer une promo' }}</button>
      </div>
    </article>
  } @empty {
    <p class="a-empty">Aucune offre.</p>
  }
</div>

@if (form(); as f) {
  <div class="a-overlay" (click)="close()"></div>
  <aside class="a-drawer" role="dialog" aria-label="Modifier l'offre">
    <header class="a-drawer-head">
      <h2 class="a-drawer-title">{{ editing() ? 'Modifier ' + editing()!.name : 'Nouvelle offre' }}</h2>
      <button type="button" class="a-x" (click)="close()" aria-label="Fermer">✕</button>
    </header>
    <div class="a-drawer-body a-form">
      @if (formError(); as e) { <p class="alert" role="alert">{{ e }}</p> }

      <div class="a-f"><label for="o-name">Nom de l'offre</label><input id="o-name" class="a-input" [(ngModel)]="f.name"></div>
      <div class="a-f2">
        <div class="a-f"><label for="o-price">Prix (F CFA)</label><input id="o-price" type="number" min="0" step="500" class="a-input" [(ngModel)]="f.price"></div>
        <div class="a-f"><label for="o-slots">Durée du live</label>
          <select id="o-slots" class="a-input" [(ngModel)]="f.slots">
            @for (n of [1, 2, 3]; track n) { <option [ngValue]="n">{{ dur(n) }}</option> }
          </select>
        </div>
      </div>
      <div class="a-f"><label for="o-tag">Phrase d'accroche</label><input id="o-tag" class="a-input" [(ngModel)]="f.tagline"></div>
      <div class="a-f">
        <label for="o-feat">Ce qui est inclus <small class="muted">(une ligne par avantage)</small></label>
        <textarea id="o-feat" rows="6" class="a-input" [ngModel]="featuresText()" (ngModelChange)="featuresText.set($event)"></textarea>
      </div>

      <div class="a-box">
        <p class="a-label">Promotion</p>
        <div class="a-f2">
          <div class="a-f"><label for="o-promo">Réduction (%)</label><input id="o-promo" type="number" min="0" max="90" class="a-input" [(ngModel)]="f.promo_percent"></div>
          <div class="a-f"><label for="o-until">Jusqu'au <small class="muted">(facultatif)</small></label><input id="o-until" type="date" class="a-input" [ngModel]="f.promo_until || ''" (ngModelChange)="f.promo_until = $event || null"></div>
        </div>
        <p class="small muted">Mets 0 pour ne pas avoir de promo. Le prix barré apparaît sur le site seulement quand une promo est active.</p>
      </div>

      <label class="a-check"><input type="checkbox" [(ngModel)]="f.badge"> Afficher « Populaire » sur cette offre</label>
      <label class="a-check"><input type="checkbox" [(ngModel)]="f.vip"> Offre VIP</label>
      <label class="a-check"><input type="checkbox" [(ngModel)]="f.active"> Visible sur le site</label>
    </div>
    <footer class="a-drawer-foot">
      <button type="button" class="btn btn-accent btn-sm" (click)="save()" [disabled]="saving()">{{ saving() ? 'Enregistrement…' : 'Enregistrer' }}</button>
      <button type="button" class="btn btn-outline btn-sm" (click)="close()">Annuler</button>
      @if (editing(); as e) {
        <button type="button" class="a-link danger" (click)="remove(e)">Supprimer</button>
      }
    </footer>
  </aside>
}`,
})
export class AdminOffersComponent implements OnInit {
  private readonly api = inject(AdminApi);
  readonly money = moneyShort;
  readonly dur = durationLabel;

  readonly list = signal<AdminPkg[]>([]);
  readonly error = signal<string | null>(null);
  readonly editing = signal<AdminPkg | null>(null);
  readonly form = signal<PkgInput | null>(null);
  readonly featuresText = signal('');
  readonly formError = signal<string | null>(null);
  readonly saving = signal(false);

  final = (p: AdminPkg) => Math.round(p.price * (100 - p.promo_percent) / 100);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.packages().subscribe({
      next: (l) => this.list.set(l),
      error: (e) => this.error.set(AdminApi.msg(e, 'Impossible de charger les offres.')),
    });
  }

  private input(p: AdminPkg): PkgInput {
    const { id, promo_live, reservations, ...rest } = p;
    return { ...rest, features: [...p.features] };
  }

  create(): void {
    this.editing.set(null); this.form.set(blank()); this.featuresText.set(''); this.formError.set(null);
  }
  edit(p: AdminPkg): void {
    this.editing.set(p); this.form.set(this.input(p)); this.featuresText.set(p.features.join('\n')); this.formError.set(null);
  }
  close(): void { this.form.set(null); this.editing.set(null); }

  save(): void {
    const f = this.form();
    if (!f) return;
    if (f.name.trim().length < 2) { this.formError.set('Donne un nom à l\'offre.'); return; }
    const body: PkgInput = {
      ...f,
      price: Number(f.price) || 0,
      promo_percent: Number(f.promo_percent) || 0,
      features: this.featuresText().split('\n').map((x) => x.trim()).filter(Boolean),
      vip: f.vip || f.slots > 1,
    };
    this.saving.set(true);
    const e = this.editing();
    (e ? this.api.updatePackage(e.id, body) : this.api.createPackage(body)).subscribe({
      next: () => { this.saving.set(false); this.close(); this.load(); this.api.notify('Offre enregistrée'); },
      error: (err) => { this.saving.set(false); this.formError.set(AdminApi.msg(err)); },
    });
  }

  toggleActive(p: AdminPkg): void {
    this.api.updatePackage(p.id, { ...this.input(p), active: !p.active }).subscribe({
      next: () => { this.load(); this.api.notify(p.active ? 'Offre masquée du site' : 'Offre visible sur le site'); },
      error: (e) => { this.load(); this.api.notify(AdminApi.msg(e), true); },
    });
  }

  /** Raccourci : arrête la promo, ou ouvre le formulaire pour en définir une. */
  quickPromo(p: AdminPkg): void {
    if (!p.promo_live) {
      this.edit(p);
      if (!p.promo_percent) this.form.update((f) => (f ? { ...f, promo_percent: 10 } : f));
      return;
    }
    this.api.updatePackage(p.id, { ...this.input(p), promo_percent: 0, promo_until: null }).subscribe({
      next: () => { this.load(); this.api.notify('Promo arrêtée'); },
      error: (e) => this.api.notify(AdminApi.msg(e), true),
    });
  }

  remove(p: AdminPkg): void {
    if (!confirm(`Supprimer l'offre « ${p.name} » ?`)) return;
    this.api.deletePackage(p.id).subscribe({
      next: () => { this.close(); this.load(); this.api.notify('Offre supprimée'); },
      error: (e) => this.formError.set(AdminApi.msg(e)),
    });
  }
}
