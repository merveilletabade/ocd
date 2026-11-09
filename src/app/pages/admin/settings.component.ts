import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, SettingsDto } from '../../core/admin-api.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
<div class="a-head">
  <div>
    <h1 class="a-title">Paramètres</h1>
    <p class="a-sub">Les réglages du site, modifiables à tout moment.</p>
  </div>
</div>

@if (s(); as f) {
  <div class="a-two">
    <div class="a-card a-form">
      <p class="a-card-title">Lives et réservations</p>
      <div class="a-f"><label for="s-start">Premier jour de live</label><input id="s-start" type="date" class="a-input" [(ngModel)]="f.live_start_date"></div>
      <div class="a-f"><label for="s-hold">Durée de blocage avant paiement (minutes)</label><input id="s-hold" type="number" min="5" class="a-input" [(ngModel)]="f.hold_minutes">
        <small class="muted">Passé ce délai sans paiement, le créneau est libéré.</small></div>
      <div class="a-f"><label for="s-cancel">Annulation gratuite jusqu'à (heures avant le live)</label><input id="s-cancel" type="number" min="0" class="a-input" [(ngModel)]="f.cancel_hours"></div>
      <p class="a-card-title a-gap">Contact affiché aux clients</p>
      <div class="a-f"><label for="s-wa">WhatsApp</label><input id="s-wa" class="a-input" placeholder="+228 90 00 00 00" [(ngModel)]="f.contact_whatsapp"></div>
      <div class="a-f"><label for="s-mail">Email</label><input id="s-mail" type="email" class="a-input" placeholder="contact@…" [(ngModel)]="f.contact_email"></div>
      <div><button type="button" class="btn btn-accent btn-sm" (click)="save()" [disabled]="saving()">{{ saving() ? 'Enregistrement…' : 'Enregistrer' }}</button></div>
    </div>

    <div class="a-stack">
      <div class="a-card a-form">
        <p class="a-card-title">Mot de passe admin</p>
        <p class="small muted">Compte : {{ f.admin_email }}</p>
        @if (pwError(); as e) { <p class="alert" role="alert">{{ e }}</p> }
        <div class="a-f"><label for="p-cur">Mot de passe actuel</label><input id="p-cur" type="password" autocomplete="current-password" class="a-input" [ngModel]="cur()" (ngModelChange)="cur.set($event)"></div>
        <div class="a-f"><label for="p-new">Nouveau mot de passe <small class="muted">(8 caractères minimum)</small></label><input id="p-new" type="password" autocomplete="new-password" class="a-input" [ngModel]="next()" (ngModelChange)="next.set($event)"></div>
        <div><button type="button" class="btn btn-ink btn-sm" (click)="changePwd()" [disabled]="!cur() || next().length < 8">Changer le mot de passe</button></div>
      </div>

      <div class="a-card">
        <p class="a-card-title">Paiement</p>
        <p class="a-kvline"><span>Mode</span>
          <span class="a-pill" [class.pending]="f.payment_simulation" [class.paid]="!f.payment_simulation">{{ f.payment_simulation ? 'Simulation' : 'Réel' }}</span></p>
        <p class="small muted">Ce mode se règle dans le fichier .env du serveur (PAYMENT_SIMULATION).</p>
      </div>
    </div>
  </div>
} @else {
  <p class="a-empty a-card">{{ error() || 'Chargement…' }}</p>
}`,
})
export class AdminSettingsComponent implements OnInit {
  private readonly api = inject(AdminApi);
  readonly s = signal<SettingsDto | null>(null);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly cur = signal('');
  readonly next = signal('');
  readonly pwError = signal<string | null>(null);

  ngOnInit(): void {
    this.api.settings().subscribe({ next: (s) => this.s.set(s), error: (e) => this.error.set(AdminApi.msg(e)) });
  }

  save(): void {
    const f = this.s();
    if (!f) return;
    this.saving.set(true);
    this.api.saveSettings({
      live_start_date: f.live_start_date, hold_minutes: Number(f.hold_minutes), contact_whatsapp: f.contact_whatsapp,
      contact_email: f.contact_email, cancel_hours: Number(f.cancel_hours),
    }).subscribe({
      next: (s) => { this.saving.set(false); this.s.set(s); this.api.notify('Paramètres enregistrés'); },
      error: (e) => { this.saving.set(false); this.api.notify(AdminApi.msg(e), true); },
    });
  }

  changePwd(): void {
    this.pwError.set(null);
    this.api.changePassword(this.cur(), this.next()).subscribe({
      next: () => { this.cur.set(''); this.next.set(''); this.api.notify('Mot de passe modifié'); },
      error: (e) => this.pwError.set(AdminApi.msg(e)),
    });
  }
}
