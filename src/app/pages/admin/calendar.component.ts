import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi, AdminRow, DayBlock, MonthDay } from '../../core/admin-api.service';
import { API_URL } from '../../core/environment';
import { HttpClient } from '@angular/common/http';
import { ReservationDrawerComponent } from './reservation-drawer.component';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DOWS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

@Component({
  selector: 'app-admin-calendar',
  standalone: true,
  imports: [FormsModule, ReservationDrawerComponent],
  template: `
<div class="a-head">
  <div>
    <h1 class="a-title">Calendrier</h1>
    <p class="a-sub">Vois les lives du mois et bloque les créneaux où tu n'es pas disponible.</p>
  </div>
</div>

<div class="a-cal">
  <div class="a-card">
    <div class="a-cal-nav">
      <button type="button" class="a-iconbtn" (click)="shift(-1)" aria-label="Mois précédent">‹</button>
      <p class="a-cal-title">{{ monthName() }} {{ year() }}</p>
      <button type="button" class="a-iconbtn" (click)="shift(1)" aria-label="Mois suivant">›</button>
    </div>
    <div class="a-grid">
      @for (d of dows; track d) { <span class="a-dow">{{ d.slice(0, 3) }}.</span> }
      @for (e of empty(); track $index) { <span></span> }
      @for (d of days(); track d.day) {
        <button type="button" class="a-day" [class.sel]="d.day === sel()" [class.today]="isToday(d.day)" (click)="select(d.day)">
          <span class="a-day-n">{{ d.day }}</span>
          @if (d.taken || d.blocked) {
            <span class="a-dots">
              @if (d.taken) { <i class="dot dot--live" [title]="d.lives + ' live(s)'"></i> }
              @if (d.blocked) { <i class="dot dot--block" title="Créneaux bloqués"></i> }
            </span>
          }
        </button>
      }
    </div>
    <div class="a-legend">
      <span><i class="dot dot--live"></i> Réservé</span>
      <span><i class="dot dot--block"></i> Bloqué par toi</span>
    </div>
  </div>

  <div class="a-card a-dayside">
    <p class="a-card-title">{{ dayLabel() }}</p>
    <div class="a-field-row">
      <input class="a-input" placeholder="Motif du blocage (facultatif)" [ngModel]="note()" (ngModelChange)="note.set($event)" aria-label="Motif">
    </div>
    <div class="a-blocks">
      @for (b of blocks(); track b.index) {
        @if (b.state === 'free') {
          <div class="a-block free">
            <div><b>{{ b.time }}</b><small>Libre</small></div>
            <button type="button" class="a-link" (click)="block(b.index)">Bloquer</button>
          </div>
        } @else if (b.state === 'blocked') {
          <div class="a-block blocked">
            <div><b>{{ b.time }}</b><small>Bloqué{{ b.note ? ' · ' + b.note : '' }}</small></div>
            <button type="button" class="a-link" (click)="unblock(b.index)">Débloquer</button>
          </div>
        } @else {
          <button type="button" class="a-block booked" (click)="open.set(b.reservation)">
            <div><b>{{ b.time }}</b><small>{{ b.reservation?.biz }} · {{ b.reservation?.pkg }}</small></div>
            <span class="a-pill" [class.paid]="b.reservation?.status === 'Payé'" [class.pending]="b.reservation?.status === 'En attente'">{{ b.reservation?.status }}</span>
          </button>
        }
      }
    </div>
    <div class="a-dayactions">
      <button type="button" class="btn btn-outline btn-sm" (click)="blockDay()" [disabled]="!hasFree()">Bloquer la journée</button>
      <button type="button" class="btn btn-outline btn-sm" (click)="unblockDay()" [disabled]="!hasBlocked()">Tout débloquer</button>
    </div>
  </div>
</div>

@if (open(); as r) {
  <app-reservation-drawer [r]="r" (closed)="open.set(null)" (changed)="updated($event)" />
}`,
})
export class AdminCalendarComponent implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly http = inject(HttpClient);

  readonly dows = DOWS;
  readonly year = signal(2026);
  readonly month = signal(12);
  readonly sel = signal(1);
  readonly days = signal<MonthDay[]>([]);
  readonly blocks = signal<DayBlock[]>([]);
  readonly note = signal('');
  readonly open = signal<AdminRow | null>(null);

  readonly monthName = computed(() => MONTHS[this.month() - 1]);
  readonly empty = computed(() => Array.from({ length: (new Date(this.year(), this.month() - 1, 1).getDay() + 6) % 7 }));
  readonly date = computed(() => iso(this.year(), this.month(), this.sel()));
  readonly dayLabel = computed(() => {
    const d = new Date(this.year(), this.month() - 1, this.sel());
    const s = `${DOWS[(d.getDay() + 6) % 7]} ${this.sel()} ${this.monthName()}`;
    return s.charAt(0).toUpperCase() + s.slice(1);
  });
  readonly hasFree = computed(() => this.blocks().some((b) => b.state === 'free'));
  readonly hasBlocked = computed(() => this.blocks().some((b) => b.state === 'blocked'));

  ngOnInit(): void {
    // On ouvre le mois du lancement (ou le mois en cours s'il est déjà passé)
    this.http.get<{ live_start_date: string }>(`${API_URL}/config`).subscribe({
      next: (c) => {
        const start = new Date(c.live_start_date + 'T00:00:00');
        const now = new Date();
        const from = start > now ? start : now;
        this.year.set(from.getFullYear()); this.month.set(from.getMonth() + 1); this.sel.set(from.getDate());
        this.loadMonth(); this.loadDay();
      },
      error: () => { this.loadMonth(); this.loadDay(); },
    });
  }

  isToday(d: number): boolean {
    const n = new Date();
    return n.getFullYear() === this.year() && n.getMonth() + 1 === this.month() && n.getDate() === d;
  }

  shift(delta: number): void {
    let m = this.month() + delta, y = this.year();
    if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
    this.year.set(y); this.month.set(m); this.sel.set(1);
    this.loadMonth(); this.loadDay();
  }

  select(d: number): void { this.sel.set(d); this.loadDay(); }

  loadMonth(): void { this.api.month(this.year(), this.month()).subscribe((d) => this.days.set(d)); }
  loadDay(): void { this.api.day(this.date()).subscribe((b) => this.blocks.set(b)); }
  refresh(): void { this.loadMonth(); this.loadDay(); }

  private run(obs: ReturnType<AdminApi['block']>, ok: string): void {
    obs.subscribe({
      next: () => { this.refresh(); this.api.notify(ok); },
      error: (e) => { this.refresh(); this.api.notify(AdminApi.msg(e), true); },
    });
  }

  block(i: number): void { this.run(this.api.block(this.date(), i, this.note().trim()), 'Créneau bloqué'); }
  unblock(i: number): void { this.run(this.api.unblock(this.date(), i), 'Créneau débloqué'); }
  blockDay(): void { this.run(this.api.blockDay(this.date(), this.note().trim()), 'Journée bloquée'); }
  unblockDay(): void { this.run(this.api.unblockDay(this.date()), 'Journée débloquée'); }

  updated(row: AdminRow): void { this.open.set(row); this.refresh(); }
}
