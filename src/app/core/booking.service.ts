import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { switchMap } from 'rxjs';
import { ApiService, SlotDto } from './api.service';
import { DOWS, Mode, PACKAGES, PAYMENTS, Pkg, TIMES, money } from './data';

const YEAR = 2026;
const MONTH = 12;

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly api = inject(ApiService);

  readonly payments = PAYMENTS;
  /** Packages : valeurs par défaut, puis remplacées par celles de l'API. */
  readonly packages = signal<Pkg[]>(PACKAGES);

  // Choix du client
  readonly mode = signal<Mode>('presentiel');
  readonly country = signal('Togo');
  readonly day = signal(1);
  readonly slot = signal<number | null>(null);
  readonly pkgId = signal('boost');
  readonly promo = signal(false);
  readonly payId = signal('tmoney');

  // Formulaire
  readonly name = signal('');
  readonly biz = signal('');
  readonly product = signal('');
  readonly phone = signal('');
  readonly email = signal('');

  // Navigation dans la réservation
  readonly step = signal(1);
  readonly done = signal(false);
  readonly paying = signal(false);
  readonly error = signal<string | null>(null);
  readonly ref = signal('');

  // Disponibilités venant de l'API
  private readonly monthFree = signal<Record<number, number>>({});
  private readonly slotsData = signal<SlotDto[]>(TIMES.map((time, index) => ({ index, time, available: true })));

  // Calendrier de décembre 2026 : le 1er est un mardi, 31 jours
  readonly leadingEmpty = 1;
  readonly cells = computed(() =>
    Array.from({ length: 31 }, (_, i) => {
      const n = i + 1;
      const free = this.monthFree()[n] ?? TIMES.length;
      return { n, full: free === 0, aria: free === 0 ? `${n} décembre, complet` : `${n} décembre, ${free} créneaux libres` };
    }),
  );

  readonly slots = computed(() => this.slotsData().map((s) => ({ time: s.time, full: !s.available })));

  readonly dayName = computed(() => {
    const name = DOWS[(this.day() + 1) % 7];
    return name.charAt(0).toUpperCase() + name.slice(1);
  });
  readonly dayTitle = computed(() => `${this.dayName()} ${this.day()} décembre`);
  readonly dateLabel = computed(() => `${this.dayName()} ${this.day()} déc. 2026`);
  readonly slotLabel = computed(() => (this.slot() === null ? 'À choisir' : TIMES[this.slot()!]));
  readonly modeLabel = computed(() =>
    this.mode() === 'presentiel' ? 'Présentiel · Lomé, Togo' : `À distance · ${this.country()}`,
  );

  // Prix (le serveur recalcule le montant officiel à la réservation)
  readonly pkg = computed(() => this.packages().find((p) => p.id === this.pkgId()) ?? this.packages()[0]);
  readonly base = computed(() => this.pkg().price);
  readonly discount = computed(() => (this.promo() ? Math.round(this.base() * 0.2) : 0));
  readonly total = computed(() => this.base() - this.discount());

  readonly payIsCard = computed(() => this.payId() === 'card');
  readonly canPay = computed(
    () =>
      !this.paying() &&
      [this.name(), this.biz(), this.product(), this.phone(), this.email()].every((v) => v.trim().length > 0),
  );

  money = money;

  constructor() {
    this.loadPackages();
  }

  // ----- Chargement des données -----
  loadPackages(): void {
    this.api.packages().subscribe({
      next: (list) => {
        if (list.length) this.packages.set(list);
      },
      error: () => {
        /* on garde les packages par défaut si l'API est éteinte */
      },
    });
  }

  refresh(): void {
    this.loadMonth();
    this.loadSlots();
  }

  private loadMonth(): void {
    this.api.month(YEAR, MONTH).subscribe({
      next: (days) => this.monthFree.set(Object.fromEntries(days.map((d) => [d.day, d.free]))),
      error: () => this.monthFree.set({}),
    });
  }

  private loadSlots(): void {
    const d = String(this.day()).padStart(2, '0');
    this.api.slots(`${YEAR}-${MONTH}-${d}`).subscribe({
      next: (slots) => this.slotsData.set(slots),
      error: () => this.slotsData.set(TIMES.map((time, index) => ({ index, time, available: true }))),
    });
  }

  // ----- Actions -----
  start(mode: Mode): void {
    this.reset();
    this.mode.set(mode);
  }

  reset(): void {
    this.step.set(1);
    this.done.set(false);
    this.slot.set(null);
    this.promo.set(false);
    this.error.set(null);
  }

  pickDay(n: number): void {
    this.day.set(n);
    this.slot.set(null);
    this.error.set(null);
    this.loadSlots();
  }

  next(): void {
    this.error.set(null);
    this.step.update((s) => Math.min(3, s + 1));
  }

  back(): void {
    this.error.set(null);
    this.step.update((s) => Math.max(1, s - 1));
  }

  goStep(n: number): void {
    if (n <= this.step()) this.step.set(n);
  }

  togglePromo(): void {
    this.promo.update((p) => !p);
  }

  /** Crée la réservation sur le serveur, puis confirme le paiement. */
  pay(): void {
    if (!this.canPay() || this.slot() === null) return;
    this.error.set(null);
    this.paying.set(true);

    const d = String(this.day()).padStart(2, '0');
    this.api
      .createReservation({
        mode: this.mode(),
        country: this.mode() === 'presentiel' ? 'Togo' : this.country(),
        live_date: `${YEAR}-${MONTH}-${d}`,
        slot_index: this.slot()!,
        package_id: this.pkgId(),
        promo: this.promo(),
        name: this.name().trim(),
        business: this.biz().trim(),
        product: this.product().trim(),
        phone: this.phone().trim(),
        email: this.email().trim(),
        payment_method: this.payId(),
      })
      .pipe(switchMap((res) => this.api.payReservation(res.ref)))
      .subscribe({
        next: (res) => {
          this.ref.set(res.ref);
          this.done.set(true);
          this.paying.set(false);
          this.refresh();
        },
        error: (err: HttpErrorResponse) => {
          this.paying.set(false);
          const detail = err.error?.detail;
          if (err.status === 409) {
            this.error.set(typeof detail === 'string' ? detail : 'Ce créneau vient d\'être réservé.');
            this.slot.set(null);
            this.step.set(1);
            this.refresh();
          } else if (err.status === 422 || err.status === 400) {
            this.error.set(typeof detail === 'string' ? detail : 'Vérifie tes informations (email, téléphone...).');
          } else if (err.status === 0) {
            this.error.set('Impossible de joindre le serveur. Réessaie dans un instant.');
          } else {
            this.error.set(typeof detail === 'string' ? detail : 'Une erreur est survenue. Réessaie.');
          }
        },
      });
  }
}
