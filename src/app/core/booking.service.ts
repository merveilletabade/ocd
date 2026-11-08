import { Injectable, computed, signal } from '@angular/core';
import { DOWS, Mode, PACKAGES, PAYMENTS, TIMES, money } from './data';

/** Un créneau est "complet" selon une règle fixe (données d'exemple, à remplacer par l'API). */
const isBooked = (day: number, idx: number): boolean => (day * 7 + idx * 3) % 5 === 0;

@Injectable({ providedIn: 'root' })
export class BookingService {
  readonly packages = PACKAGES;
  readonly payments = PAYMENTS;

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

  // Calendrier de décembre 2026 : le 1er est un mardi, 31 jours
  readonly cells = computed(() =>
    Array.from({ length: 31 }, (_, i) => {
      const n = i + 1;
      const free = TIMES.filter((_, idx) => !isBooked(n, idx)).length;
      return { n, aria: `${n} décembre, ${free} créneaux libres` };
    }),
  );
  readonly leadingEmpty = 1;

  readonly slots = computed(() =>
    TIMES.map((time, i) => ({ time, full: isBooked(this.day(), i) })),
  );

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

  // Prix
  readonly pkg = computed(() => PACKAGES.find((p) => p.id === this.pkgId())!);
  readonly base = computed(() => this.pkg().price);
  readonly discount = computed(() => (this.promo() ? Math.round(this.base() * 0.2) : 0));
  readonly total = computed(() => this.base() - this.discount());

  readonly payIsCard = computed(() => this.payId() === 'card');
  readonly ref = computed(() => `OCD-${String(this.day()).padStart(2, '0')}12-0042`);

  money = money;

  // Actions
  start(mode: Mode): void {
    this.reset();
    this.mode.set(mode);
  }

  reset(): void {
    this.step.set(1);
    this.done.set(false);
    this.slot.set(null);
    this.promo.set(false);
  }

  pickDay(n: number): void {
    this.day.set(n);
    this.slot.set(null);
  }

  next(): void {
    this.step.update((s) => Math.min(3, s + 1));
  }

  back(): void {
    this.step.update((s) => Math.max(1, s - 1));
  }

  goStep(n: number): void {
    if (n <= this.step()) this.step.set(n);
  }

  togglePromo(): void {
    this.promo.update((p) => !p);
  }

  /** À brancher sur ton API de paiement (T-Money, Flooz, Orange Money, MTN MoMo, Wave, carte). */
  pay(): void {
    this.done.set(true);
  }
}
