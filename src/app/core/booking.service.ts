import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { switchMap } from 'rxjs';
import { ApiService, SlotDto } from './api.service';
import { DOWS, Mode, PACKAGES, PAYMENTS, Pkg, SLOT_STARTS, durationLabel, money, timeRange } from './data';

const YEAR = 2026;
const MONTH = 12;

export type Category = 'standard' | 'vip';

/**
 * Parcours : 1. Date et heure  ->  2. Offre  ->  3. Paiement.
 * Le client choisit d'abord son heure de début ; les offres trop longues pour
 * cette heure (VIP) sont ensuite grisées à l'étape 2.
 */
@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly api = inject(ApiService);

  readonly payments = PAYMENTS;
  /** Offres : valeurs par défaut, puis remplacées par celles de l'API. */
  readonly packages = signal<Pkg[]>(PACKAGES);
  /** Contact affiché aux clients (réglé depuis l'admin). */
  readonly contact = signal({ whatsapp: '', email: '' });

  // Choix du client
  readonly day = signal(1);
  readonly slot = signal<number | null>(null); // premier bloc de 1h30
  readonly mode = signal<Mode>('presentiel');
  readonly country = signal('Togo');
  readonly category = signal<Category>('standard');
  readonly pkgId = signal('boost');
  readonly payId = signal('mixx');

  // Formulaire
  readonly name = signal('');
  readonly biz = signal('');
  readonly product = signal('');
  readonly phone = signal('');
  readonly email = signal('');

  // Navigation
  readonly step = signal(1);
  readonly done = signal(false);
  readonly paying = signal(false);
  readonly error = signal<string | null>(null);
  readonly ref = signal('');
  readonly paidTotal = signal(0);
  readonly receiptToken = signal('');
  readonly receiptLoading = signal(false);

  // Disponibilités venant de l'API (toujours calculées par blocs de 1h30)
  private readonly monthInfo = signal<Record<number, { free: number; open: boolean }>>({});
  private readonly slotsData = signal<SlotDto[]>(
    SLOT_STARTS.map((_, index) => ({ index, time: timeRange(index), available: true })),
  );

  // ----- Date et heure -----
  readonly leadingEmpty = 1; // décembre 2026 commence un mardi
  readonly cells = computed(() =>
    Array.from({ length: 31 }, (_, i) => {
      const n = i + 1;
      const info = this.monthInfo()[n];
      const unavailable = info ? info.free === 0 : false;
      return {
        n,
        unavailable,
        aria: !info ? `${n} décembre` : unavailable ? `${n} décembre, complet` : `${n} décembre, ${info.free} horaires libres`,
      };
    }),
  );
  readonly times = computed(() =>
    this.slotsData().map((s) => ({ index: s.index, label: SLOT_STARTS[s.index], full: !s.available })),
  );
  readonly dayName = computed(() => {
    const name = DOWS[(this.day() + 1) % 7];
    return name.charAt(0).toUpperCase() + name.slice(1);
  });
  readonly dayTitle = computed(() => `${this.dayName()} ${this.day()} décembre`);
  readonly dateShort = computed(() => `${this.dayName()} ${this.day()} déc.`);

  // ----- Offres -----
  readonly offers = computed(() => this.packages().filter((p) => p.vip === (this.category() === 'vip')));
  readonly hasVip = computed(() => this.packages().some((p) => p.vip));
  /** Y a-t-il au moins une offre VIP possible à l'heure choisie ? */
  readonly vipPossible = computed(() => this.packages().some((p) => p.vip && this.fits(p)));
  readonly pkg = computed(() => this.packages().find((p) => p.id === this.pkgId()) ?? this.packages()[0]);
  readonly duration = computed(() => durationLabel(this.pkg().slots));
  readonly offerLabel = computed(() => `${this.pkg().name} · ${this.duration()}`);
  /** L'offre affichée est bien celle de l'onglet ouvert et elle tient à l'heure choisie. */
  readonly offerOk = computed(() => this.pkg().vip === (this.category() === 'vip') && this.fits(this.pkg()));

  // ----- Libellés -----
  readonly startLabel = computed(() => (this.slot() === null ? '' : SLOT_STARTS[this.slot()!]));
  readonly rangeLabel = computed(() => (this.slot() === null ? '' : timeRange(this.slot()!, this.pkg().slots)));
  readonly modeLabel = computed(() =>
    this.mode() === 'presentiel' ? 'Présentiel · Lomé' : `À distance · ${this.country()}`,
  );

  // ----- Prix (le serveur recalcule le montant officiel) -----
  readonly base = computed(() => this.pkg().price);
  readonly discount = computed(() => this.reduction(this.pkg()));
  readonly total = computed(() => this.base() - this.discount());

  // ----- Paiement -----
  readonly payMethod = computed(() => this.payments.find((m) => m.id === this.payId()) ?? this.payments[0]);
  readonly emailOk = computed(() => /^\S+@\S+\.\S+$/.test(this.email().trim()));
  readonly canPay = computed(
    () =>
      !this.paying() &&
      this.emailOk() &&
      [this.name(), this.biz(), this.product(), this.phone()].every((v) => v.trim().length > 0),
  );

  money = money;

  constructor() {
    this.loadStatic();
  }

  /** Cette offre tient-elle à partir de l'heure choisie (blocs consécutifs libres) ? */
  fits(p: Pkg): boolean {
    const start = this.slot();
    if (start === null) return true;
    if (start + p.slots > SLOT_STARTS.length) return false;
    const data = this.slotsData();
    for (let i = start; i < start + p.slots; i++) {
      const d = data.find((x) => x.index === i);
      if (d && !d.available) return false;
    }
    return true;
  }

  /** Prix à payer pour une offre (promo de l'offre déduite, s'il y en a une). */
  final(p: Pkg): number {
    return p.price - this.reduction(p);
  }

  /** Vrai seulement si l'admin a activé une promo sur cette offre. */
  hasPromo(p: Pkg): boolean {
    return (p.promo_percent ?? 0) > 0;
  }

  private reduction(p: Pkg): number {
    return Math.round((p.price * (p.promo_percent ?? 0)) / 100);
  }

  // ----- Chargement des données -----
  private loadStatic(): void {
    this.api.packages().subscribe({
      next: (list) => {
        if (list.length) this.packages.set(list);
      },
      error: () => {
        /* on garde les offres par défaut si l'API est éteinte */
      },
    });
    this.api.config().subscribe({
      next: (c) => this.contact.set({ whatsapp: c.contact_whatsapp, email: c.contact_email }),
      error: () => {
        /* pas de contact affiché si l'API est injoignable */
      },
    });
  }

  /** Recharge le calendrier, choisit un jour libre si besoin, puis les heures du jour. */
  refresh(): void {
    this.api.month(YEAR, MONTH, 1).subscribe({
      next: (days) => {
        const info = Object.fromEntries(days.map((d) => [d.day, { free: d.free, open: d.open }]));
        this.monthInfo.set(info);
        if ((info[this.day()]?.free ?? 1) === 0) {
          const firstFree = days.find((d) => d.free > 0);
          if (firstFree) this.day.set(firstFree.day);
        }
        this.loadSlots();
      },
      error: () => {
        this.monthInfo.set({});
        this.loadSlots();
      },
    });
  }

  private loadSlots(): void {
    const d = String(this.day()).padStart(2, '0');
    this.api.slots(`${YEAR}-${MONTH}-${d}`, 1).subscribe({
      next: (slots) => {
        this.slotsData.set(slots);
        const s = this.slot();
        if (s !== null && slots.find((x) => x.index === s)?.available === false) this.slot.set(null);
        this.ensureOfferFits();
      },
      error: () => {
        this.slotsData.set(SLOT_STARTS.map((_, index) => ({ index, time: timeRange(index), available: true })));
      },
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
    this.error.set(null);
  }

  pickDay(n: number): void {
    this.day.set(n);
    this.slot.set(null);
    this.error.set(null);
    this.loadSlots();
  }

  pickSlot(index: number): void {
    this.slot.set(index);
    this.ensureOfferFits();
  }

  /** Si l'offre choisie ne tient plus à cette heure, on revient sur une offre simple. */
  private ensureOfferFits(): void {
    if (this.fits(this.pkg())) return;
    const fallback = this.packages().find((p) => !p.vip && p.badge) ?? this.packages().find((p) => !p.vip);
    this.selectOffer(fallback);
  }

  setCategory(cat: Category): void {
    if (cat === this.category()) return;
    const candidates = this.packages().filter((p) => p.vip === (cat === 'vip') && this.fits(p));
    const pick = candidates.find((p) => p.badge) ?? candidates[0];
    this.category.set(cat);
    if (pick) this.pkgId.set(pick.id);
  }

  selectOffer(p: Pkg | undefined): void {
    if (!p || !this.fits(p)) return;
    this.pkgId.set(p.id);
    this.category.set(p.vip ? 'vip' : 'standard');
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
    if (n <= this.step()) {
      this.error.set(null);
      this.step.set(n);
    }
  }

  /** Télécharge le reçu PDF de la réservation payée. */
  downloadReceipt(): void {
    if (this.receiptLoading() || !this.ref()) return;
    this.error.set(null);
    this.receiptLoading.set(true);
    this.api.receipt(this.ref(), this.receiptToken()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recu-${this.ref()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.receiptLoading.set(false);
      },
      error: () => {
        this.receiptLoading.set(false);
        this.error.set("Impossible de télécharger le reçu pour l'instant. Réessaie dans un instant.");
      },
    });
  }

  /** Crée la réservation sur le serveur, puis confirme le paiement (simulation pour l'instant). */
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
          this.paidTotal.set(res.total);
          this.receiptToken.set(res.receipt_token);
          this.done.set(true);
          this.paying.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.paying.set(false);
          const detail = typeof err.error?.detail === 'string' ? err.error.detail : null;
          if (err.status === 409) {
            this.error.set(detail ?? "Cette heure vient d'être réservée. Choisis-en une autre.");
            this.slot.set(null);
            this.step.set(1);
            this.refresh();
          } else if (err.status === 0) {
            this.error.set('Impossible de joindre le serveur. Réessaie dans un instant.');
          } else {
            this.error.set(detail ?? 'Vérifie tes informations (email, téléphone) et réessaie.');
          }
        },
      });
  }
}
