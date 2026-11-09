import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { API_URL } from './environment';

export type Status = 'Payé' | 'En attente' | 'Annulé';

export interface AdminRow {
  id: number; ref: string; biz: string; person: string; remote: boolean; country: string; place: string;
  when: string; date: string; time: string; pkg: string; vip: boolean; amount: number; base_amount: number;
  discount: number; method: string; method_id: string; status: Status; phone: string; email: string;
  product: string; created: string;
}
export interface AdminStats { count: number; paid: number; pending: number; remote_share: number; upcoming: number }
export interface WeekDay { label: string; count: number; pct: number }
export interface MonthDay { day: number; lives: number; taken: number; blocked: number }
export interface DayBlock { index: number; time: string; state: 'free' | 'booked' | 'blocked'; note: string | null; reservation: AdminRow | null }
export interface AdminPkg {
  id: string; name: string; price: number; tagline: string; features: string[]; badge: boolean; active: boolean;
  slots: number; vip: boolean; promo_percent: number; promo_until: string | null; promo_live: boolean; reservations: number;
}
export type PkgInput = Omit<AdminPkg, 'id' | 'promo_live' | 'reservations'>;
export interface MethodTotal { id: string; label: string; count: number; amount: number }
export interface PaymentsSummary {
  paid: number; paid_count: number; pending: number; pending_count: number; cancelled_count: number;
  average: number; by_method: MethodTotal[];
}
export interface ClientRes { id: number; ref: string; when: string; pkg: string; amount: number; status: Status }
export interface ClientOut {
  email: string; name: string; business: string; phone: string; count: number; spent: number; last: string;
  reservations: ClientRes[];
}
export interface SettingsDto {
  live_start_date: string; hold_minutes: number; contact_whatsapp: string; contact_email: string;
  cancel_hours: number; payment_simulation: boolean; admin_email: string;
}

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/admin`;

  // Message de confirmation affiché en bas de l'écran
  readonly toast = signal<{ text: string; error: boolean } | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  notify(text: string, error = false): void {
    this.toast.set({ text, error });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.toast.set(null), 3500);
  }

  reservations() { return this.http.get<AdminRow[]>(`${this.base}/reservations`); }
  stats() { return this.http.get<AdminStats>(`${this.base}/stats`); }
  week() { return this.http.get<WeekDay[]>(`${this.base}/week`); }
  setStatus(id: number, status: Status) { return this.http.patch<AdminRow>(`${this.base}/reservations/${id}/status`, { status }); }
  receipt(id: number) { return this.http.get(`${this.base}/reservations/${id}/receipt`, { responseType: 'blob' }); }
  exportCsv() { return this.http.get(`${this.base}/export.csv`, { responseType: 'blob' }); }

  month(year: number, month: number) { return this.http.get<MonthDay[]>(`${this.base}/calendar/month`, { params: { year, month } }); }
  day(date: string) { return this.http.get<DayBlock[]>(`${this.base}/calendar/day`, { params: { date } }); }
  block(date: string, slot_index: number, note: string) { return this.http.post(`${this.base}/calendar/block`, { date, slot_index, note: note || null }); }
  unblock(date: string, slot_index: number) { return this.http.delete(`${this.base}/calendar/block`, { params: new HttpParams().set('date', date).set('slot_index', slot_index) }); }
  blockDay(date: string, note: string) { return this.http.post(`${this.base}/calendar/block-day`, { date, note: note || null }); }
  unblockDay(date: string) { return this.http.delete(`${this.base}/calendar/block-day`, { params: { date } }); }

  packages() { return this.http.get<AdminPkg[]>(`${this.base}/packages`); }
  createPackage(p: PkgInput) { return this.http.post<AdminPkg>(`${this.base}/packages`, p); }
  updatePackage(id: string, p: PkgInput) { return this.http.put<AdminPkg>(`${this.base}/packages/${id}`, p); }
  deletePackage(id: string) { return this.http.delete(`${this.base}/packages/${id}`); }

  payments() { return this.http.get<PaymentsSummary>(`${this.base}/payments`); }
  clients() { return this.http.get<ClientOut[]>(`${this.base}/clients`); }
  settings() { return this.http.get<SettingsDto>(`${this.base}/settings`); }
  saveSettings(s: Omit<SettingsDto, 'payment_simulation' | 'admin_email'>) { return this.http.put<SettingsDto>(`${this.base}/settings`, s); }
  changePassword(current: string, next: string) { return this.http.post(`${this.base}/password`, { current, new: next }); }

  /** Télécharge un fichier reçu de l'API. */
  save(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Message d'erreur lisible à partir d'une réponse de l'API. */
  static msg(err: any, fallback = 'Une erreur est survenue'): string {
    const d = err?.error?.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d) && d[0]?.msg) return String(d[0].msg).replace('Value error, ', '');
    return err?.status === 0 ? "Impossible de joindre le serveur" : fallback;
  }
}
